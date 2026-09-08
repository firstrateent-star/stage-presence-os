import { useCallback, useEffect, useState } from 'react'
import { listEngagementEvents, listEngagementResources, listFacts, listPartiesForEngagement, listResources, type PartyLink, type ResourceLink } from './repository'
import type { EngagementFact, LedgerEvent, Resource } from '../types/domain'

export function useEngagementDetail(engagementId: string | undefined) {
  const [facts, setFacts] = useState<EngagementFact[]>([])
  const [parties, setParties] = useState<PartyLink[]>([])
  const [resourceLinks, setResourceLinks] = useState<ResourceLink[]>([])
  const [resourceLibrary, setResourceLibrary] = useState<Resource[]>([])
  const [events, setEvents] = useState<LedgerEvent[]>([])
  const [loading, setLoading] = useState(Boolean(engagementId))
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!engagementId) return
    setLoading(true)
    setError(null)
    try {
      const [nextFacts, nextParties, nextResourceLinks, nextResources, nextEvents] = await Promise.all([
        listFacts(engagementId),
        listPartiesForEngagement(engagementId),
        listEngagementResources(engagementId),
        listResources(),
        listEngagementEvents(engagementId),
      ])
      setFacts(nextFacts)
      setParties(nextParties)
      setResourceLinks(nextResourceLinks)
      setResourceLibrary(nextResources)
      setEvents(nextEvents)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load engagement detail.')
    } finally {
      setLoading(false)
    }
  }, [engagementId])

  useEffect(() => { void refresh() }, [refresh])
  return { facts, parties, resourceLinks, resourceLibrary, events, loading, error, refresh }
}
