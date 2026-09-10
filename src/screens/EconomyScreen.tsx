import { useEffect, useMemo, useState } from 'react'
import { getEconomyOverview, listEconomicRateProfiles, listEngagementEconomies, type EconomicRateProfileRow, type EconomyOverviewRow, type EngagementEconomyRow } from '../lib/economyRepository'
import { dateLabel, moneyOrUnknown, presentEconomyOverview } from '../lib/economyPresentation'

export function EconomyScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const [overview, setOverview] = useState<EconomyOverviewRow | null>(null)
  const [engagements, setEngagements] = useState<EngagementEconomyRow[]>([])
  const [rates, setRates] = useState<EconomicRateProfileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    void Promise.all([getEconomyOverview(), listEngagementEconomies(), listEconomicRateProfiles()])
      .then(([nextOverview, nextEngagements, nextRates]) => {
        if (!active) return
        setOverview(nextOverview)
        setEngagements(nextEngagements)
        setRates(nextRates)
      })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Unable to load Stage Presence economy.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const activeMoney = useMemo(() => engagements.filter(row => isEconomicallyActive(row)).sort(bySoonest), [engagements])
  const history = useMemo(() => engagements.filter(row => !isEconomicallyActive(row)).sort(byMostRecent), [engagements])

  if (loading) return <div className="sm:ml-48 py-20 text-zinc-600">Loading Stage Presence economy…</div>
  if (error) return <div className="sm:ml-48 rounded-2xl border border-red-950 bg-red-950/10 p-5 text-sm text-red-300">{error}</div>
  if (!overview) return <div className="sm:ml-48 py-20 text-zinc-600">No economic overview is represented.</div>

  const view = presentEconomyOverview(overview)

  return (
    <div className="sm:ml-48">
      <header className="mb-8">
        <p className="text-sm text-zinc-500">How is value moving through Stage Presence?</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Economy</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">Commercial value, collections, represented receivables, direct costs and account funds are deliberately separate. Unknown cost or bank truth stays unknown rather than being turned into profit or cash-on-hand.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <EconomyMetric label="Open proposals" value={view.pipeline} detail="Potential commercial value" />
        <EconomyMetric label="Committed" value={view.committed} detail={`${overview.engagements_with_known_committed_value} Engagements with known value`} />
        <EconomyMetric label="Collected" value={view.collected} detail={`${overview.engagements_with_collection_evidence} Engagements with collection evidence`} />
        <EconomyMetric label="Outstanding" value={view.outstanding} detail={`${overview.engagements_with_outstanding_evidence} Engagements with represented balance`} emphasis />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <StatusCard eyebrow="Actual funds" value={view.funds} detail={view.fundsDetail} />
        <StatusCard eyebrow="Direct-cost visibility" value={view.costCoverage} detail="Engagements with represented direct-cost evidence. A missing cost is not interpreted as $0." />
        <StatusCard eyebrow="Contribution" value={view.contribution} detail={view.contributionDetail} />
      </div>

      <div className="mt-4 rounded-xl border border-zinc-900 bg-zinc-950/45 px-4 py-3 text-xs leading-5 text-zinc-600">
        {view.cashEvidence} {overview.engagements_with_unknown_program_allocation > 0 ? `${overview.engagements_with_unknown_program_allocation} program component Engagements intentionally retain unknown economic allocation.` : ''}
      </div>

      <section className="mt-10">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div><h2 className="text-lg font-semibold text-zinc-200">Money in motion</h2><p className="mt-1 text-xs leading-5 text-zinc-600">Open commercial demand and represented committed work. Open an Engagement for the source lines, collection evidence and direct costs.</p></div>
          <span className="rounded-full border border-zinc-900 px-2 py-1 text-[10px] text-zinc-600">{activeMoney.length}</span>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {activeMoney.map(row => <EconomyEngagementCard key={row.engagement_id} row={row} onOpen={onOpen} />)}
          {!activeMoney.length && <Empty text="No active economic movement is represented." />}
        </div>
      </section>

      <details className="mt-10 rounded-2xl border border-zinc-900 bg-zinc-950/35">
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-zinc-500 hover:text-zinc-300">Historical / resolved economic records · {history.length}</summary>
        <div className="grid gap-3 border-t border-zinc-900 p-5 lg:grid-cols-2">
          {history.map(row => <EconomyEngagementCard key={row.engagement_id} row={row} onOpen={onOpen} />)}
          {!history.length && <Empty text="No historical economic records are represented." />}
        </div>
      </details>

      <details className="mt-6 rounded-2xl border border-zinc-900 bg-zinc-950/35">
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-zinc-500 hover:text-zinc-300">Cost rates + economic assumptions · {rates.length}</summary>
        <div className="border-t border-zinc-900 p-5">
          <div className="mb-4 rounded-xl border border-sky-950/60 bg-sky-950/10 px-4 py-3 text-xs leading-5 text-sky-300/70">Rates are reusable assumptions, not historical job costs. New effective periods can replace future assumptions without rewriting the cost snapshot used on an earlier Engagement.</div>
          {rates.length ? <div className="space-y-2">{rates.map(rate => <RateCard key={rate.id} rate={rate} />)}</div> : <Empty text="No reusable cost-rate profiles are represented yet. Job-level costs can still be captured directly while the rate library is learned from reality." />}
        </div>
      </details>
    </div>
  )
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
function RateCard({ rate }: { rate: EconomicRateProfileRow }) { const scope = rate.scope_type === 'GENERAL' ? 'General' : rate.scope_type === 'ROLE' ? `Role · ${rate.role_code}` : rate.scope_type === 'CATEGORY' ? `Category · ${rate.category}` : humanize(rate.scope_type); return <div className="rounded-xl border border-zinc-900 bg-zinc-950/55 px-4 py-3"><div className="flex items-start justify-between gap-4"><div><div className="font-medium text-zinc-300">{rate.name}</div><div className="mt-1 text-[10px] text-zinc-700">{humanize(rate.cost_domain)} · {humanize(rate.rate_kind)} · {scope} · v{rate.version_no}</div></div><div className="text-right"><div className="font-semibold text-zinc-300">{moneyOrUnknown(rate.amount)} / {humanize(rate.unit_basis).toLowerCase()}</div><div className="mt-1 text-[10px] text-zinc-700">{humanize(rate.status)}{rate.effective_from ? ` · from ${dateLabel(rate.effective_from)}` : ''}</div></div></div></div> }
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-zinc-900 bg-zinc-950/30 p-4 text-sm leading-6 text-zinc-700">{text}</div> }
function isEconomicallyActive(row: EngagementEconomyRow) { return ['NEW','DISCOVERY','DESIGNING','PROPOSED','NEGOTIATING','WON'].includes(row.commercial_state) || ['SIGNED','DEPOSIT_PENDING','CONFIRMED'].includes(row.commitment_state) }
function bySoonest(a: EngagementEconomyRow, b: EngagementEconomyRow) { return (a.event_start_date ?? '9999-12-31').localeCompare(b.event_start_date ?? '9999-12-31') }
function byMostRecent(a: EngagementEconomyRow, b: EngagementEconomyRow) { return (b.event_start_date ?? '0000-00-00').localeCompare(a.event_start_date ?? '0000-00-00') }
function economyStateLabel(row: EngagementEconomyRow) { if (row.economy_state === 'PROGRAM_ALLOCATION_UNKNOWN') return 'Program allocation unresolved'; if (row.economy_state === 'ACTUAL_CONTRIBUTION_SUPPORTED') return 'Actual contribution supported'; if (row.economy_state === 'PROJECTED_CONTRIBUTION_SUPPORTED') return 'Projected contribution supported'; if (row.economy_state === 'REVENUE_VISIBLE_COSTS_UNPOPULATED') return 'Revenue visible · costs not populated'; return humanize(row.economy_state) }
function humanize(value: string) { return value.replaceAll('_',' ').toLowerCase().replace(/^./, x => x.toUpperCase()) }
