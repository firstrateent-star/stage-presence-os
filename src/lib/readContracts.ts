import { supabase } from './supabase'
import type {
  AttentionState,
  CommercialState,
  CommitmentState,
  EngagementType,
  OperationalState,
  ResourceCategory,
} from '../types/domain'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured. Copy .env.example to .env and add Supabase values.')
  return supabase
}

export type CapabilityKind =
  | 'PHYSICAL_CAPACITY'
  | 'SERVICE'
  | 'LOGISTICS'
  | 'COMMERCIAL_ADJUSTMENT'
  | 'OTHER'

export interface EngagementSummary {
  id: string
  engagement_number: string
  display_number: number | null
  name: string
  engagement_type: EngagementType
  customer_request: string | null
  desired_outcome: string | null
  event_start: string | null
  event_end: string | null
  event_start_date: string | null
  event_end_date: string | null
  commercial_state: CommercialState
  commitment_state: CommitmentState
  operational_state: OperationalState
  attention_state: AttentionState
  updated_at: string
  primary_customer: Record<string, unknown> | null
  venue: Record<string, unknown> | null
  venue_basis: 'CANONICAL_LOCATION' | 'COMPATIBILITY_FALLBACK' | 'UNKNOWN' | string
  next_work: Record<string, unknown> | null
  next_schedule: Record<string, unknown> | null
  economy: Record<string, unknown> | null
  open_work_count: number
  active_assignment_count: number
  active_resource_commitment_count: number
  evidence_segment_count: number
}

export interface CapabilitySummary {
  resource_id: string
  name: string
  category: ResourceCategory
  resource_type: string | null
  sourcing_model: 'OWNED' | 'SUBCONTRACTED' | 'PARTNER' | 'VENUE' | 'UNKNOWN'
  quantity: number | null
  quantity_state: 'VERIFIED' | 'UNVERIFIED' | 'ESTIMATED' | 'UNKNOWN'
  condition_state: string | null
  reference_price: number | null
  price_basis: string | null
  price_state: 'VERIFIED_CURRENT' | 'LEGACY_REFERENCE' | 'ESTIMATED' | 'UNKNOWN'
  active: boolean
  active_commitment_count: number
  active_committed_quantity: number | null
  next_commitment_from: string | null
  active_commitment_through: string | null
  usage_record_count: number
  represented_actual_usage_count: number
  represented_actual_quantity: number | null
  latest_usage_through: string | null
  commercial_line_count: number
  represented_commercial_line_value: number | null
  direct_cost_record_count: number
  represented_actual_direct_cost: number | null
  represented_committed_direct_cost: number | null
  represented_estimated_direct_cost: number | null
  economic_as_of: string | null
  ownership_state: string | null
  economic_represented_quantity: number | null
  acquisition_cost_total: number | null
  current_value_estimate: number | null
  replacement_cost_total: number | null
  financing_balance: number | null
  annual_maintenance_estimate: number | null
  economic_certainty_state: string | null
  capability_evidence_state: string
  capability_kind: CapabilityKind
  capacity_relevant: boolean
}

export interface RelationshipSummary {
  party_id: string
  party_type: 'PERSON' | 'ORGANIZATION'
  name: string
  organization_name: string | null
  email: string | null
  phone: string | null
  engagement_count: number
  current_future_count: number
  first_engagement_date: string | null
  latest_engagement_date: string | null
  committed_revenue_observed: number | null
  collected_observed: number | null
  contribution_observed_where_known: number | null
  engagements_with_known_contribution: number
}

export interface EconomyOverview {
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
  liquid_funds_observed: number | null
  liabilities_observed: number | null
  net_account_position_observed: number | null
  funds_evidence_state: string
  company_cost_actual_ytd: number | null
  company_cost_evidence_state: string
  asset_current_value_observed: number | null
  asset_replacement_value_observed: number | null
  asset_financing_balance_observed: number | null
  asset_evidence_state: string
  operating_economy_evidence_state: string
}

export interface RecoveryQueueItem {
  queue_rank: number
  candidate_key: string
  candidate_type: string
  domain: string
  title: string
  description: string
  engagement_id: string | null
  engagement_number: string | null
  engagement_name: string | null
  resource_id: string | null
  resource_name: string | null
  source_artifact_id: string | null
  source_segment_id: string | null
  source_label: string | null
  evidence: Record<string, unknown> | null
  confidence: string
  certainty_state: string
  urgency: 'NOW' | 'SOON' | 'LATER' | string
  lane: string
  business_impact: string
  suggested_action: string
  priority_score: number
  decision_id: string | null
  status: string
  assigned_member_id: string | null
  assigned_username: string | null
  assigned_display_name: string | null
  decision_note: string | null
  deferred_until: string | null
}

export async function listEngagementSummaries(): Promise<EngagementSummary[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('engagement_summary_v')
    .select('*')
    .order('event_start_date', { ascending: true, nullsFirst: false })
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as EngagementSummary[]
}

export async function getEngagementSummary(id: string): Promise<EngagementSummary | null> {
  const client = requireClient()
  const { data, error } = await client.from('engagement_summary_v').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as EngagementSummary | null
}

export async function listCapabilities(options: {
  kind?: CapabilityKind
  capacityRelevant?: boolean
} = {}): Promise<CapabilitySummary[]> {
  const client = requireClient()
  let query = client.from('capability_summary_v').select('*').order('category').order('name')
  if (options.kind) query = query.eq('capability_kind', options.kind)
  if (options.capacityRelevant !== undefined) query = query.eq('capacity_relevant', options.capacityRelevant)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as CapabilitySummary[]
}

export async function listRelationshipSummaries(): Promise<RelationshipSummary[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('relationship_summary_v')
    .select('*')
    .order('current_future_count', { ascending: false })
    .order('latest_engagement_date', { ascending: false, nullsFirst: false })
    .order('name')
  if (error) throw error
  return (data ?? []) as RelationshipSummary[]
}

export async function getEconomyOverview(): Promise<EconomyOverview | null> {
  const client = requireClient()
  const { data, error } = await client.from('economy_overview_v').select('*').maybeSingle()
  if (error) throw error
  return data as EconomyOverview | null
}

export async function listRecoveryQueue(limit = 100): Promise<RecoveryQueueItem[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('recovery_queue_v')
    .select('*')
    .order('queue_rank')
    .limit(limit)
  if (error) throw error
  return (data ?? []) as RecoveryQueueItem[]
}
