import { useEffect, useState, type ChangeEvent } from 'react'
import { CaptureIntelligencePanel } from '../components/CaptureIntelligencePanel'
import { preserveExistingEngagementCapture, type ExistingCaptureMode } from '../lib/captureReality'
import { createEngagement, listEngagements, uploadSourcePhoto } from '../lib/repository'
import { isBackendConfigured } from '../lib/config'
import type { Engagement, EngagementType, FactCategory, FactKind } from '../types/domain'

export function NewEngagementScreen({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [mode, setMode] = useState<'new' | 'existing'>('new')
  const [capture, setCapture] = useState('')
  const [name, setName] = useState('')
  const [request, setRequest] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [engagementType, setEngagementType] = useState<EngagementType>('OTHER')
  const [eventDate, setEventDate] = useState('')
  const [venueName, setVenueName] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  const [engagements, setEngagements] = useState<Engagement[]>([])
  const [engagementsLoading, setEngagementsLoading] = useState(false)
  const [selectedEngagementId, setSelectedEngagementId] = useState('')
  const [existingCapture, setExistingCapture] = useState('')
  const [existingPhotoFile, setExistingPhotoFile] = useState<File | null>(null)
  const [existingMode, setExistingMode] = useState<ExistingCaptureMode>('EVIDENCE')
  const [factLabel, setFactLabel] = useState('')
  const [factCategory, setFactCategory] = useState<FactCategory>('OTHER')
  const [factKind, setFactKind] = useState<FactKind>('OBSERVATION')
  const [dueAt, setDueAt] = useState('')

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const selectedEngagement = engagements.find(row => row.id === selectedEngagementId) ?? null

  useEffect(() => {
    if (!isBackendConfigured || mode !== 'existing') return
    let active = true
    setEngagementsLoading(true)
    void listEngagements()
      .then((rows) => {
        if (!active) return
        setEngagements(rows)
        if (!selectedEngagementId && rows[0]) setSelectedEngagementId(rows[0].id)
      })
      .catch((err) => { if (active) setMessage(err instanceof Error ? err.message : 'Unable to load Engagements.') })
      .finally(() => { if (active) setEngagementsLoading(false) })
    return () => { active = false }
  }, [mode, selectedEngagementId])

  function selectPhoto(event: ChangeEvent<HTMLInputElement>, target: 'new' | 'existing') {
    const file = event.target.files?.[0] ?? null
    if (!file) return
    if (target === 'new') setPhotoFile(file)
    else setExistingPhotoFile(file)
    setMessage(null)
    event.target.value = ''
  }

  async function submitNew() {
    const natural = capture.trim()
    const literalRequest = request.trim()
    const explicitName = name.trim()

    if (!natural && !literalRequest && !photoFile) {
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
        customer_request: literalRequest || undefined,
        event_start_date: eventDate || undefined,
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

  async function submitExisting() {
    if (!selectedEngagementId) {
      setMessage('Choose the Engagement this belongs to.')
      return
    }
    const natural = existingCapture.trim()
    const label = factLabel.trim()
    const nextMoveText = existingMode === 'NEXT_MOVE' ? natural : ''

    if (!natural && !existingPhotoFile && !(existingMode === 'FACT' || existingMode === 'UNKNOWN' ? label : nextMoveText)) {
      setMessage('Add the information or a source photo before saving.')
      return
    }
    if ((existingMode === 'FACT' || existingMode === 'UNKNOWN') && !label) {
      setMessage('Give the fact or unknown a short label so it can be found later.')
      return
    }
    if (existingMode === 'NEXT_MOVE' && !natural) {
      setMessage('Describe the actual next move.')
      return
    }

    setSaving(true)
    setMessage(null)
    try {
      const photoArtifactIds: string[] = []
      if (existingPhotoFile) {
        const artifact = await uploadSourcePhoto(existingPhotoFile)
        photoArtifactIds.push(artifact.id)
      }

      await preserveExistingEngagementCapture({
        engagementId: selectedEngagementId,
        rawText: natural,
        photoArtifactIds,
        mode: existingMode,
        label: label || null,
        valueText: natural || null,
        category: factCategory,
        kind: factKind,
        nextAction: existingMode === 'NEXT_MOVE' ? natural : null,
        dueAt: existingMode === 'NEXT_MOVE' && dueAt ? new Date(dueAt).toISOString() : null,
      })
      onCreated()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to preserve this update.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sm:ml-48">
      <button type="button" onClick={onCancel} className="mb-5 text-sm text-zinc-500 hover:text-zinc-200">← Cancel</button>
      <div className="max-w-2xl">
        <p className="text-sm text-zinc-500">Tell Stage Presence what changed once. Preserve the source first; put structured truth in its canonical home only when you actually know it.</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Capture</h1>

        <div className="mt-6 grid grid-cols-2 rounded-2xl border border-zinc-900 bg-zinc-950/60 p-1">
          <button type="button" onClick={() => { setMode('new'); setMessage(null) }} className={`rounded-xl px-4 py-3 text-sm font-semibold ${mode === 'new' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500'}`}>New opportunity</button>
          <button type="button" onClick={() => { setMode('existing'); setMessage(null) }} className={`rounded-xl px-4 py-3 text-sm font-semibold ${mode === 'existing' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500'}`}>Existing work</button>
        </div>

        {mode === 'new' ? (
          <NewOpportunityCapture
            capture={capture} setCapture={setCapture} name={name} setName={setName} request={request} setRequest={setRequest}
            nextAction={nextAction} setNextAction={setNextAction} engagementType={engagementType} setEngagementType={setEngagementType}
            eventDate={eventDate} setEventDate={setEventDate} venueName={venueName} setVenueName={setVenueName}
            photoFile={photoFile} setPhotoFile={setPhotoFile} selectPhoto={(event) => selectPhoto(event, 'new')}
          />
        ) : (
          <>
            <ExistingWorkCapture
              engagements={engagements} engagementsLoading={engagementsLoading} selectedEngagementId={selectedEngagementId}
              setSelectedEngagementId={setSelectedEngagementId} existingCapture={existingCapture} setExistingCapture={setExistingCapture}
              existingPhotoFile={existingPhotoFile} setExistingPhotoFile={setExistingPhotoFile} selectPhoto={(event) => selectPhoto(event, 'existing')}
              mode={existingMode} setMode={setExistingMode} factLabel={factLabel} setFactLabel={setFactLabel}
              factCategory={factCategory} setFactCategory={setFactCategory} factKind={factKind} setFactKind={setFactKind}
              dueAt={dueAt} setDueAt={setDueAt}
            />
            {selectedEngagement && existingCapture.trim() && (
              <CaptureIntelligencePanel
                engagementId={selectedEngagement.id}
                engagementName={selectedEngagement.name}
                eventDate={selectedEngagement.event_start_date}
                rawText={existingCapture}
                onApplied={onCreated}
              />
            )}
          </>
        )}

        {message && <div className="mt-5 rounded-xl border border-amber-900/50 bg-amber-950/20 p-3 text-sm text-amber-200">{message}</div>}
        <button type="button" onClick={() => void (mode === 'new' ? submitNew() : submitExisting())} disabled={saving} className="mt-6 w-full rounded-xl bg-amber-500 px-5 py-4 font-bold text-zinc-950 disabled:opacity-50">{saving ? 'Preserving…' : mode === 'new' ? 'Capture new opportunity' : 'Manual capture update'}</button>
      </div>
    </div>
  )
}

function NewOpportunityCapture({
  capture, setCapture, name, setName, request, setRequest, nextAction, setNextAction, engagementType, setEngagementType,
  eventDate, setEventDate, venueName, setVenueName, photoFile, setPhotoFile, selectPhoto,
}: {
  capture: string; setCapture: (value: string) => void; name: string; setName: (value: string) => void
  request: string; setRequest: (value: string) => void; nextAction: string; setNextAction: (value: string) => void
  engagementType: EngagementType; setEngagementType: (value: EngagementType) => void; eventDate: string; setEventDate: (value: string) => void
  venueName: string; setVenueName: (value: string) => void; photoFile: File | null; setPhotoFile: (file: File | null) => void
  selectPhoto: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  return <>
    <SourcePhotoCard idPrefix="lead" photoFile={photoFile} setPhotoFile={setPhotoFile} selectPhoto={selectPhoto} />
    <label className="mt-7 block text-sm font-medium text-zinc-300">What happened? <span className="font-normal text-zinc-600">optional</span></label>
    <textarea value={capture} onChange={(event) => setCapture(event.target.value)} placeholder="Example: Nancy from Bridge Run called. April 4. Wants the big trailer again and maybe audio. Setup day before." rows={6} className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-base leading-7 text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-amber-600" />
    <div className="mt-2 rounded-xl border border-zinc-900 bg-zinc-950/60 p-3 text-xs leading-5 text-zinc-600">This note stays source evidence. It is not automatically treated as the customer’s literal request or as verified technical truth. Intelligence remains outside canonical authority.</div>
    <details className="mt-6 rounded-2xl border border-zinc-900 bg-zinc-950/50 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-zinc-300">Add details only if you already know them <span className="font-normal text-zinc-600">(optional)</span></summary>
      <div className="mt-5 grid gap-4">
        <label className="text-sm text-zinc-400">Engagement / project name<input value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} placeholder="Cooper River Bridge Run 2027" /></label>
        <label className="text-sm text-zinc-400">Type<select value={engagementType} onChange={(event) => setEngagementType(event.target.value as EngagementType)} className={fieldClass}><option value="OTHER">Other / Unsure</option><option value="EVENT">Event</option><option value="LONG_TERM_RENTAL">Long-Term Rental</option><option value="INSTALLATION">Installation</option><option value="EQUIPMENT_SALE">Equipment Sale</option><option value="SERVICE">Service</option></select></label>
        <label className="text-sm text-zinc-400">Customer asked for<textarea value={request} onChange={(event) => setRequest(event.target.value)} rows={3} className={fieldClass} placeholder="Only the customer’s request, if you know it clearly" /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-zinc-400">Event / project date<input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} className={fieldClass} /><span className="mt-1 block text-xs leading-5 text-zinc-600">Date-only is valid. Do not invent a time just to complete the record.</span></label>
          <label className="text-sm text-zinc-400">Venue / location<input value={venueName} onChange={(event) => setVenueName(event.target.value)} className={fieldClass} placeholder="Hotel Bennett" /></label>
        </div>
        <label className="text-sm text-zinc-400">Next move<input value={nextAction} onChange={(event) => setNextAction(event.target.value)} className={fieldClass} placeholder="Only add this if the next action is actually known" /></label>
      </div>
    </details>
  </>
}

function ExistingWorkCapture({
  engagements, engagementsLoading, selectedEngagementId, setSelectedEngagementId, existingCapture, setExistingCapture,
  existingPhotoFile, setExistingPhotoFile, selectPhoto, mode, setMode, factLabel, setFactLabel, factCategory, setFactCategory,
  factKind, setFactKind, dueAt, setDueAt,
}: {
  engagements: Engagement[]; engagementsLoading: boolean; selectedEngagementId: string; setSelectedEngagementId: (value: string) => void
  existingCapture: string; setExistingCapture: (value: string) => void; existingPhotoFile: File | null; setExistingPhotoFile: (file: File | null) => void
  selectPhoto: (event: ChangeEvent<HTMLInputElement>) => void; mode: ExistingCaptureMode; setMode: (value: ExistingCaptureMode) => void
  factLabel: string; setFactLabel: (value: string) => void; factCategory: FactCategory; setFactCategory: (value: FactCategory) => void
  factKind: FactKind; setFactKind: (value: FactKind) => void; dueAt: string; setDueAt: (value: string) => void
}) {
  return <>
    <label className="mt-7 block text-sm font-medium text-zinc-300">Which Engagement?</label>
    <select value={selectedEngagementId} onChange={(event) => setSelectedEngagementId(event.target.value)} disabled={engagementsLoading} className={fieldClass}>
      <option value="">{engagementsLoading ? 'Loading Engagements…' : 'Choose Engagement…'}</option>
      {engagements.map((engagement) => <option key={engagement.id} value={engagement.id}>{engagement.engagement_number} — {engagement.name}</option>)}
    </select>

    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <CaptureModeButton active={mode === 'EVIDENCE'} onClick={() => setMode('EVIDENCE')} label="Evidence" />
      <CaptureModeButton active={mode === 'FACT'} onClick={() => setMode('FACT')} label="Known fact" />
      <CaptureModeButton active={mode === 'UNKNOWN'} onClick={() => setMode('UNKNOWN')} label="Need answer" />
      <CaptureModeButton active={mode === 'NEXT_MOVE'} onClick={() => setMode('NEXT_MOVE')} label="Next move" />
    </div>

    <SourcePhotoCard idPrefix="existing" photoFile={existingPhotoFile} setPhotoFile={setExistingPhotoFile} selectPhoto={selectPhoto} compact />
    <label className="mt-5 block text-sm font-medium text-zinc-300">{existingPrompt(mode)}</label>
    <textarea value={existingCapture} onChange={(event) => setExistingCapture(event.target.value)} placeholder={existingPlaceholder(mode)} rows={5} className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-base leading-7 text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-amber-600" />

    {(mode === 'FACT' || mode === 'UNKNOWN') && (
      <div className="mt-4 grid gap-3 rounded-2xl border border-zinc-900 bg-zinc-950/50 p-4">
        <label className="text-sm text-zinc-400">Short label<input value={factLabel} onChange={(event) => setFactLabel(event.target.value)} placeholder={mode === 'UNKNOWN' ? 'Need confirmed load-in time' : 'Venue power available'} className={fieldClass} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-zinc-400">Domain<select value={factCategory} onChange={(event) => setFactCategory(event.target.value as FactCategory)} className={fieldClass}><option>EVENT</option><option>VISUAL</option><option>AUDIO</option><option>LIGHTING</option><option>STAGING</option><option>POWER</option><option>NETWORK</option><option>VENUE</option><option>LOGISTICS</option><option>LABOR</option><option>CONTENT</option><option>CUSTOMER</option><option>OTHER</option></select></label>
          <label className="text-sm text-zinc-400">Kind<select value={factKind} onChange={(event) => setFactKind(event.target.value as FactKind)} className={fieldClass}><option>REQUIREMENT</option><option>CONSTRAINT</option><option>CUSTOMER_REQUEST</option><option>OBSERVATION</option><option>ASSUMPTION</option><option>PREFERENCE</option><option>OTHER</option></select></label>
        </div>
        <p className="text-xs leading-5 text-zinc-600">{mode === 'UNKNOWN' ? 'This is deliberately saved as UNKNOWN. The OS may surface it later when resolving it has decision leverage.' : 'This becomes structured Engagement truth and keeps the Capture source as evidence.'}</p>
      </div>
    )}

    {mode === 'NEXT_MOVE' && <label className="mt-4 block text-sm text-zinc-400">Due / follow-up <span className="text-zinc-600">optional</span><input value={dueAt} onChange={(event) => setDueAt(event.target.value)} type="datetime-local" className={fieldClass} /></label>}
    <div className="mt-4 rounded-xl border border-zinc-900 bg-zinc-950/60 p-3 text-xs leading-5 text-zinc-600">{existingExplanation(mode)}</div>
  </>
}

function SourcePhotoCard({ idPrefix, photoFile, setPhotoFile, selectPhoto, compact = false }: { idPrefix: string; photoFile: File | null; setPhotoFile: (file: File | null) => void; selectPhoto: (event: ChangeEvent<HTMLInputElement>) => void; compact?: boolean }) {
  return <section className={`${compact ? 'mt-5' : 'mt-7'} rounded-2xl border border-amber-900/40 bg-amber-950/10 p-4`}>
    <div className="text-sm font-semibold text-zinc-200">Source photo <span className="font-normal text-zinc-600">optional</span></div>
    <p className="mt-1 text-xs leading-5 text-zinc-500">The original image is stored privately as evidence. A photo can be preserved without pretending we already understand everything inside it.</p>
    <div className="mt-4 grid grid-cols-2 gap-3">
      <label htmlFor={`${idPrefix}-photo-camera`} className="cursor-pointer rounded-xl bg-amber-500 px-4 py-3 text-center text-sm font-bold text-zinc-950">Take photo</label>
      <label htmlFor={`${idPrefix}-photo-library`} className="cursor-pointer rounded-xl border border-zinc-800 px-4 py-3 text-center text-sm font-semibold text-zinc-300">Choose image</label>
      <input id={`${idPrefix}-photo-camera`} type="file" accept="image/*,.heic,.heif" capture="environment" onChange={selectPhoto} className="hidden" />
      <input id={`${idPrefix}-photo-library`} type="file" accept="image/*,.heic,.heif" onChange={selectPhoto} className="hidden" />
    </div>
    {photoFile && <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-zinc-900 bg-zinc-950/70 px-3 py-2.5"><div className="min-w-0"><div className="truncate text-sm text-zinc-300">{photoFile.name || 'Camera photo'}</div><div className="mt-0.5 text-xs text-zinc-600">{(photoFile.size / 1024 / 1024).toFixed(1)} MB • ready to preserve</div></div><button type="button" onClick={() => setPhotoFile(null)} className="text-xs font-semibold text-zinc-500 hover:text-zinc-200">Remove</button></div>}
  </section>
}

function CaptureModeButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button type="button" onClick={onClick} className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${active ? 'border-amber-800 bg-amber-950/30 text-amber-300' : 'border-zinc-900 text-zinc-600 hover:text-zinc-300'}`}>{label}</button>
}

function existingPrompt(mode: ExistingCaptureMode) {
  if (mode === 'FACT') return 'What do we now know?'
  if (mode === 'UNKNOWN') return 'What do we need to know?'
  if (mode === 'NEXT_MOVE') return 'What actually needs to happen next?'
  return 'What happened / what evidence arrived?'
}

function existingPlaceholder(mode: ExistingCaptureMode) {
  if (mode === 'FACT') return 'Example: Venue has a 200A power service at the loading dock.'
  if (mode === 'UNKNOWN') return 'Example: Need confirmed access time from venue before dispatch.'
  if (mode === 'NEXT_MOVE') return 'Example: Nancy to confirm deposit receipt with client.'
  return 'Paste the email summary, conversation note, field update, observation, or other source context.'
}

function existingExplanation(mode: ExistingCaptureMode) {
  if (mode === 'FACT') return 'The source is preserved first, then the structured fact is written to Engagement Facts with KNOWN certainty.'
  if (mode === 'UNKNOWN') return 'The source is preserved first, then the unresolved item is written to Engagement Facts as UNKNOWN rather than guessed.'
  if (mode === 'NEXT_MOVE') return 'The source is preserved first, then the action is written to canonical Work. It does not revive the legacy next_action fields.'
  return 'Evidence mode only preserves and links the source. It creates no requirement, assignment, payment, reservation, or other business claim.'
}

const fieldClass = 'mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-amber-600 disabled:opacity-50'
