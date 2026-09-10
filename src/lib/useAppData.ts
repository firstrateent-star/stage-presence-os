import { useEffect, useState } from 'react'
import { isBackendConfigured } from './config'
import { demoEngagements, demoEvents, demoResources } from './demo'
import { listEngagementRelationships, type EngagementRelationship } from './engagementRelationships'
import { listEngagementFinancialFacts, type EngagementFinancialFact } from './financialFacts'
import { listLearningReviewSignals, type LearningReviewSignal } from './learningCloseout'
import { listEffectiveConfiguredResourceLinks } from './effectiveConfiguredLinks'
import {
  listDailyOperatingWork,
  listEngagementFrontends,
  listOperatingFocus,
  listPlaybookCatalog,
  listRelationshipSummaries,
  type DailyWorkRow,
  type EngagementFrontendRow,
  type MovementCandidateRow,
  type PlaybookStepRow,
  type RelationshipSummaryRow,
} from './operatingRepository'
import { listAttentionFacts, listCustomerLinks, listEngagements, listRecentEvents, listResources, type ConfiguredResourceLink, type CustomerLink } from './repository'
import type { Engagement, EngagementFact, LedgerEvent, Resource } from '../types/domain'

export function useAppData(enabled = true) {
  const [engagements, setEngagements] = useState<Engagement[]>(isBackendConfigured ? [] : demoEngagements)
  const [resources, setResources] = useState<Resource[]>(isBackendConfigured ? [] : demoResources)
  const [events, setEvents] = useState<LedgerEvent[]>(isBackendConfigured ? [] : demoEvents)
  const [customerLinks, setCustomerLinks] = useState<CustomerLink[]>([])
  const [configuredLinks, setConfiguredLinks] = useState<ConfiguredResourceLink[]>([])
  const [attentionFacts, setAttentionFacts] = useState<EngagementFact[]>([])
  const [engagementRelationships, setEngagementRelationships] = useState<EngagementRelationship[]>([])
  const [financialFacts, setFinancialFacts] = useState<EngagementFinancialFact[]>([])
  const [learningReviewSignals, setLearningReviewSignals] = useState<LearningReviewSignal[]>([])
  const [operatingEngagements, setOperatingEngagements] = useState<EngagementFrontendRow[]>([])
  const [dailyWork, setDailyWork] = useState<DailyWorkRow[]>([])
  const [operatingFocus, setOperatingFocus] = useState<MovementCandidateRow[]>([])
  const [relationshipSummaries, setRelationshipSummaries] = useState<RelationshipSummaryRow[]>([])
  const [playbookSteps, setPlaybookSteps] = useState<PlaybookStepRow[]>([])
  const [loading, setLoading] = useState(isBackendConfigured && enabled)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    if (!isBackendConfigured || !enabled) return
    setLoading(true)
    setError(null)
    try {
      const [
        nextEngagements,
        nextResources,
        nextEvents,
        nextCustomers,
        nextConfigured,
        nextAttentionFacts,
        nextRelationships,
        nextFinancialFacts,
        nextLearningReviewSignals,
        nextOperatingEngagements,
        nextDailyWork,
        nextOperatingFocus,
        nextRelationshipSummaries,
        nextPlaybookSteps,
      ] = await Promise.all([
        listEngagements(),
        listResources(),
        listRecentEvents(),
        listCustomerLinks(),
        listEffectiveConfiguredResourceLinks(),
        listAttentionFacts(),
        listEngagementRelationships(),
        listEngagementFinancialFacts(),
        listLearningReviewSignals(),
        listEngagementFrontends(),
        listDailyOperatingWork(),
        listOperatingFocus(),
        listRelationshipSummaries(),
        listPlaybookCatalog(),
      ])
      setEngagements(nextEngagements)
      setResources(nextResources)
      setEvents(nextEvents)
      setCustomerLinks(nextCustomers)
      setConfiguredLinks(nextConfigured)
      setAttentionFacts(nextAttentionFacts)
      setEngagementRelationships(nextRelationships)
      setFinancialFacts(nextFinancialFacts)
      setLearningReviewSignals(nextLearningReviewSignals)
      setOperatingEngagements(nextOperatingEngagements)
      setDailyWork(nextDailyWork)
      setOperatingFocus(nextOperatingFocus)
      setRelationshipSummaries(nextRelationshipSummaries)
      setPlaybookSteps(nextPlaybookSteps)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Stage Presence data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isBackendConfigured) return
    if (!enabled) {
      setLoading(false)
      return
    }
    void refresh()
  }, [enabled])

  return {
    engagements,
    resources,
    events,
    customerLinks,
    configuredLinks,
    attentionFacts,
    engagementRelationships,
    financialFacts,
    learningReviewSignals,
    operatingEngagements,
    dailyWork,
    operatingFocus,
    relationshipSummaries,
    playbookSteps,
    loading,
    error,
    refresh,
    demoMode: !isBackendConfigured,
  }
}
