import { supabase } from './supabase'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured. Copy .env.example to .env and add Supabase values.')
  return supabase
}

export type ScheduleType = 'EVENT' | 'LOAD_IN' | 'LOAD_OUT' | 'DELIVERY' | 'PICKUP' | 'RETURN' | 'SETUP' | 'SHOW' | 'STRIKE' | 'TRAVEL' | 'PREP' | 'OTHER'
export type AssignmentState = 'POSSIBLE' | 'REQUESTED' | 'CONFIRMED' | 'DECLINED' | 'COMPLETED' | 'UNKNOWN'
export type AssignmentRole = 'SALES_LEAD' | 'PROJECT_MANAGER' | 'VIDEO_TECH' | 'LED_TECH' | 'AUDIO_TECH' | 'A1' | 'A2' | 'CAMERA' | 'CONTENT' | 'WAREHOUSE' | 'DRIVER' | 'LABOR' | 'INSTALLER' | 'OTHER'

export interface EngagementScheduleItem {
  id: string
  schedule_type: ScheduleType
  label: string
  start_at: string | null
  end_at: string | null
  start_date: string | null
  end_date: string | null
  time_state: 'VERIFIED' | 'KNOWN' | 'TBD' | 'UNKNOWN'
  notes: string | null
  location: { id: string; name: string; address: string | null } | null
  location_name: string | null
  location_address: string | null
}

export interface TeamMemberOption {
  id: string
  username: string
  display_name: string | null
  member_type: string
  primary_role: string | null
  capabilities: { code: string; label: string | null; proficiency: string }[]
}

export interface EngagementAssignment {
  id: string
  role_code: AssignmentRole
  role_label: string | null
  assignment_state: AssignmentState
  certainty_state: string
  scheduled_start: string | null
  scheduled_end: string | null
  scope_summary: string | null
  briefing_notes: string | null
  acknowledgement_state: string
  member: { id: string; username: string; display_name: string | null; primary_role: string | null } | null
}

export async function listEngagementSchedule(engagementId: string): Promise<EngagementScheduleItem[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('engagement_schedule_items')
    .select('id,schedule_type,label,start_at,end_at,start_date,end_date,time_state,notes,location_name,location_address,location:locations(id,name,address)')
    .eq('engagement_id', engagementId)
    .order('start_date', { ascending: true, nullsFirst: false })
    .order('start_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as EngagementScheduleItem[]
}

export async function listTeamMemberOptions(): Promise<TeamMemberOption[]> {
  const client = requireClient()
  const [{ data: members, error: memberError }, { data: capabilities, error: capabilityError }] = await Promise.all([
    client.from('team_members').select('id,username,display_name,member_type,primary_role').eq('active', true).order('display_name', { ascending: true, nullsFirst: false }).order('username'),
    client.from('team_member_capabilities').select('team_member_id,capability_code,capability_label,proficiency').eq('active', true).order('capability_code'),
  ])
  if (memberError) throw memberError
  if (capabilityError) throw capabilityError

  const byMember = new Map<string, TeamMemberOption['capabilities']>()
  for (const row of capabilities ?? []) {
    const list = byMember.get(row.team_member_id) ?? []
    list.push({ code: row.capability_code, label: row.capability_label, proficiency: row.proficiency })
    byMember.set(row.team_member_id, list)
  }

  return (members ?? []).map((member) => ({ ...member, capabilities: byMember.get(member.id) ?? [] })) as TeamMemberOption[]
}

export async function listEngagementAssignments(engagementId: string): Promise<EngagementAssignment[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('engagement_assignments')
    .select('id,role_code,role_label,assignment_state,certainty_state,scheduled_start,scheduled_end,scope_summary,briefing_notes,acknowledgement_state,member:team_members(id,username,display_name,primary_role)')
    .eq('engagement_id', engagementId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as EngagementAssignment[]
}

async function primaryVenueLocationId(engagementId: string) {
  const client = requireClient()
  const { data, error } = await client
    .from('engagement_locations')
    .select('location_id,is_primary,created_at')
    .eq('engagement_id', engagementId)
    .eq('role', 'VENUE')
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
  if (error) throw error
  return data?.[0]?.location_id ?? null
}

export async function createScheduleItem(input: {
  engagementId: string
  scheduleType: ScheduleType
  label: string
  startDate?: string | null
  endDate?: string | null
  startAt?: string | null
  endAt?: string | null
  notes?: string | null
}) {
  const client = requireClient()
  const { data: userData } = await client.auth.getUser()
  const locationId = await primaryVenueLocationId(input.engagementId)
  const hasClock = Boolean(input.startAt)
  const startAt = input.startAt ?? null
  const endAt = input.endAt ?? null
  const startDate = hasClock ? null : input.startDate ?? null
  const endDate = hasClock ? null : input.endDate ?? input.startDate ?? null
  const timeState = hasClock ? 'KNOWN' : startDate ? 'TBD' : 'UNKNOWN'
  const label = input.label.trim()

  const { data: candidates, error: candidateError } = await client
    .from('engagement_schedule_items')
    .select('id,start_at,end_at,start_date,end_date')
    .eq('engagement_id', input.engagementId)
    .eq('schedule_type', input.scheduleType)
    .eq('label', label)
  if (candidateError) throw candidateError

  const existing = (candidates ?? []).find((row) =>
    row.start_at === startAt && row.end_at === endAt && row.start_date === startDate && row.end_date === endDate,
  )
  if (existing) return existing

  const { data, error } = await client
    .from('engagement_schedule_items')
    .insert({
      engagement_id: input.engagementId,
      source_key: `manual-schedule:${input.engagementId}:${crypto.randomUUID()}`,
      schedule_type: input.scheduleType,
      label,
      start_at: startAt,
      end_at: endAt,
      start_date: startDate,
      end_date: endDate,
      time_state: timeState,
      location_id: locationId,
      notes: input.notes?.trim() || null,
      metadata: { source_type: 'MANUAL', capture_surface: 'engagement_operating_workspace' },
      created_by: userData.user?.id ?? null,
    })
    .select('id')
    .single()
  if (error) throw error
  return data
}

export async function createAssignment(input: {
  engagementId: string
  teamMemberId: string
  roleCode: AssignmentRole
  roleLabel?: string | null
  assignmentState: AssignmentState
  scopeSummary?: string | null
  briefingNotes?: string | null
}) {
  const client = requireClient()
  const { data: existingRows, error: existingError } = await client
    .from('engagement_assignments')
    .select('id')
    .eq('engagement_id', input.engagementId)
    .eq('team_member_id', input.teamMemberId)
    .eq('role_code', input.roleCode)
    .in('assignment_state', ['POSSIBLE', 'REQUESTED', 'CONFIRMED'])
    .limit(1)
  if (existingError) throw existingError

  const values = {
    role_label: input.roleLabel?.trim() || null,
    assignment_state: input.assignmentState,
    certainty_state: 'KNOWN',
    scope_summary: input.scopeSummary?.trim() || null,
    briefing_notes: input.briefingNotes?.trim() || null,
    acknowledgement_state: 'UNSENT',
    metadata: { source_type: 'MANUAL', capture_surface: 'engagement_operating_workspace' },
  }

  const existing = existingRows?.[0]
  if (existing) {
    const { data, error } = await client.from('engagement_assignments').update(values).eq('id', existing.id).select('id').single()
    if (error) throw error
    return data
  }

  const { data, error } = await client
    .from('engagement_assignments')
    .insert({
      engagement_id: input.engagementId,
      team_member_id: input.teamMemberId,
      source_key: `manual-assignment:${input.engagementId}:${input.teamMemberId}:${input.roleCode}:${crypto.randomUUID()}`,
      role_code: input.roleCode,
      ...values,
    })
    .select('id')
    .single()
  if (error) throw error
  return data
}
