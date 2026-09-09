import type { Engagement, EngagementFact } from '../types/domain'
import type { EngagementRelationship } from './engagementRelationships'
import type { EngagementFinancialFact } from './financialFacts'
import type { ConfiguredResourceLink, CustomerLink } from './repository'

export interface CapacityPressure {
  id: string
  resource_id: string
  resource_name: string
  resource_quantity: number | null
  quantity_state: string
  severity: 'HIGH' | 'WATCH'
  first: Engagement
  second: Engagement
  first_window_state: ConfiguredResourceLink['requirement_window_state']
  second_window_state: ConfiguredResourceLink['requirement_window_state']
}

export interface CapacityTruthPriority {
  resource_id: string
  resource_name: string
  category: string
  quantity: number | null
  quantity_state: string
  engagement_count: number
  committed_count: number
  open_count: number
  pressure_count: number
  priority_score: number
}

export interface RelationshipSignal {
  party_id: string
  name: string
  engagements: Engagement[]
  won_count: number
  open_count: number
  known_value: number
  independent_engagement_count: number
  program_count: number
  program_component_count: number
}

export interface BusinessSignals {
  protect_delivery: Engagement[]
  convert_demand: Engagement[]
  capacity_pressure: CapacityPressure[]
  capacity_truth_priorities: CapacityTruthPriority[]
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

function isCurrentDemand(engagement: Engagement, now: Date) {
  if (!isCommerciallyOpen(engagement)) return false
  if (!dateKey(engagement)) return true
  return daysUntil(engagement, now) >= 0
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

function resourceWindow(link: ConfiguredResourceLink, engagement: Engagement) {
  const fallbackStart = dateKey(engagement)
  const fallbackEnd = engagement.event_end_date ?? engagement.event_end?.slice(0, 10) ?? fallbackStart
  return {
    start: link.required_from_date ?? fallbackStart,
    end: link.required_through_date ?? fallbackEnd,
    state: link.requirement_window_state ?? 'UNKNOWN',
  }
}

function resourceWindowsOverlap(firstLink: ConfiguredResourceLink, first: Engagement, secondLink: ConfiguredResourceLink, second: Engagement) {
  const firstWindow = resourceWindow(firstLink, first)
  const secondWindow = resourceWindow(secondLink, second)
  const firstStart = dateNumber(firstWindow.start)
  const secondStart = dateNumber(secondWindow.start)
  if (!Number.isFinite(firstStart) || !Number.isFinite(secondStart)) return false

  const firstEnd = dateNumber(firstWindow.end ?? firstWindow.start)
  const secondEnd = dateNumber(secondWindow.end ?? secondWindow.start)
  return firstStart <= secondEnd && secondStart <= firstEnd
}

function trustedProgramParents(relationships: EngagementRelationship[]) {
  return new Set(
    relationships
      .filter((relationship) => relationship.relationship_type === 'PROGRAM_COMPONENT' && ['VERIFIED', 'KNOWN'].includes(relationship.certainty_state))
      .map((relationship) => relationship.from_engagement_id),
  )
}

function currentContractValues(financialFacts: EngagementFinancialFact[]) {
  const certaintyRank: Record<string, number> = { VERIFIED: 4, KNOWN: 3, ESTIMATED: 2, ASSUMED: 1, CONFLICTING: 0 }
  const current = new Map<string, EngagementFinancialFact>()

  for (const fact of financialFacts) {
    if (fact.fact_type !== 'CONTRACT_TOTAL' || fact.certainty_state === 'CONFLICTING') continue
    const previous = current.get(fact.engagement_id)
    if (!previous) {
      current.set(fact.engagement_id, fact)
      continue
    }
    const rankDifference = certaintyRank[fact.certainty_state] - certaintyRank[previous.certainty_state]
    if (rankDifference > 0 || (rankDifference === 0 && fact.updated_at > previous.updated_at)) current.set(fact.engagement_id, fact)
  }

  return new Map([...current.entries()].map(([engagementId, fact]) => [engagementId, Number(fact.amount)]))
}

export function buildBusinessSignals(
  engagements: Engagement[],
  customerLinks: CustomerLink[],
  configuredLinks: ConfiguredResourceLink[],
  attentionFacts: EngagementFact[],
  engagementRelationships: EngagementRelationship[],
  financialFacts: EngagementFinancialFact[],
  now = new Date(),
): BusinessSignals {
  const engagementById = new Map(engagements.map((engagement) => [engagement.id, engagement]))
  const trustedProgramParentIds = trustedProgramParents(engagementRelationships)
  const contractValueByEngagement = currentContractValues(financialFacts)

  const protectDelivery = engagements
    .filter((engagement) => {
      if (!isDeliveryCommitment(engagement) || engagement.operational_state === 'CLOSED') return false
      if (trustedProgramParentIds.has(engagement.id)) return false
      const days = daysUntil(engagement, now)
      return days >= -1 && days <= 21
    })
    .sort((a, b) => dateNumber(dateKey(a)) - dateNumber(dateKey(b)))

  const convertDemand = engagements
    .filter((engagement) => isCurrentDemand(engagement, now))
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
    if (!engagement || !activeForCapacity(engagement) || trustedProgramParentIds.has(engagement.id)) continue
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
        if (!first || !second || !resource || !resourceWindowsOverlap(links[i], first, links[j], second)) continue

        const firstCommitted = isDeliveryCommitment(first)
        const secondCommitted = isDeliveryCommitment(second)
        if (!firstCommitted && !secondCommitted) continue

        capacityPressure.push({
          id: `${resourceId}:${[first.id, second.id].sort().join(':')}`,
          resource_id: resourceId,
          resource_name: resource.name,
          resource_quantity: resource.quantity,
          quantity_state: resource.quantity_state,
          severity: firstCommitted && secondCommitted ? 'HIGH' : 'WATCH',
          first,
          second,
          first_window_state: links[i].requirement_window_state,
          second_window_state: links[j].requirement_window_state,
        })
      }
    }
  }
  capacityPressure.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'HIGH' ? -1 : 1
    return Math.min(dateNumber(dateKey(a.first)), dateNumber(dateKey(a.second))) - Math.min(dateNumber(dateKey(b.first)), dateNumber(dateKey(b.second)))
  })

  const pressureCountByResource = new Map<string, number>()
  for (const pressure of capacityPressure) pressureCountByResource.set(pressure.resource_id, (pressureCountByResource.get(pressure.resource_id) ?? 0) + 1)

  const capacityTruthPriorities: CapacityTruthPriority[] = []
  for (const [resourceId, links] of byResource) {
    const resource = links[0]?.resource
    if (!resource || resource.quantity_state === 'VERIFIED') continue
    const engagementIds = [...new Set(links.map((link) => link.engagement_id))]
    const linkedEngagements = engagementIds.map((id) => engagementById.get(id)).filter((item): item is Engagement => Boolean(item))
    const committedCount = linkedEngagements.filter(isDeliveryCommitment).length
    const openCount = linkedEngagements.filter(isCommerciallyOpen).length
    const pressureCount = pressureCountByResource.get(resourceId) ?? 0
    if (committedCount === 0 && pressureCount === 0) continue

    capacityTruthPriorities.push({
      resource_id: resourceId,
      resource_name: resource.name,
      category: resource.category,
      quantity: resource.quantity,
      quantity_state: resource.quantity_state,
      engagement_count: linkedEngagements.length,
      committed_count: committedCount,
      open_count: openCount,
      pressure_count: pressureCount,
      priority_score: pressureCount * 1000 + committedCount * 100 + openCount * 20 + linkedEngagements.length,
    })
  }
  capacityTruthPriorities.sort((a, b) => b.priority_score - a.priority_score || a.resource_name.localeCompare(b.resource_name))

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
      independent_engagement_count: 0,
      program_count: 0,
      program_component_count: 0,
    }
    const isNewEngagement = !current.engagements.some((item) => item.id === engagement.id)
    if (isNewEngagement) {
      current.engagements.push(engagement)
      if (engagement.commercial_state === 'WON') current.won_count += 1
      if (isCommerciallyOpen(engagement)) current.open_count += 1
      current.known_value += contractValueByEngagement.get(engagement.id) ?? 0
    }
    relationshipMap.set(party.id, current)
  }

  const programRelations = engagementRelationships.filter(
    (relationship) => relationship.relationship_type === 'PROGRAM_COMPONENT' && relationship.certainty_state !== 'CONFLICTING',
  )

  for (const relationship of relationshipMap.values()) {
    const engagementIds = new Set(relationship.engagements.map((engagement) => engagement.id))
    const matchedProgramRelations = programRelations.filter(
      (programRelation) => engagementIds.has(programRelation.from_engagement_id) && engagementIds.has(programRelation.to_engagement_id),
    )
    const componentIds = new Set(matchedProgramRelations.map((programRelation) => programRelation.to_engagement_id))
    const parentIds = new Set(matchedProgramRelations.map((programRelation) => programRelation.from_engagement_id))
    relationship.program_component_count = componentIds.size
    relationship.program_count = parentIds.size
    relationship.independent_engagement_count = Math.max(0, relationship.engagements.length - componentIds.size)
  }

  const relationships = [...relationshipMap.values()]
    .sort((a, b) => {
      if (a.independent_engagement_count !== b.independent_engagement_count) return b.independent_engagement_count - a.independent_engagement_count
      if (a.known_value !== b.known_value) return b.known_value - a.known_value
      if (a.engagements.length !== b.engagements.length) return b.engagements.length - a.engagements.length
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
    capacity_truth_priorities: capacityTruthPriorities,
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
