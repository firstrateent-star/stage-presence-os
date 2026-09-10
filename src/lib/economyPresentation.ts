import type { EconomyOverviewRow, EngagementEconomyRow, RevenueSourceRow } from './economyRepository'

export interface EconomyOverviewPresentation {
  pipeline: string
  committed: string
  collected: string
  outstanding: string
  funds: string
  fundsDetail: string
  costCoverage: string
  contribution: string
  contributionDetail: string
  cashEvidence: string
}

export interface EngagementEconomyPresentation {
  stateLabel: string
  stateTone: 'good' | 'watch' | 'quiet'
  stateDetail: string
  commercialValueLabel: string
  commercialValue: string
  invoiced: string
  collected: string
  outstanding: string
  costEstimate: string
  actualCost: string
  contributionLabel: string
  contribution: string
  contributionDetail: string
  cashEvidence: string
  sourceDocument: string
  sourceDocumentDetail: string
}

export function presentEconomyOverview(row: EconomyOverviewRow): EconomyOverviewPresentation {
  const costCoverage = `${numberValue(row.engagements_with_cost_evidence) ?? 0}/${numberValue(row.engagement_count) ?? 0}`
  const fundsState = row.funds_evidence_state
  const funds = fundsState === 'ACCOUNT_SNAPSHOTS' || fundsState === 'PARTIAL_ACCOUNT_SNAPSHOTS'
    ? moneyOrUnknown(row.liquid_funds_observed)
    : 'Not represented'
  const contribution = row.contribution_observed_where_known == null
    ? 'Not supported yet'
    : moneyOrUnknown(row.contribution_observed_where_known)

  return {
    pipeline: moneyOrUnknown(row.open_pipeline_value_observed),
    committed: moneyOrUnknown(row.committed_revenue_observed),
    collected: moneyOrUnknown(row.collected_observed),
    outstanding: moneyOrUnknown(row.outstanding_observed),
    funds,
    fundsDetail: fundsState === 'NO_ACCOUNT_DATA'
      ? 'No bank/cash accounts are represented. Collections are not cash-on-hand.'
      : fundsState === 'NO_ACCOUNT_SNAPSHOTS'
        ? 'Accounts exist, but no balance snapshots are represented.'
        : fundsState === 'PARTIAL_ACCOUNT_SNAPSHOTS'
          ? 'Only part of the represented account set has current balance evidence.'
          : `Latest account evidence ${dateLabel(row.newest_account_snapshot_at)}.`,
    costCoverage,
    contribution,
    contributionDetail: row.engagements_with_actual_contribution > 0
      ? `Supported on ${row.engagements_with_actual_contribution} Engagement${row.engagements_with_actual_contribution === 1 ? '' : 's'} with actual cost evidence.`
      : 'Contribution is intentionally withheld until direct cost evidence exists.',
    cashEvidence: row.newest_cash_evidence_date
      ? `Commercial cash evidence currently reaches ${dateLabel(row.newest_cash_evidence_date)}.`
      : 'No collection evidence is represented.',
  }
}

export function presentEngagementEconomy(row: EngagementEconomyRow): EngagementEconomyPresentation {
  const committed = numberValue(row.committed_revenue_observed)
  const proposal = numberValue(row.proposal_value_observed)
  const actualContribution = numberValue(row.contribution_observed)
  const projectedContribution = numberValue(row.projected_contribution_observed)
  const actualMargin = numberValue(row.contribution_margin)
  const projectedMargin = numberValue(row.projected_contribution_margin)
  const sourceParts = [row.primary_document_type, row.primary_document_state].filter(Boolean).map(value => humanize(String(value)))

  let stateLabel = 'Partial economic picture'
  let stateTone: EngagementEconomyPresentation['stateTone'] = 'quiet'
  let stateDetail = 'The system is preserving only the money evidence currently represented.'
  if (row.economy_state === 'PROGRAM_ALLOCATION_UNKNOWN') {
    stateLabel = 'Allocation unresolved'
    stateTone = 'watch'
    stateDetail = 'This Engagement belongs to a larger program whose per-job economic allocation is explicitly unknown.'
  } else if (row.economy_state === 'ACTUAL_CONTRIBUTION_SUPPORTED') {
    stateLabel = 'Actual contribution visible'
    stateTone = 'good'
    stateDetail = 'Committed revenue and actual direct-cost evidence are both represented.'
  } else if (row.economy_state === 'PROJECTED_CONTRIBUTION_SUPPORTED') {
    stateLabel = 'Projected contribution visible'
    stateTone = 'good'
    stateDetail = 'Commercial value and estimated direct-cost evidence are represented.'
  } else if (row.economy_state === 'REVENUE_VISIBLE_COSTS_UNPOPULATED') {
    stateLabel = 'Revenue visible · costs missing'
    stateTone = 'watch'
    stateDetail = 'Revenue evidence exists, but direct costs have not yet been populated. This is not a profit estimate.'
  }

  const contribution = actualContribution != null ? money(actualContribution) : projectedContribution != null ? money(projectedContribution) : 'Unknown'
  const contributionLabel = actualContribution != null ? 'Actual contribution' : projectedContribution != null ? 'Projected contribution' : 'Contribution'
  const margin = actualMargin != null ? actualMargin : projectedMargin

  return {
    stateLabel,
    stateTone,
    stateDetail,
    commercialValueLabel: committed != null ? 'Committed revenue' : 'Proposal value',
    commercialValue: committed != null ? money(committed) : proposal != null ? money(proposal) : 'Unknown',
    invoiced: moneyOrUnknown(row.invoiced_observed),
    collected: moneyOrUnknown(row.collected_observed),
    outstanding: moneyOrUnknown(row.outstanding_observed),
    costEstimate: moneyOrUnknown(row.direct_cost_estimate_observed),
    actualCost: moneyOrUnknown(row.direct_cost_actual_observed),
    contributionLabel,
    contribution,
    contributionDetail: contribution === 'Unknown'
      ? 'Not profit. Contribution appears only when supported direct-cost evidence is represented.'
      : `${margin != null ? `${percent(margin)} contribution margin. ` : ''}General company overhead is not automatically included unless explicitly allocated to this Engagement.`,
    cashEvidence: cashEvidenceText(row),
    sourceDocument: sourceParts.join(' · ') || 'No primary commercial document',
    sourceDocumentDetail: row.primary_document_external_id
      ? `${row.primary_document_external_id}${row.primary_document_source_system ? ` · ${row.primary_document_source_system}` : ''}`
      : (row.primary_document_source_system || 'No external document identifier represented'),
  }
}

export function groupRevenueSources(rows: RevenueSourceRow[]) {
  const totals = new Map<string, number>()
  for (const row of rows) {
    const amount = numberValue(row.effective_line_total)
    if (amount == null) continue
    totals.set(row.revenue_bucket, (totals.get(row.revenue_bucket) ?? 0) + amount)
  }
  return Array.from(totals.entries())
    .map(([bucket, amount]) => ({ bucket, label: revenueBucketLabel(bucket), amount, amountText: money(amount) }))
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
}

export function revenueBucketLabel(bucket: string) {
  if (bucket === 'EQUIPMENT') return 'Equipment'
  if (bucket === 'SERVICE') return 'Services / labor sold'
  if (bucket === 'LOGISTICS') return 'Logistics'
  if (bucket === 'CUSTOM_PACKAGE') return 'Packages / custom scope'
  if (bucket === 'DISCOUNT') return 'Discounts'
  return 'Other'
}

export function moneyOrUnknown(value: unknown) {
  const parsed = numberValue(value)
  return parsed == null ? 'Unknown' : money(parsed)
}

export function money(value: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

export function numberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}

export function dateLabel(value: string | null) {
  if (!value) return 'date unknown'
  const key = value.slice(0, 10)
  return new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function cashEvidenceText(row: EngagementEconomyRow) {
  const asOf = row.cash_evidence_as_of ? dateLabel(row.cash_evidence_as_of) : 'date unknown'
  if (row.cash_evidence_state === 'PAYMENT_RECORDS') return `Collection position is supported by structured payment records through ${asOf}.`
  if (row.cash_evidence_state === 'FINANCIAL_FACT_SNAPSHOT') return `Collection position is an observed financial snapshot as of ${asOf}.`
  if (row.cash_evidence_state === 'DOCUMENT_SNAPSHOT') return `Collected / owed values come from a commercial-document snapshot as of ${asOf}; they are not a live bank balance.`
  return 'Current collection status is not independently represented.'
}

function percent(value: number) {
  return new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1 }).format(value)
}

function humanize(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/^./, match => match.toUpperCase())
}
