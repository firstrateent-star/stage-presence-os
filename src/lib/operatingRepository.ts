import { supabase } from './supabase'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured. Copy .env.example to .env and add Supabase values.')
  return supabase
}

export interface EngagementFrontendRow {
  id: string
  engagement_number: string
  name: string
  engagement_type: string
  customer_request: string | null
  desired_outcome: string | null
  event_start: string | null
  event_end: string | null
  event_start_date: string | null
  event_end_date: string | null
  venue_name: string | null
  venue_address: string | null
  commercial_state: string
  commitment_state: string
  operational_state: string
  attention_state: string
  updated_at: string
  primary_customer: Record<string, unknown> | null
  current_commercial_document: Record<string, unknown> | null
  economics: Record<string, unknown> | null
  next_work: Record<string, unknown> | null
  open_work_count: number
  fulfillment_line_count: number
  active_assignment_count: number
  next_schedule_item: Record<string, unknown> | null
  capacity_signal: 'HIGH' | 'WATCH' | 'INFO' | null
  evidence_segment_count: number
}

export interface EngagementEconomicsRow {
  engagement_id: string
  engagement_number: string
  engagement_name: string
  engagement_type: string
  commercial_state: string
  commitment_state: string
  committed_revenue_observed: number | null
  proposal_value_observed: number | null
  value_basis: string
  collected_observed: number | null
  remaining_balance_observed: number | null
  direct_cost_estimate_observed: number | null
  direct_cost_committed_observed: number | null
  direct_cost_actual_observed: number | null
  cost_item_count: number | null
  contribution_observed: number | null
  projected_contribution_observed: number | null
  cost_evidence_state: string
}

export interface LocationMemoryRow {
  location_id: string | null
  name: string
  location_type: string
  address: string | null
  city: string | null
  region: string | null
  postal_code: string | null
  country: string | null
  access_notes: string | null
  load_in_notes: string | null
  parking_notes: string | null
  power_notes: string | null
  connectivity_notes: string | null
  engagement_count: number
  first_engagement_date: string | null
  latest_engagement_date: string | null
  current_future_count: number
}

export interface RelationshipSummaryRow {
  party_id: string
  party_type: string
  name: string
  organization_name: string | null
  email: string | null
  phone: string | null
  engagement_count: number
  current_future_count: number
  first_engagement_date: string | null
  latest_engagement_date: string | null
  committed_revenue_observed: number
  collected_observed: number
  contribution_observed_where_known: number | null
  engagements_with_known_contribution: number
}

export interface DailyWorkRow extends Record<string, unknown> {
  id: string
  engagement_id: string | null
  engagement_number: string | null
  engagement_name: string | null
  title: string
  action_type: string
  status: string
  priority: string
  visibility: 'INTERNAL' | 'SHARED' | 'CLIENT'
  origin: 'MANUAL' | 'SYSTEM' | 'AUTOMATION' | 'IMPORT' | 'CLIENT' | 'OTHER'
  due_at: string | null
  due_date: string | null
  why_now: string | null
  success_condition: string | null
  owner_username: string | null
  owner_display_name: string | null
}

export interface PlaybookStepRow {
  playbook_id: string
  playbook_code: string
  playbook_name: string
  version: number
  status: string
  step_id: string
  phase_order: number
  phase_code: string
  phase_name: string
  sort_order: number
  step_code: string
  title: string
  purpose: string | null
  requiredness: 'CORE' | 'CONDITIONAL' | 'OPTIONAL'
  automation_mode: 'SYSTEM' | 'ASSISTED' | 'HUMAN'
  default_role_code: string | null
  default_capability_code: string | null
  applies_to_engagement_types: string[]
  condition_text: string | null
  client_touchpoint: boolean
  procedure_depth: 'MAP_ONLY' | 'CHECKLIST' | 'SOP' | 'VERIFIED_SOP'
  instruction_summary: string | null
  completion_definition: string | null
  evidence_expectation: string | null
  risk_if_missed: string | null
  dependency_step_codes: string[]
  inputs: unknown
  outputs: unknown
  tags: string[]
}

export interface EngagementJobMapRow extends PlaybookStepRow {
  engagement_id: string
  engagement_number: string
  engagement_name: string
  engagement_type: string
  playbook_version: number
  step_state_id: string | null
  tracking_status: 'UNTRACKED' | 'NOT_STARTED' | 'READY' | 'ACTIVE' | 'WAITING' | 'BLOCKED' | 'DONE' | 'SKIPPED' | 'NOT_APPLICABLE'
  requirement_state: 'REQUIRED' | 'CONDITIONAL' | 'OPTIONAL' | 'NOT_APPLICABLE' | 'UNKNOWN'
  owner_member_id: string | null
  owner_username: string | null
  owner_display_name: string | null
  responsible_party_id: string | null
  responsible_party_name: string | null
  due_at: string | null
  due_date: string | null
  started_at: string | null
  completed_at: string | null
  completion_notes: string | null
  evidence_summary: string | null
  certainty_state: string | null
  step_assignments: Array<Record<string, unknown>>
}

export interface MovementCandidateRow {
  candidate_key: string
  engagement_id: string
  engagement_number: string
  engagement_name: string
  engagement_type: string
  event_start_date: string | null
  event_end_date: string | null
  playbook_step_id: string
  step_code: string
  phase_order: number
  phase_code: string
  phase_name: string
  step_title: string
  movement_class: 'ACTION' | 'DECISION' | 'CHECK' | 'AUTOMATION' | 'LEARNING'
  focus_domain: 'DELIVERY' | 'ECONOMICS' | 'DEMAND' | 'COORDINATION' | 'RELATIONSHIP' | 'KNOWLEDGE'
  reason_code: string
  why_now: string
  materiality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  urgency: 'NOW' | 'SOON' | 'WATCH' | 'LATER'
  recommended_handling: 'SYSTEM' | 'ASSISTED' | 'HUMAN'
  playbook_automation_mode: 'SYSTEM' | 'ASSISTED' | 'HUMAN'
  procedure_depth: 'MAP_ONLY' | 'CHECKLIST' | 'SOP' | 'VERIFIED_SOP'
  suggested_action_type: string
  should_create_work: boolean
  due_date_hint: string | null
  certainty_state: 'VERIFIED' | 'KNOWN' | 'ESTIMATED' | 'ASSUMED' | 'CONFLICTING'
  evidence_basis: Record<string, unknown>
  economic_value: number | null
  equivalent_open_work_count: number
  continuity_state: 'COVERED' | 'UNMATERIALIZED'
  priority_score: number
  engagement_focus_rank?: number
  global_focus_rank?: number
}

export async function listEngagementFrontends(): Promise<EngagementFrontendRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('engagement_frontend_v')
    .select('*')
    .order('event_start_date', { ascending: true, nullsFirst: false })
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as EngagementFrontendRow[]
}

/**
 * One complete internal read surface for an Engagement.
 * Always filter by id; this view intentionally carries the rich backend story.
 */
export async function getEngagementWorkspace(id: string): Promise<Record<string, unknown> | null> {
  const client = requireClient()
  const { data, error } = await client.from('engagement_workspace_v').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as Record<string, unknown> | null
}

export async function listEngagementEconomics(): Promise<EngagementEconomicsRow[]> {
  const client = requireClient()
  const { data, error } = await client.from('engagement_economics_v').select('*').order('engagement_number')
  if (error) throw error
  return (data ?? []) as unknown as EngagementEconomicsRow[]
}

export async function listDailyOperatingWork(): Promise<DailyWorkRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('daily_work_queue_v')
    .select('*')
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('due_at', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data ?? []) as unknown as DailyWorkRow[]
}

/**
 * Derived selective attention. These rows explain what the system currently sees;
 * they are not persisted tasks and do not prove a Playbook step is required.
 */
export async function listOperatingFocus(limit = 40): Promise<MovementCandidateRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('engagement_operating_focus_v')
    .select('*')
    .order('global_focus_rank')
    .limit(limit)
  if (error) throw error
  return (data ?? []) as unknown as MovementCandidateRow[]
}

export async function listEngagementMovementCandidates(engagementId: string): Promise<MovementCandidateRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('engagement_movement_candidates_v')
    .select('*')
    .eq('engagement_id', engagementId)
    .order('priority_score', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as MovementCandidateRow[]
}

export async function listPlaybookCatalog(): Promise<PlaybookStepRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('playbook_catalog_v')
    .select('*')
    .order('phase_order')
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as unknown as PlaybookStepRow[]
}

export async function listEngagementJobMap(engagementId: string): Promise<EngagementJobMapRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('engagement_job_map_v')
    .select('*')
    .eq('engagement_id', engagementId)
    .order('phase_order')
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as unknown as EngagementJobMapRow[]
}

export async function listLocationMemory(): Promise<LocationMemoryRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('location_memory_v')
    .select('*')
    .order('engagement_count', { ascending: false })
    .order('name')
  if (error) throw error
  return (data ?? []) as unknown as LocationMemoryRow[]
}

export async function listRelationshipSummaries(): Promise<RelationshipSummaryRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('relationship_summary_v')
    .select('*')
    .order('engagement_count', { ascending: false })
    .order('name')
  if (error) throw error
  return (data ?? []) as unknown as RelationshipSummaryRow[]
}

export async function listContributorWork() {
  const client = requireClient()
  const { data, error } = await client.from('contributor_work_v').select('*').order('scheduled_start', { ascending: true, nullsFirst: false })
  if (error) throw error
  return data ?? []
}

export async function listAssignmentBriefs(engagementId?: string) {
  const client = requireClient()
  let query = client.from('assignment_brief_v').select('*').order('scheduled_start', { ascending: true, nullsFirst: false })
  if (engagementId) query = query.eq('engagement_id', engagementId)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function listCurrentResourceCommitments() {
  const client = requireClient()
  const { data, error } = await client
    .from('resource_commitment_current_v')
    .select('*')
    .order('from_date', { ascending: true, nullsFirst: false })
  if (error) throw error
  return data ?? []
}

/**
 * Curated preview of what a future client-facing surface may consume.
 * The database still restricts this view to internal app members today.
 */
export async function getClientSurfacePreview(engagementId: string): Promise<Record<string, unknown> | null> {
  const client = requireClient()
  const { data, error } = await client.from('engagement_client_surface_v').select('*').eq('id', engagementId).maybeSingle()
  if (error) throw error
  return data as Record<string, unknown> | null
}

export async function createEngagementCostItem(input: Record<string, unknown>) {
  const client = requireClient()
  const { data: userData } = await client.auth.getUser()
  const { data, error } = await client.from('engagement_cost_items').insert({ ...input, created_by: userData.user?.id ?? null }).select('*').single()
  if (error) throw error
  return data
}

export async function createResourceCommitment(input: Record<string, unknown>) {
  const client = requireClient()
  const { data: userData } = await client.auth.getUser()
  const { data, error } = await client.from('resource_commitments').insert({ ...input, created_by: userData.user?.id ?? null }).select('*').single()
  if (error) throw error
  return data
}

export async function recordResourceUsage(input: Record<string, unknown>) {
  const client = requireClient()
  const { data: userData } = await client.auth.getUser()
  const { data, error } = await client.from('resource_usage').insert({ ...input, created_by: userData.user?.id ?? null }).select('*').single()
  if (error) throw error
  return data
}

export async function saveEngagementOutput(input: Record<string, unknown>) {
  const client = requireClient()
  const { data: userData } = await client.auth.getUser()
  const { data, error } = await client.from('engagement_outputs').insert({ ...input, created_by: userData.user?.id ?? null }).select('*').single()
  if (error) throw error
  return data
}
