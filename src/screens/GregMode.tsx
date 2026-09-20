import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import type { EconomyOverview, EngagementSummary, RecoveryQueueItem, RelationshipSummary } from '../lib/readContracts'
import { createEngagement, uploadSourcePhoto, type UploadedSourceArtifact } from '../lib/repository'
import {
  listPricingRules,
  updatePricingRuleFields,
  approvePricingRule,
  retirePricingRule,
  createManualPricingRule,
  type PricingRule,
} from '../lib/pricingRuntime'
import { supabase } from '../lib/supabase'

type GregTab = 'home' | 'leads' | 'pricing' | 'jobs'

function money(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value))
}

function dateLabel(value: string | null | undefined) {
  if (!value) return 'Date not set'
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function textFromJson(value: Record<string, unknown> | null, key: string) {
  const item = value?.[key]
  return typeof item === 'string' && item.trim() ? item : null
}

function numberFromJson(value: Record<string, unknown> | null, key: string) {
  const item = value?.[key]
  return typeof item === 'number' ? item : typeof item === 'string' && item.trim() ? Number(item) : null
}

function customerName(item: EngagementSummary) {
  return textFromJson(item.primary_customer, 'organization_name')
    ?? textFromJson(item.primary_customer, 'name')
    ?? 'Client not set'
}

function venueName(item: EngagementSummary) {
  return textFromJson(item.venue, 'name')
    ?? textFromJson(item.venue, 'venue_name')
    ?? textFromJson(item.venue, 'address')
    ?? 'Location not set'
}

function nextMove(item: EngagementSummary) {
  return textFromJson(item.next_work, 'title') ?? 'No next action set'
}

function workValue(item: EngagementSummary) {
  return numberFromJson(item.economy, 'committed_revenue_observed')
    ?? numberFromJson(item.economy, 'proposal_value_observed')
}

function summaryText(item: EngagementSummary) {
  return [
    'STAGE PRESENCE',
    item.name,
    item.engagement_number,
    '',
    `Client: ${customerName(item)}`,
    `Date: ${dateLabel(item.event_start_date)}`,
    `Location: ${venueName(item)}`,
    `Commercial: ${item.commercial_state.replaceAll('_', ' ')}`,
    `Commitment: ${item.commitment_state.replaceAll('_', ' ')}`,
    `Operations: ${item.operational_state.replaceAll('_', ' ')}`,
    workValue(item) != null ? `Value: ${money(workValue(item))}` : null,
    '',
    item.customer_request ? `Request: ${item.customer_request}` : null,
    `Next action: ${nextMove(item)}`,
  ].filter(Boolean).join('\n')
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function printSummary(item: EngagementSummary) {
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=900,height=900')
  if (!popup) return
  const request = item.customer_request ? `<section><h2>Client request</h2><p>${escapeHtml(item.customer_request)}</p></section>` : ''
  popup.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(item.name)} — Stage Presence</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#161616;margin:0;padding:42px;background:white}
  main{max-width:760px;margin:0 auto}
  .eyebrow{font-size:11px;letter-spacing:.2em;font-weight:700}
  h1{font-size:32px;margin:12px 0 4px}
  .number{color:#666;font-size:13px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:30px}
  .card{border:1px solid #ddd;border-radius:12px;padding:16px}
  .label{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#777}
  .value{margin-top:6px;font-size:15px}
  section{margin-top:28px;border-top:1px solid #ddd;padding-top:20px}
  h2{font-size:14px;text-transform:uppercase;letter-spacing:.1em}
  p{font-size:14px;line-height:1.6}
  @media print{body{padding:0}.no-print{display:none}}
</style>
</head>
<body>
<main>
<div class="eyebrow">STAGE PRESENCE</div>
<h1>${escapeHtml(item.name)}</h1>
<div class="number">${escapeHtml(item.engagement_number)}</div>
<div class="grid">
  <div class="card"><div class="label">Client</div><div class="value">${escapeHtml(customerName(item))}</div></div>
  <div class="card"><div class="label">Date</div><div class="value">${escapeHtml(dateLabel(item.event_start_date))}</div></div>
  <div class="card"><div class="label">Location</div><div class="value">${escapeHtml(venueName(item))}</div></div>
  <div class="card"><div class="label">Next action</div><div class="value">${escapeHtml(nextMove(item))}</div></div>
</div>
${request}
<section><h2>Status</h2><p>Commercial: ${escapeHtml(item.commercial_state.replaceAll('_', ' '))}<br/>Commitment: ${escapeHtml(item.commitment_state.replaceAll('_', ' '))}<br/>Operations: ${escapeHtml(item.operational_state.replaceAll('_', ' '))}</p></section>
</main>
<script>window.onload=()=>window.print()</script>
</body>
</html>`)
  popup.document.close()
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? 'bg-amber-500 text-zinc-950' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200'}`}
    >
      {children}
    </button>
  )
}

function StatusPill({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'attention' | 'good' }) {
  const style = tone === 'attention'
    ? 'border-amber-900/60 bg-amber-950/20 text-amber-400'
    : tone === 'good'
      ? 'border-emerald-900/50 bg-emerald-950/20 text-emerald-400'
      : 'border-zinc-800 bg-zinc-950 text-zinc-500'
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] ${style}`}>{children}</span>
}

export function GregMode({
  engagements,
  relationships: _relationships,
  economy,
  recovery,
  onOpenWork,
  onCapture,
  onAllWork: _onAllWork,
  onSystem,
}: {
  engagements: EngagementSummary[]
  relationships: RelationshipSummary[]
  economy: EconomyOverview | null
  recovery: RecoveryQueueItem[]
  onOpenWork: (id: string) => void
  onCapture: () => void
  onAllWork: () => void
  onSystem: () => void
}) {
  const [tab, setTab] = useState<GregTab>('home')
  const [captureText, setCaptureText] = useState('')
  const [capturedPhoto, setCapturedPhoto] = useState<UploadedSourceArtifact | null>(null)
  const [captureBusy, setCaptureBusy] = useState(false)
  const [captureMessage, setCaptureMessage] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [pricing, setPricing] = useState<PricingRule[]>([])
  const [pricingLoading, setPricingLoading] = useState(false)
  const [pricingMessage, setPricingMessage] = useState<string | null>(null)
  const [newPriceName, setNewPriceName] = useState('')
  const [newPriceAmount, setNewPriceAmount] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const leads = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    return [...engagements]
      .filter((item) => item.commercial_state !== 'LOST' && item.operational_state !== 'CLOSED')
      .filter((item) => !normalized || [
        item.name,
        item.engagement_number,
        customerName(item),
        venueName(item),
        item.customer_request ?? '',
      ].join(' ').toLowerCase().includes(normalized))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  }, [engagements, search])

  const jobs = useMemo(() => engagements
    .filter((item) =>
      ['VERBAL_YES', 'SIGNED', 'DEPOSIT_PENDING', 'CONFIRMED'].includes(item.commitment_state)
      || ['PLANNING', 'READY', 'ACTIVE', 'COMPLETE'].includes(item.operational_state),
    )
    .sort((a, b) => String(a.event_start_date ?? '9999').localeCompare(String(b.event_start_date ?? '9999'))),
  [engagements])

  const attention = useMemo(() => engagements
    .filter((item) => item.attention_state !== 'NORMAL' || item.open_work_count > 0)
    .sort((a, b) => {
      const rank = (state: string) => state === 'BLOCKED' ? 4 : state === 'NEEDS_ATTENTION' ? 3 : state === 'WAITING' ? 2 : 1
      return rank(b.attention_state) - rank(a.attention_state)
    })
    .slice(0, 6),
  [engagements])

  const recent = useMemo(() => [...engagements].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 6), [engagements])

  useEffect(() => {
    if (tab !== 'pricing') return
    void loadPricing()
  }, [tab])

  async function loadPricing() {
    if (!supabase) return
    setPricingLoading(true)
    setPricingMessage(null)
    try {
      setPricing(await listPricingRules())
    } catch (error) {
      setPricingMessage(error instanceof Error ? error.message : String(error))
    }
    setPricingLoading(false)
  }

  function deriveCaptureName() {
    const firstLine = captureText.split('\n').map((line) => line.trim()).find(Boolean)
    if (firstLine) return firstLine.slice(0, 90)
    if (capturedPhoto) return `Photo lead — ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date())}`
    return 'New Stage Presence lead'
  }

  async function saveCapture() {
    if (!captureText.trim() && !capturedPhoto) {
      setCaptureMessage('Tell me something or attach a photo first.')
      return
    }
    setCaptureBusy(true)
    setCaptureMessage(null)
    try {
      const created = await createEngagement({
        name: deriveCaptureName(),
        engagement_type: 'EVENT',
        customer_request: captureText.trim() || 'Lead captured from photo. Details still need review.',
        raw_capture: captureText.trim() || undefined,
        source_artifact_ids: capturedPhoto ? [capturedPhoto.id] : [],
        next_action: 'Review captured lead and complete missing details',
      })
      setCaptureText('')
      setCapturedPhoto(null)
      setCaptureMessage('Saved as a real Stage Presence lead. Open it to review the details.')
      onOpenWork(created.id)
    } catch (caught) {
      setCaptureMessage(caught instanceof Error ? caught.message : 'Unable to save this capture.')
    } finally {
      setCaptureBusy(false)
    }
  }

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setCaptureBusy(true)
    setCaptureMessage('Preserving the original photo…')
    try {
      const artifact = await uploadSourcePhoto(file)
      setCapturedPhoto(artifact)
      setCaptureMessage('Photo attached. Add any context you know, then save the lead.')
    } catch (caught) {
      setCaptureMessage(caught instanceof Error ? caught.message : 'Unable to attach that photo.')
    } finally {
      setCaptureBusy(false)
    }
  }

  function startSpeech() {
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionCtor) {
      setCaptureMessage('Voice dictation is not supported in this browser. Use your phone keyboard microphone or type instead.')
      return
    }
    const recognition = new SpeechRecognitionCtor()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    setCaptureMessage('Listening…')
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? ''
      setCaptureText((current) => current ? `${current}\n${transcript}` : transcript)
      setCaptureMessage('Voice captured. Review it, then save the lead.')
    }
    recognition.onerror = () => setCaptureMessage('Voice capture stopped. You can try again or type instead.')
    recognition.start()
  }

  async function shareWork(item: EngagementSummary) {
    const text = summaryText(item)
    try {
      if (navigator.share) {
        await navigator.share({ title: item.name, text })
      } else {
        await navigator.clipboard.writeText(text)
        setCaptureMessage('Summary copied to your clipboard.')
      }
    } catch {
      // User cancelled the native share sheet.
    }
  }

  function patchPricingLocal(id: string, patch: Partial<PricingRule>) {
    setPricing((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item))
  }

  async function savePricing(rule: PricingRule) {
    if (!supabase) return
    setPricingMessage(null)
    try {
      await updatePricingRuleFields(rule.id, {
        name: rule.name,
        amount: rule.rate_type === 'PERCENT' ? null : Number(rule.amount ?? 0),
        percentage: rule.rate_type === 'PERCENT' ? Number(rule.percentage ?? 0) : null,
        notes: rule.notes,
      })
      setPricingMessage(`${rule.name} updated.`)
      await loadPricing()
    } catch (error) {
      setPricingMessage(error instanceof Error ? error.message : String(error))
    }
  }

  async function approvePricing(rule: PricingRule) {
    if (!supabase) return
    try {
      await approvePricingRule(rule.id)
      setPricingMessage(`${rule.name} approved for quoting.`)
      await loadPricing()
    } catch (error) {
      setPricingMessage(error instanceof Error ? error.message : String(error))
    }
  }

  async function retirePricing(rule: PricingRule) {
    if (!supabase) return
    try {
      await retirePricingRule(rule.id)
      setPricingMessage(`${rule.name} retired.`)
      await loadPricing()
    } catch (error) {
      setPricingMessage(error instanceof Error ? error.message : String(error))
    }
  }

  async function addPricing() {
    if (!supabase) return
    const amount = Number(newPriceAmount)
    if (!newPriceName.trim() || !Number.isFinite(amount) || amount < 0) {
      setPricingMessage('Enter a name and a valid price.')
      return
    }
    try {
      await createManualPricingRule({ name: newPriceName, amount })
      setNewPriceName('')
      setNewPriceAmount('')
      setPricingMessage('New pricing rule saved as a draft.')
      await loadPricing()
    } catch (error) {
      setPricingMessage(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-2xl border border-zinc-900 bg-zinc-950/50 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-500">Greg command center</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-100">Run Stage Presence from one place.</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">Capture what happened, see the business, change the facts, and move the next thing forward.</p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-2xl border border-zinc-900 bg-[#090909] p-1.5">
            <TabButton active={tab === 'home'} onClick={() => setTab('home')}>Home</TabButton>
            <TabButton active={tab === 'leads'} onClick={() => setTab('leads')}>Leads</TabButton>
            <TabButton active={tab === 'pricing'} onClick={() => setTab('pricing')}>Pricing</TabButton>
            <TabButton active={tab === 'jobs'} onClick={() => setTab('jobs')}>Jobs</TabButton>
          </div>
        </div>
      </header>

      {tab === 'home' && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-amber-900/45 bg-gradient-to-b from-amber-950/10 to-zinc-950/40 p-5 sm:p-6">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-500">Tell Stage Presence what is happening</div>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-100">What are we working on?</h2>
            <textarea
              value={captureText}
              onChange={(event) => setCaptureText(event.target.value)}
              placeholder="Example: New client at Hotel Bennett needs a 12x7 trailer on October 17. Nancy needs a quote. They may also need audio."
              className="mt-4 min-h-32 w-full resize-y rounded-2xl border border-zinc-800 bg-[#090909] px-4 py-4 text-base leading-7 text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-amber-700"
            />
            {capturedPhoto && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-400">
                <span>Photo attached: {capturedPhoto.original_filename}</span>
                <button type="button" onClick={() => setCapturedPhoto(null)} className="text-xs text-zinc-600 hover:text-zinc-300">Remove</button>
              </div>
            )}
            <input ref={fileInputRef} onChange={handlePhoto} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="hidden" />
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={startSpeech} disabled={captureBusy} className="rounded-xl border border-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-300 hover:border-zinc-700">🎙 Speak</button>
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={captureBusy} className="rounded-xl border border-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-300 hover:border-zinc-700">📷 Photo</button>
              <button type="button" onClick={() => void saveCapture()} disabled={captureBusy} className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-zinc-950 hover:bg-amber-400 disabled:opacity-50">
                {captureBusy ? 'Saving…' : 'Save as lead'}
              </button>
              <button type="button" onClick={onCapture} className="rounded-xl border border-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-600 hover:text-zinc-300">Detailed capture</button>
            </div>
            {captureMessage && <p className="mt-3 text-sm leading-6 text-zinc-500">{captureMessage}</p>}
            <p className="mt-4 text-xs leading-5 text-zinc-700">This version preserves the real source and creates the lead. AI interpretation is intentionally not faked; it will attach at this capture boundary next.</p>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-700">Needs attention</div>
                  <h2 className="mt-1 text-lg font-semibold text-zinc-100">{attention.length ? `${attention.length} things to look at` : 'Nothing urgent right now'}</h2>
                </div>
                <button type="button" onClick={() => setTab('leads')} className="text-xs font-semibold text-zinc-600 hover:text-zinc-300">All leads →</button>
              </div>
              <div className="mt-4 space-y-2">
                {attention.map((item) => (
                  <button key={item.id} type="button" onClick={() => onOpenWork(item.id)} className="w-full rounded-xl border border-zinc-900 bg-[#0b0b0b] p-4 text-left hover:border-zinc-700">
                    <div className="flex items-start justify-between gap-3">
                      <div><div className="font-semibold text-zinc-200">{item.name}</div><div className="mt-1 text-xs text-zinc-600">{customerName(item)} · {dateLabel(item.event_start_date)}</div></div>
                      <StatusPill tone={item.attention_state === 'NORMAL' ? 'default' : 'attention'}>{item.attention_state}</StatusPill>
                    </div>
                    <div className="mt-3 text-sm text-zinc-500">{nextMove(item)}</div>
                  </button>
                ))}
                {!attention.length && <div className="rounded-xl border border-dashed border-zinc-900 px-4 py-8 text-center text-sm text-zinc-700">As leads and jobs move, anything blocked, waiting, or unfinished will surface here.</div>}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-700">Recent work</div>
              <div className="mt-3 divide-y divide-zinc-900">
                {recent.map((item) => (
                  <button key={item.id} type="button" onClick={() => onOpenWork(item.id)} className="flex w-full items-center justify-between gap-4 py-3 text-left first:pt-1">
                    <div className="min-w-0"><div className="truncate text-sm font-medium text-zinc-300">{item.name}</div><div className="mt-1 text-xs text-zinc-700">{item.engagement_number} · {customerName(item)}</div></div>
                    <span className="shrink-0 text-xs text-zinc-700">{workValue(item) != null ? money(workValue(item)) : 'Open'}</span>
                  </button>
                ))}
                {!recent.length && <div className="py-8 text-center text-sm text-zinc-700">No work has been captured yet.</div>}
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <button type="button" onClick={() => setTab('leads')} className="rounded-2xl border border-zinc-900 bg-zinc-950/35 p-4 text-left hover:border-zinc-700">
              <div className="text-[10px] uppercase tracking-[.14em] text-zinc-700">Pipeline</div>
              <div className="mt-2 text-xl font-semibold text-zinc-100">{leads.length}</div>
              <div className="mt-1 text-xs text-zinc-600">active leads / work</div>
            </button>
            <button type="button" onClick={() => setTab('jobs')} className="rounded-2xl border border-zinc-900 bg-zinc-950/35 p-4 text-left hover:border-zinc-700">
              <div className="text-[10px] uppercase tracking-[.14em] text-zinc-700">Jobs</div>
              <div className="mt-2 text-xl font-semibold text-zinc-100">{jobs.length}</div>
              <div className="mt-1 text-xs text-zinc-600">committed / operational</div>
            </button>
            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/35 p-4">
              <div className="text-[10px] uppercase tracking-[.14em] text-zinc-700">Committed revenue</div>
              <div className="mt-2 text-xl font-semibold text-zinc-100">{money(economy?.committed_revenue_observed)}</div>
              <div className="mt-1 text-xs text-zinc-600">only represented evidence</div>
            </div>
            <button type="button" onClick={onSystem} className="rounded-2xl border border-zinc-900 bg-zinc-950/35 p-4 text-left hover:border-zinc-700">
              <div className="text-[10px] uppercase tracking-[.14em] text-zinc-700">System</div>
              <div className="mt-2 text-xl font-semibold text-zinc-100">{recovery.filter((item) => item.status !== 'RESOLVED').length}</div>
              <div className="mt-1 text-xs text-zinc-600">reality items / advanced view →</div>
            </button>
          </section>
        </div>
      )}

      {tab === 'leads' && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-2xl font-semibold text-zinc-100">Leads & opportunities</h2><p className="mt-1 text-sm text-zinc-600">One list from first inquiry through booking.</p></div>
            <button type="button" onClick={() => { setTab('home'); setTimeout(() => document.querySelector('textarea')?.focus(), 0) }} className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-zinc-950">+ New lead</button>
          </div>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search client, event, venue…" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-amber-700" />
          <div className="space-y-2">
            {leads.map((item) => (
              <div key={item.id} className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <button type="button" onClick={() => onOpenWork(item.id)} className="min-w-0 flex-1 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-zinc-100">{item.name}</span>
                      <StatusPill>{item.commercial_state}</StatusPill>
                      {item.attention_state !== 'NORMAL' && <StatusPill tone="attention">{item.attention_state}</StatusPill>}
                    </div>
                    <div className="mt-2 text-sm text-zinc-500">{customerName(item)} · {dateLabel(item.event_start_date)} · {venueName(item)}</div>
                    <div className="mt-2 text-xs text-zinc-700">Next: {nextMove(item)}</div>
                  </button>
                  <div className="flex flex-wrap items-center gap-2">
                    {workValue(item) != null && <span className="mr-2 text-sm font-semibold tabular-nums text-zinc-400">{money(workValue(item))}</span>}
                    <button type="button" onClick={() => void shareWork(item)} className="rounded-lg border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-200">Share</button>
                    <button type="button" onClick={() => printSummary(item)} className="rounded-lg border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-200">Print / PDF</button>
                    <button type="button" onClick={() => onOpenWork(item.id)} className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-bold text-zinc-950">Open</button>
                  </div>
                </div>
              </div>
            ))}
            {!leads.length && <div className="rounded-2xl border border-dashed border-zinc-900 p-10 text-center text-sm text-zinc-700">No matching leads.</div>}
          </div>
        </section>
      )}

      {tab === 'pricing' && (
        <section className="space-y-5">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-100">Pricing</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-600">These are the prices the operating system can reference. Drafts do not become approved quoting authority until you approve them.</p>
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
              <input value={newPriceName} onChange={(event) => setNewPriceName(event.target.value)} placeholder="New item or service" className="rounded-xl border border-zinc-800 bg-[#090909] px-4 py-3 text-sm outline-none focus:border-amber-700" />
              <input value={newPriceAmount} onChange={(event) => setNewPriceAmount(event.target.value)} inputMode="decimal" placeholder="Price" className="rounded-xl border border-zinc-800 bg-[#090909] px-4 py-3 text-sm outline-none focus:border-amber-700" />
              <button type="button" onClick={() => void addPricing()} className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-zinc-950">Add draft</button>
            </div>
            {pricingMessage && <p className="mt-3 text-sm text-zinc-500">{pricingMessage}</p>}
          </div>

          {pricingLoading ? <div className="py-16 text-center text-sm text-zinc-700">Loading pricing…</div> : (
            <div className="space-y-2">
              {pricing.map((rule) => (
                <div key={rule.id} className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-4">
                  <div className="grid gap-3 lg:grid-cols-[1fr_170px_150px_auto] lg:items-end">
                    <label className="block">
                      <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-zinc-700">Item / service</span>
                      <input value={rule.name} onChange={(event) => patchPricingLocal(rule.id, { name: event.target.value })} className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#090909] px-3 py-2.5 text-sm outline-none focus:border-amber-700" />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-zinc-700">{rule.rate_type === 'PERCENT' ? 'Percent' : 'Price'}</span>
                      <input
                        value={String(rule.rate_type === 'PERCENT' ? rule.percentage ?? '' : rule.amount ?? '')}
                        onChange={(event) => patchPricingLocal(rule.id, rule.rate_type === 'PERCENT' ? { percentage: Number(event.target.value) } : { amount: Number(event.target.value) })}
                        inputMode="decimal"
                        className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#090909] px-3 py-2.5 text-sm outline-none focus:border-amber-700"
                      />
                    </label>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[.12em] text-zinc-700">Authority</div>
                      <div className="mt-2"><StatusPill tone={rule.status === 'APPROVED' ? 'good' : rule.status === 'DRAFT' ? 'attention' : 'default'}>{rule.status}</StatusPill></div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void savePricing(rule)} className="rounded-lg border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-100">Save</button>
                      {rule.status !== 'APPROVED' && <button type="button" onClick={() => void approvePricing(rule)} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-zinc-950">Approve</button>}
                      {rule.status !== 'RETIRED' && <button type="button" onClick={() => void retirePricing(rule)} className="rounded-lg border border-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-700 hover:text-zinc-400">Retire</button>}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-700">
                    <span>{rule.scope_type.replaceAll('_', ' ')}</span>
                    <span>{rule.rate_type.replaceAll('_', ' ')}</span>
                    {rule.billing_basis && <span>{rule.billing_basis.replaceAll('_', ' ')}</span>}
                    {rule.role_code && <span>{rule.role_code.replaceAll('_', ' ')}</span>}
                    <span className="font-mono">{rule.code}</span>
                  </div>
                </div>
              ))}
              {!pricing.length && <div className="rounded-2xl border border-dashed border-zinc-900 p-10 text-center text-sm text-zinc-700">No pricing rules represented yet.</div>}
            </div>
          )}
        </section>
      )}

      {tab === 'jobs' && (
        <section className="space-y-4">
          <div><h2 className="text-2xl font-semibold text-zinc-100">Jobs</h2><p className="mt-1 text-sm text-zinc-600">Committed and operational work. Open a job to manage crew, schedule, equipment, instructions, and money.</p></div>
          <div className="space-y-2">
            {jobs.map((item) => (
              <div key={item.id} className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <button type="button" onClick={() => onOpenWork(item.id)} className="min-w-0 flex-1 text-left">
                    <div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-zinc-100">{item.name}</span><StatusPill tone="good">{item.commitment_state}</StatusPill><StatusPill>{item.operational_state}</StatusPill></div>
                    <div className="mt-2 text-sm text-zinc-500">{customerName(item)} · {dateLabel(item.event_start_date)} · {venueName(item)}</div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-700">
                      <span>{item.active_assignment_count} crew assignments</span>
                      <span>{item.active_resource_commitment_count} resource commitments</span>
                      <span>{item.open_work_count} open work items</span>
                    </div>
                    <div className="mt-2 text-xs text-zinc-600">Next: {nextMove(item)}</div>
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void shareWork(item)} className="rounded-lg border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-200">Share</button>
                    <button type="button" onClick={() => printSummary(item)} className="rounded-lg border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-200">Print / PDF</button>
                    <button type="button" onClick={() => onOpenWork(item.id)} className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-bold text-zinc-950">Open job</button>
                  </div>
                </div>
              </div>
            ))}
            {!jobs.length && <div className="rounded-2xl border border-dashed border-zinc-900 p-10 text-center text-sm text-zinc-700">No committed jobs represented yet. When a lead is signed or confirmed, it will appear here.</div>}
          </div>
        </section>
      )}
    </div>
  )
}
