import { supabase } from './supabase'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured. Copy .env.example to .env and add Supabase values.')
  return supabase
}

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

export type CostState = 'ESTIMATE' | 'COMMITTED' | 'ACTUAL' | 'CANCELLED'
export type CostCertainty = 'VERIFIED' | 'KNOWN' | 'ESTIMATED' | 'ASSUMED' | 'CONFLICTING'
export type RateBasis = 'HOUR' | 'DAY' | 'EVENT' | 'UNIT' | 'MILE' | 'WEEK' | 'MONTH' | 'FLAT' | 'OTHER'

export interface PriceBookEntry {
  pricing_rule_id: string | null
  entry_kind: string
  code: string | null
  name: string
  status: string | null
  rule_kind: string | null
  price_position: string | null
  scope_type: string
  resource_id: string | null
  role_code: string | null
  category: string | null
  engagement_type: string | null
  resource_name: string | null
  scope_label: string
  rate_type: string | null
  billing_basis: string | null
  duration_value: number | null
  duration_unit: string | null
  amount: number | null
  percentage: number | null
  currency: string
  authority_state: string
}

export interface CostBookEntry {
  economic_rate_profile_id: string | null
  entry_kind: string
  profile_key: string
  version_no: number | null
  name: string
  status: string | null
  cost_domain: string
  rate_kind: string | null
  scope_type: string
  resource_id: string | null
  resource_name: string | null
  team_member_id: string | null
  team_member_name: string | null
  party_id: string | null
  party_name: string | null
  role_code: string | null
  category: string | null
  unit_basis: RateBasis | null
  amount: number | null
  currency: string
  authority_state: string
}

export interface EngagementEstimatePosition {
  engagement_id: string
  engagement_number: string
  engagement_name: string
  engagement_type: string
  commercial_state: string
  commitment_state: string
  estimate_item_count: number
  estimated_direct_cost: number
  committed_item_count: number
  committed_direct_cost: number
  actual_item_count: number
  actual_direct_cost: number
  cancelled_item_count: number
  represented_cost_category_count: number
  cost_evidence_state: string
  known_cost_item_count: number
  estimated_certainty_item_count: number
  assumed_cost_item_count: number
  estimated_labor_cost: number
  estimated_subcontract_cost: number
  estimated_equipment_cost: number
  estimated_materials_purchase_cost: number
  estimated_logistics_travel_cost: number
  estimated_other_direct_cost: number
  scope_line_count: number
  scope_lines_with_cost: number
  cost_decision_gap_count: number
  approved_rate_available_count: number
  draft_rate_available_count: number
  estimate_coverage_state: string
}

export interface EngagementEstimateLine {
  cost_item_id: string
  engagement_id: string
  engagement_number: string
  engagement_name: string
  cost_category: CostCategory
  cost_state: CostState
  description: string
  quantity: number | null
  unit_cost: number | null
  amount: number
  currency: string
  expected_date: string | null
  incurred_date: string | null
  certainty_state: CostCertainty
  source_type: string
  notes: string | null
  resource_id: string | null
  resource_name: string | null
  team_member_id: string | null
  team_member_name: string | null
  counterparty_party_id: string | null
  counterparty_name: string | null
  economic_rate_profile_id: string | null
  rate_profile_key: string | null
  rate_profile_name: string | null
  rate_profile_status: string | null
  applied_rate: number | null
  rate_basis: RateBasis | null
  rate_authority_state: string | null
  fulfillment_line_id: string | null
  fulfillment_line_title: string | null
  commercial_line_id: string | null
  commercial_line_description: string | null
  engagement_assignment_id: string | null
  created_at: string
  updated_at: string
}

export interface ScopeCostCoverageLine {
  engagement_id: string
  engagement_number: string
  engagement_name: string
  engagement_type: string
  fulfillment_plan_id: string
  plan_type: string
  fulfillment_line_id: string
  sort_order: number | null
  fulfillment_line_type: string
  primary_category: string | null
  subcategory: string | null
  title: string
  description: string | null
  quantity: number | null
  resource_id: string | null
  resource_name: string | null
  resource_category: string | null
  resource_sourcing_model: string | null
  represented_cost_item_count: number
  estimate_item_count: number
  committed_item_count: number
  actual_item_count: number
  estimated_cost: number | null
  committed_cost: number | null
  actual_cost: number | null
  approved_rate_count: number
  draft_rate_count: number
  best_rate_profile_id: string | null
  best_rate_profile_name: string | null
  best_rate_status: string | null
  best_rate_amount: number | null
  best_rate_unit_basis: RateBasis | null
  cost_coverage_state: string
  cost_decision_required: boolean
}

export async function listPriceBook(): Promise<PriceBookEntry[]> {
  const client = requireClient()
  const { data, error } = await client.from('price_book_v').select('*').order('scope_label').order('duration_value', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data ?? []) as PriceBookEntry[]
}

export async function listCostBook(): Promise<CostBookEntry[]> {
  const client = requireClient()
  const { data, error } = await client.from('cost_book_v').select('*').order('cost_domain').order('name')
  if (error) throw error
  return (data ?? []) as CostBookEntry[]
}

export async function getEngagementEstimatePosition(engagementId: string): Promise<EngagementEstimatePosition | null> {
  const client = requireClient()
  const { data, error } = await client.from('engagement_estimate_position_v').select('*').eq('engagement_id', engagementId).maybeSingle()
  if (error) throw error
  return data as EngagementEstimatePosition | null
}

export async function listEngagementEstimateLines(engagementId: string): Promise<EngagementEstimateLine[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('engagement_estimate_lines_v')
    .select('*')
    .eq('engagement_id', engagementId)
    .order('created_at')
  if (error) throw error
  return (data ?? []) as EngagementEstimateLine[]
}

export async function listScopeCostCoverage(engagementId: string): Promise<ScopeCostCoverageLine[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('engagement_scope_cost_coverage_v')
    .select('*')
    .eq('engagement_id', engagementId)
    .order('sort_order', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data ?? []) as ScopeCostCoverageLine[]
}

export interface ManualEstimateInput {
  engagementId: string
  category: CostCategory
  description: string
  amount?: number
  quantity?: number
  unitCost?: number
  rateBasis?: RateBasis
  resourceId?: string
  teamMemberId?: string
  counterpartyPartyId?: string
  fulfillmentLineId?: string
  commercialLineId?: string
  engagementAssignmentId?: string
  expectedDate?: string
  certaintyState?: CostCertainty
  notes?: string
}

function positiveNumber(value: number | undefined, label: string) {
  if (value === undefined) return undefined
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a non-negative number.`)
  return value
}

function computedMoney(quantity: number, unitCost: number) {
  return Math.round(quantity * unitCost * 100) / 100
}

export async function createManualEstimate(input: ManualEstimateInput): Promise<EngagementEstimateLine> {
  const client = requireClient()
  const quantity = positiveNumber(input.quantity, 'Quantity')
  const unitCost = positiveNumber(input.unitCost, 'Unit cost')
  const suppliedAmount = positiveNumber(input.amount, 'Amount')

  let amount: number
  let calculationMethod: 'QUANTITY_X_UNIT_COST' | 'FLAT_AMOUNT'
  if (quantity !== undefined || unitCost !== undefined) {
    if (quantity === undefined || unitCost === undefined) throw new Error('Quantity and unit cost must be provided together.')
    amount = computedMoney(quantity, unitCost)
    calculationMethod = 'QUANTITY_X_UNIT_COST'
    if (suppliedAmount !== undefined && Math.abs(suppliedAmount - amount) > 0.009) {
      throw new Error('Amount does not match quantity × unit cost.')
    }
  } else {
    if (suppliedAmount === undefined) throw new Error('Provide either amount or quantity + unit cost.')
    amount = suppliedAmount
    calculationMethod = 'FLAT_AMOUNT'
  }

  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id ?? null

  const { data, error } = await client
    .from('engagement_cost_items')
    .insert({
      engagement_id: input.engagementId,
      cost_category: input.category,
      cost_state: 'ESTIMATE',
      description: input.description.trim(),
      quantity: quantity ?? null,
      unit_cost: unitCost ?? null,
      amount,
      currency: 'USD',
      expected_date: input.expectedDate ?? null,
      counterparty_party_id: input.counterpartyPartyId ?? null,
      team_member_id: input.teamMemberId ?? null,
      resource_id: input.resourceId ?? null,
      certainty_state: input.certaintyState ?? 'ESTIMATED',
      notes: input.notes?.trim() || null,
      created_by: userId,
      commercial_line_id: input.commercialLineId ?? null,
      fulfillment_line_id: input.fulfillmentLineId ?? null,
      engagement_assignment_id: input.engagementAssignmentId ?? null,
      applied_rate: unitCost ?? null,
      rate_basis: input.rateBasis ?? (unitCost !== undefined ? 'UNIT' : 'FLAT'),
      source_type: 'MANUAL',
      metadata: { calculation_method: calculationMethod, estimate_runtime: 'v1' },
    })
    .select('id')
    .single()
  if (error) throw error

  const { data: line, error: lineError } = await client.from('engagement_estimate_lines_v').select('*').eq('cost_item_id', data.id).single()
  if (lineError) throw lineError
  return line as EngagementEstimateLine
}

export interface RateProfileEstimateInput {
  engagementId: string
  rateProfileId: string
  quantity?: number
  description?: string
  categoryOverride?: CostCategory
  fulfillmentLineId?: string
  commercialLineId?: string
  engagementAssignmentId?: string
  expectedDate?: string
  allowDraft?: boolean
  notes?: string
}

function categoryForCostDomain(domain: string): CostCategory {
  switch (domain) {
    case 'ASSET': return 'EQUIPMENT_OWNERSHIP'
    case 'LABOR': return 'LABOR'
    case 'SUBCONTRACT': return 'SUBCONTRACT'
    case 'LOGISTICS': return 'TRANSPORT'
    case 'TRAVEL': return 'TRAVEL'
    case 'MATERIALS': return 'MATERIALS'
    case 'FEES': return 'PROCESSING_FEE'
    case 'OVERHEAD': return 'OVERHEAD_ALLOCATED'
    default: return 'OTHER'
  }
}

export async function createEstimateFromRateProfile(input: RateProfileEstimateInput): Promise<EngagementEstimateLine> {
  const client = requireClient()
  const quantity = input.quantity ?? 1
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Quantity must be greater than zero.')

  const { data: profile, error: profileError } = await client
    .from('economic_rate_profiles')
    .select('id,profile_key,name,status,cost_domain,scope_type,resource_id,team_member_id,party_id,unit_basis,amount,currency,effective_from,effective_through,certainty_state,source_artifact_id')
    .eq('id', input.rateProfileId)
    .single()
  if (profileError) throw profileError

  if (profile.status === 'RETIRED') throw new Error('That cost rate is retired and cannot be applied to a new estimate.')
  if (profile.status === 'DRAFT' && !input.allowDraft) {
    throw new Error('That Cost Book rate is still DRAFT. Explicitly allow the draft rate or approve it before applying it.')
  }
  if (profile.status === 'APPROVED') {
    const today = new Date().toISOString().slice(0, 10)
    if (profile.effective_from && profile.effective_from > today) throw new Error('That approved rate is not effective yet.')
    if (profile.effective_through && profile.effective_through < today) throw new Error('That approved rate is no longer effective.')
  }

  const amount = computedMoney(quantity, Number(profile.amount))
  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id ?? null
  const authorityState = profile.status === 'APPROVED' ? 'APPROVED_AUTHORITY' : 'DRAFT_CANDIDATE'

  const { data, error } = await client
    .from('engagement_cost_items')
    .insert({
      engagement_id: input.engagementId,
      cost_category: input.categoryOverride ?? categoryForCostDomain(profile.cost_domain),
      cost_state: 'ESTIMATE',
      description: input.description?.trim() || profile.name,
      quantity,
      unit_cost: profile.amount,
      amount,
      currency: profile.currency,
      expected_date: input.expectedDate ?? null,
      counterparty_party_id: profile.party_id,
      team_member_id: profile.team_member_id,
      resource_id: profile.resource_id,
      certainty_state: profile.certainty_state,
      source_artifact_id: profile.source_artifact_id,
      notes: input.notes?.trim() || null,
      created_by: userId,
      economic_rate_profile_id: profile.id,
      commercial_line_id: input.commercialLineId ?? null,
      fulfillment_line_id: input.fulfillmentLineId ?? null,
      engagement_assignment_id: input.engagementAssignmentId ?? null,
      applied_rate: profile.amount,
      rate_basis: profile.unit_basis,
      source_type: 'RATE_PROFILE',
      metadata: {
        calculation_method: 'QUANTITY_X_RATE',
        estimate_runtime: 'v1',
        rate_profile_key: profile.profile_key,
        rate_profile_status_at_application: profile.status,
        rate_authority_state_at_application: authorityState,
      },
    })
    .select('id')
    .single()
  if (error) throw error

  const { data: line, error: lineError } = await client.from('engagement_estimate_lines_v').select('*').eq('cost_item_id', data.id).single()
  if (lineError) throw lineError
  return line as EngagementEstimateLine
}

export interface TransitionCostItemInput {
  costItemId: string
  state: Exclude<CostState, 'ESTIMATE'> | 'ESTIMATE'
  quantity?: number
  unitCost?: number
  amount?: number
  incurredDate?: string | null
  certaintyState?: CostCertainty
}

export async function transitionCostItem(input: TransitionCostItemInput): Promise<EngagementEstimateLine> {
  const client = requireClient()
  const { data: existing, error: existingError } = await client
    .from('engagement_cost_items')
    .select('id,cost_state,quantity,unit_cost,amount')
    .eq('id', input.costItemId)
    .single()
  if (existingError) throw existingError
  if (existing.cost_state === 'CANCELLED') throw new Error('Cancelled cost items cannot be reactivated. Create a new cost item instead.')

  const quantity = input.quantity ?? existing.quantity
  const unitCost = input.unitCost ?? existing.unit_cost
  let amount = input.amount ?? existing.amount
  if (quantity !== null && quantity !== undefined && unitCost !== null && unitCost !== undefined) {
    amount = computedMoney(Number(quantity), Number(unitCost))
  }
  positiveNumber(Number(amount), 'Amount')

  const patch: Record<string, unknown> = {
    cost_state: input.state,
    quantity,
    unit_cost: unitCost,
    amount,
  }
  if (input.certaintyState) patch.certainty_state = input.certaintyState
  if (input.state === 'ACTUAL') patch.incurred_date = input.incurredDate ?? new Date().toISOString().slice(0, 10)
  else if (input.incurredDate !== undefined) patch.incurred_date = input.incurredDate

  const { error } = await client.from('engagement_cost_items').update(patch).eq('id', input.costItemId)
  if (error) throw error

  const { data: line, error: lineError } = await client.from('engagement_estimate_lines_v').select('*').eq('cost_item_id', input.costItemId).single()
  if (lineError) throw lineError
  return line as EngagementEstimateLine
}
