import { supabase } from './supabase'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured.')
  return supabase
}

export type CashEvidenceState = 'PAYMENT_RECORDS' | 'FINANCIAL_FACT_SNAPSHOT' | 'DOCUMENT_SNAPSHOT' | 'UNKNOWN'
export type EconomyState =
  | 'PROGRAM_ALLOCATION_UNKNOWN'
  | 'ACTUAL_CONTRIBUTION_SUPPORTED'
  | 'PROJECTED_CONTRIBUTION_SUPPORTED'
  | 'REVENUE_VISIBLE_COSTS_UNPOPULATED'
  | 'COMMERCIAL_VALUE_ONLY'
  | 'PARTIAL_OR_UNKNOWN'

export interface EconomyOverviewRow {
  open_pipeline_value_observed: number | null
  committed_revenue_observed: number | null
  invoiced_observed: number | null
  collected_observed: number | null
  outstanding_observed: number | null
  direct_cost_estimate_observed: number | null
  direct_cost_committed_observed: number | null
  direct_cost_actual_observed: number | null
  projected_contribution_observed_where_known: number | null
  contribution_observed_where_known: number | null
  engagement_count: number
  engagements_with_known_committed_value: number
  engagements_with_collection_evidence: number
  engagements_with_outstanding_evidence: number
  engagements_with_cost_evidence: number
  engagements_with_actual_contribution: number
  engagements_with_unknown_program_allocation: number
  oldest_cash_evidence_date: string | null
  newest_cash_evidence_date: string | null
  active_account_count: number
  accounts_with_snapshot: number
  liquid_funds_observed: number | null
  liabilities_observed: number | null
  net_account_position_observed: number | null
  oldest_account_snapshot_at: string | null
  newest_account_snapshot_at: string | null
  funds_evidence_state: 'NO_ACCOUNT_DATA' | 'NO_ACCOUNT_SNAPSHOTS' | 'PARTIAL_ACCOUNT_SNAPSHOTS' | 'ACCOUNT_SNAPSHOTS'
}

export interface EngagementEconomyRow {
  engagement_id: string
  engagement_number: string
  engagement_name: string
  engagement_type: string
  commercial_state: string
  commitment_state: string
  event_start_date: string | null
  proposal_value_observed: number | null
  committed_revenue_observed: number | null
  invoiced_observed: number | null
  collected_observed: number | null
  outstanding_observed: number | null
  scheduled_outstanding_amount: number | null
  overdue_scheduled_amount: number | null
  payment_schedule_count: number
  payment_record_count: number
  primary_document_id: string | null
  primary_document_type: string | null
  primary_document_state: string | null
  primary_document_external_id: string | null
  primary_document_source_system: string | null
  primary_document_date: string | null
  primary_document_snapshot_at: string | null
  primary_document_subtotal: number | null
  primary_document_discount_total: number | null
  primary_document_tax_total: number | null
  primary_document_processing_fee_total: number | null
  primary_document_total: number | null
  cash_evidence_state: CashEvidenceState
  cash_evidence_as_of: string | null
  value_basis: string
  allocation_is_unknown: boolean
  revenue_source_line_count: number
  represented_line_revenue: number | null
  revenue_mix: Record<string, number> | null
  direct_cost_estimate_observed: number | null
  direct_cost_committed_observed: number | null
  direct_cost_actual_observed: number | null
  cost_item_count: number | null
  estimated_cost_mix: Record<string, number> | null
  committed_cost_mix: Record<string, number> | null
  actual_cost_mix: Record<string, number> | null
  projected_contribution_observed: number | null
  contribution_observed: number | null
  projected_contribution_margin: number | null
  contribution_margin: number | null
  cost_evidence_state: string
  economy_state: EconomyState
}

export interface RevenueSourceRow {
  engagement_id: string
  commercial_document_id: string
  document_type: string
  document_state: string
  document_total: number | null
  document_subtotal: number | null
  document_discount_total: number | null
  document_tax_total: number | null
  document_processing_fee_total: number | null
  currency: string
  commercial_line_id: string | null
  sort_order: number | null
  group_label: string | null
  line_type: string | null
  resource_id: string | null
  resource_name: string | null
  description: string | null
  quantity: number | null
  unit_price: number | null
  effective_line_total: number | null
  gross_line_total: number | null
  line_discount_observed: number | null
  revenue_bucket: 'EQUIPMENT' | 'SERVICE' | 'LOGISTICS' | 'CUSTOM_PACKAGE' | 'DISCOUNT' | 'OTHER'
  share_of_document_total: number | null
  committed_source: boolean
  certainty_state: string
}

export interface EngagementCostRow {
  cost_item_id: string
  engagement_id: string
  cost_category: string
  economic_bucket: string
  cost_state: 'ESTIMATE' | 'COMMITTED' | 'ACTUAL'
  description: string
  quantity: number | null
  unit_cost: number | null
  amount: number
  currency: string
  expected_date: string | null
  incurred_date: string | null
  counterparty_name: string | null
  team_member_name: string | null
  resource_name: string | null
  rate_profile_key: string | null
  rate_profile_version: number | null
  rate_profile_name: string | null
  applied_rate: number | null
  rate_basis: string | null
  source_type: string
  certainty_state: string
  notes: string | null
  created_at: string
}

export interface EconomicRateProfileRow {
  id: string
  profile_key: string
  version_no: number
  name: string
  status: 'DRAFT' | 'APPROVED' | 'RETIRED'
  cost_domain: string
  rate_kind: string
  scope_type: string
  resource_id: string | null
  team_member_id: string | null
  party_id: string | null
  role_code: string | null
  category: string | null
  unit_basis: string
  amount: number
  currency: string
  effective_from: string | null
  effective_through: string | null
  certainty_state: string
  rationale: string | null
  notes: string | null
}

export interface CreateEngagementCostInput {
  engagement_id: string
  cost_category: string
  cost_state: 'ESTIMATE' | 'COMMITTED' | 'ACTUAL'
  description: string
  amount: number
  currency?: string
  quantity?: number | null
  unit_cost?: number | null
  expected_date?: string | null
  incurred_date?: string | null
  certainty_state?: 'VERIFIED' | 'KNOWN' | 'ESTIMATED' | 'ASSUMED' | 'CONFLICTING'
  notes?: string | null
}

export async function getEconomyOverview(): Promise<EconomyOverviewRow | null> {
  const client = requireClient()
  const { data, error } = await client.from('economy_overview_v').select('*').maybeSingle()
  if (error) throw error
  return data as EconomyOverviewRow | null
}

export async function listEngagementEconomies(): Promise<EngagementEconomyRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('engagement_economy_v')
    .select('*')
    .order('event_start_date', { ascending: false, nullsFirst: false })
  if (error) throw error
  return (data ?? []) as unknown as EngagementEconomyRow[]
}

export async function getEngagementEconomy(engagementId: string): Promise<EngagementEconomyRow | null> {
  const client = requireClient()
  const { data, error } = await client.from('engagement_economy_v').select('*').eq('engagement_id', engagementId).maybeSingle()
  if (error) throw error
  return data as EngagementEconomyRow | null
}

export async function listEngagementRevenueSources(engagementId: string): Promise<RevenueSourceRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('engagement_revenue_sources_v')
    .select('*')
    .eq('engagement_id', engagementId)
    .not('commercial_line_id', 'is', null)
    .order('sort_order', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data ?? []) as unknown as RevenueSourceRow[]
}

export async function listEngagementCosts(engagementId: string): Promise<EngagementCostRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('engagement_cost_breakdown_v')
    .select('*')
    .eq('engagement_id', engagementId)
    .order('incurred_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as EngagementCostRow[]
}

export async function listEconomicRateProfiles(): Promise<EconomicRateProfileRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('economic_rate_profiles')
    .select('id,profile_key,version_no,name,status,cost_domain,rate_kind,scope_type,resource_id,team_member_id,party_id,role_code,category,unit_basis,amount,currency,effective_from,effective_through,certainty_state,rationale,notes')
    .order('profile_key')
    .order('version_no', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as EconomicRateProfileRow[]
}

export async function createEngagementCost(input: CreateEngagementCostInput) {
  const client = requireClient()
  const { data: userData } = await client.auth.getUser()
  const { data, error } = await client
    .from('engagement_cost_items')
    .insert({
      ...input,
      currency: input.currency ?? 'USD',
      source_type: 'MANUAL',
      created_by: userData.user?.id ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function cancelEngagementCost(costItemId: string) {
  const client = requireClient()
  const { data, error } = await client
    .from('engagement_cost_items')
    .update({ cost_state: 'CANCELLED' })
    .eq('id', costItemId)
    .select('id')
    .single()
  if (error) throw error
  return data
}
