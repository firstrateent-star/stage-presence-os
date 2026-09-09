import { useMemo } from 'react'
import { buildBusinessSignals, engagementDateLabel } from '../lib/businessSignals'
import { buildDecisionSignals, buildResolutionQueues } from '../lib/decisionResolver'
import { buildAttentionSummary, buildExceptionItems } from '../lib/exceptionEngine'
import type { EngagementRelationship } from '../lib/engagementRelationships'
import type { EngagementFinancialFact } from '../lib/financialFacts'
import type { LearningReviewSignal } from '../lib/learningCloseout'
import type { ConfiguredResourceLink, CustomerLink } from '../lib/repository'
import type { Engagement, EngagementFact, LedgerEvent } from '../types/domain'

export function GregTodayScreen({
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

  const attention = useMemo(() => buildAttentionSummary(decisions), [decisions])
  const exceptionItems = useMemo(() => buildExceptionItems(decisions), [decisions])
  const resolutionQueues = useMemo(() => buildResolutionQueues(decisions), [decisions])

  const gregItems = exceptionItems
    .filter((item) => item.owner === 'GREG' && item.attention_band === 'NOW')
    .slice(0, 4)

  const delivery = signals.protect_delivery.slice(0, 5)
  const demand = signals.convert_demand.slice(0, 5)
  const recurring = signals.relationships.filter((item) => item.engagements.length > 1).slice(0, 3)
  const teamQueues = resolutionQueues.filter((queue) => queue.owner !== 'GREG' && queue.owner !== 'SYSTEM' && queue.items.length > 0)
  const highPressure = signals.capacity_pressure.filter((item) => item.severity === 'HIGH')
  const watchPressure = signals.capacity_pressure.filter((item) => item.severity === 'WATCH')
  const knownSignedValue = knownCommittedContractValue(engagements, financialFacts)
  const handledCount = attention.handled.reduce((sum, group) => sum + group.count, 0)

  return (
    <div className="sm:ml-48">
      <header className="mb-8">
        <p className="text-sm text-zinc-500">Stage Presence</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-100">Today</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
          The business at a glance. Routine system detail stays underneath; this view surfaces what actually matters to leadership.
        </p>
      </header>

      <section className={gregItems.length ? 'mb-8 rounded-3xl border border-red-950 bg-red-950/15 p-5' : 'mb-8 rounded-3xl border border-emerald-950 bg-emerald-950/15 p-5'}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className={gregItems.length ? 'text-xs font-bold tracking-[0.16em] text-red-300' : 'text-xs font-bold tracking-[0.16em] text-emerald-400'}>NEEDS YOU</div>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-100">
              {gregItems.length ? `${gregItems.length} decision${gregItems.length === 1 ? '' : 's'} need Greg` : 'Nothing requires Greg right now'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              {gregItems.length
                ? 'These are the exceptions where founder judgment is currently material.'
                : 'The current known work is being carried by the team, existing evidence, or system logic.'}
            </p>
          </div>
          {!gregItems.length && handledCount > 0 && <div className="rounded-full border border-emerald-950 px-3 py-1.5 text-xs font-semibold text-emerald-500">{handledCount} routine item{handledCount === 1 ? '' : 's'} absorbed</div>}
        </div>
        {gregItems.length > 0 && (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {gregItems.map((item) => (
              <button key={`${item.engagement_id}:${item.code}`} type="button" onClick={() => onOpen(item.engagement_id)} className="rounded-2xl border border-red-950/80 bg-zinc-950/50 p-4 text-left hover:border-red-800">
                <div className="text-sm font-semibold text-zinc-200">{item.engagement_name}</div>
                <div className="mt-1 text-xs text-zinc-600">{item.decision_label}</div>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{item.label}</p>
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="mb-9 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <BusinessStat label="Upcoming committed" value={signals.protect_delivery.length} />
        <BusinessStat label="Open opportunities" value={signals.convert_demand.length} />
        <BusinessStat label="Capacity watches" value={signals.capacity_pressure.length} emphasis={highPressure.length > 0 ? 'alert' : 'normal'} />
        <BusinessStat label="Known committed value" value={knownSignedValue > 0 ? money(knownSignedValue) : '—'} />
      </div>

      <BusinessSection title="Next Up" count={signals.protect_delivery.length} description="Committed work approaching in the next 21 days.">
        {delivery.length ? delivery.map((engagement) => (
          <BusinessRow
            key={engagement.id}
            title={engagement.name}
            meta={`${engagementDateLabel(engagement)} · ${humanCommitment(engagement)}`}
            status={humanOperational(engagement)}
            onClick={() => onOpen(engagement.id)}
          />
        )) : <Empty text="No committed work is approaching in the next 21 days." />}
      </BusinessSection>

      <BusinessSection title="Sales" count={signals.convert_demand.length} description="Current opportunities that can still move commercially. Past-dated stale records are kept out of this list.">
        {demand.length ? demand.map((engagement) => (
          <BusinessRow
            key={engagement.id}
            title={engagement.name}
            meta={`${engagementDateLabel(engagement)} · ${humanCommercial(engagement)}`}
            status={engagement.waiting_on ? `Waiting on ${engagement.waiting_on}` : engagement.next_action || 'Needs next move'}
            onClick={() => onOpen(engagement.id)}
          />
        )) : <Empty text="No active opportunity currently needs commercial movement." />}
      </BusinessSection>

      <BusinessSection title="Team Handling" count={teamQueues.length} description="Work already routed away from Greg. Open a role only when you want the underlying detail.">
        {teamQueues.length ? (
          <div className="grid gap-3 md:grid-cols-3">
            {teamQueues.map((queue) => {
              const first = queue.items[0]
              return (
                <button key={queue.owner} type="button" onClick={() => first && onOpen(first.engagement.id)} className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-4 text-left hover:border-zinc-700">
                  <div className="text-xs font-bold tracking-[0.12em] text-zinc-600">{queue.owner}</div>
                  <div className="mt-2 text-2xl font-semibold text-zinc-100">{queue.items.length}</div>
                  <div className="mt-1 text-xs text-zinc-500">current resolution item{queue.items.length === 1 ? '' : 's'}</div>
                  {queue.top_gaps[0] && <p className="mt-3 text-xs leading-5 text-zinc-600">Most common: {queue.top_gaps[0].label}</p>}
                </button>
              )
            })}
          </div>
        ) : <Empty text="No team-specific resolution work is currently derived." />}
      </BusinessSection>

      <BusinessSection title="Capacity" count={signals.capacity_pressure.length} description="Only pressure that can affect real commitments. A watch is not a reservation conflict.">
        {highPressure.length > 0 ? (
          <div className="rounded-2xl border border-red-950 bg-red-950/10 p-4">
            <div className="text-sm font-semibold text-red-300">{highPressure.length} committed capacity conflict signal{highPressure.length === 1 ? '' : 's'} need review</div>
          </div>
        ) : watchPressure.length > 0 ? (
          <div className="rounded-2xl border border-amber-950 bg-amber-950/10 p-4">
            <div className="text-sm font-semibold text-amber-400">No confirmed conflict. {watchPressure.length} future watch point{watchPressure.length === 1 ? '' : 's'} before additional commitments.</div>
            <div className="mt-3 space-y-2">
              {watchPressure.slice(0, 3).map((item) => (
                <button key={item.id} type="button" onClick={() => onOpen(item.second.id)} className="block w-full rounded-xl border border-zinc-900 px-3 py-2 text-left text-xs text-zinc-500 hover:border-zinc-700">
                  {item.resource_name}: {item.first.name} ↔ {item.second.name}
                </button>
              ))}
            </div>
          </div>
        ) : <Empty text="No current configured-capacity pressure requires attention." />}
      </BusinessSection>

      <BusinessSection title="Relationships" count={recurring.length} description="Repeated customer nodes that are becoming part of the business, not just individual jobs.">
        {recurring.length ? recurring.map((relationship) => (
          <button key={relationship.party_id} type="button" onClick={() => relationship.engagements[0] && onOpen(relationship.engagements[0].id)} className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-4 text-left hover:border-zinc-700">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold text-zinc-200">{relationship.name}</div>
                <div className="mt-1 text-xs text-zinc-600">{relationship.engagements.length} Engagements · {relationship.open_count} open</div>
              </div>
              {relationship.known_value > 0 && <div className="text-sm font-semibold text-zinc-400">{money(relationship.known_value)}</div>}
            </div>
          </button>
        )) : <Empty text="No recurring relationship pattern is strong enough to surface yet." />}
      </BusinessSection>

      {learningReviewSignals.length > 0 && (
        <BusinessSection title="History to Resolve" count={learningReviewSignals.length} description="Past records that deserve learning or cleanup without cluttering current sales and delivery.">
          {learningReviewSignals.slice(0, 3).map((item) => (
            <BusinessRow key={item.engagement_id} title={item.engagement_name} meta={item.signal_label} status={item.reason} onClick={() => onOpen(item.engagement_id)} />
          ))}
        </BusinessSection>
      )}

      <section className="mt-10 border-t border-zinc-900 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold tracking-[0.12em] text-zinc-700">SYSTEM STATUS</div>
            <p className="mt-2 text-xs leading-5 text-zinc-600">{attention.total_raw_gaps} underlying decision gaps compressed into {attention.compressed_groups} grouped signals. These mechanics stay underneath the business view.</p>
          </div>
          <div className="text-xs text-zinc-700">{events.length ? `Last change ${new Date(events[0].created_at).toLocaleString()}` : 'No recent activity'}</div>
        </div>
      </section>
    </div>
  )
}

function knownCommittedContractValue(engagements: Engagement[], financialFacts: EngagementFinancialFact[]) {
  const committedIds = new Set(
    engagements
      .filter((engagement) => engagement.commercial_state === 'WON' || ['SIGNED', 'DEPOSIT_PENDING', 'CONFIRMED'].includes(engagement.commitment_state))
      .map((engagement) => engagement.id),
  )
  const values = new Map<string, EngagementFinancialFact>()
  const rank: Record<string, number> = { VERIFIED: 5, KNOWN: 4, ESTIMATED: 3, ASSUMED: 2, CONFLICTING: 1 }
  for (const fact of financialFacts) {
    if (!committedIds.has(fact.engagement_id) || fact.fact_type !== 'CONTRACT_TOTAL' || fact.certainty_state === 'CONFLICTING') continue
    const current = values.get(fact.engagement_id)
    if (!current || rank[fact.certainty_state] > rank[current.certainty_state] || (rank[fact.certainty_state] === rank[current.certainty_state] && fact.updated_at > current.updated_at)) values.set(fact.engagement_id, fact)
  }
  return [...values.values()].reduce((sum, fact) => sum + Number(fact.amount), 0)
}

function BusinessStat({ label, value, emphasis = 'normal' }: { label: string; value: string | number; emphasis?: 'normal' | 'alert' }) {
  return (
    <div className={emphasis === 'alert' ? 'rounded-2xl border border-red-950 bg-red-950/10 p-4' : 'rounded-2xl border border-zinc-900 bg-zinc-950/70 p-4'}>
      <div className={emphasis === 'alert' ? 'text-2xl font-semibold text-red-300' : 'text-2xl font-semibold text-zinc-100'}>{value}</div>
      <div className="mt-1 text-xs text-zinc-600">{label}</div>
    </div>
  )
}

function BusinessSection({ title, count, description, children }: { title: string; count: number; description: string; children: React.ReactNode }) {
  return (
    <section className="mb-9">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><h2 className="text-lg font-semibold text-zinc-200">{title}</h2><span className="rounded-full border border-zinc-900 px-2 py-0.5 text-[10px] text-zinc-600">{count}</span></div>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-600">{description}</p>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">{children}</div>
    </section>
  )
}

function BusinessRow({ title, meta, status, onClick }: { title: string; meta: string; status: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-4 text-left hover:border-zinc-700">
      <div className="font-semibold text-zinc-200">{title}</div>
      <div className="mt-1 text-xs text-zinc-600">{meta}</div>
      <div className="mt-3 text-sm text-zinc-400">{status}</div>
    </button>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-zinc-900 bg-zinc-950/50 p-4 text-sm text-zinc-600">{text}</div>
}

function humanCommercial(engagement: Engagement) {
  const labels: Record<string, string> = {
    NEW: 'New opportunity',
    DISCOVERY: 'Discovery',
    DESIGNING: 'Designing solution',
    PROPOSED: 'Quote sent',
    NEGOTIATING: 'Negotiating',
    WON: 'Won',
    LOST: 'Lost',
  }
  return labels[engagement.commercial_state] ?? engagement.commercial_state
}

function humanCommitment(engagement: Engagement) {
  const labels: Record<string, string> = {
    UNCOMMITTED: 'Not committed',
    VERBAL_YES: 'Verbal yes',
    SIGNED: 'Signed',
    DEPOSIT_PENDING: 'Deposit pending',
    CONFIRMED: 'Confirmed',
    CANCELLED: 'Cancelled',
  }
  return labels[engagement.commitment_state] ?? engagement.commitment_state
}

function humanOperational(engagement: Engagement) {
  const labels: Record<string, string> = {
    NOT_STARTED: 'Planning not started',
    PLANNING: 'Planning',
    READY: 'Ready',
    ACTIVE: 'Active',
    COMPLETE: 'Complete',
    CLOSED: 'Closed',
  }
  return labels[engagement.operational_state] ?? engagement.operational_state
}

function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}
