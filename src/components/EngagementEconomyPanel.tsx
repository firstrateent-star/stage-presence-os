import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  cancelEngagementCost,
  createEngagementCost,
  getEngagementEconomy,
  listEngagementCosts,
  listEngagementRevenueSources,
  type EngagementCostRow,
  type EngagementEconomyRow,
  type RevenueSourceRow,
} from '../lib/economyRepository'
import { groupRevenueSources, moneyOrUnknown, presentEngagementEconomy } from '../lib/economyPresentation'

const costCategories = [
  ['LABOR', 'Labor'],
  ['SUBCONTRACT', 'Subcontract'],
  ['EQUIPMENT_RENTAL', 'Equipment rental'],
  ['EQUIPMENT_OWNERSHIP', 'Owned equipment allocation'],
  ['TRANSPORT', 'Transport / delivery'],
  ['TRAVEL', 'Travel'],
  ['LODGING', 'Lodging'],
  ['PER_DIEM', 'Per diem'],
  ['FUEL', 'Fuel'],
  ['MATERIALS', 'Materials'],
  ['PURCHASE', 'Purchase'],
  ['MAINTENANCE', 'Maintenance'],
  ['PROCESSING_FEE', 'Processing fee'],
  ['OVERHEAD_ALLOCATED', 'Allocated overhead'],
  ['OTHER', 'Other'],
] as const

export function EngagementEconomyPanel({ engagementId, onChanged }: { engagementId: string; onChanged?: () => void }) {
  const [economy, setEconomy] = useState<EngagementEconomyRow | null>(null)
  const [revenue, setRevenue] = useState<RevenueSourceRow[]>([])
  const [costs, setCosts] = useState<EngagementCostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [nextEconomy, nextRevenue, nextCosts] = await Promise.all([
        getEngagementEconomy(engagementId),
        listEngagementRevenueSources(engagementId),
        listEngagementCosts(engagementId),
      ])
      setEconomy(nextEconomy)
      setRevenue(nextRevenue)
      setCosts(nextCosts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Engagement economy.')
    } finally {
      setLoading(false)
    }
  }, [engagementId])

  useEffect(() => { void refresh() }, [refresh])

  const revenueGroups = useMemo(() => groupRevenueSources(revenue), [revenue])

  if (loading) return <PanelShell><div className="text-sm text-zinc-600">Loading job economy…</div></PanelShell>
  if (error) return <PanelShell><div className="text-sm text-red-300">Job economy could not load.</div><div className="mt-1 text-xs text-red-500">{error}</div></PanelShell>
  if (!economy) return null

  const view = presentEngagementEconomy(economy)
  const costTotals = totalsByState(costs)

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-950/45">
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-700">Money</div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-zinc-200">Engagement economy</h2>
              <StateBadge tone={view.stateTone}>{view.stateLabel}</StateBadge>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">{view.stateDetail}</p>
          </div>
          <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 px-4 py-3 text-right">
            <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-700">{view.commercialValueLabel}</div>
            <div className="mt-1 text-xl font-semibold text-zinc-200">{view.commercialValue}</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="Invoiced" value={view.invoiced} />
          <Metric label="Collected" value={view.collected} />
          <Metric label="Outstanding" value={view.outstanding} emphasis={view.outstanding !== 'Unknown' && view.outstanding !== '$0'} />
          <Metric label="Actual direct cost" value={view.actualCost} />
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-900 bg-zinc-950/55 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-700">Revenue comes from</div>
            <div className="mt-3 space-y-2">
              {revenueGroups.length ? revenueGroups.map(group => (
                <div key={group.bucket} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-zinc-500">{group.label}</span>
                  <span className="font-medium text-zinc-300">{group.amountText}</span>
                </div>
              )) : <div className="text-sm text-zinc-700">No line-level revenue source is represented.</div>}
            </div>
            {(economy.primary_document_discount_total != null || economy.primary_document_tax_total != null || economy.primary_document_processing_fee_total != null) && (
              <div className="mt-4 border-t border-zinc-900 pt-3 text-xs text-zinc-600">
                Document adjustments: {economy.primary_document_discount_total != null ? `discount ${moneyOrUnknown(economy.primary_document_discount_total)}` : 'no discount represented'}
                {economy.primary_document_tax_total != null ? ` · tax ${moneyOrUnknown(economy.primary_document_tax_total)}` : ''}
                {economy.primary_document_processing_fee_total != null ? ` · fee ${moneyOrUnknown(economy.primary_document_processing_fee_total)}` : ''}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-zinc-900 bg-zinc-950/55 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-700">Direct costs represented</div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <MiniMetric label="Estimate" value={moneyOrUnknown(costTotals.ESTIMATE)} />
              <MiniMetric label="Committed" value={moneyOrUnknown(costTotals.COMMITTED)} />
              <MiniMetric label="Actual" value={moneyOrUnknown(costTotals.ACTUAL)} />
            </div>
            <p className="mt-4 text-xs leading-5 text-zinc-600">{costs.length ? `${costs.length} active cost item${costs.length === 1 ? '' : 's'} represented.` : 'No direct-cost items are represented yet. Revenue visibility does not imply profit.'}</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-zinc-900 bg-zinc-950/55 p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-700">{view.contributionLabel}</div>
              <div className="mt-1 text-xl font-semibold text-zinc-300">{view.contribution}</div>
            </div>
            <div className="max-w-xl text-xs leading-5 text-zinc-600">{view.contributionDetail}</div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <EvidenceCard label="Collection evidence" primary={view.cashEvidence} />
          <EvidenceCard label="Commercial source" primary={view.sourceDocument} secondary={view.sourceDocumentDetail} />
        </div>
      </div>

      <details className="border-t border-zinc-900">
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-zinc-500 hover:text-zinc-300 sm:px-6">Revenue detail · {revenue.length} line{revenue.length === 1 ? '' : 's'}</summary>
        <div className="border-t border-zinc-900 px-5 py-5 sm:px-6">
          <div className="space-y-2">
            {revenue.map(line => <RevenueLine key={line.commercial_line_id ?? `${line.sort_order}-${line.description}`} line={line} />)}
            {!revenue.length && <div className="text-sm text-zinc-700">No commercial lines are represented.</div>}
          </div>
        </div>
      </details>

      <details className="border-t border-zinc-900">
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-zinc-500 hover:text-zinc-300 sm:px-6">Costs + reality capture · {costs.length} item{costs.length === 1 ? '' : 's'}</summary>
        <div className="border-t border-zinc-900 px-5 py-5 sm:px-6">
          <CostList costs={costs} onCancelled={async (id) => { await cancelEngagementCost(id); await refresh(); onChanged?.() }} />
          <CostCapture engagementId={engagementId} onSaved={async () => { await refresh(); onChanged?.() }} />
        </div>
      </details>
    </section>
  )
}

function CostCapture({ engagementId, onSaved }: { engagementId: string; onSaved: () => Promise<void> }) {
  const [category, setCategory] = useState('LABOR')
  const [state, setState] = useState<'ESTIMATE' | 'COMMITTED' | 'ACTUAL'>('ESTIMATE')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function save(event: React.FormEvent) {
    event.preventDefault()
    const numericAmount = Number(amount)
    if (!description.trim() || !Number.isFinite(numericAmount) || numericAmount < 0) {
      setMessage('Add a description and a valid non-negative amount.')
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      await createEngagementCost({
        engagement_id: engagementId,
        cost_category: category,
        cost_state: state,
        description: description.trim(),
        amount: numericAmount,
        expected_date: state === 'ESTIMATE' || state === 'COMMITTED' ? (date || null) : null,
        incurred_date: state === 'ACTUAL' ? (date || null) : null,
        certainty_state: state === 'ESTIMATE' ? 'ESTIMATED' : 'KNOWN',
      })
      setDescription('')
      setAmount('')
      setDate('')
      setMessage('Cost captured.')
      await onSaved()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to save cost.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="mt-6 rounded-xl border border-zinc-900 bg-zinc-950/55 p-4">
      <div className="text-sm font-semibold text-zinc-300">Record a direct cost</div>
      <p className="mt-1 text-xs leading-5 text-zinc-700">Capture what this Engagement is expected to consume, has committed to spend, or actually consumed. This does not change the client quote.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Category"><select value={category} onChange={e => setCategory(e.target.value)} className={inputClass}>{costCategories.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
        <Field label="Evidence state"><select value={state} onChange={e => setState(e.target.value as typeof state)} className={inputClass}><option value="ESTIMATE">Estimate</option><option value="COMMITTED">Committed cost</option><option value="ACTUAL">Actual cost</option></select></Field>
        <Field label="Amount"><input value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" className={inputClass} /></Field>
        <Field label={state === 'ACTUAL' ? 'Incurred date' : 'Expected date'}><input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} /></Field>
      </div>
      <div className="mt-3"><Field label="What is the cost?"><input value={description} onChange={e => setDescription(e.target.value)} placeholder="A1 labor, generator rental, fuel, purchased cable…" className={inputClass} /></Field></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-zinc-600">{message || 'Manual capture is preserved as job evidence; future reusable rate assumptions will remain separately versioned.'}</div>
        <button disabled={saving} type="submit" className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 disabled:opacity-50">{saving ? 'Saving…' : 'Record cost'}</button>
      </div>
    </form>
  )
}

function CostList({ costs, onCancelled }: { costs: EngagementCostRow[]; onCancelled: (id: string) => Promise<void> }) {
  if (!costs.length) return <div className="rounded-xl border border-zinc-900 bg-zinc-950/30 p-4 text-sm text-zinc-700">No direct costs captured yet.</div>
  return <div className="space-y-2">{costs.map(cost => (
    <div key={cost.cost_item_id} className="rounded-xl border border-zinc-900 bg-zinc-950/55 px-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <div><div className="font-medium text-zinc-300">{cost.description}</div><div className="mt-1 text-[10px] text-zinc-700">{humanize(cost.cost_category)} · {humanize(cost.cost_state)} · {humanize(cost.source_type)}</div></div>
        <div className="text-right"><div className="font-semibold text-zinc-300">{moneyOrUnknown(cost.amount)}</div><button type="button" onClick={() => void onCancelled(cost.cost_item_id)} className="mt-1 text-[10px] text-zinc-700 hover:text-red-400">Cancel record</button></div>
      </div>
    </div>
  ))}</div>
}

function RevenueLine({ line }: { line: RevenueSourceRow }) {
  return <div className="rounded-xl border border-zinc-900 bg-zinc-950/55 px-4 py-3"><div className="flex items-start justify-between gap-4"><div><div className="font-medium text-zinc-300">{line.description || line.resource_name || 'Commercial line'}</div><div className="mt-1 text-[10px] text-zinc-700">{humanize(line.revenue_bucket)}{line.quantity != null ? ` · qty ${line.quantity}` : ''}{line.group_label ? ` · ${line.group_label}` : ''}</div></div><div className="text-right"><div className="font-semibold text-zinc-300">{moneyOrUnknown(line.effective_line_total)}</div>{line.line_discount_observed ? <div className="mt-1 text-[10px] text-amber-600">line discount {moneyOrUnknown(line.line_discount_observed)}</div> : null}</div></div></div>
}

function totalsByState(costs: EngagementCostRow[]) {
  const totals: Record<'ESTIMATE' | 'COMMITTED' | 'ACTUAL', number | null> = { ESTIMATE: null, COMMITTED: null, ACTUAL: null }
  for (const cost of costs) totals[cost.cost_state] = (totals[cost.cost_state] ?? 0) + Number(cost.amount || 0)
  return totals
}

function PanelShell({ children }: { children: React.ReactNode }) { return <section className="mt-8 rounded-2xl border border-zinc-900 bg-zinc-950/45 p-5">{children}</section> }
function Metric({ label, value, emphasis=false }: { label: string; value: string; emphasis?: boolean }) { return <div className={`rounded-xl border px-3 py-3 ${emphasis ? 'border-amber-950 bg-amber-950/10' : 'border-zinc-900 bg-zinc-950/55'}`}><div className={`text-lg font-semibold ${emphasis ? 'text-amber-400' : 'text-zinc-300'}`}>{value}</div><div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-zinc-700">{label}</div></div> }
function MiniMetric({ label, value }: { label: string; value: string }) { return <div><div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-zinc-700">{label}</div><div className="mt-1 text-sm font-medium text-zinc-400">{value}</div></div> }
function EvidenceCard({ label, primary, secondary }: { label: string; primary: string; secondary?: string }) { return <div className="rounded-xl border border-zinc-900 bg-zinc-950/45 p-4"><div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-700">{label}</div><div className="mt-1 text-xs leading-5 text-zinc-500">{primary}</div>{secondary && <div className="mt-1 text-[10px] text-zinc-700">{secondary}</div>}</div> }
function StateBadge({ tone, children }: { tone: 'good' | 'watch' | 'quiet'; children: React.ReactNode }) { const classes = tone === 'good' ? 'border-emerald-950 text-emerald-400' : tone === 'watch' ? 'border-amber-950 text-amber-400' : 'border-zinc-800 text-zinc-500'; return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${classes}`}>{children}</span> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-700">{label}</span>{children}</label> }
function humanize(value: string) { return value.replaceAll('_',' ').toLowerCase().replace(/^./, x => x.toUpperCase()) }
const inputClass = 'w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-zinc-600'
