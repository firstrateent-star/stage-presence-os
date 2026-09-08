import { useState } from 'react'
import { createEngagement } from '../lib/repository'
import { isBackendConfigured } from '../lib/config'

export function NewEngagementScreen({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [capture, setCapture] = useState('')
  const [name, setName] = useState('')
  const [request, setRequest] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function submit() {
    if (!name.trim()) {
      setMessage('Give the engagement a short name before saving.')
      return
    }
    if (!isBackendConfigured) {
      setMessage('Demo mode: the interface is ready, but saving is intentionally disabled until the Stage Presence Supabase project is connected.')
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      await createEngagement({
        name: name.trim(),
        engagement_type: 'EVENT',
        customer_request: request.trim() || capture.trim(),
        next_action: nextAction.trim(),
        raw_capture: capture.trim(),
      })
      onCreated()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to create engagement.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sm:ml-48">
      <button type="button" onClick={onCancel} className="mb-5 text-sm text-zinc-500 hover:text-zinc-200">← Cancel</button>
      <div className="max-w-2xl">
        <p className="text-sm text-zinc-500">Tell Stage Presence what is happening. Structure can follow.</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">New Engagement</h1>

        <label className="mt-7 block text-sm font-medium text-zinc-300">Natural capture</label>
        <textarea value={capture} onChange={(event) => setCapture(event.target.value)} placeholder="Example: Nancy from Bridge Run called. April 4. Wants the big trailer again and maybe audio. Setup day before." rows={6} className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-base leading-7 text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-amber-600" />
        <div className="mt-2 rounded-xl border border-zinc-900 bg-zinc-950/60 p-3 text-xs leading-5 text-zinc-600">Future Engagement Interpreter boundary: this text can become candidate facts, parties, resources, unknowns and next moves. No paid AI is connected yet and no inference is being presented as verified truth.</div>

        <div className="mt-8 border-t border-zinc-900 pt-6">
          <div className="text-xs font-semibold tracking-[0.15em] text-zinc-600">MANUAL FALLBACK</div>
          <label className="mt-4 block text-sm text-zinc-400">Engagement name</label>
          <input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-amber-600" placeholder="Cooper River Bridge Run 2027" />
          <label className="mt-4 block text-sm text-zinc-400">Customer asked for</label>
          <textarea value={request} onChange={(event) => setRequest(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-amber-600" />
          <label className="mt-4 block text-sm text-zinc-400">Next move</label>
          <input value={nextAction} onChange={(event) => setNextAction(event.target.value)} className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-amber-600" placeholder="Confirm event date with Nancy" />
        </div>

        {message && <div className="mt-5 rounded-xl border border-amber-900/50 bg-amber-950/20 p-3 text-sm text-amber-200">{message}</div>}
        <button type="button" onClick={submit} disabled={saving} className="mt-6 w-full rounded-xl bg-amber-500 px-5 py-4 font-bold text-zinc-950 disabled:opacity-50">{saving ? 'Saving…' : 'Create Engagement'}</button>
      </div>
    </div>
  )
}
