import { useCallback, useEffect, useMemo, useState } from 'react'
import { listEconomicRateProfiles, type EconomicRateProfileRow } from '../lib/economyRepository'
import { approveEconomicRate, retireEconomicRate } from '../lib/rateGovernance'
import { moneyOrUnknown } from '../lib/economyPresentation'

export function RateGovernancePanel() {
  const [rates, setRates] = useState<EconomicRateProfileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try { setRates(await listEconomicRateProfiles()) }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load cost-rate governance.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const counts = useMemo(() => ({
    draft: rates.filter(r => r.status === 'DRAFT').length,
    approved: rates.filter(r => r.status === 'APPROVED').length,
    retired: rates.filter(r => r.status === 'RETIRED').length,
  }), [rates])

  async function approve(rate: EconomicRateProfileRow) {
    if (!window.confirm(`Approve ${rate.name} at ${moneyOrUnknown(rate.amount)} / ${human(rate.unit_basis).toLowerCase()} as reusable Stage Presence cost authority?`)) return
    setSavingId(rate.id)
    setError(null)
    try { await approveEconomicRate(rate.id); await refresh() }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to approve rate.') }
    finally { setSavingId(null) }
  }

  async function retire(rate: EconomicRateProfileRow) {
    if (!window.confirm(`Retire ${rate.name}? Historical job costs remain unchanged.`)) return
    setSavingId(rate.id)
    setError(null)
    try { await retireEconomicRate(rate.id); await refresh() }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to retire rate.') }
    finally { setSavingId(null) }
  }

  return (
    <section className="mt-6 rounded-2xl border border-zinc-900 bg-zinc-950/45 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-700">Cost rate governance</div>
          <h2 className="mt-1 text-lg font-semibold text-zinc-200">Which reusable assumptions have authority?</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">Draft rates are evidence and hypotheses. Approved rates are explicit reusable authority for future economic reasoning. Retiring a rate stops future use without rewriting historical job actuals.</p>
        </div>
        <div className="text-xs text-zinc-600">{rates.length} version{rates.length === 1 ? '' : 's'}</div>
      </div>

      {error && <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Metric label="Draft" value={counts.draft} warn={counts.draft > 0} />
        <Metric label="Approved" value={counts.approved} />
        <Metric label="Retired" value={counts.retired} />
      </div>

      <div className="mt-4 space-y-2">
        {loading ? <div className="text-sm text-zinc-600">Loading rate authority…</div> : rates.length ? rates.slice(0, 20).map(rate => (
          <div key={rate.id} className="rounded-xl border border-zinc-900 bg-zinc-950/55 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-zinc-300">{rate.name}</div>
                <div className="mt-1 text-[10px] text-zinc-700">{rate.profile_key} · v{rate.version_no} · {human(rate.cost_domain)} · {human(rate.scope_type)}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-zinc-300">{moneyOrUnknown(rate.amount)} / {human(rate.unit_basis).toLowerCase()}</div>
                <div className={`mt-1 text-[10px] font-semibold ${rate.status === 'APPROVED' ? 'text-emerald-500' : rate.status === 'DRAFT' ? 'text-amber-500' : 'text-zinc-700'}`}>{human(rate.status)}</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-900 pt-3">
              <div className="text-xs text-zinc-600">{authorityText(rate)}</div>
              <div className="flex gap-3">
                {rate.status === 'DRAFT' && <button type="button" disabled={savingId === rate.id} onClick={() => void approve(rate)} className="text-xs font-semibold text-emerald-500 hover:text-emerald-300 disabled:opacity-40">Approve authority</button>}
                {rate.status === 'APPROVED' && <button type="button" disabled={savingId === rate.id} onClick={() => void retire(rate)} className="text-xs font-semibold text-zinc-500 hover:text-red-400 disabled:opacity-40">Retire</button>}
              </div>
            </div>
          </div>
        )) : <div className="rounded-xl border border-zinc-900 bg-zinc-950/30 p-4 text-sm leading-6 text-zinc-700">No reusable rate profiles are represented yet. Create draft assumptions in Economic Structure first.</div>}
      </div>
    </section>
  )
}

function authorityText(rate: EconomicRateProfileRow) {
  if (rate.status === 'APPROVED') return 'Approved for future governed economic reasoning. Historical job costs remain their own evidence.'
  if (rate.status === 'RETIRED') return 'Retired from future authority. Existing linked job evidence remains historical truth.'
  return `Draft only. ${rate.certainty_state === 'KNOWN' ? 'The amount is represented as known evidence, but has not been approved as reusable policy.' : 'This assumption is not yet approved for automatic use.'}`
}
function Metric({ label, value, warn=false }: { label: string; value: number; warn?: boolean }) { return <div className={`rounded-xl border p-3 ${warn ? 'border-amber-950/60 bg-amber-950/10' : 'border-zinc-900 bg-zinc-950/55'}`}><div className={`text-lg font-semibold ${warn ? 'text-amber-400' : 'text-zinc-300'}`}>{value}</div><div className="mt-1 text-[9px] uppercase tracking-[0.08em] text-zinc-700">{label}</div></div> }
function human(value: string) { return value.replaceAll('_', ' ').toLowerCase().replace(/^./, c => c.toUpperCase()) }
