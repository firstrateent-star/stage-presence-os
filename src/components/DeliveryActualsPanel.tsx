import { ActualsRuntimePanel } from './ActualsRuntimePanel'

export function DeliveryActualsPanel({
  engagementId,
  onChanged,
}: {
  engagementId: string
  eventStartDate: string | null
  eventEndDate: string | null
  operationalState: string
  onChanged?: () => Promise<void> | void
}) {
  return <ActualsRuntimePanel engagementId={engagementId} onChanged={onChanged} />
}
