import { supabase } from './supabase'
import { verifyInventory } from './inventoryCapacityRuntime'

function db() {
  if (!supabase) throw new Error('Backend is not configured.')
  return supabase
}

export type MaintenanceStatus = 'OPEN' | 'DIAGNOSING' | 'WAITING_PARTS' | 'SCHEDULED' | 'IN_REPAIR' | 'READY_FOR_VERIFY' | 'RESOLVED' | 'CANCELLED'
export type MaintenanceSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type MaintenanceCostState = 'ESTIMATE' | 'COMMITTED' | 'ACTUAL'

export interface MaintenanceIssue {
  maintenance_issue_id: string
  resource_id: string
  resource_name: string
  category: string
  title: string
  status: MaintenanceStatus
  severity: MaintenanceSeverity
  affected_quantity: number
  owner_team_member_id: string | null
  owner_name: string | null
  vendor_party_id: string | null
  vendor_name: string | null
  diagnosis: string | null
  resolution: string | null
  discovered_at: string
  target_return_at: string | null
  resolved_at: string | null
  source_inventory_verification_id: string | null
  estimated_cost: number
  committed_cost: number
  actual_cost: number
  service_attention_state: string
}

export async function listMaintenanceQueue(): Promise<MaintenanceIssue[]> {
  const { data, error } = await db().from('resource_maintenance_queue_v').select('*').order('resolved_at', { ascending: true, nullsFirst: true }).order('discovered_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as MaintenanceIssue[]
}

export async function listMaintenanceActors() {
  const client = db()
  const [{ data: team, error: teamError }, { data: parties, error: partyError }] = await Promise.all([
    client.from('team_members').select('id,display_name').eq('active', true).order('display_name'),
    client.from('parties').select('id,name,organization_name,party_type').order('organization_name').order('name'),
  ])
  if (teamError) throw teamError
  if (partyError) throw partyError
  return { team: team ?? [], vendors: parties ?? [] }
}

export async function openMaintenanceIssue(input: {
  resourceId: string
  title: string
  affectedQuantity: number
  severity: MaintenanceSeverity
  sourceInventoryVerificationId?: string | null
  ownerTeamMemberId?: string | null
  vendorPartyId?: string | null
  diagnosis?: string | null
  targetReturnAt?: string | null
  notes?: string | null
}) {
  if (!input.title.trim()) throw new Error('Maintenance issue needs a title.')
  if (!Number.isFinite(input.affectedQuantity) || input.affectedQuantity <= 0) throw new Error('Affected quantity must be greater than zero.')
  const client = db()
  const { data: auth, error: authError } = await client.auth.getUser()
  if (authError) throw authError
  if (!auth.user?.id) throw new Error('Sign in to open maintenance work.')

  const { data: inventory, error: inventoryError } = await client.from('resource_inventory_current_v').select('*').eq('resource_id', input.resourceId).single()
  if (inventoryError) throw inventoryError
  if (inventory.sourcing_model !== 'OWNED') throw new Error('Maintenance capacity v1 currently applies to owned Resources.')
  if (!inventory.verification_id) throw new Error('Physically verify inventory before opening capacity-affecting maintenance.')

  let sourceVerificationId = input.sourceInventoryVerificationId ?? null
  if (sourceVerificationId) {
    if (sourceVerificationId !== inventory.verification_id) throw new Error('Service issue must use the latest inventory verification.')
    const unavailable = Number(inventory.unavailable_quantity ?? 0)
    const { data: claimed, error: claimedError } = await client.from('resource_maintenance_issues').select('affected_quantity,status').eq('source_inventory_verification_id', sourceVerificationId).neq('status', 'CANCELLED')
    if (claimedError) throw claimedError
    const claimedQuantity = (claimed ?? []).reduce((sum, row) => sum + Number(row.affected_quantity ?? 0), 0)
    if (claimedQuantity + input.affectedQuantity > unavailable) throw new Error('Affected quantity exceeds the unavailable quantity represented by this verification.')
  } else {
    const currentServiceable = Number(inventory.serviceable_quantity ?? 0)
    if (input.affectedQuantity > currentServiceable) throw new Error('Affected quantity exceeds currently serviceable inventory.')
    const verification = await verifyInventory({
      resourceId: input.resourceId,
      verifiedQuantity: Number(inventory.verified_quantity),
      serviceableQuantity: currentServiceable - input.affectedQuantity,
      locationId: inventory.location_id,
      notes: `Capacity reduced by maintenance issue: ${input.title.trim()}`,
    })
    sourceVerificationId = verification.id
  }

  const { data: issue, error } = await client.from('resource_maintenance_issues').insert({
    resource_id: input.resourceId,
    source_inventory_verification_id: sourceVerificationId,
    title: input.title.trim(),
    severity: input.severity,
    affected_quantity: input.affectedQuantity,
    owner_team_member_id: input.ownerTeamMemberId ?? null,
    vendor_party_id: input.vendorPartyId ?? null,
    diagnosis: input.diagnosis?.trim() || null,
    target_return_at: input.targetReturnAt ?? null,
    notes: input.notes?.trim() || null,
    created_by: auth.user.id,
    metadata: { maintenance_service_runtime: 'v1' },
  }).select('*').single()
  if (error) throw error

  await client.from('resources').update({ condition_state: Number(inventory.serviceable_quantity ?? 0) - (input.sourceInventoryVerificationId ? 0 : input.affectedQuantity) <= 0 ? 'OUT_OF_SERVICE' : 'NEEDS_SERVICE' }).eq('id', input.resourceId)
  await client.from('events').insert({ entity_type: 'resource', entity_id: input.resourceId, event_type: 'RESOURCE_MAINTENANCE_OPENED', actor_user_id: auth.user.id, summary: input.title.trim(), metadata: { maintenance_issue_id: issue.id, affected_quantity: input.affectedQuantity, severity: input.severity } })
  return issue
}

export async function updateMaintenanceIssue(input: { issueId: string; status?: MaintenanceStatus; severity?: MaintenanceSeverity; ownerTeamMemberId?: string | null; vendorPartyId?: string | null; diagnosis?: string | null; targetReturnAt?: string | null; notes?: string | null }) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.status) patch.status = input.status
  if (input.severity) patch.severity = input.severity
  if ('ownerTeamMemberId' in input) patch.owner_team_member_id = input.ownerTeamMemberId ?? null
  if ('vendorPartyId' in input) patch.vendor_party_id = input.vendorPartyId ?? null
  if ('diagnosis' in input) patch.diagnosis = input.diagnosis?.trim() || null
  if ('targetReturnAt' in input) patch.target_return_at = input.targetReturnAt ?? null
  if ('notes' in input) patch.notes = input.notes?.trim() || null
  const { data, error } = await db().from('resource_maintenance_issues').update(patch).eq('id', input.issueId).select('*').single()
  if (error) throw error
  return data
}

export async function recordMaintenanceCost(input: { issueId: string; state: MaintenanceCostState; amount: number; description: string; vendorPartyId?: string | null }) {
  if (!Number.isFinite(input.amount) || input.amount < 0) throw new Error('Maintenance cost must be zero or greater.')
  const client = db()
  const { data: issue, error: issueError } = await client.from('resource_maintenance_issues').select('id,resource_id,vendor_party_id').eq('id', input.issueId).single()
  if (issueError) throw issueError
  const { data: auth, error: authError } = await client.auth.getUser()
  if (authError) throw authError
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await client.from('company_cost_items').insert({
    cost_category: 'MAINTENANCE', cost_state: input.state, description: input.description.trim() || 'Maintenance cost', amount: input.amount, currency: 'USD',
    expected_date: input.state === 'ACTUAL' ? null : today, incurred_date: input.state === 'ACTUAL' ? today : null,
    counterparty_party_id: input.vendorPartyId ?? issue.vendor_party_id ?? null, resource_id: issue.resource_id,
    certainty_state: input.state === 'ACTUAL' ? 'KNOWN' : 'ESTIMATED', source_type: 'MANUAL', maintenance_issue_id: issue.id,
    metadata: { maintenance_service_runtime: 'v1' }, created_by: auth.user?.id ?? null,
  }).select('*').single()
  if (error) throw error
  return data
}

export async function resolveMaintenanceIssue(input: { issueId: string; resolution: string }) {
  if (!input.resolution.trim()) throw new Error('Describe what restored the Resource to service.')
  const client = db()
  const { data: issue, error: issueError } = await client.from('resource_maintenance_issues').select('*').eq('id', input.issueId).single()
  if (issueError) throw issueError
  if (['RESOLVED','CANCELLED'].includes(issue.status)) throw new Error('Maintenance issue is already closed.')
  const { data: inventory, error: inventoryError } = await client.from('resource_inventory_current_v').select('*').eq('resource_id', issue.resource_id).single()
  if (inventoryError) throw inventoryError
  const restored = Math.min(Number(inventory.verified_quantity ?? 0), Number(inventory.serviceable_quantity ?? 0) + Number(issue.affected_quantity ?? 0))
  await verifyInventory({ resourceId: issue.resource_id, verifiedQuantity: Number(inventory.verified_quantity), serviceableQuantity: restored, locationId: inventory.location_id, notes: `Returned to service: ${input.resolution.trim()}` })
  const resolvedAt = new Date().toISOString()
  const { data, error } = await client.from('resource_maintenance_issues').update({ status: 'RESOLVED', resolution: input.resolution.trim(), resolved_at: resolvedAt, updated_at: resolvedAt }).eq('id', input.issueId).select('*').single()
  if (error) throw error
  const nextCondition = restored >= Number(inventory.verified_quantity ?? 0) ? 'VERIFIED_GOOD' : 'NEEDS_SERVICE'
  await client.from('resources').update({ condition_state: nextCondition }).eq('id', issue.resource_id)
  const { data: auth } = await client.auth.getUser()
  await client.from('events').insert({ entity_type: 'resource', entity_id: issue.resource_id, event_type: 'RESOURCE_MAINTENANCE_RESOLVED', actor_user_id: auth.user?.id ?? null, summary: input.resolution.trim(), metadata: { maintenance_issue_id: issue.id, restored_quantity: issue.affected_quantity } })
  return data
}
