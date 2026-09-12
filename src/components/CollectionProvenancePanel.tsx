import { useCallback, useEffect, useMemo, useState } from 'react'
import { listPaymentProvenance, verifyPaymentEvidence, type PaymentProvenanceRow } from '../lib/collectionProvenance'
import { moneyOrUnknown } from '../lib/economyPresentation'

export function CollectionProvenancePanel({ onOpenEngagement }: { onOpenEngagement?: (id: string) => void }) {
  const [rows, setRows] = useState<PaymentProvenanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<PaymentProvenanceRow | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try { setRows(await listPaymentProvenance()) }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load collection provenance.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const summary = useMemo(() => {
    let accounting = 0, processor = 0, manual = 0, conflicting = 0
    for (const row of rows) {
      if (row.certainty_state === 'CONFLICTING') conflicting += 1
      else if (row.certainty_state === 'VERIFIED' && row.source_type === 'ACCOUNTING') accounting += 1
      else if (row.certainty_state === 'VERIFIED' && row.source_type === 'PROCESSOR') processor += 1
      else manual += 1
    }
    return { accounting, processor, manual, conflicting }
  }, [rows])

  async function verify(formData: FormData) {
    if (!selected) return
    setSaving(true)
    setError(null)
    try {
      await verifyPaymentEvidence({
        paymentId: selected.id,
        sourceType: String(formData.get('source_type')) as 'ACCOUNTING' | 'PROCESSOR',
        externalPaymentId: text(formData.get('external_payment_id')),
        verificationNote: text(formData.get('verification_note')),
      })
      setSelected(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify payment evidence.')
    } finally { setSaving(false) }
  }

  return (
    <section className="mt-6 rounded-2xl border border-zinc-900 bg-zinc-950/45 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-700">Collection provenance</div>
          <h2 className="mt-1 text-lg font-semibold text-zinc-200">How do we know the money moved?</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">QuickBooks remains accounting authority. Stage Presence stores only engagement-level evidence and whether that evidence is merely known, processor-verified, or accounting-verified.</p>
        </div>
        <div className="text-xs text-zinc-600">{rows.length} transaction{rows.length === 1 ? '' : 's'}</div>
      </div>

      {error && <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Accounting verified" value={summary.accounting} />
        <Metric label="Processor verified" value={summary.processor} />
        <Metric label="Known / manual" value={summary.manual} />
        <Metric label="Conflicting" value={summary.conflicting} warn={summary.conflicting > 0} />
      </div>

      <div className="mt-4 space-y-2">
        {loading ? <div className="text-sm text-zinc-600">Loading collection evidence…</div> : rows.length ? rows.slice(0, 12).map(row => {
          const engagement = row.commercial_documents?.engagements
          const engagementId = row.commercial_documents?.engagement_id
          return <div key={row.id} className="rounded-xl border border-zinc-900 bg-zinc-950/55 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <button type="button" disabled={!engagementId || !onOpenEngagement} onClick={() => engagementId && onOpenEngagement?.(engagementId)} className="text-sm font-medium text-zinc-300 disabled:cursor-default disabled:text-zinc-400">
                  {engagement?.name ?? engagement?.engagement_number ?? 'Engagement payment'}
                </button>
                <div className="mt-1 text-[10px] text-zinc-700">{row.payment_date ?? 'date unknown'} · {row.method || 'method unknown'} · {human(row.source_type)} · {human(row.certainty_state)}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-zinc-300">{moneyOrUnknown(row.applied_amount ?? row.charged_amount)}</div>
                {row.external_payment_id && <div className="mt-1 text-[10px] text-zinc-700">ref {row.external_payment_id}</div>}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-900 pt-3">
              <div className="text-xs text-zinc-600">{row.certainty_state === 'VERIFIED' ? `Verified from ${human(row.source_type).toLowerCase()} evidence.` : 'This payment is represented, but not yet verified against an authoritative external source.'}</div>
              {row.certainty_state !== 'VERIFIED' && <button type="button" onClick={() => setSelected(row)} className="text-xs font-semibold text-amber-400 hover:text-amber-300">Verify evidence</button>}
            </div>
          </div>
        }) : <div className="rounded-xl border border-zinc-900 bg-zinc-950/30 p-4 text-sm leading-6 text-zinc-700">No transaction-level payment rows exist yet. Aggregate collection baselines remain separate and should not be re-entered as transactions.</div>}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/75 p-3 sm:items-center sm:justify-center">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex items-center justify-between gap-4"><div><div className="text-xs font-semibold tracking-[0.16em] text-amber-500">VERIFY COLLECTION</div><h3 className="mt-1 text-lg font-semibold text-zinc-100">Confirm the external evidence source</h3></div><button type="button" onClick={() => setSelected(null)} className="text-sm text-zinc-500">Close</button></div>
            <form action={(data) => void verify(data)} className="mt-5 grid gap-4">
              <label className="text-xs text-zinc-500">Verified against<select name="source_type" defaultValue="ACCOUNTING" className={inputClass}><option value="ACCOUNTING">Accounting / QuickBooks evidence</option><option value="PROCESSOR">Payment processor evidence</option></select></label>
              <label className="text-xs text-zinc-500">External reference <span className="text-zinc-700">optional</span><input name="external_payment_id" defaultValue={selected.external_payment_id ?? ''} placeholder="transaction / receipt / QB reference" className={inputClass} /></label>
              <label className="text-xs text-zinc-500">Verification note <span className="text-zinc-700">optional</span><textarea name="verification_note" rows={3} defaultValue={selected.notes ?? ''} placeholder="What was checked?" className={inputClass} /></label>
              <p className="text-xs leading-5 text-zinc-600">This does not create another payment. It upgrades the provenance of the existing transaction because a human explicitly verified it against external evidence.</p>
              <button disabled={saving} className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-zinc-950 disabled:opacity-50">{saving ? 'Saving…' : 'Mark verified'}</button>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

const inputClass = 'mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-zinc-700'
function Metric({ label, value, warn=false }: { label: string; value: number; warn?: boolean }) { return <div className={`rounded-xl border p-3 ${warn ? 'border-amber-950/60 bg-amber-950/10' : 'border-zinc-900 bg-zinc-950/55'}`}><div className={`text-lg font-semibold ${warn ? 'text-amber-400' : 'text-zinc-300'}`}>{value}</div><div className="mt-1 text-[9px] uppercase tracking-[0.08em] text-zinc-700">{label}</div></div> }
function human(value: string) { return value.replaceAll('_', ' ').toLowerCase().replace(/^./, c => c.toUpperCase()) }
function text(value: FormDataEntryValue | null) { const next = value == null ? '' : String(value).trim(); return next || null }
