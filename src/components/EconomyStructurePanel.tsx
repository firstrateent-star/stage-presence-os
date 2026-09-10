import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  cancelCompanyCost,
  createCompanyCost,
  createEconomicRateDraft,
  createFinancialAccount,
  listCompanyCosts,
  listEconomicRateProfiles,
  listEconomicResources,
  listFinancialAccounts,
  listResourceEconomy,
  recordFinancialAccountSnapshot,
  recordResourceEconomicSnapshot,
  type CompanyCostRow,
  type EconomicRateProfileRow,
  type EconomicResourceRow,
  type FinancialAccountRow,
  type ResourceEconomyRow,
} from '../lib/economyRepository'
import { dateLabel, moneyOrUnknown } from '../lib/economyPresentation'

const inputClass = 'w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-800 focus:border-zinc-700'

export function EconomyStructurePanel({ onChanged }: { onChanged?: () => void }) {
  const [accounts, setAccounts] = useState<FinancialAccountRow[]>([])
  const [companyCosts, setCompanyCosts] = useState<CompanyCostRow[]>([])
  const [assets, setAssets] = useState<ResourceEconomyRow[]>([])
  const [resources, setResources] = useState<EconomicResourceRow[]>([])
  const [rates, setRates] = useState<EconomicRateProfileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [nextAccounts, nextCosts, nextAssets, nextResources, nextRates] = await Promise.all([
        listFinancialAccounts(), listCompanyCosts(), listResourceEconomy(), listEconomicResources(), listEconomicRateProfiles(),
      ])
      setAccounts(nextAccounts)
      setCompanyCosts(nextCosts)
      setAssets(nextAssets)
      setResources(nextResources)
      setRates(nextRates)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load economy structure.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  async function changed() {
    await refresh()
    onChanged?.()
  }

  if (loading) return <div className="mt-8 rounded-2xl border border-zinc-900 p-5 text-sm text-zinc-600">Loading economy structure…</div>
  if (error) return <div className="mt-8 rounded-2xl border border-red-950 bg-red-950/10 p-5 text-sm text-red-300">{error}</div>

  return (
    <section className="mt-10">
      <div className="mb-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-700">Economic structure</div>
        <h2 className="mt-1 text-lg font-semibold text-zinc-200">Teach the system the company behind the jobs</h2>
        <p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-600">These records describe Stage Presence itself: where funds sit, what the company spends, what its assets economically represent, and what reusable cost assumptions currently guide decisions. They remain separate from job revenue and job cost evidence.</p>
      </div>

      <div className="space-y-3">
        <StructureSection title="Accounts + funds" count={accounts.length} subtitle="Bank, cash and liability snapshots. Collections do not become funds until account evidence exists.">
          <AccountSection accounts={accounts} onChanged={changed} />
        </StructureSection>

        <StructureSection title="Company operating costs" count={companyCosts.length} subtitle="Overhead and operating costs that should not be forced onto one Engagement.">
          <CompanyCostSection costs={companyCosts} onChanged={changed} />
        </StructureSection>

        <StructureSection title="Asset economics" count={assets.length} subtitle="Append-only economic snapshots for owned, financed, leased or rented Resources. Inventory availability remains a different truth.">
          <AssetSection assets={assets} resources={resources} onChanged={changed} />
        </StructureSection>

        <StructureSection title="Cost rates + assumptions" count={rates.length} subtitle="Reusable future-facing assumptions. New entries begin as drafts and never rewrite earlier job costs.">
          <RateSection rates={rates} onChanged={changed} />
        </StructureSection>
      </div>
    </section>
  )
}

function StructureSection({ title, count, subtitle, children }: { title: string; count: number; subtitle: string; children: React.ReactNode }) {
  return (
    <details className="rounded-2xl border border-zinc-900 bg-zinc-950/35">
      <summary className="cursor-pointer px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div><div className="text-sm font-semibold text-zinc-400">{title}</div><div className="mt-1 text-[11px] leading-5 text-zinc-700">{subtitle}</div></div>
          <span className="rounded-full border border-zinc-900 px-2 py-1 text-[10px] text-zinc-600">{count}</span>
        </div>
      </summary>
      <div className="border-t border-zinc-900 p-5 sm:p-6">{children}</div>
    </details>
  )
}

function AccountSection({ accounts, onChanged }: { accounts: FinancialAccountRow[]; onChanged: () => Promise<void> }) {
  const [name, setName] = useState('')
  const [institution, setInstitution] = useState('')
  const [type, setType] = useState<'BANK' | 'CASH' | 'CREDIT_CARD' | 'LOAN' | 'OTHER_ASSET' | 'OTHER_LIABILITY'>('BANK')
  const [snapshotAccount, setSnapshotAccount] = useState('')
  const [balance, setBalance] = useState('')
  const [date, setDate] = useState(todayValue())
  const [message, setMessage] = useState<string | null>(null)

  const selected = accounts.find(account => account.financial_account_id === snapshotAccount)

  async function addAccount(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) return setMessage('Name the account first.')
    const nature = ['CREDIT_CARD','LOAN','OTHER_LIABILITY'].includes(type) ? 'LIABILITY' : 'ASSET'
    try {
      await createFinancialAccount({ name: name.trim(), institution_name: institution.trim() || null, account_type: type, account_nature: nature })
      setName(''); setInstitution(''); setMessage('Account added. Add a balance snapshot when you have current evidence.'); await onChanged()
    } catch (err) { setMessage(errorText(err)) }
  }

  async function addSnapshot(event: React.FormEvent) {
    event.preventDefault()
    const amount = Number(balance)
    if (!snapshotAccount || !Number.isFinite(amount) || amount < 0) return setMessage('Choose an account and enter a non-negative balance.')
    const stored = selected?.account_nature === 'LIABILITY' ? -amount : amount
    try {
      await recordFinancialAccountSnapshot({ financial_account_id: snapshotAccount, as_of: date, balance: stored })
      setBalance(''); setMessage('Balance snapshot recorded. Earlier snapshots remain history.'); await onChanged()
    } catch (err) { setMessage(errorText(err)) }
  }

  return <div>
    {accounts.length ? <div className="grid gap-2 lg:grid-cols-2">{accounts.map(account => <div key={account.financial_account_id} className="rounded-xl border border-zinc-900 bg-zinc-950/55 p-4"><div className="flex items-start justify-between gap-4"><div><div className="font-medium text-zinc-300">{account.name}</div><div className="mt-1 text-[10px] text-zinc-700">{humanize(account.account_type)}{account.institution_name ? ` · ${account.institution_name}` : ''}</div></div><div className="text-right"><div className="font-semibold text-zinc-300">{account.snapshot_id ? moneyOrUnknown(account.account_nature === 'LIABILITY' ? Math.abs(Number(account.balance)) : account.balance) : 'No snapshot'}</div><div className="mt-1 text-[10px] text-zinc-700">{account.account_nature === 'LIABILITY' ? 'owed' : 'represented'}{account.as_of ? ` · ${dateLabel(account.as_of)}` : ''}</div></div></div></div>)}</div> : <Empty text="No financial accounts are represented yet, so the system intentionally does not claim Stage Presence cash-on-hand or liabilities." />}

    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <form onSubmit={addAccount} className="rounded-xl border border-zinc-900 bg-zinc-950/45 p-4"><FormTitle title="Add account" detail="Create the account identity only. A separate snapshot supplies its balance." /><div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="Account name"><input value={name} onChange={e=>setName(e.target.value)} placeholder="Operating checking" className={inputClass}/></Field><Field label="Type"><select value={type} onChange={e=>setType(e.target.value as typeof type)} className={inputClass}><option value="BANK">Bank</option><option value="CASH">Cash</option><option value="CREDIT_CARD">Credit card</option><option value="LOAN">Loan</option><option value="OTHER_ASSET">Other asset</option><option value="OTHER_LIABILITY">Other liability</option></select></Field></div><div className="mt-3"><Field label="Institution (optional)"><input value={institution} onChange={e=>setInstitution(e.target.value)} placeholder="Bank or lender" className={inputClass}/></Field></div><SaveButton>Add account</SaveButton></form>

      <form onSubmit={addSnapshot} className="rounded-xl border border-zinc-900 bg-zinc-950/45 p-4"><FormTitle title="Record balance snapshot" detail="For liabilities, enter the positive amount currently owed; the system stores the liability sign internally." /><div className="mt-3 grid gap-3 sm:grid-cols-3"><Field label="Account"><select value={snapshotAccount} onChange={e=>setSnapshotAccount(e.target.value)} className={inputClass}><option value="">Choose…</option>{accounts.map(a=><option key={a.financial_account_id} value={a.financial_account_id}>{a.name}</option>)}</select></Field><Field label={selected?.account_nature === 'LIABILITY' ? 'Amount owed' : 'Balance'}><input value={balance} onChange={e=>setBalance(e.target.value)} inputMode="decimal" placeholder="0.00" className={inputClass}/></Field><Field label="As of"><input type="date" value={date} onChange={e=>setDate(e.target.value)} className={inputClass}/></Field></div><SaveButton>Record snapshot</SaveButton></form>
    </div>
    {message && <Message>{message}</Message>}
  </div>
}

function CompanyCostSection({ costs, onChanged }: { costs: CompanyCostRow[]; onChanged: () => Promise<void> }) {
  const [category, setCategory] = useState('SOFTWARE')
  const [state, setState] = useState<'ESTIMATE' | 'COMMITTED' | 'ACTUAL'>('ACTUAL')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayValue())
  const [message, setMessage] = useState<string | null>(null)
  const ytd = useMemo(() => costs.filter(c => c.cost_state === 'ACTUAL' && dateYear(c.incurred_date ?? c.period_start) === new Date().getFullYear()).reduce((sum,c)=>sum+Number(c.amount),0), [costs])

  async function save(event: React.FormEvent) {
    event.preventDefault(); const numeric = Number(amount)
    if (!description.trim() || !Number.isFinite(numeric) || numeric < 0) return setMessage('Add a description and non-negative amount.')
    try { await createCompanyCost({ cost_category: category, cost_state: state, description: description.trim(), amount: numeric, expected_date: state==='ACTUAL'?null:date, incurred_date: state==='ACTUAL'?date:null }); setDescription(''); setAmount(''); setMessage('Company cost recorded.'); await onChanged() } catch (err) { setMessage(errorText(err)) }
  }

  return <div><div className="mb-4 flex items-end justify-between gap-3"><div className="text-xs leading-5 text-zinc-600">Company costs stay separate from direct Engagement costs. They can later support a fuller operating-income model once coverage is trustworthy.</div><div className="shrink-0 text-right"><div className="text-[9px] uppercase tracking-[.1em] text-zinc-700">Actual YTD represented</div><div className="font-semibold text-zinc-300">{costs.length ? moneyOrUnknown(ytd) : 'Not represented'}</div></div></div>{costs.length ? <div className="space-y-2">{costs.slice(0,12).map(cost=><div key={cost.company_cost_id} className="rounded-xl border border-zinc-900 bg-zinc-950/55 px-4 py-3"><div className="flex justify-between gap-4"><div><div className="font-medium text-zinc-300">{cost.description}</div><div className="mt-1 text-[10px] text-zinc-700">{humanize(cost.cost_category)} · {humanize(cost.cost_state)}{cost.incurred_date ? ` · ${dateLabel(cost.incurred_date)}` : cost.expected_date ? ` · expected ${dateLabel(cost.expected_date)}` : ''}</div></div><div className="text-right"><div className="font-semibold text-zinc-300">{moneyOrUnknown(cost.amount)}</div><button type="button" onClick={()=>void cancelCompanyCost(cost.company_cost_id).then(onChanged)} className="mt-1 text-[10px] text-zinc-700 hover:text-red-400">Cancel record</button></div></div></div>)}</div> : <Empty text="No company operating costs are represented yet." />}
  <form onSubmit={save} className="mt-5 rounded-xl border border-zinc-900 bg-zinc-950/45 p-4"><FormTitle title="Record company cost" detail="Examples: insurance, software, facility, vehicle, office, marketing, licenses or financing costs."/><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Category"><select value={category} onChange={e=>setCategory(e.target.value)} className={inputClass}>{['ADMIN_LABOR','SOFTWARE','INSURANCE','FACILITY','VEHICLE','MARKETING','PROFESSIONAL','TAX_LICENSE','FINANCING','EQUIPMENT','MAINTENANCE','UTILITIES','OFFICE','TRAINING','OTHER'].map(x=><option key={x} value={x}>{humanize(x)}</option>)}</select></Field><Field label="State"><select value={state} onChange={e=>setState(e.target.value as typeof state)} className={inputClass}><option value="ESTIMATE">Estimate</option><option value="COMMITTED">Committed</option><option value="ACTUAL">Actual</option></select></Field><Field label="Amount"><input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" className={inputClass}/></Field><Field label={state==='ACTUAL'?'Incurred':'Expected'}><input type="date" value={date} onChange={e=>setDate(e.target.value)} className={inputClass}/></Field></div><div className="mt-3"><Field label="What is it?"><input value={description} onChange={e=>setDescription(e.target.value)} placeholder="Annual liability insurance…" className={inputClass}/></Field></div><SaveButton>Record company cost</SaveButton></form>{message&&<Message>{message}</Message>}</div>
}

function AssetSection({ assets, resources, onChanged }: { assets: ResourceEconomyRow[]; resources: EconomicResourceRow[]; onChanged: () => Promise<void> }) {
  const [resourceId,setResourceId]=useState(''); const [ownership,setOwnership]=useState<'OWNED'|'FINANCED'|'LEASED'|'RENTED'|'BORROWED'|'UNKNOWN'>('OWNED'); const [quantity,setQuantity]=useState(''); const [acquisition,setAcquisition]=useState(''); const [currentValue,setCurrentValue]=useState(''); const [replacement,setReplacement]=useState(''); const [financing,setFinancing]=useState(''); const [maintenance,setMaintenance]=useState(''); const [date,setDate]=useState(todayValue()); const [message,setMessage]=useState<string|null>(null)
  async function save(event: React.FormEvent) { event.preventDefault(); if(!resourceId)return setMessage('Choose a Resource.'); try { await recordResourceEconomicSnapshot({resource_id:resourceId,as_of:date,ownership_state:ownership,represented_quantity:numOrNull(quantity),acquisition_cost_total:numOrNull(acquisition),current_value_estimate:numOrNull(currentValue),replacement_cost_total:numOrNull(replacement),financing_balance:numOrNull(financing),annual_maintenance_estimate:numOrNull(maintenance)}); setMessage('Asset economic snapshot recorded.'); await onChanged() } catch(err){setMessage(errorText(err))} }
  return <div>{assets.length?<div className="grid gap-2 lg:grid-cols-2">{assets.map(asset=><div key={asset.resource_id} className="rounded-xl border border-zinc-900 bg-zinc-950/55 p-4"><div className="flex justify-between gap-4"><div><div className="font-medium text-zinc-300">{asset.resource_name}</div><div className="mt-1 text-[10px] text-zinc-700">{humanize(asset.ownership_state)}{asset.represented_quantity!=null?` · qty ${asset.represented_quantity}`:''} · as of {dateLabel(asset.as_of)}</div></div><div className="text-right"><div className="font-semibold text-zinc-300">{asset.current_value_estimate!=null?moneyOrUnknown(asset.current_value_estimate):'Value unknown'}</div>{asset.financing_balance!=null&&<div className="mt-1 text-[10px] text-zinc-700">financing {moneyOrUnknown(asset.financing_balance)}</div>}</div></div></div>)}</div>:<Empty text="No Resource has an economic snapshot yet. Equipment names and operational quantities do not imply ownership value."/>}
  <form onSubmit={save} className="mt-5 rounded-xl border border-zinc-900 bg-zinc-950/45 p-4"><FormTitle title="Add asset economic snapshot" detail="Use the best current evidence you have. This is append-only, so later estimates create a new snapshot instead of overwriting history."/><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Resource"><select value={resourceId} onChange={e=>setResourceId(e.target.value)} className={inputClass}><option value="">Choose…</option>{resources.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></Field><Field label="Ownership"><select value={ownership} onChange={e=>setOwnership(e.target.value as typeof ownership)} className={inputClass}>{['OWNED','FINANCED','LEASED','RENTED','BORROWED','UNKNOWN'].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Quantity"><input value={quantity} onChange={e=>setQuantity(e.target.value)} inputMode="decimal" placeholder="optional" className={inputClass}/></Field><Field label="As of"><input type="date" value={date} onChange={e=>setDate(e.target.value)} className={inputClass}/></Field><Field label="Acquisition cost"><input value={acquisition} onChange={e=>setAcquisition(e.target.value)} inputMode="decimal" placeholder="optional" className={inputClass}/></Field><Field label="Current value"><input value={currentValue} onChange={e=>setCurrentValue(e.target.value)} inputMode="decimal" placeholder="optional" className={inputClass}/></Field><Field label="Replacement cost"><input value={replacement} onChange={e=>setReplacement(e.target.value)} inputMode="decimal" placeholder="optional" className={inputClass}/></Field><Field label="Financing balance"><input value={financing} onChange={e=>setFinancing(e.target.value)} inputMode="decimal" placeholder="optional" className={inputClass}/></Field><Field label="Annual maintenance est."><input value={maintenance} onChange={e=>setMaintenance(e.target.value)} inputMode="decimal" placeholder="optional" className={inputClass}/></Field></div><SaveButton>Record asset snapshot</SaveButton></form>{message&&<Message>{message}</Message>}</div>
}

function RateSection({ rates, onChanged }: { rates: EconomicRateProfileRow[]; onChanged: () => Promise<void> }) {
  const [key,setKey]=useState(''); const [name,setName]=useState(''); const [domain,setDomain]=useState('LABOR'); const [kind,setKind]=useState('INTERNAL_COST'); const [scope,setScope]=useState<'GENERAL'|'ROLE'|'CATEGORY'>('GENERAL'); const [scopeValue,setScopeValue]=useState(''); const [basis,setBasis]=useState('DAY'); const [amount,setAmount]=useState(''); const [effective,setEffective]=useState(todayValue()); const [message,setMessage]=useState<string|null>(null)
  async function save(event:React.FormEvent){event.preventDefault();const numeric=Number(amount);if(!key.trim()||!name.trim()||!Number.isFinite(numeric)||numeric<0)return setMessage('Add a rate key, name and non-negative amount.');if(scope!=='GENERAL'&&!scopeValue.trim())return setMessage('Add the role/category this rate applies to.');try{await createEconomicRateDraft({profile_key:key,name:name.trim(),cost_domain:domain,rate_kind:kind,scope_type:scope,role_code:scope==='ROLE'?scopeValue.trim():null,category:scope==='CATEGORY'?scopeValue.trim():null,unit_basis:basis,amount:numeric,effective_from:effective||null});setKey('');setName('');setAmount('');setMessage('Draft rate created. It is not approved or applied to any job.');await onChanged()}catch(err){setMessage(errorText(err))}}
  return <div><div className="mb-4 rounded-xl border border-sky-950/60 bg-sky-950/10 px-4 py-3 text-xs leading-5 text-sky-300/70">A rate is guidance, not truth about an earlier job. This screen creates <strong>drafts only</strong>; approval and application remain governed steps.</div>{rates.length?<div className="space-y-2">{rates.slice(0,16).map(rate=><div key={rate.id} className="rounded-xl border border-zinc-900 bg-zinc-950/55 px-4 py-3"><div className="flex justify-between gap-4"><div><div className="font-medium text-zinc-300">{rate.name}</div><div className="mt-1 text-[10px] text-zinc-700">{humanize(rate.cost_domain)} · {humanize(rate.scope_type)} · v{rate.version_no}</div></div><div className="text-right"><div className="font-semibold text-zinc-300">{moneyOrUnknown(rate.amount)} / {humanize(rate.unit_basis).toLowerCase()}</div><div className="mt-1 text-[10px] text-zinc-700">{humanize(rate.status)}</div></div></div></div>)}</div>:<Empty text="No reusable cost-rate assumptions are represented yet."/>}
  <form onSubmit={save} className="mt-5 rounded-xl border border-zinc-900 bg-zinc-950/45 p-4"><FormTitle title="Create draft cost rate" detail="Examples: A1 labor/day, delivery/mile, trailer ownership allocation/event, or general processing cost."/><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Rate family key"><input value={key} onChange={e=>setKey(e.target.value)} placeholder="A1_DAY" className={inputClass}/></Field><Field label="Name"><input value={name} onChange={e=>setName(e.target.value)} placeholder="A1 internal day cost" className={inputClass}/></Field><Field label="Domain"><select value={domain} onChange={e=>setDomain(e.target.value)} className={inputClass}>{['ASSET','LABOR','SUBCONTRACT','LOGISTICS','TRAVEL','MATERIALS','FEES','OVERHEAD','OTHER'].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Kind"><select value={kind} onChange={e=>setKind(e.target.value)} className={inputClass}>{['INTERNAL_COST','EXTERNAL_COST','OWNERSHIP_ALLOCATION','MAINTENANCE_RESERVE','REPLACEMENT_REFERENCE','PAY','BURDENED_COST','OTHER'].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Scope"><select value={scope} onChange={e=>setScope(e.target.value as typeof scope)} className={inputClass}><option value="GENERAL">General</option><option value="ROLE">Role</option><option value="CATEGORY">Category</option></select></Field>{scope!=='GENERAL'&&<Field label={scope==='ROLE'?'Role':'Category'}><input value={scopeValue} onChange={e=>setScopeValue(e.target.value)} placeholder={scope==='ROLE'?'A1':'LED'} className={inputClass}/></Field>}<Field label="Basis"><select value={basis} onChange={e=>setBasis(e.target.value)} className={inputClass}>{['HOUR','DAY','EVENT','UNIT','MILE','WEEK','MONTH','FLAT','OTHER'].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Amount"><input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" className={inputClass}/></Field><Field label="Effective from"><input type="date" value={effective} onChange={e=>setEffective(e.target.value)} className={inputClass}/></Field></div><SaveButton>Create draft rate</SaveButton></form>{message&&<Message>{message}</Message>}</div>
}

function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.08em] text-zinc-700">{label}</span>{children}</label>}
function SaveButton({children}:{children:React.ReactNode}){return <div className="mt-4 flex justify-end"><button type="submit" className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-400">{children}</button></div>}
function FormTitle({title,detail}:{title:string;detail:string}){return <div><div className="text-sm font-semibold text-zinc-300">{title}</div><div className="mt-1 text-xs leading-5 text-zinc-700">{detail}</div></div>}
function Empty({text}:{text:string}){return <div className="rounded-xl border border-zinc-900 bg-zinc-950/30 p-4 text-sm leading-6 text-zinc-700">{text}</div>}
function Message({children}:{children:React.ReactNode}){return <div className="mt-3 text-xs text-zinc-600">{children}</div>}
function humanize(value:string){return value.replaceAll('_',' ').toLowerCase().replace(/^./,x=>x.toUpperCase())}
function errorText(err:unknown){return err instanceof Error?err.message:'Unable to save economic evidence.'}
function numOrNull(value:string){if(!value.trim())return null;const n=Number(value);return Number.isFinite(n)&&n>=0?n:null}
function todayValue(){return new Date().toISOString().slice(0,10)}
function dateYear(value:string|null){return value?Number(value.slice(0,4)):null}
