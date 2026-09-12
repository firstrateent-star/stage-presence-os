import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AppShell, type ScreenName } from './components/AppShell'
import { CapacityDefaultsPanel } from './components/CapacityDefaultsPanel'
import { CommercialIntelligencePanel } from './components/CommercialIntelligencePanel'
import { ContextualCapturePanel } from './components/ContextualCapturePanel'
import { DeliveryActualsPanel } from './components/DeliveryActualsPanel'
import { EconomicActualsBridgePanel } from './components/EconomicActualsBridgePanel'
import { EngagementBusinessStory } from './components/EngagementBusinessStory'
import { EngagementEconomyPanel } from './components/EngagementEconomyPanel'
import { JobMapPanel } from './components/JobMapPanel'
import { LearningCloseoutSlot } from './components/LearningCloseoutSlot'
import { MovementFocusPanel } from './components/MovementFocusPanel'
import { EngagementDetailScreen } from './screens/EngagementDetailScreen'
import { NewEngagementScreen } from './screens/NewEngagementScreen'
import { LoginScreen } from './screens/LoginScreen'
import { RecoveryScreen } from './screens/RecoveryScreen'
import {
  CapabilityV2,
  EconomyV2,
  EngagementsV2,
  RelationshipsV2,
  TodayV2,
} from './screens/OperatingSurfaceV2'
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
  if (['engagements', 'relationships', 'recovery', 'economy', 'resources', 'new', 'today'].includes(route)) {
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

function DetailSection({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-700">{eyebrow}</div>
        <h2 className="mt-1 text-lg font-semibold text-zinc-200">{title}</h2>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-600">{description}</p>
      </div>
      {children}
    </section>
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
        <div className="rounded-2xl border border-zinc-900 p-8 text-sm text-zinc-500">Connect the Stage Presence backend to use the rebuilt operating surface.</div>
      ) : screen === 'today' ? (
        <TodayV2 engagements={surface.engagements} recovery={surface.recovery} role={role} onOpen={openEngagement} onCapture={() => navigate('new')} />
      ) : screen === 'engagements' ? (
        <EngagementsV2 engagements={surface.engagements} onOpen={openEngagement} />
      ) : screen === 'relationships' ? (
        <RelationshipsV2 relationships={surface.relationships} />
      ) : screen === 'resources' ? (
        <CapabilityV2 capabilities={surface.capabilities} />
      ) : screen === 'economy' ? (
        <EconomyV2 economy={surface.economy} />
      ) : screen === 'recovery' ? (
        <RecoveryScreen onOpenEngagement={openEngagement} />
      ) : screen === 'new' ? (
        <NewEngagementScreen onCancel={() => navigate('today')} onCreated={() => { void refreshAll(); navigate('engagements') }} />
      ) : selectedEngagement ? (
        <div className="mx-auto max-w-6xl">
          <button type="button" onClick={() => navigate('engagements')} className="mb-5 text-sm text-zinc-600 hover:text-zinc-300">← Engagements</button>
          <div className="flex flex-col gap-5 border-b border-zinc-900 pb-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-700">{selectedEngagement.engagement_number}</div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-100">{selectedEngagement.name}</h1>
              <p className="mt-2 text-sm text-zinc-600">One Engagement, one operating story, progressively revealed.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.12em]">
              <span className="rounded-full border border-zinc-800 px-2.5 py-1 text-zinc-500">{selectedEngagement.commercial_state}</span>
              <span className="rounded-full border border-zinc-800 px-2.5 py-1 text-zinc-500">{selectedEngagement.commitment_state}</span>
              <span className="rounded-full border border-zinc-800 px-2.5 py-1 text-zinc-500">{selectedEngagement.operational_state}</span>
              {selectedSummary?.open_work_count ? <span className="rounded-full border border-amber-900/60 bg-amber-950/20 px-2.5 py-1 text-amber-400">{selectedSummary.open_work_count} open work</span> : null}
            </div>
          </div>

          <DetailSection eyebrow="Reality intake" title="What changed?" description="The fastest way to keep the OS aligned with what is actually happening.">
            <ContextualCapturePanel engagementId={selectedEngagement.id} engagementName={selectedEngagement.name} eventDate={selectedEngagement.event_start_date} onApplied={() => void refreshAll()} />
          </DetailSection>

          <DetailSection eyebrow="Business story" title="Why · Who · What" description="Customer intent, relationship, represented solution, and the evidence behind the Engagement.">
            <EngagementBusinessStory engagement={selectedEngagement} customerLinks={legacy.customerLinks} configuredLinks={legacy.configuredLinks} financialFacts={legacy.financialFacts} capacityPressures={selectedCapacityPressures} />
          </DetailSection>

          <DetailSection eyebrow="Movement" title="What needs to happen next?" description="Committed work and selective movement stay distinct from general information.">
            <MovementFocusPanel engagementId={selectedEngagement.id} />
          </DetailSection>

          <DetailSection eyebrow="Commercial + economics" title="Money" description="Commercial evidence, collections, direct costs, contribution readiness, and pricing intelligence remain separate truths.">
            <div className="space-y-5">
              <EngagementEconomyPanel engagementId={selectedEngagement.id} onChanged={refreshAll} />
              <CommercialIntelligencePanel engagementId={selectedEngagement.id} />
            </div>
          </DetailSection>

          <DetailSection eyebrow="Fulfillment" title="How · Where · When · Who" description="The operational plan, delivery map, people, timing, and committed capacity.">
            <JobMapPanel engagementId={selectedEngagement.id} />
            <details className="mt-5 rounded-2xl border border-zinc-900 bg-zinc-950/40">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-zinc-400 hover:text-zinc-200">Working details + canonical controls</summary>
              <div className="border-t border-zinc-900 p-5">
                <EngagementDetailScreen engagement={selectedEngagement} onBack={() => navigate('engagements')} onChanged={refreshAll} />
                <CapacityDefaultsPanel engagement={selectedEngagement} onSaved={refreshAll} />
              </div>
            </details>
          </DetailSection>

          <DetailSection eyebrow="Actuals" title="What actually happened?" description="Delivery actuals and economic actuals should be captured after reality occurs — never inferred from the plan.">
            <div className="space-y-5">
              <DeliveryActualsPanel engagementId={selectedEngagement.id} eventStartDate={selectedEngagement.event_start_date} eventEndDate={selectedEngagement.event_end_date} operationalState={selectedEngagement.operational_state} onChanged={refreshAll} />
              <EconomicActualsBridgePanel engagementId={selectedEngagement.id} onChanged={refreshAll} />
            </div>
          </DetailSection>

          <DetailSection eyebrow="Learning" title="Close the loop" description="Outcome, variance, venue memory, recurrence, and what Stage Presence should carry forward.">
            <LearningCloseoutSlot engagementId={selectedEngagement.id} eventEndDate={selectedEngagement.event_end_date} commercialState={selectedEngagement.commercial_state} commitmentState={selectedEngagement.commitment_state} onSaved={refreshAll} />
          </DetailSection>
        </div>
      ) : (
        <div className="py-16 text-zinc-600">Engagement not found.</div>
      )}
    </AppShell>
  )
}
