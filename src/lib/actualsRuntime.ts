import { supabase } from './supabase'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured.')
  return supabase
}

export type ActualCertainty = 'VERIFIED' | 'KNOWN' | 'ESTIMATED' | 'ASSUMED' | 'CONFLICTING'
export type LaborWorkType = 'GENERAL' | 'WAREHOUSE' | 'LOAD_IN' | 'SETUP' | 'SHOW' | 'STRIKE' | 'RETURN' | 'INSTALL' | 'SERVICE' | 'DRIVE' | 'PROGRAMMING' | 'OTHER'
export type LaborActualSource = 'MANUAL' | 'TIMESHEET' | 'IMPORT' | 'SYSTEM' | 'OTHER'
export type ResourceUsageState = 'IN_USE' | 'RETURNED' | 'CONSUMED' | 'COMPLETE' | 'UNKNOWN'
export type CostCategory =
  | 'LABOR'
  | 'SUBCONTRACT'
  | 'EQUIPMENT_RENTAL'
  | 'EQUIPMENT_OWNERSHIP'
  | 'TRANSPORT'
  | 'TRAVEL'
  | 'LODGING'
  | 'PER_DIEM'
  | 'FUEL'
  | 'MATERIALS'
  | 'PURCHASE'
  | 'MAINTENANCE'
  | 'PROCESSING_FEE'
  | 'OVERHEAD_ALLOCATED'
  | 'OTHER'

export interface ActualsPosition {
  engagement_id: string
  engagement_number: string
  engagement_name: string
  engagement_type: string
  commercial_state: string
  commitment_state: string
  operational_state: string
  event_start_date: string | null
  execution_assignment_count: number
  completed_assignment_count: number
  labor_actual_segment_count: number
  assignments_with_labor_actual: number
  actual_labor_minutes: number
  actual_labor_hours: number
  labor_cost_gap_count: number
  actual_labor_cost: number | null
  committed_resource_count: number
  resource_usage_count: number
  resource_usage_gap_count: number
  resource_cost_gap_count: number
  actual_cost_item_count: number
  actual_direct_cost: number | null
  direct_cost_estimate_observed: number | null
  direct_cost_committed_observed: number | null
  committed_revenue_observed: number | null
  collected_observed: number | null
  actual_contribution_observed: number | null
  actual_contribution_from_structured_cost: number | null
  structured_cash_transaction_count: number
  structured_cash_net: number | null
  cash_evidence_state: string
  warehouse_state: string | null
  closeout_count: number
  actuals_state: string
  closeout_readiness_state: string
}

export interface LaborActualRow {
  labor_actual_id: string
  engagement_id: string
  engagement_assignment_id: string | null
  assignment_state: string | null
  role_code: string | null
  role_label: string | null
  scheduled_start: string | null
  scheduled_end: string | null
  scheduled_minutes: number | null
  team_member_id: string
  team_member_name: string
  work_type: LaborWorkType
  actual_start: string | null
  actual_end: string | null
  actual_minutes: number
  actual_hours: number
  schedule_variance_minutes: number | null
  certainty_state: ActualCertainty
  source_type: LaborActualSource
  notes: string | null
  actual_labor_cost_id: string | null
  actual_labor_cost: number | null
  actual_cost_quantity: number | null
  actual_cost_unit_rate: number | null
  applied_rate: number | null
  rate_basis: string | null
  economic_rate_profile_id: string | null
  planned_cost_item_id: string | null
  labor_cost_state: string
  created_at: string
  updated_at: string
}

export interface ResourceActualRow {
  engagement_id: string
  engagement_number: string
  engagement_name: string
  resource_commitment_id: string | null
  resource_id: string
  resource_name: string
  resource_category: string
  planned_sourcing_model: string
  fulfillment_plan_line_id: string | null
  commitment_type: string | null
  commitment_state: string | null
  committed_quantity: number | null
  committed_from_date: string | null
  committed_through_date: string | null
  resource_usage_id: string | null
  usage_state: ResourceUsageState | null
  actual_quantity: number | null
  used_from: string | null
  used_through: string | null
  usage_certainty_state: ActualCertainty | null
  quantity_variance: number | null
  actual_cost_item_count: number
  actual_resource_cost: number | null
  usage_coverage_state: string
  resource_cost_state: string
}

export interface CostVarianceRow {
  engagement_id: string
  engagement_number: string
  engagement_name: string
  cost_category: CostCategory
  estimate_item_count: number
  estimated_cost: number | null
  committed_item_count: number
  committed_cost: number | null
  actual_item_count: number
  actual_cost: number | null
  current_plan_baseline: number | null
  actual_variance_to_plan: number | null
  variance_state: string
}

export async function getActualsPosition(engagementId: string): Promise<ActualsPosition | null> {
  const { data, error } = await requireClient().from('engagement_actuals_position_v').select('*').eq('engagement_id', engagementId).maybeSingle()
  if (error) throw error
  return data as ActualsPosition | null
}

export async function listLaborActuals(engagementId: string): Promise<LaborActualRow[]> {
  const { data, error } = await requireClient().from('engagement_labor_actuals_v').select('*').eq('engagement_id', engagementId).order('actual_start', { ascending: true, nullsFirst: false }).order('created_at')
  if (error) throw error
  return (data ?? []) as LaborActualRow[]
}

export async function listResourceActuals(engagementId: string): Promise<ResourceActualRow[]> {
  const { data, error } = await requireClient().from('engagement_resource_actuals_v').select('*').eq('engagement_id', engagementId).order('resource_name')
  if (error) throw error
  return (data ?? []) as ResourceActualRow[]
}

export async function listCostVariance(engagementId: string): Promise<CostVarianceRow[]> {
  const { data, error } = await requireClient().from('engagement_cost_variance_v').select('*').eq('engagement_id', engagementId).order('cost_category')
  if (error) throw error
  return (data ?? []) as CostVarianceRow[]
}

function computeMinutes(start?: string | null, end?: string | null, supplied?: number | null) {
  if (start && end) {
    const startMs = Date.parse(start)
    const endMs = Date.parse(end)
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) throw new Error('Actual start/end must be valid date-time values.')
    if (endMs < startMs) throw new Error('Actual end cannot be before actual start.')
    const calculated = Math.round((endMs - startMs) / 60000)
    if (calculated <= 0) throw new Error('Actual labor duration must be greater than zero.')
    if (supplied != null && Math.abs(supplied - calculated) > 1) throw new Error('Actual minutes do not match the supplied start/end times.')
    return calculated
  }
  if (supplied == null || !Number.isFinite(supplied) || supplied <= 0) throw new Error('Provide actual minutes or both actual start and actual end.')
  return Math.round(supplied)
}

export async function recordLaborActual(input: {
  engagementId: string
  teamMemberId: string
  assignmentId?: string | null
  workType?: LaborWorkType
  actualStart?: string | null
  actualEnd?: string | null
  actualMinutes?: number | null
  certaintyState?: ActualCertainty
  sourceType?: LaborActualSource
  sourceKey?: string | null
  sourceArtifactId?: string | null
  sourceSegmentId?: string | null
  notes?: string | null
}) {
  const client = requireClient()
  const minutes = computeMinutes(input.actualStart, input.actualEnd, input.actualMinutes)
  if (input.assignmentId) {
    const { data: assignment, error } = await client.from('engagement_assignments').select('id,engagement_id,team_member_id,assignment_state').eq('id', input.assignmentId).single()
    if (error) throw error
    if (assignment.engagement_id !== input.engagementId) throw new Error('Assignment belongs to a different Engagement.')
    if (assignment.team_member_id !== input.teamMemberId) throw new Error('Assignment belongs to a different team member.')
    if (!['CONFIRMED', 'COMPLETED'].includes(assignment.assignment_state)) throw new Error('Labor actuals require a CONFIRMED or COMPLETED assignment. Leave assignmentId empty for unplanned labor.')
  }

  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id
  if (!userId) throw new Error('You must be signed in to record labor actuals.')

  const { data, error } = await client.from('engagement_labor_actuals').insert({
    engagement_id: input.engagementId,
    engagement_assignment_id: input.assignmentId ?? null,
    team_member_id: input.teamMemberId,
    source_key: input.sourceKey ?? null,
    work_type: input.workType ?? 'GENERAL',
    actual_start: input.actualStart ?? null,
    actual_end: input.actualEnd ?? null,
    actual_minutes: minutes,
    certainty_state: input.certaintyState ?? 'KNOWN',
    source_type: input.sourceType ?? 'MANUAL',
    source_artifact_id: input.sourceArtifactId ?? null,
    source_segment_id: input.sourceSegmentId ?? null,
    notes: input.notes?.trim() || null,
    metadata: { actuals_runtime: 'v1' },
    created_by: userId,
  }).select('id').single()
  if (error) throw error

  const { data: row, error: readError } = await client.from('engagement_labor_actuals_v').select('*').eq('labor_actual_id', data.id).single()
  if (readError) throw readError
  return row as LaborActualRow
}

export async function completeAssignmentFromActuals(assignmentId: string) {
  const client = requireClient()
  const { data: assignment, error } = await client.from('engagement_assignments').select('id,assignment_state').eq('id', assignmentId).single()
  if (error) throw error
  if (assignment.assignment_state === 'COMPLETED') return assignment
  if (assignment.assignment_state !== 'CONFIRMED') throw new Error('Only a CONFIRMED assignment can be completed.')

  const { count, error: countError } = await client.from('engagement_labor_actuals').select('id', { count: 'exact', head: true }).eq('engagement_assignment_id', assignmentId)
  if (countError) throw countError
  if (!count) throw new Error('Record at least one labor actual before completing the assignment.')

  const { data, error: updateError } = await client.from('engagement_assignments').update({ assignment_state: 'COMPLETED' }).eq('id', assignmentId).select('id,assignment_state').single()
  if (updateError) throw updateError
  return data
}

export async function recordResourceUsageFromCommitment(input: {
  resourceCommitmentId: string
  usageState?: ResourceUsageState
  quantity?: number | null
  usedFrom?: string | null
  usedThrough?: string | null
  certaintyState?: ActualCertainty
  allowQuantityOverage?: boolean
  overageReason?: string | null
  notes?: string | null
}) {
  const client = requireClient()
  if (input.usedFrom && input.usedThrough && Date.parse(input.usedThrough) < Date.parse(input.usedFrom)) throw new Error('Used-through time cannot be before used-from time.')

  const { data: commitment, error: commitmentError } = await client
    .from('resource_commitments')
    .select('id,engagement_id,resource_id,fulfillment_plan_line_id,commitment_state,quantity')
    .eq('id', input.resourceCommitmentId)
    .single()
  if (commitmentError) throw commitmentError
  if (!['CONFIRMED', 'FULFILLED'].includes(commitment.commitment_state)) throw new Error('Resource usage requires a CONFIRMED or FULFILLED Resource commitment.')

  const quantity = input.quantity ?? commitment.quantity
  if (quantity == null || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0) throw new Error('Actual Resource quantity must be greater than zero.')
  const committedQuantity = commitment.quantity == null ? null : Number(commitment.quantity)
  if (committedQuantity != null && Number(quantity) > committedQuantity) {
    if (!input.allowQuantityOverage) throw new Error('Actual Resource quantity exceeds the committed quantity. Explicitly allow the overage and provide a reason.')
    if (!input.overageReason?.trim()) throw new Error('A quantity-overage reason is required.')
  }

  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id
  if (!userId) throw new Error('You must be signed in to record Resource usage.')

  const payload = {
    engagement_id: commitment.engagement_id,
    resource_id: commitment.resource_id,
    resource_commitment_id: commitment.id,
    fulfillment_plan_line_id: commitment.fulfillment_plan_line_id,
    source_key: `actuals:resource-commitment:${commitment.id}`,
    usage_state: input.usageState ?? 'COMPLETE',
    quantity: Number(quantity),
    used_from: input.usedFrom ?? null,
    used_through: input.usedThrough ?? null,
    certainty_state: input.certaintyState ?? 'KNOWN',
    notes: input.notes?.trim() || null,
    metadata: {
      actuals_runtime: 'v1',
      quantity_overage_approved: Boolean(input.allowQuantityOverage && committedQuantity != null && Number(quantity) > committedQuantity),
      quantity_overage_reason: input.overageReason?.trim() || null,
    },
    created_by: userId,
  }

  const { data: existing, error: existingError } = await client.from('resource_usage').select('id').eq('resource_commitment_id', commitment.id).maybeSingle()
  if (existingError) throw existingError
  if (existing) {
    const { error } = await client.from('resource_usage').update({
      usage_state: payload.usage_state,
      quantity: payload.quantity,
      used_from: payload.used_from,
      used_through: payload.used_through,
      certainty_state: payload.certainty_state,
      notes: payload.notes,
      metadata: payload.metadata,
    }).eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await client.from('resource_usage').insert(payload)
    if (error) throw error
  }

  const { data: row, error: readError } = await client.from('engagement_resource_actuals_v').select('*').eq('resource_commitment_id', commitment.id).single()
  if (readError) throw readError
  return row as ResourceActualRow
}

function moneyFromInput(amount?: number, quantity?: number, unitCost?: number) {
  if (quantity !== undefined || unitCost !== undefined) {
    if (quantity === undefined || unitCost === undefined) throw new Error('Quantity and unit cost must be provided together.')
    if (!Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(unitCost) || unitCost < 0) throw new Error('Quantity and unit cost must be non-negative numbers.')
    const computed = Math.round(quantity * unitCost * 100) / 100
    if (amount !== undefined && Math.abs(amount - computed) > 0.009) throw new Error('Amount does not match quantity × unit cost.')
    return { amount: computed, quantity, unitCost, calculationMethod: 'QUANTITY_X_UNIT_COST' as const }
  }
  if (amount === undefined || !Number.isFinite(amount) || amount < 0) throw new Error('Provide a non-negative actual amount or quantity + unit cost.')
  return { amount, quantity: null, unitCost: null, calculationMethod: 'FLAT_AMOUNT' as const }
}

export async function recordActualCost(input: {
  engagementId: string
  category?: CostCategory
  description?: string
  amount?: number
  quantity?: number
  unitCost?: number
  incurredDate?: string | null
  plannedCostItemId?: string | null
  laborActualId?: string | null
  resourceUsageId?: string | null
  resourceId?: string | null
  teamMemberId?: string | null
  counterpartyPartyId?: string | null
  economicRateProfileId?: string | null
  certaintyState?: ActualCertainty
  sourceType?: 'MANUAL' | 'RATE_PROFILE' | 'VENDOR' | 'IMPORT' | 'SYSTEM' | 'ACCOUNTING' | 'OTHER'
  sourceKey?: string | null
  notes?: string | null
}) {
  const client = requireClient()
  const money = moneyFromInput(input.amount, input.quantity, input.unitCost)
  let planned: any = null
  if (input.plannedCostItemId) {
    const { data, error } = await client.from('engagement_cost_items').select('id,engagement_id,cost_state,cost_category,description,resource_id,team_member_id,counterparty_party_id,economic_rate_profile_id,commercial_line_id,fulfillment_line_id,engagement_assignment_id').eq('id', input.plannedCostItemId).single()
    if (error) throw error
    if (data.engagement_id !== input.engagementId) throw new Error('Planned cost belongs to a different Engagement.')
    if (!['ESTIMATE', 'COMMITTED'].includes(data.cost_state)) throw new Error('Actual costs may only link to ESTIMATE or COMMITTED plan costs.')
    planned = data
  }

  let labor: any = null
  if (input.laborActualId) {
    const { data, error } = await client.from('engagement_labor_actuals').select('id,engagement_id,team_member_id,engagement_assignment_id').eq('id', input.laborActualId).single()
    if (error) throw error
    if (data.engagement_id !== input.engagementId) throw new Error('Labor actual belongs to a different Engagement.')
    labor = data
  }

  let usage: any = null
  if (input.resourceUsageId) {
    const { data, error } = await client.from('resource_usage').select('id,engagement_id,resource_id,fulfillment_plan_line_id').eq('id', input.resourceUsageId).single()
    if (error) throw error
    if (data.engagement_id !== input.engagementId) throw new Error('Resource usage belongs to a different Engagement.')
    usage = data
  }

  const category = input.category ?? planned?.cost_category ?? (labor ? 'LABOR' : undefined)
  if (!category) throw new Error('Actual cost category is required.')
  if (labor && category !== 'LABOR') throw new Error('A labor actual can only link to a LABOR cost item.')

  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id
  if (!userId) throw new Error('You must be signed in to record actual cost.')

  const payload = {
    engagement_id: input.engagementId,
    source_key: input.sourceKey ?? null,
    cost_category: category,
    cost_state: 'ACTUAL',
    description: input.description?.trim() || (planned ? `Actual — ${planned.description}` : 'Actual direct cost'),
    quantity: money.quantity,
    unit_cost: money.unitCost,
    amount: money.amount,
    currency: 'USD',
    incurred_date: input.incurredDate ?? new Date().toISOString().slice(0, 10),
    counterparty_party_id: input.counterpartyPartyId ?? planned?.counterparty_party_id ?? null,
    team_member_id: input.teamMemberId ?? labor?.team_member_id ?? planned?.team_member_id ?? null,
    resource_id: input.resourceId ?? usage?.resource_id ?? planned?.resource_id ?? null,
    certainty_state: input.certaintyState ?? 'KNOWN',
    notes: input.notes?.trim() || null,
    created_by: userId,
    economic_rate_profile_id: input.economicRateProfileId ?? planned?.economic_rate_profile_id ?? null,
    commercial_line_id: planned?.commercial_line_id ?? null,
    fulfillment_line_id: usage?.fulfillment_plan_line_id ?? planned?.fulfillment_line_id ?? null,
    engagement_assignment_id: labor?.engagement_assignment_id ?? planned?.engagement_assignment_id ?? null,
    applied_rate: money.unitCost,
    rate_basis: money.unitCost != null && labor ? 'HOUR' : money.unitCost != null ? 'UNIT' : null,
    source_type: input.sourceType ?? 'MANUAL',
    planned_cost_item_id: input.plannedCostItemId ?? null,
    labor_actual_id: input.laborActualId ?? null,
    resource_usage_id: input.resourceUsageId ?? null,
    metadata: { actuals_runtime: 'v1', calculation_method: money.calculationMethod },
  }

  if (input.sourceKey) {
    const { data: existing, error: existingError } = await client.from('engagement_cost_items').select('id,cost_state').eq('source_key', input.sourceKey).maybeSingle()
    if (existingError) throw existingError
    if (existing) {
      if (existing.cost_state !== 'ACTUAL') throw new Error('That source key already belongs to a non-ACTUAL cost item.')
      const { data, error } = await client.from('engagement_cost_items').update(payload).eq('id', existing.id).select('id').single()
      if (error) throw error
      return data
    }
  }

  const { data, error } = await client.from('engagement_cost_items').insert(payload).select('id').single()
  if (error) throw error
  return data
}

export async function recordLaborActualCostFromApprovedRate(input: {
  laborActualId: string
  rateProfileId: string
  plannedCostItemId?: string | null
  incurredDate?: string | null
  notes?: string | null
}) {
  const client = requireClient()
  const { data: labor, error: laborError } = await client.from('engagement_labor_actuals').select('id,engagement_id,team_member_id,engagement_assignment_id,actual_minutes').eq('id', input.laborActualId).single()
  if (laborError) throw laborError

  const { data: rate, error: rateError } = await client.from('economic_rate_profiles').select('id,status,cost_domain,scope_type,team_member_id,role_code,unit_basis,amount,currency,effective_from,effective_through').eq('id', input.rateProfileId).single()
  if (rateError) throw rateError
  if (rate.status !== 'APPROVED') throw new Error('Only an APPROVED Cost Book rate can calculate actual labor cost.')
  if (rate.cost_domain !== 'LABOR') throw new Error('Selected Cost Book profile is not a labor rate.')
  if (rate.unit_basis !== 'HOUR') throw new Error('Automatic labor actual calculation currently requires an hourly rate.')
  if (rate.team_member_id && rate.team_member_id !== labor.team_member_id) throw new Error('Approved rate belongs to a different team member.')

  if (rate.role_code) {
    if (!labor.engagement_assignment_id) throw new Error('Role-scoped rates require a linked assignment.')
    const { data: assignment, error } = await client.from('engagement_assignments').select('role_code').eq('id', labor.engagement_assignment_id).single()
    if (error) throw error
    if (assignment.role_code !== rate.role_code) throw new Error('Approved rate does not match the assignment role.')
  }

  const incurredDate = input.incurredDate ?? new Date().toISOString().slice(0, 10)
  if (rate.effective_from && incurredDate < rate.effective_from) throw new Error('Approved labor rate was not effective on the incurred date.')
  if (rate.effective_through && incurredDate > rate.effective_through) throw new Error('Approved labor rate was no longer effective on the incurred date.')

  const hours = Number(labor.actual_minutes) / 60
  const hourlyRate = Number(rate.amount)
  const amount = Math.round(hours * hourlyRate * 100) / 100
  return recordActualCost({
    engagementId: labor.engagement_id,
    category: 'LABOR',
    description: 'Actual labor from approved Cost Book rate',
    amount,
    quantity: hours,
    unitCost: hourlyRate,
    incurredDate,
    plannedCostItemId: input.plannedCostItemId ?? null,
    laborActualId: labor.id,
    teamMemberId: labor.team_member_id,
    economicRateProfileId: rate.id,
    sourceType: 'RATE_PROFILE',
    sourceKey: `actuals:labor-rate:${labor.id}`,
    notes: input.notes ?? null,
  })
}
