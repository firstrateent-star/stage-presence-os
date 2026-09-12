import { useCallback, useEffect, useState } from 'react'
import { loadJobDay, type JobDayModel } from '../lib/jobDay'

export function JobDayPanel({
  engagementId,
  engagementType,
  commercialState,
  commitmentState,
  eventStartDate,
  eventEndDate,
}: {
  engagementId: string
  engagementType: string
  commercialState: string
  commitmentState: string
  eventStartDate: string | null
  eventEndDate: string | null
}) {
  const committed = commercialState === 'WON' || ['SIGNED', 'DEPOSIT_PENDING', 'CONFIRMED'].includes(commitmentState)
  const eligibleType = ['EVENT', 'LONG_TERM_RENTAL', 'INSTALLATION', 'SERVICE'].includes(engagementType)
  const [model, setModel] = useState<JobDayModel | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!committed || !eligibleType) return
    setLoading(true)
    setError(null)
    try { setModel(await loadJobDay(engagementId)) }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load Job Day.') }
    finally { setLoading(false) }
  }, [committed, eligibleType, engagementId])

  useEffect(() => { void refresh() }, [refresh])
  if (!committed || !eligibleType) return null

  const timingLabel = eventWindowLabel(eventStartDate, eventEndDate)
  const mode = jobDayMode(eventStartDate, eventEndDate)

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/60">
      <div className="border-b border-zinc-900 bg-zinc-900/35 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold tracking-[0.18em] text-amber-500">{mode === 'LIVE' ? 'JOB DAY' : mode === 'PAST' ? 'DELIVERY REVIEW' : 'JOB DAY PREVIEW'}</div>
            <h2 className="mt-2 text-xl font-semibold text-zinc-100">The delivery view</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-500">One operational slice of canonical truth: where to go, when to be there, who is carrying it, what capacity is committed, and what still needs attention.</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-zinc-300">{timingLabel}</div>
            <button type="button" onClick={() => void refresh()} disabled={loading} className="mt-2 text-xs font-semibold text-zinc-600 hover:text-zinc-300 disabled:opacity-40">{loading ? 'Refreshing…' : 'Refresh'}</button>
          </div>
        </div>
      </div>

      {error && <div className="m-4 rounded-xl border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</div>}
      {!model && loading ? <div className="p-5 text-sm text-zinc-600">Assembling delivery reality…</div> : null}

      {model && (
        <div className="grid gap-0 lg:grid-cols-2">
          <JobDayBlock title="Where">
            {model.location ? (
              <div>
                <div className="text-base font-semibold text-zinc-100">{model.location.name}</div>
                <div className="mt-1 text-sm text-zinc-500">{model.location.address || 'Address not represented'}</div>
                {model.location.notes && <p className="mt-2 text-xs leading-5 text-zinc-600">{model.location.notes}</p>}
              </div>
            ) : <Missing text="No canonical Venue is represented." />}
          </JobDayBlock>

          <JobDayBlock title="Who to contact">
            {model.contacts.length ? <div className="space-y-3">{model.contacts.map((link) => <div key={link.id}><div className="text-sm font-semibold text-zinc-200">{link.party?.name ?? 'Unknown contact'}</div><div className="mt-1 text-xs text-zinc-500">{[link.party?.organization_name, link.party?.phone, link.party?.email].filter(Boolean).join(' · ') || link.role}</div></div>)}</div> : <Missing text="No customer/contact link is represented." />}
          </JobDayBlock>

          <JobDayBlock title="Timeline">
            {model.schedule.length ? <div className="space-y-2">{model.schedule.map((item) => <div key={item.id} className="flex items-start justify-between gap-3 border-b border-zinc-900 pb-2 last:border-0"><div><div className="text-sm font-medium text-zinc-200">{item.label}</div><div className="mt-1 text-xs text-zinc-600">{item.schedule_type.replaceAll('_', ' ')}</div></div><div className="text-right text-xs text-zinc-400">{formatSchedule(item)}</div></div>)}</div> : <Missing text="No native execution schedule is represented." />}
          </JobDayBlock>

          <JobDayBlock title="Crew">
            {model.crew.length ? <div className="space-y-2">{model.crew.map((item) => <div key={item.id} className="flex items-start justify-between gap-3"><div><div className="text-sm font-medium text-zinc-200">{item.member?.display_name ?? item.member?.username ?? 'Unknown contributor'}</div><div className="mt-1 text-xs text-zinc-600">{item.role_label || item.role_code.replaceAll('_', ' ')}</div></div><span className="rounded-full border border-zinc-800 px-2 py-1 text-[10px] font-semibold text-zinc-500">{item.assignment_state}</span></div>)}</div> : <Missing text="No confirmed crew is represented yet." />}
          </JobDayBlock>

          <JobDayBlock title="Committed capacity">
            {model.commitments.length ? <div className="space-y-2">{model.commitments.map((item) => <div key={item.id} className="flex items-start justify-between gap-3"><div><div className="text-sm font-medium text-zinc-200">{item.resource_name}</div><div className="mt-1 text-xs text-zinc-600">{item.commitment_type} · {item.quantity ?? 'qty TBD'} · {item.planned_sourcing_model}</div></div><span className="rounded-full border border-zinc-800 px-2 py-1 text-[10px] font-semibold text-zinc-500">{item.commitment_state}</span></div>)}</div> : <Missing text="No hold, reservation or allocation is represented. Configured scope is not treated as committed capacity." />}
          </JobDayBlock>

          <JobDayBlock title="Need to know">
            {model.operatingFacts.length ? <div className="space-y-3">{model.operatingFacts.slice(0, 8).map((fact) => <div key={fact.id}><div className="flex items-center gap-2"><span className="text-[10px] font-bold tracking-[0.12em] text-zinc-700">{fact.category}</span><span className="text-[10px] text-zinc-700">{fact.certainty_state}</span></div><div className="mt-1 text-sm text-zinc-300">{fact.label}</div>{fact.value_text && <div className="mt-1 text-xs leading-5 text-zinc-500">{fact.value_text}</div>}</div>)}</div> : <Missing text="No access, logistics, power, venue, safety or labor facts are represented." />}
          </JobDayBlock>

          <div className="lg:col-span-2 border-t border-zinc-900 p-5">
            <div className="text-xs font-semibold tracking-[0.15em] text-zinc-600">WHAT STILL NEEDS ATTENTION</div>
            {model.primaryWork ? <div className="mt-3 rounded-xl border border-amber-950/60 bg-amber-950/10 p-4"><div className="text-base font-semibold text-zinc-100">{model.primaryWork.title}</div><div className="mt-2 text-xs text-zinc-500">{model.primaryWork.status} · {model.primaryWork.priority}{model.primaryWork.waiting_on ? ` · waiting on ${model.primaryWork.waiting_on}` : ''}</div>{model.primaryWork.why_now && <p className="mt-2 text-sm leading-6 text-zinc-500">{model.primaryWork.why_now}</p>}</div> : <p className="mt-3 text-sm text-zinc-600">No persisted open Work is represented for this Engagement.</p>}
          </div>
        </div>
      )}
    </section>
  )
}

function JobDayBlock({ title, children }: { title: string; children: React.ReactNode }) { return <div className="border-b border-zinc-900 p-5 lg:border-r lg:odd:border-r lg:even:border-r-0"><div className="mb-3 text-xs font-semibold tracking-[0.15em] text-zinc-600">{title.toUpperCase()}</div>{children}</div> }
function Missing({ text }: { text: string }) { return <p className="text-sm leading-6 text-zinc-600">{text}</p> }
function eventWindowLabel(start: string | null, end: string | null) { if (!start) return 'Date not represented'; const a = new Date(`${start}T12:00:00`); const startLabel = a.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); if (!end || end === start) return startLabel; const b = new Date(`${end}T12:00:00`); return `${startLabel} → ${b.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` }
function jobDayMode(start: string | null, end: string | null) { if (!start) return 'PREVIEW'; const today = new Date(); today.setHours(0,0,0,0); const a = new Date(`${start}T00:00:00`); const b = new Date(`${end || start}T23:59:59`); if (today >= a && today <= b) return 'LIVE'; if (today > b) return 'PAST'; return 'PREVIEW' }
function formatSchedule(item: JobDayModel['schedule'][number]) { if (item.start_at) { const a = new Date(item.start_at); const start = a.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); if (!item.end_at) return start; const b = new Date(item.end_at); return `${start}–${b.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` } if (item.start_date) return new Date(`${item.start_date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); return item.time_state }
