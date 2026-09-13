import { useEffect, useMemo, useState } from 'react'
import { DeliveryReadinessPanel } from './DeliveryReadinessPanel'
import { JobWorkspacePanel } from './JobWorkspacePanel'
import { OperationsCommandPanel } from './OperationsCommandPanel'
import { listEngagementMovementCandidates, type MovementCandidateRow } from '../lib/operatingRepository'

export function MovementFocusPanel({ engagementId }: { engagementId: string }) {
  const [rows, setRows] = useState<MovementCandidateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [workspaceRevision, setWorkspaceRevision] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    void listEngagementMovementCandidates(engagementId)
      .then((next) => { if (active) setRows(next) })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Unable to load movement signals.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [engagementId, workspaceRevision])

  const { uncovered, covered } = useMemo(() => {
    const sorted = [...rows].sort((a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency) || b.priority_score - a.priority_score)
    return {
      uncovered: sorted.filter((row) => row.continuity_state === 'UNMATERIALIZED'),
      covered: sorted.filter((row) => row.continuity_state === 'COVERED'),
    }
  }, [rows])

  return (
    <>
      <JobWorkspacePanel key={`${engagementId}:${workspaceRevision}`} engagementId={engagementId} />
      <div className="mt-5">
        <OperationsCommandPanel engagementId={engagementId} onChanged={() => setWorkspaceRevision((value) => value + 1)} />
      </div>
      <DeliveryReadinessPanel key={`delivery:${workspaceRevision}`} engagementId={engagementId} />

      <section className="mt-8 rounded-2xl border border-zinc-900 bg-zinc-950/45 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700">Selective movement</div>
            <h2 className="mt-1 text-lg font-semibold text-zinc-200">What the system sees next</h2>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-600">Derived from represented business reality and the lifecycle Playbook. These are explainable signals, not automatically created obligations.</p>
          </div>
          {!loading && !error && <div className="rounded-full border border-zinc-900 px-3 py-1 text-[10px] text-zinc-600">{uncovered.length} uncovered · {covered.length} covered</div>}
        </div>

        {loading ? <div className="mt-5 text-sm text-zinc-700">Reading current movement…</div> : error ? <div className="mt-5 text-sm text-red-400">{error}</div> : uncovered.length ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">{uncovered.slice(0, 4).map((row) => <MovementCard key={row.candidate_key} row={row} />)}</div>
        ) : <div className="mt-5 rounded-xl border border-zinc-900 bg-zinc-950/50 p-4 text-sm leading-6 text-zinc-600">No uncovered NOW / SOON / WATCH movement is derived for this Engagement from the current deterministic rules.</div>}

        {covered.length > 0 && <details className="mt-4 border-t border-zinc-900 pt-4"><summary className="cursor-pointer text-xs font-medium text-zinc-600 hover:text-zinc-300">{covered.length} signal{covered.length === 1 ? '' : 's'} already covered by persisted work</summary><div className="mt-3 space-y-2">{covered.map((row) => <div key={row.candidate_key} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-900 px-3 py-2 text-xs text-zinc-600"><span>{row.step_title}</span><span>{row.urgency} · covered</span></div>)}</div></details>}
      </section>
    </>
  )
}

function MovementCard({ row }: { row: MovementCandidateRow }) {
  return <div className="rounded-xl border border-zinc-900 bg-zinc-950/70 p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-700">{row.urgency} · {row.focus_domain}</div><div className="mt-1 text-sm font-semibold text-zinc-200">{row.step_title}</div><div className="mt-1 text-[10px] text-zinc-700">{row.phase_name}</div></div><span className="shrink-0 rounded-full border border-zinc-900 px-2 py-1 text-[10px] text-zinc-600">{row.recommended_handling.toLowerCase()}</span></div><p className="mt-3 text-xs leading-5 text-zinc-500">{row.why_now}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-zinc-900 pt-3 text-[10px] text-zinc-700"><span>{row.materiality.toLowerCase()} materiality</span><span>{row.certainty_state.toLowerCase()} basis</span>{row.should_create_work && <span>continuity action likely warranted</span>}</div></div>
}

function urgencyRank(value: MovementCandidateRow['urgency']) {
  if (value === 'NOW') return 1
  if (value === 'SOON') return 2
  if (value === 'WATCH') return 3
  return 4
}
