import type { CapacityPressure } from '../lib/businessSignals'
import type { EngagementFinancialFact } from '../lib/financialFacts'
import type { PartyLink, ResourceLink } from '../lib/repository'
import type { Engagement } from '../types/domain'
import { engagementDateLabel } from '../lib/businessSignals'

export function EngagementBusinessStory({
  engagement,
  parties,
  resourceLinks,
  financialFacts,
  capacityPressures,
}: {
  engagement: Engagement
  parties: PartyLink[]
  resourceLinks: ResourceLink[]
  financialFacts: EngagementFinancialFact[]
  capacityPressures: CapacityPressure[]
}) {
  const customer = parties.find((link) => link.role === 'CUSTOMER') ?? parties.find((link) => link.is_primary) ?? parties[0]
  const contact = parties.find((link) => link.role === 'PRIMARY_CONTACT' && link.id !== customer?.id)
  const configured = resourceLinks.filter((link) => link.relationship === 'CONFIGURED')
  const commercialValue = bestCommercialValue(engagement, financialFacts)
  const need = engagement.desired_outcome || engagement.customer_request
  const request = engagement.desired_outcome && engagement.customer_request && engagement.desired_outcome !== engagement.customer_request
    ? engagement.customer_request
    : null
  const capacity = capacityStory(engagement, configured, capacityPressures)
  const nextMove = nextMoveStory(engagement)

  return (
    <section className="mt-6 space-y-4">
      <div className="grid gap-3 lg:grid-cols-4">
        <StoryCard label="Customer" value={customer?.party?.name ?? 'Customer not identified'} subvalue={customer?.party ? contactLine(customer.party) : 'Keep unknown until evidence identifies them.'} />
        <StoryCard label="When" value={engagementDateLabel(engagement)} subvalue={engagement.venue_name || engagement.venue_address || 'Location not represented yet'} />
        <StoryCard label="Commercial" value={humanCommercialPosition(engagement)} subvalue={commercialValue ? `${money(commercialValue.amount)} · ${commercialValue.label}` : 'Value not represented in current evidence'} />
        <StoryCard label="Capacity" value={capacity.title} subvalue={capacity.detail} tone={capacity.tone} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-5">
          <div className="text-xs font-semibold tracking-[0.14em] text-zinc-600">WHAT THEY NEED</div>
          <p className="mt-3 text-base leading-7 text-zinc-200">{need || 'The customer need has not been explicitly captured in the current evidence.'}</p>
          {request && (
            <div className="mt-4 border-t border-zinc-900 pt-3">
              <div className="text-[10px] font-semibold tracking-[0.12em] text-zinc-700">CUSTOMER SAID</div>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{request}</p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-semibold tracking-[0.14em] text-zinc-600">CURRENT SOLUTION</div>
            <div className="text-xs text-zinc-700">{configured.length || resourceLinks.length} item{(configured.length || resourceLinks.length) === 1 ? '' : 's'}</div>
          </div>
          {(configured.length ? configured : resourceLinks).length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {(configured.length ? configured : resourceLinks).slice(0, 8).map((link) => (
                <span key={link.id} className="rounded-full border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400">
                  {link.resource?.name ?? 'Unknown resource'}
                </span>
              ))}
              {(configured.length ? configured : resourceLinks).length > 8 && (
                <span className="rounded-full border border-zinc-900 px-3 py-1.5 text-xs text-zinc-600">+{(configured.length ? configured : resourceLinks).length - 8} more</span>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-zinc-600">No solution is represented yet. That is legitimate until Stage Presence has enough evidence to design one.</p>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-amber-950/70 bg-amber-950/10 p-5">
        <div className="text-xs font-semibold tracking-[0.14em] text-amber-500">WHAT HAPPENS NEXT</div>
        <div className="mt-2 text-lg font-semibold text-zinc-100">{nextMove.title}</div>
        <p className="mt-2 text-sm leading-6 text-zinc-500">{nextMove.detail}</p>
      </section>
    </section>
  )
}

function StoryCard({ label, value, subvalue, tone = 'normal' }: { label: string; value: string; subvalue: string; tone?: 'normal' | 'watch' | 'alert' }) {
  const border = tone === 'alert' ? 'border-red-950 bg-red-950/10' : tone === 'watch' ? 'border-amber-950 bg-amber-950/10' : 'border-zinc-900 bg-zinc-950/70'
  const valueClass = tone === 'alert' ? 'text-red-300' : tone === 'watch' ? 'text-amber-400' : 'text-zinc-200'
  return (
    <div className={`rounded-2xl border p-4 ${border}`}>
      <div className="text-[10px] font-bold tracking-[0.12em] text-zinc-700">{label.toUpperCase()}</div>
      <div className={`mt-2 text-sm font-semibold ${valueClass}`}>{value}</div>
      <div className="mt-1 text-xs leading-5 text-zinc-600">{subvalue}</div>
    </div>
  )
}

function bestCommercialValue(engagement: Engagement, facts: EngagementFinancialFact[]) {
  const relevant = facts.filter((fact) => fact.engagement_id === engagement.id && fact.certainty_state !== 'CONFLICTING')
  const certaintyRank: Record<string, number> = { VERIFIED: 5, KNOWN: 4, ESTIMATED: 3, ASSUMED: 2 }
  const committed = engagement.commercial_state === 'WON' || ['SIGNED', 'DEPOSIT_PENDING', 'CONFIRMED'].includes(engagement.commitment_state)
  const preferred = committed ? ['CONTRACT_TOTAL', 'QUOTE_TOTAL'] : ['QUOTE_TOTAL', 'CONTRACT_TOTAL']
  for (const factType of preferred) {
    const matches = relevant
      .filter((fact) => fact.fact_type === factType)
      .sort((a, b) => (certaintyRank[b.certainty_state] ?? 0) - (certaintyRank[a.certainty_state] ?? 0) || b.updated_at.localeCompare(a.updated_at))
    if (matches[0]) return { amount: Number(matches[0].amount), label: factType === 'CONTRACT_TOTAL' ? 'contract' : 'proposal' }
  }
  return null
}

function capacityStory(engagement: Engagement, links: ResourceLink[], pressures: CapacityPressure[]) {
  const related = pressures.filter((pressure) => pressure.first.id === engagement.id || pressure.second.id === engagement.id)
  if (related.some((pressure) => pressure.severity === 'HIGH')) {
    return { title: 'Needs capacity decision', detail: 'Committed work overlaps the same configured physical capacity.', tone: 'alert' as const }
  }
  if (related.some((pressure) => pressure.severity === 'WATCH')) {
    return { title: 'Watch before committing more', detail: 'No confirmed double booking; an open opportunity overlaps configured capacity.', tone: 'watch' as const }
  }
  if (!links.length) return { title: 'Not designed yet', detail: 'No configured physical solution is represented.', tone: 'normal' as const }
  const weakWindow = links.some((link) => ['UNKNOWN', 'INFERRED_FROM_EVENT'].includes(link.requirement_window_state))
  const unknownSource = links.some((link) => link.planned_sourcing_model === 'UNKNOWN')
  if (weakWindow || unknownSource) {
    return { title: 'No known conflict', detail: 'Some timing or sourcing truth is still being strengthened.', tone: 'normal' as const }
  }
  return { title: 'No known conflict', detail: 'Current represented timing and sourcing do not create a pressure signal.', tone: 'normal' as const }
}

function nextMoveStory(engagement: Engagement) {
  if (engagement.attention_state === 'BLOCKED' && engagement.blocked_reason) return { title: `Blocked — ${engagement.blocked_reason}`, detail: 'Resolve the blocker before expecting normal movement.' }
  if (engagement.attention_state === 'WAITING' && engagement.waiting_on) return { title: `Waiting on ${engagement.waiting_on}`, detail: engagement.next_action || 'The Engagement can remain quiet until the waiting condition changes or follow-up becomes due.' }
  if (engagement.next_action) return { title: engagement.next_action, detail: engagement.next_action_at ? `Due ${new Date(engagement.next_action_at).toLocaleString()}` : 'This is the current represented next move.' }
  if (engagement.commercial_state === 'PROPOSED') return { title: 'Move the proposal forward', detail: 'Set the next commercial follow-up only when it is known; do not invent activity for completeness.' }
  if (engagement.commercial_state === 'WON' || ['SIGNED', 'DEPOSIT_PENDING', 'CONFIRMED'].includes(engagement.commitment_state)) return { title: 'Protect delivery', detail: 'The next useful action should come from actual operational readiness, not a generic review task.' }
  return { title: 'Define the next meaningful move', detail: 'Only add an action when it moves the customer, commitment, capacity, or delivery reality.' }
}

function humanCommercialPosition(engagement: Engagement) {
  if (engagement.commitment_state === 'CONFIRMED') return 'Confirmed'
  if (engagement.commitment_state === 'DEPOSIT_PENDING') return 'Deposit pending'
  if (engagement.commitment_state === 'SIGNED') return 'Signed'
  if (engagement.commitment_state === 'VERBAL_YES') return 'Verbal yes'
  if (engagement.commercial_state === 'WON') return 'Won'
  if (engagement.commercial_state === 'NEGOTIATING') return 'Negotiating'
  if (engagement.commercial_state === 'PROPOSED') return 'Proposal sent'
  if (engagement.commercial_state === 'DESIGNING') return 'Designing solution'
  if (engagement.commercial_state === 'DISCOVERY') return 'Understanding need'
  if (engagement.commercial_state === 'LOST') return 'Lost'
  if (engagement.commitment_state === 'CANCELLED') return 'Cancelled'
  return 'New opportunity'
}

function contactLine(party: NonNullable<PartyLink['party']>) {
  const details = [party.organization_name, party.email, party.phone].filter(Boolean)
  return details.length ? details.join(' · ') : party.party_type === 'ORGANIZATION' ? 'Organization' : 'Contact details not represented'
}

function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}
