import { supabase } from './supabase'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured.')
  return supabase
}

export type CloseoutKind = 'DELIVERY' | 'CANCELLED' | 'LOST' | 'OTHER'
export type ActualOutcome = 'AS_EXPECTED' | 'CHANGED' | 'PARTIAL' | 'ISSUE' | 'UNKNOWN'
export type RecurrenceSignal = 'YES' | 'MAYBE' | 'NO' | 'UNKNOWN'
export type LearningReviewReason = 'DELIVERY_LEARNING' | 'STALE_COMMERCIAL' | 'PROGRAM_REVIEW' | 'RESOLVE_CONFLICT' | 'REVIEW'

export interface EngagementCloseout {
  id: string
  engagement_id: string
  closeout_kind: CloseoutKind
  actual_outcome: ActualOutcome
  actual_setup_minutes: number | null
  actual_strike_minutes: number | null
  greg_minutes: number | null
  solution_changed: boolean | null
  what_worked: string | null
  what_changed: string | null
  venue_learning: string | null
  next_time: string | null
  recurrence_signal: RecurrenceSignal
  source_artifact_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface LearningReviewSignal {
  engagement_id: string
  engagement_number: string
  name: string
  event_end_date: string
  commercial_state: string
  commitment_state: string
  operational_state: string
  review_reason: LearningReviewReason
  priority: number
}

export async function listLearningReviewSignals(): Promise<LearningReviewSignal[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('learning_review_signals')
    .select('*')
    .order('priority', { ascending: false })
    .order('event_end_date', { ascending: false })
  if (error) throw error
  return (data ?? []) as LearningReviewSignal[]
}

export async function getEngagementCloseout(engagementId: string): Promise<EngagementCloseout | null> {
  const client = requireClient()
  const { data, error } = await client
    .from('engagement_closeouts')
    .select('*')
    .eq('engagement_id', engagementId)
    .maybeSingle()
  if (error) throw error
  return data as EngagementCloseout | null
}

export interface SaveCloseoutInput {
  closeout_kind: CloseoutKind
  actual_outcome: ActualOutcome
  actual_setup_minutes?: number | null
  actual_strike_minutes?: number | null
  greg_minutes?: number | null
  solution_changed?: boolean | null
  what_worked?: string | null
  what_changed?: string | null
  venue_learning?: string | null
  next_time?: string | null
  recurrence_signal: RecurrenceSignal
  sourceArtifactId?: string | null
}

export async function saveEngagementCloseout(engagementId: string, input: SaveCloseoutInput): Promise<EngagementCloseout> {
  const client = requireClient()
  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError) throw userError

  const { sourceArtifactId, ...closeoutInput } = input
  const { data, error } = await client
    .from('engagement_closeouts')
    .upsert({
      engagement_id: engagementId,
      ...closeoutInput,
      ...(sourceArtifactId !== undefined ? { source_artifact_id: sourceArtifactId } : {}),
      created_by: userData.user?.id ?? null,
    }, { onConflict: 'engagement_id' })
    .select('*')
    .single()
  if (error) throw error
  return data as EngagementCloseout
}