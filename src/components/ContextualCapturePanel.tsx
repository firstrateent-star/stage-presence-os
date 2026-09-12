import { useState } from 'react'
import { CaptureIntelligencePanel } from './CaptureIntelligencePanel'

export function ContextualCapturePanel({
  engagementId,
  engagementName,
  eventDate,
  onApplied,
}: {
  engagementId: string
  engagementName: string
  eventDate: string | null
  onApplied?: () => void
}) {
  const [rawText, setRawText] = useState('')

  return (
    <details className="rounded-2xl border border-sky-950/60 bg-sky-950/5">
      <summary className="cursor-pointer px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-600">Reality intake</div>
            <div className="mt-1 text-sm font-semibold text-zinc-300">Capture an update about this Engagement</div>
            <div className="mt-1 text-xs text-zinc-600">Say what changed. Stage Presence will preserve the source, propose governed updates, and keep uncertainty explicit.</div>
          </div>
          <span className="rounded-full border border-sky-950 px-2 py-1 text-[10px] text-sky-700">context already selected</span>
        </div>
      </summary>

      <div className="border-t border-sky-950/40 p-5">
        <label className="text-xs font-medium text-zinc-500">What happened?</label>
        <textarea
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
          rows={4}
          placeholder="Example: Scott and Ben confirmed. Load-in moved to 9am. Taking the 17x10 trailer."
          className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm leading-6 text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-sky-800"
        />
        <p className="mt-2 text-[10px] leading-5 text-zinc-700">This is the fast path for ordinary updates. Manual structured Capture remains available from + Capture when you need to place a fact, unknown, or next move directly.</p>

        {rawText.trim() && (
          <CaptureIntelligencePanel
            engagementId={engagementId}
            engagementName={engagementName}
            eventDate={eventDate}
            rawText={rawText}
            onApplied={() => {
              setRawText('')
              onApplied?.()
            }}
          />
        )}
      </div>
    </details>
  )
}
