import { useMemo, useState } from 'react'
import { interpretCapture, type CaptureInterpretation, type CaptureProposal, type CaptureUnknown } from '../lib/captureIntelligence'
import { preserveExistingEngagementCapture, routeCapturedUnknown } from '../lib/captureReality'
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
  const [selectedUnknowns, setSelectedUnknowns] = useState<Set<string>>(new Set())
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
      setSelectedUnknowns(new Set())
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to interpret this Capture.')
    } finally { setWorking(false) }
  }

  function toggle(id: string, target: 'proposal' | 'unknown') {
    const setter = target === 'proposal' ? setSelected : setSelectedUnknowns
    setter(current => {
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
      const unknownsToTrack = interpretation?.unknowns.filter(unknown => selectedUnknowns.has(unknown.id)) ?? []

      for (const proposal of chosen) await applyProposal(proposal, engagementId, sourceArtifactId)
      for (const unknown of unknownsToTrack) {
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

      const heldPayment = interpretation?.proposals.some(p => p.kind === 'PAYMENT_REPORT') ?? false
      const parts = [
        chosen.length ? `${chosen.length} approved change${chosen.length === 1 ? '' : 's'} applied.` : 'Source evidence preserved.',
        unknownsToTrack.length ? `${unknownsToTrack.length} unresolved item${unknownsToTrack.length === 1 ? '' : 's'} tracked as UNKNOWN.` : '',
        heldPayment ? 'Reported payment remains source evidence only until external verification.' : '',
      ].filter(Boolean)
      setMessage(parts.join(' '))
      setSelected(new Set())
      setSelectedUnknowns(new Set())
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
            <ProposalCard key={proposal.id} proposal={proposal} selected={selected.has(proposal.id)} onToggle={() => toggle(proposal.id, 'proposal')} />
          )) : <div className="rounded-xl border border-zinc-900 bg-zinc-950/40 p-3 text-xs leading-5 text-zinc-600">No governed operating command was recognized. You can still preserve this as evidence or use the manual structured Capture below.</div>}

          {interpretation.unknowns.length > 0 && (
            <div className="rounded-xl border border-amber-950/70 bg-amber-950/10 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-600">Unknown / unresolved</div>
              <p className="mt-1 text-[10px] leading-4 text-amber-200/45">Tracking is optional. Selecting one writes an UNKNOWN Engagement Fact linked to this same source; it does not create Work or invent urgency.</p>
              <div className="mt-3 space-y-2">{interpretation.unknowns.map(item => <UnknownCard key={item.id} unknown={item} selected={selectedUnknowns.has(item.id)} onToggle={() => toggle(item.id, 'unknown')} />)}</div>
            </div>
          )}

          <button type="button" disabled={working} onClick={() => void preserveAndApply()} className="w-full rounded-xl bg-sky-500 px-4 py-3 text-sm font-bold text-zinc-950 disabled:opacity-50">
            {working ? 'Preserving…' : actionLabel(selected.size, selectedUnknowns.size)}
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

function UnknownCard({ unknown, selected, onToggle }: { unknown: CaptureUnknown; selected: boolean; onToggle: () => void }) {
  return <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${selected ? 'border-amber-800 bg-amber-950/25' : 'border-amber-950/50 bg-zinc-950/35'}`}>
    <input type="checkbox" checked={selected} onChange={onToggle} className="mt-1 h-4 w-4 accent-amber-500" />
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="text-xs font-medium text-amber-200/85">{unknown.label}</div><Badge text={`${unknown.decisionLeverage} leverage`} /></div>
      <div className="mt-1 text-xs leading-5 text-amber-200/55">{unknown.detail}</div>
      <div className="mt-1 text-[10px] text-zinc-700">Canonical route: engagement_facts · UNKNOWN</div>
    </div>
  </label>
}

async function applyProposal(proposal: CaptureProposal, engagementId: string, sourceArtifactId: string | null) {
  if (proposal.kind === 'CREW_CONFIRMATION') {
    return createAssignment({ engagementId, teamMemberId: proposal.payload.teamMemberId, roleCode: proposal.payload.roleCode, assignmentState: proposal.payload.assignmentState, sourceArtifactId, captureSurface: 'capture_intelligence_v0_1' })
  }
  if (proposal.kind === 'SCHEDULE') {
    return createScheduleItem({ engagementId, scheduleType: proposal.payload.scheduleType, label: proposal.payload.label, startAt: proposal.payload.startAt ? new Date(proposal.payload.startAt).toISOString() : null, startDate: proposal.payload.startDate, sourceArtifactId, captureSurface: 'capture_intelligence_v0_1' })
  }
  if (proposal.kind === 'RESOURCE_RESERVATION') {
    return saveResourceCommitment({ engagementId, engagementResourceLinkId: proposal.payload.engagementResourceLinkId, commitmentType: proposal.payload.commitmentType, commitmentState: proposal.payload.commitmentState, sourceArtifactId, captureSurface: 'capture_intelligence_v0_1' })
  }
  return null
}

function canonicalRoute(proposal: CaptureProposal) {
  if (proposal.kind === 'CREW_CONFIRMATION') return 'engagement_assignments'
  if (proposal.kind === 'SCHEDULE') return 'engagement_schedule_items'
  if (proposal.kind === 'RESOURCE_RESERVATION') return 'resource_commitments'
  return 'commercial payment verification / Economy'
}

function actionLabel(changes: number, unknowns: number) {
  if (!changes && !unknowns) return 'Preserve source evidence only'
  const parts = [changes ? `${changes} change${changes === 1 ? '' : 's'}` : '', unknowns ? `${unknowns} unknown${unknowns === 1 ? '' : 's'}` : ''].filter(Boolean)
  return `Preserve source + route ${parts.join(' + ')}`
}

function Badge({ text }: { text: string }) { return <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-[9px] font-semibold text-zinc-600">{text.toLowerCase()}</span> }
