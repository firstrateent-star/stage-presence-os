import { businessNextMovement } from '../lib/businessPresentation'
import { engagementDateLabel } from '../lib/businessSignals'
import type { Engagement } from '../types/domain'

export function EngagementsScreen({ engagements, onOpen }: { engagements: Engagement[]; onOpen: (id: string) => void }) {
  const today = localDateKey(new Date())
  const opportunities = engagements
    .filter((engagement) => isOpenOpportunity(engagement) && !isPast(engagement, today))
    .sort(bySoonest)
  const upcomingJobs = engagements
    .filter((engagement) => isCommitted(engagement) && engagement.operational_state !== 'CLOSED' && !isPast(engagement, today))
    .sort(bySoonest)
  const pastOrResolve = engagements
    .filter((engagement) => !opportunities.some((item) => item.id === engagement.id) && !upcomingJobs.some((item) => item.id === engagement.id))
    .sort(byMostRecent)

  return (
    <div className="sm:ml-48">
      <header className="mb-8">
        <p className="text-sm text-zinc-500">The work Stage Presence is winning, delivering, and learning from.</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Work</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">One Engagement still runs underneath the full lifecycle. This view groups it the way the business experiences it.</p>
      </header>

      <div className="mb-8 grid grid-cols-3 gap-3">
        <WorkStat label="Opportunities" value={opportunities.length} />
        <WorkStat label="Upcoming jobs" value={upcomingJobs.length} />
        <WorkStat label="Past / resolve" value={pastOrResolve.length} />
      </div>

      <WorkSection title="Opportunities" count={opportunities.length} description="Current work that can still be won or moved commercially.">
        {opportunities.length ? opportunities.map((engagement) => <WorkCard key={engagement.id} engagement={engagement} onOpen={onOpen} mode="opportunity" />) : <Empty text="No current opportunity is waiting for commercial movement." />}
      </WorkSection>

      <WorkSection title="Upcoming Jobs" count={upcomingJobs.length} description="Work Stage Presence has committed to protect and deliver.">
        {upcomingJobs.length ? upcomingJobs.map((engagement) => <WorkCard key={engagement.id} engagement={engagement} onOpen={onOpen} mode="job" />) : <Empty text="No committed upcoming work is represented." />}
      </WorkSection>

      <WorkSection title="Past / Needs Resolution" count={pastOrResolve.length} description="Historical, lost, cancelled, closed, or past-dated work stays available for learning without cluttering current sales and delivery.">
        {pastOrResolve.length ? pastOrResolve.slice(0, 20).map((engagement) => <WorkCard key={engagement.id} engagement={engagement} onOpen={onOpen} mode="history" />) : <Empty text="No historical or stale work is currently represented." />}
      </WorkSection>
    </div>
  )
}

function WorkSection({ title, count, description, children }: { title: string; count: number; description: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><h2 className="text-lg font-semibold text-zinc-200">{title}</h2><span className="rounded-full border border-zinc-900 px-2 py-0.5 text-[10px] text-zinc-600">{count}</span></div>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-600">{description}</p>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">{children}</div>
    </section>
  )
}

function WorkCard({ engagement, onOpen, mode }: { engagement: Engagement; onOpen: (id: string) => void; mode: 'opportunity' | 'job' | 'history' }) {
  const movement = mode === 'history' ? humanState(engagement) : businessNextMovement(engagement)
  return (
    <button type="button" onClick={() => onOpen(engagement.id)} className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-4 text-left transition hover:border-zinc-700 hover:bg-zinc-900/50">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium tracking-[0.08em] text-zinc-600">{engagementDateLabel(engagement)}</div>
          <h3 className="mt-1 text-lg font-semibold text-zinc-100">{engagement.name}</h3>
          {engagement.venue_name && <div className="mt-1 text-xs text-zinc-600">{engagement.venue_name}</div>}
        </div>
        <div className="shrink-0 rounded-full border border-zinc-900 px-2.5 py-1 text-[10px] font-semibold text-zinc-500">{humanState(engagement)}</div>
      </div>

      {(engagement.desired_outcome || engagement.customer_request) && (
        <p className="mt-4 line-clamp-2 text-sm leading-6 text-zinc-400">{engagement.desired_outcome || engagement.customer_request}</p>
      )}

      <div className="mt-4 border-t border-zinc-900 pt-3">
        <div className="text-[10px] font-semibold tracking-[0.12em] text-zinc-700">{mode === 'history' ? 'CURRENT RECORD' : 'NEXT'}</div>
        <div className="mt-1 text-sm text-zinc-400">{movement}</div>
      </div>
    </button>
  )
}

function WorkStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-4"><div className="text-2xl font-semibold text-zinc-100">{value}</div><div className="mt-1 text-xs text-zinc-600">{label}</div></div>
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-zinc-900 bg-zinc-950/30 p-5 text-sm leading-6 text-zinc-600">{text}</div>
}

function isCommitted(engagement: Engagement) {
  return engagement.commercial_state === 'WON' || ['SIGNED', 'DEPOSIT_PENDING', 'CONFIRMED'].includes(engagement.commitment_state)
}

function isOpenOpportunity(engagement: Engagement) {
  return ['NEW', 'DISCOVERY', 'DESIGNING', 'PROPOSED', 'NEGOTIATING'].includes(engagement.commercial_state)
    && !['SIGNED', 'DEPOSIT_PENDING', 'CONFIRMED', 'CANCELLED'].includes(engagement.commitment_state)
}

function isPast(engagement: Engagement, today: string) {
  const key = eventDateKey(engagement)
  return Boolean(key && key < today)
}

function eventDateKey(engagement: Engagement) {
  return engagement.event_start_date ?? engagement.event_start?.slice(0, 10) ?? null
}

function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function bySoonest(a: Engagement, b: Engagement) {
  const first = eventDateKey(a) ?? '9999-12-31'
  const second = eventDateKey(b) ?? '9999-12-31'
  return first.localeCompare(second) || b.updated_at.localeCompare(a.updated_at)
}

function byMostRecent(a: Engagement, b: Engagement) {
  const first = eventDateKey(a) ?? '0000-00-00'
  const second = eventDateKey(b) ?? '0000-00-00'
  return second.localeCompare(first) || b.updated_at.localeCompare(a.updated_at)
}

function humanState(engagement: Engagement) {
  if (engagement.commitment_state === 'CONFIRMED') return 'Confirmed'
  if (engagement.commitment_state === 'DEPOSIT_PENDING') return 'Deposit pending'
  if (engagement.commitment_state === 'SIGNED') return 'Signed'
  if (engagement.commercial_state === 'WON') return 'Won'
  if (engagement.commercial_state === 'NEGOTIATING') return 'Negotiating'
  if (engagement.commercial_state === 'PROPOSED') return 'Proposal sent'
  if (engagement.commercial_state === 'DESIGNING') return 'Designing'
  if (engagement.commercial_state === 'DISCOVERY') return 'Discovery'
  if (engagement.commercial_state === 'LOST') return 'Lost'
  if (engagement.commitment_state === 'CANCELLED') return 'Cancelled'
  if (engagement.operational_state === 'CLOSED') return 'Closed'
  return 'New'
}
