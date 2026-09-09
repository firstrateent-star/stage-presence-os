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

export interface DecisionGap {
  code: string
  label: string
  owner: ResolutionOwner
  severity: GapSeverity
}

export interface DecisionSignal {
  engagement: Engagement
  decision: DecisionKind
  decision_label: string
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

function hasFinancialFact(facts: EngagementFinancialFact[], engagementId: string, type: EngagementFinancialFact['fact_type']) {
  return facts.some((fact) => fact.engagement_id === engagementId && fact.fact_type === type && fact.certainty_state !== 'CONFLICTING')
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
  const pool = blocking.length ? blocking : gaps
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
    const gaps: DecisionGap[] = []
    const strongEvidence: string[] = []

    if (customerKnown(customerLinks, engagement.id)) strongEvidence.push('Customer linked')
    else if (decision !== 'LEARN_RESOLVE') gaps.push({ code: 'CUSTOMER_UNKNOWN', label: 'Customer/contact is not identified.', owner: 'SEAN', severity: 'BLOCKING' })

    if (dateKey(engagement)) strongEvidence.push('Date known')
    else if (['QUOTE_READY', 'COMMIT_READY', 'RESERVE_READY', 'EXECUTE_READY'].includes(decision)) gaps.push({ code: 'DATE_UNKNOWN', label: 'Event/project timing is not known.', owner: 'SEAN', severity: decision === 'QUOTE_READY' ? 'MATERIAL' : 'BLOCKING' })

    if (links.length) strongEvidence.push(`${links.length} configured resource${links.length === 1 ? '' : 's'}`)
    else if (['QUOTE_READY', 'COMMIT_READY', 'RESERVE_READY', 'EXECUTE_READY'].includes(decision) && engagement.engagement_type !== 'SERVICE') gaps.push({ code: 'SOLUTION_UNCONFIGURED', label: 'No configured solution is represented yet.', owner: 'SEAN', severity: decision === 'QUOTE_READY' ? 'MATERIAL' : 'BLOCKING' })

    if (unresolved.some((fact) => fact.certainty_state === 'CONFLICTING')) gaps.push({ code: 'CONFLICTING_TRUTH', label: 'Conflicting source truth could change this decision.', owner: 'SEAN', severity: 'BLOCKING' })
    else if (unresolved.length) gaps.push({ code: 'UNRESOLVED_TRUTH', label: `${unresolved.length} unresolved fact${unresolved.length === 1 ? '' : 's'} remain; review only those material to this decision.`, owner: 'SEAN', severity: 'WATCH' })

    if (['QUOTE_READY', 'COMMIT_READY'].includes(decision)) {
      if (hasFinancialFact(financialFacts, engagement.id, 'QUOTE_TOTAL')) strongEvidence.push('Quote value represented')
      else gaps.push({ code: 'QUOTE_VALUE_MISSING', label: 'Quote value is not represented as typed financial evidence.', owner: 'SEAN', severity: decision === 'COMMIT_READY' ? 'BLOCKING' : 'MATERIAL' })
    }

    if (['RESERVE_READY', 'EXECUTE_READY'].includes(decision)) {
      if (hasFinancialFact(financialFacts, engagement.id, 'CONTRACT_TOTAL')) strongEvidence.push('Contract value represented')
      else gaps.push({ code: 'CONTRACT_VALUE_MISSING', label: 'Committed commercial value is not represented in the OS.', owner: 'NANCY', severity: 'MATERIAL' })

      if (hasFinancialFact(financialFacts, engagement.id, 'DEPOSIT_RECEIVED')) strongEvidence.push('Deposit evidence present')
      else gaps.push({ code: 'DEPOSIT_EVIDENCE_MISSING', label: 'Deposit/payment evidence is not represented.', owner: 'NANCY', severity: decision === 'RESERVE_READY' ? 'BLOCKING' : 'MATERIAL' })

      const weakWindows = links.filter((link) => !['KNOWN', 'VERIFIED'].includes(link.requirement_window_state))
      if (links.length && weakWindows.length === 0) strongEvidence.push('Resource windows known/verified')
      else if (links.length) gaps.push({ code: 'WINDOWS_WEAK', label: `${weakWindows.length} configured resource window${weakWindows.length === 1 ? '' : 's'} are inferred/estimated/unknown.`, owner: 'OPERATIONS', severity: decision === 'EXECUTE_READY' ? 'BLOCKING' : 'MATERIAL' })

      const unknownSourcing = links.filter((link) => link.planned_sourcing_model === 'UNKNOWN')
      if (links.length && unknownSourcing.length === 0) strongEvidence.push('Engagement-specific sourcing represented')
      else if (links.length) gaps.push({ code: 'SOURCING_UNKNOWN', label: `${unknownSourcing.length} configured resource${unknownSourcing.length === 1 ? '' : 's'} have unknown sourcing.`, owner: 'OPERATIONS', severity: 'BLOCKING' })
    }

    if (pressures.length) {
      const high = pressures.some((pressure) => pressure.severity === 'HIGH')
      gaps.push({ code: 'CAPACITY_PRESSURE', label: `${pressures.length} capacity pressure signal${pressures.length === 1 ? '' : 's'} require review before stronger commitment.`, owner: high ? 'GREG' : 'OPERATIONS', severity: high ? 'BLOCKING' : 'MATERIAL' })
    }

    if (decision === 'COMMIT_READY' && !hasFinancialFact(financialFacts, engagement.id, 'DIRECT_COST_ESTIMATE')) {
      gaps.push({ code: 'DIRECT_COST_NOT_ESTIMATED', label: 'No direct-cost estimate is represented; required when cost/risk is material.', owner: 'SEAN', severity: 'WATCH' })
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
