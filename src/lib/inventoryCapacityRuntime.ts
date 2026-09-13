import { supabase } from './supabase'
import { confirmResourceReservation } from './commercialOperationsBridge'

function client() {
  if (!supabase) throw new Error('Backend is not configured.')
  return supabase
}

export interface CapacityPosition {
  resource_id: string
  resource_name: string
  category: string
  sourcing_model: string
  catalog_quantity: number | null
  quantity_state: string
  condition_state: string | null
  verification_id: string | null
  verified_quantity: number | null
  serviceable_quantity: number | null
  unavailable_quantity: number | null
  location_id: string | null
  location_name: string | null
  counted_at: string | null
  inventory_authority_state: string
  confirmed_commitment_count: number
  committed_quantity_today: number
  available_quantity_today: number | null
  capacity_state: string
}

export async function listCapacityPositions(): Promise<CapacityPosition[]> {
  const { data, error } = await client().from('resource_capacity_position_v').select('*').eq('sourcing_model', 'OWNED').order('category').order('resource_name')
  if (error) throw error
  return (data ?? []) as CapacityPosition[]
}

export async function verifyInventory(input: {
  resourceId: string
  verifiedQuantity: number
  serviceableQuantity: number
  locationId?: string | null
  countedAt?: string
  notes?: string | null
}) {
  if (!Number.isFinite(input.verifiedQuantity) || input.verifiedQuantity < 0) throw new Error('Verified quantity must be zero or greater.')
  if (!Number.isFinite(input.serviceableQuantity) || input.serviceableQuantity < 0 || input.serviceableQuantity > input.verifiedQuantity) throw new Error('Serviceable quantity must be between zero and verified quantity.')
  const db = client()
  const { data: resource, error: resourceError } = await db.from('resources').select('id,name,sourcing_model').eq('id', input.resourceId).single()
  if (resourceError) throw resourceError
  if (resource.sourcing_model !== 'OWNED') throw new Error('Inventory verification v1 is only for owned Resources.')
  const { data: auth, error: authError } = await db.auth.getUser()
  if (authError) throw authError
  if (!auth.user?.id) throw new Error('Sign in to verify inventory.')

  const { data: verification, error } = await db.from('resource_inventory_verifications').insert({
    resource_id: input.resourceId,
    verified_quantity: input.verifiedQuantity,
    serviceable_quantity: input.serviceableQuantity,
    location_id: input.locationId ?? null,
    counted_at: input.countedAt ?? new Date().toISOString(),
    counted_by: auth.user.id,
    notes: input.notes?.trim() || null,
    metadata: { inventory_capacity_runtime: 'v1' },
  }).select('*').single()
  if (error) throw error

  const conditionState = input.verifiedQuantity === input.serviceableQuantity
    ? 'VERIFIED_GOOD'
    : input.serviceableQuantity === 0 && input.verifiedQuantity > 0
      ? 'OUT_OF_SERVICE'
      : 'NEEDS_SERVICE'
  const { error: updateError } = await db.from('resources').update({
    quantity: input.verifiedQuantity,
    quantity_state: 'VERIFIED',
    condition_state: conditionState,
  }).eq('id', input.resourceId)
  if (updateError) throw updateError

  await db.from('events').insert({
    entity_type: 'resource',
    entity_id: input.resourceId,
    event_type: 'RESOURCE_INVENTORY_VERIFIED',
    actor_user_id: auth.user.id,
    summary: `${resource.name}: ${input.verifiedQuantity} verified, ${input.serviceableQuantity} serviceable`,
    metadata: { verification_id: verification.id, verified_quantity: input.verifiedQuantity, serviceable_quantity: input.serviceableQuantity, location_id: input.locationId ?? null },
  })
  return verification
}

export async function capacityForWindow(resourceId: string, fromDate: string, throughDate: string, excludeCommitmentId?: string) {
  if (throughDate < fromDate) throw new Error('Capacity window end cannot be before start.')
  const db = client()
  const { data: inventory, error } = await db.from('resource_inventory_current_v').select('*').eq('resource_id', resourceId).single()
  if (error) throw error
  if (inventory.sourcing_model !== 'OWNED') return { authority: 'EXTERNAL_CAPACITY', serviceableQuantity: null, committedQuantity: null, availableQuantity: null }
  if (!inventory.verification_id) return { authority: 'CAPACITY_UNVERIFIED', serviceableQuantity: null, committedQuantity: null, availableQuantity: null }

  let query = db.from('resource_commitments').select('id,quantity,from_date,through_date').eq('resource_id', resourceId).eq('commitment_state', 'CONFIRMED')
  if (excludeCommitmentId) query = query.neq('id', excludeCommitmentId)
  const { data: commitments, error: commitmentError } = await query
  if (commitmentError) throw commitmentError
  const committedQuantity = (commitments ?? []).filter((row) => row.from_date && row.through_date && fromDate <= row.through_date && throughDate >= row.from_date).reduce((sum, row) => sum + Number(row.quantity ?? 0), 0)
  const serviceableQuantity = Number(inventory.serviceable_quantity)
  return { authority: 'VERIFIED_CAPACITY', serviceableQuantity, committedQuantity, availableQuantity: Math.max(serviceableQuantity - committedQuantity, 0) }
}

export async function confirmReservationAgainstVerifiedCapacity(commitmentId: string) {
  const db = client()
  const { data: commitment, error } = await db.from('resource_commitments').select('id,resource_id,quantity,from_date,through_date,commitment_state').eq('id', commitmentId).single()
  if (error) throw error
  if (commitment.commitment_state !== 'TENTATIVE') throw new Error('Only a tentative hold can become a reservation.')
  if (!commitment.from_date || !commitment.through_date) throw new Error('Reservation needs a complete requirement window.')
  const capacity = await capacityForWindow(commitment.resource_id, commitment.from_date, commitment.through_date, commitment.id)
  if (capacity.authority !== 'VERIFIED_CAPACITY') throw new Error('Owned capacity is not physically verified. Keep the hold tentative until inventory is verified.')
  const requested = Number(commitment.quantity ?? 0)
  if (requested > Number(capacity.availableQuantity ?? 0)) throw new Error(`Only ${capacity.availableQuantity ?? 0} serviceable units are available for this window.`)
  return confirmResourceReservation({ commitmentId, allowUnverifiedCapacity: false, allowCapacityConflict: false })
}
