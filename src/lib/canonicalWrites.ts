import { supabase } from './supabase'
import type { AttentionState } from '../types/domain'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured. Copy .env.example to .env and add Supabase values.')
  return supabase
}

export interface CanonicalWorkItem {
  id: string
  engagement_id: string | null
  source_key: string | null
  title: string
  action_type: string
  status: 'OPEN' | 'WAITING' | 'BLOCKED' | 'DONE' | 'CANCELLED'
  priority: 'NOW' | 'SOON' | 'NORMAL' | 'LOW'
  due_at: string | null
  due_date: string | null
  waiting_on: string | null
  why_now: string | null
  context_summary: string | null
  origin: string
}

const priorityOrder: Record<CanonicalWorkItem['priority'], number> = {
  NOW: 0,
  SOON: 1,
  NORMAL: 2,
  LOW: 3,
}

function dueTime(item: CanonicalWorkItem) {
  const value = item.due_at || (item.due_date ? `${item.due_date}T23:59:59Z` : null)
  return value ? new Date(value).getTime() : Number.POSITIVE_INFINITY
}

export async function getPrimaryOpenWork(engagementId: string): Promise<CanonicalWorkItem | null> {
  const client = requireClient()
  const { data, error } = await client
    .from('work_items')
    .select('id,engagement_id,source_key,title,action_type,status,priority,due_at,due_date,waiting_on,why_now,context_summary,origin')
    .eq('engagement_id', engagementId)
    .in('status', ['OPEN', 'WAITING', 'BLOCKED'])
  if (error) throw error

  const rows = (data ?? []) as CanonicalWorkItem[]
  rows.sort((a, b) => {
    const priority = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (priority) return priority
    const due = dueTime(a) - dueTime(b)
    if (due) return due
    return a.id.localeCompare(b.id)
  })
  return rows[0] ?? null
}

export async function linkCanonicalVenue(
  engagementId: string,
  venueName: string,
  options: { sourceArtifactId?: string | null; sourceSegmentId?: string | null } = {},
) {
  const client = requireClient()
  const name = venueName.trim()
  if (!name) return null

  const { data: userData } = await client.auth.getUser()
  const actorUserId = userData.user?.id ?? null

  const { data: matches, error: matchError } = await client
    .from('locations')
    .select('id,name')
    .eq('name', name)
    .is('archived_at', null)
    .limit(2)
  if (matchError) throw matchError

  if ((matches ?? []).length > 1) {
    const { data: existingConflicts, error: conflictReadError } = await client
      .from('engagement_facts')
      .select('id')
      .eq('engagement_id', engagementId)
      .eq('category', 'VENUE')
      .eq('label', 'Venue/location match needs review')
      .eq('value_text', name)
      .in('certainty_state', ['UNKNOWN', 'CONFLICTING'])
      .limit(1)
    if (conflictReadError) throw conflictReadError

    if (!(existingConflicts ?? []).length) {
      const { error: conflictError } = await client.from('engagement_facts').insert({
        engagement_id: engagementId,
        category: 'VENUE',
        kind: 'OBSERVATION',
        label: 'Venue/location match needs review',
        value_text: name,
        certainty_state: 'CONFLICTING',
        confidence: null,
        source_type: 'MANUAL',
        source_artifact_id: options.sourceArtifactId ?? null,
        notes: 'Multiple canonical Location records share this exact name. The system preserved the input but did not guess which Location is correct.',
        created_by: actorUserId,
      })
      if (conflictError) throw conflictError
    }
    return null
  }

  let locationId = matches?.[0]?.id as string | undefined
  if (!locationId) {
    const { data: location, error: locationError } = await client
      .from('locations')
      .insert({
        name,
        location_type: 'VENUE',
        source_artifact_id: options.sourceArtifactId ?? null,
        metadata: { source_type: 'MANUAL', capture_surface: 'stage_presence_os' },
      })
      .select('id')
      .single()
    if (locationError) throw locationError
    locationId = location.id
  }

  const { error: demoteError } = await client
    .from('engagement_locations')
    .update({ is_primary: false })
    .eq('engagement_id', engagementId)
    .eq('role', 'VENUE')
    .eq('is_primary', true)
  if (demoteError) throw demoteError

  const sourceKey = `manual-venue:${engagementId}`
  const { error: linkError } = await client.from('engagement_locations').upsert({
    engagement_id: engagementId,
    location_id: locationId,
    source_key: sourceKey,
    role: 'VENUE',
    is_primary: true,
    certainty_state: 'KNOWN',
    source_artifact_id: options.sourceArtifactId ?? null,
    source_segment_id: options.sourceSegmentId ?? null,
    metadata: { source_type: 'MANUAL', capture_surface: 'stage_presence_os' },
  }, { onConflict: 'source_key' })
  if (linkError) throw linkError

  return locationId
}

export async function saveCanonicalNextMove(input: {
  engagementId: string
  title?: string | null
  dueAt?: string | null
  attentionState?: AttentionState
  waitingOn?: string | null
  blockedReason?: string | null
  sourceArtifactId?: string | null
  sourceSegmentId?: string | null
}) {
  const client = requireClient()
  const { data: userData } = await client.auth.getUser()
  const actorUserId = userData.user?.id ?? null
  const current = await getPrimaryOpenWork(input.engagementId)

  let title = current?.title ?? ''
  if (input.title !== undefined) title = input.title?.trim() ?? ''

  const attention = input.attentionState
  const status: CanonicalWorkItem['status'] = attention === 'WAITING'
    ? 'WAITING'
    : attention === 'BLOCKED'
      ? 'BLOCKED'
      : 'OPEN'

  if (!title) {
    if (current) {
      const { error: cancelError } = await client
        .from('work_items')
        .update({ status: 'CANCELLED', completed_at: new Date().toISOString() })
        .eq('id', current.id)
      if (cancelError) throw cancelError
    }
    if (attention) {
      const { error: attentionError } = await client.from('engagements').update({ attention_state: attention }).eq('id', input.engagementId)
      if (attentionError) throw attentionError
    }
    return null
  }

  const patch: Record<string, unknown> = {
    title,
    status,
    waiting_on: input.waitingOn !== undefined ? input.waitingOn : current?.waiting_on ?? null,
    why_now: input.blockedReason !== undefined ? input.blockedReason : current?.why_now ?? null,
  }
  if (input.dueAt !== undefined) patch.due_at = input.dueAt

  let saved: CanonicalWorkItem
  if (current) {
    const { data, error } = await client.from('work_items').update(patch).eq('id', current.id).select('id,engagement_id,source_key,title,action_type,status,priority,due_at,due_date,waiting_on,why_now,context_summary,origin').single()
    if (error) throw error
    saved = data as CanonicalWorkItem
  } else {
    const sourceKey = `manual-next-move:${input.engagementId}`
    const { data: previousManual, error: previousError } = await client
      .from('work_items')
      .select('id')
      .eq('source_key', sourceKey)
      .maybeSingle()
    if (previousError) throw previousError

    const base = {
      engagement_id: input.engagementId,
      source_key: sourceKey,
      title,
      action_type: 'OTHER',
      status,
      priority: attention === 'BLOCKED' || attention === 'NEEDS_ATTENTION' ? 'NOW' : 'NORMAL',
      due_at: input.dueAt ?? null,
      waiting_on: input.waitingOn ?? null,
      why_now: input.blockedReason ?? null,
      certainty_state: 'KNOWN',
      source_artifact_id: input.sourceArtifactId ?? null,
      source_segment_id: input.sourceSegmentId ?? null,
      visibility: 'INTERNAL',
      origin: 'MANUAL',
      metadata: { canonical_role: 'NEXT_MOVE', capture_surface: 'stage_presence_os' },
      completed_at: null,
      created_by: actorUserId,
    }

    if (previousManual) {
      const { data, error } = await client.from('work_items').update(base).eq('id', previousManual.id).select('id,engagement_id,source_key,title,action_type,status,priority,due_at,due_date,waiting_on,why_now,context_summary,origin').single()
      if (error) throw error
      saved = data as CanonicalWorkItem
    } else {
      const { data, error } = await client.from('work_items').insert(base).select('id,engagement_id,source_key,title,action_type,status,priority,due_at,due_date,waiting_on,why_now,context_summary,origin').single()
      if (error) throw error
      saved = data as CanonicalWorkItem
    }
  }

  if (attention) {
    const { error: attentionError } = await client.from('engagements').update({ attention_state: attention }).eq('id', input.engagementId)
    if (attentionError) throw attentionError
  }

  return saved
}
