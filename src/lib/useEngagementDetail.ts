import { useCallback, useEffect, useState } from 'react'
import { getEngagementCloseout, type EngagementCloseout } from './learningCloseout'
import { listEngagementEvents, listEngagementResources, listFacts, listPartiesForEngagement, listResources, type PartyLink, type ResourceLink } from './repository'
import { listEngagementSourceArtifacts, type SourceArtifact } from './sourceArtifacts'
import type { EngagementFact, LedgerEvent, Resource } from '../types/domain'

export function useEngagementDetail(engagementId: string | undefined) {
  const [facts, setFacts] = useState<EngagementFact[]>([])
  const [parties, setParties] = useState<PartyLink[]>([])
  const [resourceLinks, setResourceLinks] = useState<ResourceLink[]>([])
  const [resourceLibrary, setResourceLibrary] = useState<Resource[]>([])
  const [events, setEvents] = useState<LedgerEvent[]>([])
  const [sourceArtifacts, setSourceArtifacts] = useState<SourceArtifact[]>([])
  const [closeout, setCloseout] = useState<EngagementCloseout | null>(null)
  const [loading, setLoading] = useState(Boolean(engagementId))
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!engagementId) return
    setLoading(true)
    setError(null)
    try {
      const [nextFacts, nextParties, nextResourceLinks, nextResources, nextEvents, nextSourceArtifacts, nextCloseout] = await Promise.all([
        listFacts(engagementId),
        listPartiesForEngagement(engagementId),
        listEngagementResources(engagementId),
        listResources(),
        listEngagementEvents(engagementId),
        listEngagementSourceArtifacts(engagementId),
        getEngagementCloseout(engagementId),
      ])
      setFacts(nextFacts)
      setParties(nextParties)
      setResourceLinks(nextResourceLinks)
      setResourceLibrary(nextResources)
      setEvents(nextEvents)
      setSourceArtifacts(nextSourceArtifacts)
      setCloseout(nextCloseout)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load engagement detail.')
    } finally {
      setLoading(false)
    }
  }, [engagementId])

  useEffect(() => { void refresh() }, [refresh])
  return { facts, parties, resourceLinks, resourceLibrary, events, sourceArtifacts, closeout, loading, error, refresh }
}
