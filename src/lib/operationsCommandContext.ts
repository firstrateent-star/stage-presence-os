import { supabase } from './supabase'
import { listResourceRequirements, type ResourceRequirementPosition } from './resourceRequirementRuntime'
import { listWarehouseQueue, type WarehouseQueueItem } from './warehouseFulfillmentRuntime'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured.')
  return supabase
}

export interface CommandAssignment {
  id: string
  team_member_id: string
  assignment_state: string
  role_code: string
  role_label: string | null
  scheduled_start: string | null
  scheduled_end: string | null
  display_name: string | null
  username: string
}

export interface CommandScheduleItem {
  id: string
  schedule_type: string
  label: string
  start_at: string | null
  end_at: string | null
  start_date: string | null
  end_date: string | null
  time_state: 'VERIFIED' | 'KNOWN' | 'TBD' | 'UNKNOWN'
}

export interface CommandResourceCommitment {
  id: string
  resource_id: string
  resource_name: string
  commitment_type: string
  commitment_state: string
  quantity: number | null
  from_date: string | null
  through_date: string | null
}

export interface CommandTeamMember {
  id: string
  username: string
  display_name: string | null
}

export interface OperationsCommandContext {
  engagementId: string
  commitmentState: string
  acceptedDocumentId: string | null
  requirements: ResourceRequirementPosition[]
  resourceCommitments: CommandResourceCommitment[]
  assignments: CommandAssignment[]
  teamMembers: CommandTeamMember[]
  schedule: CommandScheduleItem[]
  warehouse: WarehouseQueueItem[]
}

export async function loadOperationsCommandContext(engagementId: string): Promise<OperationsCommandContext> {
  const client = requireClient()
  const [requirements, warehouse, engagement, commitments, assignments, team, schedule, bridge] = await Promise.all([
    listResourceRequirements(engagementId),
    listWarehouseQueue(engagementId),
    client.from('engagements').select('commitment_state').eq('id', engagementId).single(),
    client.from('resource_commitments').select('id,resource_id,commitment_type,commitment_state,quantity,from_date,through_date,resource:resources(name)').eq('engagement_id', engagementId).in('commitment_state', ['TENTATIVE','CONFIRMED','FULFILLED']).order('from_date', { ascending: true, nullsFirst: false }),
    client.from('engagement_assignments').select('id,team_member_id,assignment_state,role_code,role_label,scheduled_start,scheduled_end,member:team_members(username,display_name)').eq('engagement_id', engagementId).in('assignment_state', ['REQUESTED','CONFIRMED','COMPLETED']).order('scheduled_start', { ascending: true, nullsFirst: false }),
    client.from('team_members').select('id,username,display_name').eq('active', true).order('display_name', { ascending: true, nullsFirst: false }).order('username'),
    client.from('engagement_schedule_items').select('id,schedule_type,label,start_at,end_at,start_date,end_date,time_state').eq('engagement_id', engagementId).order('start_at', { ascending: true, nullsFirst: false }).order('start_date', { ascending: true, nullsFirst: false }),
    client.from('engagement_commitment_bridge_v').select('accepted_document_id').eq('engagement_id', engagementId).maybeSingle(),
  ])

  if (engagement.error) throw engagement.error
  if (commitments.error) throw commitments.error
  if (assignments.error) throw assignments.error
  if (team.error) throw team.error
  if (schedule.error) throw schedule.error
  if (bridge.error) throw bridge.error

  return {
    engagementId,
    commitmentState: engagement.data.commitment_state,
    acceptedDocumentId: bridge.data?.accepted_document_id ?? null,
    requirements,
    resourceCommitments: (commitments.data ?? []).map((row: any) => ({
      id: row.id,
      resource_id: row.resource_id,
      resource_name: row.resource?.name ?? 'Unknown resource',
      commitment_type: row.commitment_type,
      commitment_state: row.commitment_state,
      quantity: row.quantity == null ? null : Number(row.quantity),
      from_date: row.from_date,
      through_date: row.through_date,
    })),
    assignments: (assignments.data ?? []).map((row: any) => ({
      id: row.id,
      team_member_id: row.team_member_id,
      assignment_state: row.assignment_state,
      role_code: row.role_code,
      role_label: row.role_label,
      scheduled_start: row.scheduled_start,
      scheduled_end: row.scheduled_end,
      display_name: row.member?.display_name ?? null,
      username: row.member?.username ?? 'Unknown contributor',
    })),
    teamMembers: (team.data ?? []) as CommandTeamMember[],
    schedule: (schedule.data ?? []) as CommandScheduleItem[],
    warehouse,
  }
}
