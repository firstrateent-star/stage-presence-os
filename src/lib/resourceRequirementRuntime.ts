import { supabase } from './supabase'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured.')
  return supabase
}

export type RequirementWindowState = 'UNKNOWN' | 'INFERRED_FROM_EVENT' | 'ESTIMATED' | 'KNOWN' | 'VERIFIED'
export type PlannedSourcingModel = 'OWNED' | 'SUBCONTRACTED' | 'PARTNER' | 'VENUE' | 'UNKNOWN'

export interface ResourceRequirementPosition {
  engagement_resource_id: string
  engagement_id: string
  engagement_number: string
  engagement_name: string
  resource_id: string
  resource_name: string
  quantity: number | null
  required_from_date: string | null
  required_through_date: string | null
  requirement_window_state: RequirementWindowState
  planned_sourcing_model: PlannedSourcingModel
  candidate_from_date: string | null
  candidate_through_date: string | null
  candidate_basis: string
  requirement_runtime_state: string
  next_resource_decision: string
  window_resolution_required: boolean
  commitment_decision_required: boolean
}

export async function listResourceRequirements(engagementId: string): Promise<ResourceRequirementPosition[]> {
  const { data, error } = await requireClient().from('resource_requirement_position_v').select('*').eq('engagement_id', engagementId).order('resource_name')
  if (error) throw error
  return (data ?? []) as ResourceRequirementPosition[]
}

export async function setResourceRequirementWindow(input: {
  engagementResourceId: string
  fromDate: string
  throughDate: string
  state: Exclude<RequirementWindowState, 'UNKNOWN'>
  quantity?: number | null
  plannedSourcingModel?: PlannedSourcingModel
}): Promise<ResourceRequirementPosition> {
  if (input.throughDate < input.fromDate) throw new Error('Through date cannot be before from date.')
  if (input.quantity !== undefined && input.quantity !== null && input.quantity <= 0) throw new Error('Quantity must be greater than zero.')
  const patch: Record<string, unknown> = {
    required_from_date: input.fromDate,
    required_through_date: input.throughDate,
    requirement_window_state: input.state,
  }
  if (input.quantity !== undefined) patch.quantity = input.quantity
  if (input.plannedSourcingModel !== undefined) patch.planned_sourcing_model = input.plannedSourcingModel
  const { error } = await requireClient().from('engagement_resources').update(patch).eq('id', input.engagementResourceId)
  if (error) throw error
  const { data, error: readError } = await requireClient().from('resource_requirement_position_v').select('*').eq('engagement_resource_id', input.engagementResourceId).single()
  if (readError) throw readError
  return data as ResourceRequirementPosition
}

export async function applyRequirementWindowCandidate(input: {
  engagementResourceId: string
  state: 'INFERRED_FROM_EVENT' | 'ESTIMATED' | 'KNOWN'
  confirmCandidate: boolean
}): Promise<ResourceRequirementPosition> {
  if (!input.confirmCandidate) throw new Error('Applying a candidate window requires explicit confirmation.')
  const { data, error } = await requireClient().from('resource_requirement_position_v').select('candidate_from_date,candidate_through_date,candidate_basis').eq('engagement_resource_id', input.engagementResourceId).single()
  if (error) throw error
  if (!data.candidate_from_date || !data.candidate_through_date || data.candidate_basis === 'NO_CANDIDATE') throw new Error('No candidate window is available.')
  return setResourceRequirementWindow({
    engagementResourceId: input.engagementResourceId,
    fromDate: data.candidate_from_date,
    throughDate: data.candidate_through_date,
    state: input.state,
  })
}
