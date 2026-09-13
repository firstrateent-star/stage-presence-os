import { useJobWorkspace } from '../lib/useJobWorkspace'
import type { WorkspaceAttentionItem, WorkspaceStage, WorkspaceTone } from '../lib/jobWorkspace'

export function JobWorkspacePanel({ engagementId }: { engagementId: string }) {
  const { model, loading, error } = useJobWorkspace(engagementId)

  if (loading && !model) return <section className="rounded-2xl border border-zinc-900 bg-zinc-950/60 p-5 text-sm text-zinc-600">Building job reality…</section>
  if (error) return <section className="rounded-2xl border border-red-900/60 bg-red-950/20 p-5 text-sm text-red-300">{error}</section>
  if (!model) return null

  const { core, stages, attention, estimate, pricing, commitment, actuals, economics } = model
  const committedRevenue = economics?.committed_revenue_observed ?? commitment?.committed_value ?? null
  const expectedCost = estimate?.estimated_direct_cost ?? economics?.direct_cost_estimate_observed ?? null
  const actualCost = actuals?.actual_direct_cost ?? economics?.direct_cost_actual_observed ?? null
  const projectedContribution = pricing?.projected_contribution ?? economics?.projected_contribution_observed ?? null
  const actualContribution = actuals?.actual_contribution_from_structured_cost ?? economics?.contribution_observed ?? null

  return (
    <section className="mx-auto max-w-5xl space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.2em] text-amber-500">JOB WORKSPACE</div>
            <h2 className="mt-2 text-xl font-semibold text-zinc-100">{core.name}</h2>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
              <span>{core.engagement_number}</span>
              <span>{core.event_start_date || 'Date TBD'}</span>
              <span>{core.venue_name || 'Venue TBD'}</span>
              <span>{core.engagement_type.replaceAll('_', ' ')}</span>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-black/20 px-4 py-3 text-right">
            <div className="text-[10px] font-semibold tracking-[0.16em] text-zinc-600">NEXT MOVE</div>
            <div className="mt-1 max-w-sm text-sm font-medium text-zinc-200">{core.next_action || attention[0]?.title || 'No next move recorded.'}</div>
            {core.next_action_at && <div className="mt-1 text-xs text-zinc-600">{new Date(core.next_action_at).toLocaleString()}</div>}
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-9">
          {stages.map((stage) => <StageCard key={stage.key} stage={stage} />)}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-2xl border border-zinc-900 bg-zinc-950/55 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold tracking-[0.18em] text-zinc-600">WHAT NEEDS ATTENTION NOW</div>
              <p className="mt-1 text-xs text-zinc-600">Derived from canonical job reality. It does not invent missing truth.</p>
            </div>
            <span className="rounded-full border border-zinc-800 px-2.5 py-1 text-xs text-zinc-500">{attention.length}</span>
          </div>
          <div className="mt-4 space-y-2">
            {attention.length
              ? attention.slice(0, 7).map((item) => <AttentionRow key={item.id} item={item} />)
              : <div className="rounded-xl border border-emerald-950 bg-emerald-950/10 px-4 py-4 text-sm text-emerald-300">No material operating gaps are currently surfaced.</div>}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-900 bg-zinc-950/55 p-5">
          <div className="text-[11px] font-semibold tracking-[0.18em] text-zinc-600">JOB ECONOMICS</div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Metric label="Committed revenue" value={money(committedRevenue)} />
            <Metric label="Collected observed" value={money(economics?.collected_observed)} />
            <Metric label="Expected direct cost" value={money(expectedCost)} />
            <Metric label="Actual direct cost" value={money(actualCost)} />
            <Metric label="Projected contribution" value={money(projectedContribution)} />
            <Metric label="Actual contribution" value={money(actualContribution)} />
          </div>
          <div className="mt-4 border-t border-zinc-900 pt-3 text-xs leading-5 text-zinc-600">
            {actuals?.cash_evidence_state ? `Cash: ${actuals.cash_evidence_state.replaceAll('_', ' ')}. ` : ''}
            {economics?.cost_evidence_state ? `Cost: ${economics.cost_evidence_state.replaceAll('_', ' ')}.` : ''}
          </div>
        </section>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniMetric label="Crew" value={commitment ? `${commitment.confirmed_assignment_count}/${commitment.represented_assignment_count} confirmed` : 'Not represented'} />
        <MiniMetric label="Equipment" value={commitment ? `${commitment.resource_scope_lines_confirmed}/${commitment.resource_scope_line_count} confirmed` : 'Not represented'} />
        <MiniMetric label="Warehouse" value={model.warehouse?.warehouse_state?.replaceAll('_', ' ') || 'Not active'} />
        <MiniMetric label="Actuals" value={actuals?.actuals_state?.replaceAll('_', ' ') || 'Not started'} />
      </div>
    </section>
  )
}

function StageCard({ stage }: { stage: WorkspaceStage }) {
  return (
    <button type="button" onClick={() => scrollTo(stage.anchor)} className="min-w-0 rounded-xl border border-zinc-900 bg-black/20 px-3 py-3 text-left hover:border-zinc-700">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${toneDot(stage.tone)}`} />
        <span className="truncate text-[10px] font-semibold tracking-[0.12em] text-zinc-600">{stage.label.toUpperCase()}</span>
      </div>
      <div className="mt-2 truncate text-xs font-semibold text-zinc-300">{stage.state.replaceAll('_', ' ')}</div>
      <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-zinc-700">{stage.summary}</div>
    </button>
  )
}

function AttentionRow({ item }: { item: WorkspaceAttentionItem }) {
  return (
    <button type="button" onClick={() => scrollTo(item.anchor)} className="flex w-full items-start gap-3 rounded-xl border border-zinc-900 px-3 py-3 text-left hover:border-zinc-700">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${priorityDot(item.priority)}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-zinc-200">{item.title}</span>
          <span className="text-[9px] font-semibold tracking-[0.12em] text-zinc-700">{item.priority}</span>
        </div>
        <div className="mt-1 text-xs leading-5 text-zinc-600">{item.detail}</div>
      </div>
      <span className="pt-1 text-zinc-700">→</span>
    </button>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-zinc-900 bg-black/20 p-3"><div className="text-[10px] tracking-wide text-zinc-700">{label}</div><div className="mt-1 text-sm font-semibold text-zinc-200">{value}</div></div>
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-zinc-900 bg-zinc-950/45 px-4 py-3"><div className="text-[10px] font-semibold tracking-[0.14em] text-zinc-700">{label.toUpperCase()}</div><div className="mt-1 truncate text-sm text-zinc-300">{value}</div></div>
}

function toneDot(tone: WorkspaceTone) {
  if (tone === 'GOOD') return 'bg-emerald-500'
  if (tone === 'WARN') return 'bg-amber-500'
  if (tone === 'BAD') return 'bg-red-500'
  if (tone === 'INFO') return 'bg-sky-500'
  return 'bg-zinc-700'
}

function priorityDot(priority: WorkspaceAttentionItem['priority']) {
  if (priority === 'BLOCKER') return 'bg-red-500'
  if (priority === 'HIGH') return 'bg-amber-500'
  return 'bg-sky-500'
}

function money(value: number | null | undefined) {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
