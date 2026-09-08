import { EngagementCard } from '../components/EngagementCard'
import type { Engagement } from '../types/domain'

export function EngagementsScreen({ engagements, onOpen }: { engagements: Engagement[]; onOpen: (id: string) => void }) {
  return (
    <div className="sm:ml-48">
      <div className="mb-6">
        <p className="text-sm text-zinc-500">One continuous record from possibility through delivery.</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Engagements</h1>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {engagements.map((item) => <EngagementCard key={item.id} engagement={item} onOpen={onOpen} />)}
      </div>
    </div>
  )
}
