import { supabase } from './supabase'
import { applyRequirementWindowCandidate } from './resourceRequirementRuntime'
import { confirmResourceReservation, createCrewAssignment, createPaymentScheduleTerm, type AssignmentRole, type PaymentTermType } from './commercialOperationsBridge'
import { initializeWarehouseFulfillment, transitionWarehouseFulfillment, type ReturnConditionState, type WarehouseState } from './warehouseFulfillmentRuntime'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured.')
  return supabase
}

export async function confirmRequirementCandidate(engagementResourceId: string) {
  return applyRequirementWindowCandidate({ engagementResourceId, state: 'ESTIMATED', confirmCandidate: true })
}

export async function createTentativeHoldFromRequirement(engagementResourceId: string) {
  const client = requireClient()
  const { data: requirement, error } = await client.from('engagement_resources')
    .select('id,engagement_id,resource_id,quantity,required_from_date,required_through_date,requirement_window_state,planned_sourcing_model')
    .eq('id', engagementResourceId).single()
  if (error) throw error
  if (!requirement.required_from_date || !requirement.required_through_date) throw new Error('Resolve the Resource requirement window before placing a hold.')

  const { data: engagement, error: engagementError } = await client.from('engagements').select('commitment_state').eq('id', requirement.engagement_id).single()
  if (engagementError) throw engagementError
  if (!['SIGNED','DEPOSIT_PENDING','CONFIRMED'].includes(engagement.commitment_state)) throw new Error('Resource holds require a commercially committed Engagement.')

  const { data: existing, error: existingError } = await client.from('resource_commitments').select('id').eq('engagement_id', requirement.engagement_id).eq('resource_id', requirement.resource_id).in('commitment_state', ['TENTATIVE','CONFIRMED']).limit(1).maybeSingle()
  if (existingError) throw existingError
  if (existing) throw new Error('This Resource already has an active hold or reservation.')

  const { data: coverage, error: coverageError } = await client.from('accepted_scope_commitment_coverage_v')
    .select('fulfillment_line_id,commercial_document_id').eq('engagement_id', requirement.engagement_id).eq('resource_id', requirement.resource_id).limit(1).maybeSingle()
  if (coverageError) throw coverageError

  let commercialLineId: string | null = null
  if (coverage?.commercial_document_id && coverage.fulfillment_line_id) {
    const { data: line, error: lineError } = await client.from('commercial_document_lines').select('id').eq('commercial_document_id', coverage.commercial_document_id).eq('fulfillment_line_id', coverage.fulfillment_line_id).limit(1).maybeSingle()
    if (lineError) throw lineError
    commercialLineId = line?.id ?? null
  }

  const quantity = Number(requirement.quantity ?? 1)
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Resource quantity must be greater than zero.')
  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError) throw userError

  const { data, error: insertError } = await client.from('resource_commitments').insert({
    engagement_id: requirement.engagement_id,
    resource_id: requirement.resource_id,
    fulfillment_plan_line_id: coverage?.fulfillment_line_id ?? null,
    commercial_document_line_id: commercialLineId,
    commitment_type: 'HOLD',
    commitment_state: 'TENTATIVE',
    quantity,
    from_date: requirement.required_from_date,
    through_date: requirement.required_through_date,
    planned_sourcing_model: requirement.planned_sourcing_model ?? 'UNKNOWN',
    certainty_state: requirement.requirement_window_state === 'VERIFIED' ? 'VERIFIED' : requirement.requirement_window_state === 'KNOWN' ? 'KNOWN' : 'ESTIMATED',
    created_by: userData.user?.id ?? null,
    metadata: { operations_command_runtime: 'v1', source: 'RESOURCE_REQUIREMENT', engagement_resource_id: requirement.id },
  }).select('*').single()
  if (insertError) throw insertError
  return data
}

export async function confirmTentativeReservation(commitmentId: string, allowUnverifiedCapacity = false) {
  return confirmResourceReservation({ commitmentId, allowUnverifiedCapacity })
}

export async function assignCrewFromCommand(input: { engagementId: string; teamMemberId: string; roleCode: AssignmentRole; scheduledStart?: string | null; scheduledEnd?: string | null; confirmNow?: boolean }) {
  return createCrewAssignment({ engagementId: input.engagementId, teamMemberId: input.teamMemberId, roleCode: input.roleCode, scheduledStart: input.scheduledStart ?? undefined, scheduledEnd: input.scheduledEnd ?? undefined, assignmentState: input.confirmNow ? 'CONFIRMED' : 'REQUESTED' })
}

export async function confirmCrewAssignment(assignmentId: string) {
  const client = requireClient()
  const { data: assignment, error } = await client.from('engagement_assignments').select('id,engagement_id,assignment_state').eq('id', assignmentId).single()
  if (error) throw error
  if (assignment.assignment_state !== 'REQUESTED') throw new Error('Only a REQUESTED assignment can be confirmed.')
  const { data: engagement, error: engagementError } = await client.from('engagements').select('commitment_state').eq('id', assignment.engagement_id).single()
  if (engagementError) throw engagementError
  if (!['SIGNED','DEPOSIT_PENDING','CONFIRMED'].includes(engagement.commitment_state)) throw new Error('Confirmed crew requires a commercially committed Engagement.')
  const { data, error: updateError } = await client.from('engagement_assignments').update({ assignment_state: 'CONFIRMED', certainty_state: 'KNOWN' }).eq('id', assignmentId).select('*').single()
  if (updateError) throw updateError
  return data
}

export async function setScheduleItemTiming(input: { scheduleItemId: string; startAt?: string | null; endAt?: string | null; startDate?: string | null; endDate?: string | null; timeState: 'KNOWN' | 'VERIFIED' }) {
  const client = requireClient()
  if (!input.startAt && !input.startDate) throw new Error('Provide a start date or time.')
  if (input.startAt && input.endAt && Date.parse(input.endAt) < Date.parse(input.startAt)) throw new Error('Schedule end cannot be before start.')
  const { data: current, error } = await client.from('engagement_schedule_items').select('id,time_state,metadata').eq('id', input.scheduleItemId).single()
  if (error) throw error
  if (current.time_state === 'VERIFIED' && input.timeState !== 'VERIFIED') throw new Error('A VERIFIED schedule item cannot be downgraded.')
  const { data, error: updateError } = await client.from('engagement_schedule_items').update({
    start_at: input.startAt ?? null,
    end_at: input.endAt ?? null,
    start_date: input.startDate ?? input.startAt?.slice(0,10) ?? null,
    end_date: input.endDate ?? input.endAt?.slice(0,10) ?? input.startDate ?? input.startAt?.slice(0,10) ?? null,
    time_state: input.timeState,
    metadata: { ...(current.metadata ?? {}), operations_command_runtime: 'v1' },
  }).eq('id', input.scheduleItemId).select('*').single()
  if (updateError) throw updateError
  return data
}

export async function startWarehouseCycle(resourceCommitmentId: string) { return initializeWarehouseFulfillment(resourceCommitmentId) }
export async function advanceWarehouseState(input: { resourceCommitmentId: string; nextState: WarehouseState; returnConditionState?: ReturnConditionState; note?: string }) { return transitionWarehouseFulfillment(input) }
export async function addPaymentTerm(input: { commercialDocumentId: string; termType: PaymentTermType; amount?: number; percentage?: number; dueDate?: string; dueTrigger?: string }) { return createPaymentScheduleTerm(input) }
