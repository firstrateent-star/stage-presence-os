import { useEffect, useState } from 'react'
import { getCaptureEvaluation, type CaptureEvaluationSnapshot } from '../lib/captureEvaluation'

export function CaptureLearningPanel() {
  const [snapshot, setSnapshot] = useState<CaptureEvaluationSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void getCaptureEvaluation()
      .then(next => { if (active) setSnapshot(next) })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Unable to load Capture learning evidence.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  if (loading) return <div className="rounded-xl border border-zinc-900 bg-zinc-950/45 p-4 text-xs text-zinc-600">Reading Capture review evidence…</div>
  if (error) return <div className="rounded-xl border border-red-950/60 bg-red-950/10 p-4 text-xs text-red-300">{error}</div>
  if (!snapshot) return null

  if (snapshot.reviewCount === 0) {
    return (
      <div className="rounded-xl border border-zinc-900 bg-zinc-950/45 p-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-700">Capture learning</div>
        <div className="mt-1 text-sm font-semibold text-zinc-300">Not yet observed</div>
        <p className="mt-2 text-xs leading-5 text-zinc-600">Capture Intelligence has not yet produced a persisted human review trace in live operation. That is a valid state. Review evidence will appear here automatically after people begin approving, rejecting, tracking, or deferring interpreted Capture proposals.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-900 bg-zinc-950/45 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-700">Capture learning</div>
          <div className="mt-1 text-sm font-semibold text-zinc-300">Human review evidence</div>
          <p className="mt-1 max-w-2xl text-[11px] leading-5 text-zinc-600">These counts describe human interaction with interpreter proposals. They are not an AI accuracy score and do not prove whether a reviewed proposal matched later reality.</p>
        </div>
        <div className="text-right text-[10px] text-zinc-700">{snapshot.reviewCount} review{snapshot.reviewCount === 1 ? '' : 's'}{snapshot.lastReviewedAt ? ` · latest ${formatDate(snapshot.lastReviewedAt)}` : ''}</div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Metric label="Approved" value={snapshot.approvedCount} />
        <Metric label="Rejected" value={snapshot.rejectedCount} />
        <Metric label="Unreviewed" value={snapshot.unreviewedCount} />
        <Metric label="Held non-actionable" value={snapshot.heldNonActionableCount} />
      </div>

      {snapshot.byKind.length > 0 && (
        <div className="mt-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-700">By proposal kind</div>
          <div className="mt-2 space-y-2">
            {snapshot.byKind.map(row => (
              <div key={row.kind} className="rounded-lg border border-zinc-900 bg-zinc-950/60 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-medium text-zinc-400">{pretty(row.kind)}</div>
                  <div className="text-[10px] text-zinc-700">{row.proposed} proposed</div>
                </div>
                <div className="mt-1 text-[10px] text-zinc-700">{row.approved} approved · {row.rejected} rejected · {row.unreviewed} unreviewed · {row.heldNonActionable} held</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-900 bg-zinc-950/55 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-700">Unknown review</div>
          <div className="mt-2 text-xs text-zinc-500">{snapshot.unknownTrackedCount} tracked · {snapshot.unknownDeferredCount} deferred · {snapshot.unknownUnreviewedCount} unreviewed</div>
          <div className="mt-1 text-[10px] text-zinc-700">{snapshot.unknownCount} interpreter-detected Unknown{snapshot.unknownCount === 1 ? '' : 's'} reviewed in total.</div>
        </div>
        <div className="rounded-lg border border-zinc-900 bg-zinc-950/55 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-700">Interpreter versions</div>
          <div className="mt-2 space-y-1 text-xs text-zinc-500">{snapshot.interpreters.map(row => <div key={row.interpreter}>{row.interpreter} · {row.reviews} review{row.reviews === 1 ? '' : 's'}</div>)}</div>
        </div>
      </div>

      {snapshot.correctionPatterns.length > 0 && (
        <div className="mt-5 rounded-lg border border-rose-950/40 bg-rose-950/5 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-rose-800">Human correction notes</div>
          <div className="mt-2 space-y-2">{snapshot.correctionPatterns.map(row => <div key={row.note} className="text-xs leading-5 text-zinc-500"><span className="mr-2 text-rose-800">×{row.count}</span>{row.note}</div>)}</div>
          <p className="mt-3 text-[10px] leading-5 text-zinc-700">Repeated corrections are candidate eval cases or interpretation hypotheses. They do not automatically become rules or Canon.</p>
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-zinc-900 bg-zinc-950/60 p-3"><div className="text-lg font-semibold text-zinc-300">{value}</div><div className="mt-1 text-[10px] text-zinc-700">{label}</div></div>
}

function pretty(value: string) { return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase()) }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString() }
