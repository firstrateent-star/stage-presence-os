import { useEffect, useMemo, useState } from 'react'
import { listEconomyRealityCoverage, type EconomyRealityCoverageRow, type RealityCoverageState } from '../lib/realityRepository'

export function EconomyRealityMap() {
  const [rows, setRows] = useState<EconomyRealityCoverageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void listEconomyRealityCoverage()
      .then(data => { if (active) setRows(data) })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Unable to load reality coverage.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const unresolved = useMemo(() => rows.filter(row => row.coverage_state === 'MISSING' || row.coverage_state === 'PARTIAL'), [rows])
  const next = unresolved.slice(0, 3)
  const supported = rows.filter(row => row.coverage_state === 'SUPPORTED').length
  const partial = rows.filter(row => row.coverage_state === 'PARTIAL').length
  const missing = rows.filter(row => row.coverage_state === 'MISSING').length
  const groups = useMemo(() => groupRows(rows), [rows])

  if (loading) return <section className="mt-8 rounded-2xl border border-zinc-900 bg-zinc-950/35 p-5 text-sm text-zinc-600">Mapping backend truth to operating reality…</section>
  if (error) return <section className="mt-8 rounded-2xl border border-red-950 bg-red-950/10 p-5 text-sm text-red-300">Reality coverage could not load. <span className="text-red-500">{error}</span></section>
  if (!rows.length) return null

  return (
    <section className="mt-10 overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-950/45">
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-700">Reality map</div>
            <h2 className="mt-1 text-lg font-semibold text-zinc-200">What still needs to become true in the system?</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">The database can be deep without asking people to understand the database. This view translates backend coverage into the business evidence Stage Presence still needs to produce. It updates as reality is entered.</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <CoverageCount label="Grounded" value={supported} tone="supported" />
            <CoverageCount label="Partial" value={partial} tone="partial" />
            <CoverageCount label="Missing" value={missing} tone="missing" />
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-700">Produce next</div>
              <div className="mt-1 text-sm text-zinc-500">Highest-leverage evidence gaps from the live backend.</div>
            </div>
            <div className="text-[10px] text-zinc-700">Priority follows operating consequence, not database completeness.</div>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {next.map((row, index) => <NextEvidenceCard key={row.domain_code} row={row} order={index + 1} />)}
          </div>
        </div>
      </div>

      <details className="border-t border-zinc-900">
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-zinc-500 hover:text-zinc-300 sm:px-6">Full backend → reality coverage map · {rows.length} domains</summary>
        <div className="border-t border-zinc-900 px-5 py-5 sm:px-6">
          <div className="space-y-7">
            {groups.map(group => (
              <div key={group.name}>
                <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-700">{group.name}</div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {group.rows.map(row => <CoverageCard key={row.domain_code} row={row} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </details>
    </section>
  )
}

function NextEvidenceCard({ row, order }: { row: EconomyRealityCoverageRow; order: number }) {
  const tone = toneFor(row.coverage_state)
  return (
    <div className={`rounded-xl border p-4 ${tone.card}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-700">{order}. {row.domain_group}</div>
        <StateBadge state={row.coverage_state} />
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-4">
        <div className="font-semibold text-zinc-200">{row.label}</div>
        <div className="shrink-0 text-xs font-semibold text-zinc-500">{coverageLabel(row)}</div>
      </div>
      {row.coverage_ratio != null && row.expected_count != null && row.expected_count > 0 ? <Progress value={Number(row.coverage_ratio)} /> : null}
      <div className="mt-3 text-xs leading-5 text-zinc-500"><span className="font-medium text-zinc-400">Produce:</span> {row.evidence_to_produce}</div>
      <div className="mt-3 border-t border-zinc-900/80 pt-3 text-[10px] leading-4 text-zinc-700">Appears in: {row.frontend_surface}</div>
    </div>
  )
}

function CoverageCard({ row }: { row: EconomyRealityCoverageRow }) {
  const tone = toneFor(row.coverage_state)
  return (
    <div className={`rounded-xl border p-4 ${tone.card}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold text-zinc-300">{row.label}</div>
          <div className="mt-1 text-xs leading-5 text-zinc-600">{row.summary}</div>
        </div>
        <div className="shrink-0 text-right">
          <StateBadge state={row.coverage_state} />
          <div className="mt-2 text-xs font-semibold text-zinc-500">{coverageLabel(row)}</div>
        </div>
      </div>
      {row.coverage_ratio != null && row.expected_count != null && row.expected_count > 0 ? <Progress value={Number(row.coverage_ratio)} /> : null}
      <div className="mt-4 grid gap-3 text-xs leading-5 sm:grid-cols-2">
        <div><div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-zinc-700">Why it matters</div><div className="mt-1 text-zinc-600">{row.why_it_matters}</div></div>
        <div><div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-zinc-700">What to produce</div><div className="mt-1 text-zinc-500">{row.evidence_to_produce}</div></div>
      </div>
      <div className="mt-4 rounded-lg border border-zinc-900 bg-zinc-950/45 px-3 py-2.5 text-[10px] leading-4 text-zinc-700">Frontend destination: <span className="text-zinc-600">{row.frontend_surface}</span></div>
      <details className="mt-2 text-[10px] text-zinc-700">
        <summary className="cursor-pointer hover:text-zinc-500">Backend evidence map</summary>
        <div className="mt-2 flex flex-wrap gap-1.5">{row.source_objects.map(object => <code key={object} className="rounded-md border border-zinc-900 bg-zinc-950 px-2 py-1 text-zinc-700">{object}</code>)}</div>
      </details>
    </div>
  )
}

function CoverageCount({ label, value, tone }: { label: string; value: number; tone: 'supported' | 'partial' | 'missing' }) {
  const classes = tone === 'supported' ? 'text-emerald-500' : tone === 'partial' ? 'text-amber-500' : 'text-zinc-300'
  return <div className="min-w-20 rounded-xl border border-zinc-900 bg-zinc-950/60 px-3 py-2 text-center"><div className={`text-lg font-semibold ${classes}`}>{value}</div><div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-700">{label}</div></div>
}

function StateBadge({ state }: { state: RealityCoverageState }) {
  const tone = toneFor(state)
  return <span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] ${tone.badge}`}>{state.replaceAll('_', ' ')}</span>
}

function Progress({ value }: { value: number }) {
  const safe = Math.max(0, Math.min(1, value))
  return <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-900"><div className="h-full rounded-full bg-zinc-600" style={{ width: `${safe * 100}%` }} /></div>
}

function coverageLabel(row: EconomyRealityCoverageRow) {
  if (row.expected_count != null && row.expected_count > 0) return `${row.represented_count} / ${row.expected_count}`
  if (row.represented_count > 0) return `${row.represented_count} represented`
  return 'Not represented'
}

function toneFor(state: RealityCoverageState) {
  if (state === 'SUPPORTED') return { card: 'border-emerald-950/60 bg-emerald-950/5', badge: 'border-emerald-950 text-emerald-600' }
  if (state === 'PARTIAL') return { card: 'border-amber-950/60 bg-amber-950/5', badge: 'border-amber-950 text-amber-500' }
  if (state === 'NOT_APPLICABLE') return { card: 'border-zinc-900 bg-zinc-950/30', badge: 'border-zinc-900 text-zinc-700' }
  return { card: 'border-zinc-900 bg-zinc-950/55', badge: 'border-zinc-800 text-zinc-500' }
}

function groupRows(rows: EconomyRealityCoverageRow[]) {
  const order = ['Job economics', 'Company economy', 'Assets + capability', 'People + labor', 'Pricing + assumptions', 'Recovered evidence']
  return order
    .map(name => ({ name, rows: rows.filter(row => row.domain_group === name) }))
    .filter(group => group.rows.length)
}
