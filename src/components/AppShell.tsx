import type { ReactNode } from 'react'

export type ScreenName = 'today' | 'engagements' | 'new' | 'explore' | 'system' | 'relationships' | 'resources' | 'economy' | 'recovery' | 'detail'

export function AppShell({
  current,
  onNavigate,
  onSignOut,
  accountLabel,
  ownerMode = false,
  children,
}: {
  current: ScreenName
  onNavigate: (screen: ScreenName) => void
  onSignOut?: () => void
  accountLabel?: string
  ownerMode?: boolean
  children: ReactNode
}) {
  const primary = ownerMode
    ? ([['today', 'Today'], ['new', 'Capture']] as const)
    : ([['today', 'Today'], ['engagements', 'Work'], ['new', 'Capture'], ['explore', 'Explore']] as const)

  const workActive = current === 'engagements' || current === 'detail'
  const exploreActive = ['explore', 'relationships', 'resources', 'economy'].includes(current)
  const systemActive = current === 'system' || current === 'recovery'

  return (
    <div className="min-h-screen bg-[#090909] text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-zinc-900/90 bg-[#090909]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <button type="button" onClick={() => onNavigate('today')} className="group flex items-center gap-3 text-left">
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-amber-900/50 bg-amber-950/20 text-sm font-bold text-amber-400">SP</div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-500">Stage Presence</div>
              <div className="text-sm font-medium text-zinc-300">{ownerMode ? 'Owner View' : 'Operating System'}</div>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {accountLabel && <span className="hidden rounded-full border border-zinc-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600 md:inline">{accountLabel}</span>}
            <button type="button" onClick={() => onNavigate('new')} className="rounded-xl bg-amber-500 px-3.5 py-2.5 text-sm font-bold text-zinc-950 transition hover:bg-amber-400">Capture</button>
            {onSignOut && <button type="button" onClick={onSignOut} className="hidden rounded-xl border border-zinc-900 px-3 py-2.5 text-xs font-semibold text-zinc-600 hover:border-zinc-700 hover:text-zinc-300 sm:block">Sign out</button>}
          </div>
        </div>
      </header>

      <aside className="fixed inset-y-0 left-0 top-[65px] z-20 hidden w-52 border-r border-zinc-900/80 bg-[#090909] lg:block">
        <div className="flex h-full flex-col px-4 py-5">
          <nav className="space-y-1">
            {primary.map(([value, label]) => {
              const active = value === 'engagements' ? workActive : value === 'explore' ? exploreActive : current === value
              return <button key={value} type="button" onClick={() => onNavigate(value)} className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${active ? 'bg-zinc-900 text-zinc-100' : 'text-zinc-600 hover:bg-zinc-950 hover:text-zinc-300'}`}>{label}</button>
            })}
          </nav>

          <div className="mt-auto border-t border-zinc-900 pt-4">
            {ownerMode && <button type="button" onClick={() => onNavigate('engagements')} className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium ${workActive ? 'bg-zinc-900 text-zinc-100' : 'text-zinc-700 hover:text-zinc-400'}`}>All work</button>}
            <button type="button" onClick={() => onNavigate('system')} className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium ${systemActive ? 'bg-zinc-900 text-zinc-100' : 'text-zinc-700 hover:text-zinc-400'}`}>System</button>
            {onSignOut && <button type="button" onClick={onSignOut} className="mt-1 w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-zinc-800 hover:text-zinc-500">Sign out</button>}
          </div>
        </div>
      </aside>

      <main className="mx-auto max-w-[1320px] px-4 pb-28 pt-6 sm:px-6 lg:ml-52 lg:px-8 lg:pb-12">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-800 bg-[#090909]/95 px-2 pb-[max(.65rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden">
        <div className={`grid gap-1 ${ownerMode ? 'grid-cols-3' : 'grid-cols-4'}`}>
          {primary.map(([value, label]) => {
            const active = value === 'engagements' ? workActive : value === 'explore' ? exploreActive : current === value
            return <button key={value} type="button" onClick={() => onNavigate(value)} className={`rounded-xl px-1 py-2.5 text-[10px] font-semibold ${active ? 'bg-zinc-900 text-zinc-100' : 'text-zinc-600'}`}>{label}</button>
          })}
          {ownerMode && <button type="button" onClick={() => onNavigate('engagements')} className={`rounded-xl px-1 py-2.5 text-[10px] font-semibold ${workActive ? 'bg-zinc-900 text-zinc-100' : 'text-zinc-700'}`}>All work</button>}
        </div>
      </nav>
    </div>
  )
}
