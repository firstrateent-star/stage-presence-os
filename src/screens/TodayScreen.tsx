import { useMemo, type ReactNode } from 'react'
import { EngagementCard } from '../components/EngagementCard'
import { buildBusinessSignals, engagementDateLabel, type CapacityPressure, type CapacityTruthPriority, type RelationshipSignal } from '../lib/businessSignals'
import type { EngagementRelationship } from '../lib/engagementRelationships'
import type { EngagementFinancialFact } from '../lib/financialFacts'
import type { ConfiguredResourceLink, CustomerLink } from '../lib/repository'
import type { Engagement, EngagementFact, LedgerEvent } from '../types/domain'

export function TodayScreen({
  engagements,
  events,
  customerLinks,
  configuredLinks,
  attentionFacts,
  engagementRelationships,
  financialFacts,
  onOpen,
}: {
  engagements: Engagement[]
  events: LedgerEvent[]
  customerLinks: CustomerLink[]
  configuredLinks: ConfiguredResourceLink[]
  attentionFacts: EngagementFact[]
  engagementRelationships: EngagementRelationship[]
  financialFacts: EngagementFinancialFact[]
  onOpen: (id: string) => void
}) {
  const signals = useMemo(
    () => buildBusinessSignals(engagements, customerLinks, configuredLinks, attentionFacts, engagementRelationships, financialFacts),
    [engagements, customerLinks, configuredLinks, attentionFacts, engagementRelationships, financialFacts],
  )

  const delivery = signals.protect_delivery.slice(0, 6)
  const demand = signals.convert_demand.slice(0, 6)
  const pressure = signals.capacity_pressure.slice(0, 6)
  const capacityTruth = signals.capacity_truth_priorities.slice(0, 6)
  const recurringRelationships = signals.relationships.filter((item) => item.engagements.length > 1).slice(0, 4)
  const unresolved = signals.unresolved_facts.slice(0, 6)

  return (
    <div className="sm:ml-48">
      <div className="mb-7">
        <p className="text-sm text-zinc-500">Where should Stage Presence attention go?</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Today</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-500">Protect delivery first, convert legitimate demand, protect scarce capacity, resolve material uncertainty, and deepen valuable relationships.</p>
      </div>

      <div className="mb-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SignalStat label="Delivery ≤21d" value={delivery.length} />
        <SignalStat label="Open demand" value={signals.convert_demand.length} />
        <SignalStat label="Capacity pressure" value={signals.capacity_pressure.length} />
        <SignalStat label="Recurring relationships" value={signals.relationships.filter((item) => item.engagements.length > 1).length} />
      </div>

      <Section title="Protect Delivery" count={delivery.length} description="Committed work approaching now. The goal is reliable execution, not more selling.">
        {delivery.length ? delivery.map((item) => <EngagementCard key={item.id} engagement={item} onOpen={onOpen} />) : <Empty text="No committed work falls inside the next 21 days." />}
      </Section>

      <Section title="Convert Demand" count={signals.convert_demand.length} description="Open commercial opportunities, ordered by event date. Quote status is not the same thing as commitment.">
        {demand.length ? demand.map((item) => <EngagementCard key={item.id} engagement={item} onOpen={onOpen} />) : <Empty text="No active commercial demand is waiting for movement." />}
      </Section>

      <Section title="Capacity Pressure" count={signals.capacity_pressure.length} description="Overlapping configured physical resources where at least one Engagement is committed. These are review signals—not confirmed reservation conflicts.">
        {pressure.length ? pressure.map((item) => <CapacityCard key={item.id} pressure={item} onOpen={onOpen} />) : <Empty text="No configured physical-resource overlap currently requires review." />}
      </Section>

      <Section title="Verify Capacity Truth" count={signals.capacity_truth_priorities.length} description="Do not inventory everything. Verify the uncertain assets whose truth can actually change a commitment decision.">
        {capacityTruth.length ? capacityTruth.map((item) => <CapacityTruthCard key={item.resource_id} priority={item} />) : <Empty text="No unverified physical resource currently has enough decision leverage to surface." />}
      </Section>

      <Section title="Relationships" count={recurringRelationships.length} description="Repeated customer nodes deserve relationship-level attention. Program components are separated from independent commercial breadth so execution count is not mistaken for diversification.">
        {recurringRelationships.length ? recurringRelationships.map((item) => <RelationshipCard key={item.party_id} relationship={item} onOpen={onOpen} />) : <Empty text="No recurring customer relationship is visible in the current evidence yet." />}
      </Section>

      <Section title="Unresolved Truth" count={signals.unresolved_facts.length} description="Unknown or conflicting facts stay visible until evidence resolves them.">
        {unresolved.length ? unresolved.map(({ fact, engagement }) => (
          <button key={fact.id} type="button" onClick={() => onOpen(engagement.id)} className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-4 text-left hover:border-zinc-700">
            <div className="flex items-start justify-between gap-3">
              <div><div className="text-sm font-semibold text-zinc-200">{fact.label}</div><div className="mt-1 text-xs text-zinc-600">{engagement.name}</div></div>
              <span className={fact.certainty_state === 'CONFLICTING' ? 'text-xs font-semibold text-red-300' : 'text-xs font-semibold text-amber-400'}>{fact.certainty_state}</span>
            </div>
            {fact.value_text && <p className="mt-3 text-sm leading-6 text-zinc-400">{fact.value_text}</p>}
          </button>
        )) : <Empty text="No material unknown or conflicting facts are currently surfaced." />}
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

function SignalStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-4"><div className="text-2xl font-semibold text-zinc-100">{value}</div><div className="mt-1 text-xs text-zinc-600">{label}</div></div>
}

function CapacityCard({ pressure, onOpen }: { pressure: CapacityPressure; onOpen: (id: string) => void }) {
  const inferred = [pressure.first_window_state, pressure.second_window_state].some((state) => state === 'INFERRED_FROM_EVENT' || state === 'UNKNOWN')
  return (
    <div className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div><div className="font-semibold text-zinc-200">{pressure.resource_name}</div><div className="mt-1 text-xs text-zinc-600">Quantity evidence: {pressure.resource_quantity ?? 'unknown'} · {pressure.quantity_state}</div></div>
        <span className={pressure.severity === 'HIGH' ? 'text-xs font-bold text-red-300' : 'text-xs font-bold text-amber-400'}>{pressure.severity}</span>
      </div>
      <div className="mt-4 grid gap-2">
        {[pressure.first, pressure.second].map((engagement) => (
          <button key={engagement.id} type="button" onClick={() => onOpen(engagement.id)} className="rounded-xl border border-zinc-900 px-3 py-3 text-left hover:border-zinc-700">
            <div className="text-sm font-medium text-zinc-300">{engagement.name}</div>
            <div className="mt-1 text-xs text-zinc-600">{engagementDateLabel(engagement)} · {engagement.commercial_state} · {engagement.commitment_state}</div>
          </button>
        ))}
      </div>
      <div className="mt-3 text-[10px] font-semibold tracking-wide text-zinc-700">WINDOW EVIDENCE · {pressure.first_window_state.replaceAll('_', ' ')} / {pressure.second_window_state.replaceAll('_', ' ')}</div>
      <p className="mt-2 text-xs leading-5 text-zinc-600">{inferred ? 'Timing is provisional. Verify actual possession/load-in/return windows before treating this as a capacity conflict.' : 'Requirement windows have stronger evidence, but this is still a pressure signal until reservation truth exists.'}</p>
    </div>
  )
}

function CapacityTruthCard({ priority }: { priority: CapacityTruthPriority }) {
  return (
    <div className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div><div className="font-semibold text-zinc-200">{priority.resource_name}</div><div className="mt-1 text-xs text-zinc-600">{priority.category} · quantity {priority.quantity ?? 'unknown'} · {priority.quantity_state}</div></div>
        {priority.pressure_count > 0 && <span className="text-xs font-bold text-amber-400">DECISION LEVERAGE</span>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-600">
        <span>{priority.engagement_count} configured Engagements</span><span>•</span><span>{priority.committed_count} committed</span><span>•</span><span>{priority.open_count} open</span>{priority.pressure_count > 0 && <><span>•</span><span>{priority.pressure_count} pressure signal{priority.pressure_count === 1 ? '' : 's'}</span></>}
      </div>
      <p className="mt-3 text-xs leading-5 text-zinc-600">Verification is valuable because this resource participates in live commitment decisions—not because the database wants every field filled in.</p>
    </div>
  )
}

function RelationshipCard({ relationship, onOpen }: { relationship: RelationshipSignal; onOpen: (id: string) => void }) {
  const latest = [...relationship.engagements].sort((a, b) => (b.event_start_date ?? '').localeCompare(a.event_start_date ?? ''))[0]
  return (
    <div className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-4">
      <div className="font-semibold text-zinc-200">{relationship.name}</div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-600">
        <span>{relationship.engagements.length} Engagements</span>
        {relationship.program_count > 0 && <><span>•</span><span>{relationship.program_count} program{relationship.program_count === 1 ? '' : 's'}</span></>}
        {relationship.program_component_count > 0 && <><span>•</span><span>{relationship.program_component_count} components</span></>}
        <span>•</span><span>{relationship.independent_engagement_count} independent scope{relationship.independent_engagement_count === 1 ? '' : 's'}</span>
        <span>•</span><span>{relationship.won_count} won</span>
        {relationship.open_count > 0 && <><span>•</span><span>{relationship.open_count} open</span></>}
      </div>
      {relationship.known_value > 0 && <div className="mt-3 text-sm text-zinc-400">Known contract value <span className="font-semibold text-zinc-200">{formatMoney(relationship.known_value)}</span> <span className="text-xs text-zinc-700">(typed financial evidence)</span></div>}
      {relationship.program_component_count > 0 && <p className="mt-3 text-xs leading-5 text-zinc-600">Program grouping may be inferred. It reduces false diversification but does not change verified commercial, financial or capacity facts.</p>}
      {latest && <button type="button" onClick={() => onOpen(latest.id)} className="mt-4 text-xs font-semibold text-amber-500 hover:text-amber-300">Open latest Engagement →</button>}
    </div>
  )
}

function Section({ title, count, description, children }: { title: string; count: number; description: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <div className="mb-3">
        <div className="flex items-center gap-2"><h2 className="text-lg font-semibold">{title}</h2><span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs text-zinc-500">{count}</span></div>
        <p className="mt-1 text-xs leading-5 text-zinc-600">{description}</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">{children}</div>
    </section>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-zinc-800 p-5 text-sm text-zinc-600">{text}</div>
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}
