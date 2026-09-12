import { useState } from 'react'
import { saveEngagementCloseout, type CloseoutKind, type EngagementCloseout } from '../lib/learningCloseout'

export function LearningCloseoutPanel({
  engagementId,
  eventEndDate,
  closeout,
  defaultCloseoutKind,
  onSaved,
}: {
  engagementId: string
  eventEndDate: string | null
  closeout: EngagementCloseout | null
  defaultCloseoutKind: CloseoutKind
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
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">The delivery window has passed. A short closeout gives the OS outcome evidence without requiring a full report. Capture only what someone actually knows.</p>
          )}
        </div>
        <button type="button" onClick={() => setOpen(true)} className="shrink-0 text-xs font-semibold text-emerald-400 hover:text-emerald-300">{closeout ? 'Update' : '+ Close out'}</button>
      </div>

      {closeout && (
        <div className="mt-4 grid gap-2 text-xs text-zinc-600 sm:grid-cols-3">
          <div>Setup: {minutes(closeout.actual_setup_minutes)}</div>
          <div>Strike: {minutes(closeout.actual_strike_minutes)}</div>
          <div>Greg: {minutes(closeout.greg_minutes)}</div>
          {closeout.what_changed && <div className="sm:col-span-3"><span className="text-zinc-500">Changed:</span> {closeout.what_changed}</div>}
          {closeout.venue_learning && <div className="sm:col-span-3"><span className="text-zinc-500">Venue:</span> {closeout.venue_learning}</div>}
          {closeout.next_time && <div className="sm:col-span-3"><span className="text-zinc-500">Next time:</span> {closeout.next_time}</div>}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-3 sm:items-center sm:justify-center">
          <div className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold tracking-[0.14em] text-emerald-600">60-SECOND CLOSEOUT</div>
                <h2 className="mt-1 text-lg font-semibold">What actually happened?</h2>
                <p className="mt-1 text-xs leading-5 text-zinc-600">Answer the four core questions. Everything else is optional evidence.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-zinc-500">Close</button>
            </div>

            {error && <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/20 px-3 py-2 text-sm text-red-300">{error}</div>}

            <form action={(data) => void save(data)} className="mt-5 grid gap-4">
              <input type="hidden" name="closeout_kind" value={closeout?.closeout_kind ?? defaultCloseoutKind} />

              <CoreQuestion number="1" label="Broad outcome">
                <select name="actual_outcome" defaultValue={closeout?.actual_outcome ?? 'UNKNOWN'} className={fieldClass}>
                  <option value="UNKNOWN">Unknown / not enough evidence</option>
                  <option value="AS_EXPECTED">As expected</option>
                  <option value="CHANGED">Delivered, but changed</option>
                  <option value="PARTIAL">Partially delivered</option>
                  <option value="ISSUE">Meaningful issue occurred</option>
                </select>
              </CoreQuestion>

              <CoreQuestion number="2" label="Did the solution materially change onsite?">
                <select name="solution_changed" defaultValue={closeout?.solution_changed == null ? '' : closeout.solution_changed ? 'YES' : 'NO'} className={fieldClass}>
                  <option value="">Unknown / not recorded</option>
                  <option value="NO">No</option>
                  <option value="YES">Yes</option>
                </select>
              </CoreQuestion>

              <CoreQuestion number="3" label="Is there likely repeat / follow-on work?">
                <select name="recurrence_signal" defaultValue={closeout?.recurrence_signal ?? 'UNKNOWN'} className={fieldClass}>
                  <option>UNKNOWN</option>
                  <option>YES</option>
                  <option>MAYBE</option>
                  <option>NO</option>
                </select>
              </CoreQuestion>

              <CoreQuestion number="4" label="What changed, surprised us, or matters to remember?">
                <textarea name="what_changed" defaultValue={closeout?.what_changed ?? ''} rows={3} placeholder="Leave blank if nothing useful is known." className={fieldClass} />
              </CoreQuestion>

              <details className="rounded-xl border border-zinc-900 bg-zinc-950/50">
                <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-zinc-500 hover:text-zinc-300">Add optional delivery detail</summary>
                <div className="grid gap-4 border-t border-zinc-900 p-4">
                  <div className="grid grid-cols-3 gap-3">
                    <MinuteField name="actual_setup_minutes" label="Setup min" value={closeout?.actual_setup_minutes} />
                    <MinuteField name="actual_strike_minutes" label="Strike min" value={closeout?.actual_strike_minutes} />
                    <MinuteField name="greg_minutes" label="Greg min" value={closeout?.greg_minutes} />
                  </div>
                  <TextArea name="what_worked" label="What worked particularly well?" value={closeout?.what_worked} />
                  <TextArea name="venue_learning" label="What should we remember about this venue/site?" value={closeout?.venue_learning} />
                  <TextArea name="next_time" label="What should we do differently next time?" value={closeout?.next_time} />
                </div>
              </details>

              <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-3 text-xs leading-5 text-zinc-600">
                Saving a closeout records outcome evidence only. It does not automatically claim equipment usage, crew completion, payment, or job cost; those remain in their own canonical homes.
              </div>

              <button disabled={saving} className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-zinc-950 disabled:opacity-50">{saving ? 'Saving…' : 'Save closeout'}</button>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

function CoreQuestion({ number, label, children }: { number: string; label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 rounded-xl border border-zinc-900 bg-zinc-950/40 p-4"><span className="flex items-center gap-2 text-sm font-medium text-zinc-300"><span className="grid h-6 w-6 place-items-center rounded-full bg-zinc-900 text-[10px] font-bold text-zinc-500">{number}</span>{label}</span>{children}</label>
}

function MinuteField({ name, label, value }: { name: string; label: string; value?: number | null }) {
  return <label className="text-xs text-zinc-500">{label}<input name={name} type="number" min="0" step="1" defaultValue={value ?? ''} className={`mt-1 w-full ${fieldClass}`} /></label>
}

function TextArea({ name, label, value }: { name: string; label: string; value?: string | null }) {
  return <label className="text-xs text-zinc-500">{label}<textarea name={name} defaultValue={value ?? ''} rows={2} className={`mt-1 w-full ${fieldClass}`} /></label>
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

const fieldClass = 'w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100'
