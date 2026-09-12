import { supabase } from './supabase'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured. Copy .env.example to .env and add Supabase values.')
  return supabase
}

export type ReadinessTone = 'good' | 'watch' | 'missing' | 'neutral'

export interface ReadinessCheck {
  code: string
  label: string
  tone: ReadinessTone
  value: string
  detail: string
}

export interface DeliveryReadiness {
  posture: 'PRE_COMMITMENT' | 'NEEDS_STRUCTURING' | 'NEEDS_REVIEW' | 'SUPPORTED'
  title: string
  explanation: string
  checks: ReadinessCheck[]
}

type JsonRow = Record<string, unknown>

type WorkspaceRow = {
  id: string
  engagement_type: string
  commercial_state: string
  commitment_state: string
  operational_state: string
  locations: JsonRow[] | null
  schedule: JsonRow[] | null
  assignments: JsonRow[] | null
  work_items: JsonRow[] | null
  resource_commitments: JsonRow[] | null
  fulfillment_plans: JsonRow[] | null
  resources: JsonRow[] | null
}

export async function loadDeliveryReadiness(engagementId: string): Promise<DeliveryReadiness> {
  const client = requireClient()
  const { data, error } = await client
    .from('engagement_workspace_v')
    .select('id,engagement_type,commercial_state,commitment_state,operational_state,locations,schedule,assignments,work_items,resource_commitments,fulfillment_plans,resources')
    .eq('id', engagementId)
    .single()
  if (error) throw error

  return buildDeliveryReadiness(data as WorkspaceRow)
}

export function buildDeliveryReadiness(row: WorkspaceRow): DeliveryReadiness {
  const locations = row.locations ?? []
  const schedule = row.schedule ?? []
  const assignments = row.assignments ?? []
  const work = row.work_items ?? []
  const resourceCommitments = row.resource_commitments ?? []
  const fulfillmentPlans = row.fulfillment_plans ?? []
  const resources = row.resources ?? []

  const committed = row.commercial_state === 'WON' || ['SIGNED', 'DEPOSIT_PENDING', 'CONFIRMED'].includes(row.commitment_state)
  const openWork = work.filter((item) => ['OPEN', 'WAITING', 'BLOCKED'].includes(String(item.status ?? '')))
  const confirmedAssignments = assignments.filter((item) => String(item.assignment_state ?? '') === 'CONFIRMED')
  const tentativeAssignments = assignments.filter((item) => ['POSSIBLE', 'REQUESTED'].includes(String(item.assignment_state ?? '')))
  const weakTiming = schedule.filter((item) => ['TBD', 'UNKNOWN'].includes(String(item.time_state ?? 'UNKNOWN')))

  const checks: ReadinessCheck[] = [
    {
      code: 'commitment',
      label: 'Commercial commitment',
      tone: committed ? 'good' : 'neutral',
      value: committed ? humanState(row.commitment_state === 'UNCOMMITTED' ? row.commercial_state : row.commitment_state) : humanState(row.commitment_state),
      detail: committed ? 'The business has represented commitment evidence.' : 'Delivery readiness should not outrun the commercial decision.',
    },
    {
      code: 'scope',
      label: 'Operational scope',
      tone: fulfillmentPlans.length ? 'good' : committed ? 'missing' : 'neutral',
      value: fulfillmentPlans.length ? `${fulfillmentPlans.length} fulfillment plan${fulfillmentPlans.length === 1 ? '' : 's'}` : 'Not represented',
      detail: fulfillmentPlans.length ? 'Accepted/planned delivery scope is represented separately from the quote document.' : 'No canonical fulfillment plan is represented yet.',
    },
    {
      code: 'place',
      label: 'Venue / place',
      tone: locations.length ? 'good' : committed ? 'missing' : 'neutral',
      value: locations.length ? `${locations.length} location link${locations.length === 1 ? '' : 's'}` : 'Not represented',
      detail: locations.length ? 'A canonical Location is linked to this Engagement.' : 'The system has no canonical place to coordinate against yet.',
    },
    {
      code: 'time',
      label: 'Execution timing',
      tone: !schedule.length ? (committed ? 'missing' : 'neutral') : weakTiming.length ? 'watch' : 'good',
      value: !schedule.length ? 'No schedule' : weakTiming.length ? `${schedule.length} items · ${weakTiming.length} TBD/unknown` : `${schedule.length} scheduled item${schedule.length === 1 ? '' : 's'}`,
      detail: !schedule.length ? 'No native execution timing is represented.' : weakTiming.length ? 'Timing exists, but some clock detail is intentionally unresolved.' : 'Current schedule items have represented timing.',
    },
    {
      code: 'people',
      label: 'Crew / responsibility',
      tone: confirmedAssignments.length ? 'good' : tentativeAssignments.length ? 'watch' : 'neutral',
      value: confirmedAssignments.length ? `${confirmedAssignments.length} confirmed` : tentativeAssignments.length ? `${tentativeAssignments.length} possible/requested` : 'No job-specific assignment',
      detail: confirmedAssignments.length ? 'At least one contributor is explicitly confirmed on this Engagement.' : tentativeAssignments.length ? 'Contributor involvement is represented but not yet confirmed.' : 'The roster exists, but no person is asserted as responsible for this Engagement.',
    },
    {
      code: 'capacity',
      label: 'Resource commitment',
      tone: resourceCommitments.length ? 'good' : resources.length ? 'watch' : 'neutral',
      value: resourceCommitments.length ? `${resourceCommitments.length} hold/reservation record${resourceCommitments.length === 1 ? '' : 's'}` : resources.length ? `${resources.length} configured · no commitment evidence` : 'No configured resource requirement',
      detail: resourceCommitments.length ? 'Capacity commitment evidence exists separately from configuration.' : resources.length ? 'Configured equipment is not automatically held, reserved, allocated or available.' : 'No resource commitment claim is currently supported.',
    },
    {
      code: 'attention',
      label: 'Open operating work',
      tone: openWork.some((item) => String(item.status ?? '') === 'BLOCKED') ? 'missing' : openWork.length ? 'watch' : 'good',
      value: openWork.length ? `${openWork.length} open item${openWork.length === 1 ? '' : 's'}` : 'No open persisted work',
      detail: openWork.length ? 'Persisted business work still requires attention; this is distinct from derived recommendations.' : 'No persisted open work is represented for this Engagement.',
    },
  ]

  if (!committed) {
    return {
      posture: 'PRE_COMMITMENT',
      title: 'Delivery is not the current decision yet',
      explanation: 'The system can still surface known schedule, venue, crew and resource context, but it should not manufacture execution requirements before the commercial commitment is real.',
      checks,
    }
  }

  const coreMissing = checks.some((item) => ['scope', 'place', 'time'].includes(item.code) && item.tone === 'missing')
  if (coreMissing) {
    return {
      posture: 'NEEDS_STRUCTURING',
      title: 'Committed, but execution truth is incomplete',
      explanation: 'At least one core delivery dimension is not represented in its canonical home. This is a structuring gap, not proof that the job itself is unprepared.',
      checks,
    }
  }

  const review = checks.some((item) => item.tone === 'watch' || item.tone === 'missing')
  if (review) {
    return {
      posture: 'NEEDS_REVIEW',
      title: 'Delivery picture exists, but important truth is still unverified',
      explanation: 'The system can see enough to coordinate the Engagement, but one or more execution dimensions still need confirmation or evidence before we should call the plan fully supported.',
      checks,
    }
  }

  return {
    posture: 'SUPPORTED',
    title: 'Current represented delivery picture is coherent',
    explanation: 'The currently modeled scope, place, timing, people, capacity and work do not expose an obvious evidence gap. This is not a guarantee of onsite success; it is a statement about represented operating truth.',
    checks,
  }
}

function humanState(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())
}
