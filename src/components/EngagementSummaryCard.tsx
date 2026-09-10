import type { EngagementCardPresentation } from '../lib/presentationModel'

export function EngagementSummaryCard({
  card,
  onOpen,
  compact = false,
  capacityMode = false,
}: {
  card: EngagementCardPresentation
  onOpen: (id: string) => void
  compact?: boolean
  capacityMode?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(card.id)}
      className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-4 text-left transition hover:border-zinc-700 hover:bg-zinc-900/50"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-700">{card.eyebrow}</div>
          <h3 className={`${compact ? 'mt-1 text-base' : 'mt-1 text-lg'} truncate font-semibold text-zinc-100`}>{card.title}</h3>
          <div className="mt-1 truncate text-xs text-zinc-600">{card.context}</div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {capacityMode && card.capacityLabel ? (
            <span className="rounded-full border border-amber-900/60 px-2 py-1 text-[10px] font-semibold text-amber-500">{card.capacityLabel}</span>
          ) : card.valueText ? (
            <span className="text-sm font-semibold text-zinc-400">{card.valueText}</span>
          ) : (
            <span className="rounded-full border border-zinc-900 px-2 py-1 text-[10px] font-semibold text-zinc-500">{card.stateLabel}</span>
          )}
          {!compact && !capacityMode && <span className="rounded-full border border-zinc-900 px-2 py-1 text-[10px] font-semibold text-zinc-500">{card.stateLabel}</span>}
          {!compact && card.capacityLabel && <span className="rounded-full border border-amber-900/60 px-2 py-1 text-[10px] font-semibold text-amber-500">{card.capacityLabel}</span>}
        </div>
      </div>

      {!compact && card.narrative && <p className="mt-4 line-clamp-2 text-sm leading-6 text-zinc-400">{card.narrative}</p>}

      {!compact && (
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-zinc-900 pt-3">
          <TinyStat label={card.valueLabel || 'Value'} value={card.valueText || '—'} />
          <TinyStat label="Open actions" value={card.openActionsText} />
          <TinyStat label="Plan lines" value={card.planLinesText} />
        </div>
      )}

      <div className={`${compact ? 'mt-3 border-t border-zinc-900 pt-3' : 'mt-4 rounded-xl bg-zinc-900/45 px-3 py-3'}`}>
        {!compact && <div className="text-[10px] font-semibold tracking-[0.12em] text-zinc-600">{card.movementLabel}</div>}
        <div className={`${compact ? 'text-sm text-zinc-500' : 'mt-1 text-sm font-medium text-zinc-300'}`}>{card.movementText}</div>
        {!compact && card.movementDetail && <div className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-600">{card.movementDetail}</div>}
      </div>
    </button>
  )
}

function TinyStat({ label, value }: { label: string; value: string }) {
  return <div><div className="truncate text-[9px] font-semibold uppercase tracking-[0.1em] text-zinc-700">{label}</div><div className="mt-1 truncate text-xs font-medium text-zinc-400">{value}</div></div>
}
