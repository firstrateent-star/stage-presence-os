import { useEffect, useState } from 'react'
import { listAssetMeasurementPositions, type AssetMeasurementPosition } from '../lib/assetEconomicsRuntime'

const money=(n:number|null|undefined)=>n==null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n)
const num=(n:number|null|undefined)=>n==null?'—':new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(n)
const label=(s:string)=>s.replaceAll('_',' ').toLowerCase()

export function AssetEconomicsPanel(){
 const [rows,setRows]=useState<AssetMeasurementPosition[]>([]),[error,setError]=useState<string|null>(null),[open,setOpen]=useState<string|null>(null)
 useEffect(()=>{void listAssetMeasurementPositions().then(setRows).catch(e=>setError(e instanceof Error?e.message:'Unable to load asset measurements.'))},[])
 const measured=rows.filter(r=>r.measurement_state!=='INSUFFICIENT_EVIDENCE').length
 return <section className="rounded-2xl border border-zinc-900 bg-zinc-950/45 p-5">
  <div className="border-b border-zinc-900 pb-4"><div className="text-[10px] font-semibold uppercase tracking-[.16em] text-sky-500">Measurement system</div><h2 className="mt-1 text-xl font-semibold text-zinc-100">Asset economics + utilization</h2><p className="mt-2 text-sm leading-6 text-zinc-500">Measure usage, maintenance burden, and commercial support without making investment decisions before the evidence is mature.</p><div className="mt-3 text-xs text-zinc-600">Measurement active: {measured}/{rows.length}</div></div>
  {error&&<div className="mt-4 text-sm text-red-300">{error}</div>}
  <div className="mt-4 overflow-hidden rounded-xl border border-zinc-900">{rows.map(r=><div key={r.resource_id} className="border-b border-zinc-900 last:border-0">
   <button type="button" onClick={()=>setOpen(open===r.resource_id?null:r.resource_id)} className="grid w-full gap-3 p-4 text-left hover:bg-zinc-900/35 md:grid-cols-[1.5fr_.6fr_.75fr_.8fr]"><div><div className="font-medium text-zinc-200">{r.resource_name}</div><div className="mt-1 text-xs text-zinc-600">{label(r.measurement_state)}</div></div><Small k="Usage" v={num(r.usage_record_count)}/><Small k="Maintenance" v={money(r.maintenance_actual_cost)}/><Small k="Revenue supported" v={money(r.commercial_line_revenue_supported)}/></button>
   {open===r.resource_id&&<div className="grid gap-3 border-t border-zinc-900 bg-black/20 p-4 sm:grid-cols-2 lg:grid-cols-4"><Box k="Verified / serviceable" v={`${num(r.verified_quantity)} / ${num(r.serviceable_quantity)}`}/><Box k="Reservations" v={num(r.confirmed_reservation_count)}/><Box k="Reserved qty-days" v={num(r.reserved_quantity_days)}/><Box k="Usage hours" v={num(r.actual_usage_hours)}/><Box k="Issues / open" v={`${num(r.issue_count)} / ${num(r.open_issue_count)}`}/><Box k="Downtime days" v={num(r.observed_downtime_days)}/><Box k="Supported engagements" v={num(r.supported_engagement_count)}/><Box k="Contribution supported" v={r.contribution_supported_engagement_count?money(r.contribution_supported):'Not yet evidenced'}/><div className="sm:col-span-2 lg:col-span-4 text-xs text-zinc-600">Evidence gaps: {r.evidence_gaps.length?r.evidence_gaps.map(label).join(' · '):'core measurement evidence present'}</div></div>}
  </div>)}</div>
 </section>
}
function Small({k,v}:{k:string;v:string}){return <div><div className="text-[9px] uppercase tracking-[.12em] text-zinc-700">{k}</div><div className="mt-1 text-xs text-zinc-400">{v}</div></div>}
function Box({k,v}:{k:string;v:string}){return <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-3"><div className="text-[9px] uppercase tracking-[.12em] text-zinc-700">{k}</div><div className="mt-1 text-sm text-zinc-300">{v}</div></div>}
