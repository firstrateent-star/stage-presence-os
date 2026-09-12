import { supabase } from './supabase'

export type CaptureReviewDecision = 'APPROVE' | 'REJECT' | 'UNREVIEWED' | 'HELD_NON_ACTIONABLE'
export type CaptureUnknownDecision = 'TRACK' | 'DEFER' | 'UNREVIEWED'

export interface CaptureEvaluationByKind {
  kind: string
  proposed: number
  approved: number
  rejected: number
  unreviewed: number
  heldNonActionable: number
}

export interface CaptureCorrectionPattern {
  note: string
  count: number
}

export interface CaptureEvaluationSnapshot {
  reviewCount: number
  proposalCount: number
  approvedCount: number
  rejectedCount: number
  unreviewedCount: number
  heldNonActionableCount: number
  unknownCount: number
  unknownTrackedCount: number
  unknownDeferredCount: number
  unknownUnreviewedCount: number
  byKind: CaptureEvaluationByKind[]
  correctionPatterns: CaptureCorrectionPattern[]
  interpreters: Array<{ interpreter: string; reviews: number }>
  lastReviewedAt: string | null
}

interface ReviewMetadata {
  schema_version?: string
  interpreter?: string
  proposals?: Array<{
    id?: string
    kind?: string
    decision?: CaptureReviewDecision
    rejection_note?: string | null
  }>
  unknowns?: Array<{
    id?: string
    code?: string
    decision?: CaptureUnknownDecision
  }>
}

export async function getCaptureEvaluation(): Promise<CaptureEvaluationSnapshot> {
  if (!supabase) throw new Error('Backend is not configured.')

  const { data, error } = await supabase
    .from('events')
    .select('metadata, created_at')
    .eq('event_type', 'CAPTURE_REVIEW_RECORDED')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) throw error

  const reviews = (data ?? []).map(row => ({
    metadata: (row.metadata ?? {}) as ReviewMetadata,
    createdAt: row.created_at as string,
  }))

  const byKind = new Map<string, CaptureEvaluationByKind>()
  const correctionCounts = new Map<string, number>()
  const interpreterCounts = new Map<string, number>()

  let proposalCount = 0
  let approvedCount = 0
  let rejectedCount = 0
  let unreviewedCount = 0
  let heldNonActionableCount = 0
  let unknownCount = 0
  let unknownTrackedCount = 0
  let unknownDeferredCount = 0
  let unknownUnreviewedCount = 0

  for (const review of reviews) {
    const interpreter = review.metadata.interpreter || 'UNKNOWN_INTERPRETER'
    interpreterCounts.set(interpreter, (interpreterCounts.get(interpreter) ?? 0) + 1)

    for (const proposal of review.metadata.proposals ?? []) {
      const kind = proposal.kind || 'UNKNOWN_KIND'
      const decision = proposal.decision || 'UNREVIEWED'
      proposalCount += 1

      const bucket = byKind.get(kind) ?? {
        kind,
        proposed: 0,
        approved: 0,
        rejected: 0,
        unreviewed: 0,
        heldNonActionable: 0,
      }
      bucket.proposed += 1
      if (decision === 'APPROVE') { approvedCount += 1; bucket.approved += 1 }
      else if (decision === 'REJECT') { rejectedCount += 1; bucket.rejected += 1 }
      else if (decision === 'HELD_NON_ACTIONABLE') { heldNonActionableCount += 1; bucket.heldNonActionable += 1 }
      else { unreviewedCount += 1; bucket.unreviewed += 1 }
      byKind.set(kind, bucket)

      const note = proposal.rejection_note?.trim()
      if (decision === 'REJECT' && note) correctionCounts.set(note, (correctionCounts.get(note) ?? 0) + 1)
    }

    for (const unknown of review.metadata.unknowns ?? []) {
      unknownCount += 1
      const decision = unknown.decision || 'UNREVIEWED'
      if (decision === 'TRACK') unknownTrackedCount += 1
      else if (decision === 'DEFER') unknownDeferredCount += 1
      else unknownUnreviewedCount += 1
    }
  }

  return {
    reviewCount: reviews.length,
    proposalCount,
    approvedCount,
    rejectedCount,
    unreviewedCount,
    heldNonActionableCount,
    unknownCount,
    unknownTrackedCount,
    unknownDeferredCount,
    unknownUnreviewedCount,
    byKind: [...byKind.values()].sort((a, b) => b.proposed - a.proposed || a.kind.localeCompare(b.kind)),
    correctionPatterns: [...correctionCounts.entries()]
      .map(([note, count]) => ({ note, count }))
      .sort((a, b) => b.count - a.count || a.note.localeCompare(b.note))
      .slice(0, 8),
    interpreters: [...interpreterCounts.entries()]
      .map(([interpreter, reviewCount]) => ({ interpreter, reviews: reviewCount }))
      .sort((a, b) => b.reviews - a.reviews),
    lastReviewedAt: reviews[0]?.createdAt ?? null,
  }
}
