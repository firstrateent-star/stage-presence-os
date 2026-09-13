import { supabase } from './supabase'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured. Copy .env.example to .env and add Supabase values.')
  return supabase
}

export type CommitmentType = 'HOLD' | 'RESERVATION' | 'ALLOCATION'
export type CommitmentState = 'TENTATIVE' | 'CONFIRMED' | 'RELEASED' | 'FULFILLED' | 'CANCELLED' | 'UNKNOWN'
export type AssignmentState = 'POSSIBLE' | 'REQUESTED' | 'CONFIRMED' | 'DECLINED' | 'COMPLETED' | 'UNKNOWN'
export type AssignmentRole = 'SALES_LEAD' | 'PROJECT_MANAGER' | 'VIDEO_TECH' | 'LED_TECH' | 'AUDIO_TECH' | 'A1' | 'A2' | 'CAMERA' | 'CONTENT' | 'WAREHOUSE' | 'DRIVER' | 'LABOR' | 'INSTALLER' | 'OTHER'
export type PaymentTermType = 'DEPOSIT' | 'INSTALLMENT' | 'FINAL' | 'BALANCE' | 'OTHER'

export interface CommitmentBridgePosition {
  engagement_id: string
  engagement_number: string
  engagement_name: string
  engagement_type: string
  commercial_state: string
  commitment_state: string
  operational_state: string
  accepted_document_id: string | null
  accepted_document_type: string | null
  accepted_document_state: string | null
  transaction_type: string | null
  committed_value: number | null
  accepted_at: string | null
  signature_date: string | null
  scope_line_count: number
  resource_scope_line_count: number
  non_resource_scope_line_count: number
  resource_scope_lines_with_commitment: number
  resource_scope_lines_confirmed: number
  resource_commitment_gap_count: number
  requirement_window_gap_count: number
  represented_assignment_count: number
  confirmed_assignment_count: number
  requested_assignment_count: number
  schedule_item_count: number
  known_schedule_item_count: number
  tbd_schedule_item_count: number
  payment_schedule_item_count: number
  open_payment_term_count: number
  scheduled_amount: number | null
  payment_term_state: string
  assignment_coverage_state: string
  schedule_coverage_state: string
  operations_bridge_state: string
}

export interface AcceptedScopeCommitmentLine {
  engagement_id: string
  engagement_number: string
  engagement_name: string
  fulfillment_line_id: string
  fulfillment_line_type: string
  title: string
  scope_quantity: number | null
  resource_id: string | null
  resource_name: string | null
  required_from_date: string | null
  required_through_date: string | null
  requirement_window_state: string | null
  planned_sourcing_model: string
  active_commitment_count: number
  tentative_commitment_count: number
  confirmed_commitment_count: number
  confirmed_quantity: number | null
  operational_commitment_state: string
  resource_commitment_decision_required: boolean
  requirement_window_resolution_required: boolean
}

export async function getCommitmentBridgePosition(engagementId: string): Promise<CommitmentBridgePosition | null> {
  const client = requireClient()
  const { data, error } = await client.from('engagement_commitment_bridge_v').select('*').eq('engagement_id', engagementId).maybeSingle()
  if (error) throw error
  return data as CommitmentBridgePosition | null
}

export async function listAcceptedScopeCommitmentCoverage(engagementId: string): Promise<AcceptedScopeCommitmentLine[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('accepted_scope_commitment_coverage_v')
    .select('*')
    .eq('engagement_id', engagementId)
    .order('sort_order', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data ?? []) as AcceptedScopeCommitmentLine[]
}

export interface AcceptQuoteInput {
  quoteId: string
  acceptedAt?: string
  signatureDate?: string
  acceptanceNote?: string
}

export async function acceptQuote(input: AcceptQuoteInput) {
  const client = requireClient()
  const { data: quote, error: quoteError } = await client
    .from('commercial_documents')
    .select('id,engagement_id,document_type,document_state,metadata')
    .eq('id', input.quoteId)
    .single()
  if (quoteError) throw quoteError
  if (quote.document_type !== 'QUOTE') throw new Error('Only a QUOTE can be accepted through this command.')
  if (!['DRAFT', 'SENT', 'UNSIGNED'].includes(quote.document_state)) throw new Error('That quote is not in an accept-ready state.')

  const { count, error: countError } = await client
    .from('commercial_document_lines')
    .select('id', { count: 'exact', head: true })
    .eq('commercial_document_id', quote.id)
  if (countError) throw countError
  if (!count) throw new Error('An empty quote cannot be accepted.')

  const { data: engagement, error: engagementError } = await client
    .from('engagements')
    .select('id,commercial_state,commitment_state,operational_state')
    .eq('id', quote.engagement_id)
    .single()
  if (engagementError) throw engagementError
  if (engagement.commercial_state === 'LOST' || engagement.commitment_state === 'CANCELLED') {
    throw new Error('A lost/cancelled Engagement must be deliberately reopened before accepting a quote.')
  }

  const acceptedAt = input.acceptedAt ?? new Date().toISOString()
  const signatureDate = input.signatureDate ?? acceptedAt.slice(0, 10)
  const metadata = {
    ...(quote.metadata ?? {}),
    commercial_operations_bridge: 'v1',
    acceptance_recorded_at: acceptedAt,
    acceptance_note: input.acceptanceNote?.trim() || null,
  }

  const { error: documentError } = await client.from('commercial_documents').update({
    document_state: 'SIGNED',
    accepted_at: acceptedAt,
    signature_date: signatureDate,
    metadata,
  }).eq('id', quote.id)
  if (documentError) throw documentError

  const engagementPatch: Record<string, string> = {
    commercial_state: 'WON',
    commitment_state: 'SIGNED',
  }
  if (engagement.operational_state === 'NOT_STARTED') engagementPatch.operational_state = 'PLANNING'

  const { error: stateError } = await client.from('engagements').update(engagementPatch).eq('id', engagement.id)
  if (stateError) throw stateError

  return getCommitmentBridgePosition(engagement.id)
}

export interface CreateResourceHoldInput {
  commercialLineId: string
  quantity?: number
  fromDate?: string
  throughDate?: string
  notes?: string
}

function certaintyFromWindowState(windowState: string | null | undefined) {
  if (windowState === 'VERIFIED') return 'VERIFIED'
  if (windowState === 'KNOWN') return 'KNOWN'
  return 'ESTIMATED'
}

export async function createTentativeResourceHoldFromQuoteLine(input: CreateResourceHoldInput) {
  const client = requireClient()
  const { data: line, error: lineError } = await client
    .from('commercial_document_lines')
    .select('id,commercial_document_id,resource_id,fulfillment_line_id,quantity,required_from_date,required_through_date,description')
    .eq('id', input.commercialLineId)
    .single()
  if (lineError) throw lineError
  if (!line.resource_id) throw new Error('That commercial line does not identify a Resource.')

  const { data: document, error: documentError } = await client
    .from('commercial_documents')
    .select('id,engagement_id,document_state')
    .eq('id', line.commercial_document_id)
    .single()
  if (documentError) throw documentError
  if (!['SIGNED', 'PARTIALLY_PAID', 'PAID'].includes(document.document_state)) {
    throw new Error('Resource holds from the Commercial → Operations bridge require accepted commercial evidence.')
  }

  const { data: existing, error: existingError } = await client
    .from('resource_commitments')
    .select('id,commitment_state')
    .eq('commercial_document_line_id', line.id)
    .in('commitment_state', ['TENTATIVE', 'CONFIRMED'])
    .limit(1)
    .maybeSingle()
  if (existingError) throw existingError
  if (existing) throw new Error('That quote line already has an active Resource commitment.')

  const { data: requirement, error: requirementError } = await client
    .from('engagement_resources')
    .select('quantity,required_from_date,required_through_date,requirement_window_state,planned_sourcing_model')
    .eq('engagement_id', document.engagement_id)
    .eq('resource_id', line.resource_id)
    .not('required_from_date', 'is', null)
    .not('required_through_date', 'is', null)
    .limit(1)
    .maybeSingle()
  if (requirementError) throw requirementError

  const fromDate = input.fromDate ?? line.required_from_date ?? requirement?.required_from_date ?? null
  const throughDate = input.throughDate ?? line.required_through_date ?? requirement?.required_through_date ?? null
  if (!fromDate || !throughDate) throw new Error('A Resource commitment needs an explicit requirement window before capacity can be held.')
  if (throughDate < fromDate) throw new Error('Resource commitment end date cannot be before start date.')

  const quantity = input.quantity ?? Number(line.quantity ?? requirement?.quantity ?? 1)
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Resource commitment quantity must be greater than zero.')

  const { data: resource, error: resourceError } = await client
    .from('resources')
    .select('id,sourcing_model')
    .eq('id', line.resource_id)
    .single()
  if (resourceError) throw resourceError

  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError) throw userError

  const { data, error } = await client.from('resource_commitments').insert({
    engagement_id: document.engagement_id,
    resource_id: line.resource_id,
    fulfillment_plan_line_id: line.fulfillment_line_id,
    commercial_document_line_id: line.id,
    commitment_type: 'HOLD',
    commitment_state: 'TENTATIVE',
    quantity,
    from_date: fromDate,
    through_date: throughDate,
    planned_sourcing_model: requirement?.planned_sourcing_model ?? resource.sourcing_model ?? 'UNKNOWN',
    certainty_state: certaintyFromWindowState(requirement?.requirement_window_state),
    notes: input.notes?.trim() || null,
    created_by: userData.user?.id ?? null,
    metadata: {
      commercial_operations_bridge: 'v1',
      source: 'ACCEPTED_QUOTE_LINE',
      requirement_window_state: requirement?.requirement_window_state ?? 'EXPLICIT_COMMAND',
    },
  }).select('*').single()
  if (error) throw error
  return data
}

export interface ConfirmResourceReservationInput {
  commitmentId: string
  allowUnverifiedCapacity?: boolean
  allowCapacityConflict?: boolean
}

function dateRangesOverlap(aFrom: string, aThrough: string, bFrom: string | null, bThrough: string | null) {
  if (!bFrom || !bThrough) return false
  return aFrom <= bThrough && aThrough >= bFrom
}

export async function confirmResourceReservation(input: ConfirmResourceReservationInput) {
  const client = requireClient()
  const { data: commitment, error: commitmentError } = await client
    .from('resource_commitments')
    .select('id,resource_id,commitment_state,quantity,from_date,through_date,metadata')
    .eq('id', input.commitmentId)
    .single()
  if (commitmentError) throw commitmentError
  if (commitment.commitment_state !== 'TENTATIVE') throw new Error('Only a TENTATIVE Resource hold can be confirmed by this command.')
  if (!commitment.from_date || !commitment.through_date) throw new Error('A confirmed reservation requires a complete capacity window.')
  const requestedQuantity = Number(commitment.quantity ?? 0)
  if (requestedQuantity <= 0) throw new Error('A confirmed reservation requires a positive quantity.')

  const { data: resource, error: resourceError } = await client
    .from('resources')
    .select('id,name,sourcing_model,quantity,quantity_state')
    .eq('id', commitment.resource_id)
    .single()
  if (resourceError) throw resourceError

  let capacityState = 'NOT_OWNED_CAPACITY'
  let overlappingConfirmedQuantity = 0
  if (resource.sourcing_model === 'OWNED') {
    if (resource.quantity_state !== 'VERIFIED' || resource.quantity === null) {
      if (!input.allowUnverifiedCapacity) {
        throw new Error('Owned Resource quantity is not VERIFIED. Keep this as a tentative hold or explicitly allow unverified capacity.')
      }
      capacityState = 'UNVERIFIED_CAPACITY_OVERRIDE'
    } else {
      const { data: overlaps, error: overlapError } = await client
        .from('resource_commitments')
        .select('id,quantity,from_date,through_date')
        .eq('resource_id', resource.id)
        .eq('commitment_state', 'CONFIRMED')
        .neq('id', commitment.id)
      if (overlapError) throw overlapError
      overlappingConfirmedQuantity = (overlaps ?? [])
        .filter((other) => dateRangesOverlap(commitment.from_date, commitment.through_date, other.from_date, other.through_date))
        .reduce((sum, other) => sum + Number(other.quantity ?? 0), 0)
      const availableQuantity = Number(resource.quantity)
      if (overlappingConfirmedQuantity + requestedQuantity > availableQuantity && !input.allowCapacityConflict) {
        throw new Error(`Confirmed demand would exceed VERIFIED quantity for ${resource.name}. Resolve capacity or explicitly allow the conflict.`)
      }
      capacityState = overlappingConfirmedQuantity + requestedQuantity > availableQuantity
        ? 'VERIFIED_CAPACITY_CONFLICT_OVERRIDE'
        : 'VERIFIED_CAPACITY_AVAILABLE'
    }
  }

  const metadata = {
    ...(commitment.metadata ?? {}),
    confirmation_runtime: 'v1',
    capacity_state_at_confirmation: capacityState,
    overlapping_confirmed_quantity: overlappingConfirmedQuantity,
    unverified_capacity_override: Boolean(input.allowUnverifiedCapacity),
    capacity_conflict_override: Boolean(input.allowCapacityConflict),
  }

  const { data, error } = await client.from('resource_commitments').update({
    commitment_type: 'RESERVATION',
    commitment_state: 'CONFIRMED',
    certainty_state: capacityState === 'VERIFIED_CAPACITY_AVAILABLE' ? 'VERIFIED' : 'ESTIMATED',
    metadata,
  }).eq('id', commitment.id).select('*').single()
  if (error) throw error
  return data
}

export interface CreateCrewAssignmentInput {
  engagementId: string
  teamMemberId: string
  roleCode: AssignmentRole
  roleLabel?: string
  assignmentState?: AssignmentState
  scheduledStart?: string
  scheduledEnd?: string
  locationId?: string
  scheduleItemId?: string
  notes?: string
  scopeSummary?: string
}

export async function createCrewAssignment(input: CreateCrewAssignmentInput) {
  const client = requireClient()
  const assignmentState = input.assignmentState ?? 'REQUESTED'
  if (input.scheduledStart && input.scheduledEnd && input.scheduledEnd < input.scheduledStart) {
    throw new Error('Crew assignment end time cannot be before start time.')
  }

  const { data: engagement, error: engagementError } = await client
    .from('engagements')
    .select('id,commitment_state')
    .eq('id', input.engagementId)
    .single()
  if (engagementError) throw engagementError
  if (assignmentState === 'CONFIRMED' && ['UNCOMMITTED', 'CANCELLED'].includes(engagement.commitment_state)) {
    throw new Error('A CONFIRMED crew assignment requires a commercially committed Engagement.')
  }

  const { data, error } = await client.from('engagement_assignments').insert({
    engagement_id: input.engagementId,
    team_member_id: input.teamMemberId,
    role_code: input.roleCode,
    role_label: input.roleLabel?.trim() || null,
    assignment_state: assignmentState,
    certainty_state: 'KNOWN',
    scheduled_start: input.scheduledStart ?? null,
    scheduled_end: input.scheduledEnd ?? null,
    location_id: input.locationId ?? null,
    schedule_item_id: input.scheduleItemId ?? null,
    notes: input.notes?.trim() || null,
    scope_summary: input.scopeSummary?.trim() || null,
    acknowledgement_state: assignmentState === 'CONFIRMED' ? 'UNSENT' : 'UNSENT',
    metadata: { commercial_operations_bridge: 'v1' },
  }).select('*').single()
  if (error) throw error
  return data
}

export interface CreatePaymentScheduleTermInput {
  commercialDocumentId: string
  termType: PaymentTermType
  amount?: number
  percentage?: number
  dueDate?: string
  dueTrigger?: string
  notes?: string
}

export async function createPaymentScheduleTerm(input: CreatePaymentScheduleTermInput) {
  const client = requireClient()
  if (input.amount === undefined && input.percentage === undefined) throw new Error('Payment term needs an amount or percentage.')
  if (input.amount !== undefined && (!Number.isFinite(input.amount) || input.amount < 0)) throw new Error('Payment amount must be non-negative.')
  if (input.percentage !== undefined && (!Number.isFinite(input.percentage) || input.percentage < 0 || input.percentage > 100)) throw new Error('Payment percentage must be between 0 and 100.')
  if (!input.dueDate && !input.dueTrigger?.trim()) throw new Error('Payment term needs a due date or trigger.')

  const { data: document, error: documentError } = await client
    .from('commercial_documents')
    .select('id,engagement_id,document_state')
    .eq('id', input.commercialDocumentId)
    .single()
  if (documentError) throw documentError
  if (!['SIGNED', 'PARTIALLY_PAID', 'PAID'].includes(document.document_state)) {
    throw new Error('Payment schedule terms in this bridge require accepted commercial evidence.')
  }

  const { count, error: countError } = await client
    .from('commercial_payment_schedule')
    .select('id', { count: 'exact', head: true })
    .eq('commercial_document_id', document.id)
  if (countError) throw countError

  const { data, error } = await client.from('commercial_payment_schedule').insert({
    commercial_document_id: document.id,
    sequence_no: (count ?? 0) + 1,
    term_type: input.termType,
    amount: input.amount ?? null,
    percentage: input.percentage ?? null,
    due_date: input.dueDate ?? null,
    due_trigger: input.dueTrigger?.trim() || null,
    status: 'PLANNED',
    notes: input.notes?.trim() || null,
    metadata: { commercial_operations_bridge: 'v1' },
  }).select('*').single()
  if (error) throw error

  if (input.termType === 'DEPOSIT') {
    const { data: engagement, error: engagementError } = await client.from('engagements').select('commitment_state').eq('id', document.engagement_id).single()
    if (engagementError) throw engagementError
    if (engagement.commitment_state === 'SIGNED') {
      const { error: stateError } = await client.from('engagements').update({ commitment_state: 'DEPOSIT_PENDING' }).eq('id', document.engagement_id)
      if (stateError) throw stateError
    }
  }

  return data
}
