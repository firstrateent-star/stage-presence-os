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

type AccessState = 'checking' | 'authorized' | 'unauthorized'

type RouteState = {
  screen: ScreenName
  selectedId: string | null
}

function readRoute(): RouteState {
  if (typeof window === 'undefined') return { screen: 'today', selectedId: null }

  const route = window.location.hash.replace(/^#\/?/, '')
  if (route.startsWith('engagement/')) {
    const id = decodeURIComponent(route.slice('engagement/'.length))
    return id ? { screen: 'detail', selectedId: id } : { screen: 'engagements', selectedId: null }
  }

  if (route === 'engagements' || route === 'resources' || route === 'new' || route === 'today') {
    return { screen: route, selectedId: null }
  }

  return { screen: 'today', selectedId: null }
}

function writeRoute(screen: ScreenName, selectedId: string | null = null) {
  if (typeof window === 'undefined') return
  const nextHash = screen === 'detail' && selectedId
    ? `#engagement/${encodeURIComponent(selectedId)}`
    : `#${screen === 'detail' ? 'engagements' : screen}`

  if (window.location.hash !== nextHash) window.history.pushState(null, '', nextHash)
}

export default function App() {
  const initialRoute = readRoute()
  const [session, setSession] = useState<Session | null>(null)
  const [accessState, setAccessState] = useState<AccessState>(isBackendConfigured ? 'checking' : 'authorized')
  const [role, setRole] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(!isBackendConfigured)
  const [screen, setScreen] = useState<ScreenName>(initialRoute.screen)
  const [selectedId, setSelectedId] = useState<string | null>(initialRoute.selectedId)
  const data = useAppData(!isBackendConfigured || accessState === 'authorized')

  async function verifyMembership(current: Session | null) {
    if (!supabase || !current) {
      setRole(null)
      setAccessState('checking')
      return
    }

    setAccessState('checking')
    const { data: membership, error } = await supabase
      .from('app_members')
      .select('role, active')
      .eq('user_id', current.user.id)
      .maybeSingle()

    if (error || !membership?.active) {
      setRole(null)
      setAccessState('unauthorized')
      return
    }

    setRole(membership.role)
    setAccessState('authorized')
  }

  useEffect(() => {
    if (!supabase) return
    let active = true

    void supabase.auth.getSession().then(async ({ data: { session: current } }) => {
      if (!active) return
      setSession(current)
      if (current) await verifyMembership(current)
      setAuthReady(true)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      void verifyMembership(nextSession).finally(() => setAuthReady(true))
    })

    return () => {
      active = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    function restoreRoute() {
      const route = readRoute()
      setScreen(route.screen)
      setSelectedId(route.selectedId)
    }

    window.addEventListener('hashchange', restoreRoute)
    window.addEventListener('popstate', restoreRoute)
    return () => {
      window.removeEventListener('hashchange', restoreRoute)
      window.removeEventListener('popstate', restoreRoute)
    }
  }, [])

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    setSession(null)
    setRole(null)
    setAccessState('checking')
  }

  function navigate(nextScreen: ScreenName) {
    setScreen(nextScreen)
    if (nextScreen !== 'detail') setSelectedId(null)
    writeRoute(nextScreen)
  }

  function openEngagement(id: string) {
    setSelectedId(id)
    setScreen('detail')
    writeRoute('detail', id)
  }

  if (!authReady || (isBackendConfigured && session && accessState === 'checking')) {
    return <div className="grid min-h-screen place-items-center bg-zinc-950 text-zinc-500">Loading…</div>
  }

  if (isBackendConfigured && !session) return <LoginScreen />

  if (isBackendConfigured && session && accessState === 'unauthorized') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div className="text-xs font-semibold tracking-[0.22em] text-amber-500">STAGE PRESENCE</div>
          <h1 className="mt-3 text-2xl font-semibold">Access not enabled</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">This account is authenticated, but it is not an active Stage Presence OS member. Ask an administrator to enable access.</p>
          <button type="button" onClick={() => void signOut()} className="mt-6 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-200">Sign out</button>
        </div>
      </div>
    )
  }

  return (
    <AppShell current={screen} onNavigate={navigate} onSignOut={() => void signOut()} accountLabel={role ?? undefined}>
      {data.demoMode && (
        <div className="sm:ml-48 mb-5 rounded-xl border border-sky-900/60 bg-sky-950/20 px-4 py-3 text-xs leading-5 text-sky-300">
          DEMO MODE — no backend is connected. Records shown are synthetic and are not Stage Presence business data.
        </div>
      )}
      {data.error && <div className="sm:ml-48 mb-5 rounded-xl border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-300">{data.error}</div>}
      {data.loading ? (
        <div className="sm:ml-48 py-20 text-zinc-600">Loading shared reality…</div>
      ) : screen === 'today' ? (
        <TodayScreen
          engagements={data.engagements}
          events={data.events}
          customerLinks={data.customerLinks}
          configuredLinks={data.configuredLinks}
          attentionFacts={data.attentionFacts}
          engagementRelationships={data.engagementRelationships}
          financialFacts={data.financialFacts}
          onOpen={openEngagement}
        />
      ) : screen === 'engagements' ? (
        <EngagementsScreen engagements={data.engagements} onOpen={openEngagement} />
      ) : screen === 'resources' ? (
        <ResourcesScreen resources={data.resources} />
      ) : screen === 'new' ? (
        <NewEngagementScreen onCancel={() => navigate('today')} onCreated={() => { void data.refresh(); navigate('engagements') }} />
      ) : (
        <EngagementDetailScreen engagement={data.engagements.find((item) => item.id === selectedId)} onBack={() => navigate('engagements')} onChanged={data.refresh} />
      )}
    </AppShell>
  )
}
