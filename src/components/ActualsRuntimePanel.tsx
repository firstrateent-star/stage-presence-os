import { useMemo, useState } from 'react'
import { completeAssignmentFromActuals, recordActualCost, recordLaborActual, recordResourceUsageFromCommitment, type CostCategory, type LaborWorkType } from '../lib/actualsRuntime'
import { useJobWorkspace } from '../lib/useJobWorkspace'

const workTypes: LaborWorkType[] = ['WAREHOUSE','LOAD_IN','SETUP','SHOW','STRIKE','RETURN','DRIVE','INSTALL','PROGRAMMING','SERVICE','GENERAL','OTHER']
const costTypes: CostCategory[] = ['LABOR','SUBCONTRACT','EQUIPMENT_RENTAL','TRANSPORT','TRAVEL','FUEL','MATERIALS','PURCHASE','MAINTENANCE','PROCESSING_FEE','OTHER']
const field = 'mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-600'

export function ActualsRuntimePanel({ engagementId, onChanged }: { engagementId: string; onChanged?: () => Promise<void> | void }) {
  const workspace = useJobWorkspace(engagementId)
  const [assignmentId, setAssignmentId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const assignment = useMemo(() => workspace.model?.assignments.find((row) => row.assignment_id === assignmentId) ?? null, [workspace.model?.assignments, assignmentId])

  async function act(operation: () => Promise<unknown>) {
    setBusy(true); setError(null)
    try { await operation(); await Promise.all([workspace.refresh(), Promise.resolve(onChanged?.())]) }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to record actual reality.') }
    finally { setBusy(false) }
  }

  async function saveLabor(data: FormData) {
    const hours = Number(data.get('hours'))
    const teamMemberId = assignment?.team_member_id || String(data.get('team_member_id') || '')
    if (!teamMemberId || !Number.isFinite(hours) || hours <= 0) { setError('Choose who worked and enter actual hours.'); return }
    await act(() => recordLaborActual({ engagementId, teamMemberId, assignmentId: assignment?.assignment_id || null, workType: String(data.get('work_type') || 'GENERAL') as LaborWorkType, actualMinutes: Math.round(hours * 60), notes: clean(data.get('notes')) }))
  }

  async function saveCost(data: FormData) {
    const amount = Number(data.get('amount'))
    if (!Number.isFinite(amount) || amount < 0) { setError('Actual cost must be a non-negative amount.'); return }
    const plannedCostItemId = clean(data.get('planned_cost_item_id'))
    await act(() => recordActualCost({ engagementId, category: plannedCostItemId ? undefined : String(data.get('cost_category')) as CostCategory, description: clean(data.get('description')) || undefined, amount, incurredDate: clean(data.get('incurred_date')), plannedCostItemId, notes: clean(data.get('notes')) }))
  }

  if (workspace.loading && !workspace.model) return <p className="py-6 text-sm text-zinc-600">Loading actual reality…</p>
  if (workspace.error || !workspace.model) return <div className="rounded-xl border border-red-900/60 p-4 text-sm text-red-300">{workspace.error || 'Actuals Runtime unavailable.'}</div>

  const m = workspace.model
  const a = m.actuals
  const resources = m.resourceActuals.filter((row) => row.resource_commitment_id && ['CONFIRMED','FULFILLED'].includes(row.commitment_state ?? ''))

  return <div className="space-y-4">
    {error && <div className="rounded-xl border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</div>}

    <div className="grid gap-3 sm:grid-cols-4">
      <Stat label="State" value={(a?.actuals_state || 'NOT_STARTED').replaceAll('_',' ')} />
      <Stat label="Labor" value={`${a?.actual_labor_hours?.toFixed(1) ?? '0.0'} hr`} />
      <Stat label="Usage" value={`${a?.resource_usage_count ?? 0}/${a?.committed_resource_count ?? 0}`} />
      <Stat label="Actual cost" value={money(a?.actual_direct_cost)} />
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <Box title="Labor actual" hint="The assignment stays the plan. Record who actually worked and how long.">
        <form action={(data) => void saveLabor(data)} className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-zinc-500 sm:col-span-2">Assignment<select value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)} className={field}><option value="">Unplanned labor</option>{m.assignments.filter((row) => ['CONFIRMED','COMPLETED'].includes(row.assignment_state)).map((row) => <option key={row.assignment_id} value={row.assignment_id}>{row.display_name || row.username} — {(row.role_label || row.role_code).replaceAll('_',' ')}</option>)}</select></label>
          {!assignment && <label className="text-xs text-zinc-500">Person<select name="team_member_id" className={field} defaultValue=""><option value="" disabled>Choose person</option>{m.teamMembers.map((row) => <option key={row.id} value={row.id}>{row.display_name || row.username}</option>)}</select></label>}
          <label className="text-xs text-zinc-500">Work type<select name="work_type" className={field} defaultValue="GENERAL">{workTypes.map((type) => <option key={type}>{type.replaceAll('_',' ')}</option>)}</select></label>
          <label className="text-xs text-zinc-500">Actual hours<input name="hours" type="number" min="0.01" step="0.25" className={field} /></label>
          <label className="text-xs text-zinc-500 sm:col-span-2">Notes<input name="notes" className={field} /></label>
          <button disabled={busy} className="sm:col-span-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-zinc-950 disabled:opacity-50">Record labor</button>
        </form>
        <div className="mt-3 space-y-2">{m.laborActuals.map((row) => <div key={row.labor_actual_id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-900 px-3 py-2.5"><div><div className="text-sm text-zinc-300">{row.team_member_name}</div><div className="text-xs text-zinc-600">{row.work_type.replaceAll('_',' ')} • {row.actual_hours.toFixed(2)} hr</div></div>{row.engagement_assignment_id && row.assignment_state === 'CONFIRMED' && <button disabled={busy} onClick={() => void act(() => completeAssignmentFromActuals(row.engagement_assignment_id!))} className="text-xs text-amber-500">Complete assignment</button>}</div>)}{!m.laborActuals.length && <Empty text="No labor actuals yet." />}</div>
      </Box>

      <Box title="Resource actual" hint="Usage starts from the confirmed Resource commitment.">
        <div className="mt-3 space-y-2">{resources.map((row) => <div key={row.resource_commitment_id!} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-900 px-3 py-2.5"><div><div className="text-sm text-zinc-300">{row.resource_name}</div><div className="text-xs text-zinc-600">Committed {qty(row.committed_quantity)} • Actual {row.resource_usage_id ? qty(row.actual_quantity) : 'not captured'}</div></div>{row.resource_usage_id ? <span className="text-xs text-emerald-400">{row.usage_state}</span> : <button disabled={busy} onClick={() => void act(() => recordResourceUsageFromCommitment({ resourceCommitmentId: row.resource_commitment_id!, usageState: 'COMPLETE', quantity: row.committed_quantity }))} className="rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs font-semibold text-zinc-950">Used as committed</button>}</div>)}{!resources.length && <Empty text="No confirmed Resource commitments ready for actual usage." />}</div>
      </Box>
    </div>

    <Box title="Actual direct cost" hint="Actual cost is new truth. The estimate remains intact for variance.">
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <form action={(data) => void saveCost(data)} className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-zinc-500 sm:col-span-2">Plan cost link<select name="planned_cost_item_id" className={field} defaultValue=""><option value="">No exact plan link</option>{m.plannedCosts.map((row) => <option key={row.cost_item_id} value={row.cost_item_id}>{row.cost_state} • {row.description} • {money(row.amount)}</option>)}</select></label>
          <label className="text-xs text-zinc-500">Category<select name="cost_category" className={field} defaultValue="OTHER">{costTypes.map((type) => <option key={type}>{type.replaceAll('_',' ')}</option>)}</select></label>
          <label className="text-xs text-zinc-500">Amount<input name="amount" type="number" min="0" step="0.01" className={field} /></label>
          <label className="text-xs text-zinc-500">Date<input name="incurred_date" type="date" className={field} /></label>
          <label className="text-xs text-zinc-500">Description<input name="description" className={field} /></label>
          <label className="text-xs text-zinc-500 sm:col-span-2">Notes<input name="notes" className={field} /></label>
          <button disabled={busy} className="sm:col-span-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-200">Record actual cost</button>
        </form>
        <div className="space-y-2">{m.costVariance.map((row) => <div key={row.cost_category} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl border border-zinc-900 px-3 py-2.5 text-xs"><span className="text-zinc-300">{row.cost_category.replaceAll('_',' ')}</span><span className={row.actual_variance_to_plan != null && row.actual_variance_to_plan > 0 ? 'text-amber-400' : 'text-zinc-600'}>{money(row.current_plan_baseline)} → {money(row.actual_cost)} {row.actual_variance_to_plan == null ? '' : `(${row.actual_variance_to_plan > 0 ? '+' : ''}${money(row.actual_variance_to_plan)})`}</span></div>)}{!m.costVariance.length && <Empty text="No cost variance represented yet." />}</div>
      </div>
    </Box>
  </div>
}

function Box({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) { return <section className="rounded-xl border border-zinc-900 bg-black/15 p-4"><div className="text-sm font-semibold text-zinc-200">{title}</div><div className="mt-1 text-xs text-zinc-600">{hint}</div>{children}</section> }
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-zinc-900 p-3"><div className="text-[10px] tracking-[0.14em] text-zinc-700">{label.toUpperCase()}</div><div className="mt-1 text-sm font-semibold text-zinc-300">{value}</div></div> }
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-zinc-900 px-3 py-4 text-sm text-zinc-700">{text}</div> }
function clean(value: FormDataEntryValue | null) { const text = value == null ? '' : String(value).trim(); return text || null }
function money(value: number | null | undefined) { if (value == null) return '—'; return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value) }
function qty(value: number | null | undefined) { return value == null ? '—' : new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(value) }
