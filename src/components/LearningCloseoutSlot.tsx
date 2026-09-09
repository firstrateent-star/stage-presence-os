import { useCallback, useEffect, useState } from 'react'
import { isBackendConfigured } from '../lib/config'
import { getEngagementCloseout, type CloseoutKind, type EngagementCloseout } from '../lib/learningCloseout'
import { LearningCloseoutPanel } from './LearningCloseoutPanel'

export function LearningCloseoutSlot({
  engagementId,
  eventEndDate,
  commercialState,
  commitmentState,
  onSaved,
}: {
  engagementId: string
  eventEndDate: string | null
  commercialState: string
  commitmentState: string
  onSaved: () => Promise<void> | void
}) {
  const [closeout, setCloseout] = useState<EngagementCloseout | null>(null)
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    if (!isBackendConfigured) {
      setReady(true)
      return
    }
    try {
      setCloseout(await getEngagementCloseout(engagementId))
    } catch {
      setCloseout(null)
    } finally {
      setReady(true)
    }
  }, [engagementId])

  useEffect(() => { void refresh() }, [refresh])
  if (!ready || !isBackendConfigured) return null

  const defaultCloseoutKind: CloseoutKind = commitmentState === 'CANCELLED'
    ? 'CANCELLED'
    : commercialState === 'LOST'
      ? 'LOST'
      : commercialState === 'WON' || ['SIGNED', 'DEPOSIT_PENDING', 'CONFIRMED'].includes(commitmentState)
        ? 'DELIVERY'
        : 'OTHER'

  return (
    <div className="sm:ml-48">
      <LearningCloseoutPanel
        engagementId={engagementId}
        eventEndDate={eventEndDate}
        closeout={closeout}
        defaultCloseoutKind={defaultCloseoutKind}
        onSaved={async () => {
          await refresh()
          await Promise.resolve(onSaved())
        }}
      />
    </div>
  )
}
