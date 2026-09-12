import { supabase } from './supabase'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured.')
  return supabase
}

export type RealityHealthState = 'SUPPORTED' | 'PARTIAL' | 'UNKNOWN' | 'NOT_YET_OBSERVED' | 'DECISION_RELEVANT_GAP'

export interface RealityHealthRow {
  domain: string
  state: RealityHealthState
  summary: string
  evidence: string
}

export interface RealityHealthSnapshot {
  rows: RealityHealthRow[]
  reviewTraceCount: number
}

export async function getRealityHealth(): Promise<RealityHealthSnapshot> {
  const client = requireClient()
  const [
    activeEngagements,
    commercialDocs,
    fulfillmentPlans,
    scheduleItems,
    assignments,
    commitments,
    usage,
    costs,
    payments,
    closeouts,
    relationshipRows,
    captureReviews,
    economyRows,
  ] = await Promise.all([
    client.from('engagements').select('id').is('archived_at', null),
    client.from('commercial_documents').select('engagement_id'),
    client.from('fulfillment_plans').select('engagement_id'),
    client.from('engagement_schedule_items').select('engagement_id'),
    client.from('engagement_assignments').select('engagement_id,assignment_state'),
    client.from('resource_commitments').select('engagement_id,commitment_state'),
    client.from('resource_usage').select('engagement_id'),
    client.from('engagement_cost_items').select('engagement_id,cost_state'),
    client.from('commercial_payments').select('engagement_id'),
    client.from('engagement_closeouts').select('engagement_id'),
    client.from('relationship_summary_v').select('party_id,engagement_count'),
    client.from('events').select('id').eq('event_type', 'CAPTURE_REVIEW_RECORDED'),
    client.from('engagement_economy_v').select('engagement_id,collected_observed,payment_record_count'),
  ])

  const results = [activeEngagements, commercialDocs, fulfillmentPlans, scheduleItems, assignments, commitments, usage, costs, payments, closeouts, relationshipRows, captureReviews, economyRows]
  for (const result of results) if (result.error) throw result.error

  const activeCount = activeEngagements.data?.length ?? 0
  const distinct = (rows: Array<{ engagement_id: string | null }> | null | undefined) => new Set((rows ?? []).map(row => row.engagement_id).filter(Boolean)).size
  const docsCoverage = distinct(commercialDocs.data)
  const fulfillmentCoverage = distinct(fulfillmentPlans.data)
  const scheduleCoverage = distinct(scheduleItems.data)
  const assignmentCoverage = distinct(assignments.data)
  const commitmentCoverage = distinct(commitments.data)
  const usageCoverage = distinct(usage.data)
  const costCoverage = distinct(costs.data)
  const paymentCoverage = distinct(payments.data)
  const closeoutCoverage = distinct(closeouts.data)
  const relationshipCount = relationshipRows.data?.length ?? 0
  const observedCollections = (economyRows.data ?? []).filter(row => row.collected_observed != null && Number(row.collected_observed) > 0).length
  const reviewTraceCount = captureReviews.data?.length ?? 0

  const rows: RealityHealthRow[] = [
    coverageRow('Commercial', docsCoverage, activeCount, 'Commercial documents are broadly represented for active Engagements.'),
    coverageRow('Fulfillment', fulfillmentCoverage, activeCount, 'Fulfillment plans represent accepted or configured delivery scope.'),
    {
      domain: 'Relationships',
      state: relationshipCount > 0 ? 'SUPPORTED' : 'NOT_YET_OBSERVED',
      summary: relationshipCount > 0 ? 'Relationship memory is represented across parties and Engagement history.' : 'No relationship memory has been observed yet.',
      evidence: `${relationshipCount} relationship summaries`,
    },
    observationRow('Schedule', scheduleCoverage, activeCount, 'Execution timing is represented for some Engagements.'),
    observationRow('Crew', assignmentCoverage, activeCount, 'Job-specific crew evidence is beginning to accumulate.'),
    observationRow('Capacity commitments', commitmentCoverage, activeCount, 'Resource holds/reservations/allocations are beginning to accumulate.'),
    observationRow('Actual equipment use', usageCoverage, activeCount, 'Actual deployment evidence is beginning to accumulate.'),
    observationRow('Direct costs', costCoverage, activeCount, 'Engagement-level direct cost evidence is beginning to accumulate.'),
    {
      domain: 'Collections',
      state: paymentCoverage > 0 ? 'PARTIAL' : observedCollections > 0 ? 'PARTIAL' : 'NOT_YET_OBSERVED',
      summary: paymentCoverage > 0
        ? 'Transaction-level payment evidence exists, but coverage is not asserted complete.'
        : observedCollections > 0
          ? 'Collected amounts are visible from imported/baseline evidence, but transaction-level payments are not yet represented.'
          : 'Collection evidence has not yet been observed.',
      evidence: `${paymentCoverage} Engagements with payment rows · ${observedCollections} with observed collected value`,
    },
    observationRow('Closeout / outcomes', closeoutCoverage, activeCount, 'Delivery outcomes and learning are beginning to accumulate.'),
    {
      domain: 'Capture learning',
      state: reviewTraceCount > 0 ? 'PARTIAL' : 'NOT_YET_OBSERVED',
      summary: reviewTraceCount > 0 ? 'Human review traces now exist for Capture Intelligence.' : 'Capture review telemetry is ready, but no live review traces have been observed yet.',
      evidence: `${reviewTraceCount} review traces`,
    },
  ]

  return { rows, reviewTraceCount }
}

function coverageRow(domain: string, represented: number, total: number, supportedSummary: string): RealityHealthRow {
  if (!total) return { domain, state: 'UNKNOWN', summary: 'No active Engagement baseline is available.', evidence: '0 active Engagements' }
  if (represented >= total) return { domain, state: 'SUPPORTED', summary: supportedSummary, evidence: `${represented} of ${total} active Engagements represented` }
  if (represented > 0) return { domain, state: 'PARTIAL', summary: 'The domain is represented, but not across all active Engagements.', evidence: `${represented} of ${total} active Engagements represented` }
  return { domain, state: 'NOT_YET_OBSERVED', summary: 'This domain has not yet accumulated operating evidence.', evidence: `0 of ${total} active Engagements represented` }
}

function observationRow(domain: string, represented: number, total: number, partialSummary: string): RealityHealthRow {
  if (!represented) return { domain, state: 'NOT_YET_OBSERVED', summary: 'No operating evidence has been observed here yet. This does not mean the activity did not happen.', evidence: `0 Engagements represented${total ? ` · ${total} active Engagements` : ''}` }
  return { domain, state: represented >= total && total > 0 ? 'SUPPORTED' : 'PARTIAL', summary: partialSummary, evidence: `${represented} Engagements represented${total ? ` · ${total} active Engagements` : ''}` }
}
