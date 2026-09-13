import { useEffect, useMemo, useState } from 'react'
import { listCapacityPositions, listInventoryLocations, verifyInventory, type CapacityPosition, type InventoryLocation } from '../lib/inventoryCapacityRuntime'

type Draft = {
  verifiedQuantity: string
  serviceableQuantity: string
  locationId: string
  notes: string
}

const priorityNames = ['17x10 LED Trailer', '12x7 LED Trailer', '10x5 LED Trailer', '3.9mm LED Panels', 'LED Poster Panels']

function numberLabel(value: number | null | undefined) {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)
}

function dateLabel(value: string | null) {
  if (!value) return 'Not yet verified'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function statusTone(row: CapacityPosition) {
  if (row.capacity_state === 'CAPACITY_CONFLICT') return 'border-red-900/60 bg-red-950/20 text-red-300'
  if (row.capacity_state === 'CAPACITY_UNVERIFIED') return 'border-amber-900/60 bg-amber-950/20 text-amber-300'
  if (row.inventory_authority_state === 'VERIFIED_PARTIAL_SERVICE') return 'border-amber-900/60 bg-amber-950/20 text-amber-300'
  return 'border-emerald-900/60 bg-emerald-950/20 text-emerald-300'
}

function makeDraft(row: CapacityPosition): Draft {
  const verified = row.verified_quantity ?? row.catalog_quantity ?? 0
  const serviceable = row.serviceable_quantity ?? row.catalog_quantity ?? 0
  return {
    verifiedQuantity: String(verified),
    serviceableQuantity: String(serviceable),
    locationId: row.location_id ?? '',
    notes: '',
  }
}

export function WarehouseVerificationPanel() {
  const [rows, setRows] = useState<CapacityPosition[]>([])
  const [locations, setLocations] = useState<InventoryLocation[]>([])
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [nextRows, nextLocations] = await Promise.all([listCapacityPositions(), listInventoryLocations()])
      setRows(nextRows)
      setLocations(nextLocations)
      setDrafts((current) => {
        const next = { ...current }
        for (const row of nextRows) if (!next[row.resource_id]) next[row.resource_id] = makeDraft(row)
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load warehouse verification.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const ordered = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aPriority = priorityNames.indexOf(a.resource_name)
      const bPriority = priorityNames.indexOf(b.resource_name)
      if (aPriority >= 0 || bPriority >= 0) return (aPriority < 0 ? 999 : aPriority) - (bPriority < 0 ? 999 : bPriority)
      if (a.verification_id === null && b.verification_id !== null) return -1
      if (a.verification_id !== null && b.verification_id === null) return 1
      return a.resource_name.localeCompare(b.resource_name)
    })
  }, [rows])

  const verifiedCount = rows.filter((row) => row.verification_id).length
  const serviceIssueCount = rows.filter((row) => row.verification_id && Number(row.unavailable_quantity ?? 0) > 0).length
  const conflictCount = rows.filter((row) => row.capacity_state === 'CAPACITY_CONFLICT').length

  function patchDraft(resourceId: string, patch: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [resourceId]: { ...(current[resourceId] ?? { verifiedQuantity: '', serviceableQuantity: '', locationId: '', notes: '' }), ...patch } }))
  }

  async function submit(row: CapacityPosition) {
    const draft = drafts[row.resource_id] ?? makeDraft(row)
    const verifiedQuantity = Number(draft.verifiedQuantity)
    const serviceableQuantity = Number(draft.serviceableQuantity)
    setSavingId(row.resource_id)
    setError(null)
    setMessage(null)
    try {
      await verifyInventory({
        resourceId: row.resource_id,
        verifiedQuantity,
        serviceableQuantity,
        locationId: draft.locationId || null,
        notes: draft.notes || null,
      })
      setMessage(`${row.resource_name} inventory verified.`)
      setExpandedId(null)
      setDrafts((current) => { const next = { ...current }; delete next[row.resource_id]; return next })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify inventory.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-900 bg-zinc-950/45 p-5">
      <div className="flex flex-col gap-4 border-b border-zinc-900 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-500">Warehouse truth</div>
          <h2 className="mt-1 text-xl font-semibold text-zinc-100">Inventory verification + capacity</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">Physically verify what Stage Presence owns and how much is actually serviceable. Confirmed reservations can only trust capacity after this evidence exists.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Metric label="Verified" value={`${verifiedCount}/${rows.length}`} />
          <Metric label="Service issues" value={String(serviceIssueCount)} />
          <Metric label="Conflicts" value={String(conflictCount)} />
        </div>
      </div>

      {message && <div className="mt-4 rounded-xl border border-emerald-900/50 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-300">{message}</div>}
      {error && <div className="mt-4 rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</div>}

      {loading ? (
        <div className="py-12 text-center text-sm text-zinc-700">Loading warehouse truth…</div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-xl border border-zinc-900">
          {ordered.map((row) => {
            const draft = drafts[row.resource_id] ?? makeDraft(row)
            const expanded = expandedId === row.resource_id
            const isPriority = priorityNames.includes(row.resource_name)
            return (
              <div key={row.resource_id} className="border-b border-zinc-900 bg-zinc-950/35 last:border-0">
                <button type="button" onClick={() => setExpandedId(expanded ? null : row.resource_id)} className="grid w-full gap-3 p-4 text-left transition hover:bg-zinc-900/35 md:grid-cols-[1.6fr_.65fr_.65fr_.7fr_auto] md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-zinc-200">{row.resource_name}</span>
                      {isPriority && <span className="rounded-full border border-amber-900/60 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[.12em] text-amber-500">priority sweep</span>}
                    </div>
                    <div className="mt-1 text-xs text-zinc-600">{row.category} · {row.location_name ?? 'location not verified'} · {dateLabel(row.counted_at)}</div>
                  </div>
                  <Cell label="Expected" value={`${numberLabel(row.catalog_quantity)} ${row.quantity_state}`} />
                  <Cell label="Serviceable" value={numberLabel(row.serviceable_quantity)} />
                  <Cell label="Available today" value={numberLabel(row.available_quantity_today)} />
                  <span className={`justify-self-start rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[.1em] md:justify-self-end ${statusTone(row)}`}>{row.capacity_state.replaceAll('_', ' ')}</span>
                </button>

                {expanded && (
                  <div className="border-t border-zinc-900 bg-black/20 p-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <Field label="Physically counted">
                        <input type="number" min="0" step="1" value={draft.verifiedQuantity} onChange={(event) => patchDraft(row.resource_id, { verifiedQuantity: event.target.value })} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-amber-700" />
                      </Field>
                      <Field label="Serviceable now">
                        <input type="number" min="0" step="1" value={draft.serviceableQuantity} onChange={(event) => patchDraft(row.resource_id, { serviceableQuantity: event.target.value })} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-amber-700" />
                      </Field>
                      <Field label="Observed location">
                        <select value={draft.locationId} onChange={(event) => patchDraft(row.resource_id, { locationId: event.target.value })} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 outline-none focus:border-amber-700">
                          <option value="">Location not specified</option>
                          {locations.map((location) => <option key={location.id} value={location.id}>{location.name}{location.city ? ` · ${location.city}` : ''}</option>)}
                        </select>
                      </Field>
                      <Field label="Unavailable after count">
                        <div className="rounded-xl border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm font-semibold tabular-nums text-zinc-400">{Math.max(Number(draft.verifiedQuantity || 0) - Number(draft.serviceableQuantity || 0), 0)}</div>
                      </Field>
                    </div>
                    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                      <Field label="Count / condition notes">
                        <textarea rows={2} value={draft.notes} onChange={(event) => patchDraft(row.resource_id, { notes: event.target.value })} placeholder="Example: 2 panels need module repair; stored in rear rack." className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 outline-none placeholder:text-zinc-800 focus:border-amber-700" />
                      </Field>
                      <button type="button" disabled={savingId === row.resource_id} onClick={() => void submit(row)} className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-zinc-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50">{savingId === row.resource_id ? 'Verifying…' : row.verification_id ? 'Record new verification' : 'Verify inventory'}</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-20 rounded-xl border border-zinc-900 bg-black/20 px-3 py-2"><div className="text-[9px] uppercase tracking-[.12em] text-zinc-700">{label}</div><div className="mt-1 text-sm font-semibold text-zinc-300">{value}</div></div>
}

function Cell({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[9px] uppercase tracking-[.12em] text-zinc-700">{label}</div><div className="mt-1 text-xs text-zinc-400">{value}</div></div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[.12em] text-zinc-600">{label}</span>{children}</label>
}
