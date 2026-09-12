import type { CaptureInterpretation } from './captureIntelligence'

export type ProposalReviewDecision = 'UNREVIEWED' | 'APPROVE' | 'REJECT'
export type UnknownReviewDecision = 'UNREVIEWED' | 'TRACK' | 'DEFER'

export interface CaptureReviewMetadata {
  schema_version: 'capture_review_v0_1'
  interpreter: CaptureInterpretation['interpreter']
  proposals: Array<{
    id: string
    kind: string
    authority: string
    confidence: string
    decision: ProposalReviewDecision | 'HELD_NON_ACTIONABLE'
    rejection_note: string | null
  }>
  unknowns: Array<{
    id: string
    code: string
    decision_leverage: string
    decision: UnknownReviewDecision
  }>
  counts: {
    approved: number
    rejected: number
    unreviewed: number
    held_non_actionable: number
    unknown_tracked: number
    unknown_deferred: number
    unknown_unreviewed: number
  }
}

export function buildCaptureReviewMetadata(input: {
  interpretation: CaptureInterpretation
  proposalDecisions: Record<string, ProposalReviewDecision>
  unknownDecisions: Record<string, UnknownReviewDecision>
  rejectionNotes?: Record<string, string>
}): CaptureReviewMetadata {
  const proposals = input.interpretation.proposals.map(proposal => {
    const decision = proposal.kind === 'PAYMENT_REPORT'
      ? 'HELD_NON_ACTIONABLE' as const
      : input.proposalDecisions[proposal.id] ?? 'UNREVIEWED'
    return {
      id: proposal.id,
      kind: proposal.kind,
      authority: proposal.authority,
      confidence: proposal.confidence,
      decision,
      rejection_note: decision === 'REJECT' ? input.rejectionNotes?.[proposal.id]?.trim() || null : null,
    }
  })

  const unknowns = input.interpretation.unknowns.map(unknown => ({
    id: unknown.id,
    code: unknown.code,
    decision_leverage: unknown.decisionLeverage,
    decision: input.unknownDecisions[unknown.id] ?? 'UNREVIEWED',
  }))

  return {
    schema_version: 'capture_review_v0_1',
    interpreter: input.interpretation.interpreter,
    proposals,
    unknowns,
    counts: {
      approved: proposals.filter(row => row.decision === 'APPROVE').length,
      rejected: proposals.filter(row => row.decision === 'REJECT').length,
      unreviewed: proposals.filter(row => row.decision === 'UNREVIEWED').length,
      held_non_actionable: proposals.filter(row => row.decision === 'HELD_NON_ACTIONABLE').length,
      unknown_tracked: unknowns.filter(row => row.decision === 'TRACK').length,
      unknown_deferred: unknowns.filter(row => row.decision === 'DEFER').length,
      unknown_unreviewed: unknowns.filter(row => row.decision === 'UNREVIEWED').length,
    },
  }
}
