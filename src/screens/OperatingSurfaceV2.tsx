import type {
  CapabilitySummary,
  EconomyOverview,
  EngagementSummary,
  RecoveryQueueItem,
  RelationshipSummary,
} from '../lib/readContracts'

function money(value: number | null | undefined) {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function dateLabel(value: string | null | undefined) {
  if (!value) return 'Date unknown'
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' }).format(date)
}

function textFromJson(value: Record<string, unknown> | null, key: string) {
  const item = value?.[key]
  return typeof item === 'string' && item.trim() ? item : null
}

function numberFromJson(value: Record<string, unknown> | null, key: string) {
  const item = value?.[key]
  return typeof item === 'number' ? item : typeof item === 'string' && item.trim() ? Number(item) : null
}

function SectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-zinc-900 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-500">{eyebrow}</div>}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}

function StatePill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'hot' }) {
  const classes = tone === 'good'
    ? 'border-emerald-900/70 bg-emerald-950/25 text-emerald-300'
    : tone === 'warn'
      ? 'border-amber-900/70 bg-amber-950/25 text-amber-300'
      : tone === 'hot'
        ? 'border-red-900/70 bg-red-950/25 text-red-300'
        : 'border-zinc-800 bg-zinc-900/60 text-zinc-400'
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${classes}`}>{children}</span>
}

function EngagementCard({ engagement, onOpen, compact = false }: { engagement: EngagementSummary; onOpen: (id: string) => void; compact?: boolean }) {
  const customer = textFromJson(engagement.primary_customer, 'name') ?? textFromJson(engagement.primary_customer, 'organization_name')
  const venue = textFromJson(engagement.venue, 'name') ?? textFromJson(engagement.venue, 'display_name')
  const nextWork = textFromJson(engagement.next_work, 'title')
  const committed = numberFromJson(engagement.economy, 'committed_revenue_observed')
  const needsAttention = engagement.attention_state !== 'NORMAL' || engagement.open_work_count > 0
  return (
    <button type="button" onClick={() => onOpen(engagement.id)} className="group w-full rounded-2xl border border-zinc-900 bg-zinc-950/50 p-4 text-left transition hover:border-zinc-700 hover:bg-zinc-900/35">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600">{engagement.engagement_number}</div>
          <div className="mt-1 truncate text-base font-semibold text-zinc-100 group-hover:text-white">{engagement.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
            <span>{dateLabel(engagement.event_start_date)}</span>
            {customer && <><span>·</span><span>{customer}</span></>}
            {venue && <><span>·</span><span>{venue}</span></>}
          </div>
        </div>
        <StatePill tone={engagement.commitment_state === 'SIGNED' || engagement.commitment_state === 'CONFIRMED' ? 'good' : engagement.commercial_state === 'PROPOSED' ? 'warn' : 'neutral'}>{engagement.commitment_state === 'UNCOMMITTED' ? engagement.commercial_state : engagement.commitment_state}</StatePill>
      </div>
      {!compact && (
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-700">Next</div>
            <div className={`mt-1 text-sm ${nextWork ? 'text-zinc-300' : 'text-zinc-600'}`}>{nextWork ?? 'No committed next work represented'}</div>
          </div>
          <div className="flex items-center gap-2 sm:justify-end">
            {needsAttention && <StatePill tone="warn">attention</StatePill>}
            {committed != null && <div className="text-sm font-semibold tabular-nums text-zinc-300">{money(committed)}</div>}
          </div>
        </div>
      )}
    </button>
  )
}

export function TodayV2({ engagements, recovery, role, onOpen, onCapture }: { engagements: EngagementSummary[]; recovery: RecoveryQueueItem[]; role: string | null; onOpen: (id: string) => void; onCapture: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = engagements.filter((item) => item.event_start_date && item.event_start_date >= today && !['LOST'].includes(item.commercial_state)).slice(0, 5)
  const attention = engagements.filter((item) => item.attention_state !== 'NORMAL' || item.open_work_count > 0).slice(0, 4)
  const urgentRecovery = recovery.filter((item) => item.urgency === 'NOW' && item.status !== 'RESOLVED').slice(0, 4)

  return (
    <div>
      <SectionHeader eyebrow={role ? `${role} lens` : 'Operating view'} title="Today" description="What deserves attention now — not everything Stage Presence knows." action={<button type="button" onClick={onCapture} className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-amber-400">Capture reality</button>} />

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-zinc-200">Upcoming delivery</h2><span className="text-xs text-zinc-600">{upcoming.length} shown</span></div>
          <div className="space-y-3">
            {upcoming.length ? upcoming.map((item) => <EngagementCard key={item.id} engagement={item} onOpen={onOpen} />) : <EmptyState title="No upcoming work represented" body="As committed work is scheduled, it will appear here." />}
          </div>
        </section>

        <div className="space-y-5">
          <section className="rounded-2xl border border-zinc-900 bg-zinc-950/45 p-4">
            <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-zinc-200">Needs attention</h2><span className="text-xs text-zinc-600">{attention.length}</span></div>
            <div className="mt-3 space-y-2">
              {attention.length ? attention.map((item) => <EngagementCard key={item.id} engagement={item} onOpen={onOpen} compact />) : <div className="py-8 text-center text-xs text-zinc-600">Nothing currently surfaced.</div>}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-900 bg-zinc-950/45 p-4">
            <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-zinc-200">Reality gaps</h2><span className="text-xs text-zinc-600">{urgentRecovery.length} now</span></div>
            <div className="mt-3 space-y-3">
              {urgentRecovery.length ? urgentRecovery.map((item) => (
                <div key={item.candidate_key} className="border-t border-zinc-900 pt-3 first:border-0 first:pt-0">
                  <div className="text-sm font-medium text-zinc-300">{item.title}</div>
                  <div className="mt-1 text-xs leading-5 text-zinc-600">{item.suggested_action}</div>
                </div>
              )) : <div className="py-6 text-center text-xs text-zinc-600">No NOW-level recovery gaps.</div>}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export function EngagementsV2({ engagements, onOpen }: { engagements: EngagementSummary[]; onOpen: (id: string) => void }) {
  const active = engagements.filter((item) => !['LOST'].includes(item.commercial_state) && item.operational_state !== 'CLOSED')
  const committed = active.filter((item) => ['SIGNED', 'CONFIRMED', 'DEPOSIT_PENDING'].includes(item.commitment_state))
  const pipeline = active.filter((item) => item.commitment_state === 'UNCOMMITTED')
  return (
    <div>
      <SectionHeader eyebrow="Shared work" title="Engagements" description="The work Stage Presence is pursuing, committed to, preparing, delivering, and learning from." />
      <div className="mt-5 grid grid-cols-3 gap-2 sm:max-w-xl">
        <Metric label="Active" value={active.length} />
        <Metric label="Committed" value={committed.length} />
        <Metric label="Pipeline" value={pipeline.length} />
      </div>
      <section className="mt-7">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">Committed + upcoming</h2>
        <div className="grid gap-3 xl:grid-cols-2">{committed.map((item) => <EngagementCard key={item.id} engagement={item} onOpen={onOpen} />)}</div>
      </section>
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">Pipeline</h2>
        <div className="grid gap-3 xl:grid-cols-2">{pipeline.map((item) => <EngagementCard key={item.id} engagement={item} onOpen={onOpen} />)}</div>
      </section>
    </div>
  )
}

export function RelationshipsV2({ relationships }: { relationships: RelationshipSummary[] }) {
  return (
    <div>
      <SectionHeader eyebrow="Relationship memory" title="Relationships" description="Value across repeated interactions — not a contact list." />
      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        {relationships.map((item) => (
          <div key={item.party_id} className="rounded-2xl border border-zinc-900 bg-zinc-950/45 p-4">
            <div className="flex items-start justify-between gap-4">
              <div><div className="text-base font-semibold text-zinc-100">{item.name}</div><div className="mt-1 text-xs text-zinc-600">{item.organization_name ?? item.party_type}</div></div>
              <StatePill tone={item.current_future_count > 0 ? 'good' : 'neutral'}>{item.current_future_count} current</StatePill>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <Metric label="Engagements" value={item.engagement_count} />
              <Metric label="Committed" value={money(item.committed_revenue_observed)} small />
              <Metric label="Collected" value={money(item.collected_observed)} small />
            </div>
            <div className="mt-4 text-xs text-zinc-600">Latest represented Engagement · {dateLabel(item.latest_engagement_date)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CapabilityV2({ capabilities }: { capabilities: CapabilitySummary[] }) {
  const groups = [
    ['PHYSICAL_CAPACITY', 'Physical capacity'],
    ['SERVICE', 'Services'],
    ['LOGISTICS', 'Logistics'],
    ['COMMERCIAL_ADJUSTMENT', 'Commercial adjustments'],
  ] as const
  return (
    <div>
      <SectionHeader eyebrow="Deliverable capability" title="Capability" description="What Stage Presence can actually deliver, how it is sourced, and what evidence exists around capacity and use." />
      <div className="mt-7 space-y-8">
        {groups.map(([kind, label]) => {
          const rows = capabilities.filter((item) => item.capability_kind === kind)
          if (!rows.length) return null
          return (
            <section key={kind}>
              <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-zinc-200">{label}</h2><span className="text-xs text-zinc-600">{rows.length}</span></div>
              <div className="overflow-hidden rounded-2xl border border-zinc-900">
                {rows.map((item) => (
                  <div key={item.resource_id} className="grid gap-3 border-b border-zinc-900 bg-zinc-950/40 p-4 last:border-0 sm:grid-cols-[1.5fr_.75fr_.75fr_.75fr] sm:items-center">
                    <div><div className="font-medium text-zinc-200">{item.name}</div><div className="mt-1 text-xs text-zinc-600">{item.category} · {item.sourcing_model}</div></div>
                    <div><div className="text-[10px] uppercase tracking-[.12em] text-zinc-700">Quantity</div><div className="mt-1 text-sm text-zinc-400">{item.quantity ?? '—'} <span className="text-[10px] text-zinc-700">{item.quantity_state}</span></div></div>
                    <div><div className="text-[10px] uppercase tracking-[.12em] text-zinc-700">Committed</div><div className="mt-1 text-sm text-zinc-400">{item.active_commitment_count}</div></div>
                    <div><div className="text-[10px] uppercase tracking-[.12em] text-zinc-700">Commercial support</div><div className="mt-1 text-sm text-zinc-400">{money(item.represented_commercial_line_value)}</div></div>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

export function EconomyV2({ economy }: { economy: EconomyOverview | null }) {
  if (!economy) return <EmptyState title="Economy not represented" body="No operating economy summary is currently available." />
  return (
    <div>
      <SectionHeader eyebrow="Evidence-backed money" title="Economy" description="Revenue, collections, costs, contribution, funds, and asset economics remain distinct truths." />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Open pipeline" value={money(economy.open_pipeline_value_observed)} large />
        <Metric label="Committed revenue" value={money(economy.committed_revenue_observed)} large />
        <Metric label="Collected" value={money(economy.collected_observed)} large />
        <Metric label="Outstanding" value={money(economy.outstanding_observed)} large />
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-900 bg-zinc-950/45 p-5">
          <h2 className="text-sm font-semibold text-zinc-200">Contribution evidence</h2>
          <div className="mt-4 grid grid-cols-2 gap-3"><Metric label="Actual direct cost" value={money(economy.direct_cost_actual_observed)} /><Metric label="Contribution where known" value={money(economy.contribution_observed_where_known)} /></div>
          <div className="mt-4 text-xs leading-5 text-zinc-600">{economy.engagements_with_actual_contribution} Engagements currently have actual contribution evidence. Missing evidence is not treated as zero cost.</div>
        </section>
        <section className="rounded-2xl border border-zinc-900 bg-zinc-950/45 p-5">
          <h2 className="text-sm font-semibold text-zinc-200">Company position</h2>
          <div className="mt-4 grid grid-cols-2 gap-3"><Metric label="Liquid funds observed" value={money(economy.liquid_funds_observed)} /><Metric label="Liabilities observed" value={money(economy.liabilities_observed)} /></div>
          <div className="mt-4 flex flex-wrap gap-2"><StatePill>{economy.funds_evidence_state}</StatePill><StatePill>{economy.company_cost_evidence_state}</StatePill><StatePill>{economy.asset_evidence_state}</StatePill></div>
        </section>
      </div>
    </div>
  )
}

function Metric({ label, value, small = false, large = false }: { label: string; value: React.ReactNode; small?: boolean; large?: boolean }) {
  return <div className="rounded-xl border border-zinc-900 bg-zinc-950/55 p-3"><div className="text-[10px] uppercase tracking-[0.13em] text-zinc-700">{label}</div><div className={`mt-1 font-semibold tabular-nums text-zinc-200 ${large ? 'text-xl' : small ? 'text-sm' : 'text-base'}`}>{value}</div></div>
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="rounded-2xl border border-dashed border-zinc-800 px-5 py-10 text-center"><div className="text-sm font-medium text-zinc-400">{title}</div><div className="mx-auto mt-2 max-w-md text-xs leading-5 text-zinc-600">{body}</div></div>
}
