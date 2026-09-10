import type { EngagementFrontendRow } from '../lib/operatingRepository'
import {
  byMostRecentEngagement,
  bySoonestEngagement,
  isCommittedEngagement,
  isOpportunityEngagement,
  isPastEngagement,
  localDateKey,
  presentEngagementCard,
  type EngagementCardMode,
} from '../lib/presentationModel'

export function OperatingWorkScreen({ rows, onOpen }: { rows: EngagementFrontendRow[]; onOpen: (id: string) => void }) {
  const today = localDateKey(new Date())
  const opportunities = rows.filter((row) => isOpportunityEngagement(row) && !isPastEngagement(row, today)).sort(bySoonestEngagement)
  const upcoming = rows.filter((row) => isCommittedEngagement(row) && row.operational_state !== 'CLOSED' && !isPastEngagement(row, today)).sort(bySoonestEngagement)
  const history = rows.filter((row) => !opportunities.some((item) => item.id === row.id) && !upcoming.some((item) => item.id === row.id)).sort(byMostRecentEngagement)

  return (
    <div className="sm:ml-48">
      <header className="mb-8">
        <p className="text-sm text-zinc-500">One business reality, organized the way the team experiences it.</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Work</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">Commercial position, delivery readiness, money, capacity and next movement come through a presentation boundary rather than exposing backend structure directly.</p>
      </header>

      <div className="mb-8 grid grid-cols-3 gap-3">
        <WorkStat label="Opportunities" value={opportunities.length} />
        <WorkStat label="Upcoming jobs" value={upcoming.length} />
        <WorkStat label="Past / resolve" value={history.length} />
      </div>

      <WorkSection title="Opportunities" count={opportunities.length} description="Demand that can still move commercially.">
        {opportunities.length ? opportunities.map((row) => <OperatingCard key={row.id} row={row} onOpen={onOpen} mode="opportunity" />) : <Empty text="No current opportunity is waiting for movement." />}
      </WorkSection>

      <WorkSection title="Upcoming Jobs" count={upcoming.length} description="Committed work Stage Presence is responsible for protecting and delivering.">
        {upcoming.length ? upcoming.map((row) => <OperatingCard key={row.id} row={row} onOpen={onOpen} mode="job" />) : <Empty text="No committed upcoming work is represented." />}
      </WorkSection>

      <WorkSection title="Past / Needs Resolution" count={history.length} description="History remains accessible for learning without cluttering active sales and delivery.">
        {history.length ? history.slice(0, 24).map((row) => <OperatingCard key={row.id} row={row} onOpen={onOpen} mode="history" />) : <Empty text="No historical or stale work is represented." />}
      </WorkSection>
    </div>
  )
}

function OperatingCard({ row, onOpen, mode }: { row: EngagementFrontendRow; onOpen: (id: string) => void; mode: Extract<EngagementCardMode, 'opportunity' | 'job' | 'history'> }) {
  const card = presentEngagementCard(row, mode)

  return (
    <button type="button" onClick={() => onOpen(card.id)} className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-4 text-left transition hover:border-zinc-700 hover:bg-zinc-900/50">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium tracking-[0.08em] text-zinc-600">{card.eyebrow}</div>
          <h3 className="mt-1 text-lg font-semibold text-zinc-100">{card.title}</h3>
          <div className="mt-1 text-xs text-zinc-600">{card.context}</div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="rounded-full border border-zinc-900 px-2.5 py-1 text-[10px] font-semibold text-zinc-500">{card.stateLabel}</span>
          {card.capacityLabel && <span className="rounded-full border border-amber-900/60 px-2 py-1 text-[10px] font-semibold text-amber-500">{card.capacityLabel}</span>}
        </div>
      </div>

      {card.narrative && <p className="mt-4 line-clamp-2 text-sm leading-6 text-zinc-400">{card.narrative}</p>}

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-zinc-900 pt-3">
        <TinyStat label={card.valueLabel || 'Value'} value={card.valueText || '—'} />
        <TinyStat label="Open actions" value={card.openActionsText} />
        <TinyStat label="Plan lines" value={card.planLinesText} />
      </div>

      <div className="mt-4 rounded-xl bg-zinc-900/45 px-3 py-3">
        <div className="text-[10px] font-semibold tracking-[0.12em] text-zinc-600">{card.movementLabel}</div>
        <div className="mt-1 text-sm font-medium text-zinc-300">{card.movementText}</div>
        {card.movementDetail && <div className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-600">{card.movementDetail}</div>}
      </div>
    </button>
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

function WorkStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-4"><div className="text-2xl font-semibold text-zinc-100">{value}</div><div className="mt-1 text-xs text-zinc-600">{label}</div></div>
}

function TinyStat({ label, value }: { label: string; value: string }) {
  return <div><div className="truncate text-[9px] font-semibold uppercase tracking-[0.1em] text-zinc-700">{label}</div><div className="mt-1 truncate text-xs font-medium text-zinc-400">{value}</div></div>
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-zinc-900 bg-zinc-950/30 p-5 text-sm leading-6 text-zinc-600">{text}</div>
}
