import { supabase } from './supabase'

const SOURCE_BUCKET = 'source-artifacts'

export interface SourceArtifact {
  id: string
  artifact_type: 'PHOTO' | 'VOICE' | 'TEXT' | 'IMPORT' | 'EMAIL_REFERENCE' | 'DOCUMENT' | 'OTHER'
  storage_path: string | null
  reference: string | null
  original_filename: string | null
  mime_type: string | null
  raw_text: string | null
  processing_state: 'RECEIVED' | 'PENDING_ANALYSIS' | 'ANALYZED' | 'FAILED' | 'NOT_REQUIRED'
  metadata: Record<string, unknown>
  created_at: string
}

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured.')
  return supabase
}

export async function listEngagementSourceArtifacts(engagementId: string): Promise<SourceArtifact[]> {
  const client = requireClient()
  const { data: links, error: linkError } = await client
    .from('events')
    .select('entity_id')
    .eq('engagement_id', engagementId)
    .eq('entity_type', 'source_artifact')
    .eq('event_type', 'SOURCE_ADDED')
  if (linkError) throw linkError

  const ids = [...new Set((links ?? []).map((row) => row.entity_id).filter((id): id is string => Boolean(id)))]
  if (!ids.length) return []

  const { data, error } = await client
    .from('source_artifacts')
    .select('id,artifact_type,storage_path,reference,original_filename,mime_type,raw_text,processing_state,metadata,created_at')
    .in('id', ids)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as SourceArtifact[]
}

export async function downloadSourceArtifact(storagePath: string): Promise<Blob> {
  const client = requireClient()
  const { data, error } = await client.storage.from(SOURCE_BUCKET).download(storagePath)
  if (error) throw error
  return data
}
