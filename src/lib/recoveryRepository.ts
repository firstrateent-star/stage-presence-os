import { supabase } from './supabase'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured. Copy .env.example to .env and add Supabase values.')
  return supabase
}

export type RecoveryStatus = 'OPEN' | 'IN_REVIEW' | 'DEFERRED' | 'NOT_RELEVANT' | 'RESOLVED' | 'NEEDS_DECISION'
export type RecoveryLane = 'RECOVER' | 'REVIEW' | 'ASK_WHEN_RELEVANT' | 'NEEDS_DECISION'
export type RecoveryUrgency = 'NOW' | 'SOON' | 'LATER'

export interface RecoveryQueueRow {
  queue_rank: number
  candidate_key: string
  candidate_type: string
  domain: string
  title: string
  description: string
  engagement_id: string | null
  engagement_number: string | null
  engagement_name: string | null
  resource_id: string | null
  resource_name: string | null
  source_artifact_id: string | null
  source_segment_id: string | null
  source_label: string | null
  evidence: Record<string, unknown> | null
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  certainty_state: string
  urgency: RecoveryUrgency
  lane: RecoveryLane
  business_impact: string
  suggested_action: string
  priority_score: number
  decision_id: string | null
  status: RecoveryStatus
  assigned_member_id: string | null
  assigned_username: string | null
  assigned_display_name: string | null
  decision_note: string | null
  deferred_until: string | null
  decision_payload: Record<string, unknown> | null
  decided_by: string | null
  decision_created_at: string | null
  decision_updated_at: string | null
}

export async function listRecoveryQueue(): Promise<RecoveryQueueRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('recovery_queue_v')
    .select('*')
    .order('queue_rank')

  if (error) throw error
  return (data ?? []) as unknown as RecoveryQueueRow[]
}

export async function setRecoveryDecision(
  item: RecoveryQueueRow,
  status: RecoveryStatus,
  note?: string | null,
  deferredUntil?: string | null,
) {
  const client = requireClient()
  const { data: userData } = await client.auth.getUser()

  const payload = {
    candidate_key: item.candidate_key,
    candidate_type: item.candidate_type,
    domain: item.domain,
    title_snapshot: item.title,
    engagement_id: item.engagement_id,
    resource_id: item.resource_id,
    status,
    decision_note: note?.trim() || null,
    deferred_until: status === 'DEFERRED' ? (deferredUntil || null) : null,
    decided_by: userData.user?.id ?? null,
    decision_payload: {
      source_label: item.source_label,
      urgency: item.urgency,
      lane_at_decision: item.lane,
      certainty_state: item.certainty_state,
      confidence: item.confidence,
    },
  }

  const { data, error } = await client
    .from('recovery_item_decisions')
    .upsert(payload, { onConflict: 'candidate_key' })
    .select('*')
    .single()

  if (error) throw error
  return data
}
