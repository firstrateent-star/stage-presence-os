import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadOperationsCommandContext, type OperationsCommandContext } from '../lib/operationsCommandContext'
import { addPaymentTerm, advanceWarehouseState, assignCrewFromCommand, confirmCrewAssignment, confirmRequirementCandidate, confirmTentativeReservation, createTentativeHoldFromRequirement, setScheduleItemTiming, startWarehouseCycle } from '../lib/operationsCommands'
import type { AssignmentRole, PaymentTermType } from '../lib/commercialOperationsBridge'
import type { ReturnConditionState, WarehouseState } from '../lib/warehouseFulfillmentRuntime'

const roles: AssignmentRole[] = ['PROJECT_MANAGER','VIDEO_TECH','LED_TECH','AUDIO_TECH','A1','A2','CONTENT','WAREHOUSE','DRIVER','LABOR','INSTALLER','SALES_LEAD','OTHER']
const field = 'mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-600'

export function OperationsCommandPanel({ engagementId, onChanged }: { engagementId: string; onChanged?: () => Promise<void> | void }) {
  const [context, setContext] = useState<OperationsCommandContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try { setContext(await loadOperationsCommandContext(engagementId)); setError(null) }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load operating commands.') }
    finally { setLoading(false) }
  }, [engagementId])

  useEffect(() => { void refresh() }, [refresh])

  async function act(label: string, operation: () => Promise<unknown>) {
    setBusy(true); setError(null); setNotice(null)
    try {
      await operation()
      setNotice(label)
      await Promise.all([refresh(), Promise.resolve(onChanged?.())])
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to complete command.') }
    finally { setBusy(false) }
  }

  if (loading && !context) return <div className="py-6 text-sm text-zinc-600">Loading operating commands…</div>
  if (!context) return <div className="rounded-xl border border-red-900/60 p-4 text-sm text-red-300">{error || 'Command surface unavailable.'}</div>

  const committed = ['SIGNED','DEPOSIT_PENDING','CONFIRMED'].includes(context.commitmentState)
  const unresolvedRequirements = context.requirements.filter((row) => row.window_resolution_required || row.commitment_decision_required)
  const requestedCrew = context.assignments.filter((row) => row.assignment_state === 'REQUESTED')
  const tbdSchedule = context.schedule.filter((row) => ['TBD','UNKNOWN'].includes(row.time_state))
  const warehouseOpen = context.warehouse.filter((row) => !row.warehouse_cycle_complete)

  return <section className="rounded-2xl border border-amber-950/70 bg-amber-950/5 p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="text-[11px] font-semibold tracking-[0.18em] text-amber-500">OPERATIONS COMMANDS</div><h3 className="mt-1 text-lg font-semibold text-zinc-100">Move the job forward</h3><p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-600">Only commands supported by current job reality appear here. Each action writes through its domain runtime.</p></div>
      <span className="rounded-full border border-zinc-800 px-3 py-1 text-[10px] text-zinc-500">{committed ? 'Commercially committed' : 'Pre-commitment'}</span>
    </div>

    {error && <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</div>}
    {notice && <div className="mt-4 rounded-xl border border-emerald-900/60 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-300">{notice}</div>}

    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <EquipmentCommands context={context} rows={unresolvedRequirements} busy={busy} act={act} />
      <CrewCommands context={context} requested={requestedCrew} committed={committed} busy={busy} act={act} />
      <ScheduleCommands rows={tbdSchedule} busy={busy} act={act} />
      <WarehouseCommands rows={warehouseOpen} commitments={context.resourceCommitments} busy={busy} act={act} />
      <PaymentCommands acceptedDocumentId={context.acceptedDocumentId} busy={busy} act={act} />
      <QuickLinks />
    </div>
  </section>
}

function EquipmentCommands({ context, rows, busy, act }: { context: OperationsCommandContext; rows: OperationsCommandContext['requirements']; busy: boolean; act: CommandAct }) {
  const tentative = context.resourceCommitments.filter((row) => row.commitment_state === 'TENTATIVE')
  return <Box title="Equipment" hint="Requirement window → hold → confirmed reservation.">
    <div className="mt-3 space-y-2">
      {rows.map((row) => <div key={row.engagement_resource_id} className="rounded-xl border border-zinc-900 p-3"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-medium text-zinc-300">{row.resource_name}</div><div className="mt-1 text-xs text-zinc-600">{row.quantity ?? 'Qty ?'} • {row.requirement_runtime_state.replaceAll('_',' ')}</div>{row.candidate_from_date && <div className="mt-1 text-[11px] text-zinc-700">Candidate {row.candidate_from_date} → {row.candidate_through_date} • {row.candidate_basis.replaceAll('_',' ')}</div>}</div>{row.window_resolution_required && row.candidate_from_date ? <button disabled={busy} onClick={() => void act(`Candidate window applied to ${row.resource_name}.`, () => confirmRequirementCandidate(row.engagement_resource_id))} className={smallButton}>Use candidate window</button> : row.commitment_decision_required && row.required_from_date ? <button disabled={busy} onClick={() => void act(`Hold placed for ${row.resource_name}.`, () => createTentativeHoldFromRequirement(row.engagement_resource_id))} className={smallButton}>Place hold</button> : null}</div></div>)}
      {tentative.map((row) => <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-900 p-3"><div><div className="text-sm text-zinc-300">{row.resource_name}</div><div className="text-xs text-zinc-600">Tentative • {row.from_date} → {row.through_date}</div></div><button disabled={busy} onClick={() => void act(`${row.resource_name} reservation confirmed.`, () => confirmTentativeReservation(row.id, true))} className={smallButton}>Confirm reservation</button></div>)}
      {!rows.length && !tentative.length && <Empty text="No unresolved equipment decisions." />}
    </div>
  </Box>
}

function CrewCommands({ context, requested, committed, busy, act }: { context: OperationsCommandContext; requested: OperationsCommandContext['assignments']; committed: boolean; busy: boolean; act: CommandAct }) {
  async function submit(data: FormData) {
    const teamMemberId = String(data.get('team_member_id') || '')
    if (!teamMemberId) return
    await act('Crew assignment created.', () => assignCrewFromCommand({ engagementId: context.engagementId, teamMemberId, roleCode: String(data.get('role_code')) as AssignmentRole, scheduledStart: localIso(data.get('start')), scheduledEnd: localIso(data.get('end')), confirmNow: committed && data.get('confirm_now') === 'on' }))
  }
  return <Box title="Crew" hint="Request or confirm the people responsible for delivery.">
    <div className="mt-3 space-y-2">{requested.map((row) => <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-900 p-3"><div><div className="text-sm text-zinc-300">{row.display_name || row.username}</div><div className="text-xs text-zinc-600">{(row.role_label || row.role_code).replaceAll('_',' ')} • requested</div></div><button disabled={busy || !committed} onClick={() => void act('Crew assignment confirmed.', () => confirmCrewAssignment(row.id))} className={smallButton}>Confirm</button></div>)}</div>
    <form action={(data) => void submit(data)} className="mt-3 grid gap-2 sm:grid-cols-2">
      <label className="text-xs text-zinc-500">Person<select name="team_member_id" className={field} defaultValue=""><option value="" disabled>Choose person</option>{context.teamMembers.map((row) => <option key={row.id} value={row.id}>{row.display_name || row.username}</option>)}</select></label>
      <label className="text-xs text-zinc-500">Role<select name="role_code" className={field}>{roles.map((role) => <option key={role}>{role.replaceAll('_',' ')}</option>)}</select></label>
      <label className="text-xs text-zinc-500">Start<input name="start" type="datetime-local" className={field} /></label><label className="text-xs text-zinc-500">End<input name="end" type="datetime-local" className={field} /></label>
      {committed && <label className="sm:col-span-2 flex items-center gap-2 text-xs text-zinc-500"><input name="confirm_now" type="checkbox" />Confirm now instead of requesting</label>}
      <button disabled={busy} className="sm:col-span-2 rounded-xl border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-200">Add crew</button>
    </form>
  </Box>
}

function ScheduleCommands({ rows, busy, act }: { rows: OperationsCommandContext['schedule']; busy: boolean; act: CommandAct }) {
  const [selected, setSelected] = useState(rows[0]?.id ?? '')
  useEffect(() => { if (!rows.some((row) => row.id === selected)) setSelected(rows[0]?.id ?? '') }, [rows, selected])
  async function submit(data: FormData) {
    if (!selected) return
    await act('Schedule timing recorded.', () => setScheduleItemTiming({ scheduleItemId: selected, startAt: localIso(data.get('start')), endAt: localIso(data.get('end')), timeState: data.get('verified') === 'on' ? 'VERIFIED' : 'KNOWN' }))
  }
  return <Box title="Schedule" hint="Turn legitimate TBDs into known operating times.">{rows.length ? <form action={(data) => void submit(data)} className="mt-3 grid gap-2 sm:grid-cols-2"><label className="text-xs text-zinc-500 sm:col-span-2">Item<select value={selected} onChange={(e) => setSelected(e.target.value)} className={field}>{rows.map((row) => <option key={row.id} value={row.id}>{row.schedule_type.replaceAll('_',' ')} — {row.label}</option>)}</select></label><label className="text-xs text-zinc-500">Start<input name="start" type="datetime-local" className={field} /></label><label className="text-xs text-zinc-500">End<input name="end" type="datetime-local" className={field} /></label><label className="sm:col-span-2 flex items-center gap-2 text-xs text-zinc-500"><input name="verified" type="checkbox" />This time is verified, not merely known</label><button disabled={busy} className="sm:col-span-2 rounded-xl border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-200">Set timing</button></form> : <div className="mt-3"><Empty text="No TBD/unknown schedule items." /></div>}</Box>
}

function WarehouseCommands({ rows, commitments, busy, act }: { rows: OperationsCommandContext['warehouse']; commitments: OperationsCommandContext['resourceCommitments']; busy: boolean; act: CommandAct }) {
  const initialized = new Set(rows.map((row) => row.resource_commitment_id))
  const ready = commitments.filter((row) => row.commitment_state === 'CONFIRMED' && !initialized.has(row.id))
  return <Box title="Warehouse" hint="Pull → load → out → return → inspect → restock."><div className="mt-3 space-y-2">{ready.map((row) => <CommandRow key={row.id} title={row.resource_name} detail="Confirmed reservation • warehouse cycle not started" action="Start pull" disabled={busy} onClick={() => void act(`Warehouse cycle started for ${row.resource_name}.`, () => startWarehouseCycle(row.id))} />)}{rows.map((row) => <WarehouseRow key={row.resource_commitment_id} row={row} busy={busy} act={act} />)}{!ready.length && !rows.length && <Empty text="No confirmed Resource commitments ready for warehouse action." />}</div></Box>
}

function WarehouseRow({ row, busy, act }: { row: OperationsCommandContext['warehouse'][number]; busy: boolean; act: CommandAct }) {
  const next = nextWarehouse(row.fulfillment_state)
  if (!next) return <CommandRow title={row.resource_name} detail={row.fulfillment_state.replaceAll('_',' ')} action="Complete" disabled />
  const condition: ReturnConditionState | undefined = next === 'INSPECTED' ? 'OK' : undefined
  return <CommandRow title={row.resource_name} detail={`${row.fulfillment_state.replaceAll('_',' ')} • ${row.custody_state.replaceAll('_',' ')}`} action={warehouseLabel(next)} disabled={busy} onClick={() => void act(`${row.resource_name}: ${warehouseLabel(next)}.`, () => advanceWarehouseState({ resourceCommitmentId: row.resource_commitment_id, nextState: next, returnConditionState: condition }))} />
}

function PaymentCommands({ acceptedDocumentId, busy, act }: { acceptedDocumentId: string | null; busy: boolean; act: CommandAct }) {
  async function submit(data: FormData) {
    if (!acceptedDocumentId) return
    const amountText = String(data.get('amount') || '').trim(); const percentageText = String(data.get('percentage') || '').trim()
    await act('Payment term added.', () => addPaymentTerm({ commercialDocumentId: acceptedDocumentId, termType: String(data.get('term_type')) as PaymentTermType, amount: amountText ? Number(amountText) : undefined, percentage: percentageText ? Number(percentageText) : undefined, dueDate: clean(data.get('due_date')) ?? undefined, dueTrigger: clean(data.get('due_trigger')) ?? undefined }))
  }
  return <Box title="Payment structure" hint="Structure what is due; Cash remains a separate actual.">{acceptedDocumentId ? <form action={(data) => void submit(data)} className="mt-3 grid gap-2 sm:grid-cols-2"><label className="text-xs text-zinc-500">Term<select name="term_type" className={field}><option>DEPOSIT</option><option>INSTALLMENT</option><option>FINAL</option><option>BALANCE</option><option>OTHER</option></select></label><label className="text-xs text-zinc-500">Amount<input name="amount" type="number" min="0" step="0.01" className={field} /></label><label className="text-xs text-zinc-500">Percentage<input name="percentage" type="number" min="0" max="100" step="0.1" className={field} /></label><label className="text-xs text-zinc-500">Due date<input name="due_date" type="date" className={field} /></label><label className="text-xs text-zinc-500 sm:col-span-2">Or due trigger<input name="due_trigger" placeholder="e.g. 7 days before event" className={field} /></label><button disabled={busy} className="sm:col-span-2 rounded-xl border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-200">Add payment term</button></form> : <div className="mt-3"><Empty text="No accepted commercial document is available for payment terms." /></div>}</Box>
}

function QuickLinks() { return <Box title="After delivery" hint="Actuals and learning remain separate from the plan."><div className="mt-3 grid gap-2"><button onClick={() => scroll('job-actuals')} className={linkButton}>Record what actually happened</button><button onClick={() => scroll('job-closeout')} className={linkButton}>Review closeout + learning</button></div></Box> }

function Box({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) { return <section className="rounded-xl border border-zinc-900 bg-black/15 p-4"><div className="text-sm font-semibold text-zinc-200">{title}</div><div className="mt-1 text-xs leading-5 text-zinc-600">{hint}</div>{children}</section> }
function CommandRow({ title, detail, action, disabled, onClick }: { title: string; detail: string; action: string; disabled?: boolean; onClick?: () => void }) { return <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-900 p-3"><div><div className="text-sm text-zinc-300">{title}</div><div className="mt-1 text-xs text-zinc-600">{detail}</div></div><button disabled={disabled} onClick={onClick} className={smallButton}>{action}</button></div> }
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-zinc-900 px-3 py-4 text-sm text-zinc-700">{text}</div> }
function nextWarehouse(state: WarehouseState): WarehouseState | null { if (state === 'AWAITING_PULL') return 'PULLED'; if (state === 'PULLED') return 'LOADED'; if (state === 'LOADED') return 'OUT'; if (state === 'OUT') return 'RETURNED'; if (state === 'RETURNED' || state === 'INSPECTION_REQUIRED') return 'INSPECTED'; if (state === 'INSPECTED') return 'RESTOCKED'; return null }
function warehouseLabel(state: WarehouseState) { const labels: Partial<Record<WarehouseState,string>> = { PULLED:'Mark pulled', LOADED:'Mark loaded', OUT:'Send out', RETURNED:'Record return', INSPECTED:'Inspect OK', RESTOCKED:'Restock' }; return labels[state] ?? state.replaceAll('_',' ') }
function localIso(value: FormDataEntryValue | null) { const text = clean(value); return text ? new Date(text).toISOString() : null }
function clean(value: FormDataEntryValue | null) { const text = value == null ? '' : String(value).trim(); return text || null }
function scroll(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
type CommandAct = (label: string, operation: () => Promise<unknown>) => Promise<void>
const smallButton = 'shrink-0 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:border-amber-700 hover:text-amber-300 disabled:opacity-40'
const linkButton = 'rounded-xl border border-zinc-800 px-3 py-2.5 text-left text-sm text-zinc-300 hover:border-amber-800 hover:text-amber-300'
