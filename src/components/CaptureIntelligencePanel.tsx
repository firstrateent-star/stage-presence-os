import { useMemo, useState } from 'react'
import { interpretCapture, type CaptureInterpretation, type CaptureProposal } from '../lib/captureIntelligence'
import { preserveExistingEngagementCapture } from '../lib/captureReality'
import { createAssignment, createScheduleItem, listTeamMemberOptions } from '../lib/operationsReality'
import { listCommitmentCandidates, saveResourceCommitment } from '../lib/resourceCommitments'

export function CaptureIntelligencePanel({
  engagementId,
  engagementName,
  eventDate,
  rawText,
  onApplied,
}: {
  engagementId: string
  engagementName: string
  eventDate: string | null
  rawText: string
  onApplied: () => void
}) {
  const [interpretation, setInterpretation] = useState<CaptureInterpretation | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const actionable = useMemo(() => interpretation?.proposals.filter(p => p.kind !== 'PAYMENT_REPORT') ?? [], [interpretation])

  async function analyze() {
    if (!rawText.trim()) return setMessage('Add a text update first.')
    setWorking(true)
    setMessage(null)
    try {
      const [teamMembers, resourceCandidates] = await Promise.all([
        listTeamMemberOptions(),
        listCommitmentCandidates(engagementId),
      ])
      const next = interpretCapture({ text: rawText, eventDate, teamMembers, resourceCandidates })
      setInterpretation(next)
      setSelected(new Set())
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to interpret this Capture.')
    } finally { setWorking(false) }
  }

  function toggle(id: string) {
    setSelected(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function preserveAndApply() {
    if (!rawText.trim()) return setMessage('Add a text update first.')
    setWorking(true)
    setMessage(null)
    try {
      const source = await preserveExistingEngagementCapture({ engagementId, rawText, mode: 'EVIDENCE' })
      const sourceArtifactId = source.textArtifactId
      const chosen = actionable.filter(proposal => selected.has(proposal.id))

      for (const proposal of chosen) {
        await applyProposal(proposal, engagementId, sourceArtifactId)
      }

      const heldPayment = interpretation?.proposals.some(p => p.kind === 'PAYMENT_REPORT') ?? false
      const suffix = heldPayment ? ' Reported payment was preserved as source evidence only and still requires external verification.' : ''
      setMessage(`${chosen.length ? `${chosen.length} approved change${chosen.length === 1 ? '' : 's'} applied.` : 'Source evidence preserved.'}${suffix}`)
      setSelected(new Set())
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
          <p className="mt-1 max-w-xl text-xs leading-5 text-zinc-600">Text is interpreted into proposals for {engagementName}. Nothing below becomes business truth until you explicitly approve it. The source is preserved first.</p>
        </div>
        <button type="button" disabled={working || !rawText.trim()} onClick={() => void analyze()} className="rounded-xl border border-sky-900 px-3 py-2 text-xs font-semibold text-sky-300 disabled:opacity-40">{working ? 'Working…' : 'Interpret update'}</button>
      </div>

      {interpretation && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-zinc-900 bg-zinc-950/50 px-3 py-2 text-[10px] leading-5 text-zinc-600">Interpreter: deterministic v0.1. This is intentionally replaceable intelligence; canonical Stage Presence reality remains outside the interpreter.</div>

          {interpretation.proposals.length ? interpretation.proposals.map(proposal => (
            <ProposalCard key={proposal.id} proposal={proposal} selected={selected.has(proposal.id)} onToggle={() => toggle(proposal.id)} />
          )) : <div className="rounded-xl border border-zinc-900 bg-zinc-950/40 p-3 text-xs leading-5 text-zinc-600">No governed operating command was recognized. You can still preserve this as evidence or use the manual structured Capture below.</div>}

          {interpretation.unknowns.length > 0 && (
            <div className="rounded-xl border border-amber-950/70 bg-amber-950/10 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-600">Unknown / unresolved</div>
              <ul className="mt-2 space-y-1 text-xs leading-5 text-amber-200/70">{interpretation.unknowns.map(item => <li key={item}>• {item}</li>)}</ul>
            </div>
          )}

          <button type="button" disabled={working} onClick={() => void preserveAndApply()} className="w-full rounded-xl bg-sky-500 px-4 py-3 text-sm font-bold text-zinc-950 disabled:opacity-50">
            {working ? 'Preserving…' : selected.size ? `Preserve source + apply ${selected.size} approved change${selected.size === 1 ? '' : 's'}` : 'Preserve source evidence only'}
          </button>
        </div>
      )}

      {message && <div className="mt-3 rounded-xl border border-zinc-900 bg-zinc-950/50 px-3 py-2 text-xs leading-5 text-zinc-500">{message}</div>}
    </section>
  )
}

function ProposalCard({ proposal, selected, onToggle }: { proposal: CaptureProposal; selected: boolean; onToggle: () => void }) {
  const payment = proposal.kind === 'PAYMENT_REPORT'
  return <div className={`rounded-xl border p-3 ${payment ? 'border-amber-950/60 bg-amber-950/10' : selected ? 'border-sky-800 bg-sky-950/20' : 'border-zinc-900 bg-zinc-950/55'}`}>
    <div className="flex items-start gap-3">
      {!payment && <input type="checkbox" checked={selected} onChange={onToggle} className="mt-1 h-4 w-4 accent-sky-500" />}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-medium text-zinc-200">{proposal.title}</div>
          <div className="flex gap-1"><Badge text={proposal.authority} /><Badge text={proposal.confidence} /></div>
        </div>
        <p className="mt-1 text-xs leading-5 text-zinc-600">{proposal.detail}</p>
        <div className="mt-2 text-[10px] text-zinc-700">Canonical route: {canonicalRoute(proposal)}{payment ? ' · preserve/report only in v0.1' : ' · requires explicit approval'}</div>
      </div>
    </div>
  </div>
}

async function applyProposal(proposal: CaptureProposal, engagementId: string, sourceArtifactId: string | null) {
  if (proposal.kind === 'CREW_CONFIRMATION') {
    return createAssignment({
      engagementId,
      teamMemberId: proposal.payload.teamMemberId,
      roleCode: proposal.payload.roleCode,
      assignmentState: proposal.payload.assignmentState,
      sourceArtifactId,
      captureSurface: 'capture_intelligence_v0_1',
    })
  }
  if (proposal.kind === 'SCHEDULE') {
    return createScheduleItem({
      engagementId,
      scheduleType: proposal.payload.scheduleType,
      label: proposal.payload.label,
      startAt: proposal.payload.startAt ? new Date(proposal.payload.startAt).toISOString() : null,
      startDate: proposal.payload.startDate,
      sourceArtifactId,
      captureSurface: 'capture_intelligence_v0_1',
    })
  }
  if (proposal.kind === 'RESOURCE_RESERVATION') {
    return saveResourceCommitment({
      engagementId,
      engagementResourceLinkId: proposal.payload.engagementResourceLinkId,
      commitmentType: proposal.payload.commitmentType,
      commitmentState: proposal.payload.commitmentState,
      sourceArtifactId,
      captureSurface: 'capture_intelligence_v0_1',
    })
  }
  return null
}

function canonicalRoute(proposal: CaptureProposal) {
  if (proposal.kind === 'CREW_CONFIRMATION') return 'engagement_assignments'
  if (proposal.kind === 'SCHEDULE') return 'engagement_schedule_items'
  if (proposal.kind === 'RESOURCE_RESERVATION') return 'resource_commitments'
  return 'commercial payment verification / Economy'
}

function Badge({ text }: { text: string }) { return <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-[9px] font-semibold text-zinc-600">{text.toLowerCase()}</span> }
