import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AppShell, type ScreenName } from './components/AppShell'
import { CapacityDefaultsPanel } from './components/CapacityDefaultsPanel'
import { CommercialIntelligencePanel } from './components/CommercialIntelligencePanel'
import { ContextualCapturePanel } from './components/ContextualCapturePanel'
import { DeliveryActualsPanel } from './components/DeliveryActualsPanel'
import { EconomicActualsBridgePanel } from './components/EconomicActualsBridgePanel'
import { EngagementEconomyPanel } from './components/EngagementEconomyPanel'
import { JobMapPanel } from './components/JobMapPanel'
import { LearningCloseoutSlot } from './components/LearningCloseoutSlot'
import { MovementFocusPanel } from './components/MovementFocusPanel'
import { EngagementDetailScreen } from './screens/EngagementDetailScreen'
import { NewEngagementScreen } from './screens/NewEngagementScreen'
import { LoginScreen } from './screens/LoginScreen'
import { RecoveryScreen } from './screens/RecoveryScreen'
import { CapabilityV2, EconomyV2, RelationshipsV2 } from './screens/OperatingSurfaceV2'
import { ExploreHub, HumanToday, HumanWork, SystemHub, WorkStory } from './screens/HumanInterfaceV2'
import { buildBusinessSignals } from './lib/businessSignals'
import { supabase } from './lib/supabase'
import { isBackendConfigured } from './lib/config'
import { useAppData } from './lib/useAppData'
import { useOperatingSurface } from './lib/useOperatingSurface'

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
  if (['today', 'engagements', 'new', 'explore', 'system', 'relationships', 'resources', 'economy', 'recovery'].includes(route)) {
    return { screen: route as ScreenName, selectedId: null }
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

function Disclosure({ title, description, children, open = false }: { title: string; description: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="rounded-2xl border border-zinc-900 bg-zinc-950/35">
      <summary className="cursor-pointer list-none px-5 py-4 marker:hidden">
        <div className="flex items-center justify-between gap-4">
          <div><div className="text-sm font-semibold text-zinc-200">{title}</div><div className="mt-1 text-xs leading-5 text-zinc-600">{description}</div></div>
          <span className="text-zinc-700">＋</span>
        </div>
      </summary>
      <div className="border-t border-zinc-900 p-5">{children}</div>
    </details>
  )
}

export default function App() {
  const initialRoute = readRoute()
  const [session, setSession] = useState<Session | null>(null)
  const [accessState, setAccessState] = useState<AccessState>(isBackendConfigured ? 'checking' : 'authorized')
  const [role, setRole] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(!isBackendConfigured)
  const [screen, setScreen] = useState<ScreenName>(initialRoute.screen)
  const [selectedId, setSelectedId] = useState<string | null>(initialRoute.selectedId)

  const canLoad = !isBackendConfigured || accessState === 'authorized'
  const legacy = useAppData(canLoad)
  const surface = useOperatingSurface(isBackendConfigured && accessState === 'authorized')
  const selectedEngagement = legacy.engagements.find((item) => item.id === selectedId)
  const selectedSummary = surface.engagements.find((item) => item.id === selectedId)
  const businessSignals = useMemo(
    () => buildBusinessSignals(legacy.engagements, legacy.customerLinks, legacy.configuredLinks, legacy.attentionFacts, legacy.engagementRelationships, legacy.financialFacts),
    [legacy.engagements, legacy.customerLinks, legacy.configuredLinks, legacy.attentionFacts, legacy.engagementRelationships, legacy.financialFacts],
  )
  const selectedCapacityPressures = selectedEngagement
    ? businessSignals.capacity_pressure.filter((pressure) => pressure.first.id === selectedEngagement.id || pressure.second.id === selectedEngagement.id)
    : []

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

  async function refreshAll() {
    await Promise.all([legacy.refresh(), surface.refresh()])
  }

  if (!authReady || (isBackendConfigured && session && accessState === 'checking')) {
    return <div className="grid min-h-screen place-items-center bg-[#090909] text-zinc-600">Loading Stage Presence…</div>
  }
  if (isBackendConfigured && !session) return <LoginScreen />
  if (isBackendConfigured && session && accessState === 'unauthorized') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090909] px-4 text-zinc-100">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="text-xs font-semibold tracking-[0.22em] text-amber-500">STAGE PRESENCE</div>
          <h1 className="mt-3 text-2xl font-semibold">Access not enabled</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-500">This account is authenticated, but it is not an active Stage Presence OS member.</p>
          <button type="button" onClick={() => void signOut()} className="mt-6 rounded-xl border border-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-300">Sign out</button>
        </div>
      </div>
    )
  }

  const loading = isBackendConfigured ? surface.loading : legacy.loading
  const error = isBackendConfigured ? surface.error : legacy.error

  return (
    <AppShell current={screen} onNavigate={navigate} onSignOut={() => void signOut()} accountLabel={role ?? undefined}>
      {legacy.demoMode && <div className="mb-5 rounded-xl border border-sky-900/60 bg-sky-950/20 px-4 py-3 text-xs leading-5 text-sky-300">DEMO MODE — no backend is connected.</div>}
      {error && <div className="mb-5 rounded-xl border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</div>}

      {loading ? (
        <div className="py-24 text-center text-sm text-zinc-700">Loading operating reality…</div>
      ) : !isBackendConfigured ? (
        <div className="rounded-2xl border border-zinc-900 p-8 text-sm text-zinc-500">Connect the Stage Presence backend to use the operating surface.</div>
      ) : screen === 'today' ? (
        <HumanToday engagements={surface.engagements} recovery={surface.recovery} role={role} onOpen={openEngagement} onCapture={() => navigate('new')} />
      ) : screen === 'engagements' ? (
        <HumanWork engagements={surface.engagements} onOpen={openEngagement} />
      ) : screen === 'new' ? (
        <NewEngagementScreen onCancel={() => navigate('today')} onCreated={() => { void refreshAll(); navigate('engagements') }} />
      ) : screen === 'explore' ? (
        <ExploreHub relationships={surface.relationships} capabilities={surface.capabilities} economy={surface.economy} onOpenRelationships={() => navigate('relationships')} onOpenCapability={() => navigate('resources')} onOpenEconomy={() => navigate('economy')} />
      ) : screen === 'system' ? (
        <SystemHub recovery={surface.recovery} onOpenRecovery={() => navigate('recovery')} />
      ) : screen === 'relationships' ? (
        <RelationshipsV2 relationships={surface.relationships} />
      ) : screen === 'resources' ? (
        <CapabilityV2 capabilities={surface.capabilities} />
      ) : screen === 'economy' ? (
        <EconomyV2 economy={surface.economy} />
      ) : screen === 'recovery' ? (
        <RecoveryScreen onOpenEngagement={openEngagement} />
      ) : selectedEngagement ? (
        <div className="space-y-6">
          <button type="button" onClick={() => navigate('engagements')} className="text-sm text-zinc-600 hover:text-zinc-300">← Work</button>

          <WorkStory
            engagement={selectedEngagement}
            summary={selectedSummary}
            onCapture={<button type="button" onClick={() => document.getElementById('capture-update')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-zinc-950">Capture update</button>}
          />

          <div id="capture-update" className="mx-auto max-w-5xl scroll-mt-24">
            <ContextualCapturePanel engagementId={selectedEngagement.id} engagementName={selectedEngagement.name} eventDate={selectedEngagement.event_start_date} onApplied={() => void refreshAll()} />
          </div>

          <div className="mx-auto max-w-5xl space-y-3">
            <Disclosure title="Manage what happens next" description="Committed work stays separate from general information." open>
              <MovementFocusPanel engagementId={selectedEngagement.id} />
            </Disclosure>

            <Disclosure title="People, timeline + delivery" description="Crew, schedule, capacity, logistics, and fulfillment details when you need them.">
              <div className="space-y-5">
                <JobMapPanel engagementId={selectedEngagement.id} />
                <CapacityDefaultsPanel engagement={selectedEngagement} onSaved={refreshAll} />
                <details className="rounded-xl border border-zinc-900 bg-zinc-950/40">
                  <summary className="cursor-pointer px-4 py-3 text-sm text-zinc-500">Edit facts, people, resources, notes, or attention state</summary>
                  <div className="border-t border-zinc-900 p-4"><EngagementDetailScreen engagement={selectedEngagement} onBack={() => navigate('engagements')} onChanged={refreshAll} /></div>
                </details>
              </div>
            </Disclosure>

            <Disclosure title="Money" description="Quotes, collections, direct costs, contribution readiness, and pricing intelligence stay distinct.">
              <div className="space-y-5">
                <EngagementEconomyPanel engagementId={selectedEngagement.id} onChanged={refreshAll} />
                <CommercialIntelligencePanel engagementId={selectedEngagement.id} />
              </div>
            </Disclosure>

            <Disclosure title="What actually happened?" description="Actual people, equipment, and direct costs belong here only after reality occurs.">
              <div className="space-y-5">
                <DeliveryActualsPanel engagementId={selectedEngagement.id} eventStartDate={selectedEngagement.event_start_date} eventEndDate={selectedEngagement.event_end_date} operationalState={selectedEngagement.operational_state} onChanged={refreshAll} />
                <EconomicActualsBridgePanel engagementId={selectedEngagement.id} onChanged={refreshAll} />
              </div>
            </Disclosure>

            <Disclosure title="What should we remember?" description="Outcome, variance, recurrence, venue memory, and learning close the loop.">
              <LearningCloseoutSlot engagementId={selectedEngagement.id} eventEndDate={selectedEngagement.event_end_date} commercialState={selectedEngagement.commercial_state} commitmentState={selectedEngagement.commitment_state} onSaved={refreshAll} />
            </Disclosure>
          </div>
        </div>
      ) : (
        <div className="py-16 text-zinc-600">Work not found.</div>
      )}
    </AppShell>
  )
}
