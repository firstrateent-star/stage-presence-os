import { useCallback, useEffect, useState } from 'react'
import { loadJobWorkspace, type JobWorkspaceModel } from './jobWorkspace'

export function useJobWorkspace(engagementId: string | undefined) {
  const [model, setModel] = useState<JobWorkspaceModel | null>(null)
  const [loading, setLoading] = useState(Boolean(engagementId))
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!engagementId) return
    setLoading(true)
    setError(null)
    try {
      setModel(await loadJobWorkspace(engagementId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Job Workspace.')
    } finally {
      setLoading(false)
    }
  }, [engagementId])

  useEffect(() => { void refresh() }, [refresh])

  return { model, loading, error, refresh }
}
