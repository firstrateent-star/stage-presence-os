import type { Engagement, EngagementFact } from '../types/domain'
import type { CapacityPressure } from './businessSignals'
import type { EngagementFinancialFact } from './financialFacts'
import type { ConfiguredResourceLink, CustomerLink } from './repository'

export type DecisionKind =
  | 'QUALIFY_CLARIFY'
  | 'QUOTE_READY'
  | 'COMMIT_READY'
  | 'RESERVE_READY'
  | 'EXECUTE_READY'
  | 'LEARN_RESOLVE'
  | 'RELATIONSHIP_FOLLOWUP'

export type ResolutionOwner = 'SYSTEM' | 'NANCY' | 'SEAN' | 'OPERATIONS' | 'GREG'
export type GapSeverity = 'BLOCKING' | 'MATERIAL' | 'WATCH'
export type DecisionEvidenceState = 'CLEAR' | 'REVIEW' | 'BLOCKED'
export type ResolutionStrategy = 'REUSE_EVIDENCE' | 'SOURCE_RECOVERY' | 'OWNER_CONFIRMATION' | 'POLICY_DECISION' | 'HUMAN_JUDGMENT'

export interface DecisionGap {
  code: string
  label: string
  owner: ResolutionOwner
  severity: GapSeverity
  resolution_strategy: ResolutionStrategy
  resolution_hint: string
}

export interface DecisionSignal {
  engagement: Engagement
  decision: DecisionKind
  decision_label: string
  evidence_state: DecisionEvidenceState
  why_now: string
  strong_evidence: string[]
  gaps: DecisionGap[]
  primary_owner: ResolutionOwner
  greg_required: boolean
  due_label: string
  score: number
}

function dateKey(engagement: Engagement) {
  return engagement.event_start_date ?? engagement.event_start?.slice(0, 10) ?? null
}

function dayNumber(value: string | null) {
  if (!value) return Number.POSITIVE_INFINITY
  const parsed = new Date(`${value}T12:00:00`).getTime()
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY
}

function localDayNumber(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12).getTime()
}

function daysUntil(engagement: Engagement, now: Date) {
  const value = dayNumber(dateKey(engagement))
  if (!Number.isFinite(value)) return Number.POSITIVE_INFINITY
  return Math.round((value - localDayNumber(now)) / 86_400_000)
}

function active(engagement: Engagement) {
  return engagement.archived_at == null
    && engagement.operational_state !== 'CLOSED'
    && engagement.commitment_state !== 'CANCELLED'
    && engagement.commercial_state !== 'LOST'
}

function financialFactsFor(facts: EngagementFinancialFact[], engagementId: string, type: EngagementFinancialFact['fact_type']) {
  return facts.filter((fact) => fact.engagement_id === engagementId && fact.fact_type === type && fact.certainty_state !== 'CONFLICTING')
}

function hasFinancialFact(facts: EngagementFinancialFact[], engagementId: string, type: EngagementFinancialFact['fact_type']) {
  return financialFactsFor(facts, engagementId, type).length > 0
}

function hasPositiveFinancialFact(facts: EngagementFinancialFact[], engagementId: string, type: EngagementFinancialFact['fact_type']) {
  return financialFactsFor(facts, engagementId, type).some((fact) => Number(fact.amount) > 0)
}

function customerKnown(customerLinks: CustomerLink[], engagementId: string) {
  return customerLinks.some((link) => link.engagement_id === engagementId && Boolean(link.party))
}

function configuredFor(configuredLinks: ConfiguredResourceLink[], engagementId: string) {
  return configuredLinks.filter((link) => link.engagement_id === engagementId)
}

function unresolvedFor(facts: EngagementFact[], engagementId: string) {
  return facts.filter((fact) => fact.engagement_id === engagementId && ['UNKNOWN', 'REQUESTED', 'CONFLICTING'].includes(fact.certainty_state))
}

function pressureFor(pressures: CapacityPressure[], engagementId: string) {
  return pressures.filter((pressure) => pressure.first.id === engagementId || pressure.second.id === engagementId)
}

function needRepresented(engagement: Engagement) {
  return Boolean(engagement.customer_request?.trim() || engagement.desired_outcome?.trim())
}

function isLegacyImported(engagement: Engagement) {
  return Boolean(engagement.source_key?.startsWith('goodshuffle:'))
}

function chooseDecision(engagement: Engagement, now: Date): DecisionKind {
  const days = daysUntil(engagement, now)
  if (engagement.commercial_state === 'LOST' || engagement.commitment_state === 'CANCELLED' || engagement.operational_state === 'COMPLETE' || engagement.operational_state === 'CLOSED' || days < 0) return 'LEARN_RESOLVE'

  const committed = engagement.commercial_state === 'WON' || ['SIGNED', 'DEPOSIT_PENDING', 'CONFIRMED'].includes(engagement.commitment_state)
  if (committed) {
    if (days <= 7) return 'EXECUTE_READY'
    if (engagement.commitment_state === 'CONFIRMED') return 'EXECUTE_READY'
    return 'RESERVE_READY'
  }

  if (['PROPOSED', 'NEGOTIATING'].includes(engagement.commercial_state) || engagement.commitment_state === 'VERBAL_YES') return 'COMMIT_READY'
  if (engagement.commercial_state === 'DESIGNING') return 'QUOTE_READY'
  return 'QUALIFY_CLARIFY'
}

function decisionLabel(decision: DecisionKind) {
  const labels: Record<DecisionKind, string> = {
    QUALIFY_CLARIFY: 'Qualify / Clarify',
    QUOTE_READY: 'Quote Readiness',
    COMMIT_READY: 'Commit Readiness',
    RESERVE_READY: 'Reserve Readiness',
    EXECUTE_READY: 'Execute Readiness',
    LEARN_RESOLVE: 'Learn / Resolve',
    RELATIONSHIP_FOLLOWUP: 'Relationship Follow-up',
  }
  return labels[decision]
}

function whyNow(engagement: Engagement, decision: DecisionKind, now: Date) {
  const days = daysUntil(engagement, now)
  if (decision === 'LEARN_RESOLVE') return 'The dated commercial/operational moment has passed or the Engagement is terminal.'
  if (!Number.isFinite(days)) return 'No reliable event date is available; progress depends on the current commercial state.'
  if (days === 0) return 'The Engagement is scheduled for today.'
  if (days === 1) return 'The Engagement is scheduled for tomorrow.'
  if (days > 1) return `The Engagement is ${days} days away.`
  return `The Engagement date passed ${Math.abs(days)} days ago.`
}

function ownerRank(owner: ResolutionOwner) {
  return { SYSTEM: 0, NANCY: 1, SEAN: 2, OPERATIONS: 3, GREG: 4 }[owner]
}

function derivePrimaryOwner(gaps: DecisionGap[], decision: DecisionKind): ResolutionOwner {
  const blocking = gaps.filter((gap) => gap.severity === 'BLOCKING')
  const material = gaps.filter((gap) => gap.severity === 'MATERIAL')
  const pool = blocking.length ? blocking : material.length ? material : gaps
  if (pool.length) return [...pool].sort((a, b) => ownerRank(b.owner) - ownerRank(a.owner))[0].owner
  if (decision === 'EXECUTE_READY' || decision === 'RESERVE_READY') return 'OPERATIONS'
  if (decision === 'COMMIT_READY' || decision === 'QUOTE_READY' || decision === 'QUALIFY_CLARIFY') return 'SEAN'
  return 'SYSTEM'
}

function dueLabel(engagement: Engagement, now: Date) {
  const days = daysUntil(engagement, now)
  if (!Number.isFinite(days)) return 'Set timing'
  if (days <= 1) return 'Today'
  if (days <= 7) return 'Within 24h'
  if (days <= 21) return 'This week'
  return 'Before next commercial movement'
}

function evidenceState(gaps: DecisionGap[]): DecisionEvidenceState {
  if (gaps.some((gap) => gap.severity === 'BLOCKING')) return 'BLOCKED'
  if (gaps.length) return 'REVIEW'
  return 'CLEAR'
}

export function buildDecisionSignals(
  engagements: Engagement[],
  customerLinks: CustomerLink[],
  configuredLinks: ConfiguredResourceLink[],
  attentionFacts: EngagementFact[],
  financialFacts: EngagementFinancialFact[],
  capacityPressures: CapacityPressure[],
  now = new Date(),
): DecisionSignal[] {
  const signals: DecisionSignal[] = []

  for (const engagement of engagements) {
    if (!active(engagement) && engagement.commercial_state !== 'LOST' && engagement.commitment_state !== 'CANCELLED') continue

    const decision = chooseDecision(engagement, now)
    const links = configuredFor(configuredLinks, engagement.id)
    const unresolved = unresolvedFor(attentionFacts, engagement.id)
    const pressures = pressureFor(capacityPressures, engagement.id)
    const legacyImported = isLegacyImported(engagement)
    const gaps: DecisionGap[] = []
    const strongEvidence: string[] = []

    if (customerKnown(customerLinks, engagement.id)) strongEvidence.push('Customer linked')
    else if (decision !== 'LEARN_RESOLVE') gaps.push({
      code: 'CUSTOMER_UNKNOWN',
      label: 'Customer/contact is not identified.',
      owner: 'SEAN',
      severity: 'BLOCKING',
      resolution_strategy: legacyImported ? 'SOURCE_RECOVERY' : 'OWNER_CONFIRMATION',
      resolution_hint: legacyImported ? 'Recover the customer identity from existing source evidence before asking for re-entry.' : 'Clarify the customer/contact once; preserve it on the Engagement.',
    })

    if (dateKey(engagement)) strongEvidence.push('Date known')
    else if (['QUOTE_READY', 'COMMIT_READY', 'RESERVE_READY', 'EXECUTE_READY'].includes(decision)) gaps.push({
      code: 'DATE_UNKNOWN',
      label: 'Event/project timing is not known.',
      owner: 'SEAN',
      severity: decision === 'QUOTE_READY' ? 'MATERIAL' : 'BLOCKING',
      resolution_strategy: legacyImported ? 'SOURCE_RECOVERY' : 'OWNER_CONFIRMATION',
      resolution_hint: legacyImported ? 'Search existing project/source evidence first.' : 'Ask only for the timing precision needed by the current decision.',
    })

    if (needRepresented(engagement)) strongEvidence.push('Customer need/outcome represented')
    else if (['QUALIFY_CLARIFY', 'QUOTE_READY', 'COMMIT_READY'].includes(decision)) {
      const configuredLegacyProposal = legacyImported && links.length > 0 && decision === 'COMMIT_READY'
      gaps.push({
        code: 'NEED_UNCLEAR',
        label: configuredLegacyProposal
          ? 'Literal customer intent was not preserved in the import; proposed configuration exists as evidence.'
          : 'Customer request / desired outcome is not represented clearly enough yet.',
        owner: 'SEAN',
        severity: configuredLegacyProposal ? 'WATCH' : decision === 'COMMIT_READY' ? 'MATERIAL' : 'MATERIAL',
        resolution_strategy: configuredLegacyProposal ? 'SOURCE_RECOVERY' : 'OWNER_CONFIRMATION',
        resolution_hint: configuredLegacyProposal
          ? 'Do not reconstruct intent merely to fill a field. Recover it from source/customer context only if it can change the commitment decision.'
          : 'Capture the customer need once at the level of detail necessary to design/quote responsibly.',
      })
    }

    if (links.length) strongEvidence.push(`${links.length} configured resource${links.length === 1 ? '' : 's'}`)
    else if (['QUOTE_READY', 'COMMIT_READY', 'RESERVE_READY', 'EXECUTE_READY'].includes(decision) && engagement.engagement_type !== 'SERVICE') gaps.push({
      code: 'SOLUTION_UNCONFIGURED',
      label: 'No configured solution is represented yet.',
      owner: 'SEAN',
      severity: decision === 'QUOTE_READY' ? 'MATERIAL' : 'BLOCKING',
      resolution_strategy: legacyImported ? 'SOURCE_RECOVERY' : 'OWNER_CONFIRMATION',
      resolution_hint: legacyImported ? 'Recover the evidenced proposal/project configuration before redesigning it.' : 'Design or represent the smallest plausible solution needed for the decision.',
    })

    if (unresolved.some((fact) => fact.certainty_state === 'CONFLICTING')) gaps.push({
      code: 'CONFLICTING_TRUTH',
      label: 'Conflicting source truth could change this decision.',
      owner: 'SEAN',
      severity: 'BLOCKING',
      resolution_strategy: 'HUMAN_JUDGMENT',
      resolution_hint: 'Compare source evidence and explicitly resolve the conflict; do not silently choose a value.',
    })
    else if (unresolved.length) gaps.push({
      code: 'UNRESOLVED_TRUTH',
      label: `${unresolved.length} unresolved fact${unresolved.length === 1 ? '' : 's'} remain; review only those material to this decision.`,
      owner: 'SEAN',
      severity: 'WATCH',
      resolution_strategy: 'REUSE_EVIDENCE',
      resolution_hint: 'Check whether any unresolved fact can actually change the current decision before asking anyone for more information.',
    })

    if (decision === 'QUOTE_READY') {
      // A quote total is the output of Quote Ready, not a prerequisite.
      if (hasFinancialFact(financialFacts, engagement.id, 'QUOTE_TOTAL')) strongEvidence.push('Existing quote value represented')
    }

    if (decision === 'COMMIT_READY') {
      if (hasFinancialFact(financialFacts, engagement.id, 'QUOTE_TOTAL') || hasFinancialFact(financialFacts, engagement.id, 'CONTRACT_TOTAL')) strongEvidence.push('Commercial value represented')
      else gaps.push({
        code: 'PROPOSAL_VALUE_MISSING',
        label: 'The proposal/commercial value being accepted is not represented as typed financial evidence.',
        owner: 'NANCY',
        severity: 'BLOCKING',
        resolution_strategy: 'SOURCE_RECOVERY',
        resolution_hint: 'Recover the authoritative quote/proposal value from Goodshuffle or the originating commercial document before asking someone to type it again.',
      })

      if (!hasFinancialFact(financialFacts, engagement.id, 'DIRECT_COST_ESTIMATE')) gaps.push({
        code: 'DIRECT_COST_NOT_ESTIMATED',
        label: 'No direct-cost estimate is represented; resolve only when cost/risk is material to this commitment.',
        owner: 'SEAN',
        severity: 'WATCH',
        resolution_strategy: 'OWNER_CONFIRMATION',
        resolution_hint: 'Estimate only the major directly caused costs that could change the pricing/commitment decision.',
      })
    }

    if (decision === 'RESERVE_READY') {
      if (hasPositiveFinancialFact(financialFacts, engagement.id, 'DEPOSIT_RECEIVED')) strongEvidence.push('Deposit evidence present')
      else gaps.push({
        code: 'DEPOSIT_EVIDENCE_MISSING',
        label: 'Deposit/payment evidence is not represented. Confirm policy or an explicit exception before treating capacity as reserved.',
        owner: 'NANCY',
        severity: 'MATERIAL',
        resolution_strategy: 'SOURCE_RECOVERY',
        resolution_hint: 'Recover payment/deposit evidence from the commercial/accounting source. Do not interpret absence in Stage Presence OS as nonpayment.',
      })
    }

    if (['RESERVE_READY', 'EXECUTE_READY'].includes(decision)) {
      const weakWindows = links.filter((link) => !['KNOWN', 'VERIFIED'].includes(link.requirement_window_state))
      if (links.length && weakWindows.length === 0) strongEvidence.push('Resource windows known/verified')
      else if (links.length) gaps.push({
        code: 'WINDOWS_WEAK',
        label: `${weakWindows.length} configured resource window${weakWindows.length === 1 ? '' : 's'} are inferred/estimated/unknown.`,
        owner: 'OPERATIONS',
        severity: decision === 'EXECUTE_READY' ? 'BLOCKING' : 'MATERIAL',
        resolution_strategy: 'OWNER_CONFIRMATION',
        resolution_hint: 'Confirm only the possession/load-in/return timing needed to protect or execute scarce capacity. Reuse learned defaults when evidence earns them.',
      })

      const unknownSourcing = links.filter((link) => link.planned_sourcing_model === 'UNKNOWN')
      if (links.length && unknownSourcing.length === 0) strongEvidence.push('Engagement-specific sourcing represented')
      else if (links.length) gaps.push({
        code: 'SOURCING_UNKNOWN',
        label: `${unknownSourcing.length} configured resource${unknownSourcing.length === 1 ? '' : 's'} have unknown sourcing.`,
        owner: 'OPERATIONS',
        severity: 'BLOCKING',
        resolution_strategy: 'OWNER_CONFIRMATION',
        resolution_hint: 'Confirm whether the job will use owned, subcontracted, partner, or venue capacity; do not infer from the resource library alone.',
      })
    }

    if (decision === 'EXECUTE_READY') {
      if (engagement.engagement_type !== 'EVENT' || engagement.venue_name?.trim()) strongEvidence.push(engagement.engagement_type === 'EVENT' ? 'Venue represented' : 'Venue not required by type')
      else gaps.push({
        code: 'VENUE_UNKNOWN',
        label: 'Event venue/location is not represented for execution.',
        owner: 'OPERATIONS',
        severity: 'BLOCKING',
        resolution_strategy: legacyImported ? 'SOURCE_RECOVERY' : 'OWNER_CONFIRMATION',
        resolution_hint: legacyImported ? 'Recover the venue from project evidence before asking for it again.' : 'Capture the operational location once.',
      })

      if (hasPositiveFinancialFact(financialFacts, engagement.id, 'DEPOSIT_RECEIVED')) strongEvidence.push('Deposit evidence present')
      else gaps.push({
        code: 'PAYMENT_POLICY_REVIEW',
        label: 'Payment/deposit state is not represented; review only if commercial policy makes it material before execution.',
        owner: 'NANCY',
        severity: 'WATCH',
        resolution_strategy: 'POLICY_DECISION',
        resolution_hint: 'First determine the Stage Presence policy/exception rule. Then recover payment evidence only when that rule makes it decision-critical.',
      })
    }

    if (pressures.length) {
      const high = pressures.some((pressure) => pressure.severity === 'HIGH')
      gaps.push({
        code: 'CAPACITY_PRESSURE',
        label: `${pressures.length} capacity pressure signal${pressures.length === 1 ? '' : 's'} require review before stronger commitment.`,
        owner: high ? 'GREG' : 'OPERATIONS',
        severity: high ? 'BLOCKING' : 'MATERIAL',
        resolution_strategy: 'HUMAN_JUDGMENT',
        resolution_hint: high ? 'Resolve the scarce-capacity tradeoff at the appropriate authority level.' : 'Operations should confirm timing/sourcing/substitution first; escalate only if the tradeoff remains material.',
      })
    }

    const primaryOwner = derivePrimaryOwner(gaps, decision)
    const gregRequired = gaps.some((gap) => gap.owner === 'GREG' && gap.severity === 'BLOCKING')
    const days = daysUntil(engagement, now)
    const urgency = Number.isFinite(days) ? Math.max(0, 60 - Math.max(days, 0) * 2) : 0
    const blocking = gaps.filter((gap) => gap.severity === 'BLOCKING').length
    const material = gaps.filter((gap) => gap.severity === 'MATERIAL').length
    const score = (decision === 'EXECUTE_READY' ? 400 : decision === 'RESERVE_READY' ? 300 : decision === 'COMMIT_READY' ? 220 : decision === 'QUOTE_READY' ? 180 : decision === 'QUALIFY_CLARIFY' ? 140 : 100) + urgency + blocking * 25 + material * 8

    signals.push({
      engagement,
      decision,
      decision_label: decisionLabel(decision),
      evidence_state: evidenceState(gaps),
      why_now: whyNow(engagement, decision, now),
      strong_evidence: strongEvidence,
      gaps,
      primary_owner: primaryOwner,
      greg_required: gregRequired,
      due_label: dueLabel(engagement, now),
      score,
    })
  }

  return signals.sort((a, b) => b.score - a.score || a.engagement.name.localeCompare(b.engagement.name))
}
