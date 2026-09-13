import { useEffect, useMemo, useState } from 'react'
import { listCapacityPositions, type CapacityPosition } from '../lib/inventoryCapacityRuntime'
import { listMaintenanceActors, listMaintenanceQueue, openMaintenanceIssue, recordMaintenanceCost, resolveMaintenanceIssue, updateMaintenanceIssue, type MaintenanceIssue, type MaintenanceSeverity } from '../lib/maintenanceServiceRuntime'

type Actor = { id: string; display_name?: string; name?: string; organization_name?: string }

export function MaintenanceServicePanel({ onChanged }: { onChanged?: () => void | Promise<void> }) {
  const [issues, setIssues] = useState<MaintenanceIssue[]>([])
  const [resources, setResources] = useState<CapacityPosition[]>([])
  const [team, setTeam] = useState<Actor[]>([])
  const [vendors, setVendors] = useState<Actor[]>([])
  const [resourceId, setResourceId] = useState('')
  const [title, setTitle] = useState('')
  const [affected, setAffected] = useState('1')
  const [severity, setSeverity] = useState<MaintenanceSeverity>('MEDIUM')
  const [ownerId, setOwnerId] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      const [queue, capacity, actors] = await Promise.all([listMaintenanceQueue(), listCapacityPositions(), listMaintenanceActors()])
      setIssues(queue)
      setResources(capacity.filter((row) => row.verification_id))
      setTeam(actors.team as Actor[])
      setVendors(actors.vendors as Actor[])
      if (!resourceId && capacity.find((row) => row.verification_id)) setResourceId(capacity.find((row) => row.verification_id)!.resource_id)
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load maintenance.') }
  }
  useEffect(() => { void load() }, [])

  const selected = useMemo(() => resources.find((row) => row.resource_id === resourceId) ?? null, [resources, resourceId])
  const unavailable = Number(selected?.unavailable_quantity ?? 0)

  async function createIssue() {
    if (!selected) return
    setBusy(true); setError(null)
    try {
      await openMaintenanceIssue({
        resourceId: selected.resource_id, title, affectedQuantity: Number(affected), severity,
        sourceInventoryVerificationId: unavailable > 0 ? selected.verification_id : null,
        ownerTeamMemberId: ownerId || null, vendorPartyId: vendorId || null,
      })
      setTitle(''); setAffected('1'); setSeverity('MEDIUM'); setOwnerId(''); setVendorId('')
      await load(); await onChanged?.()
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to open service issue.') }
    finally { setBusy(false) }
  }

  return <section className="rounded-2xl border border-zinc-900 bg-zinc-950/45 p-5">
    <div className="border-b border-zinc-900 pb-5">
      <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-amber-500">Condition → work → restored capacity</div>
      <h2 className="mt-1 text-xl font-semibold text-zinc-100">Maintenance + service</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">Open equipment issues, assign responsibility, track vendor/repair cost, and explicitly return repaired quantity to service.</p>
    </div>

    {error && <div className="mt-4 rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</div>}

    <div className="mt-5 rounded-xl border border-zinc-900 bg-black/20 p-4">
      <div className="mb-3 text-sm font-semibold text-zinc-300">Open a service issue</div>
      <div className="grid gap-3 lg:grid-cols-6">
        <Field label="Resource"><select value={resourceId} onChange={(e)=>setResourceId(e.target.value)} className={inputClass}><option value="">Select verified Resource</option>{resources.map(r=><option key={r.resource_id} value={r.resource_id}>{r.resource_name}</option>)}</select></Field>
        <Field label="Affected qty"><input type="number" min="0.01" step="1" value={affected} onChange={(e)=>setAffected(e.target.value)} className={inputClass}/></Field>
        <Field label="Severity"><select value={severity} onChange={(e)=>setSeverity(e.target.value as MaintenanceSeverity)} className={inputClass}>{['LOW','MEDIUM','HIGH','CRITICAL'].map(x=><option key={x}>{x}</option>)}</select></Field>
        <Field label="Owner"><select value={ownerId} onChange={(e)=>setOwnerId(e.target.value)} className={inputClass}><option value="">Unassigned</option>{team.map(x=><option key={x.id} value={x.id}>{x.display_name}</option>)}</select></Field>
        <Field label="Vendor"><select value={vendorId} onChange={(e)=>setVendorId(e.target.value)} className={inputClass}><option value="">No vendor yet</option>{vendors.map(x=><option key={x.id} value={x.id}>{x.organization_name ?? x.name}</option>)}</select></Field>
        <div className="flex items-end"><button disabled={busy || !resourceId || !title.trim()} onClick={()=>void createIssue()} className="w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-zinc-950 disabled:opacity-40">Open issue</button></div>
      </div>
      <div className="mt-3"><Field label="What is wrong?"><input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Example: two panels have dead modules" className={inputClass}/></Field></div>
      {selected && <div className="mt-2 text-xs text-zinc-600">Current evidence: {selected.verified_quantity ?? '—'} verified · {selected.serviceable_quantity ?? '—'} serviceable · {unavailable} unavailable. {unavailable > 0 ? 'This issue can claim already-unavailable capacity.' : 'Opening an issue will create new lower-serviceable capacity evidence.'}</div>}
    </div>

    <div className="mt-5 space-y-3">
      {issues.filter(i=>!['RESOLVED','CANCELLED'].includes(i.status)).length === 0 ? <div className="rounded-xl border border-zinc-900 p-8 text-center text-sm text-zinc-600">No open maintenance issues.</div> : issues.filter(i=>!['RESOLVED','CANCELLED'].includes(i.status)).map(issue=><IssueCard key={issue.maintenance_issue_id} issue={issue} onReload={async()=>{await load(); await onChanged?.()}} onError={setError}/>) }
    </div>
  </section>
}

function IssueCard({ issue, onReload, onError }: { issue: MaintenanceIssue; onReload: ()=>Promise<void>; onError: (v:string|null)=>void }) {
  const [diagnosis,setDiagnosis]=useState(issue.diagnosis ?? '')
  const [cost,setCost]=useState('')
  const [resolution,setResolution]=useState('')
  const [busy,setBusy]=useState(false)
  async function act(fn:()=>Promise<unknown>) { setBusy(true); onError(null); try { await fn(); await onReload() } catch(err){onError(err instanceof Error?err.message:'Maintenance action failed.')} finally{setBusy(false)} }
  return <div className="rounded-xl border border-zinc-900 bg-black/20 p-4">
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="font-semibold text-zinc-200">{issue.resource_name} · {issue.title}</div><div className="mt-1 text-xs text-zinc-600">{issue.affected_quantity} affected · {issue.owner_name ?? 'unassigned'} · {issue.vendor_name ?? 'no vendor'} · est ${Number(issue.estimated_cost).toLocaleString()} · actual ${Number(issue.actual_cost).toLocaleString()}</div></div><span className="rounded-full border border-amber-900/60 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[.1em] text-amber-300">{issue.severity} · {issue.status}</span></div>
    <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
      <input value={diagnosis} onChange={e=>setDiagnosis(e.target.value)} placeholder="Diagnosis / repair note" className={inputClass}/>
      <button disabled={busy} onClick={()=>void act(()=>updateMaintenanceIssue({issueId:issue.maintenance_issue_id,status:'IN_REPAIR',diagnosis}))} className={secondaryButton}>Start / update repair</button>
      <button disabled={busy || !diagnosis.trim()} onClick={()=>void act(()=>updateMaintenanceIssue({issueId:issue.maintenance_issue_id,status:'READY_FOR_VERIFY',diagnosis}))} className={secondaryButton}>Ready to verify</button>
    </div>
    <div className="mt-3 grid gap-3 lg:grid-cols-[160px_auto_1fr_auto]">
      <input type="number" min="0" step="0.01" value={cost} onChange={e=>setCost(e.target.value)} placeholder="Repair $" className={inputClass}/>
      <button disabled={busy || cost===''} onClick={()=>void act(()=>recordMaintenanceCost({issueId:issue.maintenance_issue_id,state:'ESTIMATE',amount:Number(cost),description:`Estimated repair: ${issue.title}`}))} className={secondaryButton}>Add estimate</button>
      <input value={resolution} onChange={e=>setResolution(e.target.value)} placeholder="Resolution / what restored service" className={inputClass}/>
      <div className="flex gap-2"><button disabled={busy || cost===''} onClick={()=>void act(()=>recordMaintenanceCost({issueId:issue.maintenance_issue_id,state:'ACTUAL',amount:Number(cost),description:`Actual repair: ${issue.title}`}))} className={secondaryButton}>Record actual</button><button disabled={busy || !resolution.trim()} onClick={()=>void act(()=>resolveMaintenanceIssue({issueId:issue.maintenance_issue_id,resolution}))} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">Return to service</button></div>
    </div>
  </div>
}

const inputClass='w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 outline-none focus:border-amber-700'
const secondaryButton='rounded-xl border border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:border-zinc-700 disabled:opacity-40'
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[.12em] text-zinc-600">{label}</span>{children}</label>}
