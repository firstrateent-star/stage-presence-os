import type { EngagementFrontendRow } from './operatingRepository'

/**
 * Frontend presentation boundary.
 *
 * Canonical/backend truth may grow freely. Product surfaces should consume only
 * intentionally mapped presentation models like these. New backend fields are
 * therefore invisible by default until a presenter explicitly promotes them.
 */
export type PresentationTier = 'ATTENTION' | 'SUMMARY' | 'OPERATING_DETAIL' | 'REFERENCE' | 'EVIDENCE'

export type EngagementCardMode = 'opportunity' | 'job' | 'history' | 'delivery' | 'sales' | 'capacity'

export interface EngagementCardPresentation {
  id: string
  tier: 'SUMMARY'
  eyebrow: string
  title: string
  context: string
  stateLabel: string
  capacityLabel: string | null
  narrative: string | null
  valueLabel: string | null
  valueText: string | null
  openActionsText: string
  planLinesText: string
  movementLabel: 'NEXT MOVEMENT' | 'RECORD'
  movementText: string
  movementDetail: string | null
}

export function presentEngagementCard(row: EngagementFrontendRow, mode: EngagementCardMode): EngagementCardPresentation {
  const economics = asRecord(row.economics)
  const next = asRecord(row.next_work)
  const customer = asRecord(row.primary_customer)
  const opportunityMode = mode === 'opportunity' || mode === 'sales'
  const historyMode = mode === 'history'
  const capacityMode = mode === 'capacity'
  const value = numberValue(opportunityMode ? economics?.proposal_value_observed : economics?.committed_revenue_observed)
  const valueBasis = stringValue(economics?.value_basis)
  const nextTitle = stringValue(next?.title)
  const nextWhy = stringValue(next?.why_now)
  const customerName = stringValue(customer?.name)
  const contextParts = [customerName, row.venue_name].filter((value): value is string => Boolean(value))

  return {
    id: row.id,
    tier: 'SUMMARY',
    eyebrow: dateLabel(row),
    title: row.name,
    context: contextParts.join(' · ') || (customerName ? customerName : row.venue_name || 'Customer / location not yet represented'),
    stateLabel: humanEngagementState(row),
    capacityLabel: row.capacity_signal && row.capacity_signal !== 'INFO' ? `Capacity ${row.capacity_signal.toLowerCase()}` : null,
    narrative: row.desired_outcome || row.customer_request || null,
    valueLabel: capacityMode ? null : opportunityMode ? 'Observed proposal' : 'Observed committed',
    valueText: capacityMode ? null : value === null ? 'Unknown' : money(value),
    openActionsText: String(row.open_work_count ?? 0),
    planLinesText: String(row.fulfillment_line_count ?? 0),
    movementLabel: historyMode ? 'RECORD' : 'NEXT MOVEMENT',
    movementText: historyMode ? valueBasisLabel(valueBasis) : (nextTitle || nextMovementFallback(row)),
    movementDetail: historyMode ? null : nextWhy,
  }
}

export function isCommittedEngagement(row: EngagementFrontendRow) {
  return row.commercial_state === 'WON' || ['SIGNED', 'DEPOSIT_PENDING', 'CONFIRMED'].includes(row.commitment_state)
}

export function isOpportunityEngagement(row: EngagementFrontendRow) {
  return ['NEW', 'DISCOVERY', 'DESIGNING', 'PROPOSED', 'NEGOTIATING'].includes(row.commercial_state)
    && !['SIGNED', 'DEPOSIT_PENDING', 'CONFIRMED', 'CANCELLED'].includes(row.commitment_state)
}

export function isPastEngagement(row: EngagementFrontendRow, today: string) {
  const date = row.event_start_date ?? row.event_start?.slice(0, 10) ?? null
  return Boolean(date && date < today)
}

export function bySoonestEngagement(a: EngagementFrontendRow, b: EngagementFrontendRow) {
  const first = a.event_start_date ?? a.event_start?.slice(0, 10) ?? '9999-12-31'
  const second = b.event_start_date ?? b.event_start?.slice(0, 10) ?? '9999-12-31'
  return first.localeCompare(second) || b.updated_at.localeCompare(a.updated_at)
}

export function byMostRecentEngagement(a: EngagementFrontendRow, b: EngagementFrontendRow) {
  const first = a.event_start_date ?? a.event_start?.slice(0, 10) ?? '0000-00-00'
  const second = b.event_start_date ?? b.event_start?.slice(0, 10) ?? '0000-00-00'
  return second.localeCompare(first) || b.updated_at.localeCompare(a.updated_at)
}

export function humanEngagementState(row: EngagementFrontendRow) {
  if (row.commitment_state === 'CONFIRMED') return 'Confirmed'
  if (row.commitment_state === 'DEPOSIT_PENDING') return 'Deposit pending'
  if (row.commitment_state === 'SIGNED') return 'Signed'
  if (row.commercial_state === 'WON') return 'Won'
  if (row.commercial_state === 'NEGOTIATING') return 'Negotiating'
  if (row.commercial_state === 'PROPOSED') return 'Proposal sent'
  if (row.commercial_state === 'DESIGNING') return 'Designing'
  if (row.commercial_state === 'DISCOVERY') return 'Discovery'
  if (row.commercial_state === 'LOST') return 'Lost'
  if (row.commitment_state === 'CANCELLED') return 'Cancelled'
  if (row.operational_state === 'CLOSED') return 'Closed'
  return 'New'
}

export function engagementDateLabel(row: EngagementFrontendRow) {
  return dateLabel(row)
}

export function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatMoney(value: number) {
  return money(value)
}

function dateLabel(row: EngagementFrontendRow) {
  const key = row.event_start_date ?? row.event_start?.slice(0, 10)
  if (!key) return 'DATE TBD'
  return new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function nextMovementFallback(row: EngagementFrontendRow) {
  if (isOpportunityEngagement(row)) return 'Advance the next commercial decision.'
  if (isCommittedEngagement(row)) return 'Protect delivery and resolve the next execution dependency.'
  return humanEngagementState(row)
}

function valueBasisLabel(value: string | null) {
  if (!value) return 'Historical record retained.'
  if (value === 'PROGRAM_ALLOCATION_UNKNOWN') return 'Program component value is intentionally unresolved.'
  return value.replaceAll('_', ' ').toLowerCase()
}

function money(value: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : null
}

function numberValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}
