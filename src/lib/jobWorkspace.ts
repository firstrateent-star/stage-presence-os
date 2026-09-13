import { supabase } from './supabase'
import { getActualsPosition, listCostVariance, listLaborActuals, listResourceActuals, type ActualsPosition, type CostVarianceRow, type LaborActualRow, type ResourceActualRow } from './actualsRuntime'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured.')
  return supabase
}

export type WorkspaceTone = 'GOOD' | 'WARN' | 'BAD' | 'INFO' | 'MUTED'
export type WorkspacePriority = 'BLOCKER' | 'HIGH' | 'NORMAL'

export interface WorkspaceStage {
  key: 'SCOPE' | 'ESTIMATE' | 'PRICE' | 'COMMIT' | 'OPERATE' | 'WAREHOUSE' | 'ACTUALS' | 'MONEY' | 'CLOSEOUT'
  label: string
  state: string
  summary: string
  tone: WorkspaceTone
  anchor: string
}

export interface WorkspaceAttentionItem {
  id: string
  priority: WorkspacePriority
  title: string
  detail: string
  anchor: string
}

export interface WorkspaceCore {
  id: string
  engagement_number: string
  name: string
  engagement_type: string
  customer_request: string | null
  desired_outcome: string | null
  event_start_date: string | null
  event_end_date: string | null
  venue_name: string | null
  venue_address: string | null
  commercial_state: string
  commitment_state: string
  operational_state: string
  attention_state: string
  next_action: string | null
  next_action_at: string | null
  waiting_on: string | null
  blocked_reason: string | null
  facts: Array<{ certainty_state?: string; label?: string; value_text?: string }> | null
  parties: unknown[] | null
  schedule: unknown[] | null
  assignments: unknown[] | null
  resource_commitments: unknown[] | null
  resource_usage: unknown[] | null
  closeout: unknown[] | null
}

export interface EstimatePosition {
  estimate_item_count: number
  estimated_direct_cost: number
  committed_item_count: number
  committed_direct_cost: number
  actual_item_count: number
  actual_direct_cost: number
  cost_decision_gap_count: number
  scope_line_count: number
  scope_lines_with_cost: number
  estimate_coverage_state: string
}

export interface PricingPosition {
  quote_document_id: string | null
  quote_state: string | null
  quoted_total: number | null
  quote_line_count: number
  price_decision_gap_count: number
  approved_price_available_count: number
  draft_price_available_count: number
  estimated_direct_cost: number | null
  projected_contribution: number | null
  projected_margin_ratio: number | null
  pricing_readiness_state: string
  pricing_authority_coverage_state: string
}

export interface CommitmentPosition {
  accepted_document_id: string | null
  accepted_document_type: string | null
  accepted_document_state: string | null
  committed_value: number | null
  scope_line_count: number
  resource_scope_line_count: number
  resource_scope_lines_with_commitment: number
  resource_scope_lines_confirmed: number
  resource_commitment_gap_count: number
  requirement_window_gap_count: number
  represented_assignment_count: number
  confirmed_assignment_count: number
  requested_assignment_count: number
  schedule_item_count: number
  known_schedule_item_count: number
  tbd_schedule_item_count: number
  payment_schedule_item_count: number
  open_payment_term_count: number
  operations_bridge_state: string
  assignment_coverage_state: string
  schedule_coverage_state: string
}

export interface WarehousePosition {
  active_resource_commitment_count: number
  confirmed_resource_commitment_count: number
  awaiting_pull_count: number
  pulled_count: number
  loaded_count: number
  out_count: number
  inspection_needed_count: number
  restock_needed_count: number
  restocked_count: number
  exception_count: number
  warehouse_state: string
}

export interface EconomicsPosition {
  committed_revenue_observed: number | null
  proposal_value_observed: number | null
  value_basis: string
  collected_observed: number | null
  remaining_balance_observed: number | null
  direct_cost_estimate_observed: number | null
  direct_cost_committed_observed: number | null
  direct_cost_actual_observed: number | null
  contribution_observed: number | null
  projected_contribution_observed: number | null
  cost_evidence_state: string
}

export interface WorkspaceAssignment {
  assignment_id: string
  team_member_id: string
  username: string
  display_name: string | null
  role_code: string
  role_label: string | null
  assignment_state: string
  certainty_state: string
  scheduled_start: string | null
  scheduled_end: string | null
  scope_summary: string | null
}

export interface WorkspaceTeamMember {
  id: string
  username: string
  display_name: string | null
}

export interface WorkspacePlannedCost {
  cost_item_id: string
  cost_category: string
  cost_state: 'ESTIMATE' | 'COMMITTED'
  description: string
  amount: number
  quantity: number | null
  unit_cost: number | null
  team_member_id: string | null
  resource_id: string | null
}

export interface JobWorkspaceModel {
  core: WorkspaceCore
  estimate: EstimatePosition | null
  pricing: PricingPosition | null
  commitment: CommitmentPosition | null
  warehouse: WarehousePosition | null
  actuals: ActualsPosition | null
  economics: EconomicsPosition | null
  laborActuals: LaborActualRow[]
  resourceActuals: ResourceActualRow[]
  costVariance: CostVarianceRow[]
  assignments: WorkspaceAssignment[]
  teamMembers: WorkspaceTeamMember[]
  plannedCosts: WorkspacePlannedCost[]
  stages: WorkspaceStage[]
  attention: WorkspaceAttentionItem[]
}

function num(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function money(value: number | null | undefined) {
  if (value == null) return 'unknown'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function toneForState(state: string | null | undefined): WorkspaceTone {
  const value = (state ?? '').toUpperCase()
  if (!value) return 'MUTED'
  if (/(BLOCK|EXCEPTION|CONFLICT|MISSING|OVERDUE|FAILED)/.test(value)) return 'BAD'
  if (/(READY|COMPLETE|COMMITTED|SIGNED|PAID|RESTOCKED|CLOSED|COVERED)/.test(value)) return 'GOOD'
  if (/(NEED|GAP|PARTIAL|TBD|OPEN|DRAFT|UNKNOWN|NOT_CAPTURED|INCOMPLETE)/.test(value)) return 'WARN'
  return 'INFO'
}

function isOnOrBeforeToday(date: string | null) {
  if (!date) return false
  return date <= new Date().toISOString().slice(0, 10)
}

function buildStages(input: {
  core: WorkspaceCore
  estimate: EstimatePosition | null
  pricing: PricingPosition | null
  commitment: CommitmentPosition | null
  warehouse: WarehousePosition | null
  actuals: ActualsPosition | null
  economics: EconomicsPosition | null
}): WorkspaceStage[] {
  const { core, estimate, pricing, commitment, warehouse, actuals, economics } = input
  const facts = core.facts ?? []
  const unknownCount = facts.filter((fact) => ['UNKNOWN', 'REQUESTED', 'CONFLICTING'].includes(fact.certainty_state ?? '')).length
  const scopeState = core.customer_request || core.desired_outcome
    ? unknownCount > 0 ? 'OPEN QUESTIONS' : 'CAPTURED'
    : 'NEEDS INPUT'

  const estimateState = estimate?.estimate_coverage_state ?? (estimate?.estimate_item_count ? 'PARTIAL' : 'NOT STARTED')
  const priceState = pricing?.quote_state ?? pricing?.pricing_readiness_state ?? 'NOT STARTED'
  const commitState = core.commitment_state || 'UNCOMMITTED'
  const operateState = commitment?.operations_bridge_state ?? (commitState === 'SIGNED' ? 'NEEDS PLAN' : 'WAITING')
  const warehouseState = warehouse?.warehouse_state ?? (commitment?.resource_scope_line_count ? 'NOT STARTED' : 'NOT REQUIRED YET')
  const actualsState = actuals?.actuals_state ?? 'NOT STARTED'
  const remaining = economics?.remaining_balance_observed
  const moneyState = remaining != null && remaining > 0
    ? 'BALANCE OPEN'
    : actuals?.cash_evidence_state ?? economics?.value_basis ?? 'UNKNOWN'
  const closeoutState = actuals?.closeout_readiness_state ?? 'NOT READY'

  return [
    { key: 'SCOPE', label: 'Scope', state: scopeState, summary: unknownCount ? `${unknownCount} unresolved job fact${unknownCount === 1 ? '' : 's'}` : 'Customer need and outcome are represented.', tone: toneForState(scopeState), anchor: 'job-plan' },
    { key: 'ESTIMATE', label: 'Cost', state: estimateState, summary: estimate ? `${money(estimate.estimated_direct_cost)} expected direct cost` : 'No cost position yet.', tone: toneForState(estimateState), anchor: 'job-money' },
    { key: 'PRICE', label: 'Price', state: priceState, summary: pricing?.quoted_total != null ? `${money(pricing.quoted_total)} current quote` : 'Quote/pricing decision not complete.', tone: toneForState(priceState), anchor: 'job-money' },
    { key: 'COMMIT', label: 'Commit', state: commitState, summary: commitment?.committed_value != null ? `${money(commitment.committed_value)} committed` : 'Customer commitment not yet represented.', tone: toneForState(commitState), anchor: 'job-plan' },
    { key: 'OPERATE', label: 'Operate', state: operateState, summary: commitment ? `${commitment.confirmed_assignment_count} crew confirmed • ${commitment.resource_scope_lines_confirmed}/${commitment.resource_scope_line_count} resource lines confirmed` : 'Operational bridge not active yet.', tone: toneForState(operateState), anchor: 'job-delivery' },
    { key: 'WAREHOUSE', label: 'Warehouse', state: warehouseState, summary: warehouse ? `${warehouse.out_count} out • ${warehouse.inspection_needed_count + warehouse.restock_needed_count} awaiting return work` : 'No warehouse runtime position yet.', tone: toneForState(warehouseState), anchor: 'job-delivery' },
    { key: 'ACTUALS', label: 'Actuals', state: actualsState, summary: actuals ? `${actuals.actual_labor_hours.toFixed(1)} labor hr • ${actuals.resource_usage_count} resource actuals` : 'No actuals position yet.', tone: toneForState(actualsState), anchor: 'job-actuals' },
    { key: 'MONEY', label: 'Cash', state: moneyState, summary: economics ? `${money(economics.collected_observed)} observed collected • ${money(economics.remaining_balance_observed)} remaining` : 'No economic position yet.', tone: toneForState(moneyState), anchor: 'job-money' },
    { key: 'CLOSEOUT', label: 'Close', state: closeoutState, summary: actuals?.closeout_count ? 'Closeout exists.' : 'Closeout waits for sufficient actual reality.', tone: toneForState(closeoutState), anchor: 'job-closeout' },
  ]
}

function buildAttention(input: {
  core: WorkspaceCore
  estimate: EstimatePosition | null
  pricing: PricingPosition | null
  commitment: CommitmentPosition | null
  warehouse: WarehousePosition | null
  actuals: ActualsPosition | null
  economics: EconomicsPosition | null
}): WorkspaceAttentionItem[] {
  const { core, estimate, pricing, commitment, warehouse, actuals, economics } = input
  const items: WorkspaceAttentionItem[] = []
  const facts = core.facts ?? []
  const unknownCount = facts.filter((fact) => ['UNKNOWN', 'REQUESTED', 'CONFLICTING'].includes(fact.certainty_state ?? '')).length

  if (core.attention_state === 'BLOCKED') items.push({ id: 'blocked', priority: 'BLOCKER', title: 'Job is blocked', detail: core.blocked_reason || 'A blocker is recorded but no reason is visible.', anchor: 'job-next' })
  if (core.attention_state === 'WAITING') items.push({ id: 'waiting', priority: 'HIGH', title: 'Waiting on something outside the job', detail: core.waiting_on || 'Waiting state needs clarification.', anchor: 'job-next' })
  if (unknownCount) items.push({ id: 'scope-unknowns', priority: core.commitment_state === 'SIGNED' ? 'HIGH' : 'NORMAL', title: `Resolve ${unknownCount} material job unknown${unknownCount === 1 ? '' : 's'}`, detail: 'Unknowns are first-class. Resolve only what affects the next decision.', anchor: 'job-plan' })

  if (estimate?.cost_decision_gap_count) items.push({ id: 'cost-gaps', priority: core.commitment_state === 'SIGNED' ? 'HIGH' : 'NORMAL', title: `${estimate.cost_decision_gap_count} scope line${estimate.cost_decision_gap_count === 1 ? '' : 's'} still need cost decisions`, detail: 'Expected fulfillment cost is incomplete.', anchor: 'job-money' })

  if (core.commitment_state !== 'SIGNED' && pricing && !/(READY|QUOTED|SENT|SIGNED)/.test((pricing.pricing_readiness_state + ' ' + (pricing.quote_state ?? '')).toUpperCase())) {
    items.push({ id: 'pricing', priority: 'NORMAL', title: 'Finish pricing before commitment', detail: `${pricing.price_decision_gap_count} price decision gap${pricing.price_decision_gap_count === 1 ? '' : 's'} remain.`, anchor: 'job-money' })
  }

  if (core.commitment_state === 'SIGNED' && commitment) {
    if (commitment.resource_commitment_gap_count) items.push({ id: 'resource-commitments', priority: 'HIGH', title: `${commitment.resource_commitment_gap_count} committed scope line${commitment.resource_commitment_gap_count === 1 ? '' : 's'} still need equipment commitment`, detail: 'Accepted commercial scope has not fully become operational capacity.', anchor: 'job-delivery' })
    if (commitment.requirement_window_gap_count) items.push({ id: 'resource-windows', priority: 'HIGH', title: `${commitment.requirement_window_gap_count} resource timing window${commitment.requirement_window_gap_count === 1 ? '' : 's'} unresolved`, detail: 'The OS cannot protect capacity until required dates are known.', anchor: 'job-delivery' })
    if (!commitment.confirmed_assignment_count && commitment.represented_assignment_count) items.push({ id: 'crew-confirmation', priority: 'HIGH', title: 'Crew exists but nobody is confirmed', detail: `${commitment.represented_assignment_count} assignment${commitment.represented_assignment_count === 1 ? '' : 's'} represented.`, anchor: 'job-delivery' })
    if (commitment.tbd_schedule_item_count) items.push({ id: 'schedule-tbd', priority: 'NORMAL', title: `${commitment.tbd_schedule_item_count} schedule item${commitment.tbd_schedule_item_count === 1 ? '' : 's'} still TBD`, detail: 'Resolve the next operational times instead of pretending TBD is zero.', anchor: 'job-delivery' })
  }

  if (warehouse?.exception_count) items.push({ id: 'warehouse-exception', priority: 'BLOCKER', title: `${warehouse.exception_count} warehouse exception${warehouse.exception_count === 1 ? '' : 's'}`, detail: 'Resolve equipment exceptions before treating fulfillment as clean.', anchor: 'job-delivery' })
  const returnWork = (warehouse?.inspection_needed_count ?? 0) + (warehouse?.restock_needed_count ?? 0)
  if (returnWork) items.push({ id: 'warehouse-return', priority: 'HIGH', title: `${returnWork} Resource item${returnWork === 1 ? '' : 's'} still need inspection/restock`, detail: 'A show ending does not make the job operationally complete.', anchor: 'job-delivery' })

  if (actuals && isOnOrBeforeToday(core.event_start_date) && actuals.actuals_state !== 'ACTUALS_BASELINE_COMPLETE') {
    if (actuals.resource_usage_gap_count) items.push({ id: 'usage-actuals', priority: 'HIGH', title: `${actuals.resource_usage_gap_count} committed Resource actual${actuals.resource_usage_gap_count === 1 ? '' : 's'} not captured`, detail: 'Record what actually left/was used rather than assuming the plan happened.', anchor: 'job-actuals' })
    const laborGaps = Math.max(actuals.completed_assignment_count - actuals.assignments_with_labor_actual, 0)
    if (laborGaps) items.push({ id: 'labor-actuals', priority: 'HIGH', title: `${laborGaps} completed crew assignment${laborGaps === 1 ? '' : 's'} lack labor actuals`, detail: 'Actual hours belong in the Actuals Runtime, not in assignment planning.', anchor: 'job-actuals' })
    if (actuals.labor_cost_gap_count || actuals.resource_cost_gap_count) items.push({ id: 'cost-actuals', priority: 'HIGH', title: 'Operational actuals still have unresolved cost questions', detail: `${actuals.labor_cost_gap_count} labor + ${actuals.resource_cost_gap_count} Resource cost gap${actuals.labor_cost_gap_count + actuals.resource_cost_gap_count === 1 ? '' : 's'}.`, anchor: 'job-actuals' })
  }

  if ((economics?.remaining_balance_observed ?? 0) > 0) items.push({ id: 'balance', priority: isOnOrBeforeToday(core.event_end_date || core.event_start_date) ? 'HIGH' : 'NORMAL', title: `${money(economics?.remaining_balance_observed)} balance still observed`, detail: 'Imported collection evidence and structured cash remain distinct until reconciled.', anchor: 'job-money' })

  if (actuals?.closeout_readiness_state === 'READY_FOR_CLOSEOUT' && !actuals.closeout_count) items.push({ id: 'closeout', priority: 'NORMAL', title: 'Job is ready for closeout', detail: 'Capture outcome, variance, venue memory, problems, and next opportunity.', anchor: 'job-closeout' })

  const order: Record<WorkspacePriority, number> = { BLOCKER: 0, HIGH: 1, NORMAL: 2 }
  return items.sort((a, b) => order[a.priority] - order[b.priority])
}

export async function loadJobWorkspace(engagementId: string): Promise<JobWorkspaceModel> {
  const client = requireClient()
  const [
    coreResult,
    estimateResult,
    pricingResult,
    commitmentResult,
    warehouseResult,
    economicsResult,
    actuals,
    laborActuals,
    resourceActuals,
    costVariance,
    assignmentResult,
    memberResult,
    plannedCostResult,
  ] = await Promise.all([
    client.from('engagement_workspace_v').select('id,engagement_number,name,engagement_type,customer_request,desired_outcome,event_start_date,event_end_date,venue_name,venue_address,commercial_state,commitment_state,operational_state,attention_state,next_action,next_action_at,waiting_on,blocked_reason,facts,parties,schedule,assignments,resource_commitments,resource_usage,closeout').eq('id', engagementId).single(),
    client.from('engagement_estimate_position_v').select('*').eq('engagement_id', engagementId).maybeSingle(),
    client.from('engagement_pricing_position_v').select('*').eq('engagement_id', engagementId).maybeSingle(),
    client.from('engagement_commitment_bridge_v').select('*').eq('engagement_id', engagementId).maybeSingle(),
    client.from('engagement_warehouse_position_v').select('*').eq('engagement_id', engagementId).maybeSingle(),
    client.from('engagement_economics_v').select('*').eq('engagement_id', engagementId).maybeSingle(),
    getActualsPosition(engagementId),
    listLaborActuals(engagementId),
    listResourceActuals(engagementId),
    listCostVariance(engagementId),
    client.from('assignment_brief_v').select('assignment_id,team_member_id,username,display_name,role_code,role_label,assignment_state,certainty_state,scheduled_start,scheduled_end,scope_summary').eq('engagement_id', engagementId).order('scheduled_start', { ascending: true, nullsFirst: false }),
    client.from('team_members').select('id,username,display_name').eq('active', true).order('display_name', { ascending: true, nullsFirst: false }).order('username'),
    client.from('engagement_cost_breakdown_v').select('cost_item_id,cost_category,cost_state,description,amount,quantity,unit_cost,team_member_id,resource_id').eq('engagement_id', engagementId).in('cost_state', ['ESTIMATE', 'COMMITTED']).order('created_at'),
  ])

  for (const result of [coreResult, estimateResult, pricingResult, commitmentResult, warehouseResult, economicsResult, assignmentResult, memberResult, plannedCostResult]) {
    if (result.error) throw result.error
  }

  const core = coreResult.data as WorkspaceCore
  const estimate = estimateResult.data ? {
    ...estimateResult.data,
    estimate_item_count: num(estimateResult.data.estimate_item_count),
    estimated_direct_cost: num(estimateResult.data.estimated_direct_cost),
    committed_item_count: num(estimateResult.data.committed_item_count),
    committed_direct_cost: num(estimateResult.data.committed_direct_cost),
    actual_item_count: num(estimateResult.data.actual_item_count),
    actual_direct_cost: num(estimateResult.data.actual_direct_cost),
    cost_decision_gap_count: num(estimateResult.data.cost_decision_gap_count),
    scope_line_count: num(estimateResult.data.scope_line_count),
    scope_lines_with_cost: num(estimateResult.data.scope_lines_with_cost),
  } as EstimatePosition : null
  const pricing = pricingResult.data as PricingPosition | null
  const commitment = commitmentResult.data as CommitmentPosition | null
  const warehouse = warehouseResult.data as WarehousePosition | null
  const economics = economicsResult.data as EconomicsPosition | null

  const stages = buildStages({ core, estimate, pricing, commitment, warehouse, actuals, economics })
  const attention = buildAttention({ core, estimate, pricing, commitment, warehouse, actuals, economics })

  return {
    core,
    estimate,
    pricing,
    commitment,
    warehouse,
    actuals,
    economics,
    laborActuals,
    resourceActuals,
    costVariance,
    assignments: (assignmentResult.data ?? []) as WorkspaceAssignment[],
    teamMembers: (memberResult.data ?? []) as WorkspaceTeamMember[],
    plannedCosts: (plannedCostResult.data ?? []).map((row) => ({ ...row, amount: num(row.amount), quantity: row.quantity == null ? null : num(row.quantity), unit_cost: row.unit_cost == null ? null : num(row.unit_cost) })) as WorkspacePlannedCost[],
    stages,
    attention,
  }
}
