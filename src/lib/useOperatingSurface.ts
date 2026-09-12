import { useCallback, useEffect, useState } from 'react'
import {
  getEconomyOverview,
  listCapabilities,
  listEngagementSummaries,
  listRecoveryQueue,
  listRelationshipSummaries,
  type CapabilitySummary,
  type EconomyOverview,
  type EngagementSummary,
  type RecoveryQueueItem,
  type RelationshipSummary,
} from './readContracts'

export interface OperatingSurfaceData {
  engagements: EngagementSummary[]
  relationships: RelationshipSummary[]
  capabilities: CapabilitySummary[]
  economy: EconomyOverview | null
  recovery: RecoveryQueueItem[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useOperatingSurface(enabled = true): OperatingSurfaceData {
  const [engagements, setEngagements] = useState<EngagementSummary[]>([])
  const [relationships, setRelationships] = useState<RelationshipSummary[]>([])
  const [capabilities, setCapabilities] = useState<CapabilitySummary[]>([])
  const [economy, setEconomy] = useState<EconomyOverview | null>(null)
  const [recovery, setRecovery] = useState<RecoveryQueueItem[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const [nextEngagements, nextRelationships, nextCapabilities, nextEconomy, nextRecovery] = await Promise.all([
        listEngagementSummaries(),
        listRelationshipSummaries(),
        listCapabilities(),
        getEconomyOverview(),
        listRecoveryQueue(100),
      ])
      setEngagements(nextEngagements)
      setRelationships(nextRelationships)
      setCapabilities(nextCapabilities)
      setEconomy(nextEconomy)
      setRecovery(nextRecovery)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load the Stage Presence operating surface.')
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { engagements, relationships, capabilities, economy, recovery, loading, error, refresh }
}
