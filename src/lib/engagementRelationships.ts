import { supabase } from './supabase'

export type EngagementRelationshipType = 'PROGRAM_COMPONENT' | 'RECURRENCE_OF' | 'RENEWAL_OF' | 'RELATED_TO'
export type EngagementRelationshipCertainty = 'VERIFIED' | 'KNOWN' | 'ESTIMATED' | 'ASSUMED' | 'CONFLICTING'

export interface EngagementRelationship {
  id: string
  from_engagement_id: string
  to_engagement_id: string
  relationship_type: EngagementRelationshipType
  certainty_state: EngagementRelationshipCertainty
  source_artifact_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export async function listEngagementRelationships(): Promise<EngagementRelationship[]> {
  if (!supabase) throw new Error('Backend is not configured.')
  const { data, error } = await supabase
    .from('engagement_relationships')
    .select('id,from_engagement_id,to_engagement_id,relationship_type,certainty_state,source_artifact_id,notes,created_at,updated_at')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as EngagementRelationship[]
}
