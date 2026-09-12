import { supabase } from './supabase'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured. Copy .env.example to .env and add Supabase values.')
  return supabase
}

export type UsageState = 'IN_USE' | 'RETURNED' | 'CONSUMED' | 'COMPLETE' | 'UNKNOWN'

export interface ActualResourceCandidate {
  engagement_resource_id: string
  resource_id: string
  relationship: string
  planned_quantity: number | null
  resource_name: string
  resource_category: string
  actual: ResourceUsage | null
}

export interface ResourceUsage {
  id: string
  resource_id: string
  source_key: string | null
  usage_state: UsageState
  quantity: number | null
  used_from: string | null
  used_through: string | null
  certainty_state: string
  notes: string | null
}

export interface ActualAssignment {
  id: string
  assignment_state: string
  role_code: string
  role_label: string | null
  scope_summary: string | null
  member: { id: string; username: string; display_name: string | null } | null
}

export async function listActualResourceCandidates(engagementId: string): Promise<ActualResourceCandidate[]> {
  const client = requireClient()
  const [{ data: links, error: linkError }, { data: usage, error: usageError }] = await Promise.all([
    client
      .from('engagement_resources')
      .select('id,resource_id,relationship,quantity,resource:resources(id,name,category)')
      .eq('engagement_id', engagementId)
      .order('created_at', { ascending: true }),
    client
      .from('resource_usage')
      .select('id,resource_id,source_key,usage_state,quantity,used_from,used_through,certainty_state,notes')
      .eq('engagement_id', engagementId)
      .order('created_at', { ascending: true }),
  ])
  if (linkError) throw linkError
  if (usageError) throw usageError

  const usageBySource = new Map<string, ResourceUsage>()
  for (const row of usage ?? []) {
    if (row.source_key) usageBySource.set(row.source_key, row as ResourceUsage)
  }

  return (links ?? []).map((link) => {
    const resource = link.resource as unknown as { id: string; name: string; category: string } | null
    const sourceKey = usageSourceKey(link.id)
    return {
      engagement_resource_id: link.id,
      resource_id: link.resource_id,
      relationship: link.relationship,
      planned_quantity: link.quantity == null ? null : Number(link.quantity),
      resource_name: resource?.name ?? 'Unknown resource',
      resource_category: resource?.category ?? 'OTHER',
      actual: usageBySource.get(sourceKey) ?? null,
    }
  })
}

export async function listActualAssignments(engagementId: string): Promise<ActualAssignment[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('engagement_assignments')
    .select('id,assignment_state,role_code,role_label,scope_summary,member:team_members(id,username,display_name)')
    .eq('engagement_id', engagementId)
    .in('assignment_state', ['CONFIRMED', 'COMPLETED'])
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as ActualAssignment[]
}

export async function confirmResourceUsage(input: {
  engagementId: string
  engagementResourceId: string
  resourceId: string
  usageState: UsageState
  quantity?: number | null
  usedFrom?: string | null
  usedThrough?: string | null
  notes?: string | null
}) {
  const client = requireClient()
  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id
  if (!userId) throw new Error('You must be signed in to confirm actual usage.')

  const sourceKey = usageSourceKey(input.engagementResourceId)
  const payload = {
    engagement_id: input.engagementId,
    resource_id: input.resourceId,
    source_key: sourceKey,
    usage_state: input.usageState,
    quantity: input.quantity ?? null,
    used_from: input.usedFrom ?? null,
    used_through: input.usedThrough ?? null,
    certainty_state: 'KNOWN',
    notes: input.notes?.trim() || null,
    metadata: {
      source_type: 'MANUAL_CONFIRMATION',
      capture_surface: 'delivery_actuals',
      engagement_resource_id: input.engagementResourceId,
    },
    created_by: userId,
  }

  const { data: existing, error: existingError } = await client
    .from('resource_usage')
    .select('id')
    .eq('source_key', sourceKey)
    .maybeSingle()
  if (existingError) throw existingError

  if (existing) {
    const { data, error } = await client
      .from('resource_usage')
      .update({
        usage_state: payload.usage_state,
        quantity: payload.quantity,
        used_from: payload.used_from,
        used_through: payload.used_through,
        certainty_state: payload.certainty_state,
        notes: payload.notes,
        metadata: payload.metadata,
      })
      .eq('id', existing.id)
      .select('id')
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await client.from('resource_usage').insert(payload).select('id').single()
  if (error) throw error
  return data
}

export async function markAssignmentCompleted(assignmentId: string) {
  const client = requireClient()
  const { data: current, error: currentError } = await client
    .from('engagement_assignments')
    .select('id,assignment_state')
    .eq('id', assignmentId)
    .single()
  if (currentError) throw currentError
  if (current.assignment_state === 'COMPLETED') return current
  if (current.assignment_state !== 'CONFIRMED') throw new Error('Only a confirmed assignment can be marked completed.')

  const { data, error } = await client
    .from('engagement_assignments')
    .update({ assignment_state: 'COMPLETED' })
    .eq('id', assignmentId)
    .select('id,assignment_state')
    .single()
  if (error) throw error
  return data
}

function usageSourceKey(engagementResourceId: string) {
  return `manual-usage:${engagementResourceId}`
}
