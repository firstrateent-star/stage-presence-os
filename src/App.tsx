import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AppShell, type ScreenName } from './components/AppShell'
import { TodayScreen } from './screens/TodayScreen'
import { EngagementsScreen } from './screens/EngagementsScreen'
import { ResourcesScreen } from './screens/ResourcesScreen'
import { EngagementDetailScreen } from './screens/EngagementDetailScreen'
import { NewEngagementScreen } from './screens/NewEngagementScreen'
import { LoginScreen } from './screens/LoginScreen'
import { supabase } from './lib/supabase'
import { isBackendConfigured } from './lib/config'
import { useAppData } from './lib/useAppData'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(!isBackendConfigured)
  const [screen, setScreen] = useState<ScreenName>('today')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const data = useAppData()

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data: { session: current } }) => {
      setSession(current)
      setAuthReady(true)
    })
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthReady(true)
    })
    return () => authListener.subscription.unsubscribe()
  }, [])

  if (!authReady) return <div className="grid min-h-screen place-items-center bg-zinc-950 text-zinc-500">Loading…</div>
  if (isBackendConfigured && !session) return <LoginScreen />

  function openEngagement(id: string) {
    setSelectedId(id)
    setScreen('detail')
  }

  return (
    <AppShell current={screen} onNavigate={setScreen}>
      {data.demoMode && (
        <div className="sm:ml-48 mb-5 rounded-xl border border-sky-900/60 bg-sky-950/20 px-4 py-3 text-xs leading-5 text-sky-300">
          DEMO MODE — no backend is connected. Records shown are synthetic and are not Stage Presence business data.
        </div>
      )}
      {data.error && <div className="sm:ml-48 mb-5 rounded-xl border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-300">{data.error}</div>}
      {data.loading ? (
        <div className="sm:ml-48 py-20 text-zinc-600">Loading shared reality…</div>
      ) : screen === 'today' ? (
        <TodayScreen engagements={data.engagements} events={data.events} onOpen={openEngagement} />
      ) : screen === 'engagements' ? (
        <EngagementsScreen engagements={data.engagements} onOpen={openEngagement} />
      ) : screen === 'resources' ? (
        <ResourcesScreen resources={data.resources} />
      ) : screen === 'new' ? (
        <NewEngagementScreen onCancel={() => setScreen('today')} onCreated={() => { void data.refresh(); setScreen('engagements') }} />
      ) : (
        <EngagementDetailScreen engagement={data.engagements.find((item) => item.id === selectedId)} onBack={() => setScreen('engagements')} />
      )}
    </AppShell>
  )
}
