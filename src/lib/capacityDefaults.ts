import { supabase } from './supabase'
import type { Engagement, PlannedSourcingModel, RequirementWindowState } from '../types/domain'

export interface CapacityDefaultInput {
  from_date: string | null
  through_date: string | null
  window_state: RequirementWindowState
  sourcing_model: PlannedSourcingModel
}

export async function updateEngagementCapacityDefaults(engagementId: string, input: CapacityDefaultInput): Promise<Engagement> {
  if (!supabase) throw new Error('Backend is not configured.')

  if ((input.from_date || input.through_date) && input.window_state === 'UNKNOWN') {
    throw new Error('Choose how certain the capacity window is before saving dates.')
  }
  if (input.from_date && input.through_date && input.through_date < input.from_date) {
    throw new Error('The resource-through date cannot be before the resource-from date.')
  }

  const { data, error } = await supabase
    .from('engagements')
    .update({
      default_resource_from_date: input.from_date,
      default_resource_through_date: input.through_date,
      default_resource_window_state: input.from_date || input.through_date ? input.window_state : 'UNKNOWN',
      default_planned_sourcing_model: input.sourcing_model,
    })
    .eq('id', engagementId)
    .select('*')
    .single()

  if (error) throw error
  return data as Engagement
}
