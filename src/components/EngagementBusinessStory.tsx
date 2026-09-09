import { businessNextMovement, importedScopeFallback } from '../lib/businessPresentation'
import { engagementDateLabel, type CapacityPressure } from '../lib/businessSignals'
import type { EngagementFinancialFact } from '../lib/financialFacts'
import type { ConfiguredResourceLink, CustomerLink } from '../lib/repository'
import type { Engagement } from '../types/domain'

export function EngagementBusinessStory({
  engagement,
  customerLinks,
  configuredLinks,
  financialFacts,
  capacityPressures,
}: {
  engagement: Engagement
  customerLinks: CustomerLink[]
  configuredLinks: ConfiguredResourceLink[]
  financialFacts: EngagementFinancialFact[]
  capacityPressures: CapacityPressure[]
}) {
  const customer = customerLinks.find((link) => link.engagement_id === engagement.id)?.party ?? null
  const configured = configuredLinks.filter((link) => link.engagement_id === engagement.id)
  const commercialValue = bestCommercialValue(engagement, financialFacts)
  const need = engagement.desired_outcome || engagement.customer_request
  const needFallback = importedScopeFallback(engagement, configured.length)
  const request = engagement.desired_outcome && engagement.customer_request && engagement.desired_outcome !== engagement.customer_request
    ? engagement.customer_request
    : null
  const capacity = capacityStory(engagement, configured, capacityPressures)
  const nextMove = businessNextMovement(engagement)

  return (
    <section className="mt-6 space-y-4">
      <div className="grid gap-3 lg:grid-cols-4">
        <StoryCard label="Customer" value={customer?.name ?? 'Customer not identified'} subvalue={customer ? contactLine(customer) : 'Keep unknown until evidence identifies them.'} />
        <StoryCard label="When" value={engagementDateLabel(engagement)} subvalue={engagement.venue_name || engagement.venue_address || 'Location not represented yet'} />
        <StoryCard label="Commercial" value={humanCommercialPosition(engagement)} subvalue={commercialValue ? `${money(commercialValue.amount)} · ${commercialValue.label}` : commercialValueFallback(engagement)} />
        <StoryCard label="Capacity" value={capacity.title} subvalue={capacity.detail} tone={capacity.tone} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-5">
          <div className="text-xs font-semibold tracking-[0.14em] text-zinc-600">WHAT THEY NEED</div>
          <p className={need ? 'mt-3 text-base leading-7 text-zinc-200' : 'mt-3 text-sm leading-6 text-zinc-500'}>{need || needFallback}</p>
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
            <div className="text-xs text-zinc-700">{configured.length} item{configured.length === 1 ? '' : 's'}</div>
          </div>
          {configured.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {configured.slice(0, 8).map((link) => (
                <span key={link.id} className="rounded-full border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400">
                  {link.resource?.name ?? 'Unknown resource'}
                </span>
              ))}
              {configured.length > 8 && (
                <span className="rounded-full border border-zinc-900 px-3 py-1.5 text-xs text-zinc-600">+{configured.length - 8} more</span>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-zinc-600">No solution is represented yet. Fill this only when current commercial or delivery movement requires a real solution.</p>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-amber-950/70 bg-amber-950/10 p-5">
        <div className="text-xs font-semibold tracking-[0.14em] text-amber-500">WHAT HAPPENS NEXT</div>
        <div className="mt-2 text-lg font-semibold text-zinc-100">{nextMove}</div>
        <p className="mt-2 text-sm leading-6 text-zinc-500">Legacy import placeholders are intentionally ignored here. This should become more specific only when a real next movement is known.</p>
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

function commercialValueFallback(engagement: Engagement) {
  if (engagement.commercial_state === 'PROPOSED' || engagement.commercial_state === 'NEGOTIATING') return 'Proposal value is not represented in the current OS evidence.'
  if (engagement.commercial_state === 'WON' || ['SIGNED', 'DEPOSIT_PENDING', 'CONFIRMED'].includes(engagement.commitment_state)) return 'Standalone contract value is not represented for this Engagement.'
  return 'Value not represented in current evidence.'
}

function capacityStory(engagement: Engagement, links: ConfiguredResourceLink[], pressures: CapacityPressure[]) {
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
    return { title: 'No known conflict', detail: 'Timing or sourcing is still provisional; strengthen it only when the next commitment or delivery decision requires it.', tone: 'normal' as const }
  }
  return { title: 'No known conflict', detail: 'Current represented timing and sourcing do not create a pressure signal.', tone: 'normal' as const }
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

function contactLine(party: NonNullable<CustomerLink['party']>) {
  const details = [party.organization_name, party.email, party.phone].filter(Boolean)
  return details.length ? details.join(' · ') : party.party_type === 'ORGANIZATION' ? 'Organization' : 'Contact details not represented'
}

function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}
