import { supabase } from './supabase'
import type { Engagement, EngagementFact, LedgerEvent, Resource } from '../types/domain'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured. Copy .env.example to .env and add Supabase values.')
  return supabase
}

export interface PartyLink {
  id: string
  role: string
  is_primary: boolean
  notes: string | null
  party: {
    id: string
    party_type: 'PERSON' | 'ORGANIZATION'
    name: string
    organization_name: string | null
    email: string | null
    phone: string | null
  } | null
}

export interface ResourceLink {
  id: string
  relationship: string
  quantity: number | null
  notes: string | null
  resource: Resource | null
}

export async function listEngagements(): Promise<Engagement[]> {
  const client = requireClient()
  const { data, error } = await client.from('engagements').select('*').is('archived_at', null).order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Engagement[]
}

export async function getEngagement(id: string): Promise<Engagement | null> {
  const client = requireClient()
  const { data, error } = await client.from('engagements').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as Engagement | null
}

export async function listFacts(engagementId: string): Promise<EngagementFact[]> {
  const client = requireClient()
  const { data, error } = await client.from('engagement_facts').select('*').eq('engagement_id', engagementId).order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as EngagementFact[]
}

export async function createFact(input: Omit<EngagementFact, 'id' | 'created_at' | 'updated_at'>) {
  const client = requireClient()
  const { data, error } = await client.from('engagement_facts').insert(input).select('*').single()
  if (error) throw error
  return data as EngagementFact
}

export async function listResources(): Promise<Resource[]> {
  const client = requireClient()
  const { data, error } = await client.from('resources').select('*').is('archived_at', null).eq('active', true).order('category').order('name')
  if (error) throw error
  return (data ?? []) as Resource[]
}

export async function listEngagementResources(engagementId: string): Promise<ResourceLink[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('engagement_resources')
    .select('id,relationship,quantity,notes,resource:resources(*)')
    .eq('engagement_id', engagementId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as ResourceLink[]
}

export async function linkResource(engagementId: string, resourceId: string, relationship = 'CONSIDERING') {
  const client = requireClient()
  const { error } = await client.from('engagement_resources').insert({ engagement_id: engagementId, resource_id: resourceId, relationship })
  if (error) throw error
}

export async function listPartiesForEngagement(engagementId: string): Promise<PartyLink[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('engagement_parties')
    .select('id,role,is_primary,notes,party:parties(id,party_type,name,organization_name,email,phone)')
    .eq('engagement_id', engagementId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as PartyLink[]
}

export async function createPartyAndLink(engagementId: string, input: { name: string; party_type: 'PERSON' | 'ORGANIZATION'; email?: string; phone?: string; organization_name?: string; role: string }) {
  const client = requireClient()
  const { data: party, error: partyError } = await client
    .from('parties')
    .insert({ name: input.name, party_type: input.party_type, email: input.email || null, phone: input.phone || null, organization_name: input.organization_name || null })
    .select('id')
    .single()
  if (partyError) throw partyError
  const { error: linkError } = await client.from('engagement_parties').insert({ engagement_id: engagementId, party_id: party.id, role: input.role, is_primary: input.role === 'PRIMARY_CONTACT' })
  if (linkError) throw linkError
}

export async function listRecentEvents(limit = 20): Promise<LedgerEvent[]> {
  const client = requireClient()
  const { data, error } = await client.from('events').select('*').order('created_at', { ascending: false }).limit(limit)
  if (error) throw error
  return (data ?? []) as LedgerEvent[]
}

export async function listEngagementEvents(engagementId: string): Promise<LedgerEvent[]> {
  const client = requireClient()
  const { data, error } = await client.from('events').select('*').eq('engagement_id', engagementId).order('created_at', { ascending: false }).limit(100)
  if (error) throw error
  return (data ?? []) as LedgerEvent[]
}

export async function addNote(engagementId: string, note: string) {
  const client = requireClient()
  const { error } = await client.from('events').insert({ engagement_id: engagementId, entity_type: 'engagement', entity_id: engagementId, event_type: 'NOTE_ADDED', summary: note })
  if (error) throw error
}

export interface CreateEngagementInput {
  name: string
  engagement_type: Engagement['engagement_type']
  customer_request?: string
  desired_outcome?: string
  event_start?: string
  venue_name?: string
  next_action?: string
  next_action_at?: string
  raw_capture?: string
}

export async function createEngagement(input: CreateEngagementInput): Promise<Engagement> {
  const client = requireClient()
  const { data: userData } = await client.auth.getUser()
  let sourceArtifactId: string | null = null

  if (input.raw_capture?.trim()) {
    const { data: artifact, error: artifactError } = await client
      .from('source_artifacts')
      .insert({ artifact_type: 'TEXT', raw_text: input.raw_capture.trim(), processing_state: 'NOT_REQUIRED', created_by: userData.user?.id ?? null, metadata: { capture_surface: 'new_engagement' } })
      .select('id')
      .single()
    if (artifactError) throw artifactError
    sourceArtifactId = artifact.id
  }

  const { raw_capture: _rawCapture, ...engagementInput } = input
  const { data, error } = await client
    .from('engagements')
    .insert({
      ...engagementInput,
      customer_request: engagementInput.customer_request || null,
      desired_outcome: engagementInput.desired_outcome || null,
      event_start: engagementInput.event_start || null,
      venue_name: engagementInput.venue_name || null,
      next_action: engagementInput.next_action || null,
      next_action_at: engagementInput.next_action_at || null,
      created_by: userData.user?.id ?? null,
    })
    .select('*')
    .single()
  if (error) throw error

  if (sourceArtifactId) {
    await client.from('events').insert({ engagement_id: data.id, entity_type: 'source_artifact', entity_id: sourceArtifactId, event_type: 'SOURCE_ADDED', summary: 'Initial typed capture preserved', metadata: { source_type: 'TEXT' } })
  }

  return data as Engagement
}

export async function updateEngagement(id: string, patch: Partial<Pick<Engagement, 'customer_request' | 'desired_outcome' | 'commercial_state' | 'commitment_state' | 'operational_state' | 'attention_state' | 'next_action' | 'next_action_at' | 'waiting_on' | 'blocked_reason' | 'venue_name'>>) {
  const client = requireClient()
  const { data, error } = await client.from('engagements').update(patch).eq('id', id).select('*').single()
  if (error) throw error
  return data as Engagement
}

export async function archiveEngagement(id: string) {
  const client = requireClient()
  const { error } = await client.from('engagements').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
