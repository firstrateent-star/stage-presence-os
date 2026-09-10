import type { EngagementFrontendRow } from '../lib/operatingRepository'

export function OperatingWorkScreen({ rows, onOpen }: { rows: EngagementFrontendRow[]; onOpen: (id: string) => void }) {
  const today = localDateKey(new Date())
  const opportunities = rows.filter((row) => isOpportunity(row) && !isPast(row, today)).sort(bySoonest)
  const upcoming = rows.filter((row) => isCommitted(row) && row.operational_state !== 'CLOSED' && !isPast(row, today)).sort(bySoonest)
  const history = rows.filter((row) => !opportunities.some((item) => item.id === row.id) && !upcoming.some((item) => item.id === row.id)).sort(byMostRecent)

  return (
    <div className="sm:ml-48">
      <header className="mb-8">
        <p className="text-sm text-zinc-500">One business reality, organized the way the team experiences it.</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Work</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">Commercial position, delivery readiness, money, capacity and next movement now come from the shared operating backend rather than being reconstructed screen by screen.</p>
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

function OperatingCard({ row, onOpen, mode }: { row: EngagementFrontendRow; onOpen: (id: string) => void; mode: 'opportunity' | 'job' | 'history' }) {
  const economics = asRecord(row.economics)
  const next = asRecord(row.next_work)
  const customer = asRecord(row.primary_customer)
  const value = numberValue(mode === 'opportunity' ? economics?.proposal_value_observed : economics?.committed_revenue_observed)
  const valueBasis = stringValue(economics?.value_basis)
  const nextTitle = stringValue(next?.title)
  const nextWhy = stringValue(next?.why_now)

  return (
    <button type="button" onClick={() => onOpen(row.id)} className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-4 text-left transition hover:border-zinc-700 hover:bg-zinc-900/50">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium tracking-[0.08em] text-zinc-600">{dateLabel(row)}</div>
          <h3 className="mt-1 text-lg font-semibold text-zinc-100">{row.name}</h3>
          <div className="mt-1 text-xs text-zinc-600">{stringValue(customer?.name) || 'Customer not yet identified'}{row.venue_name ? ` · ${row.venue_name}` : ''}</div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="rounded-full border border-zinc-900 px-2.5 py-1 text-[10px] font-semibold text-zinc-500">{humanState(row)}</span>
          {row.capacity_signal && row.capacity_signal !== 'INFO' && <span className="rounded-full border border-amber-900/60 px-2 py-1 text-[10px] font-semibold text-amber-500">Capacity {row.capacity_signal.toLowerCase()}</span>}
        </div>
      </div>

      {(row.desired_outcome || row.customer_request) && <p className="mt-4 line-clamp-2 text-sm leading-6 text-zinc-400">{row.desired_outcome || row.customer_request}</p>}

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-zinc-900 pt-3">
        <TinyStat label={mode === 'opportunity' ? 'Observed proposal' : 'Observed committed'} value={value === null ? 'Unknown' : money(value)} />
        <TinyStat label="Open actions" value={String(row.open_work_count ?? 0)} />
        <TinyStat label="Plan lines" value={String(row.fulfillment_line_count ?? 0)} />
      </div>

      <div className="mt-4 rounded-xl bg-zinc-900/45 px-3 py-3">
        <div className="text-[10px] font-semibold tracking-[0.12em] text-zinc-600">{mode === 'history' ? 'RECORD' : 'NEXT MOVEMENT'}</div>
        <div className="mt-1 text-sm font-medium text-zinc-300">{mode === 'history' ? valueBasisLabel(valueBasis) : (nextTitle || nextMovementFallback(row))}</div>
        {mode !== 'history' && nextWhy && <div className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-600">{nextWhy}</div>}
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

function isCommitted(row: EngagementFrontendRow) {
  return row.commercial_state === 'WON' || ['SIGNED', 'DEPOSIT_PENDING', 'CONFIRMED'].includes(row.commitment_state)
}

function isOpportunity(row: EngagementFrontendRow) {
  return ['NEW', 'DISCOVERY', 'DESIGNING', 'PROPOSED', 'NEGOTIATING'].includes(row.commercial_state)
    && !['SIGNED', 'DEPOSIT_PENDING', 'CONFIRMED', 'CANCELLED'].includes(row.commitment_state)
}

function isPast(row: EngagementFrontendRow, today: string) {
  const date = row.event_start_date ?? row.event_start?.slice(0, 10) ?? null
  return Boolean(date && date < today)
}

function dateLabel(row: EngagementFrontendRow) {
  const key = row.event_start_date ?? row.event_start?.slice(0, 10)
  if (!key) return 'DATE TBD'
  return new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function bySoonest(a: EngagementFrontendRow, b: EngagementFrontendRow) {
  const first = a.event_start_date ?? a.event_start?.slice(0, 10) ?? '9999-12-31'
  const second = b.event_start_date ?? b.event_start?.slice(0, 10) ?? '9999-12-31'
  return first.localeCompare(second) || b.updated_at.localeCompare(a.updated_at)
}

function byMostRecent(a: EngagementFrontendRow, b: EngagementFrontendRow) {
  const first = a.event_start_date ?? a.event_start?.slice(0, 10) ?? '0000-00-00'
  const second = b.event_start_date ?? b.event_start?.slice(0, 10) ?? '0000-00-00'
  return second.localeCompare(first) || b.updated_at.localeCompare(a.updated_at)
}

function humanState(row: EngagementFrontendRow) {
  if (row.commitment_state === 'CONFIRMED') return 'Confirmed'
  if (row.commitment_state === 'DEPOSIT_PENDING') return 'Deposit pending'
  if (row.commitment_state === 'SIGNED') return 'Signed'
  if (row.commercial_state === 'WON') return 'Won'
  if (row.commercial_state === 'NEGOTIATING') return 'Negotiating'
  if (row.commercial_state === 'PROPOSED') return 'Proposal sent'
  if (row.commercial_state === 'DESIGNING') return 'Designing'
  if (row.commercial_state === 'DISCOVERY') return 'Discovery'
  if (row.commercial_state === 'LOST') return 'Lost'
  if (row.commitment_state === 'CANCELLED') return 'Cancelled'
  if (row.operational_state === 'CLOSED') return 'Closed'
  return 'New'
}

function nextMovementFallback(row: EngagementFrontendRow) {
  if (isOpportunity(row)) return 'Advance the next commercial decision.'
  if (isCommitted(row)) return 'Protect delivery and resolve the next execution dependency.'
  return humanState(row)
}

function valueBasisLabel(value: string | null) {
  if (!value) return 'Historical record retained.'
  if (value === 'PROGRAM_ALLOCATION_UNKNOWN') return 'Program component value is intentionally unresolved.'
  return value.replaceAll('_', ' ').toLowerCase()
}

function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : null
}

function numberValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}

function money(value: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}
