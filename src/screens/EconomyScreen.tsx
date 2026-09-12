import { useCallback, useEffect, useMemo, useState } from 'react'
import { CollectionProvenancePanel } from '../components/CollectionProvenancePanel'
import { EconomyRealityMap } from '../components/EconomyRealityMap'
import { EconomyStructurePanel } from '../components/EconomyStructurePanel'
import { RateGovernancePanel } from '../components/RateGovernancePanel'
import { getEconomyOverview, listEngagementEconomies, type EconomyOverviewRow, type EngagementEconomyRow } from '../lib/economyRepository'
import { dateLabel, moneyOrUnknown, presentEconomyOverview } from '../lib/economyPresentation'

export function EconomyScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const [overview, setOverview] = useState<EconomyOverviewRow | null>(null)
  const [engagements, setEngagements] = useState<EngagementEconomyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [nextOverview, nextEngagements] = await Promise.all([getEconomyOverview(), listEngagementEconomies()])
      setOverview(nextOverview)
      setEngagements(nextEngagements)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Stage Presence economy.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const activeMoney = useMemo(() => engagements.filter(row => isEconomicallyActive(row)).sort(bySoonest), [engagements])
  const history = useMemo(() => engagements.filter(row => !isEconomicallyActive(row)).sort(byMostRecent), [engagements])

  if (loading && !overview) return <div className="sm:ml-48 py-20 text-zinc-600">Loading Stage Presence economy…</div>
  if (error && !overview) return <div className="sm:ml-48 rounded-2xl border border-red-950 bg-red-950/10 p-5 text-sm text-red-300">{error}</div>
  if (!overview) return <div className="sm:ml-48 py-20 text-zinc-600">No economic overview is represented.</div>

  const view = presentEconomyOverview(overview)
  const companyCost = overview.company_cost_record_count > 0 ? moneyOrUnknown(overview.company_cost_actual_ytd) : 'Not represented'
  const assetValue = overview.resource_economic_snapshot_count > 0 ? moneyOrUnknown(overview.asset_current_value_observed) : 'Not represented'

  return (
    <div className="sm:ml-48">
      <header className="mb-8">
        <p className="text-sm text-zinc-500">How is value moving through Stage Presence?</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Economy</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">A living view of sales, collections, job costs, company operating costs, assets and actual funds. These realities stay separate so an incomplete record never turns itself into profit, cash-on-hand or asset value.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <EconomyMetric label="Open proposals" value={view.pipeline} detail="Potential commercial value" />
        <EconomyMetric label="Committed" value={view.committed} detail={`${overview.engagements_with_known_committed_value} Engagements with known value`} />
        <EconomyMetric label="Collected" value={view.collected} detail={`${overview.engagements_with_collection_evidence} Engagements with collection evidence`} />
        <EconomyMetric label="Outstanding" value={view.outstanding} detail={`${overview.engagements_with_outstanding_evidence} Engagements with represented balance`} emphasis />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatusCard eyebrow="Actual funds" value={view.funds} detail={view.fundsDetail} />
        <StatusCard eyebrow="Job cost visibility" value={view.costCoverage} detail="Jobs with represented direct-cost evidence. Missing cost is never treated as $0." />
        <StatusCard eyebrow="Company costs YTD" value={companyCost} detail={overview.company_cost_record_count ? `${overview.company_cost_record_count_ytd} operating cost records represented this year; completeness is not assumed.` : 'No non-job operating-cost evidence has been entered yet.'} />
        <StatusCard eyebrow="Asset value represented" value={assetValue} detail={overview.resource_economic_snapshot_count ? `${overview.resource_economic_snapshot_count} Resources have economic snapshots; valuation completeness is not assumed.` : 'Operational Resources exist, but their ownership/value economics have not been asserted.'} />
      </div>

      <div className="mt-4 rounded-2xl border border-zinc-900 bg-zinc-950/50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-700">Contribution where supported</div>
            <div className="mt-1 text-xl font-semibold text-zinc-300">{view.contribution}</div>
          </div>
          <div className="max-w-2xl text-xs leading-5 text-zinc-600">{view.contributionDetail} Company overhead, financing, taxes and incomplete asset economics are not silently subtracted and this is therefore not presented as company profit.</div>
        </div>
      </div>

      <EvidenceBanner overview={overview} cashEvidence={view.cashEvidence} />
      <ContributionReadiness engagements={engagements} onOpen={onOpen} />
      <CollectionProvenancePanel onOpenEngagement={onOpen} />
      <EconomyRealityMap />

      <section className="mt-10">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div><h2 className="text-lg font-semibold text-zinc-200">Money in motion</h2><p className="mt-1 text-xs leading-5 text-zinc-600">Open commercial demand and represented committed work. Open an Engagement to trace its quote lines, collection evidence and direct costs.</p></div>
          <span className="rounded-full border border-zinc-900 px-2 py-1 text-[10px] text-zinc-600">{activeMoney.length}</span>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {activeMoney.map(row => <EconomyEngagementCard key={row.engagement_id} row={row} onOpen={onOpen} />)}
          {!activeMoney.length && <Empty text="No active economic movement is represented." />}
        </div>
      </section>

      <EconomyStructurePanel onChanged={() => void refresh()} />
      <RateGovernancePanel />

      <details className="mt-10 rounded-2xl border border-zinc-900 bg-zinc-950/35">
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-zinc-500 hover:text-zinc-300">Historical / resolved Engagement economies · {history.length}</summary>
        <div className="grid gap-3 border-t border-zinc-900 p-5 lg:grid-cols-2">
          {history.map(row => <EconomyEngagementCard key={row.engagement_id} row={row} onOpen={onOpen} />)}
          {!history.length && <Empty text="No historical economic records are represented." />}
        </div>
      </details>
    </div>
  )
}

function EvidenceBanner({ overview, cashEvidence }: { overview: EconomyOverviewRow; cashEvidence: string }) {
  const state = overview.operating_economy_evidence_state
  const headline = state === 'DIRECT_COST_COVERAGE_INCOMPLETE' ? 'Job-cost coverage is the biggest missing economic truth.' : state === 'COMPANY_COST_COVERAGE_UNKNOWN' ? 'Job economics are represented more deeply than company overhead.' : state === 'FUNDS_COVERAGE_UNKNOWN' ? 'Operating economics exist, but actual funds still need account evidence.' : 'Multiple economic layers are now represented; continue improving evidence coverage.'
  return <div className="mt-4 rounded-xl border border-zinc-900 bg-zinc-950/45 px-4 py-3 text-xs leading-5 text-zinc-600"><span className="font-medium text-zinc-400">{headline}</span> {cashEvidence} {overview.engagements_with_unknown_program_allocation > 0 ? `${overview.engagements_with_unknown_program_allocation} program component Engagements intentionally retain unknown economic allocation.` : ''}</div>
}

function ContributionReadiness({ engagements, onOpen }: { engagements: EngagementEconomyRow[]; onOpen: (id: string) => void }) {
  const committed = engagements.filter(row => row.committed_revenue_observed != null || ['SIGNED','DEPOSIT_PENDING','CONFIRMED'].includes(row.commitment_state))
  const actual = committed.filter(row => row.economy_state === 'ACTUAL_CONTRIBUTION_SUPPORTED')
  const projected = committed.filter(row => row.economy_state === 'PROJECTED_CONTRIBUTION_SUPPORTED')
  const costMissing = committed.filter(row => row.economy_state === 'REVENUE_VISIBLE_COSTS_UNPOPULATED')
  const allocationUnknown = committed.filter(row => row.economy_state === 'PROGRAM_ALLOCATION_UNKNOWN')
  const unresolved = committed.filter(row => !['ACTUAL_CONTRIBUTION_SUPPORTED','PROJECTED_CONTRIBUTION_SUPPORTED'].includes(row.economy_state)).slice(0, 8)

  return <section className="mt-6 rounded-2xl border border-zinc-900 bg-zinc-950/45 p-5">
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-700">Contribution readiness</div>
      <h2 className="mt-1 text-lg font-semibold text-zinc-200">Which job economics are actually supportable?</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">This is not a score. It shows whether represented revenue and direct-cost evidence are strong enough to support actual or projected contribution without treating missing cost as zero.</p>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <MetricCount label="Actual supported" value={actual.length} />
      <MetricCount label="Projected supported" value={projected.length} />
      <MetricCount label="Costs missing" value={costMissing.length} warn={costMissing.length > 0} />
      <MetricCount label="Allocation unknown" value={allocationUnknown.length} warn={allocationUnknown.length > 0} />
    </div>
    {unresolved.length > 0 && <div className="mt-4 space-y-2">{unresolved.map(row => <button key={row.engagement_id} type="button" onClick={() => onOpen(row.engagement_id)} className="flex w-full items-start justify-between gap-4 rounded-xl border border-zinc-900 bg-zinc-950/55 px-4 py-3 text-left hover:border-zinc-700"><div><div className="text-sm font-medium text-zinc-300">{row.engagement_name}</div><div className="mt-1 text-xs text-zinc-700">{contributionBlocker(row)}</div></div><div className="text-right text-xs text-zinc-500">{moneyOrUnknown(row.committed_revenue_observed)}</div></button>)}</div>}
  </section>
}

function EconomyEngagementCard({ row, onOpen }: { row: EngagementEconomyRow; onOpen: (id: string) => void }) {
  const commercialValue = row.committed_revenue_observed ?? row.proposal_value_observed
  const label = row.committed_revenue_observed != null ? 'Committed' : 'Proposal'
  return (
    <button type="button" onClick={() => onOpen(row.engagement_id)} className="rounded-2xl border border-zinc-900 bg-zinc-950/65 p-4 text-left transition hover:border-zinc-700">
      <div className="flex items-start justify-between gap-4"><div><div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-700">{row.event_start_date ? dateLabel(row.event_start_date) : 'Date TBD'}</div><div className="mt-1 font-semibold text-zinc-200">{row.engagement_name}</div><div className="mt-1 text-xs text-zinc-700">{economyStateLabel(row)}</div></div><div className="text-right"><div className="text-[9px] uppercase tracking-[0.1em] text-zinc-700">{label}</div><div className="mt-1 font-semibold text-zinc-300">{moneyOrUnknown(commercialValue)}</div></div></div>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-zinc-900 pt-3"><Tiny label="Collected" value={moneyOrUnknown(row.collected_observed)} /><Tiny label="Outstanding" value={moneyOrUnknown(row.outstanding_observed)} /><Tiny label="Direct cost" value={moneyOrUnknown(row.direct_cost_actual_observed ?? row.direct_cost_estimate_observed)} /></div>
    </button>
  )
}

function EconomyMetric({ label, value, detail, emphasis=false }: { label: string; value: string; detail: string; emphasis?: boolean }) { return <div className={`rounded-2xl border p-4 ${emphasis ? 'border-amber-950/70 bg-amber-950/10' : 'border-zinc-900 bg-zinc-950/65'}`}><div className={`text-2xl font-semibold ${emphasis ? 'text-amber-400' : 'text-zinc-100'}`}>{value}</div><div className="mt-1 text-xs font-semibold text-zinc-500">{label}</div><div className="mt-2 text-[10px] leading-4 text-zinc-700">{detail}</div></div> }
function StatusCard({ eyebrow, value, detail }: { eyebrow: string; value: string; detail: string }) { return <div className="rounded-2xl border border-zinc-900 bg-zinc-950/50 p-4"><div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-700">{eyebrow}</div><div className="mt-1 text-xl font-semibold text-zinc-300">{value}</div><div className="mt-2 text-xs leading-5 text-zinc-600">{detail}</div></div> }
function Tiny({ label, value }: { label: string; value: string }) { return <div><div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-700">{label}</div><div className="mt-1 truncate text-xs font-medium text-zinc-400">{value}</div></div> }
function MetricCount({ label, value, warn=false }: { label: string; value: number; warn?: boolean }) { return <div className={`rounded-xl border p-3 ${warn ? 'border-amber-950/60 bg-amber-950/10' : 'border-zinc-900 bg-zinc-950/55'}`}><div className={`text-lg font-semibold ${warn ? 'text-amber-400' : 'text-zinc-300'}`}>{value}</div><div className="mt-1 text-[9px] uppercase tracking-[0.08em] text-zinc-700">{label}</div></div> }
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-zinc-900 bg-zinc-950/30 p-4 text-sm leading-6 text-zinc-700">{text}</div> }
function isEconomicallyActive(row: EngagementEconomyRow) { return ['NEW','DISCOVERY','DESIGNING','PROPOSED','NEGOTIATING','WON'].includes(row.commercial_state) || ['SIGNED','DEPOSIT_PENDING','CONFIRMED'].includes(row.commitment_state) }
function bySoonest(a: EngagementEconomyRow, b: EngagementEconomyRow) { return (a.event_start_date ?? '9999-12-31').localeCompare(b.event_start_date ?? '9999-12-31') }
function byMostRecent(a: EngagementEconomyRow, b: EngagementEconomyRow) { return (b.event_start_date ?? '0000-00-00').localeCompare(a.event_start_date ?? '0000-00-00') }
function economyStateLabel(row: EngagementEconomyRow) { if (row.economy_state === 'PROGRAM_ALLOCATION_UNKNOWN') return 'Program allocation unresolved'; if (row.economy_state === 'ACTUAL_CONTRIBUTION_SUPPORTED') return 'Actual contribution supported'; if (row.economy_state === 'PROJECTED_CONTRIBUTION_SUPPORTED') return 'Projected contribution supported'; if (row.economy_state === 'REVENUE_VISIBLE_COSTS_UNPOPULATED') return 'Revenue visible · costs not populated'; return humanize(row.economy_state) }
function contributionBlocker(row: EngagementEconomyRow) { if (row.economy_state === 'PROGRAM_ALLOCATION_UNKNOWN') return 'Program-level allocation is intentionally unresolved.'; if (row.committed_revenue_observed == null) return 'Committed revenue is not represented.'; if (row.direct_cost_actual_observed == null && row.direct_cost_estimate_observed == null) return 'No direct-cost evidence is represented yet.'; if (row.direct_cost_actual_observed == null) return 'Projected cost exists, but actual direct cost is not yet represented.'; return 'Economic evidence remains partial.' }
function humanize(value: string) { return value.replaceAll('_',' ').toLowerCase().replace(/^./, x => x.toUpperCase()) }
