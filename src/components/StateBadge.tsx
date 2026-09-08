const palette: Record<string, string> = {
  NEW: 'border-zinc-700 bg-zinc-900 text-zinc-300',
  DISCOVERY: 'border-sky-900 bg-sky-950/50 text-sky-300',
  DESIGNING: 'border-violet-900 bg-violet-950/50 text-violet-300',
  PROPOSED: 'border-amber-900 bg-amber-950/50 text-amber-300',
  WON: 'border-emerald-900 bg-emerald-950/50 text-emerald-300',
  LOST: 'border-zinc-800 bg-zinc-950 text-zinc-500',
  WAITING: 'border-amber-900 bg-amber-950/40 text-amber-300',
  BLOCKED: 'border-red-900 bg-red-950/40 text-red-300',
  NEEDS_ATTENTION: 'border-orange-900 bg-orange-950/40 text-orange-300',
  NORMAL: 'border-zinc-800 bg-zinc-950 text-zinc-400',
}

export function StateBadge({ value }: { value: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${palette[value] ?? palette.NORMAL}`}>
      {value.replaceAll('_', ' ')}
    </span>
  )
}
