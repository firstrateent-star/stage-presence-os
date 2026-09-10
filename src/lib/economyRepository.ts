import { supabase } from './supabase'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured.')
  return supabase
}

export type CashEvidenceState = 'BASELINE_PLUS_PAYMENTS' | 'PAYMENT_RECORDS' | 'FINANCIAL_FACT_SNAPSHOT' | 'DOCUMENT_SNAPSHOT' | 'UNKNOWN'
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
  company_cost_record_count: number
  company_cost_record_count_ytd: number
  company_cost_estimate_ytd: number | null
  company_cost_committed_ytd: number | null
  company_cost_actual_ytd: number | null
  company_cost_evidence_state: 'NO_COMPANY_COST_DATA' | 'OBSERVED_COMPANY_COSTS_NOT_ASSERTED_COMPLETE'
  resource_economic_snapshot_count: number
  assets_with_value_estimate: number
  asset_current_value_observed: number | null
  asset_replacement_value_observed: number | null
  asset_financing_balance_observed: number | null
  asset_annual_maintenance_estimate_observed: number | null
  newest_asset_economic_as_of: string | null
  asset_evidence_state: 'NO_ASSET_ECONOMIC_DATA' | 'OBSERVED_ASSET_ECONOMICS_NOT_ASSERTED_COMPLETE'
  operating_economy_evidence_state: 'DIRECT_COST_COVERAGE_INCOMPLETE' | 'COMPANY_COST_COVERAGE_UNKNOWN' | 'FUNDS_COVERAGE_UNKNOWN' | 'OPERATING_ECONOMY_PARTIALLY_REPRESENTED'
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
  baseline_collected_observed: number | null
  baseline_as_of: string | null
  incremental_payments_observed: number | null
  post_baseline_payment_count: number
  cash_overlap_state: 'CLEAR' | 'PREBASELINE_PAYMENTS_NOT_ADDED' | 'BASELINE_DATE_UNKNOWN_REVIEW_OVERLAP'
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

export interface FinancialAccountRow {
  financial_account_id: string
  name: string
  account_type: string
  account_nature: 'ASSET' | 'LIABILITY'
  institution_name: string | null
  currency: string
  active: boolean
  snapshot_id: string | null
  as_of: string | null
  balance: number | null
  available_balance: number | null
  balance_kind: string | null
  certainty_state: string | null
  source_system: string | null
}

export interface CompanyCostRow {
  company_cost_id: string
  cost_category: string
  cost_state: 'ESTIMATE' | 'COMMITTED' | 'ACTUAL'
  description: string
  amount: number
  currency: string
  expected_date: string | null
  incurred_date: string | null
  period_start: string | null
  period_end: string | null
  recurrence_key: string | null
  economic_bucket: string
  counterparty_name: string | null
  financial_account_name: string | null
  resource_name: string | null
  rate_profile_key: string | null
  rate_profile_version: number | null
  rate_profile_name: string | null
  certainty_state: string
  source_type: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ResourceEconomyRow {
  resource_id: string
  resource_name: string
  resource_category: string
  resource_type: string | null
  sourcing_model: string
  active: boolean
  snapshot_id: string
  as_of: string
  ownership_state: string
  represented_quantity: number | null
  acquired_on: string | null
  acquisition_cost_total: number | null
  current_value_estimate: number | null
  replacement_cost_total: number | null
  financing_balance: number | null
  annual_maintenance_estimate: number | null
  certainty_state: string
  source_type: string
  notes: string | null
  created_at: string
}

export interface EconomicResourceRow {
  id: string
  name: string
  category: string
  resource_type: string | null
  sourcing_model: string
  active: boolean
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

export interface CreateCompanyCostInput {
  cost_category: string
  cost_state: 'ESTIMATE' | 'COMMITTED' | 'ACTUAL'
  description: string
  amount: number
  expected_date?: string | null
  incurred_date?: string | null
  period_start?: string | null
  period_end?: string | null
  recurrence_key?: string | null
  notes?: string | null
}

export interface CreateFinancialAccountInput {
  name: string
  account_type: 'CASH' | 'BANK' | 'CREDIT_CARD' | 'LOAN' | 'OTHER_ASSET' | 'OTHER_LIABILITY'
  account_nature: 'ASSET' | 'LIABILITY'
  institution_name?: string | null
}

export interface CreateResourceEconomicSnapshotInput {
  resource_id: string
  as_of: string
  ownership_state: 'OWNED' | 'FINANCED' | 'LEASED' | 'RENTED' | 'BORROWED' | 'UNKNOWN'
  represented_quantity?: number | null
  acquired_on?: string | null
  acquisition_cost_total?: number | null
  current_value_estimate?: number | null
  replacement_cost_total?: number | null
  financing_balance?: number | null
  annual_maintenance_estimate?: number | null
  notes?: string | null
}

export interface CreateRateDraftInput {
  profile_key: string
  name: string
  cost_domain: string
  rate_kind: string
  scope_type: 'GENERAL' | 'ROLE' | 'CATEGORY'
  role_code?: string | null
  category?: string | null
  unit_basis: string
  amount: number
  effective_from?: string | null
  rationale?: string | null
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
  const { data, error } = await client.from('engagement_economy_v').select('*').order('event_start_date', { ascending: false, nullsFirst: false })
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
  const { data, error } = await client.from('engagement_revenue_sources_v').select('*').eq('engagement_id', engagementId).not('commercial_line_id', 'is', null).order('sort_order', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data ?? []) as unknown as RevenueSourceRow[]
}

export async function listEngagementCosts(engagementId: string): Promise<EngagementCostRow[]> {
  const client = requireClient()
  const { data, error } = await client.from('engagement_cost_breakdown_v').select('*').eq('engagement_id', engagementId).order('incurred_date', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as EngagementCostRow[]
}

export async function listEconomicRateProfiles(): Promise<EconomicRateProfileRow[]> {
  const client = requireClient()
  const { data, error } = await client.from('economic_rate_profiles').select('id,profile_key,version_no,name,status,cost_domain,rate_kind,scope_type,resource_id,team_member_id,party_id,role_code,category,unit_basis,amount,currency,effective_from,effective_through,certainty_state,rationale,notes').order('profile_key').order('version_no', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as EconomicRateProfileRow[]
}

export async function listFinancialAccounts(): Promise<FinancialAccountRow[]> {
  const client = requireClient()
  const { data, error } = await client.from('financial_account_current_v').select('*').order('name')
  if (error) throw error
  return (data ?? []) as unknown as FinancialAccountRow[]
}

export async function listCompanyCosts(): Promise<CompanyCostRow[]> {
  const client = requireClient()
  const { data, error } = await client.from('company_cost_breakdown_v').select('*').order('incurred_date', { ascending: false, nullsFirst: false }).order('expected_date', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data ?? []) as unknown as CompanyCostRow[]
}

export async function listResourceEconomy(): Promise<ResourceEconomyRow[]> {
  const client = requireClient()
  const { data, error } = await client.from('resource_economy_current_v').select('*').order('resource_name')
  if (error) throw error
  return (data ?? []) as unknown as ResourceEconomyRow[]
}

export async function listEconomicResources(): Promise<EconomicResourceRow[]> {
  const client = requireClient()
  const { data, error } = await client.from('resources').select('id,name,category,resource_type,sourcing_model,active').eq('active', true).order('name')
  if (error) throw error
  return (data ?? []) as unknown as EconomicResourceRow[]
}

export async function createEngagementCost(input: CreateEngagementCostInput) {
  const client = requireClient()
  const { data: userData } = await client.auth.getUser()
  const { data, error } = await client.from('engagement_cost_items').insert({ ...input, currency: input.currency ?? 'USD', source_type: 'MANUAL', created_by: userData.user?.id ?? null }).select('*').single()
  if (error) throw error
  return data
}

export async function cancelEngagementCost(costItemId: string) {
  const client = requireClient()
  const { data, error } = await client.from('engagement_cost_items').update({ cost_state: 'CANCELLED' }).eq('id', costItemId).select('id').single()
  if (error) throw error
  return data
}

export async function recordCommercialPayment(input: { commercial_document_id: string; payment_date: string; amount: number; method?: string | null; financial_account_id?: string | null; notes?: string | null }) {
  const client = requireClient()
  const { data: userData } = await client.auth.getUser()
  const { data, error } = await client.from('commercial_payments').insert({
    commercial_document_id: input.commercial_document_id,
    payment_date: input.payment_date,
    method: input.method || null,
    status: 'SUCCEEDED',
    charged_amount: input.amount,
    applied_amount: input.amount,
    financial_account_id: input.financial_account_id || null,
    transaction_kind: 'PAYMENT',
    source_type: 'MANUAL',
    certainty_state: 'KNOWN',
    notes: input.notes || null,
    created_by: userData.user?.id ?? null,
  }).select('*').single()
  if (error) throw error
  return data
}

export async function createFinancialAccount(input: CreateFinancialAccountInput) {
  const client = requireClient()
  const { data: userData } = await client.auth.getUser()
  const { data, error } = await client.from('financial_accounts').insert({ ...input, currency: 'USD', created_by: userData.user?.id ?? null }).select('*').single()
  if (error) throw error
  return data
}

export async function recordFinancialAccountSnapshot(input: { financial_account_id: string; as_of: string; balance: number; available_balance?: number | null; notes?: string | null }) {
  const client = requireClient()
  const { data: userData } = await client.auth.getUser()
  const { data, error } = await client.from('financial_account_snapshots').insert({ ...input, as_of: `${input.as_of}T12:00:00`, balance_kind: 'CURRENT', certainty_state: 'KNOWN', source_system: 'MANUAL', created_by: userData.user?.id ?? null }).select('*').single()
  if (error) throw error
  return data
}

export async function createCompanyCost(input: CreateCompanyCostInput) {
  const client = requireClient()
  const { data: userData } = await client.auth.getUser()
  const { data, error } = await client.from('company_cost_items').insert({ ...input, currency: 'USD', certainty_state: input.cost_state === 'ESTIMATE' ? 'ESTIMATED' : 'KNOWN', source_type: 'MANUAL', created_by: userData.user?.id ?? null }).select('*').single()
  if (error) throw error
  return data
}

export async function cancelCompanyCost(companyCostId: string) {
  const client = requireClient()
  const { data, error } = await client.from('company_cost_items').update({ cost_state: 'CANCELLED' }).eq('id', companyCostId).select('id').single()
  if (error) throw error
  return data
}

export async function recordResourceEconomicSnapshot(input: CreateResourceEconomicSnapshotInput) {
  const client = requireClient()
  const { data: userData } = await client.auth.getUser()
  const { data, error } = await client.from('resource_economic_snapshots').insert({ ...input, certainty_state: 'ESTIMATED', source_type: 'MANUAL', created_by: userData.user?.id ?? null }).select('*').single()
  if (error) throw error
  return data
}

export async function createEconomicRateDraft(input: CreateRateDraftInput) {
  const client = requireClient()
  const profileKey = input.profile_key.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  if (!profileKey) throw new Error('Rate family key is required.')
  const { data: existing, error: lookupError } = await client.from('economic_rate_profiles').select('version_no').eq('profile_key', profileKey).order('version_no', { ascending: false }).limit(1)
  if (lookupError) throw lookupError
  const versionNo = Number(existing?.[0]?.version_no ?? 0) + 1
  const { data: userData } = await client.auth.getUser()
  const { data, error } = await client.from('economic_rate_profiles').insert({
    profile_key: profileKey,
    version_no: versionNo,
    name: input.name,
    status: 'DRAFT',
    cost_domain: input.cost_domain,
    rate_kind: input.rate_kind,
    scope_type: input.scope_type,
    role_code: input.scope_type === 'ROLE' ? input.role_code || null : null,
    category: input.scope_type === 'CATEGORY' ? input.category || null : null,
    unit_basis: input.unit_basis,
    amount: input.amount,
    currency: 'USD',
    effective_from: input.effective_from || null,
    certainty_state: 'ESTIMATED',
    rationale: input.rationale || null,
    notes: input.notes || null,
    created_by: userData.user?.id ?? null,
  }).select('*').single()
  if (error) throw error
  return data
}
