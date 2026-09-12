import { supabase } from './supabase'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured.')
  return supabase
}

export type RateStatus = 'DRAFT' | 'APPROVED' | 'RETIRED'

export interface ActualLaborCandidate {
  assignment_id: string
  engagement_id: string
  team_member_id: string
  team_member_name: string
  role_code: string
  role_label: string | null
  completed_cost_id: string | null
  completed_cost_amount: number | null
  rate_profile: {
    id: string
    name: string
    status: RateStatus
    amount: number
    unit_basis: string
    certainty_state: string
  } | null
}

export interface ActualResourceCostCandidate {
  usage_id: string
  engagement_id: string
  resource_id: string
  resource_name: string
  sourcing_model: string
  usage_state: string
  quantity: number | null
  completed_cost_id: string | null
  completed_cost_amount: number | null
}

export interface EconomicActualsModel {
  labor: ActualLaborCandidate[]
  resources: ActualResourceCostCandidate[]
}

export async function loadEconomicActuals(engagementId: string): Promise<EconomicActualsModel> {
  const client = requireClient()

  const [{ data: assignments, error: assignmentError }, { data: usage, error: usageError }, { data: costs, error: costError }, { data: rates, error: rateError }] = await Promise.all([
    client
      .from('engagement_assignments')
      .select('id,engagement_id,team_member_id,role_code,role_label,member:team_members(id,username,display_name)')
      .eq('engagement_id', engagementId)
      .eq('assignment_state', 'COMPLETED'),
    client
      .from('resource_usage')
      .select('id,engagement_id,resource_id,usage_state,quantity,resource:resources(id,name,sourcing_model)')
      .eq('engagement_id', engagementId)
      .in('usage_state', ['IN_USE', 'RETURNED', 'CONSUMED', 'COMPLETE']),
    client
      .from('engagement_cost_items')
      .select('id,engagement_assignment_id,resource_id,amount,cost_state,source_key')
      .eq('engagement_id', engagementId)
      .eq('cost_state', 'ACTUAL'),
    client
      .from('economic_rate_profiles')
      .select('id,name,status,team_member_id,amount,unit_basis,certainty_state,version_no')
      .in('status', ['DRAFT', 'APPROVED'])
      .eq('cost_domain', 'LABOR')
      .order('version_no', { ascending: false }),
  ])

  if (assignmentError) throw assignmentError
  if (usageError) throw usageError
  if (costError) throw costError
  if (rateError) throw rateError

  const assignmentCost = new Map<string, { id: string; amount: number }>()
  const resourceCost = new Map<string, { id: string; amount: number }>()
  for (const row of costs ?? []) {
    if (row.engagement_assignment_id && !assignmentCost.has(row.engagement_assignment_id)) {
      assignmentCost.set(row.engagement_assignment_id, { id: row.id, amount: Number(row.amount) })
    }
    if (row.resource_id && !resourceCost.has(row.resource_id)) {
      resourceCost.set(row.resource_id, { id: row.id, amount: Number(row.amount) })
    }
  }

  const latestRateByMember = new Map<string, any>()
  for (const rate of rates ?? []) {
    if (!rate.team_member_id) continue
    const existing = latestRateByMember.get(rate.team_member_id)
    if (!existing || (existing.status !== 'APPROVED' && rate.status === 'APPROVED')) latestRateByMember.set(rate.team_member_id, rate)
  }

  const labor: ActualLaborCandidate[] = (assignments ?? []).map((row: any) => {
    const member = row.member
    const cost = assignmentCost.get(row.id)
    const rate = latestRateByMember.get(row.team_member_id)
    return {
      assignment_id: row.id,
      engagement_id: row.engagement_id,
      team_member_id: row.team_member_id,
      team_member_name: member?.display_name ?? member?.username ?? 'Unknown contributor',
      role_code: row.role_code,
      role_label: row.role_label,
      completed_cost_id: cost?.id ?? null,
      completed_cost_amount: cost?.amount ?? null,
      rate_profile: rate ? {
        id: rate.id,
        name: rate.name,
        status: rate.status as RateStatus,
        amount: Number(rate.amount),
        unit_basis: rate.unit_basis,
        certainty_state: rate.certainty_state,
      } : null,
    }
  })

  const resources: ActualResourceCostCandidate[] = (usage ?? []).map((row: any) => {
    const resource = row.resource
    const cost = resourceCost.get(row.resource_id)
    return {
      usage_id: row.id,
      engagement_id: row.engagement_id,
      resource_id: row.resource_id,
      resource_name: resource?.name ?? 'Unknown resource',
      sourcing_model: resource?.sourcing_model ?? 'UNKNOWN',
      usage_state: row.usage_state,
      quantity: row.quantity == null ? null : Number(row.quantity),
      completed_cost_id: cost?.id ?? null,
      completed_cost_amount: cost?.amount ?? null,
    }
  })

  return { labor, resources }
}

export async function recordAssignmentActualCost(input: {
  engagementId: string
  assignmentId: string
  teamMemberId: string
  teamMemberName: string
  amount: number
  incurredDate?: string | null
  hours?: number | null
  hourlyRate?: number | null
  approvedRateProfileId?: string | null
  notes?: string | null
}) {
  const client = requireClient()
  const { data: userData } = await client.auth.getUser()
  const sourceKey = `manual-actual-cost:assignment:${input.assignmentId}`
  const payload = {
    engagement_id: input.engagementId,
    source_key: sourceKey,
    cost_category: 'LABOR',
    cost_state: 'ACTUAL',
    description: `${input.teamMemberName} labor`,
    quantity: input.hours ?? null,
    unit_cost: input.hourlyRate ?? null,
    amount: input.amount,
    currency: 'USD',
    incurred_date: input.incurredDate || null,
    team_member_id: input.teamMemberId,
    engagement_assignment_id: input.assignmentId,
    economic_rate_profile_id: input.approvedRateProfileId || null,
    applied_rate: input.hourlyRate ?? null,
    rate_basis: input.hourlyRate != null ? 'HOUR' : null,
    certainty_state: 'KNOWN',
    source_type: 'MANUAL',
    notes: input.notes || null,
    metadata: { capture_surface: 'economic_actuals_bridge', evidence_type: 'COMPLETED_ASSIGNMENT' },
    created_by: userData.user?.id ?? null,
  }

  const { data: existing, error: readError } = await client.from('engagement_cost_items').select('id').eq('source_key', sourceKey).maybeSingle()
  if (readError) throw readError
  if (existing) {
    const { data, error } = await client.from('engagement_cost_items').update(payload).eq('id', existing.id).select('id').single()
    if (error) throw error
    return data
  }
  const { data, error } = await client.from('engagement_cost_items').insert(payload).select('id').single()
  if (error) throw error
  return data
}

export async function recordResourceActualCost(input: {
  engagementId: string
  usageId: string
  resourceId: string
  resourceName: string
  category: string
  amount: number
  incurredDate?: string | null
  notes?: string | null
}) {
  const client = requireClient()
  const { data: userData } = await client.auth.getUser()
  const sourceKey = `manual-actual-cost:usage:${input.usageId}`
  const payload = {
    engagement_id: input.engagementId,
    source_key: sourceKey,
    cost_category: input.category,
    cost_state: 'ACTUAL',
    description: `${input.resourceName} direct cost`,
    amount: input.amount,
    currency: 'USD',
    incurred_date: input.incurredDate || null,
    resource_id: input.resourceId,
    certainty_state: 'KNOWN',
    source_type: 'MANUAL',
    notes: input.notes || null,
    metadata: { capture_surface: 'economic_actuals_bridge', evidence_type: 'RESOURCE_USAGE', resource_usage_id: input.usageId },
    created_by: userData.user?.id ?? null,
  }

  const { data: existing, error: readError } = await client.from('engagement_cost_items').select('id').eq('source_key', sourceKey).maybeSingle()
  if (readError) throw readError
  if (existing) {
    const { data, error } = await client.from('engagement_cost_items').update(payload).eq('id', existing.id).select('id').single()
    if (error) throw error
    return data
  }
  const { data, error } = await client.from('engagement_cost_items').insert(payload).select('id').single()
  if (error) throw error
  return data
}
