import { supabase } from './supabase'
import { saveCanonicalNextMove } from './canonicalWrites'
import type { CertaintyState, FactCategory, FactKind } from '../types/domain'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured. Copy .env.example to .env and add Supabase values.')
  return supabase
}

export type ExistingCaptureMode = 'EVIDENCE' | 'FACT' | 'UNKNOWN' | 'NEXT_MOVE'

export async function preserveExistingEngagementCapture(input: {
  engagementId: string
  rawText?: string | null
  photoArtifactIds?: string[]
  mode: ExistingCaptureMode
  label?: string | null
  valueText?: string | null
  category?: FactCategory
  kind?: FactKind
  nextAction?: string | null
  dueAt?: string | null
}) {
  const client = requireClient()
  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id
  if (!userId) throw new Error('You must be signed in to preserve source evidence.')

  const rawText = input.rawText?.trim() || ''
  let textArtifactId: string | null = null

  if (rawText || input.label?.trim() || input.valueText?.trim() || input.nextAction?.trim()) {
    const { data: artifact, error: artifactError } = await client
      .from('source_artifacts')
      .insert({
        artifact_type: 'TEXT',
        raw_text: rawText || null,
        processing_state: 'NOT_REQUIRED',
        created_by: userId,
        metadata: {
          capture_surface: 'capture_existing_engagement',
          evidence_role: 'original_source',
          capture_mode: input.mode,
          submitted_fields: {
            label: input.label?.trim() || null,
            value_text: input.valueText?.trim() || null,
            category: input.category ?? null,
            kind: input.kind ?? null,
            next_action: input.nextAction?.trim() || null,
            due_at: input.dueAt ?? null,
          },
        },
      })
      .select('id')
      .single()
    if (artifactError) throw artifactError
    textArtifactId = artifact.id
  }

  const sourceArtifactIds = [textArtifactId, ...(input.photoArtifactIds ?? [])].filter(Boolean) as string[]
  if (sourceArtifactIds.length) {
    const { error: sourceEventError } = await client.from('events').insert(sourceArtifactIds.map((sourceArtifactId) => ({
      engagement_id: input.engagementId,
      entity_type: 'source_artifact',
      entity_id: sourceArtifactId,
      event_type: 'SOURCE_ADDED',
      actor_user_id: userId,
      summary: input.mode === 'EVIDENCE' ? 'New operating evidence captured' : 'New source evidence captured for structured update',
      metadata: { source_type: sourceArtifactId === textArtifactId ? 'TEXT' : 'PHOTO', capture_mode: input.mode },
    })))
    if (sourceEventError) throw sourceEventError
  }

  if (input.mode === 'FACT' || input.mode === 'UNKNOWN') {
    const label = input.label?.trim()
    if (!label) throw new Error('Give this fact a short label.')
    const certainty: CertaintyState = input.mode === 'UNKNOWN' ? 'UNKNOWN' : 'KNOWN'
    const { error: factError } = await client.from('engagement_facts').insert({
      engagement_id: input.engagementId,
      category: input.category ?? 'OTHER',
      kind: input.kind ?? 'OBSERVATION',
      label,
      value_text: input.valueText?.trim() || rawText || null,
      certainty_state: certainty,
      confidence: null,
      source_type: 'MANUAL_CAPTURE',
      source_artifact_id: textArtifactId ?? input.photoArtifactIds?.[0] ?? null,
      notes: input.mode === 'UNKNOWN' ? 'Captured as intentionally unresolved truth.' : null,
      created_by: userId,
    })
    if (factError) throw factError
  }

  if (input.mode === 'NEXT_MOVE') {
    const title = input.nextAction?.trim() || rawText
    if (!title) throw new Error('Describe the next move.')
    await saveCanonicalNextMove({
      engagementId: input.engagementId,
      title,
      dueAt: input.dueAt ?? null,
      attentionState: 'NORMAL',
      sourceArtifactId: textArtifactId ?? input.photoArtifactIds?.[0] ?? null,
    })
  }

  return { textArtifactId, sourceArtifactIds }
}
