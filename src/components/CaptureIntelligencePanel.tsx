import { useMemo, useState } from 'react'
import { interpretCapture, type CaptureInterpretation, type CaptureProposal, type CaptureUnknown } from '../lib/captureIntelligence'
import { preserveExistingEngagementCapture, routeCapturedUnknown } from '../lib/captureReality'
import { buildCaptureReviewMetadata, type ProposalReviewDecision, type UnknownReviewDecision } from '../lib/captureReviewModel'
import { recordCaptureReview } from '../lib/captureReviewTrace'
import { createAssignment, createScheduleItem, listTeamMemberOptions } from '../lib/operationsReality'
import { listCommitmentCandidates, saveResourceCommitment } from '../lib/resourceCommitments'

export function CaptureIntelligencePanel({ engagementId, engagementName, eventDate, rawText, onApplied }: {
  engagementId: string
  engagementName: string
  eventDate: string | null
  rawText: string
  onApplied: () => void
}) {
  const [interpretation, setInterpretation] = useState<CaptureInterpretation | null>(null)
  const [proposalDecisions, setProposalDecisions] = useState<Record<string, ProposalReviewDecision>>({})
  const [unknownDecisions, setUnknownDecisions] = useState<Record<string, UnknownReviewDecision>>({})
  const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>({})
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const actionable = useMemo(() => interpretation?.proposals.filter(p => p.kind !== 'PAYMENT_REPORT') ?? [], [interpretation])
  const approved = useMemo(() => actionable.filter(proposal => proposalDecisions[proposal.id] === 'APPROVE'), [actionable, proposalDecisions])
  const trackedUnknowns = useMemo(() => interpretation?.unknowns.filter(unknown => unknownDecisions[unknown.id] === 'TRACK') ?? [], [interpretation, unknownDecisions])

  async function analyze() {
    if (!rawText.trim()) return setMessage('Add a text update first.')
    setWorking(true)
    setMessage(null)
    try {
      const [teamMembers, resourceCandidates] = await Promise.all([listTeamMemberOptions(), listCommitmentCandidates(engagementId)])
      setInterpretation(interpretCapture({ text: rawText, eventDate, teamMembers, resourceCandidates }))
      setProposalDecisions({})
      setUnknownDecisions({})
      setRejectionNotes({})
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to interpret this Capture.')
    } finally { setWorking(false) }
  }

  async function preserveAndApply() {
    if (!rawText.trim() || !interpretation) return setMessage('Interpret a text update first.')
    setWorking(true)
    setMessage(null)
    try {
      const source = await preserveExistingEngagementCapture({ engagementId, rawText, mode: 'EVIDENCE' })
      const sourceArtifactId = source.textArtifactId
      if (!sourceArtifactId) throw new Error('The Capture source could not be preserved.')

      for (const proposal of approved) await applyProposal(proposal, engagementId, sourceArtifactId)
      for (const unknown of trackedUnknowns) {
        await routeCapturedUnknown({
          engagementId,
          label: unknown.label,
          detail: unknown.detail,
          category: unknown.category,
          sourceArtifactId,
          sourceCode: unknown.code,
          decisionLeverage: unknown.decisionLeverage,
        })
      }

      const metadata = buildCaptureReviewMetadata({ interpretation, proposalDecisions, unknownDecisions, rejectionNotes })
      let traceRecorded = true
      try {
        await recordCaptureReview({ engagementId, sourceArtifactId, metadata })
      } catch {
        traceRecorded = false
      }

      const heldPayment = interpretation.proposals.some(p => p.kind === 'PAYMENT_REPORT')
      const rejected = Object.values(proposalDecisions).filter(value => value === 'REJECT').length
      const deferred = Object.values(unknownDecisions).filter(value => value === 'DEFER').length
      const parts = [
        approved.length ? `${approved.length} approved change${approved.length === 1 ? '' : 's'} applied.` : 'Source evidence preserved.',
        trackedUnknowns.length ? `${trackedUnknowns.length} unresolved item${trackedUnknowns.length === 1 ? '' : 's'} tracked as UNKNOWN.` : '',
        rejected ? `${rejected} proposal${rejected === 1 ? '' : 's'} explicitly rejected for learning evidence.` : '',
        deferred ? `${deferred} unknown${deferred === 1 ? '' : 's'} explicitly deferred.` : '',
        heldPayment ? 'Reported payment remains source evidence only until external verification.' : '',
        traceRecorded ? 'Review trace recorded.' : 'Business changes were saved, but the learning trace could not be recorded.',
      ].filter(Boolean)
      setMessage(parts.join(' '))
      setProposalDecisions({})
      setUnknownDecisions({})
      setRejectionNotes({})
      onApplied()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to preserve or apply this Capture.')
    } finally { setWorking(false) }
  }

  return (
    <section className="mt-5 rounded-2xl border border-sky-950/70 bg-sky-950/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-500">Capture Intelligence v0.1</div>
          <div className="mt-1 text-sm font-semibold text-zinc-200">Interpret before asserting</div>
          <p className="mt-1 max-w-xl text-xs leading-5 text-zinc-600">Text is interpreted into proposals for {engagementName}. Review is explicit: approve, reject, track, defer, or leave unreviewed. Canonical truth changes only after approval.</p>
        </div>
        <button type="button" disabled={working || !rawText.trim()} onClick={() => void analyze()} className="rounded-xl border border-sky-900 px-3 py-2 text-xs font-semibold text-sky-300 disabled:opacity-40">{working ? 'Working…' : 'Interpret update'}</button>
      </div>

      {interpretation && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-zinc-900 bg-zinc-950/50 px-3 py-2 text-[10px] leading-5 text-zinc-600">Interpreter: deterministic v0.1. Review decisions are learning evidence, not business truth. Unreviewed is intentionally different from rejected.</div>

          {interpretation.proposals.length ? interpretation.proposals.map(proposal => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              decision={proposalDecisions[proposal.id] ?? 'UNREVIEWED'}
              rejectionNote={rejectionNotes[proposal.id] ?? ''}
              onDecision={(decision) => setProposalDecisions(current => ({ ...current, [proposal.id]: decision }))}
              onRejectionNote={(note) => setRejectionNotes(current => ({ ...current, [proposal.id]: note }))}
            />
          )) : <div className="rounded-xl border border-zinc-900 bg-zinc-950/40 p-3 text-xs leading-5 text-zinc-600">No governed operating command was recognized. You can still preserve this as evidence or use the manual structured Capture below.</div>}

          {interpretation.unknowns.length > 0 && (
            <div className="rounded-xl border border-amber-950/70 bg-amber-950/10 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-600">Unknown / unresolved</div>
              <p className="mt-1 text-[10px] leading-4 text-amber-200/45">Track writes an UNKNOWN Engagement Fact. Defer records the human decision without creating Work, urgency, ownership or a deadline.</p>
              <div className="mt-3 space-y-2">{interpretation.unknowns.map(item => (
                <UnknownCard key={item.id} unknown={item} decision={unknownDecisions[item.id] ?? 'UNREVIEWED'} onDecision={(decision) => setUnknownDecisions(current => ({ ...current, [item.id]: decision }))} />
              ))}</div>
            </div>
          )}

          <button type="button" disabled={working} onClick={() => void preserveAndApply()} className="w-full rounded-xl bg-sky-500 px-4 py-3 text-sm font-bold text-zinc-950 disabled:opacity-50">
            {working ? 'Preserving…' : actionLabel(approved.length, trackedUnknowns.length)}
          </button>
        </div>
      )}

      {message && <div className="mt-3 rounded-xl border border-zinc-900 bg-zinc-950/50 px-3 py-2 text-xs leading-5 text-zinc-500">{message}</div>}
    </section>
  )
}

function ProposalCard({ proposal, decision, rejectionNote, onDecision, onRejectionNote }: {
  proposal: CaptureProposal
  decision: ProposalReviewDecision
  rejectionNote: string
  onDecision: (decision: ProposalReviewDecision) => void
  onRejectionNote: (note: string) => void
}) {
  const payment = proposal.kind === 'PAYMENT_REPORT'
  const selectedClass = decision === 'APPROVE' ? 'border-sky-800 bg-sky-950/20' : decision === 'REJECT' ? 'border-rose-950/70 bg-rose-950/10' : 'border-zinc-900 bg-zinc-950/55'
  return <div className={`rounded-xl border p-3 ${payment ? 'border-amber-950/60 bg-amber-950/10' : selectedClass}`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="text-sm font-medium text-zinc-200">{proposal.title}</div>
      <div className="flex gap-1"><Badge text={proposal.authority} /><Badge text={proposal.confidence} /></div>
    </div>
    <p className="mt-1 text-xs leading-5 text-zinc-600">{proposal.detail}</p>
    <div className="mt-2 text-[10px] text-zinc-700">Canonical route: {canonicalRoute(proposal)}{payment ? ' · held non-actionable in v0.1' : ' · explicit review required'}</div>
    {!payment && <div className="mt-3 flex gap-2">
      <DecisionButton active={decision === 'APPROVE'} onClick={() => onDecision(decision === 'APPROVE' ? 'UNREVIEWED' : 'APPROVE')} label="Approve" />
      <DecisionButton active={decision === 'REJECT'} onClick={() => onDecision(decision === 'REJECT' ? 'UNREVIEWED' : 'REJECT')} label="Reject" tone="reject" />
    </div>}
    {decision === 'REJECT' && <input value={rejectionNote} onChange={(event) => onRejectionNote(event.target.value)} placeholder="Optional correction / why this proposal is wrong" className="mt-3 w-full rounded-lg border border-rose-950/60 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 outline-none placeholder:text-zinc-700" />}
  </div>
}

function UnknownCard({ unknown, decision, onDecision }: { unknown: CaptureUnknown; decision: UnknownReviewDecision; onDecision: (decision: UnknownReviewDecision) => void }) {
  return <div className={`rounded-xl border p-3 ${decision === 'TRACK' ? 'border-amber-800 bg-amber-950/25' : decision === 'DEFER' ? 'border-zinc-800 bg-zinc-950/60' : 'border-amber-950/50 bg-zinc-950/35'}`}>
    <div className="flex flex-wrap items-center justify-between gap-2"><div className="text-xs font-medium text-amber-200/85">{unknown.label}</div><Badge text={`${unknown.decisionLeverage} leverage`} /></div>
    <div className="mt-1 text-xs leading-5 text-amber-200/55">{unknown.detail}</div>
    <div className="mt-1 text-[10px] text-zinc-700">Canonical route when tracked: engagement_facts · UNKNOWN</div>
    <div className="mt-3 flex gap-2">
      <DecisionButton active={decision === 'TRACK'} onClick={() => onDecision(decision === 'TRACK' ? 'UNREVIEWED' : 'TRACK')} label="Track unknown" tone="track" />
      <DecisionButton active={decision === 'DEFER'} onClick={() => onDecision(decision === 'DEFER' ? 'UNREVIEWED' : 'DEFER')} label="Defer" />
    </div>
  </div>
}

async function applyProposal(proposal: CaptureProposal, engagementId: string, sourceArtifactId: string | null) {
  if (proposal.kind === 'CREW_CONFIRMATION') return createAssignment({ engagementId, teamMemberId: proposal.payload.teamMemberId, roleCode: proposal.payload.roleCode, assignmentState: proposal.payload.assignmentState, sourceArtifactId, captureSurface: 'capture_intelligence_v0_1' })
  if (proposal.kind === 'SCHEDULE') return createScheduleItem({ engagementId, scheduleType: proposal.payload.scheduleType, label: proposal.payload.label, startAt: proposal.payload.startAt ? new Date(proposal.payload.startAt).toISOString() : null, startDate: proposal.payload.startDate, sourceArtifactId, captureSurface: 'capture_intelligence_v0_1' })
  if (proposal.kind === 'RESOURCE_RESERVATION') return saveResourceCommitment({ engagementId, engagementResourceLinkId: proposal.payload.engagementResourceLinkId, commitmentType: proposal.payload.commitmentType, commitmentState: proposal.payload.commitmentState, sourceArtifactId, captureSurface: 'capture_intelligence_v0_1' })
  return null
}

function canonicalRoute(proposal: CaptureProposal) {
  if (proposal.kind === 'CREW_CONFIRMATION') return 'engagement_assignments'
  if (proposal.kind === 'SCHEDULE') return 'engagement_schedule_items'
  if (proposal.kind === 'RESOURCE_RESERVATION') return 'resource_commitments'
  return 'commercial payment verification / Economy'
}

function actionLabel(changes: number, unknowns: number) {
  if (!changes && !unknowns) return 'Preserve source + record review'
  const parts = [changes ? `${changes} approved change${changes === 1 ? '' : 's'}` : '', unknowns ? `${unknowns} tracked unknown${unknowns === 1 ? '' : 's'}` : ''].filter(Boolean)
  return `Preserve source + apply ${parts.join(' + ')}`
}

function DecisionButton({ active, onClick, label, tone = 'neutral' }: { active: boolean; onClick: () => void; label: string; tone?: 'neutral' | 'reject' | 'track' }) {
  const activeClass = tone === 'reject' ? 'border-rose-800 bg-rose-950/30 text-rose-300' : tone === 'track' ? 'border-amber-700 bg-amber-950/30 text-amber-300' : 'border-sky-800 bg-sky-950/30 text-sky-300'
  return <button type="button" onClick={onClick} className={`rounded-lg border px-3 py-1.5 text-[10px] font-semibold ${active ? activeClass : 'border-zinc-800 text-zinc-600 hover:text-zinc-300'}`}>{label}</button>
}

function Badge({ text }: { text: string }) { return <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-[9px] font-semibold text-zinc-600">{text.toLowerCase()}</span> }
