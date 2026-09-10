import type {
  EngagementQuoteLineCandidateRow,
  EngagementQuoteReadinessRow,
  PricingAuthorityState,
} from './commercialRepository'

export interface CommercialReadinessPresentation {
  tier: 'OPERATING_DETAIL'
  stateLabel: string
  stateTone: 'quiet' | 'watch' | 'good'
  headline: string
  reason: string
  currentQuoteLabel: string | null
  currentQuoteState: string | null
  priceDecisionCount: number
  reviewCount: number
  approvedCount: number
  currentReferenceCount: number
  historyOnlyCount: number
  noAuthorityCount: number
  includedComponentCount: number
}

export interface CommercialLinePresentation {
  id: string
  title: string
  context: string
  quantityText: string | null
  authorityLabel: string
  authorityTone: 'good' | 'watch' | 'quiet' | 'risk'
  priceText: string
  priceDetail: string | null
  needsReview: boolean
}

export function presentCommercialReadiness(
  readiness: EngagementQuoteReadinessRow,
  lines: EngagementQuoteLineCandidateRow[],
): CommercialReadinessPresentation {
  const includedComponentCount = lines.filter((line) => line.pricing_authority_state === 'NON_PRICED_COMPONENT').length
  const priceDecisionCount = Math.max(0, lines.length - includedComponentCount)
  const approvedCount = lines.filter((line) => line.pricing_authority_state === 'APPROVED_RULE_AVAILABLE').length
  const currentReferenceCount = lines.filter((line) => line.pricing_authority_state === 'CURRENT_REFERENCE_ONLY').length
  const historyOnlyCount = lines.filter((line) => line.pricing_authority_state === 'HISTORICAL_ONLY').length
  const noAuthorityCount = lines.filter((line) => ['UNLINKED_SCOPE_REVIEW', 'NO_PRICE_EVIDENCE'].includes(line.pricing_authority_state)).length

  const state = readiness.readiness_state
  const stateLabel = state === 'DRAFTABLE'
    ? 'Ready to draft'
    : state === 'DRAFTABLE_WITH_REVIEW'
      ? 'Draftable with review'
      : state === 'PRICING_REVIEW'
        ? 'Pricing review'
        : 'Needs scope'

  const stateTone: CommercialReadinessPresentation['stateTone'] = state === 'DRAFTABLE' ? 'good' : state === 'NEEDS_REQUIREMENTS' ? 'quiet' : 'watch'

  const currentQuoteLabel = readiness.current_quote_total === null
    ? null
    : `${money(readiness.current_quote_total)} observed quote`

  const headline = priceDecisionCount === 0
    ? 'No independent price decisions are represented yet.'
    : readiness.human_price_judgment_lines === 0
      ? 'Represented price decisions have approved rule coverage.'
      : `${readiness.human_price_judgment_lines} of ${priceDecisionCount} price decisions still require human judgment.`

  return {
    tier: 'OPERATING_DETAIL',
    stateLabel,
    stateTone,
    headline,
    reason: readiness.readiness_reason,
    currentQuoteLabel,
    currentQuoteState: readiness.current_quote_state ? humanState(readiness.current_quote_state) : null,
    priceDecisionCount,
    reviewCount: readiness.human_price_judgment_lines,
    approvedCount,
    currentReferenceCount,
    historyOnlyCount,
    noAuthorityCount,
    includedComponentCount,
  }
}

export function presentCommercialLine(line: EngagementQuoteLineCandidateRow): CommercialLinePresentation {
  const state = line.pricing_authority_state
  const authorityLabel = authorityStateLabel(state)
  const authorityTone = authorityStateTone(state)
  const quantityText = line.quantity === null ? null : `Qty ${compactNumber(line.quantity)}`
  const context = [line.primary_category, line.resource_name && line.resource_name !== line.title ? line.resource_name : null]
    .filter((value): value is string => Boolean(value))
    .join(' · ') || 'Scope line'

  let priceText = 'No price signal'
  let priceDetail: string | null = null

  if (state === 'NON_PRICED_COMPONENT') {
    priceText = 'Included component'
    priceDetail = 'Part of a larger package; not treated as a separate pricing decision.'
  } else if (state === 'APPROVED_RULE_AVAILABLE') {
    const firstRule = line.approved_rules?.[0]
    const amount = numberValue(firstRule?.amount)
    priceText = amount === null ? 'Approved rule available' : `${money(amount)} approved rule`
    priceDetail = stringValue(firstRule?.name) || 'Current approved pricing authority exists for this scope.'
  } else if (state === 'CURRENT_REFERENCE_ONLY' && line.reference_price !== null) {
    priceText = `${money(line.reference_price)} current reference`
    priceDetail = 'Current reference evidence only — not yet approved pricing authority.'
  } else if (state === 'LEGACY_REFERENCE_ONLY' && line.reference_price !== null) {
    priceText = `${money(line.reference_price)} legacy reference`
    priceDetail = 'Legacy reference evidence — requires current commercial judgment.'
  } else if (state === 'HISTORICAL_ONLY' && line.historical_observation_count > 0) {
    priceText = historyRange(line)
    priceDetail = `${line.historical_observation_count} historical observation${line.historical_observation_count === 1 ? '' : 's'}; history is evidence, not authority.`
  } else if (state === 'UNLINKED_SCOPE_REVIEW') {
    priceText = 'Scope needs linking'
    priceDetail = 'This scope line is not linked to a canonical Resource with governed price context.'
  } else if (state === 'NO_PRICE_EVIDENCE') {
    priceText = 'No governed price evidence'
    priceDetail = 'A commercial decision is needed before this line can participate in quote construction.'
  }

  return {
    id: line.fulfillment_line_id ?? `${line.engagement_id}-${line.sort_order ?? 0}`,
    title: line.title || line.resource_name || 'Untitled scope line',
    context,
    quantityText,
    authorityLabel,
    authorityTone,
    priceText,
    priceDetail,
    needsReview: line.requires_human_price_judgment,
  }
}

function authorityStateLabel(state: PricingAuthorityState) {
  if (state === 'APPROVED_RULE_AVAILABLE') return 'Approved rule'
  if (state === 'CURRENT_REFERENCE_ONLY') return 'Current reference'
  if (state === 'LEGACY_REFERENCE_ONLY') return 'Legacy reference'
  if (state === 'HISTORICAL_ONLY') return 'History only'
  if (state === 'UNLINKED_SCOPE_REVIEW') return 'Scope review'
  if (state === 'NON_PRICED_COMPONENT') return 'Included component'
  return 'No price evidence'
}

function authorityStateTone(state: PricingAuthorityState): CommercialLinePresentation['authorityTone'] {
  if (state === 'APPROVED_RULE_AVAILABLE') return 'good'
  if (state === 'CURRENT_REFERENCE_ONLY' || state === 'HISTORICAL_ONLY' || state === 'LEGACY_REFERENCE_ONLY') return 'watch'
  if (state === 'NON_PRICED_COMPONENT') return 'quiet'
  return 'risk'
}

function historyRange(line: EngagementQuoteLineCandidateRow) {
  const min = line.historical_min_effective_unit
  const avg = line.historical_avg_effective_unit
  const max = line.historical_max_effective_unit
  if (min !== null && max !== null && min !== max) return `${money(min)}–${money(max)} history`
  if (avg !== null) return `${money(avg)} historical average`
  if (min !== null) return `${money(min)} historical observation`
  return 'Historical price evidence'
}

function humanState(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase())
}

function compactNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)))
}

function money(value: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null
}

function numberValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}
