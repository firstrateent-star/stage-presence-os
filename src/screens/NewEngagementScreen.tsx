import { useState, type ChangeEvent } from 'react'
import { createEngagement, uploadSourcePhoto } from '../lib/repository'
import { isBackendConfigured } from '../lib/config'
import type { EngagementType } from '../types/domain'

export function NewEngagementScreen({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [capture, setCapture] = useState('')
  const [name, setName] = useState('')
  const [request, setRequest] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [engagementType, setEngagementType] = useState<EngagementType>('OTHER')
  const [eventStart, setEventStart] = useState('')
  const [venueName, setVenueName] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    if (!file) return
    setPhotoFile(file)
    setMessage(null)
    event.target.value = ''
  }

  async function submit() {
    const natural = capture.trim()
    const literalRequest = request.trim()
    const explicitName = name.trim()

    if (!natural && !literalRequest && !explicitName && !photoFile) {
      setMessage('Add a short note or take a photo. Everything else is optional.')
      return
    }
    if (!isBackendConfigured) {
      setMessage('Demo mode: saving is intentionally disabled until the Stage Presence Supabase project is connected.')
      return
    }

    const fallbackSource = literalRequest || natural.split(/\n|[.!?]/)[0]?.trim() || ''
    const photoFallback = `Photo lead — ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date())}`
    const engagementName = explicitName || fallbackSource.slice(0, 80) || photoFallback

    setSaving(true)
    setMessage(null)
    try {
      const sourceArtifactIds: string[] = []
      if (photoFile) {
        const artifact = await uploadSourcePhoto(photoFile)
        sourceArtifactIds.push(artifact.id)
      }

      await createEngagement({
        name: engagementName,
        engagement_type: engagementType,
        customer_request: literalRequest || natural || undefined,
        event_start: eventStart ? new Date(eventStart).toISOString() : undefined,
        venue_name: venueName.trim() || undefined,
        next_action: nextAction.trim() || undefined,
        raw_capture: natural,
        source_artifact_ids: sourceArtifactIds,
      })
      onCreated()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to preserve this capture.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sm:ml-48">
      <button type="button" onClick={onCancel} className="mb-5 text-sm text-zinc-500 hover:text-zinc-200">← Cancel</button>
      <div className="max-w-2xl">
        <p className="text-sm text-zinc-500">Give Stage Presence the source once. Structure can follow.</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Quick Capture</h1>

        <section className="mt-7 rounded-2xl border border-amber-900/40 bg-amber-950/10 p-4">
          <div className="text-sm font-semibold text-zinc-200">Lead sheet / photo</div>
          <p className="mt-1 text-xs leading-5 text-zinc-500">The original image is stored privately as source evidence. Photo-only capture is allowed.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label htmlFor="lead-photo-camera" className="cursor-pointer rounded-xl bg-amber-500 px-4 py-3 text-center text-sm font-bold text-zinc-950">Take photo</label>
            <label htmlFor="lead-photo-library" className="cursor-pointer rounded-xl border border-zinc-800 px-4 py-3 text-center text-sm font-semibold text-zinc-300">Choose image</label>
            <input id="lead-photo-camera" type="file" accept="image/*,.heic,.heif" capture="environment" onChange={selectPhoto} className="hidden" />
            <input id="lead-photo-library" type="file" accept="image/*,.heic,.heif" onChange={selectPhoto} className="hidden" />
          </div>
          {photoFile && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-zinc-900 bg-zinc-950/70 px-3 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-sm text-zinc-300">{photoFile.name || 'Camera photo'}</div>
                <div className="mt-0.5 text-xs text-zinc-600">{(photoFile.size / 1024 / 1024).toFixed(1)} MB • ready to preserve</div>
              </div>
              <button type="button" onClick={() => setPhotoFile(null)} className="text-xs font-semibold text-zinc-500 hover:text-zinc-200">Remove</button>
            </div>
          )}
        </section>

        <label className="mt-7 block text-sm font-medium text-zinc-300">What happened? <span className="font-normal text-zinc-600">optional</span></label>
        <textarea value={capture} onChange={(event) => setCapture(event.target.value)} placeholder="Example: Nancy from Bridge Run called. April 4. Wants the big trailer again and maybe audio. Setup day before." rows={6} className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-base leading-7 text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-amber-600" />
        <div className="mt-2 rounded-xl border border-zinc-900 bg-zinc-950/60 p-3 text-xs leading-5 text-zinc-600">Text and photos are preserved as evidence. No AI is reading the image yet, so photo-only captures remain intentionally unstructured rather than guessed.</div>

        <details className="mt-6 rounded-2xl border border-zinc-900 bg-zinc-950/50 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-zinc-300">Add details if you already know them <span className="font-normal text-zinc-600">(optional)</span></summary>
          <div className="mt-5 grid gap-4">
            <label className="text-sm text-zinc-400">Engagement / project name
              <input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-amber-600" placeholder="Cooper River Bridge Run 2027" />
            </label>

            <label className="text-sm text-zinc-400">Type
              <select value={engagementType} onChange={(event) => setEngagementType(event.target.value as EngagementType)} className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-amber-600">
                <option value="OTHER">Other / Unsure</option>
                <option value="EVENT">Event</option>
                <option value="LONG_TERM_RENTAL">Long-Term Rental</option>
                <option value="INSTALLATION">Installation</option>
                <option value="EQUIPMENT_SALE">Equipment Sale</option>
                <option value="SERVICE">Service</option>
              </select>
            </label>

            <label className="text-sm text-zinc-400">Customer asked for
              <textarea value={request} onChange={(event) => setRequest(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-amber-600" placeholder="Literal request, if clearer than the note above" />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-zinc-400">Event / project start
                <input type="datetime-local" value={eventStart} onChange={(event) => setEventStart(event.target.value)} className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-amber-600" />
              </label>
              <label className="text-sm text-zinc-400">Venue / location
                <input value={venueName} onChange={(event) => setVenueName(event.target.value)} className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-amber-600" placeholder="Hotel Bennett" />
              </label>
            </div>

            <label className="text-sm text-zinc-400">Next move
              <input value={nextAction} onChange={(event) => setNextAction(event.target.value)} className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-amber-600" placeholder="Confirm event date with Nancy" />
            </label>
          </div>
        </details>

        {message && <div className="mt-5 rounded-xl border border-amber-900/50 bg-amber-950/20 p-3 text-sm text-amber-200">{message}</div>}
        <button type="button" onClick={() => void submit()} disabled={saving} className="mt-6 w-full rounded-xl bg-amber-500 px-5 py-4 font-bold text-zinc-950 disabled:opacity-50">{saving ? 'Preserving…' : 'Capture'}</button>
      </div>
    </div>
  )
}
