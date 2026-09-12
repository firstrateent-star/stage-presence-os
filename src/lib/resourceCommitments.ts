import { supabase } from './supabase'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured. Copy .env.example to .env and add Supabase values.')
  return supabase
}

export type ResourceCommitmentType = 'HOLD' | 'RESERVATION' | 'ALLOCATION'
export type ResourceCommitmentState = 'TENTATIVE' | 'CONFIRMED' | 'RELEASED' | 'FULFILLED' | 'CANCELLED' | 'UNKNOWN'

export interface CommitmentCandidate {
  link_id: string
  resource_id: string
  relationship: string
  quantity: number | null
  required_from_date: string | null
  required_through_date: string | null
  requirement_window_state: string
  planned_sourcing_model: 'OWNED' | 'SUBCONTRACTED' | 'PARTNER' | 'VENUE' | 'UNKNOWN'
  resource: { id: string; name: string; category: string; quantity: number | null; quantity_state: string } | null
}

export interface ResourceCommitment {
  id: string
  engagement_id: string
  resource_id: string
  resource_name: string
  resource_category: string
  commitment_type: ResourceCommitmentType
  commitment_state: ResourceCommitmentState
  quantity: number | null
  from_date: string | null
  through_date: string | null
  planned_sourcing_model: string
  certainty_state: string
  notes: string | null
}

export async function listCommitmentCandidates(engagementId: string): Promise<CommitmentCandidate[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('engagement_resources')
    .select('id,resource_id,relationship,quantity,required_from_date,required_through_date,requirement_window_state,planned_sourcing_model,resource:resources(id,name,category,quantity,quantity_state)')
    .eq('engagement_id', engagementId)
    .in('relationship', ['CONFIGURED', 'RECOMMENDED'])
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row) => ({
    link_id: row.id,
    resource_id: row.resource_id,
    relationship: row.relationship,
    quantity: row.quantity == null ? null : Number(row.quantity),
    required_from_date: row.required_from_date,
    required_through_date: row.required_through_date,
    requirement_window_state: row.requirement_window_state,
    planned_sourcing_model: row.planned_sourcing_model,
    resource: Array.isArray(row.resource) ? row.resource[0] ?? null : row.resource,
  })) as CommitmentCandidate[]
}

export async function listResourceCommitments(engagementId: string): Promise<ResourceCommitment[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('resource_commitment_current_v')
    .select('id,engagement_id,resource_id,resource_name,resource_category,commitment_type,commitment_state,quantity,from_date,through_date,planned_sourcing_model,certainty_state,notes')
    .eq('engagement_id', engagementId)
    .order('from_date', { ascending: true, nullsFirst: false })
    .order('resource_name')
  if (error) throw error
  return (data ?? []).map((row) => ({ ...row, quantity: row.quantity == null ? null : Number(row.quantity) })) as ResourceCommitment[]
}

export async function saveResourceCommitment(input: {
  engagementId: string
  engagementResourceLinkId: string
  commitmentType: ResourceCommitmentType
  commitmentState: Extract<ResourceCommitmentState, 'TENTATIVE' | 'CONFIRMED'>
  quantity?: number | null
  fromDate?: string | null
  throughDate?: string | null
  notes?: string | null
}) {
  const client = requireClient()
  const { data: userData } = await client.auth.getUser()

  const { data: link, error: linkError } = await client
    .from('engagement_resources')
    .select('id,engagement_id,resource_id,quantity,required_from_date,required_through_date,planned_sourcing_model')
    .eq('id', input.engagementResourceLinkId)
    .eq('engagement_id', input.engagementId)
    .single()
  if (linkError) throw linkError

  const sourceKey = `manual-resource-commitment:${input.engagementId}:${link.resource_id}:${input.commitmentType}`
  const values = {
    engagement_id: input.engagementId,
    resource_id: link.resource_id,
    source_key: sourceKey,
    commitment_type: input.commitmentType,
    commitment_state: input.commitmentState,
    quantity: input.quantity ?? (link.quantity == null ? null : Number(link.quantity)),
    from_date: input.fromDate ?? link.required_from_date,
    through_date: input.throughDate ?? link.required_through_date,
    planned_sourcing_model: link.planned_sourcing_model,
    certainty_state: 'KNOWN',
    notes: input.notes?.trim() || null,
    metadata: {
      source_type: 'MANUAL',
      capture_surface: 'engagement_operating_workspace',
      engagement_resource_link_id: input.engagementResourceLinkId,
    },
    created_by: userData.user?.id ?? null,
  }

  const { data, error } = await client
    .from('resource_commitments')
    .upsert(values, { onConflict: 'source_key' })
    .select('id')
    .single()
  if (error) throw error
  return data
}

export async function releaseResourceCommitment(commitmentId: string, note?: string | null) {
  const client = requireClient()
  const { data: existing, error: readError } = await client
    .from('resource_commitments')
    .select('id,notes')
    .eq('id', commitmentId)
    .single()
  if (readError) throw readError

  const releaseNote = note?.trim()
  const notes = [existing.notes, releaseNote ? `Released: ${releaseNote}` : null].filter(Boolean).join('\n') || null
  const { data, error } = await client
    .from('resource_commitments')
    .update({ commitment_state: 'RELEASED', notes })
    .eq('id', commitmentId)
    .select('id')
    .single()
  if (error) throw error
  return data
}
