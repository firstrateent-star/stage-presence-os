import { useEffect, useMemo, useState } from 'react'
import { RealityHealthPanel } from '../components/RealityHealthPanel'
import {
  listRecoveryQueue,
  setRecoveryDecision,
  type RecoveryQueueRow,
  type RecoveryStatus,
} from '../lib/recoveryRepository'

type RecoveryFilter = 'NOW' | 'RECOVER' | 'REVIEW' | 'LATER' | 'DECISIONS' | 'ALL'

export function RecoveryScreen({ onOpenEngagement }: { onOpenEngagement: (id: string) => void }) {
  const [rows, setRows] = useState<RecoveryQueueRow[]>([])
  const [filter, setFilter] = useState<RecoveryFilter>('NOW')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')

  async function refresh(preferredKey?: string | null) {
    setError(null)
    try {
      const next = await listRecoveryQueue()
      setRows(next)
      const key = preferredKey ?? selectedKey
      if (key && next.some((item) => item.candidate_key === key)) setSelectedKey(key)
      else setSelectedKey(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Recovery Queue.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  const activeRows = useMemo(
    () => rows.filter((row) => row.status !== 'RESOLVED' && row.status !== 'NOT_RELEVANT'),
    [rows],
  )

  const counts = useMemo(() => ({
    NOW: activeRows.filter((row) => row.urgency === 'NOW' && row.status !== 'DEFERRED').length,
    RECOVER: activeRows.filter((row) => row.lane === 'RECOVER' && row.status !== 'DEFERRED').length,
    REVIEW: activeRows.filter((row) => row.lane === 'REVIEW' && row.status !== 'DEFERRED').length,
    LATER: activeRows.filter((row) => row.urgency === 'LATER' || row.status === 'DEFERRED').length,
    DECISIONS: activeRows.filter((row) => row.lane === 'NEEDS_DECISION' || row.status === 'NEEDS_DECISION').length,
    ALL: activeRows.length,
  }), [activeRows])

  const filtered = useMemo(() => activeRows.filter((row) => {
    if (filter === 'NOW') return row.urgency === 'NOW' && row.status !== 'DEFERRED'
    if (filter === 'RECOVER') return row.lane === 'RECOVER' && row.status !== 'DEFERRED'
    if (filter === 'REVIEW') return row.lane === 'REVIEW' && row.status !== 'DEFERRED'
    if (filter === 'LATER') return row.urgency === 'LATER' || row.status === 'DEFERRED'
    if (filter === 'DECISIONS') return row.lane === 'NEEDS_DECISION' || row.status === 'NEEDS_DECISION'
    return true
  }), [activeRows, filter])

  const selected = filtered.find((row) => row.candidate_key === selectedKey) ?? filtered[0] ?? null

  useEffect(() => {
    setSelectedKey(filtered[0]?.candidate_key ?? null)
  }, [filter])

  useEffect(() => {
    setNote(selected?.decision_note ?? '')
  }, [selected?.candidate_key])

  async function decide(status: RecoveryStatus) {
    if (!selected) return
    setSaving(true)
    setError(null)
    try {
      await setRecoveryDecision(selected, status, note)
      await refresh(selected.candidate_key)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save Recovery decision.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="sm:ml-48 py-20 text-zinc-600">Finding recoverable reality…</div>

  return (
    <div className="sm:ml-48">
      <header className="mb-7">
        <p className="text-sm text-zinc-500">Find what we know → recover what we can → ask what matters.</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">Recovery</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">The queue turns uncertainty into focused review without pretending every blank deserves attention. Candidates are derived; canonical business truth stays in its proper domain.</p>
          </div>
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950/70 px-4 py-3 text-right">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-700">Active candidates</div>
            <div className="mt-1 text-xl font-semibold text-zinc-200">{activeRows.length}</div>
            <div className="mt-1 text-[10px] text-zinc-700">{counts.NOW} now · {counts.RECOVER} recoverable · {counts.DECISIONS} decisions</div>
          </div>
        </div>
      </header>

      <RealityHealthPanel />

      {error && <div className="mb-5 rounded-xl border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="mb-5 flex flex-wrap gap-2">
        {(['NOW','RECOVER','REVIEW','LATER','DECISIONS','ALL'] as RecoveryFilter[]).map((value) => (
          <button
            type="button"
            key={value}
            onClick={() => setFilter(value)}
            className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${filter === value ? 'border-amber-500/70 bg-amber-500/10 text-amber-300' : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'}`}
          >
            {labelForFilter(value)} <span className="ml-1 text-[10px] opacity-60">{counts[value]}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(330px,0.78fr)]">
        <section className="space-y-3">
          {filtered.length ? filtered.map((item) => (
            <RecoveryCard
              key={item.candidate_key}
              item={item}
              selected={item.candidate_key === selected?.candidate_key}
              onSelect={() => setSelectedKey(item.candidate_key)}
            />
          )) : <Empty />}
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          {selected ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-2xl shadow-black/20">
              <div className="flex flex-wrap items-center gap-2">
                <UrgencyBadge urgency={selected.urgency} />
                <span className="rounded-full border border-zinc-800 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">{pretty(selected.domain)}</span>
                <span className="rounded-full border border-zinc-800 px-2 py-1 text-[10px] text-zinc-600">{selected.confidence.toLowerCase()} confidence</span>
              </div>

              <h2 className="mt-4 text-xl font-semibold text-zinc-100">{selected.title}</h2>
              {(selected.engagement_name || selected.resource_name) && <p className="mt-1 text-sm text-zinc-500">{selected.engagement_name || selected.resource_name}</p>}
              <p className="mt-4 text-sm leading-6 text-zinc-400">{selected.description}</p>

              <DetailBlock title="Why it matters"><p>{selected.business_impact}</p></DetailBlock>
              <DetailBlock title="Suggested action"><p>{selected.suggested_action}</p></DetailBlock>
              <DetailBlock title="Evidence">
                <div className="space-y-2 text-xs text-zinc-500">
                  <div><span className="text-zinc-700">Source:</span> {selected.source_label || 'Derived system evidence'}</div>
                  <Evidence evidence={selected.evidence} />
                </div>
              </DetailBlock>

              <div className="mt-5">
                <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-700">Review note</label>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="What did we learn, verify, or decide?"
                  className="mt-2 min-h-24 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-300 outline-none placeholder:text-zinc-800 focus:border-zinc-600"
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                {selected.engagement_id && (
                  <button type="button" onClick={() => onOpenEngagement(selected.engagement_id!)} className="col-span-2 rounded-xl bg-amber-500 px-3 py-2.5 text-sm font-bold text-zinc-950 hover:bg-amber-400">Open engagement</button>
                )}
                {selected.status !== 'IN_REVIEW' && <ActionButton disabled={saving} onClick={() => void decide('IN_REVIEW')}>In review</ActionButton>}
                {selected.status !== 'NEEDS_DECISION' && <ActionButton disabled={saving} onClick={() => void decide('NEEDS_DECISION')}>Needs decision</ActionButton>}
                <ActionButton disabled={saving} onClick={() => void decide('DEFERRED')}>Defer</ActionButton>
                <ActionButton disabled={saving} onClick={() => void decide('NOT_RELEVANT')}>Not relevant</ActionButton>
                <ActionButton disabled={saving} onClick={() => void decide('RESOLVED')}>Resolved</ActionButton>
                {selected.status !== 'OPEN' && <ActionButton disabled={saving} onClick={() => void decide('OPEN')}>Reopen</ActionButton>}
              </div>

              <p className="mt-4 text-[10px] leading-5 text-zinc-700">Resolving this review item does not silently change schedules, pricing, resources, payments, assignments, or any other canonical business truth. Make real corrections in the owning domain.</p>
            </div>
          ) : <div className="rounded-2xl border border-zinc-900 p-5 text-sm text-zinc-600">Nothing in this lane needs attention.</div>}
        </aside>
      </div>
    </div>
  )
}

function RecoveryCard({ item, selected, onSelect }: { item: RecoveryQueueRow; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className={`w-full rounded-2xl border p-4 text-left transition ${selected ? 'border-zinc-600 bg-zinc-900/70' : 'border-zinc-900 bg-zinc-950/50 hover:border-zinc-700'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <UrgencyBadge urgency={item.urgency} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-700">{pretty(item.domain)}</span>
          </div>
          <div className="mt-2 text-base font-semibold text-zinc-200">{item.title}</div>
          {(item.engagement_name || item.resource_name) && <div className="mt-1 truncate text-xs text-zinc-600">{item.engagement_name || item.resource_name}</div>}
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-500">{item.description}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="rounded-full border border-zinc-900 px-2 py-1 text-[10px] text-zinc-600">{laneLabel(item.lane)}</div>
          {item.status !== 'OPEN' && <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-700">{pretty(item.status)}</div>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-900 pt-3 text-[10px] text-zinc-700">
        <span>{item.source_label || 'Derived evidence'}</span>
        <span>{item.confidence.toLowerCase()} confidence · score {item.priority_score}</span>
      </div>
    </button>
  )
}

function UrgencyBadge({ urgency }: { urgency: RecoveryQueueRow['urgency'] }) {
  const style = urgency === 'NOW' ? 'border-red-900/70 bg-red-950/30 text-red-400' : urgency === 'SOON' ? 'border-amber-900/70 bg-amber-950/20 text-amber-500' : 'border-zinc-800 text-zinc-600'
  return <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${style}`}>{urgency}</span>
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mt-5 border-t border-zinc-900 pt-4"><div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-700">{title}</div><div className="mt-2 text-sm leading-6 text-zinc-500">{children}</div></div>
}

function Evidence({ evidence }: { evidence: Record<string, unknown> | null }) {
  if (!evidence || !Object.keys(evidence).length) return <div>No structured evidence preview.</div>
  return <div className="space-y-1.5">{Object.entries(evidence).map(([key, value]) => <div key={key}><span className="text-zinc-700">{pretty(key)}:</span> {readable(value)}</div>)}</div>
}

function ActionButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="rounded-xl border border-zinc-800 px-3 py-2.5 text-xs font-semibold text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40">{children}</button>
}

function Empty() { return <div className="rounded-2xl border border-zinc-900 bg-zinc-950/30 p-6 text-sm leading-6 text-zinc-600">Nothing in this lane currently earns attention. That is a valid state.</div> }
function pretty(value: string) { return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) }
function laneLabel(value: RecoveryQueueRow['lane']) { if (value === 'RECOVER') return 'Recover'; if (value === 'ASK_WHEN_RELEVANT') return 'Ask later'; if (value === 'NEEDS_DECISION') return 'Decision'; return 'Review' }
function labelForFilter(value: RecoveryFilter) { if (value === 'RECOVER') return 'Recover'; if (value === 'REVIEW') return 'Review'; if (value === 'LATER') return 'Later'; if (value === 'DECISIONS') return 'Decisions'; if (value === 'ALL') return 'All'; return 'Now' }
function readable(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) return value.map(readable).join(' · ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
