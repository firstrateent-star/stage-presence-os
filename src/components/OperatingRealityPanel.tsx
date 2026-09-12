import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  createAssignment,
  createScheduleItem,
  listEngagementAssignments,
  listEngagementSchedule,
  listTeamMemberOptions,
  type AssignmentRole,
  type AssignmentState,
  type EngagementAssignment,
  type EngagementScheduleItem,
  type ScheduleType,
  type TeamMemberOption,
} from '../lib/operationsReality'

export function OperatingRealityPanel({ engagementId, onChanged }: { engagementId: string; onChanged?: () => Promise<void> | void }) {
  const [schedule, setSchedule] = useState<EngagementScheduleItem[]>([])
  const [assignments, setAssignments] = useState<EngagementAssignment[]>([])
  const [members, setMembers] = useState<TeamMemberOption[]>([])
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [assignmentOpen, setAssignmentOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [nextSchedule, nextAssignments, nextMembers] = await Promise.all([
        listEngagementSchedule(engagementId),
        listEngagementAssignments(engagementId),
        listTeamMemberOptions(),
      ])
      setSchedule(nextSchedule)
      setAssignments(nextAssignments)
      setMembers(nextMembers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load operating reality.')
    } finally {
      setLoading(false)
    }
  }, [engagementId])

  useEffect(() => { void refresh() }, [refresh])

  const currentAssignments = useMemo(
    () => assignments.filter((item) => !['DECLINED', 'COMPLETED'].includes(item.assignment_state)),
    [assignments],
  )

  async function saveSchedule(formData: FormData) {
    const label = clean(formData.get('label'))
    const date = clean(formData.get('date'))
    if (!label || !date) return
    const startTime = clean(formData.get('start_time'))
    const endTime = clean(formData.get('end_time'))
    const startAt = startTime ? new Date(`${date}T${startTime}`).toISOString() : null
    const endAt = endTime ? new Date(`${date}T${endTime}`).toISOString() : null

    setSaving(true)
    setError(null)
    try {
      await createScheduleItem({
        engagementId,
        scheduleType: String(formData.get('schedule_type')) as ScheduleType,
        label,
        startDate: startAt ? null : date,
        endDate: startAt ? null : date,
        startAt,
        endAt,
        notes: clean(formData.get('notes')),
      })
      setScheduleOpen(false)
      await refresh()
      await Promise.resolve(onChanged?.())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add schedule item.')
    } finally {
      setSaving(false)
    }
  }

  async function saveAssignment(formData: FormData) {
    const teamMemberId = clean(formData.get('team_member_id'))
    if (!teamMemberId) return

    setSaving(true)
    setError(null)
    try {
      await createAssignment({
        engagementId,
        teamMemberId,
        roleCode: String(formData.get('role_code')) as AssignmentRole,
        roleLabel: clean(formData.get('role_label')),
        assignmentState: String(formData.get('assignment_state')) as AssignmentState,
        scopeSummary: clean(formData.get('scope_summary')),
        briefingNotes: clean(formData.get('briefing_notes')),
      })
      setAssignmentOpen(false)
      await refresh()
      await Promise.resolve(onChanged?.())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add assignment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/55 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold tracking-[0.18em] text-amber-500">OPERATING REALITY</div>
          <h2 className="mt-2 text-xl font-semibold text-zinc-100">When does it happen, and who carries it?</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-500">Schedule and crew live here as canonical operating truth. A planned person is not automatically confirmed, and a date without a known clock time remains valid.</p>
        </div>
        <div className="flex gap-2 text-xs text-zinc-600">
          <span>{schedule.length} schedule</span><span>•</span><span>{currentAssignments.length} active crew links</span>
        </div>
      </div>

      {error && <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</div>}

      {loading ? <div className="mt-5 text-sm text-zinc-600">Loading operating reality…</div> : (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <RealityCard title="Schedule" action="+ Add timing" onAction={() => setScheduleOpen(true)}>
            {schedule.length ? <div className="space-y-2">{schedule.map((item) => <ScheduleRow key={item.id} item={item} />)}</div> : <EmptyState text="No schedule evidence yet. Add only dates/times that are actually known." />}
          </RealityCard>

          <RealityCard title="Crew + responsibility" action="+ Add person" onAction={() => setAssignmentOpen(true)}>
            {currentAssignments.length ? <div className="space-y-2">{currentAssignments.map((item) => <AssignmentRow key={item.id} item={item} />)}</div> : <EmptyState text="No job-specific contributor assignments yet. The roster can exist without pretending anyone owns this Engagement." />}
          </RealityCard>
        </div>
      )}

      {scheduleOpen && <ScheduleModal saving={saving} onClose={() => setScheduleOpen(false)} onSave={saveSchedule} />}
      {assignmentOpen && <AssignmentModal members={members} saving={saving} onClose={() => setAssignmentOpen(false)} onSave={saveAssignment} />}
    </section>
  )
}

function ScheduleRow({ item }: { item: EngagementScheduleItem }) {
  const location = item.location?.name ?? item.location_name
  return <div className="rounded-xl border border-zinc-900 bg-zinc-950/70 p-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-sm font-medium text-zinc-200">{item.label}</div>
        <div className="mt-1 text-xs text-zinc-500">{formatSchedule(item)}{location ? ` • ${location}` : ''}</div>
      </div>
      <StatePill value={item.time_state} />
    </div>
    <div className="mt-2 text-[10px] font-semibold tracking-wide text-zinc-700">{item.schedule_type.replaceAll('_', ' ')}</div>
    {item.notes && <p className="mt-2 text-xs leading-5 text-zinc-500">{item.notes}</p>}
  </div>
}

function AssignmentRow({ item }: { item: EngagementAssignment }) {
  const name = item.member?.display_name ?? item.member?.username ?? 'Unknown contributor'
  return <div className="rounded-xl border border-zinc-900 bg-zinc-950/70 p-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-sm font-medium text-zinc-200">{name}</div>
        <div className="mt-1 text-xs text-zinc-500">{item.role_label || item.role_code.replaceAll('_', ' ')}</div>
      </div>
      <StatePill value={item.assignment_state} />
    </div>
    {item.scope_summary && <p className="mt-2 text-xs leading-5 text-zinc-500">{item.scope_summary}</p>}
  </div>
}

function RealityCard({ title, action, onAction, children }: { title: string; action: string; onAction: () => void; children: ReactNode }) {
  return <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-4">
    <div className="flex items-center justify-between"><div className="text-xs font-semibold tracking-[0.15em] text-zinc-600">{title.toUpperCase()}</div><button type="button" onClick={onAction} className="text-xs font-semibold text-amber-500 hover:text-amber-300">{action}</button></div>
    <div className="mt-3">{children}</div>
  </div>
}

function ScheduleModal({ saving, onClose, onSave }: { saving: boolean; onClose: () => void; onSave: (data: FormData) => Promise<void> }) {
  return <Modal title="Add schedule truth" onClose={onClose}>
    <form action={(data) => void onSave(data)} className="mt-5 grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <select name="schedule_type" defaultValue="EVENT" className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5"><option>EVENT</option><option>PREP</option><option>DELIVERY</option><option>LOAD_IN</option><option>SETUP</option><option>SHOW</option><option>STRIKE</option><option>LOAD_OUT</option><option>PICKUP</option><option>RETURN</option><option>TRAVEL</option><option>OTHER</option></select>
        <input name="date" type="date" required className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5" />
      </div>
      <input name="label" required placeholder="Load-in / Show / Pickup / Crew call…" className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5" />
      <div className="grid grid-cols-2 gap-3"><label className="text-xs text-zinc-500">Start time <span className="text-zinc-700">optional</span><input name="start_time" type="time" className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5" /></label><label className="text-xs text-zinc-500">End time <span className="text-zinc-700">optional</span><input name="end_time" type="time" className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5" /></label></div>
      <p className="text-xs leading-5 text-zinc-600">Leave the clock blank when only the date is known. The system will preserve that uncertainty rather than inventing a time.</p>
      <textarea name="notes" placeholder="Access, call-time context, timing source, or other useful notes" rows={3} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5" />
      <button disabled={saving} className="rounded-xl bg-amber-500 px-4 py-3 font-bold text-zinc-950 disabled:opacity-50">{saving ? 'Saving…' : 'Add schedule item'}</button>
    </form>
  </Modal>
}

function AssignmentModal({ members, saving, onClose, onSave }: { members: TeamMemberOption[]; saving: boolean; onClose: () => void; onSave: (data: FormData) => Promise<void> }) {
  return <Modal title="Add crew / responsibility" onClose={onClose}>
    <form action={(data) => void onSave(data)} className="mt-5 grid gap-3">
      <select name="team_member_id" required className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5"><option value="">Choose contributor…</option>{members.map((member) => <option key={member.id} value={member.id}>{memberLabel(member)}</option>)}</select>
      <div className="grid grid-cols-2 gap-3">
        <select name="role_code" defaultValue="OTHER" className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5"><option>PROJECT_MANAGER</option><option>VIDEO_TECH</option><option>LED_TECH</option><option>AUDIO_TECH</option><option>A1</option><option>A2</option><option>CAMERA</option><option>CONTENT</option><option>DRIVER</option><option>WAREHOUSE</option><option>LABOR</option><option>INSTALLER</option><option>SALES_LEAD</option><option>OTHER</option></select>
        <select name="assignment_state" defaultValue="POSSIBLE" className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5"><option value="POSSIBLE">Possible</option><option value="REQUESTED">Requested</option><option value="CONFIRMED">Confirmed</option></select>
      </div>
      <input name="role_label" placeholder="Optional specific role label" className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5" />
      <textarea name="scope_summary" placeholder="What is this person responsible for on this Engagement?" rows={3} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5" />
      <textarea name="briefing_notes" placeholder="Optional briefing notes" rows={2} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5" />
      <p className="text-xs leading-5 text-zinc-600">Possible means the scope points toward this person. Requested means they have been asked. Confirmed should only be used when the assignment is actually agreed.</p>
      <button disabled={saving} className="rounded-xl bg-amber-500 px-4 py-3 font-bold text-zinc-950 disabled:opacity-50">{saving ? 'Saving…' : 'Add assignment'}</button>
    </form>
  </Modal>
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-end bg-black/75 p-3 sm:items-center sm:justify-center"><div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-5"><div className="flex items-center justify-between"><h3 className="text-lg font-semibold text-zinc-100">{title}</h3><button type="button" onClick={onClose} className="text-sm text-zinc-500 hover:text-zinc-200">Close</button></div>{children}</div></div>
}

function EmptyState({ text }: { text: string }) { return <p className="py-3 text-sm leading-6 text-zinc-600">{text}</p> }
function StatePill({ value }: { value: string }) { return <span className="rounded-full border border-zinc-800 px-2 py-1 text-[10px] font-semibold tracking-wide text-zinc-500">{value.replaceAll('_', ' ')}</span> }
function clean(value: FormDataEntryValue | null) { const text = value == null ? '' : String(value).trim(); return text || null }
function memberLabel(member: TeamMemberOption) { const name = member.display_name || member.username; const capability = member.capabilities.map((item) => item.label || item.code.replaceAll('_', ' ')).slice(0, 2).join(', '); return [name, member.primary_role, capability].filter(Boolean).join(' — ') }
function formatSchedule(item: EngagementScheduleItem) {
  if (item.start_at) {
    const start = new Date(item.start_at)
    const startLabel = start.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    if (!item.end_at) return startLabel
    const end = new Date(item.end_at)
    return `${startLabel}–${end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
  }
  if (item.start_date) return new Date(`${item.start_date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  return 'Timing not set'
}
