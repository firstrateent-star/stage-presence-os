import { supabase } from './supabase'
import { listEngagements } from './repository'
import { listEngagementFrontends, type EngagementFrontendRow } from './operatingRepository'
import type { Engagement } from '../types/domain'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured. Copy .env.example to .env and add Supabase values.')
  return supabase
}

type VenueProjection = {
  name: string | null
  address: string | null
}

type WorkProjection = {
  title: string
  status: string
  priority: string
  due_at: string | null
  due_date: string | null
  waiting_on: string | null
  why_now: string | null
}

function priorityRank(value: string) {
  return value === 'NOW' ? 0 : value === 'SOON' ? 1 : value === 'NORMAL' ? 2 : 3
}

function dueRank(row: WorkProjection) {
  if (row.due_at) return new Date(row.due_at).getTime()
  if (row.due_date) return new Date(`${row.due_date}T23:59:59Z`).getTime()
  return Number.POSITIVE_INFINITY
}

async function loadCanonicalCompatibility() {
  const client = requireClient()
  const [{ data: locationLinks, error: locationError }, { data: workRows, error: workError }] = await Promise.all([
    client
      .from('engagement_locations')
      .select('engagement_id,is_primary,created_at,location:locations(name,address)')
      .eq('role', 'VENUE')
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true }),
    client
      .from('work_items')
      .select('engagement_id,title,status,priority,due_at,due_date,waiting_on,why_now')
      .in('status', ['OPEN', 'WAITING', 'BLOCKED']),
  ])
  if (locationError) throw locationError
  if (workError) throw workError

  const venues = new Map<string, VenueProjection>()
  for (const raw of locationLinks ?? []) {
    const row = raw as unknown as { engagement_id: string; location: VenueProjection | VenueProjection[] | null }
    if (venues.has(row.engagement_id)) continue
    const location = Array.isArray(row.location) ? row.location[0] : row.location
    if (location) venues.set(row.engagement_id, location)
  }

  const workByEngagement = new Map<string, WorkProjection[]>()
  for (const raw of workRows ?? []) {
    const row = raw as unknown as WorkProjection & { engagement_id: string }
    const list = workByEngagement.get(row.engagement_id) ?? []
    list.push(row)
    workByEngagement.set(row.engagement_id, list)
  }

  const work = new Map<string, WorkProjection>()
  for (const [engagementId, rows] of workByEngagement) {
    rows.sort((a, b) => {
      const priority = priorityRank(a.priority) - priorityRank(b.priority)
      if (priority) return priority
      return dueRank(a) - dueRank(b)
    })
    if (rows[0]) work.set(engagementId, rows[0])
  }

  return { venues, work }
}

export async function listCanonicalEngagements(): Promise<Engagement[]> {
  const [engagements, compatibility] = await Promise.all([
    listEngagements(),
    loadCanonicalCompatibility(),
  ])

  return engagements.map((engagement) => {
    const venue = compatibility.venues.get(engagement.id)
    const nextWork = compatibility.work.get(engagement.id)
    return {
      ...engagement,
      venue_name: venue?.name ?? engagement.venue_name,
      venue_address: venue?.address ?? engagement.venue_address,
      next_action: nextWork?.title ?? engagement.next_action,
      next_action_at: nextWork?.due_at ?? engagement.next_action_at,
      waiting_on: nextWork?.waiting_on ?? engagement.waiting_on,
      blocked_reason: nextWork?.status === 'BLOCKED' ? nextWork.why_now ?? engagement.blocked_reason : engagement.blocked_reason,
    }
  })
}

export async function listCanonicalEngagementFrontends(): Promise<EngagementFrontendRow[]> {
  const [rows, compatibility] = await Promise.all([
    listEngagementFrontends(),
    loadCanonicalCompatibility(),
  ])

  return rows.map((row) => {
    const venue = compatibility.venues.get(row.id)
    return {
      ...row,
      venue_name: venue?.name ?? row.venue_name,
      venue_address: venue?.address ?? row.venue_address,
    }
  })
}
