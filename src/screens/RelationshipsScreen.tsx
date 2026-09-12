import { useMemo, useState } from 'react'
import type { RelationshipSummaryRow } from '../lib/operatingRepository'
import type { CustomerLink } from '../lib/repository'
import type { Engagement } from '../types/domain'

export function RelationshipsScreen({
  relationships,
  customerLinks,
  engagements,
  onOpenEngagement,
}: {
  relationships: RelationshipSummaryRow[]
  customerLinks: CustomerLink[]
  engagements: Engagement[]
  onOpenEngagement: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(relationships[0]?.party_id ?? null)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return relationships
    return relationships.filter((row) => [row.name, row.organization_name, row.email, row.phone].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle)))
  }, [relationships, query])

  const selected = relationships.find((row) => row.party_id === selectedPartyId) ?? filtered[0] ?? null
  const engagementById = useMemo(() => new Map(engagements.map((row) => [row.id, row])), [engagements])
  const selectedEngagements = useMemo(() => {
    if (!selected) return []
    return customerLinks
      .filter((link) => link.party?.id === selected.party_id)
      .map((link) => engagementById.get(link.engagement_id))
      .filter(Boolean)
      .sort((a, b) => dateKey(b!) .localeCompare(dateKey(a!))) as Engagement[]
  }, [selected, customerLinks, engagementById])

  const repeatCount = relationships.filter((row) => row.engagement_count > 1).length
  const futureRelationshipCount = relationships.filter((row) => row.current_future_count > 0).length
  const observedCommitted = relationships.reduce((sum, row) => sum + Number(row.committed_revenue_observed || 0), 0)

  return (
    <div className="sm:ml-48">
      <div className="border-b border-zinc-900 pb-6">
        <div className="text-xs font-semibold tracking-[0.18em] text-amber-500">RELATIONSHIP MEMORY</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-100">Relationships</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">Engagements end. Relationships continue. This surface rolls customer history and observed economics together without creating a separate CRM truth.</p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Repeat relationships" value={String(repeatCount)} detail="More than one represented Engagement" />
        <Metric label="Current / future" value={String(futureRelationshipCount)} detail="Relationships with represented work ahead" />
        <Metric label="Observed committed" value={money(observedCommitted)} detail="Across current relationship evidence" />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
        <section className="rounded-2xl border border-zinc-900 bg-zinc-950/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-semibold tracking-[0.15em] text-zinc-600">RELATIONSHIPS</div>
            <span className="text-xs text-zinc-700">{filtered.length}</span>
          </div>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search person, company, email…" className="mt-3 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-amber-700" />

          <div className="mt-3 max-h-[68vh] space-y-2 overflow-auto pr-1">
            {filtered.map((row) => (
              <button key={row.party_id} type="button" onClick={() => setSelectedPartyId(row.party_id)} className={`w-full rounded-xl border p-3 text-left transition ${selected?.party_id === row.party_id ? 'border-amber-900/70 bg-amber-950/15' : 'border-zinc-900 bg-zinc-950/50 hover:border-zinc-800'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-zinc-200">{row.name}</div>
                    {row.organization_name && <div className="mt-1 truncate text-xs text-zinc-600">{row.organization_name}</div>}
                  </div>
                  <span className="shrink-0 rounded-full border border-zinc-800 px-2 py-1 text-[10px] font-semibold text-zinc-500">{row.engagement_count} job{row.engagement_count === 1 ? '' : 's'}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-zinc-700">
                  {row.current_future_count > 0 && <span>{row.current_future_count} current/future</span>}
                  {Number(row.committed_revenue_observed) > 0 && <span>{money(Number(row.committed_revenue_observed))} committed observed</span>}
                </div>
              </button>
            ))}
            {!filtered.length && <p className="py-6 text-center text-sm text-zinc-700">No relationship matches that search.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-900 bg-zinc-950/60 p-5">
          {selected ? (
            <>
              <div className="flex flex-col gap-3 border-b border-zinc-900 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-[10px] font-bold tracking-[0.14em] text-zinc-700">{selected.party_type}</div>
                  <h2 className="mt-1 text-2xl font-semibold text-zinc-100">{selected.name}</h2>
                  {selected.organization_name && <div className="mt-1 text-sm text-zinc-500">{selected.organization_name}</div>}
                </div>
                <div className="text-sm text-zinc-600">{contactLine(selected)}</div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MiniMetric label="Engagements" value={String(selected.engagement_count)} />
                <MiniMetric label="Current / future" value={String(selected.current_future_count)} />
                <MiniMetric label="Committed observed" value={money(Number(selected.committed_revenue_observed || 0))} />
                <MiniMetric label="Collected observed" value={money(Number(selected.collected_observed || 0))} />
              </div>

              <div className="mt-5 rounded-xl border border-zinc-900 bg-zinc-950/50 p-4">
                <div className="text-[10px] font-bold tracking-[0.13em] text-zinc-700">RELATIONSHIP SPAN</div>
                <div className="mt-2 text-sm text-zinc-300">{dateRange(selected.first_engagement_date, selected.latest_engagement_date)}</div>
                <p className="mt-2 text-xs leading-5 text-zinc-600">Observed committed/collected values are relationship-level evidence rollups, not lifetime value forecasts or accounting claims.</p>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between"><div className="text-xs font-semibold tracking-[0.15em] text-zinc-600">ENGAGEMENT HISTORY</div><span className="text-xs text-zinc-700">{selectedEngagements.length}</span></div>
                <div className="mt-3 space-y-2">
                  {selectedEngagements.map((engagement) => (
                    <button key={engagement.id} type="button" onClick={() => onOpenEngagement(engagement.id)} className="w-full rounded-xl border border-zinc-900 bg-zinc-950/60 p-3 text-left hover:border-zinc-800">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-zinc-200">{engagement.name}</div>
                          <div className="mt-1 text-xs text-zinc-600">{engagement.engagement_number} · {humanState(engagement.commercial_state)} · {humanState(engagement.commitment_state)}</div>
                        </div>
                        <div className="text-xs text-zinc-600">{engagementDate(engagement)}</div>
                      </div>
                    </button>
                  ))}
                  {!selectedEngagements.length && <p className="py-4 text-sm text-zinc-700">No customer Engagement links are available for this relationship.</p>}
                </div>
              </div>
            </>
          ) : <p className="py-12 text-center text-sm text-zinc-700">Choose a relationship to inspect its memory.</p>}
        </section>
      </div>
    </div>
  )
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-zinc-900 bg-zinc-950/60 p-4"><div className="text-[10px] font-bold tracking-[0.13em] text-zinc-700">{label.toUpperCase()}</div><div className="mt-2 text-xl font-semibold text-zinc-200">{value}</div><div className="mt-1 text-xs text-zinc-600">{detail}</div></div>
}
function MiniMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-zinc-900 bg-zinc-950/50 p-3"><div className="text-[10px] font-bold tracking-[0.12em] text-zinc-700">{label.toUpperCase()}</div><div className="mt-1 text-sm font-semibold text-zinc-300">{value}</div></div> }
function money(value: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value) }
function humanState(value: string) { return value.replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()) }
function contactLine(row: RelationshipSummaryRow) { return [row.email, row.phone].filter(Boolean).join(' · ') || 'Contact details not represented' }
function dateRange(first: string | null, latest: string | null) { if (!first && !latest) return 'Relationship timing not represented'; if (first === latest) return formatDate(first); return `${formatDate(first)} → ${formatDate(latest)}` }
function formatDate(value: string | null) { return value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown' }
function dateKey(engagement: Engagement) { return engagement.event_start_date || engagement.event_start?.slice(0, 10) || engagement.updated_at.slice(0, 10) }
function engagementDate(engagement: Engagement) { return formatDate(engagement.event_start_date || engagement.event_start?.slice(0, 10) || null) }
