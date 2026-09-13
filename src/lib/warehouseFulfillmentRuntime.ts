import { supabase } from './supabase'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured.')
  return supabase
}

export type WarehouseState =
  | 'AWAITING_PULL'
  | 'PULLED'
  | 'LOADED'
  | 'OUT'
  | 'RETURNED'
  | 'INSPECTION_REQUIRED'
  | 'INSPECTED'
  | 'RESTOCKED'
  | 'EXCEPTION'

export type CustodyState =
  | 'WAREHOUSE'
  | 'STAGE_PRESENCE_TRANSIT'
  | 'CUSTOMER'
  | 'VENUE'
  | 'FIELD'
  | 'RETURN_TRANSIT'
  | 'UNKNOWN'

export type ReturnConditionState = 'UNKNOWN' | 'OK' | 'DAMAGED' | 'MISSING' | 'SERVICE_REQUIRED' | 'CONFLICTING'

const transitions: Record<WarehouseState, WarehouseState[]> = {
  AWAITING_PULL: ['PULLED', 'EXCEPTION'],
  PULLED: ['LOADED', 'OUT', 'EXCEPTION'],
  LOADED: ['PULLED', 'OUT', 'EXCEPTION'],
  OUT: ['RETURNED', 'EXCEPTION'],
  RETURNED: ['INSPECTION_REQUIRED', 'INSPECTED', 'EXCEPTION'],
  INSPECTION_REQUIRED: ['INSPECTED', 'EXCEPTION'],
  INSPECTED: ['RESTOCKED', 'EXCEPTION'],
  RESTOCKED: [],
  EXCEPTION: [],
}

function custodyForState(state: WarehouseState, supplied?: CustodyState): CustodyState {
  if (supplied) return supplied
  if (state === 'AWAITING_PULL' || state === 'PULLED' || state === 'RETURNED' || state === 'INSPECTION_REQUIRED' || state === 'INSPECTED' || state === 'RESTOCKED') return 'WAREHOUSE'
  if (state === 'LOADED') return 'STAGE_PRESENCE_TRANSIT'
  if (state === 'OUT') return 'UNKNOWN'
  return 'UNKNOWN'
}

export interface WarehouseQueueItem {
  resource_commitment_id: string
  engagement_id: string
  engagement_number: string
  engagement_name: string
  resource_id: string
  resource_name: string
  commitment_state: string
  committed_quantity: number | null
  from_date: string | null
  through_date: string | null
  resource_fulfillment_state_id: string | null
  fulfillment_state: WarehouseState
  custody_state: CustodyState
  return_condition_state: ReturnConditionState
  next_warehouse_decision: string
  warehouse_cycle_complete: boolean
}

export async function listWarehouseQueue(engagementId?: string): Promise<WarehouseQueueItem[]> {
  let query = requireClient().from('warehouse_fulfillment_queue_v').select('*').order('from_date', { ascending: true, nullsFirst: false }).order('resource_name')
  if (engagementId) query = query.eq('engagement_id', engagementId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as WarehouseQueueItem[]
}

export async function initializeWarehouseFulfillment(resourceCommitmentId: string): Promise<WarehouseQueueItem> {
  const client = requireClient()
  const { data: commitment, error: commitmentError } = await client
    .from('resource_commitments')
    .select('id,engagement_id,resource_id,fulfillment_plan_line_id,commitment_state,quantity')
    .eq('id', resourceCommitmentId)
    .single()
  if (commitmentError) throw commitmentError
  if (commitment.commitment_state !== 'CONFIRMED') throw new Error('Warehouse fulfillment requires a CONFIRMED Resource commitment.')

  const { data: userData } = await client.auth.getUser()
  const userId = userData.user?.id ?? null
  const { error } = await client.from('resource_fulfillment_states').upsert({
    resource_commitment_id: commitment.id,
    engagement_id: commitment.engagement_id,
    resource_id: commitment.resource_id,
    fulfillment_plan_line_id: commitment.fulfillment_plan_line_id,
    fulfillment_state: 'AWAITING_PULL',
    quantity: commitment.quantity,
    custody_state: 'WAREHOUSE',
    created_by: userId,
    updated_by: userId,
  }, { onConflict: 'resource_commitment_id', ignoreDuplicates: true })
  if (error) throw error

  const { data, error: readError } = await client.from('warehouse_fulfillment_queue_v').select('*').eq('resource_commitment_id', resourceCommitmentId).single()
  if (readError) throw readError
  return data as WarehouseQueueItem
}

export async function transitionWarehouseFulfillment(input: {
  resourceCommitmentId: string
  nextState: WarehouseState
  custodyState?: CustodyState
  returnConditionState?: ReturnConditionState
  issueQuantity?: number | null
  note?: string
  recoveryFromException?: boolean
}): Promise<WarehouseQueueItem> {
  const client = requireClient()
  const { data: current, error: currentError } = await client
    .from('warehouse_fulfillment_queue_v')
    .select('*')
    .eq('resource_commitment_id', input.resourceCommitmentId)
    .single()
  if (currentError) throw currentError
  if (current.commitment_state !== 'CONFIRMED' && current.commitment_state !== 'FULFILLED') throw new Error('Warehouse transitions require a confirmed or fulfilled Resource commitment.')

  const currentState = current.fulfillment_state as WarehouseState
  if (currentState === 'EXCEPTION') {
    if (!input.recoveryFromException || input.nextState === 'EXCEPTION') throw new Error('Leaving EXCEPTION requires explicit recovery confirmation and a target state.')
  } else if (!transitions[currentState].includes(input.nextState)) {
    throw new Error(`Invalid warehouse transition: ${currentState} -> ${input.nextState}.`)
  }
  if (input.nextState === 'RESTOCKED' && !['OK', 'UNKNOWN'].includes(input.returnConditionState ?? current.return_condition_state)) {
    throw new Error('Damaged, missing, service-required, or conflicting returns cannot be marked RESTOCKED without resolving the condition first.')
  }
  if (input.issueQuantity !== undefined && input.issueQuantity !== null && input.issueQuantity < 0) throw new Error('Issue quantity cannot be negative.')

  const now = new Date().toISOString()
  const timestampPatch: Record<string, string> = {}
  if (input.nextState === 'PULLED') timestampPatch.pulled_at = now
  if (input.nextState === 'LOADED') timestampPatch.loaded_at = now
  if (input.nextState === 'OUT') timestampPatch.out_at = now
  if (input.nextState === 'RETURNED') timestampPatch.returned_at = now
  if (input.nextState === 'INSPECTED') timestampPatch.inspected_at = now
  if (input.nextState === 'RESTOCKED') timestampPatch.restocked_at = now

  const { data: userData } = await client.auth.getUser()
  const userId = userData.user?.id ?? null
  const { data: stateRow, error: stateError } = await client
    .from('resource_fulfillment_states')
    .update({
      fulfillment_state: input.nextState,
      custody_state: custodyForState(input.nextState, input.custodyState),
      return_condition_state: input.returnConditionState ?? current.return_condition_state,
      issue_quantity: input.issueQuantity === undefined ? current.issue_quantity : input.issueQuantity,
      notes: input.note?.trim() || current.notes,
      updated_by: userId,
      ...timestampPatch,
    })
    .eq('resource_commitment_id', input.resourceCommitmentId)
    .select('id,engagement_id,resource_id')
    .single()
  if (stateError) throw stateError

  const { error: eventError } = await client.from('events').insert({
    engagement_id: stateRow.engagement_id,
    entity_type: 'resource_fulfillment_state',
    entity_id: stateRow.id,
    event_type: 'RESOURCE_FULFILLMENT_STATE_CHANGED',
    actor_user_id: userId,
    summary: `${currentState} -> ${input.nextState}`,
    metadata: {
      resource_commitment_id: input.resourceCommitmentId,
      resource_id: stateRow.resource_id,
      from_state: currentState,
      to_state: input.nextState,
      custody_state: custodyForState(input.nextState, input.custodyState),
      return_condition_state: input.returnConditionState ?? current.return_condition_state,
      note: input.note?.trim() || null,
    },
  })
  if (eventError) throw eventError

  const { data, error } = await client.from('warehouse_fulfillment_queue_v').select('*').eq('resource_commitment_id', input.resourceCommitmentId).single()
  if (error) throw error
  return data as WarehouseQueueItem
}
