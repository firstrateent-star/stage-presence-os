import { supabase } from './supabase'
import type { Engagement, EngagementFact, LedgerEvent, Resource } from '../types/domain'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured. Copy .env.example to .env and add Supabase values.')
  return supabase
}

export async function listEngagements(): Promise<Engagement[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('engagements')
    .select('*')
    .is('archived_at', null)
    .order('updated_at', { ascending: false })
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
  const { data, error } = await client
    .from('engagement_facts')
    .select('*')
    .eq('engagement_id', engagementId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as EngagementFact[]
}

export async function listResources(): Promise<Resource[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('resources')
    .select('*')
    .is('archived_at', null)
    .eq('active', true)
    .order('category')
    .order('name')
  if (error) throw error
  return (data ?? []) as Resource[]
}

export async function listRecentEvents(limit = 20): Promise<LedgerEvent[]> {
  const client = requireClient()
  const { data, error } = await client.from('events').select('*').order('created_at', { ascending: false }).limit(limit)
  if (error) throw error
  return (data ?? []) as LedgerEvent[]
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
}

export async function createEngagement(input: CreateEngagementInput): Promise<Engagement> {
  const client = requireClient()
  const { data: userData } = await client.auth.getUser()
  const { data, error } = await client
    .from('engagements')
    .insert({
      ...input,
      customer_request: input.customer_request || null,
      desired_outcome: input.desired_outcome || null,
      event_start: input.event_start || null,
      venue_name: input.venue_name || null,
      next_action: input.next_action || null,
      next_action_at: input.next_action_at || null,
      created_by: userData.user?.id ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as Engagement
}
