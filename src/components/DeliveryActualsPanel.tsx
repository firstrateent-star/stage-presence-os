import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  confirmResourceUsage,
  listActualAssignments,
  listActualResourceCandidates,
  markAssignmentCompleted,
  type ActualAssignment,
  type ActualResourceCandidate,
  type UsageState,
} from '../lib/deliveryActuals'

export function DeliveryActualsPanel({
  engagementId,
  eventStartDate,
  eventEndDate,
  operationalState,
  onChanged,
}: {
  engagementId: string
  eventStartDate: string | null
  eventEndDate: string | null
  operationalState: string
  onChanged?: () => Promise<void> | void
}) {
  const [resources, setResources] = useState<ActualResourceCandidate[]>([])
  const [assignments, setAssignments] = useState<ActualAssignment[]>([])
  const [selectedResource, setSelectedResource] = useState<ActualResourceCandidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [nextResources, nextAssignments] = await Promise.all([
        listActualResourceCandidates(engagementId),
        listActualAssignments(engagementId),
      ])
      setResources(nextResources)
      setAssignments(nextAssignments)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load delivery actuals.')
    } finally {
      setLoading(false)
    }
  }, [engagementId])

  useEffect(() => { void refresh() }, [refresh])

  const representedActualCount = useMemo(() => resources.filter((item) => item.actual).length, [resources])
  const completedCrewCount = useMemo(() => assignments.filter((item) => item.assignment_state === 'COMPLETED').length, [assignments])
  const isDeliveryRelevant = deliveryIsRelevant(eventStartDate, eventEndDate, operationalState) || representedActualCount > 0 || completedCrewCount > 0

  async function saveUsage(formData: FormData) {
    if (!selectedResource) return
    const quantityText = clean(formData.get('quantity'))
    const usedFrom = localToIso(clean(formData.get('used_from')))
    const usedThrough = localToIso(clean(formData.get('used_through')))

    setSaving(true)
    setError(null)
    try {
      await confirmResourceUsage({
        engagementId,
        engagementResourceId: selectedResource.engagement_resource_id,
        resourceId: selectedResource.resource_id,
        usageState: String(formData.get('usage_state')) as UsageState,
        quantity: quantityText == null ? null : Number(quantityText),
        usedFrom,
        usedThrough,
        notes: clean(formData.get('notes')),
      })
      setSelectedResource(null)
      await refresh()
      await Promise.resolve(onChanged?.())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to confirm actual usage.')
    } finally {
      setSaving(false)
    }
  }

  async function completeAssignment(assignmentId: string) {
    setSaving(true)
    setError(null)
    try {
      await markAssignmentCompleted(assignmentId)
      await refresh()
      await Promise.resolve(onChanged?.())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete assignment.')
    } finally {
      setSaving(false)
    }
  }

  if (!loading && !isDeliveryRelevant) return null

  return (
    <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/55 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs font-semibold tracking-[0.18em] text-emerald-500">DELIVERY ACTUALS</div>
          <h2 className="mt-2 text-xl font-semibold text-zinc-100">What actually happened?</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-500">Planned scope stays planned until someone confirms the actual. Record only equipment/services actually used and confirmed crew responsibility actually completed.</p>
        </div>
        {!loading && (
          <div className="text-xs text-zinc-600">{representedActualCount} actual use · {completedCrewCount} completed crew</div>
        )}
      </div>

      {error && <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</div>}

      {loading ? (
        <div className="mt-5 text-sm text-zinc-600">Loading delivery actuals…</div>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <ActualCard title="Resource / service use" subtitle="Confirm from represented job requirements; nothing is assumed used.">
            {resources.length ? (
              <div className="space-y-2">
                {resources.map((item) => <ResourceActualRow key={item.engagement_resource_id} item={item} onConfirm={() => setSelectedResource(item)} />)}
              </div>
            ) : <EmptyState text="No represented resource/service requirements are available to confirm." />}
          </ActualCard>

          <ActualCard title="Crew completion" subtitle="Only confirmed assignments can become completed actuals.">
            {assignments.length ? (
              <div className="space-y-2">
                {assignments.map((item) => <AssignmentActualRow key={item.id} item={item} saving={saving} onComplete={() => void completeAssignment(item.id)} />)}
              </div>
            ) : <EmptyState text="No confirmed crew assignments are represented yet, so there is nothing to mark completed." />}
          </ActualCard>
        </div>
      )}

      {selectedResource && <UsageModal item={selectedResource} saving={saving} onClose={() => setSelectedResource(null)} onSave={saveUsage} />}
    </section>
  )
}

function ResourceActualRow({ item, onConfirm }: { item: ActualResourceCandidate; onConfirm: () => void }) {
  const actual = item.actual
  return <div className="rounded-xl border border-zinc-900 bg-zinc-950/70 p-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-sm font-medium text-zinc-200">{item.resource_name}</div>
        <div className="mt-1 text-xs text-zinc-600">{item.relationship.replaceAll('_', ' ')}{item.planned_quantity != null ? ` · planned ${item.planned_quantity}` : ''}</div>
      </div>
      {actual ? <StatePill value={actual.usage_state} /> : <span className="text-[10px] font-semibold text-zinc-700">NO ACTUAL</span>}
    </div>
    {actual ? (
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-zinc-500">{actual.quantity != null ? `Actual qty ${actual.quantity}` : 'Quantity not asserted'}{actual.notes ? ` · ${actual.notes}` : ''}</div>
        <button type="button" onClick={onConfirm} className="text-xs font-semibold text-emerald-500 hover:text-emerald-300">Edit actual</button>
      </div>
    ) : (
      <div className="mt-2 flex justify-end"><button type="button" onClick={onConfirm} className="text-xs font-semibold text-emerald-500 hover:text-emerald-300">Confirm actual use</button></div>
    )}
  </div>
}

function AssignmentActualRow({ item, saving, onComplete }: { item: ActualAssignment; saving: boolean; onComplete: () => void }) {
  const name = item.member?.display_name ?? item.member?.username ?? 'Unknown contributor'
  return <div className="rounded-xl border border-zinc-900 bg-zinc-950/70 p-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-sm font-medium text-zinc-200">{name}</div>
        <div className="mt-1 text-xs text-zinc-600">{item.role_label || item.role_code.replaceAll('_', ' ')}</div>
      </div>
      <StatePill value={item.assignment_state} />
    </div>
    {item.scope_summary && <p className="mt-2 text-xs leading-5 text-zinc-500">{item.scope_summary}</p>}
    {item.assignment_state === 'CONFIRMED' && <div className="mt-2 flex justify-end"><button type="button" disabled={saving} onClick={onComplete} className="text-xs font-semibold text-emerald-500 hover:text-emerald-300 disabled:opacity-40">Mark actually completed</button></div>}
  </div>
}

function UsageModal({ item, saving, onClose, onSave }: { item: ActualResourceCandidate; saving: boolean; onClose: () => void; onSave: (data: FormData) => Promise<void> }) {
  const actual = item.actual
  return <Modal title={`Confirm actual · ${item.resource_name}`} onClose={onClose}>
    <form action={(data) => void onSave(data)} className="mt-5 grid gap-3">
      <label className="text-xs text-zinc-500">Actual state<select name="usage_state" defaultValue={actual?.usage_state ?? 'COMPLETE'} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-zinc-100"><option value="IN_USE">In use</option><option value="RETURNED">Returned</option><option value="CONSUMED">Consumed</option><option value="COMPLETE">Complete</option></select></label>
      <label className="text-xs text-zinc-500">Actual quantity <span className="text-zinc-700">optional</span><input name="quantity" type="number" min="0" step="any" defaultValue={actual?.quantity ?? item.planned_quantity ?? ''} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-zinc-100" /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-zinc-500">Actually from <span className="text-zinc-700">optional</span><input name="used_from" type="datetime-local" defaultValue={toLocalInput(actual?.used_from ?? null)} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-zinc-100" /></label>
        <label className="text-xs text-zinc-500">Actually through <span className="text-zinc-700">optional</span><input name="used_through" type="datetime-local" defaultValue={toLocalInput(actual?.used_through ?? null)} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-zinc-100" /></label>
      </div>
      <textarea name="notes" defaultValue={actual?.notes ?? ''} rows={3} placeholder="Only useful actual differences or context" className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-zinc-100" />
      <p className="text-xs leading-5 text-zinc-600">This creates or updates actual usage only because you are explicitly confirming it. The planned/configured record stays intact for variance and learning.</p>
      <button disabled={saving} className="rounded-xl bg-emerald-500 px-4 py-3 font-bold text-zinc-950 disabled:opacity-50">{saving ? 'Saving…' : 'Confirm actual'}</button>
    </form>
  </Modal>
}

function ActualCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-4">
    <div className="text-xs font-semibold tracking-[0.15em] text-zinc-600">{title.toUpperCase()}</div>
    <p className="mt-1 text-xs leading-5 text-zinc-700">{subtitle}</p>
    <div className="mt-3">{children}</div>
  </div>
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-end bg-black/75 p-3 sm:items-center sm:justify-center"><div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-5"><div className="flex items-center justify-between"><h3 className="text-lg font-semibold text-zinc-100">{title}</h3><button type="button" onClick={onClose} className="text-sm text-zinc-500 hover:text-zinc-200">Close</button></div>{children}</div></div>
}

function deliveryIsRelevant(startDate: string | null, endDate: string | null, operationalState: string) {
  if (['ACTIVE', 'COMPLETE', 'CLOSED'].includes(operationalState)) return true
  const date = endDate || startDate
  if (!date) return false
  return date <= localDateKey(new Date())
}

function localDateKey(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function StatePill({ value }: { value: string }) { return <span className="rounded-full border border-zinc-800 px-2 py-1 text-[10px] font-semibold tracking-wide text-zinc-500">{value.replaceAll('_', ' ')}</span> }
function EmptyState({ text }: { text: string }) { return <p className="py-3 text-sm leading-6 text-zinc-600">{text}</p> }
function clean(value: FormDataEntryValue | null) { const text = value == null ? '' : String(value).trim(); return text || null }
function localToIso(value: string | null) { return value ? new Date(value).toISOString() : null }
function toLocalInput(value: string | null) { if (!value) return ''; const d = new Date(value); const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 16) }
