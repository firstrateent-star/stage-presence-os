import { useState } from 'react'
import { updateEngagementCapacityDefaults } from '../lib/capacityDefaults'
import type { Engagement, PlannedSourcingModel, RequirementWindowState } from '../types/domain'

export function CapacityDefaultsPanel({ engagement, onSaved }: { engagement: Engagement; onSaved: () => Promise<void> | void }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const windowState = engagement.default_resource_window_state ?? 'UNKNOWN'
  const sourcing = engagement.default_planned_sourcing_model ?? 'UNKNOWN'
  const fromDate = engagement.default_resource_from_date ?? null
  const throughDate = engagement.default_resource_through_date ?? null
  const hasUsefulDefault = Boolean(fromDate || throughDate || windowState !== 'UNKNOWN' || sourcing !== 'UNKNOWN')

  async function save(formData: FormData) {
    setSaving(true)
    setError(null)
    try {
      await updateEngagementCapacityDefaults(engagement.id, {
        from_date: textOrNull(formData.get('from_date')),
        through_date: textOrNull(formData.get('through_date')),
        window_state: String(formData.get('window_state')) as RequirementWindowState,
        sourcing_model: String(formData.get('sourcing_model')) as PlannedSourcingModel,
      })
      await Promise.resolve(onSaved())
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save capacity defaults.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-sky-950 bg-sky-950/10 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold tracking-[0.16em] text-sky-500">CAPACITY DEFAULTS</div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Resolve timing and sourcing once for the Engagement. Configured resources inherit these defaults unless a resource-specific exception overrides them.</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="shrink-0 text-xs font-semibold text-sky-400 hover:text-sky-300">{hasUsefulDefault ? 'Review' : '+ Resolve'}</button>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-zinc-600 sm:grid-cols-3">
        <div><span className="text-zinc-500">Window:</span> {windowLabel(fromDate, throughDate)}</div>
        <div><span className="text-zinc-500">Evidence:</span> {windowState.replaceAll('_', ' ')}</div>
        <div><span className="text-zinc-500">Default source:</span> {sourcing}</div>
      </div>

      {windowState === 'INFERRED_FROM_EVENT' && <p className="mt-3 text-xs leading-5 text-zinc-600">Current timing was inherited from event dates. Operations can strengthen it to ESTIMATED, KNOWN, or VERIFIED when actual possession/load-in/return timing becomes available.</p>}
      {sourcing === 'UNKNOWN' && <p className="mt-2 text-xs leading-5 text-zinc-600">Sourcing is still unknown at the Engagement level. Confirming a normal default once can resolve many configured-resource exceptions at the same time.</p>}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-3 sm:items-center sm:justify-center">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-semibold">Resolve capacity defaults</h2><p className="mt-1 text-xs leading-5 text-zinc-600">Use the broadest truthful default. Handle only genuine exceptions at resource level later.</p></div><button type="button" onClick={() => setOpen(false)} className="text-sm text-zinc-500">Close</button></div>
            {error && <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/20 px-3 py-2 text-sm text-red-300">{error}</div>}
            <form action={(data) => void save(data)} className="mt-5 grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-zinc-500">Resources needed from<input name="from_date" type="date" defaultValue={fromDate ?? ''} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100" /></label>
                <label className="text-xs text-zinc-500">Resources needed through<input name="through_date" type="date" defaultValue={throughDate ?? ''} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100" /></label>
              </div>

              <label className="text-xs text-zinc-500">How certain is this window?<select name="window_state" defaultValue={windowState} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100"><option value="UNKNOWN">Unknown</option><option value="INFERRED_FROM_EVENT">Inferred from event</option><option value="ESTIMATED">Estimated</option><option value="KNOWN">Known — operationally confirmed</option><option value="VERIFIED">Verified — supported by stronger evidence</option></select></label>

              <label className="text-xs text-zinc-500">Default sourcing for configured resources<select name="sourcing_model" defaultValue={sourcing} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100"><option value="UNKNOWN">Unknown / mixed</option><option value="OWNED">Owned Stage Presence capacity</option><option value="SUBCONTRACTED">Subcontracted</option><option value="PARTNER">Partner</option><option value="VENUE">Venue-provided</option></select></label>

              <p className="text-xs leading-5 text-zinc-600">If the job uses mixed sourcing, keep the broad default truthful and represent exceptions at the individual resource later. This setting does not create a hold or reservation.</p>
              <button disabled={saving} className="rounded-xl bg-sky-500 px-4 py-3 text-sm font-bold text-zinc-950 disabled:opacity-50">{saving ? 'Saving…' : 'Save capacity defaults'}</button>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

function textOrNull(value: FormDataEntryValue | null) {
  const text = value == null ? '' : String(value).trim()
  return text || null
}

function windowLabel(fromDate: string | null, throughDate: string | null) {
  if (!fromDate && !throughDate) return 'unknown'
  if (fromDate && throughDate && fromDate === throughDate) return fromDate
  return `${fromDate ?? '?'} → ${throughDate ?? '?'}`
}
