import { useEffect, useMemo, useState } from 'react'
import {
  getEngagementQuoteReadiness,
  listEngagementQuoteLineCandidates,
  type EngagementQuoteLineCandidateRow,
  type EngagementQuoteReadinessRow,
} from '../lib/commercialRepository'
import { presentCommercialLine, presentCommercialReadiness } from '../lib/commercialPresentation'

export function CommercialIntelligencePanel({ engagementId }: { engagementId: string }) {
  const [readiness, setReadiness] = useState<EngagementQuoteReadinessRow | null>(null)
  const [lines, setLines] = useState<EngagementQuoteLineCandidateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    void Promise.all([
      getEngagementQuoteReadiness(engagementId),
      listEngagementQuoteLineCandidates(engagementId),
    ]).then(([nextReadiness, nextLines]) => {
      if (!active) return
      setReadiness(nextReadiness)
      setLines(nextLines)
    }).catch((err) => {
      if (!active) return
      setError(err instanceof Error ? err.message : 'Unable to load commercial intelligence.')
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => { active = false }
  }, [engagementId])

  const linePresentations = useMemo(() => lines.map(presentCommercialLine), [lines])

  if (loading) {
    return (
      <section className="mt-8 rounded-2xl border border-zinc-900 bg-zinc-950/40 p-5">
        <div className="text-sm text-zinc-600">Loading commercial intelligence…</div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="mt-8 rounded-2xl border border-red-950 bg-red-950/10 p-5">
        <div className="text-sm font-medium text-red-300">Commercial intelligence could not load.</div>
        <div className="mt-1 text-xs leading-5 text-red-400/70">{error}</div>
      </section>
    )
  }

  if (!readiness) return null

  const view = presentCommercialReadiness(readiness, lines)
  const reviewLines = linePresentations.filter((line) => line.needsReview)
  const governedLines = linePresentations.filter((line) => !line.needsReview && line.authorityLabel !== 'Included component')
  const includedLines = linePresentations.filter((line) => line.authorityLabel === 'Included component')

  return (
    <section className="mt-8 rounded-2xl border border-zinc-900 bg-zinc-950/45">
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-700">Commercial</div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-zinc-200">Quote intelligence</h2>
              <StateBadge tone={view.stateTone}>{view.stateLabel}</StateBadge>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">{view.headline}</p>
          </div>

          {view.currentQuoteLabel && (
            <div className="min-w-40 rounded-xl border border-zinc-900 bg-zinc-950/60 px-4 py-3 text-right">
              <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-700">Current source quote</div>
              <div className="mt-1 text-base font-semibold text-zinc-300">{view.currentQuoteLabel}</div>
              {view.currentQuoteState && <div className="mt-1 text-[10px] text-zinc-700">{view.currentQuoteState}</div>}
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="Price decisions" value={view.priceDecisionCount} />
          <Metric label="Needs judgment" value={view.reviewCount} emphasis={view.reviewCount > 0} />
          <Metric label="Current references" value={view.currentReferenceCount} />
          <Metric label="No authority" value={view.noAuthorityCount} emphasis={view.noAuthorityCount > 0} />
        </div>

        <div className="mt-5 rounded-xl border border-zinc-900 bg-zinc-950/55 px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-700">Why the system says this</div>
          <p className="mt-1 text-xs leading-5 text-zinc-500">{view.reason}</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-zinc-700">
          <span>{view.approvedCount} approved-rule line{view.approvedCount === 1 ? '' : 's'}</span>
          <span>{view.historyOnlyCount} history-only line{view.historyOnlyCount === 1 ? '' : 's'}</span>
          <span>{view.includedComponentCount} included package component{view.includedComponentCount === 1 ? '' : 's'}</span>
        </div>
      </div>

      <details className="border-t border-zinc-900">
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-zinc-500 hover:text-zinc-300 sm:px-6">
          Review scope + price evidence · {lines.length} line{lines.length === 1 ? '' : 's'}
        </summary>
        <div className="border-t border-zinc-900 px-5 py-5 sm:px-6">
          <div className="mb-4 rounded-xl border border-sky-950/70 bg-sky-950/10 px-4 py-3 text-xs leading-5 text-sky-300/75">
            Read-only reality test. Current references and historical prices are evidence, not approved pricing authority. Nothing here sends, approves, reserves, or changes a quote.
          </div>

          {reviewLines.length > 0 && (
            <LineGroup title="Needs commercial judgment" description="These are the lines most useful to compare against real quoting decisions." lines={reviewLines} />
          )}
          {governedLines.length > 0 && (
            <LineGroup title="Covered / governed" description="These lines do not currently require a new pricing decision." lines={governedLines} />
          )}
          {includedLines.length > 0 && (
            <LineGroup title="Included components" description="Visible for scope truth, excluded from independent pricing decisions." lines={includedLines} />
          )}
          {linePresentations.length === 0 && <div className="text-sm text-zinc-600">No represented scope lines are available yet.</div>}
        </div>
      </details>
    </section>
  )
}

function LineGroup({ title, description, lines }: { title: string; description: string; lines: ReturnType<typeof presentCommercialLine>[] }) {
  return (
    <div className="mb-7 last:mb-0">
      <div className="mb-3">
        <div className="text-sm font-semibold text-zinc-300">{title}</div>
        <div className="mt-1 text-xs text-zinc-700">{description}</div>
      </div>
      <div className="space-y-2">
        {lines.map((line) => <CommercialLine key={line.id} line={line} />)}
      </div>
    </div>
  )
}

function CommercialLine({ line }: { line: ReturnType<typeof presentCommercialLine> }) {
  return (
    <div className="rounded-xl border border-zinc-900 bg-zinc-950/55 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium text-zinc-300">{line.title}</div>
            {line.quantityText && <span className="text-[10px] text-zinc-700">{line.quantityText}</span>}
          </div>
          <div className="mt-1 text-[10px] text-zinc-700">{line.context}</div>
        </div>
        <AuthorityBadge tone={line.authorityTone}>{line.authorityLabel}</AuthorityBadge>
      </div>
      <div className="mt-3 border-t border-zinc-900 pt-3">
        <div className="text-sm font-medium text-zinc-400">{line.priceText}</div>
        {line.priceDetail && <div className="mt-1 text-xs leading-5 text-zinc-600">{line.priceDetail}</div>}
      </div>
    </div>
  )
}

function Metric({ label, value, emphasis = false }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-3 ${emphasis ? 'border-amber-950 bg-amber-950/10' : 'border-zinc-900 bg-zinc-950/55'}`}>
      <div className={`text-lg font-semibold ${emphasis ? 'text-amber-400' : 'text-zinc-300'}`}>{value}</div>
      <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-zinc-700">{label}</div>
    </div>
  )
}

function StateBadge({ tone, children }: { tone: 'quiet' | 'watch' | 'good'; children: React.ReactNode }) {
  const classes = tone === 'good'
    ? 'border-emerald-950 text-emerald-400'
    : tone === 'watch'
      ? 'border-amber-950 text-amber-400'
      : 'border-zinc-800 text-zinc-500'
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${classes}`}>{children}</span>
}

function AuthorityBadge({ tone, children }: { tone: 'good' | 'watch' | 'quiet' | 'risk'; children: React.ReactNode }) {
  const classes = tone === 'good'
    ? 'border-emerald-950 text-emerald-500'
    : tone === 'watch'
      ? 'border-amber-950 text-amber-500'
      : tone === 'risk'
        ? 'border-red-950 text-red-400'
        : 'border-zinc-900 text-zinc-600'
  return <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-semibold ${classes}`}>{children}</span>
}
