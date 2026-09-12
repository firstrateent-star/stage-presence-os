import { useCallback, useEffect, useState } from 'react'
import { loadDeliveryReadiness, type DeliveryReadiness, type ReadinessCheck, type ReadinessTone } from '../lib/deliveryReadiness'

export function DeliveryReadinessPanel({ engagementId }: { engagementId: string }) {
  const [model, setModel] = useState<DeliveryReadiness | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setModel(await loadDeliveryReadiness(engagementId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to read delivery readiness.')
    } finally {
      setLoading(false)
    }
  }, [engagementId])

  useEffect(() => { void refresh() }, [refresh])

  return (
    <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/55 p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-semibold tracking-[0.18em] text-amber-500">DELIVERY READINESS</div>
          <h2 className="mt-2 text-xl font-semibold text-zinc-100">What is represented well enough to operate?</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-500">This is an evidence posture, not a magic score. Missing records are not automatically failures, and configured equipment is not treated as reserved capacity.</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading} className="self-start rounded-xl border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-200 disabled:opacity-40">Refresh</button>
      </div>

      {error && <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</div>}
      {loading && !model ? <div className="mt-5 text-sm text-zinc-600">Reading delivery truth…</div> : null}

      {model && (
        <>
          <div className={`mt-5 rounded-2xl border p-4 ${postureClass(model.posture)}`}>
            <div className="text-[10px] font-bold tracking-[0.14em] text-zinc-600">{model.posture.replaceAll('_', ' ')}</div>
            <div className="mt-2 text-base font-semibold text-zinc-100">{model.title}</div>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-500">{model.explanation}</p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {model.checks.map((check) => <ReadinessCard key={check.code} check={check} />)}
          </div>
        </>
      )}
    </section>
  )
}

function ReadinessCard({ check }: { check: ReadinessCheck }) {
  return <div className={`rounded-xl border p-4 ${toneClass(check.tone)}`}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-[10px] font-bold tracking-[0.13em] text-zinc-700">{check.label.toUpperCase()}</div>
        <div className="mt-2 text-sm font-semibold text-zinc-200">{check.value}</div>
      </div>
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass(check.tone)}`} />
    </div>
    <p className="mt-2 text-xs leading-5 text-zinc-600">{check.detail}</p>
  </div>
}

function postureClass(posture: DeliveryReadiness['posture']) {
  if (posture === 'SUPPORTED') return 'border-emerald-950/70 bg-emerald-950/10'
  if (posture === 'NEEDS_STRUCTURING') return 'border-red-950/70 bg-red-950/10'
  if (posture === 'NEEDS_REVIEW') return 'border-amber-950/70 bg-amber-950/10'
  return 'border-zinc-900 bg-zinc-950/40'
}

function toneClass(tone: ReadinessTone) {
  if (tone === 'good') return 'border-emerald-950/60 bg-emerald-950/5'
  if (tone === 'watch') return 'border-amber-950/60 bg-amber-950/5'
  if (tone === 'missing') return 'border-red-950/60 bg-red-950/5'
  return 'border-zinc-900 bg-zinc-950/40'
}

function dotClass(tone: ReadinessTone) {
  if (tone === 'good') return 'bg-emerald-500'
  if (tone === 'watch') return 'bg-amber-500'
  if (tone === 'missing') return 'bg-red-500'
  return 'bg-zinc-700'
}
