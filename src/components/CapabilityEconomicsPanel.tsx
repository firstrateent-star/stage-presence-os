import { useCallback, useEffect, useMemo, useState } from 'react'
import { listCapabilityEconomics, type CapabilityEconomicRow } from '../lib/capabilityEconomics'

export function CapabilityEconomicsPanel() {
  const [rows, setRows] = useState<CapabilityEconomicRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try { setRows(await listCapabilityEconomics()) }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load capability economics.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const summary = useMemo(() => ({
    knownSourcing: rows.filter(r => r.sourcing_model !== 'UNKNOWN').length,
    committed: rows.filter(r => r.active_commitment_count > 0).length,
    used: rows.filter(r => r.actual_usage_count > 0).length,
    assetEconomics: rows.filter(r => r.ownership_state != null).length,
    revenueEvidence: rows.filter(r => r.represented_committed_revenue != null).length,
  }), [rows])

  const economicallyVisible = useMemo(() => rows
    .filter(r => r.active_commitment_count > 0 || r.actual_usage_count > 0 || r.ownership_state != null || r.represented_committed_revenue != null || r.resource_linked_actual_cost != null)
    .sort((a, b) => (b.represented_committed_revenue ?? 0) - (a.represented_committed_revenue ?? 0)), [rows])

  return (
    <section className="mb-8 rounded-2xl border border-zinc-900 bg-zinc-950/45 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-700">Capability economics</div>
          <h2 className="mt-1 text-lg font-semibold text-zinc-200">What can we deploy, and what do we actually know about its economics?</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">This joins capability identity, sourcing, commitments, actual use, commercial-line evidence and asset snapshots. It does not infer utilization, ROI or margin where actual evidence is missing.</p>
        </div>
        <div className="text-xs text-zinc-600">{rows.length} active resource{rows.length === 1 ? '' : 's'}</div>
      </div>

      {error && <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Metric label="Known sourcing" value={summary.knownSourcing} />
        <Metric label="Active commitments" value={summary.committed} />
        <Metric label="Actual use seen" value={summary.used} />
        <Metric label="Asset economics" value={summary.assetEconomics} />
        <Metric label="Revenue evidence" value={summary.revenueEvidence} />
      </div>

      {loading ? <div className="mt-4 text-sm text-zinc-600">Loading capability evidence…</div> : economicallyVisible.length ? (
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {economicallyVisible.slice(0, 12).map(row => <CapabilityRow key={row.resource_id} row={row} />)}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-zinc-900 bg-zinc-950/30 p-4 text-sm leading-6 text-zinc-700">Operational Resources exist, but none yet has commitment, actual-use, resource-linked revenue/cost, or asset-economic evidence. That means capability exists; economics remain unobserved.</div>
      )}
    </section>
  )
}

function CapabilityRow({ row }: { row: CapabilityEconomicRow }) {
  return <article className="rounded-xl border border-zinc-900 bg-zinc-950/55 p-4">
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="font-medium text-zinc-300">{row.resource_name}</div>
        <div className="mt-1 text-[10px] text-zinc-700">{human(row.resource_category)} · {human(row.sourcing_model)} · quantity {row.library_quantity ?? 'unknown'} ({human(row.quantity_state)})</div>
      </div>
      <div className="text-right text-[10px] text-zinc-600">{row.ownership_state ? human(row.ownership_state) : 'ownership economics unknown'}</div>
    </div>

    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Tiny label="Commitments" value={String(row.active_commitment_count)} />
      <Tiny label="Actual uses" value={String(row.actual_usage_count)} />
      <Tiny label="Commercial lines" value={money(row.represented_committed_revenue)} />
      <Tiny label="Linked actual cost" value={money(row.resource_linked_actual_cost)} />
    </div>

    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-900 pt-3 text-xs sm:grid-cols-4">
      <Tiny label="Current value" value={money(row.current_value_estimate)} />
      <Tiny label="Replacement" value={money(row.replacement_cost_total)} />
      <Tiny label="Financing" value={money(row.financing_balance)} />
      <Tiny label="Annual maint." value={money(row.annual_maintenance_estimate)} />
    </div>

    <p className="mt-3 text-[10px] leading-4 text-zinc-700">Commercial-line value is represented revenue attached to this Resource in committed commercial evidence; it is not asserted to be revenue caused by the asset. Resource-linked costs are only costs explicitly linked to this Resource.</p>
  </article>
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-zinc-900 bg-zinc-950/55 p-3"><div className="text-lg font-semibold text-zinc-300">{value}</div><div className="mt-1 text-[9px] uppercase tracking-[0.08em] text-zinc-700">{label}</div></div> }
function Tiny({ label, value }: { label: string; value: string }) { return <div><div className="text-[9px] uppercase tracking-[0.08em] text-zinc-700">{label}</div><div className="mt-1 truncate text-xs font-medium text-zinc-400">{value}</div></div> }
function human(value: string) { return value.replaceAll('_', ' ').toLowerCase().replace(/^./, c => c.toUpperCase()) }
function money(value: number | null) { return value == null ? 'Unknown' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value) }
