import type { EconomyOverview, EngagementSummary, RecoveryQueueItem, RelationshipSummary } from '../lib/readContracts'

function money(value: number | null | undefined) {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function dateLabel(value: string | null | undefined) {
  if (!value) return 'Date unknown'
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
}

function textFromJson(value: Record<string, unknown> | null, key: string) {
  const item = value?.[key]
  return typeof item === 'string' && item.trim() ? item : null
}

function numberFromJson(value: Record<string, unknown> | null, key: string) {
  const item = value?.[key]
  return typeof item === 'number' ? item : typeof item === 'string' && item.trim() ? Number(item) : null
}

function ownerAttentionScore(item: EngagementSummary) {
  let score = 0
  if (item.attention_state === 'BLOCKED') score += 8
  else if (item.attention_state === 'NEEDS_ATTENTION') score += 5
  else if (item.attention_state === 'WAITING') score += 3
  if (item.open_work_count > 0) score += Math.min(item.open_work_count, 3)
  if (['SIGNED', 'CONFIRMED'].includes(item.commitment_state)) score += 2
  const committed = numberFromJson(item.economy, 'committed_revenue_observed') ?? 0
  const proposal = numberFromJson(item.economy, 'proposal_value_observed') ?? 0
  if (committed >= 25000 || proposal >= 25000) score += 5
  else if (committed >= 10000 || proposal >= 10000) score += 3
  return score
}

function recoveryLooksOwnerLevel(item: RecoveryQueueItem) {
  if (item.status === 'RESOLVED') return false
  const domain = item.domain.toUpperCase()
  const impact = item.business_impact.toUpperCase()
  const ownerDomains = ['ECONOMICS', 'DEMAND', 'RELATIONSHIP', 'CAPACITY', 'PRICING', 'COMMERCIAL']
  return ownerDomains.some((value) => domain.includes(value)) || impact.includes('HIGH') || impact.includes('STRATEGIC')
}

export function GregMode({
  engagements,
  relationships,
  economy,
  recovery,
  onOpenWork,
  onCapture,
  onAllWork,
  onSystem,
}: {
  engagements: EngagementSummary[]
  relationships: RelationshipSummary[]
  economy: EconomyOverview | null
  recovery: RecoveryQueueItem[]
  onOpenWork: (id: string) => void
  onCapture: () => void
  onAllWork: () => void
  onSystem: () => void
}) {
  const today = new Date().toISOString().slice(0, 10)

  const ownerRecovery = recovery
    .filter(recoveryLooksOwnerLevel)
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, 4)

  const ownerWork = engagements
    .filter((item) => item.operational_state !== 'CLOSED' && item.commercial_state !== 'LOST')
    .map((item) => ({ item, score: ownerAttentionScore(item) }))
    .filter(({ score }) => score >= 5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)

  const relationshipsToWatch = [...relationships]
    .filter((item) => item.current_future_count > 0 || (item.committed_revenue_observed ?? 0) > 0)
    .sort((a, b) => {
      const aScore = (a.current_future_count * 1000000) + (a.committed_revenue_observed ?? 0) + (a.engagement_count * 1000)
      const bScore = (b.current_future_count * 1000000) + (b.committed_revenue_observed ?? 0) + (b.engagement_count * 1000)
      return bScore - aScore
    })
    .slice(0, 5)

  const comingUp = engagements
    .filter((item) => item.event_start_date && item.event_start_date >= today && !['LOST'].includes(item.commercial_state))
    .map((item) => ({ item, score: ownerAttentionScore(item) }))
    .filter(({ item, score }) => ['SIGNED', 'CONFIRMED', 'DEPOSIT_PENDING'].includes(item.commitment_state) && (score >= 3 || (numberFromJson(item.economy, 'committed_revenue_observed') ?? 0) >= 10000))
    .sort((a, b) => String(a.item.event_start_date).localeCompare(String(b.item.event_start_date)))
    .slice(0, 5)

  const needsYouCount = ownerRecovery.length + ownerWork.length

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-col gap-5 border-b border-zinc-900 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-500">Owner view</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-100">Today</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Only the decisions, relationships, and risks that may deserve owner attention. This is an attention lens, not an assignment system.</p>
        </div>
        <button type="button" onClick={onCapture} className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-zinc-950 hover:bg-amber-400">Capture what happened</button>
      </header>

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div><div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-700">Needs you</div><h2 className="mt-1 text-xl font-semibold text-zinc-100">{needsYouCount ? `${needsYouCount} owner-attention candidates` : 'Nothing is asking for owner attention'}</h2></div>
          <span className="text-xs text-zinc-700">judgment · exception · relationship · risk</span>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {ownerRecovery.map((item) => (
            <button key={item.candidate_key} type="button" onClick={() => item.engagement_id && onOpenWork(item.engagement_id)} className="rounded-2xl border border-amber-900/45 bg-amber-950/10 p-5 text-left transition hover:border-amber-800/70">
              <div className="flex items-start justify-between gap-4"><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-500">{item.domain.replaceAll('_', ' ')}</div><span className="text-[10px] uppercase tracking-[.12em] text-zinc-700">{item.urgency}</span></div>
              <div className="mt-2 text-base font-semibold text-zinc-100">{item.title}</div>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{item.suggested_action}</p>
              {item.engagement_name && <div className="mt-4 text-xs text-zinc-600">{item.engagement_name}</div>}
            </button>
          ))}
          {ownerWork.map(({ item }) => {
            const next = textFromJson(item.next_work, 'title')
            const value = numberFromJson(item.economy, 'committed_revenue_observed') ?? numberFromJson(item.economy, 'proposal_value_observed')
            return (
              <button key={item.id} type="button" onClick={() => onOpenWork(item.id)} className="rounded-2xl border border-zinc-900 bg-zinc-950/45 p-5 text-left transition hover:border-zinc-700">
                <div className="flex items-start justify-between gap-4"><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-700">{item.engagement_number}</div>{value != null && <span className="text-sm font-semibold tabular-nums text-zinc-400">{money(value)}</span>}</div>
                <div className="mt-2 text-base font-semibold text-zinc-100">{item.name}</div>
                <div className="mt-2 text-sm text-zinc-500">{item.attention_state === 'NORMAL' ? 'High-leverage work worth an owner glance.' : item.attention_state.replaceAll('_', ' ')}</div>
                <div className="mt-4 border-t border-zinc-900 pt-3 text-xs text-zinc-600">{next ? `Next: ${next}` : 'No committed next work represented.'}</div>
              </button>
            )
          })}
          {!needsYouCount && <div className="rounded-2xl border border-zinc-900 bg-zinc-950/35 p-8 text-center text-sm text-zinc-600 lg:col-span-2">The OS is not currently surfacing an owner-level exception.</div>}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
        <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-5">
          <div className="flex items-end justify-between gap-4"><div><div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-700">Relationships</div><h2 className="mt-1 text-lg font-semibold text-zinc-100">People worth your attention</h2></div><span className="text-xs text-zinc-700">recurring · current · valuable</span></div>
          <div className="mt-4 divide-y divide-zinc-900">
            {relationshipsToWatch.map((item) => (
              <div key={item.party_id} className="grid gap-2 py-4 first:pt-1 sm:grid-cols-[1fr_auto] sm:items-center">
                <div><div className="font-medium text-zinc-200">{item.name}</div><div className="mt-1 text-xs text-zinc-600">{item.organization_name ?? item.party_type} · {item.engagement_count} engagements · {item.current_future_count} current/future</div></div>
                <div className="text-sm font-semibold tabular-nums text-zinc-400">{money(item.committed_revenue_observed)}</div>
              </div>
            ))}
            {!relationshipsToWatch.length && <div className="py-8 text-center text-sm text-zinc-600">No recurring/current relationship evidence yet.</div>}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-5">
          <div className="flex items-end justify-between gap-4"><div><div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-700">Coming up</div><h2 className="mt-1 text-lg font-semibold text-zinc-100">Work worth an owner glance</h2></div><button type="button" onClick={onAllWork} className="text-xs font-semibold text-zinc-600 hover:text-zinc-300">All work →</button></div>
          <div className="mt-4 space-y-2">
            {comingUp.map(({ item }) => (
              <button key={item.id} type="button" onClick={() => onOpenWork(item.id)} className="w-full rounded-xl border border-zinc-900 bg-zinc-950/50 p-4 text-left hover:border-zinc-700">
                <div className="flex items-center justify-between gap-4"><div className="font-medium text-zinc-200">{item.name}</div><div className="text-xs font-semibold text-zinc-500">{dateLabel(item.event_start_date)}</div></div>
                <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-[.1em] text-zinc-700"><span>{item.commitment_state}</span>{item.open_work_count > 0 && <span>· {item.open_work_count} open work</span>}{item.active_assignment_count === 0 && <span>· crew not represented</span>}</div>
              </button>
            ))}
            {!comingUp.length && <div className="py-8 text-center text-sm text-zinc-600">No upcoming committed work currently crosses the owner-attention threshold.</div>}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between"><div><div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-700">Business pulse</div><h2 className="mt-1 text-lg font-semibold text-zinc-100">Only what the evidence supports</h2></div></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Pulse label="Open pipeline" value={money(economy?.open_pipeline_value_observed)} note={`${economy?.engagement_count ?? 0} represented engagements`} />
          <Pulse label="Committed revenue" value={money(economy?.committed_revenue_observed)} note={`${economy?.engagements_with_known_committed_value ?? 0} with known committed value`} />
          <Pulse label="Collected" value={money(economy?.collected_observed)} note={`${economy?.engagements_with_collection_evidence ?? 0} with collection evidence`} />
          <Pulse label="Contribution" value={economy?.contribution_observed_where_known != null ? money(economy.contribution_observed_where_known) : 'Not supported yet'} note={`${economy?.engagements_with_actual_contribution ?? 0} with actual contribution`} />
        </div>
      </section>

      <div className="flex flex-wrap gap-2 border-t border-zinc-900 pt-5">
        <button type="button" onClick={onAllWork} className="rounded-xl border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-200">Browse all work</button>
        <button type="button" onClick={onSystem} className="rounded-xl border border-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-700 hover:text-zinc-400">System / Reality Health</button>
      </div>
    </div>
  )
}

function Pulse({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-4"><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-700">{label}</div><div className="mt-2 text-xl font-semibold tracking-tight text-zinc-100">{value}</div><div className="mt-2 text-[11px] leading-5 text-zinc-600">{note}</div></div>
}
