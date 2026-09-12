import { CapabilityEconomicsPanel } from '../components/CapabilityEconomicsPanel'
import type { Resource } from '../types/domain'

export function ResourcesScreen({ resources }: { resources: Resource[] }) {
  const groups = resources.reduce<Record<string, Resource[]>>((acc, resource) => {
    ;(acc[resource.category] ??= []).push(resource)
    return acc
  }, {})

  const owned = resources.filter(resource => resource.sourcing_model === 'OWNED').length
  const external = resources.filter(resource => ['SUBCONTRACTED', 'PARTNER', 'VENUE'].includes(resource.sourcing_model)).length
  const unknown = resources.filter(resource => resource.sourcing_model === 'UNKNOWN').length

  return (
    <div className="sm:ml-48">
      <div className="mb-6">
        <p className="text-sm text-zinc-500">What can Stage Presence actually deliver, and how strong is the evidence behind that capability?</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Capability</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">Capability is larger than owned inventory. It includes owned Resources, subcontracted capacity, partners and venue-supported infrastructure. The OS keeps capability identity, availability, economics and actual use distinct.</p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Summary label="Owned" value={owned} />
        <Summary label="External / partner" value={external} />
        <Summary label="Sourcing unknown" value={unknown} warn={unknown > 0} />
      </div>

      <CapabilityEconomicsPanel />

      <div className="mb-4 mt-10">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-700">Capability catalog</div>
        <p className="mt-1 text-xs leading-5 text-zinc-600">Canonical Resource identities and the evidence currently represented about quantity, sourcing and reference price.</p>
      </div>

      <div className="space-y-8">
        {Object.entries(groups).map(([category, items]) => (
          <section key={category}>
            <h2 className="mb-3 text-sm font-semibold tracking-[0.16em] text-zinc-500">{category}</h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {items.map((resource) => (
                <article key={resource.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-zinc-100">{resource.name}</h3>
                      <div className="mt-1 text-[10px] text-zinc-700">{resource.sourcing_model.replaceAll('_', ' ')}</div>
                    </div>
                    <span className="rounded-full border border-zinc-800 px-2 py-1 text-[10px] font-semibold text-zinc-500">{resource.quantity_state}</span>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-zinc-600">Quantity</dt><dd className="mt-1 text-zinc-300">{resource.quantity ?? 'Unknown'}</dd></div>
                    <div><dt className="text-zinc-600">Reference price</dt><dd className="mt-1 text-zinc-300">{resource.reference_price == null ? 'Unknown' : `$${resource.reference_price.toLocaleString()}`}</dd></div>
                  </dl>
                  <div className="mt-3 text-xs text-zinc-600">Price state: {resource.price_state.replaceAll('_', ' ')}</div>
                  {resource.source && <div className="mt-1 text-xs text-zinc-700">Source: {resource.source}</div>}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function Summary({ label, value, warn=false }: { label: string; value: number; warn?: boolean }) {
  return <div className={`rounded-2xl border p-4 ${warn ? 'border-amber-950/60 bg-amber-950/10' : 'border-zinc-900 bg-zinc-950/55'}`}><div className={`text-2xl font-semibold ${warn ? 'text-amber-400' : 'text-zinc-200'}`}>{value}</div><div className="mt-1 text-[10px] uppercase tracking-[0.08em] text-zinc-600">{label}</div></div>
}
