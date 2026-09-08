import { StateBadge } from '../components/StateBadge'
import type { Engagement } from '../types/domain'

export function EngagementDetailScreen({ engagement, onBack }: { engagement: Engagement | undefined; onBack: () => void }) {
  if (!engagement) return <div className="sm:ml-48"><button onClick={onBack}>← Back</button><p className="mt-6 text-zinc-500">Engagement not found.</p></div>
  return (
    <div className="sm:ml-48">
      <button type="button" onClick={onBack} className="mb-5 text-sm text-zinc-500 hover:text-zinc-200">← Engagements</button>
      <div className="flex flex-col gap-4 border-b border-zinc-900 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs tracking-[0.14em] text-zinc-600">{engagement.engagement_number}</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{engagement.name}</h1>
          <div className="mt-3 flex flex-wrap gap-2"><StateBadge value={engagement.commercial_state} /><StateBadge value={engagement.commitment_state} /><StateBadge value={engagement.operational_state} /><StateBadge value={engagement.attention_state} /></div>
        </div>
        <div className="text-sm text-zinc-500">{engagement.event_start ? new Date(engagement.event_start).toLocaleString() : 'Date unknown'}</div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Panel title="Outcome" value={engagement.desired_outcome} empty="Outcome has not been defined yet." />
        <Panel title="Customer Asked For" value={engagement.customer_request} empty="Literal customer request has not been captured yet." />
        <Panel title="Known" value="Facts will appear here once the database fact layer is connected." />
        <Panel title="Need to Know" value="Material unknowns will appear here without automatically blocking progress." />
        <Panel title="Resources" value="Requested and considered resources will appear here. Resource existence will never be presented as availability." />
        <section className="rounded-2xl border border-amber-900/50 bg-amber-950/10 p-5">
          <div className="text-xs font-semibold tracking-[0.16em] text-amber-500">NEXT MOVE</div>
          <div className="mt-3 text-lg font-medium text-zinc-100">{engagement.next_action ?? 'Needs to be set'}</div>
          {engagement.next_action_at && <div className="mt-2 text-sm text-zinc-500">Due {new Date(engagement.next_action_at).toLocaleString()}</div>}
          {engagement.waiting_on && <div className="mt-2 text-sm text-amber-300">Waiting on {engagement.waiting_on}</div>}
          {engagement.blocked_reason && <div className="mt-2 text-sm text-red-300">Blocked: {engagement.blocked_reason}</div>}
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-zinc-900 bg-zinc-950/70 p-5">
        <div className="text-xs font-semibold tracking-[0.16em] text-zinc-600">ACTIVITY</div>
        <p className="mt-3 text-sm leading-6 text-zinc-500">The append-only event ledger will render here. History is not silently overwritten.</p>
      </section>
    </div>
  )
}

function Panel({ title, value, empty }: { title: string; value?: string | null; empty?: string }) {
  return (
    <section className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-5">
      <div className="text-xs font-semibold tracking-[0.16em] text-zinc-600">{title.toUpperCase()}</div>
      <p className="mt-3 text-sm leading-6 text-zinc-300">{value || empty}</p>
    </section>
  )
}
