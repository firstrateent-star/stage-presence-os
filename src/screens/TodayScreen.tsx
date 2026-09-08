import type { ReactNode } from 'react'
import { EngagementCard } from '../components/EngagementCard'
import { isWaiting, needsHumanAttention } from '../lib/attention'
import type { Engagement, LedgerEvent } from '../types/domain'

export function TodayScreen({ engagements, events, onOpen }: { engagements: Engagement[]; events: LedgerEvent[]; onOpen: (id: string) => void }) {
  const needsYou = engagements.filter((item) => needsHumanAttention(item))
  const waiting = engagements.filter((item) => isWaiting(item))
  const upcoming = engagements
    .filter((item) => item.event_start)
    .sort((a, b) => new Date(a.event_start!).getTime() - new Date(b.event_start!).getTime())
    .slice(0, 4)

  return (
    <div className="sm:ml-48">
      <div className="mb-8">
        <p className="text-sm text-zinc-500">What requires human attention right now?</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Today</h1>
      </div>

      <Section title="Needs You" count={needsYou.length}>
        {needsYou.length ? needsYou.map((item) => <EngagementCard key={item.id} engagement={item} onOpen={onOpen} />) : <Empty text="Nothing currently needs intervention." />}
      </Section>

      <Section title="Waiting" count={waiting.length}>
        {waiting.length ? waiting.map((item) => <EngagementCard key={item.id} engagement={item} onOpen={onOpen} />) : <Empty text="Nothing is intentionally waiting." />}
      </Section>

      <Section title="Upcoming" count={upcoming.length}>
        {upcoming.length ? upcoming.map((item) => <EngagementCard key={item.id} engagement={item} onOpen={onOpen} />) : <Empty text="No upcoming dates are known yet." />}
      </Section>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">Recently Changed</h2></div>
        <div className="overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-950/70">
          {events.length ? events.slice(0, 8).map((event) => (
            <div key={event.id} className="border-b border-zinc-900 px-4 py-3 last:border-b-0">
              <div className="text-sm text-zinc-300">{event.summary ?? event.event_type.replaceAll('_', ' ')}</div>
              <div className="mt-1 text-xs text-zinc-600">{new Date(event.created_at).toLocaleString()}</div>
            </div>
          )) : <div className="p-4 text-sm text-zinc-600">No activity yet.</div>}
        </div>
      </section>
    </div>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs text-zinc-500">{count}</span>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">{children}</div>
    </section>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-zinc-800 p-5 text-sm text-zinc-600">{text}</div>
}
