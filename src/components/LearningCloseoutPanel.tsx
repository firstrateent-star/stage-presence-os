import { useState } from 'react'
import { saveEngagementCloseout, type EngagementCloseout } from '../lib/learningCloseout'

export function LearningCloseoutPanel({
  engagementId,
  eventEndDate,
  closeout,
  onSaved,
}: {
  engagementId: string
  eventEndDate: string | null
  closeout: EngagementCloseout | null
  onSaved: () => Promise<void> | void
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!closeout && !isPast(eventEndDate)) return null

  async function save(formData: FormData) {
    setSaving(true)
    setError(null)
    try {
      await saveEngagementCloseout(engagementId, {
        closeout_kind: String(formData.get('closeout_kind')) as 'DELIVERY' | 'CANCELLED' | 'LOST' | 'OTHER',
        actual_outcome: String(formData.get('actual_outcome')) as 'AS_EXPECTED' | 'CHANGED' | 'PARTIAL' | 'ISSUE' | 'UNKNOWN',
        actual_setup_minutes: numberOrNull(formData.get('actual_setup_minutes')),
        actual_strike_minutes: numberOrNull(formData.get('actual_strike_minutes')),
        greg_minutes: numberOrNull(formData.get('greg_minutes')),
        solution_changed: booleanOrNull(formData.get('solution_changed')),
        what_worked: textOrNull(formData.get('what_worked')),
        what_changed: textOrNull(formData.get('what_changed')),
        venue_learning: textOrNull(formData.get('venue_learning')),
        next_time: textOrNull(formData.get('next_time')),
        recurrence_signal: String(formData.get('recurrence_signal')) as 'YES' | 'MAYBE' | 'NO' | 'UNKNOWN',
      })
      await Promise.resolve(onSaved())
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save learning closeout.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-emerald-950 bg-emerald-950/10 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold tracking-[0.16em] text-emerald-500">LEARNING</div>
          {closeout ? (
            <>
              <div className="mt-2 text-sm font-medium text-zinc-200">{closeout.closeout_kind.replaceAll('_', ' ')} · {closeout.actual_outcome.replaceAll('_', ' ')}</div>
              <p className="mt-2 text-xs leading-5 text-zinc-600">This Engagement has structured actuals. They are learning evidence, not a replacement for commercial or operational state.</p>
            </>
          ) : (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">The date has passed and no learning closeout is recorded. Add actuals only if someone knows what really happened; do not reconstruct from memory just to clear the card.</p>
          )}
        </div>
        <button type="button" onClick={() => setOpen(true)} className="shrink-0 text-xs font-semibold text-emerald-400 hover:text-emerald-300">{closeout ? 'Update' : '+ Learn'}</button>
      </div>

      {closeout && (
        <div className="mt-4 grid gap-2 text-xs text-zinc-600 sm:grid-cols-3">
          <div>Setup: {minutes(closeout.actual_setup_minutes)}</div>
          <div>Strike: {minutes(closeout.actual_strike_minutes)}</div>
          <div>Greg: {minutes(closeout.greg_minutes)}</div>
          {closeout.venue_learning && <div className="sm:col-span-3"><span className="text-zinc-500">Venue:</span> {closeout.venue_learning}</div>}
          {closeout.next_time && <div className="sm:col-span-3"><span className="text-zinc-500">Next time:</span> {closeout.next_time}</div>}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-3 sm:items-center sm:justify-center">
          <div className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-semibold">Learning closeout</h2><p className="mt-1 text-xs text-zinc-600">Capture only what is actually known.</p></div><button type="button" onClick={() => setOpen(false)} className="text-sm text-zinc-500">Close</button></div>
            {error && <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/20 px-3 py-2 text-sm text-red-300">{error}</div>}
            <form action={(data) => void save(data)} className="mt-5 grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-zinc-500">What are we closing out?<select name="closeout_kind" defaultValue={closeout?.closeout_kind ?? 'DELIVERY'} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100"><option>DELIVERY</option><option>CANCELLED</option><option>LOST</option><option>OTHER</option></select></label>
                <label className="text-xs text-zinc-500">Broad outcome<select name="actual_outcome" defaultValue={closeout?.actual_outcome ?? 'UNKNOWN'} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100"><option>UNKNOWN</option><option>AS_EXPECTED</option><option>CHANGED</option><option>PARTIAL</option><option>ISSUE</option></select></label>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <MinuteField name="actual_setup_minutes" label="Setup min" value={closeout?.actual_setup_minutes} />
                <MinuteField name="actual_strike_minutes" label="Strike min" value={closeout?.actual_strike_minutes} />
                <MinuteField name="greg_minutes" label="Greg min" value={closeout?.greg_minutes} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-zinc-500">Did the solution materially change?<select name="solution_changed" defaultValue={closeout?.solution_changed == null ? '' : closeout.solution_changed ? 'YES' : 'NO'} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100"><option value="">Unknown / not recorded</option><option value="YES">Yes</option><option value="NO">No</option></select></label>
                <label className="text-xs text-zinc-500">Recurring opportunity?<select name="recurrence_signal" defaultValue={closeout?.recurrence_signal ?? 'UNKNOWN'} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100"><option>UNKNOWN</option><option>YES</option><option>MAYBE</option><option>NO</option></select></label>
              </div>

              <TextArea name="what_worked" label="What worked?" value={closeout?.what_worked} />
              <TextArea name="what_changed" label="What changed / surprised us?" value={closeout?.what_changed} />
              <TextArea name="venue_learning" label="Venue learning" value={closeout?.venue_learning} />
              <TextArea name="next_time" label="What should we do differently next time?" value={closeout?.next_time} />

              <button disabled={saving} className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-zinc-950 disabled:opacity-50">{saving ? 'Saving…' : 'Save learning'}</button>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

function MinuteField({ name, label, value }: { name: string; label: string; value?: number | null }) {
  return <label className="text-xs text-zinc-500">{label}<input name={name} type="number" min="0" step="1" defaultValue={value ?? ''} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100" /></label>
}

function TextArea({ name, label, value }: { name: string; label: string; value?: string | null }) {
  return <label className="text-xs text-zinc-500">{label}<textarea name={name} defaultValue={value ?? ''} rows={2} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100" /></label>
}

function isPast(value: string | null) {
  if (!value) return false
  const today = new Date()
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return value < localToday
}

function numberOrNull(value: FormDataEntryValue | null) {
  if (value == null || String(value).trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null
}

function booleanOrNull(value: FormDataEntryValue | null) {
  if (value === 'YES') return true
  if (value === 'NO') return false
  return null
}

function textOrNull(value: FormDataEntryValue | null) {
  const text = value == null ? '' : String(value).trim()
  return text || null
}

function minutes(value: number | null) {
  return value == null ? 'unknown' : `${value}m`
}
