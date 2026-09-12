import { supabase } from './supabase'
import { getPrimaryOpenWork, type CanonicalWorkItem } from './canonicalWrites'
import { listEngagementAssignments, listEngagementSchedule, type EngagementAssignment, type EngagementScheduleItem } from './operationsReality'
import { listResourceCommitments, type ResourceCommitment } from './resourceCommitments'
import { listFacts, listPartiesForEngagement, type PartyLink } from './repository'
import type { EngagementFact } from '../types/domain'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured. Copy .env.example to .env and add Supabase values.')
  return supabase
}

export interface JobDayLocation {
  id: string
  name: string
  address: string | null
  notes: string | null
}

export interface JobDayModel {
  location: JobDayLocation | null
  contacts: PartyLink[]
  schedule: EngagementScheduleItem[]
  crew: EngagementAssignment[]
  commitments: ResourceCommitment[]
  operatingFacts: EngagementFact[]
  primaryWork: CanonicalWorkItem | null
}

export async function loadJobDay(engagementId: string): Promise<JobDayModel> {
  const client = requireClient()
  const [contacts, schedule, assignments, commitments, facts, primaryWork, locationResult] = await Promise.all([
    listPartiesForEngagement(engagementId),
    listEngagementSchedule(engagementId),
    listEngagementAssignments(engagementId),
    listResourceCommitments(engagementId),
    listFacts(engagementId),
    getPrimaryOpenWork(engagementId),
    client
      .from('engagement_locations')
      .select('notes,is_primary,location:locations(id,name,address)')
      .eq('engagement_id', engagementId)
      .eq('role', 'VENUE')
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1),
  ])

  if (locationResult.error) throw locationResult.error
  const locationRow = locationResult.data?.[0]
  const nested = locationRow?.location
  const location = (Array.isArray(nested) ? nested[0] : nested) ?? null

  const crew = assignments.filter((item) => item.assignment_state === 'CONFIRMED' || item.assignment_state === 'COMPLETED')
  const operatingFacts = facts.filter((fact) =>
    ['ACCESS', 'VENUE', 'POWER', 'SAFETY', 'LOGISTICS', 'LABOR', 'EVENT', 'CONTENT'].includes(fact.category)
    && !['OBSOLETE', 'NOT_APPLICABLE'].includes(fact.certainty_state),
  )

  return {
    location: location ? { id: location.id, name: location.name, address: location.address, notes: locationRow?.notes ?? null } : null,
    contacts,
    schedule,
    crew,
    commitments,
    operatingFacts,
    primaryWork,
  }
}
