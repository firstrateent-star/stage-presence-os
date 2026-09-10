import { EngagementSummaryCard } from '../components/EngagementSummaryCard'
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
  return <EngagementSummaryCard card={presentEngagementCard(row, mode)} onOpen={onOpen} />
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

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-zinc-900 bg-zinc-950/30 p-5 text-sm leading-6 text-zinc-600">{text}</div>
}
