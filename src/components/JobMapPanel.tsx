import { useEffect, useMemo, useState } from 'react'
import { listEngagementJobMap, type EngagementJobMapRow } from '../lib/operatingRepository'

export function JobMapPanel({ engagementId }: { engagementId: string }) {
  const [rows, setRows] = useState<EngagementJobMapRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    void listEngagementJobMap(engagementId)
      .then((next) => { if (active) setRows(next) })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Unable to load job map.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [engagementId])

  const phases = useMemo(() => groupPhases(rows), [rows])
  const tracked = rows.filter((row) => row.tracking_status !== 'UNTRACKED').length
  const done = rows.filter((row) => row.tracking_status === 'DONE').length
  const assigned = rows.filter((row) => row.step_assignments?.length).length

  return (
    <section className="mt-8 rounded-2xl border border-zinc-900 bg-zinc-950/50">
      <div className="px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-semibold tracking-[0.14em] text-amber-700">JOB MAP</div>
            <h2 className="mt-1 text-xl font-semibold text-zinc-200">Start-to-finish operating path</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">The playbook shows what can go into this type of Engagement. It does not claim a step applies or is complete until the job has real tracking evidence.</p>
          </div>
          {!loading && !error && <div className="grid grid-cols-3 gap-2 text-center"><Metric value={rows.length} label="applicable" /><Metric value={tracked} label="tracked" /><Metric value={assigned} label="assigned" /></div>}
        </div>
      </div>

      {loading ? <div className="border-t border-zinc-900 px-5 py-6 text-sm text-zinc-600">Loading job knowledge…</div> : error ? <div className="border-t border-zinc-900 px-5 py-6 text-sm text-red-400">{error}</div> : (
        <div className="border-t border-zinc-900 px-5 py-4">
          {tracked === 0 && <div className="mb-4 rounded-xl border border-zinc-900 bg-zinc-900/25 px-4 py-3 text-xs leading-5 text-zinc-600">No per-step completion state has been manufactured for this job. The operating path is available as knowledge now; tracking will appear only as Stage Presence actually assigns, starts, completes, skips or blocks steps.</div>}
          {tracked > 0 && <div className="mb-4 text-xs text-zinc-600">{done} of {tracked} tracked steps are complete. Untracked steps remain available process knowledge, not overdue tasks.</div>}
          <div className="space-y-2">
            {phases.map((phase, index) => <Phase key={phase.code} phase={phase} index={index} />)}
          </div>
        </div>
      )}
    </section>
  )
}

function Phase({ phase, index }: { phase: PhaseGroup; index: number }) {
  const tracked = phase.rows.filter((row) => row.tracking_status !== 'UNTRACKED').length
  const active = phase.rows.filter((row) => ['READY', 'ACTIVE', 'WAITING', 'BLOCKED'].includes(row.tracking_status)).length
  const complete = phase.rows.filter((row) => ['DONE', 'SKIPPED', 'NOT_APPLICABLE'].includes(row.tracking_status)).length
  return (
    <details className="rounded-xl border border-zinc-900/80 bg-zinc-950/70" open={active > 0}>
      <summary className="cursor-pointer list-none px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3"><span className="text-[10px] font-semibold text-zinc-700">{String(index + 1).padStart(2, '0')}</span><span className="text-sm font-semibold text-zinc-300">{phase.name}</span></div>
          <div className="text-[10px] text-zinc-700">{phase.rows.length} available{tracked ? ` · ${complete}/${tracked} resolved` : ''}</div>
        </div>
      </summary>
      <div className="border-t border-zinc-900 px-4 py-2">
        {phase.rows.map((row) => <Step key={row.step_id} row={row} />)}
      </div>
    </details>
  )
}

function Step({ row }: { row: EngagementJobMapRow }) {
  const owner = row.owner_display_name || row.owner_username || null
  const assignedNames = (row.step_assignments ?? []).map((item) => typeof item.display_name === 'string' ? item.display_name : typeof item.username === 'string' ? item.username : null).filter(Boolean) as string[]
  return (
    <div className="border-b border-zinc-900 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-zinc-400">{row.title}</span><Status status={row.tracking_status} /><Tiny>{row.requiredness.toLowerCase()}</Tiny>{row.client_touchpoint && <Tiny>client</Tiny>}{row.procedure_depth === 'MAP_ONLY' && <Tiny>needs SOP depth</Tiny>}</div>
          {row.condition_text && <div className="mt-1.5 text-xs leading-5 text-zinc-700">{row.condition_text}</div>}
          {row.tracking_status !== 'UNTRACKED' && row.completion_definition && <div className="mt-2 text-xs leading-5 text-zinc-600"><span className="text-zinc-500">Done when:</span> {row.completion_definition}</div>}
        </div>
        <div className="shrink-0 text-right text-[10px] uppercase tracking-[0.08em] text-zinc-700">{owner || assignedNames.join(', ') || row.default_role_code?.replaceAll('_', ' ') || 'Role varies'}</div>
      </div>
    </div>
  )
}

function Status({ status }: { status: EngagementJobMapRow['tracking_status'] }) {
  const label = status === 'UNTRACKED' ? 'available' : status.replaceAll('_', ' ').toLowerCase()
  const active = ['READY', 'ACTIVE', 'WAITING', 'BLOCKED'].includes(status)
  const done = status === 'DONE'
  return <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${active ? 'border-amber-900/70 text-amber-500' : done ? 'border-emerald-900/70 text-emerald-500' : 'border-zinc-900 text-zinc-700'}`}>{label}</span>
}
function Tiny({ children }: { children: React.ReactNode }) { return <span className="rounded-full border border-zinc-900 px-2 py-0.5 text-[9px] uppercase tracking-[0.08em] text-zinc-700">{children}</span> }
function Metric({ value, label }: { value: number; label: string }) { return <div className="min-w-16 rounded-xl bg-zinc-900/45 px-3 py-2"><div className="text-lg font-semibold text-zinc-300">{value}</div><div className="text-[9px] text-zinc-700">{label}</div></div> }

type PhaseGroup = { code: string; name: string; order: number; rows: EngagementJobMapRow[] }
function groupPhases(rows: EngagementJobMapRow[]): PhaseGroup[] {
  const map = new Map<string, PhaseGroup>()
  for (const row of rows) {
    const current = map.get(row.phase_code)
    if (current) current.rows.push(row)
    else map.set(row.phase_code, { code: row.phase_code, name: row.phase_name, order: row.phase_order, rows: [row] })
  }
  return [...map.values()].sort((a, b) => a.order - b.order).map((phase) => ({ ...phase, rows: phase.rows.sort((a, b) => a.sort_order - b.sort_order) }))
}
