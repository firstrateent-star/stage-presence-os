import { formatEngagementDate } from '../lib/engagementDates'
import type { Engagement } from '../types/domain'
import { StateBadge } from './StateBadge'

export function EngagementCard({ engagement, onOpen }: { engagement: Engagement; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(engagement.id)}
      className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-left transition hover:border-zinc-700 hover:bg-zinc-900/70"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium tracking-[0.15em] text-zinc-500">{formatEngagementDate(engagement).toUpperCase()}</div>
          <h3 className="mt-1 text-lg font-semibold text-zinc-100">{engagement.name}</h3>
        </div>
        <div className="shrink-0 text-xs text-zinc-600">{engagement.engagement_number}</div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <StateBadge value={engagement.commercial_state} />
        <StateBadge value={engagement.attention_state} />
      </div>
      {engagement.customer_request && <p className="mt-4 line-clamp-2 text-sm leading-6 text-zinc-400">{engagement.customer_request}</p>}
      <div className="mt-4 border-t border-zinc-900 pt-3 text-sm">
        {engagement.attention_state === 'WAITING' && engagement.waiting_on ? (
          <p><span className="text-zinc-600">Waiting for </span><span className="text-zinc-300">{engagement.waiting_on}</span></p>
        ) : engagement.blocked_reason ? (
          <p><span className="text-zinc-600">Blocked by </span><span className="text-red-300">{engagement.blocked_reason}</span></p>
        ) : engagement.next_action ? (
          <p><span className="text-zinc-600">Next </span><span className="text-zinc-300">{engagement.next_action}</span></p>
        ) : (
          <p className="text-orange-300">Next move needs to be set</p>
        )}
      </div>
    </button>
  )
}
