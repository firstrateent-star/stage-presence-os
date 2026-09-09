import { useMemo, type ReactNode } from 'react'
import { EngagementCard } from '../components/EngagementCard'
import { buildBusinessSignals, engagementDateLabel, type CapacityPressure, type CapacityTruthPriority, type RelationshipSignal } from '../lib/businessSignals'
import { buildDecisionSignals, buildResolutionQueues, type DecisionSignal, type ResolutionQueue } from '../lib/decisionResolver'
import type { EngagementRelationship } from '../lib/engagementRelationships'
import type { EngagementFinancialFact } from '../lib/financialFacts'
import type { LearningReviewSignal } from '../lib/learningCloseout'
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
  learningReviewSignals,
  onOpen,
}: {
  engagements: Engagement[]
  events: LedgerEvent[]
  customerLinks: CustomerLink[]
  configuredLinks: ConfiguredResourceLink[]
  attentionFacts: EngagementFact[]
  engagementRelationships: EngagementRelationship[]
  financialFacts: EngagementFinancialFact[]
  learningReviewSignals: LearningReviewSignal[]
  onOpen: (id: string) => void
}) {
  const signals = useMemo(
    () => buildBusinessSignals(engagements, customerLinks, configuredLinks, attentionFacts, engagementRelationships, financialFacts),
    [engagements, customerLinks, configuredLinks, attentionFacts, engagementRelationships, financialFacts],
  )

  const decisions = useMemo(
    () => buildDecisionSignals(engagements, customerLinks, configuredLinks, attentionFacts, financialFacts, signals.capacity_pressure),
    [engagements, customerLinks, configuredLinks, attentionFacts, financialFacts, signals.capacity_pressure],
  )

  const resolutionQueues = useMemo(() => buildResolutionQueues(decisions), [decisions])
  const delivery = signals.protect_delivery.slice(0, 6)
  const demand = signals.convert_demand.slice(0, 6)
  const pressure = signals.capacity_pressure.slice(0, 6)
  const capacityTruth = signals.capacity_truth_priorities.slice(0, 6)
  const recurringRelationships = signals.relationships.filter((item) => item.engagements.length > 1).slice(0, 4)
  const unresolved = signals.unresolved_facts.slice(0, 6)
  const learning = learningReviewSignals.slice(0, 6)
  const activeDecisions = decisions.filter((item) => item.decision !== 'LEARN_RESOLVE')
  const decisionFlow = activeDecisions.slice(0, 6)
  const ownerQueues = resolutionQueues.filter((queue) => queue.owner !== 'SYSTEM').slice(0, 5)

  return (
    <div className="sm:ml-48">
      <div className="mb-7">
        <p className="text-sm text-zinc-500">Where should Stage Presence attention go?</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Today</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-500">Protect delivery first, convert legitimate demand, protect scarce capacity, resolve material uncertainty, deepen valuable relationships, and retain what the business learns.</p>
      </div>

      <div className="mb-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SignalStat label="Delivery ≤21d" value={delivery.length} />
        <SignalStat label="Open demand" value={signals.convert_demand.length} />
        <SignalStat label="Capacity pressure" value={signals.capacity_pressure.length} />
        <SignalStat label="Recurring relationships" value={signals.relationships.filter((item) => item.engagements.length > 1).length} />
      </div>

      <Section title="Decision Flow" count={activeDecisions.length} description="Advisory only. What decision is next, what evidence can change it, how should the gap be resolved with the least re-entry, and who should own the exception? This does not mutate state, create reservations, or message customers.">
        {decisionFlow.length ? decisionFlow.map((item) => <DecisionCard key={item.engagement.id} decision={item} onOpen={onOpen} />) : <Empty text="No active Engagement currently has a derived decision." />}
      </Section>

      <Section title="Resolution Queues" count={ownerQueues.length} description="Group repeated decision gaps by the role that can actually clear them. The goal is not more task lists; it is fewer duplicated questions and fewer unnecessary Greg handoffs.">
        {ownerQueues.length ? ownerQueues.map((queue) => <ResolutionQueueCard key={queue.owner} queue={queue} onOpen={onOpen} />) : <Empty text="No role-specific resolution work is currently derived." />}
      </Section>

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

      <Section title="Learn / Resolve" count={learningReviewSignals.length} description="Past-dated work is not automatically complete. Surface only the reason Stage Presence should learn or resolve history instead of silently guessing what happened.">
        {learning.length ? learning.map((item) => <LearningCard key={item.engagement_id} signal={item} onOpen={onOpen} />) : <Empty text="No past Engagement currently needs a learning or stale-history review." />}
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

function DecisionCard({ decision, onOpen }: { decision: DecisionSignal; onOpen: (id: string) => void }) {
  const blocking = decision.gaps.filter((gap) => gap.severity === 'BLOCKING')
  const shownGaps = [...blocking, ...decision.gaps.filter((gap) => gap.severity !== 'BLOCKING')].slice(0, 3)
  const evidenceClass = decision.evidence_state === 'BLOCKED' ? 'text-red-300' : decision.evidence_state === 'REVIEW' ? 'text-amber-400' : 'text-emerald-400'
  return (
    <button type="button" onClick={() => onOpen(decision.engagement.id)} className="rounded-2xl border border-emerald-950 bg-emerald-950/10 p-4 text-left hover:border-emerald-800/70">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[10px] font-bold tracking-[0.12em] text-emerald-400">{decision.decision_label.toUpperCase()}</div>
            <div className={`text-[10px] font-bold tracking-[0.08em] ${evidenceClass}`}>{decision.evidence_state}</div>
          </div>
          <div className="mt-1 font-semibold text-zinc-200">{decision.engagement.name}</div>
          <div className="mt-1 text-xs text-zinc-600">{decision.engagement.engagement_number} · {engagementDateLabel(decision.engagement)}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-semibold text-zinc-500">OWNER</div>
          <div className="mt-1 text-xs font-bold text-zinc-300">{decision.primary_owner}</div>
          <div className={decision.greg_required ? 'mt-1 text-[10px] font-semibold text-red-300' : 'mt-1 text-[10px] font-semibold text-zinc-700'}>{decision.greg_required ? 'GREG REQUIRED' : 'NO GREG EXCEPTION'}</div>
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-zinc-500">{decision.why_now}</p>

      {decision.strong_evidence.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {decision.strong_evidence.slice(0, 4).map((item) => <span key={item} className="rounded-full border border-zinc-900 px-2 py-1 text-[10px] text-zinc-600">{item}</span>)}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {shownGaps.length ? shownGaps.map((gap) => (
          <div key={gap.code} className="rounded-xl border border-zinc-900 px-3 py-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs leading-5 text-zinc-400">{gap.label}</div>
              <div className="shrink-0 text-right"><div className={gap.severity === 'BLOCKING' ? 'text-[9px] font-bold text-red-300' : gap.severity === 'MATERIAL' ? 'text-[9px] font-bold text-amber-400' : 'text-[9px] font-bold text-zinc-600'}>{gap.severity}</div><div className="mt-0.5 text-[9px] text-zinc-700">{gap.owner}</div></div>
            </div>
            <div className="mt-2 text-[9px] font-semibold tracking-[0.08em] text-zinc-700">{gap.resolution_strategy.replaceAll('_', ' ')}</div>
            <p className="mt-1 text-[10px] leading-4 text-zinc-700">{gap.resolution_hint}</p>
          </div>
        )) : <div className="rounded-xl border border-emerald-950/80 px-3 py-2.5 text-xs text-emerald-500">No material exception is currently derived for this decision.</div>}
      </div>

      <div className="mt-3 text-[10px] font-semibold tracking-wide text-zinc-700">DUE · {decision.due_label}</div>
    </button>
  )
}

function ResolutionQueueCard({ queue, onOpen }: { queue: ResolutionQueue; onOpen: (id: string) => void }) {
  const first = queue.items[0]
  return (
    <div className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold tracking-[0.12em] text-zinc-500">RESOLUTION OWNER</div>
          <div className="mt-1 text-lg font-semibold text-zinc-200">{queue.owner}</div>
        </div>
        <div className="flex gap-2 text-[10px] font-bold">
          {queue.blocking > 0 && <span className="rounded-full border border-red-950 px-2 py-1 text-red-300">{queue.blocking} blocking</span>}
          {queue.material > 0 && <span className="rounded-full border border-amber-950 px-2 py-1 text-amber-400">{queue.material} material</span>}
          {queue.watch > 0 && <span className="rounded-full border border-zinc-900 px-2 py-1 text-zinc-600">{queue.watch} watch</span>}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {queue.top_gaps.slice(0, 3).map((gap) => (
          <div key={`${gap.code}:${gap.resolution_strategy}`} className="rounded-xl border border-zinc-900 px-3 py-2.5">
            <div className="flex items-start justify-between gap-3"><div className="text-xs leading-5 text-zinc-400">{gap.label}</div><div className="shrink-0 text-xs font-semibold text-zinc-500">×{gap.count}</div></div>
            <div className="mt-1 text-[9px] font-semibold tracking-[0.08em] text-zinc-700">{gap.resolution_strategy.replaceAll('_', ' ')}</div>
          </div>
        ))}
      </div>

      {first && (
        <button type="button" onClick={() => onOpen(first.engagement.id)} className="mt-4 text-xs font-semibold text-emerald-500 hover:text-emerald-300">
          Open highest-priority {first.decision_label.toLowerCase()} →
        </button>
      )}
      {queue.owner === 'GREG' && queue.blocking === 0 && <p className="mt-3 text-xs text-zinc-600">No founder-level blocking exception is currently derived.</p>}
    </div>
  )
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

function LearningCard({ signal, onOpen }: { signal: LearningReviewSignal; onOpen: (id: string) => void }) {
  const copy: Record<LearningReviewSignal['review_reason'], { label: string; text: string }> = {
    DELIVERY_LEARNING: { label: 'LEARN FROM DELIVERY', text: 'This appears commercially committed and past-dated. Capture actuals only if someone knows what really happened.' },
    STALE_COMMERCIAL: { label: 'RESOLVE STALE DEMAND', text: 'The date has passed but the opportunity remains commercially open. Resolve the commercial outcome instead of silently marking it lost.' },
    PROGRAM_REVIEW: { label: 'REVIEW PROGRAM PARENT', text: 'This record appears to contain program components. Confirm what the parent represents before treating its date as a delivered event.' },
    RESOLVE_CONFLICT: { label: 'RESOLVE CONFLICT', text: 'Conflicting source truth exists. Resolve the evidence before learning from this record.' },
    REVIEW: { label: 'REVIEW HISTORY', text: 'The date has passed, but the current evidence does not support a stronger conclusion.' },
  }
  const detail = copy[signal.review_reason]
  return (
    <button type="button" onClick={() => onOpen(signal.engagement_id)} className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-4 text-left hover:border-zinc-700">
      <div className="flex items-start justify-between gap-3">
        <div><div className="font-semibold text-zinc-200">{signal.name}</div><div className="mt-1 text-xs text-zinc-600">{signal.engagement_number} · ended {signal.event_end_date}</div></div>
        <span className={signal.review_reason === 'RESOLVE_CONFLICT' ? 'text-[10px] font-bold tracking-wide text-red-300' : 'text-[10px] font-bold tracking-wide text-amber-400'}>{detail.label}</span>
      </div>
      <p className="mt-3 text-xs leading-5 text-zinc-500">{detail.text}</p>
    </button>
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
