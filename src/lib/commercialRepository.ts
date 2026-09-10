import { supabase } from './supabase'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured.')
  return supabase
}

export type QuoteReadinessState = 'NEEDS_REQUIREMENTS' | 'DRAFTABLE' | 'DRAFTABLE_WITH_REVIEW' | 'PRICING_REVIEW'
export type PricingAuthorityState =
  | 'APPROVED_RULE_AVAILABLE'
  | 'CURRENT_REFERENCE_ONLY'
  | 'LEGACY_REFERENCE_ONLY'
  | 'HISTORICAL_ONLY'
  | 'UNLINKED_SCOPE_REVIEW'
  | 'NO_PRICE_EVIDENCE'
  | 'NON_PRICED_COMPONENT'

export interface EngagementQuoteReadinessRow {
  engagement_id: string
  engagement_number: string
  engagement_name: string
  engagement_type: string
  commercial_state: string
  commitment_state: string
  event_start_date: string | null
  scope_line_count: number
  resource_linked_line_count: number
  lines_with_approved_rule: number
  current_reference_only_lines: number
  legacy_reference_only_lines: number
  historical_only_lines: number
  no_authority_lines: number
  human_price_judgment_lines: number
  historical_observation_count: number
  current_quote_id: string | null
  current_quote_state: string | null
  current_quote_total: number | null
  current_quote_external_id: string | null
  readiness_state: QuoteReadinessState
  readiness_reason: string
}

export interface EngagementQuoteLineCandidateRow {
  engagement_id: string
  engagement_number: string
  engagement_name: string
  engagement_type: string
  commercial_state: string
  commitment_state: string
  fulfillment_plan_id: string | null
  fulfillment_line_id: string | null
  sort_order: number | null
  fulfillment_line_type: string | null
  primary_category: string | null
  subcategory: string | null
  title: string | null
  description: string | null
  quantity: number | null
  external_item_id: string | null
  resource_id: string | null
  resource_name: string | null
  resource_category: string | null
  resource_type: string | null
  reference_price: number | null
  reference_price_basis: string | null
  reference_price_state: string | null
  historical_observation_count: number
  historical_min_effective_unit: number | null
  historical_avg_effective_unit: number | null
  historical_max_effective_unit: number | null
  approved_rule_count: number
  approved_rules: Array<Record<string, unknown>> | null
  pricing_authority_state: PricingAuthorityState
  requires_human_price_judgment: boolean
}

export async function getEngagementQuoteReadiness(engagementId: string): Promise<EngagementQuoteReadinessRow | null> {
  const client = requireClient()
  const { data, error } = await client
    .from('engagement_quote_readiness_v')
    .select('*')
    .eq('engagement_id', engagementId)
    .maybeSingle()

  if (error) throw error
  return data as EngagementQuoteReadinessRow | null
}

export async function listEngagementQuoteLineCandidates(engagementId: string): Promise<EngagementQuoteLineCandidateRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('engagement_quote_line_candidates_v')
    .select('*')
    .eq('engagement_id', engagementId)
    .not('fulfillment_line_id', 'is', null)
    .order('sort_order', { ascending: true, nullsFirst: false })

  if (error) throw error
  return (data ?? []) as unknown as EngagementQuoteLineCandidateRow[]
}
