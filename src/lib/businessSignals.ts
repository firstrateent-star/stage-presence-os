import type { Engagement, EngagementFact } from '../types/domain'
import type { ConfiguredResourceLink, CustomerLink } from './repository'

export interface CapacityPressure {
  id: string
  resource_name: string
  resource_quantity: number | null
  quantity_state: string
  severity: 'HIGH' | 'WATCH'
  first: Engagement
  second: Engagement
}

export interface RelationshipSignal {
  party_id: string
  name: string
  engagements: Engagement[]
  won_count: number
  open_count: number
  known_value: number
}

export interface BusinessSignals {
  protect_delivery: Engagement[]
  convert_demand: Engagement[]
  capacity_pressure: CapacityPressure[]
  relationships: RelationshipSignal[]
  unresolved_facts: Array<{ fact: EngagementFact; engagement: Engagement }>
}

function dateKey(engagement: Engagement) {
  return engagement.event_start_date ?? engagement.event_start?.slice(0, 10) ?? null
}

function dateNumber(value: string | null) {
  if (!value) return Number.POSITIVE_INFINITY
  const parsed = new Date(`${value}T12:00:00`).getTime()
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY
}

function localDayNumber(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12).getTime()
}

function daysUntil(engagement: Engagement, now: Date) {
  const value = dateNumber(dateKey(engagement))
  if (!Number.isFinite(value)) return Number.POSITIVE_INFINITY
  return Math.round((value - localDayNumber(now)) / 86_400_000)
}

function isCommerciallyOpen(engagement: Engagement) {
  return ['NEW', 'DISCOVERY', 'DESIGNING', 'PROPOSED', 'NEGOTIATING'].includes(engagement.commercial_state)
    && !['SIGNED', 'CONFIRMED', 'CANCELLED'].includes(engagement.commitment_state)
}

function isDeliveryCommitment(engagement: Engagement) {
  return engagement.commercial_state === 'WON'
    || ['SIGNED', 'DEPOSIT_PENDING', 'CONFIRMED'].includes(engagement.commitment_state)
}

function activeForCapacity(engagement: Engagement) {
  return engagement.operational_state !== 'CLOSED'
    && engagement.commitment_state !== 'CANCELLED'
    && engagement.commercial_state !== 'LOST'
}

function rangesOverlap(first: Engagement, second: Engagement) {
  const firstStart = dateNumber(dateKey(first))
  const secondStart = dateNumber(dateKey(second))
  if (!Number.isFinite(firstStart) || !Number.isFinite(secondStart)) return false

  const firstEnd = dateNumber(first.event_end_date ?? first.event_end?.slice(0, 10) ?? dateKey(first))
  const secondEnd = dateNumber(second.event_end_date ?? second.event_end?.slice(0, 10) ?? dateKey(second))
  return firstStart <= secondEnd && secondStart <= firstEnd
}

export function buildBusinessSignals(
  engagements: Engagement[],
  customerLinks: CustomerLink[],
  configuredLinks: ConfiguredResourceLink[],
  attentionFacts: EngagementFact[],
  now = new Date(),
): BusinessSignals {
  const engagementById = new Map(engagements.map((engagement) => [engagement.id, engagement]))

  const protectDelivery = engagements
    .filter((engagement) => {
      if (!isDeliveryCommitment(engagement) || engagement.operational_state === 'CLOSED') return false
      const days = daysUntil(engagement, now)
      return days >= -1 && days <= 21
    })
    .sort((a, b) => dateNumber(dateKey(a)) - dateNumber(dateKey(b)))

  const convertDemand = engagements
    .filter(isCommerciallyOpen)
    .sort((a, b) => {
      const dateDifference = dateNumber(dateKey(a)) - dateNumber(dateKey(b))
      if (dateDifference !== 0) return dateDifference
      return a.updated_at.localeCompare(b.updated_at)
    })

  const physicalCategories = new Set(['VIDEO', 'AUDIO', 'LIGHTING', 'STAGING', 'RIGGING', 'POWER', 'NETWORKING', 'TRANSPORT'])
  const byResource = new Map<string, ConfiguredResourceLink[]>()
  for (const link of configuredLinks) {
    if (!link.resource || !physicalCategories.has(link.resource.category)) continue
    const engagement = engagementById.get(link.engagement_id)
    if (!engagement || !activeForCapacity(engagement)) continue
    const bucket = byResource.get(link.resource_id) ?? []
    bucket.push(link)
    byResource.set(link.resource_id, bucket)
  }

  const capacityPressure: CapacityPressure[] = []
  for (const [resourceId, links] of byResource) {
    for (let i = 0; i < links.length; i += 1) {
      for (let j = i + 1; j < links.length; j += 1) {
        const first = engagementById.get(links[i].engagement_id)
        const second = engagementById.get(links[j].engagement_id)
        const resource = links[i].resource ?? links[j].resource
        if (!first || !second || !resource || !rangesOverlap(first, second)) continue

        const firstCommitted = isDeliveryCommitment(first)
        const secondCommitted = isDeliveryCommitment(second)
        if (!firstCommitted && !secondCommitted) continue

        capacityPressure.push({
          id: `${resourceId}:${[first.id, second.id].sort().join(':')}`,
          resource_name: resource.name,
          resource_quantity: resource.quantity,
          quantity_state: resource.quantity_state,
          severity: firstCommitted && secondCommitted ? 'HIGH' : 'WATCH',
          first,
          second,
        })
      }
    }
  }
  capacityPressure.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'HIGH' ? -1 : 1
    return Math.min(dateNumber(dateKey(a.first)), dateNumber(dateKey(a.second))) - Math.min(dateNumber(dateKey(b.first)), dateNumber(dateKey(b.second)))
  })

  const relationshipMap = new Map<string, RelationshipSignal>()
  for (const link of customerLinks) {
    const engagement = engagementById.get(link.engagement_id)
    const party = link.party
    if (!engagement || !party) continue
    const current = relationshipMap.get(party.id) ?? {
      party_id: party.id,
      name: party.name,
      engagements: [],
      won_count: 0,
      open_count: 0,
      known_value: 0,
    }
    if (!current.engagements.some((item) => item.id === engagement.id)) current.engagements.push(engagement)
    if (engagement.commercial_state === 'WON') current.won_count += 1
    if (isCommerciallyOpen(engagement)) current.open_count += 1
    current.known_value += engagement.estimated_value ?? 0
    relationshipMap.set(party.id, current)
  }

  const relationships = [...relationshipMap.values()]
    .sort((a, b) => {
      if (a.engagements.length !== b.engagements.length) return b.engagements.length - a.engagements.length
      if (a.known_value !== b.known_value) return b.known_value - a.known_value
      return a.name.localeCompare(b.name)
    })

  const unresolvedFacts = attentionFacts
    .map((fact) => ({ fact, engagement: engagementById.get(fact.engagement_id) }))
    .filter((item): item is { fact: EngagementFact; engagement: Engagement } => Boolean(item.engagement))
    .sort((a, b) => {
      if (a.fact.certainty_state !== b.fact.certainty_state) return a.fact.certainty_state === 'CONFLICTING' ? -1 : 1
      return a.engagement.name.localeCompare(b.engagement.name)
    })

  return {
    protect_delivery: protectDelivery,
    convert_demand: convertDemand,
    capacity_pressure: capacityPressure,
    relationships,
    unresolved_facts: unresolvedFacts,
  }
}

export function engagementDateLabel(engagement: Engagement) {
  if (engagement.event_start) return new Date(engagement.event_start).toLocaleString()
  const value = engagement.event_start_date
  if (!value) return 'Date unknown'
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(year, month - 1, day, 12))
}
