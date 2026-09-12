import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  loadEconomicActuals,
  recordAssignmentActualCost,
  recordResourceActualCost,
  type ActualLaborCandidate,
  type ActualResourceCostCandidate,
  type EconomicActualsModel,
} from '../lib/economicActuals'

export function EconomicActualsBridgePanel({ engagementId, onChanged }: { engagementId: string; onChanged?: () => Promise<void> | void }) {
  const [model, setModel] = useState<EconomicActualsModel>({ labor: [], resources: [] })
  const [laborTarget, setLaborTarget] = useState<ActualLaborCandidate | null>(null)
  const [resourceTarget, setResourceTarget] = useState<ActualResourceCostCandidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try { setModel(await loadEconomicActuals(engagementId)) }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to read economic actuals.') }
    finally { setLoading(false) }
  }, [engagementId])

  useEffect(() => { void refresh() }, [refresh])

  const unresolvedLabor = useMemo(() => model.labor.filter((item) => !item.completed_cost_id).length, [model.labor])
  const unresolvedExternal = useMemo(() => model.resources.filter((item) => !item.completed_cost_id && item.sourcing_model !== 'OWNED').length, [model.resources])

  async function saveLabor(formData: FormData) {
    if (!laborTarget) return
    const amount = number(formData.get('amount'))
    if (amount == null) return setError('Enter the known actual labor cost.')
    const hours = number(formData.get('hours'))
    const rate = number(formData.get('hourly_rate'))
    const rateProfile = laborTarget.rate_profile?.status === 'APPROVED' ? laborTarget.rate_profile : null
    setSaving(true); setError(null)
    try {
      await recordAssignmentActualCost({
        engagementId,
        assignmentId: laborTarget.assignment_id,
        teamMemberId: laborTarget.team_member_id,
        teamMemberName: laborTarget.team_member_name,
        amount,
        incurredDate: text(formData.get('incurred_date')),
        hours,
        hourlyRate: rate,
        approvedRateProfileId: rateProfile && rate === rateProfile.amount ? rateProfile.id : null,
        notes: text(formData.get('notes')),
      })
      setLaborTarget(null); await refresh(); await Promise.resolve(onChanged?.())
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to record labor cost.') }
    finally { setSaving(false) }
  }

  async function saveResource(formData: FormData) {
    if (!resourceTarget) return
    const amount = number(formData.get('amount'))
    if (amount == null) return setError('Enter the known direct cost.')
    setSaving(true); setError(null)
    try {
      await recordResourceActualCost({
        engagementId,
        usageId: resourceTarget.usage_id,
        resourceId: resourceTarget.resource_id,
        resourceName: resourceTarget.resource_name,
        category: String(formData.get('category') || 'OTHER'),
        amount,
        incurredDate: text(formData.get('incurred_date')),
        notes: text(formData.get('notes')),
      })
      setResourceTarget(null); await refresh(); await Promise.resolve(onChanged?.())
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to record resource cost.') }
    finally { setSaving(false) }
  }

  if (!loading && !model.labor.length && !model.resources.length) return null

  return <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/55 p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="text-xs font-semibold tracking-[0.18em] text-emerald-500">ECONOMIC ACTUALS</div>
        <h2 className="mt-2 text-xl font-semibold text-zinc-100">Did the actual delivery create a direct cost we can prove?</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-500">Completed work creates a cost question, not an automatic cost answer. Approved rates may support a calculation; draft rates remain context only.</p>
      </div>
      {!loading && <div className="text-xs text-zinc-600">{unresolvedLabor} labor gap · {unresolvedExternal} external-resource gap</div>}
    </div>

    {error && <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</div>}

    {loading ? <div className="mt-5 text-sm text-zinc-600">Reading actual-cost continuity…</div> : <div className="mt-5 grid gap-4 xl:grid-cols-2">
      <BridgeCard title="Completed crew" subtitle="Completion is operational truth. Labor cost remains separate economic evidence.">
        {model.labor.length ? <div className="space-y-2">{model.labor.map(item => <LaborRow key={item.assignment_id} item={item} onRecord={() => setLaborTarget(item)} />)}</div> : <Empty text="No completed crew assignments are represented yet." />}
      </BridgeCard>
      <BridgeCard title="Actually used resources" subtitle="External sourcing raises a stronger direct-cost question; owned usage does not imply a cash cost.">
        {model.resources.length ? <div className="space-y-2">{model.resources.map(item => <ResourceRow key={item.usage_id} item={item} onRecord={() => setResourceTarget(item)} />)}</div> : <Empty text="No actual resource usage is represented yet." />}
      </BridgeCard>
    </div>}

    {laborTarget && <LaborCostModal item={laborTarget} saving={saving} onClose={() => setLaborTarget(null)} onSave={saveLabor} />}
    {resourceTarget && <ResourceCostModal item={resourceTarget} saving={saving} onClose={() => setResourceTarget(null)} onSave={saveResource} />}
  </section>
}

function LaborRow({ item, onRecord }: { item: ActualLaborCandidate; onRecord: () => void }) {
  return <div className="rounded-xl border border-zinc-900 bg-zinc-950/70 p-3">
    <div className="flex items-start justify-between gap-3"><div><div className="text-sm font-medium text-zinc-200">{item.team_member_name}</div><div className="mt-1 text-xs text-zinc-600">{item.role_label || item.role_code.replaceAll('_', ' ')}</div></div>{item.completed_cost_id ? <Pill text={money(item.completed_cost_amount)} good /> : <Pill text="COST UNKNOWN" />}</div>
    {item.rate_profile && <div className={`mt-2 text-xs ${item.rate_profile.status === 'APPROVED' ? 'text-emerald-600' : 'text-amber-700'}`}>{item.rate_profile.status === 'APPROVED' ? 'Approved' : 'Draft only'}: {item.rate_profile.name} · {money(item.rate_profile.amount)}/{item.rate_profile.unit_basis.toLowerCase()}</div>}
    {!item.completed_cost_id && <div className="mt-2 flex justify-end"><button onClick={onRecord} className="text-xs font-semibold text-emerald-500 hover:text-emerald-300">Record known actual cost</button></div>}
  </div>
}

function ResourceRow({ item, onRecord }: { item: ActualResourceCostCandidate; onRecord: () => void }) {
  const owned = item.sourcing_model === 'OWNED'
  return <div className="rounded-xl border border-zinc-900 bg-zinc-950/70 p-3">
    <div className="flex items-start justify-between gap-3"><div><div className="text-sm font-medium text-zinc-200">{item.resource_name}</div><div className="mt-1 text-xs text-zinc-600">{item.sourcing_model} · {item.usage_state}{item.quantity != null ? ` · qty ${item.quantity}` : ''}</div></div>{item.completed_cost_id ? <Pill text={money(item.completed_cost_amount)} good /> : owned ? <Pill text="NO CASH COST IMPLIED" /> : <Pill text="COST UNRESOLVED" />}</div>
    {!item.completed_cost_id && <><p className="mt-2 text-xs leading-5 text-zinc-700">{owned ? 'Owned use can be economically important without being a direct job cash cost. Record a cost only when a real direct cost occurred.' : 'Actual external/unknown sourcing is represented, but no direct-cost amount is linked yet.'}</p><div className="mt-2 flex justify-end"><button onClick={onRecord} className="text-xs font-semibold text-emerald-500 hover:text-emerald-300">Record direct cost</button></div></>}
  </div>
}

function LaborCostModal({ item, saving, onClose, onSave }: { item: ActualLaborCandidate; saving: boolean; onClose: () => void; onSave: (data: FormData) => Promise<void> }) {
  const approved = item.rate_profile?.status === 'APPROVED' ? item.rate_profile : null
  return <Modal title={`Actual labor cost · ${item.team_member_name}`} onClose={onClose}><form action={(data) => void onSave(data)} className="mt-5 grid gap-3">
    <label className="text-xs text-zinc-500">Actual total cost<input required name="amount" type="number" min="0" step="0.01" className={inputClass} /></label>
    <div className="grid grid-cols-2 gap-3"><label className="text-xs text-zinc-500">Actual hours <span className="text-zinc-700">optional</span><input name="hours" type="number" min="0" step="0.25" className={inputClass} /></label><label className="text-xs text-zinc-500">Hourly rate used <span className="text-zinc-700">optional</span><input name="hourly_rate" type="number" min="0" step="0.01" defaultValue={approved?.amount ?? ''} className={inputClass} /></label></div>
    <label className="text-xs text-zinc-500">Incurred date <span className="text-zinc-700">optional</span><input name="incurred_date" type="date" className={inputClass} /></label>
    <textarea name="notes" rows={2} placeholder="Payroll/vendor/accounting evidence or useful context" className={inputClass} />
    {item.rate_profile && <p className={`text-xs leading-5 ${approved ? 'text-emerald-600' : 'text-amber-700'}`}>{approved ? `Approved rate available: ${money(approved.amount)}/${approved.unit_basis.toLowerCase()}.` : `A ${money(item.rate_profile.amount)}/${item.rate_profile.unit_basis.toLowerCase()} rate exists only as DRAFT. It is not prefilled or treated as authority.`}</p>}
    <button disabled={saving} className="rounded-xl bg-emerald-500 px-4 py-3 font-bold text-zinc-950 disabled:opacity-50">{saving ? 'Saving…' : 'Record actual labor cost'}</button>
  </form></Modal>
}

function ResourceCostModal({ item, saving, onClose, onSave }: { item: ActualResourceCostCandidate; saving: boolean; onClose: () => void; onSave: (data: FormData) => Promise<void> }) {
  const defaultCategory = item.sourcing_model === 'OWNED' ? 'OTHER' : 'EQUIPMENT_RENTAL'
  return <Modal title={`Direct cost · ${item.resource_name}`} onClose={onClose}><form action={(data) => void onSave(data)} className="mt-5 grid gap-3">
    <label className="text-xs text-zinc-500">Cost category<select name="category" defaultValue={defaultCategory} className={inputClass}><option value="EQUIPMENT_RENTAL">Equipment rental</option><option value="SUBCONTRACT">Subcontract</option><option value="TRANSPORT">Transport / delivery</option><option value="FUEL">Fuel</option><option value="MATERIALS">Materials</option><option value="PURCHASE">Purchase</option><option value="MAINTENANCE">Maintenance</option><option value="OTHER">Other</option></select></label>
    <label className="text-xs text-zinc-500">Actual direct cost<input required name="amount" type="number" min="0" step="0.01" className={inputClass} /></label>
    <label className="text-xs text-zinc-500">Incurred date <span className="text-zinc-700">optional</span><input name="incurred_date" type="date" className={inputClass} /></label>
    <textarea name="notes" rows={2} placeholder="Vendor/accounting evidence or useful context" className={inputClass} />
    <p className="text-xs leading-5 text-zinc-600">This records a direct Engagement cost linked to the actual resource. It does not create AP, pay a vendor, or change the resource's ownership economics.</p>
    <button disabled={saving} className="rounded-xl bg-emerald-500 px-4 py-3 font-bold text-zinc-950 disabled:opacity-50">{saving ? 'Saving…' : 'Record direct cost'}</button>
  </form></Modal>
}

const inputClass = 'mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-zinc-100'
function BridgeCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) { return <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-4"><div className="text-xs font-semibold tracking-[0.15em] text-zinc-600">{title.toUpperCase()}</div><p className="mt-1 text-xs leading-5 text-zinc-700">{subtitle}</p><div className="mt-3">{children}</div></div> }
function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-50 flex items-end bg-black/75 p-3 sm:items-center sm:justify-center"><div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-5"><div className="flex items-center justify-between"><h3 className="text-lg font-semibold text-zinc-100">{title}</h3><button type="button" onClick={onClose} className="text-sm text-zinc-500 hover:text-zinc-200">Close</button></div>{children}</div></div> }
function Pill({ text: value, good = false }: { text: string; good?: boolean }) { return <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${good ? 'border-emerald-950 text-emerald-500' : 'border-zinc-800 text-zinc-600'}`}>{value}</span> }
function Empty({ text: value }: { text: string }) { return <p className="py-3 text-sm leading-6 text-zinc-600">{value}</p> }
function text(value: FormDataEntryValue | null) { const out = value == null ? '' : String(value).trim(); return out || null }
function number(value: FormDataEntryValue | null) { if (value == null || String(value).trim() === '') return null; const out = Number(value); return Number.isFinite(out) && out >= 0 ? out : null }
function money(value: number | null) { return value == null ? 'unknown' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value) }
