import { useMemo, useState } from 'react'
import type { PlaybookStepRow } from '../lib/operatingRepository'

const filters = ['EVENT', 'LONG_TERM_RENTAL', 'INSTALLATION', 'EQUIPMENT_SALE', 'SERVICE', 'ALL'] as const

type Filter = (typeof filters)[number]

export function PlaybookScreen({ steps }: { steps: PlaybookStepRow[] }) {
  const [filter, setFilter] = useState<Filter>('EVENT')
  const visible = useMemo(() => steps.filter((step) => filter === 'ALL' || step.applies_to_engagement_types.length === 0 || step.applies_to_engagement_types.includes(filter)), [steps, filter])
  const phases = useMemo(() => groupPhases(visible), [visible])
  const core = visible.filter((step) => step.requiredness === 'CORE').length
  const human = visible.filter((step) => step.automation_mode === 'HUMAN').length
  const mapOnly = visible.filter((step) => step.procedure_depth === 'MAP_ONLY').length

  return (
    <div className="sm:ml-48">
      <header className="mb-8">
        <p className="text-sm text-zinc-500">The reusable knowledge of how Stage Presence can do the work.</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Playbook</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">This is not a checklist claiming every step happens on every job. It is the operating knowledge map: possible steps, when they matter, default responsibility, automation boundary, completion definition and risk if missed.</p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full border px-3 py-2 text-xs font-semibold ${filter === value ? 'border-amber-700 bg-amber-950/30 text-amber-400' : 'border-zinc-900 text-zinc-600 hover:border-zinc-700 hover:text-zinc-300'}`}>{label(value)}</button>)}
      </div>

      <div className="mb-8 grid grid-cols-4 gap-3">
        <Stat label="Applicable steps" value={visible.length} />
        <Stat label="Phases" value={phases.length} />
        <Stat label="Core steps" value={core} />
        <Stat label="Needs deeper SOP" value={mapOnly} />
      </div>

      <div className="mb-8 rounded-2xl border border-zinc-900 bg-zinc-950/50 p-4 text-xs leading-5 text-zinc-600">
        <span className="font-semibold text-zinc-400">Governance:</span> process knowledge can be automated or taught only to the depth represented here. {human} currently applicable steps remain explicitly human-led; technical and safety steps marked <span className="text-zinc-400">Map only</span> exist in the system but are not pretending to be verified technical SOPs.
      </div>

      <div className="space-y-3">
        {phases.map((phase, index) => (
          <details key={phase.code} open={index < 2} className="rounded-2xl border border-zinc-900 bg-zinc-950/60">
            <summary className="cursor-pointer list-none px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div><div className="text-[10px] font-semibold tracking-[0.14em] text-zinc-700">PHASE {String(index + 1).padStart(2, '0')}</div><h2 className="mt-1 text-lg font-semibold text-zinc-200">{phase.name}</h2></div>
                <div className="rounded-full border border-zinc-900 px-2.5 py-1 text-[10px] text-zinc-600">{phase.steps.length} steps</div>
              </div>
            </summary>
            <div className="border-t border-zinc-900 px-5 py-2">
              {phase.steps.map((step) => <StepCard key={step.step_id} step={step} />)}
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}

function StepCard({ step }: { step: PlaybookStepRow }) {
  return (
    <div className="border-b border-zinc-900 py-4 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-zinc-300">{step.title}</h3>
            <Badge>{step.requiredness.toLowerCase()}</Badge>
            <Badge>{step.automation_mode.toLowerCase()}</Badge>
            <Badge>{step.procedure_depth === 'MAP_ONLY' ? 'map only' : step.procedure_depth.toLowerCase()}</Badge>
            {step.client_touchpoint && <Badge>client touchpoint</Badge>}
          </div>
          {step.condition_text && <p className="mt-2 text-xs leading-5 text-zinc-600">{step.condition_text}</p>}
        </div>
        <div className="text-right text-[10px] uppercase tracking-[0.1em] text-zinc-700">{step.default_role_code?.replaceAll('_', ' ') || 'Role varies'}</div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Knowledge label="Complete when" value={step.completion_definition} />
        <Knowledge label="Risk if missed" value={step.risk_if_missed} />
      </div>
    </div>
  )
}

function Knowledge({ label, value }: { label: string; value: string | null }) {
  return <div className="rounded-xl bg-zinc-900/35 px-3 py-2.5"><div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-700">{label}</div><div className="mt-1 text-xs leading-5 text-zinc-500">{value || 'Not yet defined.'}</div></div>
}
function Badge({ children }: { children: React.ReactNode }) { return <span className="rounded-full border border-zinc-900 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-600">{children}</span> }
function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-4"><div className="text-xl font-semibold text-zinc-200">{value}</div><div className="mt-1 text-[10px] text-zinc-700">{label}</div></div> }
function label(value: Filter) { return value === 'ALL' ? 'All knowledge' : value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()) }
function groupPhases(steps: PlaybookStepRow[]) {
  const map = new Map<string, { code: string; name: string; order: number; steps: PlaybookStepRow[] }>()
  for (const step of steps) {
    const existing = map.get(step.phase_code)
    if (existing) existing.steps.push(step)
    else map.set(step.phase_code, { code: step.phase_code, name: step.phase_name, order: step.phase_order, steps: [step] })
  }
  return [...map.values()].sort((a, b) => a.order - b.order).map((phase) => ({ ...phase, steps: phase.steps.sort((a, b) => a.sort_order - b.sort_order) }))
}
