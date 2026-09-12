import type { ReactNode } from 'react'
import type { Engagement } from '../types/domain'
import type { CapabilitySummary, EconomyOverview, EngagementSummary, RecoveryQueueItem, RelationshipSummary } from '../lib/readContracts'

function money(value: number | null | undefined) {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function dateLabel(value: string | null | undefined) {
  if (!value) return 'Date not represented'
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' }).format(date)
}

function text(value: Record<string, unknown> | null, key: string) {
  const found = value?.[key]
  return typeof found === 'string' && found.trim() ? found : null
}

function num(value: Record<string, unknown> | null, key: string) {
  const found = value?.[key]
  return typeof found === 'number' ? found : null
}

function labelState(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase())
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-500">{children}</div>
}

function QuietCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-zinc-900 bg-zinc-950/45 ${className}`}>{children}</div>
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return <div><div className="text-[10px] uppercase tracking-[0.14em] text-zinc-700">{label}</div><div className="mt-1 text-lg font-semibold tabular-nums text-zinc-200">{value}</div></div>
}

function HumanWorkCard({ item, onOpen, compact = false }: { item: EngagementSummary; onOpen: (id: string) => void; compact?: boolean }) {
  const customer = text(item.primary_customer, 'name') ?? text(item.primary_customer, 'organization_name')
  const venue = text(item.venue, 'name')
  const next = text(item.next_work, 'title')
  const committed = num(item.economy, 'committed_revenue_observed')
  const confirmed = ['SIGNED', 'CONFIRMED', 'DEPOSIT_PENDING'].includes(item.commitment_state)
  return (
    <button type="button" onClick={() => onOpen(item.id)} className="w-full rounded-2xl border border-zinc-900 bg-zinc-950/45 p-4 text-left transition hover:border-zinc-700 hover:bg-zinc-900/35">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate font-semibold text-zinc-100">{item.name}</div>
          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-zinc-600">
            <span>{dateLabel(item.event_start_date)}</span>
            {customer && <><span>·</span><span>{customer}</span></>}
            {venue && <><span>·</span><span>{venue}</span></>}
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[.12em] ${confirmed ? 'border-emerald-900/60 bg-emerald-950/20 text-emerald-300' : 'border-zinc-800 text-zinc-500'}`}>{confirmed ? 'Confirmed' : labelState(item.commercial_state)}</span>
      </div>
      {!compact && <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"><div><div className="text-[10px] uppercase tracking-[.12em] text-zinc-700">What’s next</div><div className={`mt-1 text-sm ${next ? 'text-zinc-300' : 'text-zinc-600'}`}>{next ?? 'No committed next action represented'}</div></div>{committed != null && <div className="text-sm font-semibold tabular-nums text-zinc-400">{money(committed)}</div>}</div>}
    </button>
  )
}

function rolePriority(item: EngagementSummary, role: string | null) {
  let score = item.open_work_count * 10
  if (item.attention_state !== 'NORMAL') score += 30
  if (role === 'COMMERCIAL') {
    if (item.commitment_state === 'UNCOMMITTED') score += 25
    if (['PROPOSED', 'NEW'].includes(item.commercial_state)) score += 20
    const outstanding = num(item.economy, 'outstanding_observed')
    if (outstanding && outstanding > 0) score += 20
  } else if (role === 'OPERATIONS') {
    if (['SIGNED', 'CONFIRMED', 'DEPOSIT_PENDING'].includes(item.commitment_state)) score += 25
    if (item.active_assignment_count === 0) score += 10
    if (item.active_resource_commitment_count === 0) score += 10
  } else if (role === 'VIEWER') {
    score = item.attention_state !== 'NORMAL' ? 10 : 0
  } else {
    if (['SIGNED', 'CONFIRMED'].includes(item.commitment_state)) score += 15
  }
  return score
}

export function HumanToday({ engagements, recovery, role, onOpen, onCapture }: { engagements: EngagementSummary[]; recovery: RecoveryQueueItem[]; role: string | null; onOpen: (id: string) => void; onCapture: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const ranked = [...engagements].sort((a, b) => rolePriority(b, role) - rolePriority(a, role))
  const attention = ranked.filter((item) => rolePriority(item, role) > 0).slice(0, 4)
  const coming = engagements.filter((item) => item.event_start_date && item.event_start_date >= today && !['LOST'].includes(item.commercial_state)).slice(0, 5)
  const lens = role === 'COMMERCIAL' ? 'Sales, follow-up, collections, and relationships' : role === 'OPERATIONS' ? 'Delivery, crew, timing, capacity, and blockers' : role === 'VIEWER' ? 'Shared operating context' : 'Judgment, exceptions, delivery, and business movement'
  const highLeverage = recovery.filter((item) => item.urgency === 'NOW' && item.status !== 'RESOLVED').slice(0, 3)
  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-5 border-b border-zinc-900 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div><Eyebrow>Today</Eyebrow><h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-100">What needs you?</h1><p className="mt-2 text-sm text-zinc-600">{lens}. Everything else can stay underneath.</p></div>
        <button type="button" onClick={onCapture} className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-zinc-950 hover:bg-amber-400">Tell Stage Presence what happened</button>
      </div>

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-zinc-200">Needs attention</h2><span className="text-xs text-zinc-700">{role ?? 'ADMIN'} lens</span></div>
        <div className="grid gap-3 lg:grid-cols-2">{attention.length ? attention.map((item) => <HumanWorkCard key={item.id} item={item} onOpen={onOpen} />) : <QuietCard className="col-span-full p-6 text-sm text-zinc-600">Nothing currently rises above the attention threshold.</QuietCard>}</div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
        <section><div className="mb-3 text-sm font-semibold text-zinc-200">Coming up</div><div className="space-y-3">{coming.map((item) => <HumanWorkCard key={item.id} item={item} onOpen={onOpen} compact />)}</div></section>
        <QuietCard className="p-4"><div className="flex items-center justify-between"><div className="text-sm font-semibold text-zinc-300">Reality worth resolving</div><span className="text-xs text-zinc-700">{highLeverage.length}</span></div><div className="mt-4 space-y-4">{highLeverage.length ? highLeverage.map((item) => <div key={item.candidate_key}><div className="text-sm font-medium text-zinc-300">{item.title}</div><div className="mt-1 text-xs leading-5 text-zinc-600">{item.suggested_action}</div></div>) : <div className="py-5 text-xs text-zinc-600">No NOW-level gaps.</div>}</div></QuietCard>
      </div>
    </div>
  )
}

export function HumanWork({ engagements, onOpen }: { engagements: EngagementSummary[]; onOpen: (id: string) => void }) {
  const active = engagements.filter((item) => item.operational_state !== 'CLOSED' && item.commercial_state !== 'LOST')
  const attention = active.filter((item) => item.attention_state !== 'NORMAL' || item.open_work_count > 0)
  const committed = active.filter((item) => ['SIGNED', 'CONFIRMED', 'DEPOSIT_PENDING'].includes(item.commitment_state))
  const pipeline = active.filter((item) => item.commitment_state === 'UNCOMMITTED')
  return (
    <div className="mx-auto max-w-5xl">
      <div className="border-b border-zinc-900 pb-6"><Eyebrow>Work</Eyebrow><h1 className="mt-1 text-3xl font-semibold tracking-tight">What’s moving?</h1><p className="mt-2 text-sm text-zinc-600">Current work, organized by the human state of the relationship—not the database entity.</p></div>
      {attention.length > 0 && <section className="mt-7"><h2 className="mb-3 text-sm font-semibold text-amber-300">Needs attention</h2><div className="grid gap-3 lg:grid-cols-2">{attention.map((item) => <HumanWorkCard key={item.id} item={item} onOpen={onOpen} />)}</div></section>}
      <section className="mt-8"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-zinc-200">Confirmed work</h2><span className="text-xs text-zinc-700">{committed.length}</span></div><div className="grid gap-3 lg:grid-cols-2">{committed.map((item) => <HumanWorkCard key={item.id} item={item} onOpen={onOpen} />)}</div></section>
      <section className="mt-8"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-zinc-200">Possible work</h2><span className="text-xs text-zinc-700">{pipeline.length}</span></div><div className="grid gap-3 lg:grid-cols-2">{pipeline.map((item) => <HumanWorkCard key={item.id} item={item} onOpen={onOpen} />)}</div></section>
    </div>
  )
}

export function WorkStory({ engagement, summary, onCapture }: { engagement: Engagement; summary: EngagementSummary | undefined; onCapture: ReactNode }) {
  const customer = text(summary?.primary_customer ?? null, 'name') ?? text(summary?.primary_customer ?? null, 'organization_name') ?? 'Customer not represented'
  const venue = text(summary?.venue ?? null, 'name') ?? 'Location not represented'
  const venueAddress = text(summary?.venue ?? null, 'address')
  const next = text(summary?.next_work ?? null, 'title')
  const nextWhy = text(summary?.next_work ?? null, 'why_now')
  const schedule = text(summary?.next_schedule ?? null, 'label') ?? text(summary?.next_schedule ?? null, 'title')
  const confirmed = ['SIGNED', 'CONFIRMED', 'DEPOSIT_PENDING'].includes(engagement.commitment_state)
  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-4 border-b border-zinc-900 pb-6 sm:flex-row sm:items-end sm:justify-between"><div><div className="text-[10px] font-semibold uppercase tracking-[.16em] text-zinc-700">{engagement.engagement_number}</div><h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-100">{engagement.name}</h1><div className="mt-2 text-sm text-zinc-600">{confirmed ? 'Confirmed work' : labelState(engagement.commercial_state)} · {dateLabel(engagement.event_start_date)}</div></div><div className="shrink-0">{onCapture}</div></div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <StoryBlock label="Who" value={customer} detail={summary?.primary_customer ? text(summary.primary_customer, 'email') ?? undefined : undefined} />
        <StoryBlock label="When + where" value={`${dateLabel(engagement.event_start_date)} · ${venue}`} detail={venueAddress ?? undefined} />
        <StoryBlock label="What they need" value={engagement.customer_request ?? engagement.desired_outcome ?? 'Customer intent has not been captured clearly yet.'} />
        <StoryBlock label="What we promised" value={confirmed ? 'Stage Presence has a represented commitment for this work.' : 'No final commitment is represented yet.'} detail={summary ? `${summary.active_resource_commitment_count} active capacity commitments · ${summary.active_assignment_count} active crew assignments` : undefined} />
        <StoryBlock label="What’s ready" value={summary && (summary.active_resource_commitment_count > 0 || summary.active_assignment_count > 0) ? `${summary.active_assignment_count} crew assignments · ${summary.active_resource_commitment_count} capacity commitments` : 'Readiness evidence is still thin.'} detail={schedule ? `Next timeline item: ${schedule}` : undefined} />
        <StoryBlock label="What’s not" value={summary && (summary.open_work_count > 0 || engagement.attention_state !== 'NORMAL') ? `${summary.open_work_count} open work items · ${labelState(engagement.attention_state)}` : 'No material gap is currently surfaced here.'} />
      </div>

      <QuietCard className="mt-4 border-amber-950/70 bg-amber-950/10 p-5"><Eyebrow>What’s next</Eyebrow><div className={`mt-2 text-base font-semibold ${next ? 'text-zinc-100' : 'text-zinc-500'}`}>{next ?? 'No committed next action represented'}</div>{nextWhy && <div className="mt-2 text-sm leading-6 text-zinc-600">{nextWhy}</div>}</QuietCard>
    </div>
  )
}

function StoryBlock({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <QuietCard className="p-4"><div className="text-[10px] font-semibold uppercase tracking-[.14em] text-zinc-700">{label}</div><div className="mt-2 text-sm font-medium leading-6 text-zinc-200">{value}</div>{detail && <div className="mt-1 text-xs leading-5 text-zinc-600">{detail}</div>}</QuietCard>
}

export function ExploreHub({ relationships, capabilities, economy, onOpenRelationships, onOpenCapability, onOpenEconomy }: { relationships: RelationshipSummary[]; capabilities: CapabilitySummary[]; economy: EconomyOverview | null; onOpenRelationships: () => void; onOpenCapability: () => void; onOpenEconomy: () => void }) {
  const physical = capabilities.filter((item) => item.capability_kind === 'PHYSICAL_CAPACITY')
  return (
    <div className="mx-auto max-w-5xl"><div className="border-b border-zinc-900 pb-6"><Eyebrow>Explore</Eyebrow><h1 className="mt-1 text-3xl font-semibold tracking-tight">Understand the business</h1><p className="mt-2 text-sm text-zinc-600">Deeper context when you need it. None of this has to compete with Today for attention.</p></div><div className="mt-7 grid gap-4 md:grid-cols-3"><HubCard title="People + relationships" body={`${relationships.length} represented relationships. See recurrence, history, and value over time.`} action="Explore relationships" onClick={onOpenRelationships}><Metric label="Current/future" value={relationships.reduce((sum, item) => sum + item.current_future_count, 0)} /></HubCard><HubCard title="What we can deliver" body="Physical capacity, services, logistics, sourcing, and represented availability." action="Explore capability" onClick={onOpenCapability}><Metric label="Physical capacity" value={physical.length} /></HubCard><HubCard title="Money + performance" body="Revenue, collections, costs, contribution, funds, and asset economics without flattening them into one number." action="Explore economy" onClick={onOpenEconomy}><Metric label="Committed" value={money(economy?.committed_revenue_observed)} /></HubCard></div></div>
  )
}

function HubCard({ title, body, action, onClick, children }: { title: string; body: string; action: string; onClick: () => void; children: ReactNode }) {
  return <QuietCard className="flex min-h-64 flex-col p-5"><div className="text-lg font-semibold text-zinc-100">{title}</div><p className="mt-2 text-sm leading-6 text-zinc-600">{body}</p><div className="mt-5">{children}</div><button type="button" onClick={onClick} className="mt-auto pt-6 text-left text-sm font-semibold text-amber-400 hover:text-amber-300">{action} →</button></QuietCard>
}

export function SystemHub({ recovery, onOpenRecovery }: { recovery: RecoveryQueueItem[]; onOpenRecovery: () => void }) {
  const now = recovery.filter((item) => item.urgency === 'NOW' && item.status !== 'RESOLVED').length
  const open = recovery.filter((item) => item.status !== 'RESOLVED').length
  return <div className="mx-auto max-w-4xl"><div className="border-b border-zinc-900 pb-6"><Eyebrow>System</Eyebrow><h1 className="mt-1 text-3xl font-semibold tracking-tight">How well does Stage Presence understand itself?</h1><p className="mt-2 text-sm leading-6 text-zinc-600">Observability belongs here—not in the daily operating surface.</p></div><div className="mt-7 grid gap-4 sm:grid-cols-2"><QuietCard className="p-5"><div className="text-lg font-semibold text-zinc-100">Recovery + Reality Health</div><p className="mt-2 text-sm leading-6 text-zinc-600">Unknowns, conflicts, evidence gaps, and decision-relevant recovery candidates.</p><div className="mt-5 flex gap-6"><Metric label="Open" value={open} /><Metric label="Need attention now" value={now} /></div><button type="button" onClick={onOpenRecovery} className="mt-6 text-sm font-semibold text-amber-400">Open system health →</button></QuietCard><QuietCard className="p-5"><div className="text-lg font-semibold text-zinc-100">Governance</div><p className="mt-2 text-sm leading-6 text-zinc-600">Authority, evidence, AI review, and methodology remain backend/system concerns until a human decision requires them.</p><div className="mt-6 text-xs leading-6 text-zinc-700">No additional daily surface is earned yet.</div></QuietCard></div></div>
}
