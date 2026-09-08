import { useEffect, useState } from 'react'
import { isBackendConfigured } from './config'
import { demoEngagements, demoEvents, demoResources } from './demo'
import { listEngagements, listRecentEvents, listResources } from './repository'
import type { Engagement, LedgerEvent, Resource } from '../types/domain'

export function useAppData(enabled = true) {
  const [engagements, setEngagements] = useState<Engagement[]>(isBackendConfigured ? [] : demoEngagements)
  const [resources, setResources] = useState<Resource[]>(isBackendConfigured ? [] : demoResources)
  const [events, setEvents] = useState<LedgerEvent[]>(isBackendConfigured ? [] : demoEvents)
  const [loading, setLoading] = useState(isBackendConfigured && enabled)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    if (!isBackendConfigured || !enabled) return
    setLoading(true)
    setError(null)
    try {
      const [nextEngagements, nextResources, nextEvents] = await Promise.all([
        listEngagements(),
        listResources(),
        listRecentEvents(),
      ])
      setEngagements(nextEngagements)
      setResources(nextResources)
      setEvents(nextEvents)
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

  return { engagements, resources, events, loading, error, refresh, demoMode: !isBackendConfigured }
}
