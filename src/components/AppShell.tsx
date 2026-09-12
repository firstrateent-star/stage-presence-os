import type { ReactNode } from 'react'

export type ScreenName = 'today' | 'engagements' | 'recovery' | 'economy' | 'resources' | 'playbook' | 'new' | 'detail'

export function AppShell({
  current,
  onNavigate,
  onSignOut,
  accountLabel,
  children,
}: {
  current: ScreenName
  onNavigate: (screen: ScreenName) => void
  onSignOut?: () => void
  accountLabel?: string
  children: ReactNode
}) {
  const nav = [
    ['today', 'Today'],
    ['engagements', 'Work'],
    ['recovery', 'Recovery'],
    ['economy', 'Economy'],
    ['resources', 'Resources'],
    ['playbook', 'Playbook'],
  ] as const

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-900 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <button type="button" onClick={() => onNavigate('today')} className="text-left">
            <div className="text-xs font-semibold tracking-[0.22em] text-amber-500">STAGE PRESENCE</div>
            <div className="text-sm font-medium text-zinc-300">Operating System</div>
          </button>
          <div className="flex items-center gap-2">
            {accountLabel && <span className="hidden text-xs font-medium text-zinc-500 sm:inline">{accountLabel}</span>}
            {onSignOut && (
              <button type="button" onClick={onSignOut} className="rounded-xl border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-500 hover:border-zinc-700 hover:text-zinc-200">
                Sign out
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('new')}
              className="rounded-full bg-amber-500 px-4 py-2.5 text-sm font-bold text-zinc-950 shadow-sm transition hover:bg-amber-400"
            >
              + New
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-800 bg-zinc-950/95 px-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur sm:hidden">
        <div className="grid grid-cols-6 gap-1">
          {nav.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onNavigate(value)}
              className={`rounded-xl px-1 py-3 text-[9px] font-semibold ${current === value ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      <aside className="fixed left-6 top-28 hidden w-40 sm:block">
        <div className="space-y-1">
          {nav.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onNavigate(value)}
              className={`w-full rounded-xl px-3 py-2 text-left text-sm font-medium ${current === value ? 'bg-zinc-900 text-zinc-100' : 'text-zinc-500 hover:text-zinc-200'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </aside>
    </div>
  )
}
