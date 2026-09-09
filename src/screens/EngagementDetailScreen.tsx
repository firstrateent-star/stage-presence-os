import { useMemo, useState, type ReactNode } from 'react'
import { StateBadge } from '../components/StateBadge'
import { engagementDateLabel } from '../lib/businessSignals'
import { addNote, archiveEngagement, createFact, createPartyAndLink, linkResource, updateEngagement } from '../lib/repository'
import { useEngagementDetail } from '../lib/useEngagementDetail'
import type { AttentionState, CertaintyState, Engagement, FactCategory, FactKind } from '../types/domain'

export function EngagementDetailScreen({ engagement, onBack, onChanged }: { engagement: Engagement | undefined; onBack: () => void; onChanged: () => Promise<void> | void }) {
  const detail = useEngagementDetail(engagement?.id)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [factMode, setFactMode] = useState<'known' | 'unknown' | null>(null)
  const [partyOpen, setPartyOpen] = useState(false)
  const [resourceOpen, setResourceOpen] = useState(false)
  const [note, setNote] = useState('')

  const knownFacts = useMemo(() => detail.facts.filter((fact) => !['UNKNOWN', 'REQUESTED'].includes(fact.certainty_state)), [detail.facts])
  const unknownFacts = useMemo(() => detail.facts.filter((fact) => ['UNKNOWN', 'REQUESTED'].includes(fact.certainty_state)), [detail.facts])

  if (!engagement) return <div className="sm:ml-48"><button onClick={onBack}>← Back</button><p className="mt-6 text-zinc-500">Engagement not found.</p></div>
  const engagementId = engagement.id

  async function act(operation: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await operation()
      await Promise.all([detail.refresh(), Promise.resolve(onChanged())])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save change.')
    } finally {
      setBusy(false)
    }
  }

  async function saveNextMove(formData: FormData) {
    const attention = String(formData.get('attention_state')) as AttentionState
    const waitingOn = clean(formData.get('waiting_on'))
    const blockedReason = clean(formData.get('blocked_reason'))
    if (attention === 'WAITING' && !waitingOn) { setError('Say what or who this Engagement is waiting on.'); return }
    if (attention === 'BLOCKED' && !blockedReason) { setError('Give the blocker a reason so it can be resolved.'); return }
    await act(() => updateEngagement(engagementId, {
      next_action: clean(formData.get('next_action')),
      next_action_at: clean(formData.get('next_action_at')) ? new Date(String(formData.get('next_action_at'))).toISOString() : null,
      attention_state: attention,
      waiting_on: attention === 'WAITING' ? waitingOn : null,
      blocked_reason: attention === 'BLOCKED' ? blockedReason : null,
    }))
  }

  async function saveFact(formData: FormData) {
    const mode = factMode
    if (!mode) return
    const label = clean(formData.get('label'))
    if (!label) return
    await act(() => createFact({
      engagement_id: engagementId,
      category: String(formData.get('category')) as FactCategory,
      kind: String(formData.get('kind')) as FactKind,
      label,
      value_text: clean(formData.get('value_text')),
      certainty_state: (mode === 'unknown' ? 'UNKNOWN' : String(formData.get('certainty_state'))) as CertaintyState,
      confidence: null,
      source_type: 'MANUAL',
      notes: clean(formData.get('notes')),
    }))
    setFactMode(null)
  }

  async function saveParty(formData: FormData) {
    const name = clean(formData.get('name'))
    if (!name) return
    await act(() => createPartyAndLink(engagementId, {
      name,
      party_type: String(formData.get('party_type')) as 'PERSON' | 'ORGANIZATION',
      role: String(formData.get('role')),
      organization_name: clean(formData.get('organization_name')) ?? undefined,
      email: clean(formData.get('email')) ?? undefined,
      phone: clean(formData.get('phone')) ?? undefined,
    }))
    setPartyOpen(false)
  }

  async function saveResource(formData: FormData) {
    const resourceId = clean(formData.get('resource_id'))
    if (!resourceId) return
    await act(() => linkResource(engagementId, resourceId, String(formData.get('relationship'))))
    setResourceOpen(false)
  }

  async function saveNote() {
    if (!note.trim()) return
    const value = note.trim()
    await act(() => addNote(engagementId, value))
    setNote('')
  }

  return (
    <div className="sm:ml-48">
      <button type="button" onClick={onBack} className="mb-5 text-sm text-zinc-500 hover:text-zinc-200">← Engagements</button>
      <div className="flex flex-col gap-4 border-b border-zinc-900 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs tracking-[0.14em] text-zinc-600">{engagement.engagement_number}</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{engagement.name}</h1>
          <div className="mt-3 flex flex-wrap gap-2"><StateBadge value={engagement.commercial_state} /><StateBadge value={engagement.commitment_state} /><StateBadge value={engagement.operational_state} /><StateBadge value={engagement.attention_state} /></div>
        </div>
        <div className="text-sm text-zinc-500">{engagementDateLabel(engagement)}</div>
      </div>

      {(error || detail.error) && <div className="mt-5 rounded-xl border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error || detail.error}</div>}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Panel title="Outcome" value={engagement.desired_outcome} empty="Outcome has not been defined yet." />
        <Panel title="Customer Asked For" value={engagement.customer_request} empty="Literal customer request has not been captured yet." />
        <section className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-5"><SectionHeading title="Known" action="+ Add" onAction={() => setFactMode('known')} /><FactList facts={knownFacts} empty="No structured known facts yet." /></section>
        <section className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-5"><SectionHeading title="Need to Know" action="+ Add unknown" onAction={() => setFactMode('unknown')} /><FactList facts={unknownFacts} empty="No material unknowns have been recorded." /></section>
        <section className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-5">
          <SectionHeading title="People / Organizations" action="+ Link" onAction={() => setPartyOpen(true)} />
          <div className="mt-3 space-y-3">{detail.parties.length ? detail.parties.map((link) => <div key={link.id} className="rounded-xl border border-zinc-900 p-3"><div className="font-medium text-zinc-200">{link.party?.name ?? 'Unknown party'}</div><div className="mt-1 text-xs text-zinc-600">{link.role.replaceAll('_', ' ')}</div>{(link.party?.email || link.party?.phone) && <div className="mt-2 text-xs text-zinc-500">{[link.party.email, link.party.phone].filter(Boolean).join(' • ')}</div>}</div>) : <EmptyText text="No parties linked yet." />}</div>
        </section>
        <section className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-5">
          <SectionHeading title="Resources" action="+ Consider" onAction={() => setResourceOpen(true)} />
          <div className="mt-3 space-y-3">{detail.resourceLinks.length ? detail.resourceLinks.map((link) => <div key={link.id} className="rounded-xl border border-zinc-900 p-3"><div className="font-medium text-zinc-200">{link.resource?.name ?? 'Unknown resource'}</div><div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-600"><span>{link.relationship.replaceAll('_', ' ')}</span>{link.resource && <><span>•</span><span>{link.resource.quantity_state}</span><span>•</span><span>{link.resource.sourcing_model}</span></>}</div></div>) : <EmptyText text="No resources linked. Existence in the library is not availability." />}</div>
        </section>
      </div>

      <NextMovePanel engagement={engagement} busy={busy} onSave={saveNextMove} />

      <section className="mt-4 rounded-2xl border border-zinc-900 bg-zinc-950/70 p-5">
        <div className="flex items-center justify-between"><div className="text-xs font-semibold tracking-[0.16em] text-zinc-600">ACTIVITY</div><span className="text-xs text-zinc-700">{detail.events.length}</span></div>
        <div className="mt-3 flex gap-2"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add an internal note…" className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-amber-600" /><button disabled={busy || !note.trim()} onClick={() => void saveNote()} className="rounded-xl border border-zinc-800 px-3 text-sm text-zinc-300 disabled:opacity-40">Add</button></div>
        <div className="mt-4 divide-y divide-zinc-900">{detail.events.length ? detail.events.map((event) => <div key={event.id} className="py-3"><div className="text-sm text-zinc-300">{event.summary ?? event.event_type.replaceAll('_', ' ')}</div><div className="mt-1 text-xs text-zinc-600">{new Date(event.created_at).toLocaleString()} • {event.event_type.replaceAll('_', ' ')}</div></div>) : <EmptyText text="No activity yet." />}</div>
      </section>

      <div className="mt-8 border-t border-zinc-900 pt-6"><button disabled={busy} onClick={() => void act(async () => { await archiveEngagement(engagementId); onBack() })} className="text-sm text-zinc-600 hover:text-red-300">Archive engagement</button></div>

      {factMode && <FactModal mode={factMode} onClose={() => setFactMode(null)} onSave={saveFact} />}
      {partyOpen && <PartyModal onClose={() => setPartyOpen(false)} onSave={saveParty} />}
      {resourceOpen && <ResourceModal resources={detail.resourceLibrary} linkedIds={new Set(detail.resourceLinks.map((item) => item.resource?.id).filter(Boolean) as string[])} onClose={() => setResourceOpen(false)} onSave={saveResource} />}
    </div>
  )
}

function clean(value: FormDataEntryValue | null) { const text = value == null ? '' : String(value).trim(); return text || null }
function Panel({ title, value, empty }: { title: string; value?: string | null; empty?: string }) { return <section className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-5"><div className="text-xs font-semibold tracking-[0.16em] text-zinc-600">{title.toUpperCase()}</div><p className="mt-3 text-sm leading-6 text-zinc-300">{value || empty}</p></section> }
function SectionHeading({ title, action, onAction }: { title: string; action: string; onAction: () => void }) { return <div className="flex items-center justify-between"><div className="text-xs font-semibold tracking-[0.16em] text-zinc-600">{title.toUpperCase()}</div><button onClick={onAction} className="text-xs font-semibold text-amber-500 hover:text-amber-300">{action}</button></div> }
function EmptyText({ text }: { text: string }) { return <p className="py-2 text-sm leading-6 text-zinc-600">{text}</p> }
function FactList({ facts, empty }: { facts: ReturnType<typeof useEngagementDetail>['facts']; empty: string }) { return <div className="mt-3 space-y-2">{facts.length ? facts.map((fact) => <div key={fact.id} className="rounded-xl border border-zinc-900 p-3"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-medium text-zinc-200">{fact.label}</div>{fact.value_text && <div className="mt-1 text-sm text-zinc-400">{fact.value_text}</div>}</div><span className="text-[10px] font-semibold text-zinc-600">{fact.certainty_state}</span></div><div className="mt-2 text-[10px] tracking-wide text-zinc-700">{fact.category} • {fact.kind} • {fact.source_type}</div></div>) : <EmptyText text={empty} />}</div> }

function NextMovePanel({ engagement, busy, onSave }: { engagement: Engagement; busy: boolean; onSave: (data: FormData) => Promise<void> }) { return <section className="mt-4 rounded-2xl border border-amber-900/50 bg-amber-950/10 p-5"><div className="text-xs font-semibold tracking-[0.16em] text-amber-500">NEXT MOVE</div><form action={(data) => void onSave(data)} className="mt-4 grid gap-3 lg:grid-cols-2"><label className="lg:col-span-2 text-xs text-zinc-500">Action<input name="next_action" defaultValue={engagement.next_action ?? ''} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-600" /></label><label className="text-xs text-zinc-500">Follow-up / due<input name="next_action_at" type="datetime-local" defaultValue={toLocalInput(engagement.next_action_at)} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none" /></label><label className="text-xs text-zinc-500">Attention<select name="attention_state" defaultValue={engagement.attention_state} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100"><option>NORMAL</option><option>NEEDS_ATTENTION</option><option>WAITING</option><option>BLOCKED</option></select></label><label className="text-xs text-zinc-500">Waiting on<input name="waiting_on" defaultValue={engagement.waiting_on ?? ''} placeholder="Required when WAITING" className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100" /></label><label className="text-xs text-zinc-500">Blocked reason<input name="blocked_reason" defaultValue={engagement.blocked_reason ?? ''} placeholder="Required when BLOCKED" className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100" /></label><button disabled={busy} className="lg:col-span-2 mt-1 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-zinc-950 disabled:opacity-50">Save next move</button></form></section> }
function toLocalInput(value: string | null) { if (!value) return ''; const d = new Date(value); const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 16) }
function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-3 sm:items-center sm:justify-center"><div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{title}</h2><button onClick={onClose} className="text-zinc-500">Close</button></div>{children}</div></div> }
function FactModal({ mode, onClose, onSave }: { mode: 'known' | 'unknown'; onClose: () => void; onSave: (d: FormData) => Promise<void> }) { return <Modal title={mode === 'known' ? 'Add known fact' : 'Add unknown'} onClose={onClose}><form action={(d) => void onSave(d)} className="mt-5 grid gap-3"><input name="label" required placeholder={mode === 'known' ? 'Audience size' : 'Power availability'} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5" /><input name="value_text" placeholder={mode === 'known' ? 'Approximately 1,500' : 'Leave blank if unknown'} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5" /><div className="grid grid-cols-2 gap-3"><select name="category" defaultValue="OTHER" className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5"><option>EVENT</option><option>VISUAL</option><option>AUDIO</option><option>LIGHTING</option><option>STAGING</option><option>POWER</option><option>NETWORK</option><option>VENUE</option><option>LOGISTICS</option><option>LABOR</option><option>CONTENT</option><option>CUSTOMER</option><option>OTHER</option></select><select name="kind" defaultValue={mode === 'unknown' ? 'REQUIREMENT' : 'OBSERVATION'} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5"><option>REQUIREMENT</option><option>CONSTRAINT</option><option>CUSTOMER_REQUEST</option><option>OBSERVATION</option><option>ASSUMPTION</option><option>PREFERENCE</option><option>OTHER</option></select></div>{mode === 'known' && <select name="certainty_state" defaultValue="KNOWN" className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5"><option>VERIFIED</option><option>KNOWN</option><option>ESTIMATED</option><option>ASSUMED</option><option>CONFLICTING</option></select>}<textarea name="notes" placeholder="Optional notes" className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5" /><button className="rounded-xl bg-amber-500 px-4 py-3 font-bold text-zinc-950">Add</button></form></Modal> }
function PartyModal({ onClose, onSave }: { onClose: () => void; onSave: (d: FormData) => Promise<void> }) { return <Modal title="Link person or organization" onClose={onClose}><form action={(d) => void onSave(d)} className="mt-5 grid gap-3"><div className="grid grid-cols-2 gap-3"><select name="party_type" defaultValue="PERSON" className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5"><option>PERSON</option><option>ORGANIZATION</option></select><select name="role" defaultValue="PRIMARY_CONTACT" className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5"><option>CUSTOMER</option><option>PRIMARY_CONTACT</option><option>PLANNER</option><option>REFERRER</option><option>VENUE_CONTACT</option><option>OTHER</option></select></div><input name="name" required placeholder="Name" className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5" /><input name="organization_name" placeholder="Organization (optional)" className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5" /><input name="email" type="email" placeholder="Email" className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5" /><input name="phone" placeholder="Phone" className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5" /><button className="rounded-xl bg-amber-500 px-4 py-3 font-bold text-zinc-950">Link</button></form></Modal> }
function ResourceModal({ resources, linkedIds, onClose, onSave }: { resources: ReturnType<typeof useEngagementDetail>['resourceLibrary']; linkedIds: Set<string>; onClose: () => void; onSave: (d: FormData) => Promise<void> }) { const available = resources.filter((r) => !linkedIds.has(r.id)); return <Modal title="Consider a resource" onClose={onClose}><form action={(d) => void onSave(d)} className="mt-5 grid gap-3"><select name="resource_id" required className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5"><option value="">Choose resource…</option>{available.map((resource) => <option key={resource.id} value={resource.id}>{resource.name} — {resource.quantity_state}</option>)}</select><select name="relationship" defaultValue="CONSIDERING" className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5"><option>CONSIDERING</option><option>CUSTOMER_REQUESTED</option><option>RECOMMENDED</option></select><p className="text-xs leading-5 text-zinc-600">Linking means relevant to this engagement. It does not reserve capacity or prove availability.</p><button className="rounded-xl bg-amber-500 px-4 py-3 font-bold text-zinc-950">Link resource</button></form></Modal> }
