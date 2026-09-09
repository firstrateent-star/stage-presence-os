import { supabase } from './supabase'
import type { ConfiguredResourceLink } from './repository'
import type { PlannedSourcingModel, RequirementWindowState } from '../types/domain'

interface RawConfiguredResourceLink extends ConfiguredResourceLink {
  engagement: {
    default_resource_from_date: string | null
    default_resource_through_date: string | null
    default_resource_window_state: RequirementWindowState
    default_planned_sourcing_model: PlannedSourcingModel
  } | null
}

export async function listEffectiveConfiguredResourceLinks(): Promise<ConfiguredResourceLink[]> {
  if (!supabase) throw new Error('Backend is not configured.')

  const { data, error } = await supabase
    .from('engagement_resources')
    .select('id,engagement_id,resource_id,relationship,quantity,required_from_date,required_through_date,requirement_window_state,planned_sourcing_model,resource:resources(*),engagement:engagements(default_resource_from_date,default_resource_through_date,default_resource_window_state,default_planned_sourcing_model)')
    .eq('relationship', 'CONFIGURED')
  if (error) throw error

  return ((data ?? []) as unknown as RawConfiguredResourceLink[]).map((link) => {
    const engagement = link.engagement
    const hasWindowOverride = Boolean(
      link.required_from_date ||
      link.required_through_date ||
      link.requirement_window_state !== 'UNKNOWN',
    )

    return {
      id: link.id,
      engagement_id: link.engagement_id,
      resource_id: link.resource_id,
      relationship: link.relationship,
      quantity: link.quantity,
      required_from_date: hasWindowOverride ? link.required_from_date : engagement?.default_resource_from_date ?? null,
      required_through_date: hasWindowOverride ? link.required_through_date : engagement?.default_resource_through_date ?? null,
      requirement_window_state: hasWindowOverride ? link.requirement_window_state : engagement?.default_resource_window_state ?? 'UNKNOWN',
      planned_sourcing_model: link.planned_sourcing_model !== 'UNKNOWN'
        ? link.planned_sourcing_model
        : engagement?.default_planned_sourcing_model ?? 'UNKNOWN',
      resource: link.resource,
    }
  })
}
