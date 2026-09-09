import { useEffect, useState } from 'react'
import { isBackendConfigured } from './config'
import { demoEngagements, demoEvents, demoResources } from './demo'
import { listEngagementRelationships, type EngagementRelationship } from './engagementRelationships'
import { listAttentionFacts, listConfiguredResourceLinks, listCustomerLinks, listEngagements, listRecentEvents, listResources, type ConfiguredResourceLink, type CustomerLink } from './repository'
import type { Engagement, EngagementFact, LedgerEvent, Resource } from '../types/domain'

export function useAppData(enabled = true) {
  const [engagements, setEngagements] = useState<Engagement[]>(isBackendConfigured ? [] : demoEngagements)
  const [resources, setResources] = useState<Resource[]>(isBackendConfigured ? [] : demoResources)
  const [events, setEvents] = useState<LedgerEvent[]>(isBackendConfigured ? [] : demoEvents)
  const [customerLinks, setCustomerLinks] = useState<CustomerLink[]>([])
  const [configuredLinks, setConfiguredLinks] = useState<ConfiguredResourceLink[]>([])
  const [attentionFacts, setAttentionFacts] = useState<EngagementFact[]>([])
  const [engagementRelationships, setEngagementRelationships] = useState<EngagementRelationship[]>([])
  const [loading, setLoading] = useState(isBackendConfigured && enabled)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    if (!isBackendConfigured || !enabled) return
    setLoading(true)
    setError(null)
    try {
      const [nextEngagements, nextResources, nextEvents, nextCustomers, nextConfigured, nextAttentionFacts, nextRelationships] = await Promise.all([
        listEngagements(),
        listResources(),
        listRecentEvents(),
        listCustomerLinks(),
        listConfiguredResourceLinks(),
        listAttentionFacts(),
        listEngagementRelationships(),
      ])
      setEngagements(nextEngagements)
      setResources(nextResources)
      setEvents(nextEvents)
      setCustomerLinks(nextCustomers)
      setConfiguredLinks(nextConfigured)
      setAttentionFacts(nextAttentionFacts)
      setEngagementRelationships(nextRelationships)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Stage Presence data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isBackendConfigured) return
    if (!enabled) {
      setLoading(false)
      return
    }
    void refresh()
  }, [enabled])

  return {
    engagements,
    resources,
    events,
    customerLinks,
    configuredLinks,
    attentionFacts,
    engagementRelationships,
    loading,
    error,
    refresh,
    demoMode: !isBackendConfigured,
  }
}
