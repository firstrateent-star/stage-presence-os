import type { Resource } from '../types/domain'

export function ResourcesScreen({ resources }: { resources: Resource[] }) {
  const groups = resources.reduce<Record<string, Resource[]>>((acc, resource) => {
    ;(acc[resource.category] ??= []).push(resource)
    return acc
  }, {})

  return (
    <div className="sm:ml-48">
      <div className="mb-6">
        <p className="text-sm text-zinc-500">What we currently believe Stage Presence can deploy.</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Resources</h1>
      </div>
      <div className="space-y-8">
        {Object.entries(groups).map(([category, items]) => (
          <section key={category}>
            <h2 className="mb-3 text-sm font-semibold tracking-[0.16em] text-zinc-500">{category}</h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {items.map((resource) => (
                <article key={resource.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-semibold text-zinc-100">{resource.name}</h3>
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
