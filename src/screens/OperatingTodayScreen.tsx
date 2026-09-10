import { EngagementSummaryCard } from '../components/EngagementSummaryCard'
import type { DailyWorkRow, EngagementFrontendRow, MovementCandidateRow, RelationshipSummaryRow } from '../lib/operatingRepository'
import {
  bySoonestEngagement,
  formatMoney,
  isCommittedEngagement,
  isOpportunityEngagement,
  isPastEngagement,
  localDateKey,
  presentEngagementCard,
} from '../lib/presentationModel'

export function OperatingTodayScreen({
  engagements,
  work,
  focus,
  relationships,
  onOpen,
}: {
  engagements: EngagementFrontendRow[]
  work: DailyWorkRow[]
  focus: MovementCandidateRow[]
  relationships: RelationshipSummaryRow[]
  onOpen: (id: string) => void
}) {
  const now = localDateKey(new Date())
  const needsYou = work.filter((item) => item.priority === 'NOW' || item.status === 'BLOCKED').slice(0, 8)
  const systemSees = focus
    .filter((item) => item.engagement_focus_rank === 1 && (item.urgency === 'NOW' || item.urgency === 'SOON'))
    .slice(0, 6)
  const nextUp = engagements.filter((row) => isCommittedEngagement(row) && !isPastEngagement(row, now)).sort(bySoonestEngagement).slice(0, 6)
  const sales = engagements.filter((row) => isOpportunityEngagement(row) && !isPastEngagement(row, now)).sort(bySoonestEngagement).slice(0, 6)
  const capacity = engagements.filter((row) => row.capacity_signal === 'HIGH' || row.capacity_signal === 'WATCH').slice(0, 6)
  const recurring = relationships.filter((row) => row.engagement_count > 1).slice(0, 5)
  const knownCommitted = engagements.reduce((sum, row) => {
    if (!isCommittedEngagement(row)) return sum
    const economics = asRecord(row.economics)
    const value = numberValue(economics?.committed_revenue_observed)
    return sum + (value ?? 0)
  }, 0)

  return (
    <div className="sm:ml-48">
      <header className="mb-8">
        <p className="text-sm text-zinc-500">What actually matters now?</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Today</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">The system holds the detail. This surface concentrates attention on movement, delivery, capacity, relationships and trustworthy economics.</p>
          </div>
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950/70 px-4 py-3 text-right">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-700">Known committed value</div>
            <div className="mt-1 text-xl font-semibold text-zinc-200">{formatMoney(knownCommitted)}</div>
            <div className="mt-1 text-[10px] text-zinc-700">Only represented committed value; unknown allocations stay unknown.</div>
          </div>
        </div>
      </header>

      <TodaySection title="Needs You" description="Persisted work already carrying business continuity. These are real represented actions, not model suggestions." count={needsYou.length}>
        {needsYou.length ? needsYou.map((item) => <ActionCard key={item.id} item={item} onOpen={onOpen} />) : <Empty text="No NOW or blocked operating action is represented." />}
      </TodaySection>

      <TodaySection title="System Sees" description="Selective Flower signals derived from current reality. They explain likely movement but remain suggestions until the business earns a durable action." count={systemSees.length}>
        {systemSees.length ? systemSees.map((item) => <FocusCard key={item.candidate_key} item={item} onOpen={onOpen} />) : <Empty text="No uncovered NOW or SOON movement signal is currently represented." />}
      </TodaySection>

      <TodaySection title="Next Up" description="Committed work approaching delivery." count={nextUp.length}>
        {nextUp.length ? nextUp.map((row) => <EngagementSummaryCard key={row.id} card={presentEngagementCard(row, 'delivery')} onOpen={onOpen} compact />) : <Empty text="No upcoming committed work is represented." />}
      </TodaySection>

      <TodaySection title="Sales" description="Open demand that still needs a commercial decision." count={sales.length}>
        {sales.length ? sales.map((row) => <EngagementSummaryCard key={row.id} card={presentEngagementCard(row, 'sales')} onOpen={onOpen} compact />) : <Empty text="No current sales movement is represented." />}
      </TodaySection>

      <TodaySection title="Capacity" description="Pressure signals only. Configuration and signature do not automatically create a reservation." count={capacity.length}>
        {capacity.length ? capacity.map((row) => <EngagementSummaryCard key={row.id} card={presentEngagementCard(row, 'capacity')} onOpen={onOpen} compact capacityMode />) : <Empty text="No WATCH or HIGH capacity signal is currently represented." />}
      </TodaySection>

      <TodaySection title="Relationships" description="Recurring relationship nodes that can compound value beyond one job." count={recurring.length}>
        {recurring.length ? recurring.map((row) => <RelationshipCard key={row.party_id} row={row} />) : <Empty text="No recurring relationship node is represented yet." />}
      </TodaySection>
    </div>
  )
}

function TodaySection({ title, description, count, children }: { title: string; description: string; count: number; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <div className="mb-3">
        <div className="flex items-center gap-2"><h2 className="text-lg font-semibold text-zinc-200">{title}</h2><span className="rounded-full border border-zinc-900 px-2 py-0.5 text-[10px] text-zinc-600">{count}</span></div>
        <p className="mt-1 text-xs leading-5 text-zinc-600">{description}</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">{children}</div>
    </section>
  )
}

function ActionCard({ item, onOpen }: { item: DailyWorkRow; onOpen: (id: string) => void }) {
  const canOpen = Boolean(item.engagement_id)
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-600">{item.priority} · {item.action_type.replaceAll('_', ' ')}</div>
          <div className="mt-1 text-base font-semibold text-zinc-200">{item.title}</div>
          {item.engagement_name && <div className="mt-1 text-xs text-zinc-600">{item.engagement_name}</div>}
        </div>
        <div className="rounded-full border border-zinc-900 px-2 py-1 text-[10px] text-zinc-600">{item.owner_display_name || item.owner_username || 'Unassigned'}</div>
      </div>
      {item.why_now && <p className="mt-3 text-sm leading-6 text-zinc-500">{item.why_now}</p>}
      <div className="mt-3 flex items-center justify-between gap-4 text-xs text-zinc-700">
        <span>{item.due_date ? `Due ${dateText(item.due_date)}` : 'No due date represented'}</span>
        {item.success_condition && <span className="truncate text-right">Done when: {item.success_condition}</span>}
      </div>
    </>
  )
  return canOpen ? <button type="button" onClick={() => onOpen(item.engagement_id!)} className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-4 text-left hover:border-zinc-700">{body}</button> : <div className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-4">{body}</div>
}

function FocusCard({ item, onOpen }: { item: MovementCandidateRow; onOpen: (id: string) => void }) {
  return (
    <button type="button" onClick={() => onOpen(item.engagement_id)} className="rounded-2xl border border-zinc-900 bg-zinc-950/50 p-4 text-left transition hover:border-zinc-700">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-600">{item.urgency} · {item.focus_domain.replaceAll('_', ' ')}</div>
          <div className="mt-1 text-base font-semibold text-zinc-200">{item.step_title}</div>
          <div className="mt-1 text-xs text-zinc-600">{item.engagement_name}</div>
        </div>
        <span className="shrink-0 rounded-full border border-zinc-900 px-2 py-1 text-[10px] text-zinc-600">{item.recommended_handling.toLowerCase()}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-zinc-500">{item.why_now}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-900 pt-3 text-[10px] text-zinc-700">
        <span>System suggestion · not a task</span>
        <span>{item.materiality.toLowerCase()} materiality · {item.certainty_state.toLowerCase()} basis</span>
      </div>
    </button>
  )
}

function RelationshipCard({ row }: { row: RelationshipSummaryRow }) {
  return <div className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-4"><div className="flex items-start justify-between gap-4"><div><div className="font-semibold text-zinc-200">{row.name}</div>{row.organization_name && <div className="mt-1 text-xs text-zinc-600">{row.organization_name}</div>}</div><div className="text-right"><div className="text-lg font-semibold text-zinc-300">{row.engagement_count}</div><div className="text-[10px] text-zinc-700">Engagements</div></div></div><div className="mt-3 flex justify-between border-t border-zinc-900 pt-3 text-xs text-zinc-600"><span>{row.current_future_count} current / future</span><span>{formatMoney(Number(row.committed_revenue_observed || 0))} observed committed</span></div></div>
}

function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-zinc-900 bg-zinc-950/30 p-5 text-sm leading-6 text-zinc-600">{text}</div> }
function dateText(key: string) { return new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }
function asRecord(value: unknown): Record<string, unknown> | null { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null }
function numberValue(value: unknown) { if (typeof value === 'number' && Number.isFinite(value)) return value; if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value); return null }
