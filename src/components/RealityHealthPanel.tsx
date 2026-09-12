import { useEffect, useState } from 'react'
import { getRealityHealth, type RealityHealthRow, type RealityHealthSnapshot, type RealityHealthState } from '../lib/realityHealth'

export function RealityHealthPanel() {
  const [snapshot, setSnapshot] = useState<RealityHealthSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void getRealityHealth()
      .then((next) => { if (active) setSnapshot(next) })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Unable to load Reality Health.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  if (loading) return <div className="mb-6 rounded-2xl border border-zinc-900 bg-zinc-950/40 p-5 text-sm text-zinc-600">Reading reality coverage…</div>
  if (error) return <div className="mb-6 rounded-2xl border border-red-950/60 bg-red-950/10 p-4 text-sm text-red-300">{error}</div>
  if (!snapshot) return null

  const decisionRelevant = snapshot.rows.filter(row => row.state === 'DECISION_RELEVANT_GAP')

  return (
    <details className="mb-7 rounded-2xl border border-zinc-900 bg-zinc-950/45">
      <summary className="cursor-pointer px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700">Vlourish observatory</div>
            <div className="mt-1 text-sm font-semibold text-zinc-300">Reality Health</div>
            <div className="mt-1 text-xs text-zinc-600">Supported, partial, unknown, or not yet observed — never a fake completeness score.</div>
          </div>
          <div className="text-right text-[10px] text-zinc-700">{snapshot.reviewTraceCount} Capture review trace{snapshot.reviewTraceCount === 1 ? '' : 's'}</div>
        </div>
      </summary>
      <div className="border-t border-zinc-900 p-5">
        {decisionRelevant.length > 0 && (
          <div className="mb-5 rounded-xl border border-amber-950/60 bg-amber-950/10 p-3 text-xs leading-5 text-amber-200/70">
            {decisionRelevant.length} domain{decisionRelevant.length === 1 ? '' : 's'} currently contain a decision-relevant gap.
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {snapshot.rows.map(row => <HealthCard key={row.domain} row={row} />)}
        </div>
        <p className="mt-5 text-[10px] leading-5 text-zinc-700">Reality Health describes what the OS can currently support with evidence. “Not yet observed” never means the business activity did not happen; it means the OS does not yet hold enough structured evidence to claim it.</p>
      </div>
    </details>
  )
}

function HealthCard({ row }: { row: RealityHealthRow }) {
  return <div className="rounded-xl border border-zinc-900 bg-zinc-950/65 p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="text-sm font-semibold text-zinc-300">{row.domain}</div>
      <StateBadge state={row.state} />
    </div>
    <p className="mt-2 text-xs leading-5 text-zinc-600">{row.summary}</p>
    <div className="mt-3 border-t border-zinc-900 pt-2 text-[10px] text-zinc-700">{row.evidence}</div>
  </div>
}

function StateBadge({ state }: { state: RealityHealthState }) {
  const style = state === 'SUPPORTED'
    ? 'border-emerald-950/80 text-emerald-600'
    : state === 'PARTIAL'
      ? 'border-sky-950/80 text-sky-600'
      : state === 'DECISION_RELEVANT_GAP'
        ? 'border-amber-900/80 text-amber-500'
        : 'border-zinc-800 text-zinc-600'
  return <span className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] ${style}`}>{state.replaceAll('_', ' ')}</span>
}
