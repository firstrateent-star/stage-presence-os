import { supabase } from './supabase'
import type { CaptureReviewMetadata } from './captureReviewModel'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured.')
  return supabase
}

export async function recordCaptureReview(input: {
  engagementId: string
  sourceArtifactId: string
  metadata: CaptureReviewMetadata
}) {
  const client = requireClient()
  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  const actorUserId = userData.user?.id ?? null

  const { data, error } = await client.from('events').insert({
    engagement_id: input.engagementId,
    entity_type: 'source_artifact',
    entity_id: input.sourceArtifactId,
    event_type: 'CAPTURE_REVIEW_RECORDED',
    actor_user_id: actorUserId,
    summary: 'Capture intelligence review recorded',
    metadata: input.metadata,
  }).select('id').single()
  if (error) throw error
  return data
}
