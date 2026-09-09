import { useCallback, useEffect, useState } from 'react'
import { getEngagementCloseout, type EngagementCloseout } from '../lib/learningCloseout'
import { LearningCloseoutPanel } from './LearningCloseoutPanel'

export function LearningCloseoutSlot({
  engagementId,
  eventEndDate,
  onSaved,
}: {
  engagementId: string
  eventEndDate: string | null
  onSaved: () => Promise<void> | void
}) {
  const [closeout, setCloseout] = useState<EngagementCloseout | null>(null)
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setCloseout(await getEngagementCloseout(engagementId))
    } finally {
      setReady(true)
    }
  }, [engagementId])

  useEffect(() => { void refresh() }, [refresh])
  if (!ready) return null

  return (
    <div className="sm:ml-48">
      <LearningCloseoutPanel
        engagementId={engagementId}
        eventEndDate={eventEndDate}
        closeout={closeout}
        onSaved={async () => {
          await refresh()
          await Promise.resolve(onSaved())
        }}
      />
    </div>
  )
}
