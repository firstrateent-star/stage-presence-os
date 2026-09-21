import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { createMcpHandler, McpServer } from 'npm:@modelcontextprotocol/server@^2.0.0'
import { pipeline } from 'npm:@supabase/middleware@^0.5.0'
import { withOAuthProtectedResource, withSupabase } from 'npm:@supabase/server@^1.6.0'
import { z } from 'npm:zod@^4.3.6'

type ScopedSupabase = any

function sanitizeTerm(raw: string): string {
  return String(raw || '').replace(/[,()*]/g, ' ').trim().slice(0, 120)
}

function toolResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
}

function toolError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return {
    content: [{ type: 'text' as const, text: `Stage Presence data is currently unavailable. (${message})` }],
    isError: true,
  }
}

async function findContact(supabase: ScopedSupabase, query: string) {
  const term = sanitizeTerm(query)
  if (!term) return []
  const { data, error } = await supabase
    .from('parties')
    .select('id,party_type,name,organization_name,email,phone')
    .or(`name.ilike.*${term}*,organization_name.ilike.*${term}*,email.ilike.*${term}*,phone.ilike.*${term}*`)
    .limit(20)
  if (error) throw new Error(error.message)
  return data ?? []
}

async function findEngagement(supabase: ScopedSupabase, query: string) {
  const term = sanitizeTerm(query)
  if (!term) return []
  const { data, error } = await supabase
    .from('engagement_summary_v')
    .select('id,engagement_number,name,engagement_type,customer_request,event_start_date,commercial_state,commitment_state,operational_state,attention_state,venue,primary_customer,next_work')
    .or(`name.ilike.*${term}*,engagement_number.ilike.*${term}*,customer_request.ilike.*${term}*`)
    .order('updated_at', { ascending: false })
    .limit(20)
  if (error) throw new Error(error.message)
  return data ?? []
}

async function findTeamMember(supabase: ScopedSupabase, query: string) {
  const term = sanitizeTerm(query)
  if (!term) return []
  const { data, error } = await supabase
    .from('team_members')
    .select('id,display_name,username,member_type,primary_role,active')
    .or(`display_name.ilike.*${term}*,username.ilike.*${term}*,primary_role.ilike.*${term}*`)
    .limit(20)
  if (error) throw new Error(error.message)
  return data ?? []
}

async function findResource(supabase: ScopedSupabase, args: { query: string; category?: string }) {
  const term = sanitizeTerm(args.query)
  if (!term) return []
  let q = supabase
    .from('resources')
    .select('id,name,category,resource_type,sourcing_model,quantity,quantity_state,active')
    .or(`name.ilike.*${term}*,resource_type.ilike.*${term}*`)
    .is('archived_at', null)
    .limit(20)
  if (args.category) q = q.eq('category', args.category)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}

async function getPricing(
  supabase: ScopedSupabase,
  args: { item?: string; category?: string; roleCode?: string; scopeType?: string },
) {
  let query = supabase
    .from('price_book_v')
    .select('pricing_rule_id,entry_kind,name,scope_label,resource_name,rate_type,billing_basis,duration_value,duration_unit,amount,currency,status,authority_state,effective_from,effective_through')
    .order('authority_state')
    .order('resource_name')

  if (args.item) {
    const term = sanitizeTerm(args.item)
    query = query.or(`resource_name.ilike.*${term}*,scope_label.ilike.*${term}*,name.ilike.*${term}*`)
  }
  if (args.category) query = query.eq('category', args.category)
  if (args.roleCode) query = query.eq('role_code', args.roleCode)
  if (args.scopeType) query = query.eq('scope_type', args.scopeType)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

async function loadEngagementByNumber(supabase: ScopedSupabase, engagementNumber: string) {
  const { data, error } = await supabase
    .from('engagements')
    .select([
      'id,engagement_number,name,engagement_type,commercial_state,commitment_state,operational_state,attention_state,event_start_date,customer_request',
      'engagement_parties(role,is_primary,parties(name,organization_name,email,phone))',
      'engagement_locations(role,is_primary,locations(name,address,access_notes,load_in_notes,parking_notes,power_notes,connectivity_notes))',
      'engagement_resources(quantity,relationship,required_from_date,required_through_date,requirement_window_state,planned_sourcing_model,resources(name))',
      'engagement_facts(label,value_text,certainty_state)',
      'engagement_assignments(role_code,role_label,assignment_state,scheduled_start,scheduled_end,team_members(display_name))',
      'engagement_schedule_items(schedule_type,label,start_at,start_date,time_state)',
    ].join(','))
    .eq('engagement_number', engagementNumber)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

async function generateLeadSummary(supabase: ScopedSupabase, engagementNumber: string) {
  const e = await loadEngagementByNumber(supabase, engagementNumber)
  if (!e) return { found: false, engagementNumber }

  const primary =
    (e.engagement_parties || []).find((p: any) => p.is_primary) ||
    (e.engagement_parties || [])[0]
  const customerName =
    primary?.parties?.organization_name || primary?.parties?.name || 'Unknown customer'
  const openFacts = (e.engagement_facts || [])
    .filter((f: any) => ['UNKNOWN', 'REQUESTED', 'CONFLICTING'].includes(f.certainty_state))
    .map((f: any) => f.label)
  const resourceNames = (e.engagement_resources || [])
    .map((r: any) => r.resources?.name)
    .filter(Boolean)

  return {
    found: true,
    engagement: e,
    text: [
      `${e.name} (${e.engagement_number})`,
      `Customer: ${customerName}`,
      `Type: ${e.engagement_type} · Commercial: ${e.commercial_state} · Commitment: ${e.commitment_state}`,
      e.event_start_date ? `Date: ${e.event_start_date}` : 'Date: unknown',
      e.customer_request ? `Request: ${e.customer_request}` : 'Request: not recorded',
      resourceNames.length ? `Resources: ${resourceNames.join(', ')}` : 'Resources: none linked yet',
      openFacts.length ? `Open unknowns: ${openFacts.join('; ')}` : 'Open unknowns: none recorded',
    ].join('\n'),
  }
}

/* generate_job_sheet is an internal operational projection built from whitelisted canonical fields
   only. It never presents REQUESTED/POSSIBLE crew as CONFIRMED, and never presents a resource
   requirement (engagement_resources) as reserved inventory — resource_commitments (actual holds/
   reservations/allocations) are shown separately, only if any exist. Facts are bucketed by their
   real certainty_state (VERIFIED/KNOWN/ESTIMATED/ASSUMED/CONFLICTING/UNKNOWN) rather than flattened. */
async function generateJobSheet(supabase: ScopedSupabase, engagementNumber: string) {
  const e = await loadEngagementByNumber(supabase, engagementNumber)
  if (!e) return { found: false, engagementNumber }

  const primaryContact = (e.engagement_parties || []).find((p: any) => p.is_primary) || (e.engagement_parties || [])[0]
  const primaryVenue = (e.engagement_locations || []).find((l: any) => l.is_primary) || (e.engagement_locations || [])[0]

  const { data: commitments } = await supabase
    .from('resource_commitments')
    .select('commitment_type,commitment_state,quantity,from_date,through_date,resources(name)')
    .eq('engagement_id', e.id)

  const { data: summaryRow } = await supabase
    .from('engagement_summary_v')
    .select('next_work')
    .eq('id', e.id)
    .maybeSingle()

  const factsByCertainty: Record<string, string[]> = { VERIFIED: [], KNOWN: [], ESTIMATED: [], ASSUMED: [], CONFLICTING: [], UNKNOWN: [] }
  for (const f of e.engagement_facts || []) {
    const bucket = factsByCertainty[f.certainty_state] ?? (factsByCertainty[f.certainty_state] = [])
    bucket.push(f.value_text ? `${f.label}: ${f.value_text}` : f.label)
  }

  const teamAssignments = (e.engagement_assignments || []).map((a: any) => ({
    name: a.team_members?.display_name ?? 'unknown',
    roleCode: a.role_code,
    roleLabel: a.role_label,
    assignmentState: a.assignment_state,
    scheduledStart: a.scheduled_start,
    scheduledEnd: a.scheduled_end,
    confirmed: a.assignment_state === 'CONFIRMED',
  }))

  const resourceRequirements = (e.engagement_resources || []).map((r: any) => ({
    resourceName: r.resources?.name ?? 'unknown resource',
    relationship: r.relationship,
    quantity: r.quantity,
    requiredFromDate: r.required_from_date,
    requiredThroughDate: r.required_through_date,
    requirementWindowState: r.requirement_window_state,
    plannedSourcingModel: r.planned_sourcing_model,
    reservedInventory: false,
  }))

  const resourceCommitments = (commitments || []).map((c: any) => ({
    resourceName: c.resources?.name ?? 'unknown resource',
    commitmentType: c.commitment_type,
    commitmentState: c.commitment_state,
    quantity: c.quantity,
    fromDate: c.from_date,
    throughDate: c.through_date,
  }))

  const bucketLines = (label: string, items: string[]) => [`${label}:`, ...(items.length ? items.map((l) => `- ${l}`) : ['- none recorded'])]
  const scheduleLines = (e.engagement_schedule_items || []).map(
    (s: any) => `- ${s.schedule_type} — ${s.label} — ${s.start_at || s.start_date || 'TBD'} (${s.time_state})`,
  )
  const teamLines = teamAssignments.length
    ? teamAssignments.map((a: any) => `- ${a.roleCode}${a.roleLabel ? ` (${a.roleLabel})` : ''}: ${a.name} — ${a.assignmentState}${a.confirmed ? '' : ' (NOT CONFIRMED — proposal only)'}`)
    : ['- none assigned yet']
  const resourceLines = resourceRequirements.length
    ? resourceRequirements.map((r: any) => `- ${r.resourceName} (${r.relationship}${r.quantity ? ' × ' + r.quantity : ''}) — requirement only, not reserved inventory`)
    : ['- none recorded']
  const commitmentLines = resourceCommitments.length
    ? resourceCommitments.map((c: any) => `- ${c.resourceName}: ${c.commitmentType} / ${c.commitmentState}${c.quantity ? ' × ' + c.quantity : ''}`)
    : ['- none recorded']

  const text = [
    `JOB SHEET — ${e.name} (${e.engagement_number})`,
    e.event_start_date ? `Date: ${e.event_start_date}` : 'Date: TBD',
    '',
    'Client / Primary Contact:',
    primaryContact ? `- ${primaryContact.role}: ${primaryContact.parties?.name ?? 'unknown'}${primaryContact.parties?.phone ? ' · ' + primaryContact.parties.phone : ''}` : '- none recorded',
    '',
    'Venue:',
    primaryVenue ? `- ${primaryVenue.locations?.name ?? 'unknown venue'}${primaryVenue.locations?.address ? ' · ' + primaryVenue.locations.address : ''}` : '- none recorded',
    '',
    'Schedule:',
    ...(scheduleLines.length ? scheduleLines : ['- not scheduled']),
    '',
    'Team Assignments (assignment_state shown — REQUESTED/POSSIBLE is NOT confirmed availability):',
    ...teamLines,
    '',
    'Resource Requirements (need/consideration/configuration only — NOT reserved inventory):',
    ...resourceLines,
    '',
    'Resource Commitments (actual holds/reservations/allocations, if any):',
    ...commitmentLines,
    '',
    ...bucketLines('Known / Verified', [...factsByCertainty.VERIFIED, ...factsByCertainty.KNOWN]),
    '',
    ...bucketLines('Estimated', factsByCertainty.ESTIMATED),
    '',
    ...bucketLines('Assumed', factsByCertainty.ASSUMED),
    '',
    ...bucketLines('Conflicting / Open Questions', factsByCertainty.CONFLICTING),
    '',
    ...bucketLines('Unknown', factsByCertainty.UNKNOWN),
    '',
    'Current Next Action:',
    summaryRow?.next_work?.title ? `- ${summaryRow.next_work.title} (${summaryRow.next_work.status}, ${summaryRow.next_work.priority})` : '- none set',
  ].join('\n')

  return {
    found: true,
    engagementNumber: e.engagement_number,
    eventStartDate: e.event_start_date,
    primaryContact: primaryContact
      ? { role: primaryContact.role, name: primaryContact.parties?.name, phone: primaryContact.parties?.phone, email: primaryContact.parties?.email }
      : null,
    venue: primaryVenue
      ? {
          name: primaryVenue.locations?.name,
          address: primaryVenue.locations?.address,
          loadInNotes: primaryVenue.locations?.load_in_notes,
          parkingNotes: primaryVenue.locations?.parking_notes,
          powerNotes: primaryVenue.locations?.power_notes,
          connectivityNotes: primaryVenue.locations?.connectivity_notes,
        }
      : null,
    schedule: e.engagement_schedule_items || [],
    teamAssignments,
    resourceRequirements,
    resourceCommitments,
    factsByCertainty,
    nextAction: summaryRow?.next_work ?? null,
    text,
  }
}

async function getAttentionItems(supabase: ScopedSupabase) {
  const { data, error } = await supabase
    .from('engagement_summary_v')
    .select('id,engagement_number,name,attention_state,commercial_state,commitment_state,open_work_count,primary_customer,venue,next_work,event_start_date')
    .or('attention_state.neq.NORMAL,open_work_count.gt.0')
    .order('attention_state', { ascending: false })
    .order('event_start_date', { ascending: true })
    .limit(25)
  if (error) throw new Error(error.message)
  return data ?? []
}

async function getUpcomingEngagements(supabase: ScopedSupabase, limit = 15) {
  const today = new Date().toISOString().slice(0, 10)
  const safeLimit = limit > 0 && limit <= 50 ? limit : 15
  const { data, error } = await supabase
    .from('engagement_summary_v')
    .select('id,engagement_number,name,event_start_date,commercial_state,commitment_state,operational_state,attention_state,primary_customer,venue,next_work')
    .gte('event_start_date', today)
    .order('event_start_date', { ascending: true })
    .limit(safeLimit)
  if (error) throw new Error(error.message)
  return data ?? []
}

/* ============================== the one write capability: set_next_action ==============================
   Uses the already-authenticated, RLS-scoped `supabase` client injected by withSupabase({ auth: 'user' })
   above — no service-role key, no raw SQL, no RLS bypass. Mirrors src/lib/canonicalWrites.ts's real
   public.work_items schema exactly (see database/20260909_reality_commercial_operations_kernel.sql and
   database/20260909_frontend_operating_primitives.sql) — no invented columns.
   Only ever INSERTs a new row (or, on an idempotent replay with an identical payload, returns the row it
   already wrote). Never touches any other existing work_items row, never cancels/completes/reprioritizes
   anything. A retry with the SAME idempotencyKey but a DIFFERENT payload is refused (NOT_SAVED) rather than
   silently overwriting the prior proposal — an idempotency key identifies one proposed mutation, not a
   mutable slot. */

const ACTION_TYPES = [
  'CALL', 'EMAIL', 'TEXT', 'CREATE_QUOTE', 'REVISE_QUOTE', 'APPROVAL', 'CAPACITY',
  'CREW', 'PAYMENT', 'VENUE', 'PREP', 'DELIVERY', 'FOLLOW_UP', 'REVIEW', 'OTHER',
] as const
const PRIORITIES = ['NOW', 'SOON', 'NORMAL', 'LOW'] as const

const WORK_ITEM_FIELDS =
  'id,engagement_id,source_key,title,action_type,status,priority,due_date,why_now,instructions,success_condition'
const WORK_ITEM_FULL_FIELDS = `${WORK_ITEM_FIELDS},completed_at,metadata`
const OPEN_WORK_ITEM_STATUSES = ['OPEN', 'WAITING', 'BLOCKED']

interface SetNextActionArgs {
  engagementNumber: string
  title: string
  actionType: string
  priority: string
  dueDate?: string
  whyNow?: string
  instructions?: string
  successCondition?: string
  confirmed: boolean
  idempotencyKey: string
}

function requestedPayloadMatches(existing: any, requested: Record<string, unknown>) {
  return (
    existing.engagement_id === requested.engagement_id &&
    existing.title === requested.title &&
    existing.action_type === requested.action_type &&
    existing.priority === requested.priority &&
    (existing.due_date ?? null) === (requested.due_date ?? null) &&
    (existing.why_now ?? null) === (requested.why_now ?? null) &&
    (existing.instructions ?? null) === (requested.instructions ?? null) &&
    (existing.success_condition ?? null) === (requested.success_condition ?? null)
  )
}

async function setNextAction(supabase: ScopedSupabase, args: SetNextActionArgs) {
  const notSaved = (reason: string, extra: Record<string, unknown> = {}) => ({
    saved: false,
    verificationState: 'NOT_SAVED',
    engagementNumber: args.engagementNumber ?? null,
    reason,
    ...extra,
  })

  if (args.confirmed !== true) {
    return notSaved(
      'Refused: confirmed must be literally true. This tool only writes after explicit human approval — propose the change and wait for Approve/Edit/Cancel first.',
    )
  }
  if (!args.idempotencyKey) return notSaved('idempotencyKey is required.')
  if (!args.engagementNumber) return notSaved('engagementNumber is required.')
  const title = String(args.title || '').trim()
  if (!title) return notSaved('title is required.')
  if (!(ACTION_TYPES as readonly string[]).includes(args.actionType)) {
    return notSaved(`Invalid actionType: ${args.actionType}. Must be one of ${ACTION_TYPES.join(', ')}.`)
  }
  if (!(PRIORITIES as readonly string[]).includes(args.priority)) {
    return notSaved(`Invalid priority: ${args.priority}. Must be one of ${PRIORITIES.join(', ')}.`)
  }

  const { data: engagement, error: engagementError } = await supabase
    .from('engagements')
    .select('id,engagement_number')
    .eq('engagement_number', args.engagementNumber)
    .maybeSingle()
  if (engagementError) return notSaved(`Could not look up engagement: ${engagementError.message}`)
  if (!engagement) return notSaved(`No engagement found with number ${args.engagementNumber}. Nothing was written.`)

  const sourceKey = `mcp:set_next_action:${args.idempotencyKey}`
  const requestedPayload = {
    engagement_id: engagement.id,
    title,
    action_type: args.actionType,
    priority: args.priority,
    due_date: args.dueDate ?? null,
    why_now: args.whyNow ?? null,
    instructions: args.instructions ?? null,
    success_condition: args.successCondition ?? null,
  }

  const { data: existing, error: existingError } = await supabase
    .from('work_items')
    .select(WORK_ITEM_FIELDS)
    .eq('source_key', sourceKey)
    .maybeSingle()
  if (existingError) {
    return notSaved(`Could not check for a prior write with this idempotencyKey: ${existingError.message}`, {
      engagementNumber: engagement.engagement_number,
    })
  }

  let workItemId: string

  if (existing) {
    if (!requestedPayloadMatches(existing, requestedPayload)) {
      return notSaved(
        'This idempotencyKey was already used for a different proposed change. Use a new idempotencyKey for a new or edited proposal — this tool never silently overwrites a prior write.',
        { engagementNumber: engagement.engagement_number, workItemId: existing.id },
      )
    }
    workItemId = existing.id
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from('work_items')
      .insert({
        ...requestedPayload,
        source_key: sourceKey,
        status: 'OPEN',
        certainty_state: 'KNOWN',
        origin: 'MANUAL',
        visibility: 'INTERNAL',
        metadata: { canonical_role: 'MCP_PROPOSED_ACTION', capture_surface: 'stage_presence_cockpit_artifact' },
      })
      .select(WORK_ITEM_FIELDS)
      .single()

    if (insertError) {
      // A unique violation on source_key means a concurrent call already inserted it — re-check
      // rather than fail blind, so a genuine retry still resolves instead of erroring.
      const { data: raceRow, error: raceError } = await supabase
        .from('work_items')
        .select(WORK_ITEM_FIELDS)
        .eq('source_key', sourceKey)
        .maybeSingle()
      if (raceError || !raceRow) {
        return notSaved(`Write failed: ${insertError.message}`, { engagementNumber: engagement.engagement_number })
      }
      if (!requestedPayloadMatches(raceRow, requestedPayload)) {
        return notSaved(
          'This idempotencyKey was already used for a different proposed change. Use a new idempotencyKey for a new or edited proposal — this tool never silently overwrites a prior write.',
          { engagementNumber: engagement.engagement_number, workItemId: raceRow.id },
        )
      }
      workItemId = raceRow.id
    } else {
      workItemId = inserted.id
    }
  }

  // Canonical re-read: never trust the write (or the pre-check) response alone.
  const { data: verified, error: verifyError } = await supabase
    .from('work_items')
    .select(WORK_ITEM_FIELDS)
    .eq('id', workItemId)
    .maybeSingle()
  if (verifyError) {
    return notSaved(`Canonical re-read failed: ${verifyError.message}`, {
      engagementNumber: engagement.engagement_number,
      workItemId,
    })
  }
  if (!verified) {
    return notSaved('Canonical re-read did not find the record after write.', {
      engagementNumber: engagement.engagement_number,
      workItemId,
    })
  }

  const { data: summaryRow } = await supabase
    .from('engagement_summary_v')
    .select('id,engagement_number,next_work')
    .eq('id', engagement.id)
    .maybeSingle()
  const currentNextWork = summaryRow?.next_work ?? null
  const becameNextWork = !!currentNextWork && currentNextWork.id === verified.id

  return {
    saved: true,
    verificationState: 'VERIFIED_SAVED',
    engagementNumber: engagement.engagement_number,
    workItemId: verified.id,
    title: verified.title,
    actionType: verified.action_type,
    priority: verified.priority,
    dueDate: verified.due_date,
    canonicalStatus: verified.status,
    currentNextWork,
    note: becameNextWork ? null : 'SAVED AS OPEN WORK — CURRENT NEXT WORK UNCHANGED',
  }
}

/* ============================== complete_next_action ==============================
   Targets one specific workItemId (never "whatever is next"). Only allows the transition
   OPEN/WAITING/BLOCKED -> DONE; refuses on any other current status rather than guessing.
   Never touches any row other than the one named by workItemId. Idempotent: the row's own
   `metadata.completion_idempotency_key` (no new table) records which request completed it, so a
   replay with the SAME idempotencyKey is a safe no-op, and completing an already-DONE item under
   a DIFFERENT key is refused rather than silently treated as a no-op. */

interface CompleteNextActionArgs {
  workItemId: string
  confirmed: boolean
  idempotencyKey: string
}

async function completeNextAction(supabase: ScopedSupabase, args: CompleteNextActionArgs) {
  const notSaved = (reason: string, extra: Record<string, unknown> = {}) => ({
    saved: false,
    verificationState: 'NOT_SAVED',
    workItemId: args.workItemId ?? null,
    reason,
    ...extra,
  })

  if (args.confirmed !== true) {
    return notSaved(
      'Refused: confirmed must be literally true. This tool only writes after explicit human approval.',
    )
  }
  if (!args.idempotencyKey) return notSaved('idempotencyKey is required.')
  if (!args.workItemId) return notSaved('workItemId is required.')

  const { data: current, error: currentError } = await supabase
    .from('work_items')
    .select(WORK_ITEM_FULL_FIELDS)
    .eq('id', args.workItemId)
    .maybeSingle()
  if (currentError) return notSaved(`Could not look up work item: ${currentError.message}`)
  if (!current) return notSaved(`No work item found with id ${args.workItemId}. Nothing was written.`)

  const sourceKey = `mcp:complete_next_action:${args.idempotencyKey}`

  if (current.status === 'DONE') {
    if (current.metadata?.completion_idempotency_key === sourceKey) {
      // Idempotent replay of the exact request that already completed this item.
      return rereadCompletedWorkItem(supabase, args.workItemId, current.engagement_id, 'Already DONE — idempotent replay, no change made.')
    }
    return notSaved(`Work item ${args.workItemId} is already DONE (completed by a different request). No transition applied.`, {
      engagementId: current.engagement_id,
    })
  }
  if (!OPEN_WORK_ITEM_STATUSES.includes(current.status)) {
    return notSaved(`Work item ${args.workItemId} has status ${current.status}, which does not support completion. No transition applied.`, {
      engagementId: current.engagement_id,
    })
  }

  const { error: updateError } = await supabase
    .from('work_items')
    .update({
      status: 'DONE',
      completed_at: new Date().toISOString(),
      metadata: { ...(current.metadata ?? {}), completion_idempotency_key: sourceKey },
    })
    .eq('id', args.workItemId)
  if (updateError) return notSaved(`Write failed: ${updateError.message}`, { engagementId: current.engagement_id })

  return rereadCompletedWorkItem(supabase, args.workItemId, current.engagement_id, null)
}

async function rereadCompletedWorkItem(supabase: ScopedSupabase, workItemId: string, engagementId: string, note: string | null) {
  // Canonical re-read: never trust the write (or the pre-check) response alone.
  const { data: verified, error: verifyError } = await supabase
    .from('work_items')
    .select(WORK_ITEM_FULL_FIELDS)
    .eq('id', workItemId)
    .maybeSingle()
  if (verifyError) return { saved: false, verificationState: 'NOT_SAVED', workItemId, reason: `Canonical re-read failed: ${verifyError.message}` }
  if (!verified || verified.status !== 'DONE' || !verified.completed_at) {
    return { saved: false, verificationState: 'NOT_SAVED', workItemId, reason: 'Canonical re-read did not confirm a completed record.' }
  }

  const { data: summaryRow } = await supabase
    .from('engagement_summary_v')
    .select('id,engagement_number,next_work')
    .eq('id', engagementId)
    .maybeSingle()

  return {
    saved: true,
    verificationState: 'VERIFIED_SAVED',
    workItemId: verified.id,
    engagementId,
    engagementNumber: summaryRow?.engagement_number ?? null,
    title: verified.title,
    canonicalStatus: verified.status,
    completedAt: verified.completed_at,
    currentNextWork: summaryRow?.next_work ?? null,
    note,
  }
}

/* ============================== update_next_action ==============================
   Targets one specific workItemId. Only the fields explicitly supplied are changed — omitted
   fields are left exactly as they are, never silently overwritten or cleared. Refuses to edit a
   DONE or CANCELLED item (a closed record is not reopened by this tool). Idempotent: the row's
   own `metadata.last_update` records which idempotencyKey applied which exact field payload, so a
   replay with the SAME key and SAME payload is a safe no-op; the SAME key with a DIFFERENT payload
   is refused (NOT_SAVED) rather than silently applied. */

interface UpdateNextActionArgs {
  workItemId: string
  confirmed: boolean
  idempotencyKey: string
  title?: string
  actionType?: string
  priority?: string
  dueDate?: string
  whyNow?: string
  instructions?: string
  successCondition?: string
}

const UPDATE_NEXT_ACTION_FIELD_MAP: Record<string, string> = {
  title: 'title',
  actionType: 'action_type',
  priority: 'priority',
  dueDate: 'due_date',
  whyNow: 'why_now',
  instructions: 'instructions',
  successCondition: 'success_condition',
}

async function updateNextAction(supabase: ScopedSupabase, args: UpdateNextActionArgs) {
  const notSaved = (reason: string, extra: Record<string, unknown> = {}) => ({
    saved: false,
    verificationState: 'NOT_SAVED',
    workItemId: args.workItemId ?? null,
    reason,
    ...extra,
  })

  if (args.confirmed !== true) {
    return notSaved(
      'Refused: confirmed must be literally true. This tool only writes after explicit human approval.',
    )
  }
  if (!args.idempotencyKey) return notSaved('idempotencyKey is required.')
  if (!args.workItemId) return notSaved('workItemId is required.')
  if (args.actionType !== undefined && !(ACTION_TYPES as readonly string[]).includes(args.actionType)) {
    return notSaved(`Invalid actionType: ${args.actionType}. Must be one of ${ACTION_TYPES.join(', ')}.`)
  }
  if (args.priority !== undefined && !(PRIORITIES as readonly string[]).includes(args.priority)) {
    return notSaved(`Invalid priority: ${args.priority}. Must be one of ${PRIORITIES.join(', ')}.`)
  }

  const requestedEntries = Object.entries(UPDATE_NEXT_ACTION_FIELD_MAP)
    .filter(([argKey]) => (args as unknown as Record<string, unknown>)[argKey] !== undefined)
  if (requestedEntries.length === 0) {
    return notSaved('No fields supplied to update. Provide at least one of: title, actionType, priority, dueDate, whyNow, instructions, successCondition.')
  }

  const { data: current, error: currentError } = await supabase
    .from('work_items')
    .select(WORK_ITEM_FULL_FIELDS)
    .eq('id', args.workItemId)
    .maybeSingle()
  if (currentError) return notSaved(`Could not look up work item: ${currentError.message}`)
  if (!current) return notSaved(`No work item found with id ${args.workItemId}. Nothing was written.`)
  if (current.status === 'DONE' || current.status === 'CANCELLED') {
    return notSaved(`Work item ${args.workItemId} has status ${current.status} and is closed; this tool does not edit closed items.`, {
      engagementId: current.engagement_id,
    })
  }

  const requestedPatch: Record<string, unknown> = {}
  const changes: Record<string, { from: unknown; to: unknown }> = {}
  for (const [argKey, column] of requestedEntries) {
    const newValue = (args as unknown as Record<string, unknown>)[argKey]
    requestedPatch[column] = newValue
    changes[column] = { from: current[column] ?? null, to: newValue }
  }

  const sourceKey = `mcp:update_next_action:${args.idempotencyKey}`
  const payloadSignature = JSON.stringify(requestedPatch, Object.keys(requestedPatch).sort())

  if (current.metadata?.last_update?.key === sourceKey) {
    if (current.metadata.last_update.payload === payloadSignature) {
      // Idempotent replay of the exact same edit.
      return rereadUpdatedWorkItem(supabase, args.workItemId, current.engagement_id, changes, 'Idempotent replay — no change made.')
    }
    return notSaved('This idempotencyKey was already used for a different update payload on this work item. Use a new idempotencyKey for a new or edited proposal.', {
      engagementId: current.engagement_id,
    })
  }

  const { error: updateError } = await supabase
    .from('work_items')
    .update({
      ...requestedPatch,
      metadata: { ...(current.metadata ?? {}), last_update: { key: sourceKey, payload: payloadSignature, at: new Date().toISOString() } },
    })
    .eq('id', args.workItemId)
  if (updateError) return notSaved(`Write failed: ${updateError.message}`, { engagementId: current.engagement_id })

  return rereadUpdatedWorkItem(supabase, args.workItemId, current.engagement_id, changes, null)
}

async function rereadUpdatedWorkItem(
  supabase: ScopedSupabase,
  workItemId: string,
  engagementId: string,
  changes: Record<string, { from: unknown; to: unknown }>,
  note: string | null,
) {
  // Canonical re-read: never trust the write (or the pre-check) response alone.
  const { data: verified, error: verifyError } = await supabase
    .from('work_items')
    .select(WORK_ITEM_FULL_FIELDS)
    .eq('id', workItemId)
    .maybeSingle()
  if (verifyError) return { saved: false, verificationState: 'NOT_SAVED', workItemId, reason: `Canonical re-read failed: ${verifyError.message}` }
  if (!verified) return { saved: false, verificationState: 'NOT_SAVED', workItemId, reason: 'Canonical re-read did not find the record after write.' }

  for (const [column, { to }] of Object.entries(changes)) {
    if ((verified as Record<string, unknown>)[column] !== to) {
      return {
        saved: false,
        verificationState: 'NOT_SAVED',
        workItemId,
        reason: `Canonical re-read did not confirm the requested change to ${column}.`,
      }
    }
  }

  return {
    saved: true,
    verificationState: 'VERIFIED_SAVED',
    workItemId: verified.id,
    engagementId,
    changes,
    canonicalStatus: verified.status,
    current: {
      title: verified.title,
      actionType: verified.action_type,
      priority: verified.priority,
      dueDate: verified.due_date,
      whyNow: verified.why_now,
      instructions: verified.instructions,
      successCondition: verified.success_condition,
    },
    note,
  }
}

/* ============================== create_lead ==============================
   A lead is an early-stage Engagement — no separate `leads` table. Reuses engagements, parties,
   engagement_parties, locations, engagement_locations, engagement_facts, source_artifacts
   (provenance, same pattern as src/lib/repository.ts's createEngagement), and work_items
   (optional initial next action, same shape as set_next_action).
   Never auto-merges an ambiguous contact/venue match: reuses a party/location only when exactly
   one confident match exists (exact email/phone for contacts, exact name for venues — mirrors
   src/lib/canonicalWrites.ts's linkCanonicalVenue); on more than one match it records the
   ambiguity as a CONFLICTING engagement_fact rather than guessing, and creates a new record only
   when there is truly no match.
   Idempotent via engagements.source_key — the same column the schema already reserves for
   "idempotent external-system imports" (e.g. Goodshuffle) — plus a payload signature stored on
   the linked source_artifacts.metadata, since engagements itself has no metadata column. */

const ENGAGEMENT_TYPES = ['EVENT', 'LONG_TERM_RENTAL', 'INSTALLATION', 'EQUIPMENT_SALE', 'SERVICE', 'OTHER'] as const

interface CreateLeadArgs {
  title: string
  engagementType?: string
  contactName?: string
  organizationName?: string
  email?: string
  phone?: string
  eventDate?: string
  venueName?: string
  customerRequest?: string
  desiredOutcome?: string
  notes?: string
  knownUnknowns?: string[]
  nextActionTitle?: string
  confirmed: boolean
  idempotencyKey: string
}

type ContactMatchResult =
  | { partyId: string; matchState: 'REUSED_EXISTING' | 'CREATED_NEW' }
  | { partyId: null; matchState: 'NOT_PROVIDED' }
  | { partyId: null; matchState: 'AMBIGUOUS_NOT_LINKED'; ambiguousOn: string; ambiguousValue: string }

async function matchOrCreateContactParty(supabase: ScopedSupabase, args: CreateLeadArgs): Promise<ContactMatchResult> {
  const email = args.email?.trim()
  const phone = args.phone?.trim()
  const contactName = args.contactName?.trim()
  const organizationName = args.organizationName?.trim()

  if (!email && !phone && !contactName && !organizationName) {
    return { partyId: null, matchState: 'NOT_PROVIDED' }
  }

  for (const [column, value] of [['email', email], ['phone', phone]] as const) {
    if (!value) continue
    const { data: matches, error } = await supabase
      .from('parties')
      .select('id')
      .ilike(column, value)
      .is('archived_at', null)
      .limit(2)
    if (error) throw new Error(`Contact lookup failed: ${error.message}`)
    if ((matches ?? []).length === 1) return { partyId: matches[0].id, matchState: 'REUSED_EXISTING' }
    if ((matches ?? []).length > 1) return { partyId: null, matchState: 'AMBIGUOUS_NOT_LINKED', ambiguousOn: column, ambiguousValue: value }
  }

  const { data: created, error: createError } = await supabase
    .from('parties')
    .insert({
      party_type: contactName ? 'PERSON' : 'ORGANIZATION',
      name: contactName || organizationName,
      organization_name: organizationName || null,
      email: email || null,
      phone: phone || null,
    })
    .select('id')
    .single()
  if (createError) throw new Error(`Could not create contact: ${createError.message}`)
  return { partyId: created.id, matchState: 'CREATED_NEW' }
}

type VenueMatchResult =
  | { locationId: string; matchState: 'REUSED_EXISTING' | 'CREATED_NEW' }
  | { locationId: null; matchState: 'NOT_PROVIDED' | 'AMBIGUOUS_NOT_LINKED' }

async function matchOrCreateVenueLocation(supabase: ScopedSupabase, venueName?: string): Promise<VenueMatchResult> {
  const name = venueName?.trim()
  if (!name) return { locationId: null, matchState: 'NOT_PROVIDED' }

  const { data: matches, error } = await supabase
    .from('locations')
    .select('id')
    .eq('name', name)
    .is('archived_at', null)
    .limit(2)
  if (error) throw new Error(`Venue lookup failed: ${error.message}`)
  if ((matches ?? []).length === 1) return { locationId: matches[0].id, matchState: 'REUSED_EXISTING' }
  if ((matches ?? []).length > 1) return { locationId: null, matchState: 'AMBIGUOUS_NOT_LINKED' }

  const { data: created, error: createError } = await supabase
    .from('locations')
    .insert({ name, location_type: 'VENUE' })
    .select('id')
    .single()
  if (createError) throw new Error(`Could not create venue: ${createError.message}`)
  return { locationId: created.id, matchState: 'CREATED_NEW' }
}

async function createLead(supabase: ScopedSupabase, args: CreateLeadArgs) {
  const notSaved = (reason: string, extra: Record<string, unknown> = {}) => ({
    saved: false,
    verificationState: 'NOT_SAVED',
    reason,
    ...extra,
  })

  if (args.confirmed !== true) {
    return notSaved('Refused: confirmed must be literally true. This tool only writes after explicit human approval.')
  }
  if (!args.idempotencyKey) return notSaved('idempotencyKey is required.')
  const title = String(args.title || '').trim()
  if (!title) return notSaved('title is required.')
  if (args.engagementType !== undefined && !(ENGAGEMENT_TYPES as readonly string[]).includes(args.engagementType)) {
    return notSaved(`Invalid engagementType: ${args.engagementType}. Must be one of ${ENGAGEMENT_TYPES.join(', ')}.`)
  }

  const sourceKey = `mcp:create_lead:${args.idempotencyKey}`
  const submittedFields = {
    title,
    engagementType: args.engagementType ?? null,
    contactName: args.contactName ?? null,
    organizationName: args.organizationName ?? null,
    email: args.email ?? null,
    phone: args.phone ?? null,
    eventDate: args.eventDate ?? null,
    venueName: args.venueName ?? null,
    customerRequest: args.customerRequest ?? null,
    desiredOutcome: args.desiredOutcome ?? null,
    notes: args.notes ?? null,
    knownUnknowns: args.knownUnknowns ?? null,
    nextActionTitle: args.nextActionTitle ?? null,
  }
  const payloadSignature = JSON.stringify(submittedFields)

  // Idempotency check: has this exact proposal already been submitted? engagements has no
  // metadata column of its own, so the check lives on the linked source_artifacts provenance row.
  const { data: priorArtifact, error: priorError } = await supabase
    .from('source_artifacts')
    .select('id,metadata')
    .eq('metadata->>mcp_idempotency_key', sourceKey)
    .maybeSingle()
  if (priorError) return notSaved(`Could not check for a prior submission with this idempotencyKey: ${priorError.message}`)
  if (priorArtifact) {
    if (priorArtifact.metadata?.mcp_payload_signature !== payloadSignature) {
      return notSaved('This idempotencyKey was already used for a different lead proposal. Use a new idempotencyKey for a new or edited proposal.')
    }
    const priorEngagementId = priorArtifact.metadata?.mcp_engagement_id
    if (!priorEngagementId) return notSaved('A prior submission with this idempotencyKey exists but its engagement could not be resolved.')
    return rereadCreatedLead(supabase, priorEngagementId, 'Idempotent replay — no new record created.')
  }

  const { data: userData } = await supabase.auth.getUser()
  const actorUserId = userData.user?.id ?? null

  // Provenance: preserve exactly what was submitted, same pattern as src/lib/repository.ts's createEngagement.
  const { data: artifact, error: artifactError } = await supabase
    .from('source_artifacts')
    .insert({
      artifact_type: 'TEXT',
      processing_state: 'NOT_REQUIRED',
      created_by: actorUserId,
      metadata: {
        capture_surface: 'stage_presence_mcp',
        mcp_idempotency_key: sourceKey,
        mcp_payload_signature: payloadSignature,
        submitted_fields: submittedFields,
      },
    })
    .select('id')
    .single()
  if (artifactError) return notSaved(`Could not record provenance: ${artifactError.message}`)

  const { data: engagement, error: engagementError } = await supabase
    .from('engagements')
    .insert({
      name: title,
      engagement_type: args.engagementType,
      customer_request: args.customerRequest?.trim() || null,
      desired_outcome: args.desiredOutcome?.trim() || null,
      internal_summary: args.notes?.trim() || null,
      event_start_date: args.eventDate || null,
      source_key: sourceKey,
      created_by: actorUserId,
    })
    .select('id,engagement_number')
    .single()
  if (engagementError) return notSaved(`Could not create engagement: ${engagementError.message}`)

  // Link provenance to the created engagement so an idempotent replay can resolve it later.
  await supabase.from('source_artifacts').update({
    metadata: {
      capture_surface: 'stage_presence_mcp',
      mcp_idempotency_key: sourceKey,
      mcp_payload_signature: payloadSignature,
      mcp_engagement_id: engagement.id,
      submitted_fields: submittedFields,
    },
  }).eq('id', artifact.id)
  await supabase.from('events').insert({
    engagement_id: engagement.id,
    entity_type: 'source_artifact',
    entity_id: artifact.id,
    event_type: 'SOURCE_ADDED',
    actor_user_id: actorUserId,
    summary: 'Lead captured via Stage Presence MCP',
    metadata: { source_type: 'TEXT' },
  })

  let contactResult: ContactMatchResult
  try {
    contactResult = await matchOrCreateContactParty(supabase, args)
  } catch {
    contactResult = { partyId: null, matchState: 'NOT_PROVIDED' }
  }
  if (contactResult.partyId) {
    await supabase.from('engagement_parties').insert({
      engagement_id: engagement.id,
      party_id: contactResult.partyId,
      role: 'CUSTOMER',
      is_primary: true,
    })
  } else if (contactResult.matchState === 'AMBIGUOUS_NOT_LINKED') {
    await supabase.from('engagement_facts').insert({
      engagement_id: engagement.id,
      category: 'CUSTOMER',
      kind: 'OBSERVATION',
      label: 'Contact match needs review',
      value_text: contactResult.ambiguousValue,
      certainty_state: 'CONFLICTING',
      source_type: 'MANUAL',
      source_artifact_id: artifact.id,
      notes: 'Multiple canonical Party records share this exact value. The system preserved the input but did not guess which Party is correct.',
      created_by: actorUserId,
    })
  }

  let venueResult: VenueMatchResult
  try {
    venueResult = await matchOrCreateVenueLocation(supabase, args.venueName)
  } catch {
    venueResult = { locationId: null, matchState: 'NOT_PROVIDED' }
  }
  if (venueResult.locationId) {
    await supabase.from('engagement_locations').insert({
      engagement_id: engagement.id,
      location_id: venueResult.locationId,
      role: 'VENUE',
      is_primary: true,
      certainty_state: 'KNOWN',
      source_artifact_id: artifact.id,
    })
  } else if (venueResult.matchState === 'AMBIGUOUS_NOT_LINKED' && args.venueName?.trim()) {
    await supabase.from('engagement_facts').insert({
      engagement_id: engagement.id,
      category: 'VENUE',
      kind: 'OBSERVATION',
      label: 'Venue match needs review',
      value_text: args.venueName.trim(),
      certainty_state: 'CONFLICTING',
      source_type: 'MANUAL',
      source_artifact_id: artifact.id,
      notes: 'Multiple canonical Location records share this exact name. The system preserved the input but did not guess which Location is correct.',
      created_by: actorUserId,
    })
  }

  let factsRecorded = 0
  for (const raw of args.knownUnknowns ?? []) {
    const label = String(raw || '').trim()
    if (!label) continue
    const { error: factError } = await supabase.from('engagement_facts').insert({
      engagement_id: engagement.id,
      category: 'OTHER',
      kind: 'OBSERVATION',
      label: label.slice(0, 200),
      certainty_state: 'UNKNOWN',
      source_type: 'MANUAL',
      source_artifact_id: artifact.id,
      created_by: actorUserId,
    })
    if (!factError) factsRecorded += 1
  }

  let nextActionCreated = false
  const nextActionTitle = args.nextActionTitle?.trim()
  if (nextActionTitle) {
    const { error: workItemError } = await supabase.from('work_items').insert({
      engagement_id: engagement.id,
      source_key: `${sourceKey}:next_action`,
      title: nextActionTitle,
      action_type: 'FOLLOW_UP',
      status: 'OPEN',
      priority: 'NORMAL',
      certainty_state: 'KNOWN',
      origin: 'MANUAL',
      visibility: 'INTERNAL',
      metadata: { canonical_role: 'MCP_PROPOSED_ACTION', capture_surface: 'stage_presence_mcp' },
    })
    nextActionCreated = !workItemError
  }

  return rereadCreatedLead(supabase, engagement.id, null, {
    contactMatch: contactResult.matchState,
    venueMatch: venueResult.matchState,
    factsRecorded,
    nextActionCreated,
  })
}

async function rereadCreatedLead(
  supabase: ScopedSupabase,
  engagementId: string,
  note: string | null,
  extra: Record<string, unknown> = {},
) {
  // Canonical re-read: never trust the write response alone.
  const { data: verified, error: verifyError } = await supabase
    .from('engagement_summary_v')
    .select('id,engagement_number,name,engagement_type,commercial_state,commitment_state,event_start_date,primary_customer,venue,next_work')
    .eq('id', engagementId)
    .maybeSingle()
  if (verifyError) return { saved: false, verificationState: 'NOT_SAVED', reason: `Canonical re-read failed: ${verifyError.message}` }
  if (!verified) return { saved: false, verificationState: 'NOT_SAVED', reason: 'Canonical re-read did not find the engagement after write.' }

  return {
    saved: true,
    verificationState: 'VERIFIED_SAVED',
    engagementId: verified.id,
    engagementNumber: verified.engagement_number,
    name: verified.name,
    engagementType: verified.engagement_type,
    commercialState: verified.commercial_state,
    commitmentState: verified.commitment_state,
    eventStartDate: verified.event_start_date,
    primaryCustomer: verified.primary_customer,
    venue: verified.venue,
    nextWork: verified.next_work,
    note,
    ...extra,
  }
}

/* ============================== build_quote_draft (read-only, no persistence) ==============================
   Reads the engagement's linked resources and matches each against the current Price Book,
   distinguishing APPROVED_AUTHORITY from DRAFT_CANDIDATE and flagging resources with no matched
   price at all (needsPrice). Computes nothing more than an in-memory proposal — writes nothing.
   The human reviews this exact output, then (if approved) the same line shapes are passed
   explicitly to save_quote_draft — this tool never re-derives pricing on its own initiative. */

function effectiveBillingBasis(rule: { billing_basis: string | null; rate_type: string }) {
  return rule.billing_basis ?? (
    rule.rate_type === 'PER_UNIT' ? 'PER_UNIT' :
    rule.rate_type === 'PER_HOUR' ? 'PER_HOUR' :
    rule.rate_type === 'PER_DAY' ? 'PER_DAY' :
    rule.rate_type === 'MILEAGE' ? 'PER_MILE' :
    rule.rate_type === 'PERCENT' ? 'PERCENT' : 'FLAT'
  )
}

function effectiveDuration(rule: { duration_value: number | null; duration_unit: string | null; rate_type: string }) {
  if (rule.duration_value !== null && rule.duration_unit !== null) return { value: Number(rule.duration_value), unit: rule.duration_unit }
  if (rule.rate_type === 'ONE_DAY') return { value: 1, unit: 'DAY' }
  if (rule.rate_type === 'THREE_DAY') return { value: 3, unit: 'DAY' }
  if (rule.rate_type === 'WEEK') return { value: 1, unit: 'WEEK' }
  if (rule.rate_type === 'MONTH') return { value: 1, unit: 'MONTH' }
  return { value: null as number | null, unit: null as string | null }
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

async function buildQuoteDraft(supabase: ScopedSupabase, args: { engagementNumber: string }) {
  if (!args.engagementNumber) return { found: false, reason: 'engagementNumber is required.' }

  const { data: engagement, error: engagementError } = await supabase
    .from('engagements')
    .select('id,engagement_number,name')
    .eq('engagement_number', args.engagementNumber)
    .maybeSingle()
  if (engagementError) return { found: false, reason: `Could not look up engagement: ${engagementError.message}` }
  if (!engagement) return { found: false, reason: `No engagement found with number ${args.engagementNumber}.` }

  const { data: resourceLinks, error: resourceError } = await supabase
    .from('engagement_resources')
    .select('quantity,relationship,resources(id,name)')
    .eq('engagement_id', engagement.id)
  if (resourceError) return { found: false, reason: `Could not read engagement resources: ${resourceError.message}` }

  const lines = []
  let anyNeedsPrice = false
  let anyDraftOnly = false
  let computableSubtotal = 0
  let allLinesComputable = true

  for (const link of resourceLinks ?? []) {
    const resourceName = (link as any).resources?.name
    if (!resourceName) continue
    const quantity = Number((link as any).quantity) > 0 ? Number((link as any).quantity) : 1

    const { data: candidates } = await supabase
      .from('price_book_v')
      .select('pricing_rule_id,name,resource_name,rate_type,billing_basis,duration_value,duration_unit,amount,currency,status,authority_state,effective_from,effective_through')
      .ilike('resource_name', resourceName)
      .order('authority_state')
      .limit(5)

    const approved = (candidates ?? []).find((c: any) => c.authority_state === 'APPROVED_AUTHORITY')
    const best = approved ?? (candidates ?? [])[0] ?? null

    if (!best || best.amount === null) {
      anyNeedsPrice = true
      allLinesComputable = false
      lines.push({
        resourceName,
        relationship: (link as any).relationship,
        quantity,
        matchedPricing: null,
        authorityState: null,
        needsPrice: true,
        computedAmount: null,
      })
      continue
    }

    if (best.authority_state !== 'APPROVED_AUTHORITY') anyDraftOnly = true
    const basis = effectiveBillingBasis(best)
    const duration = effectiveDuration(best)
    let computedAmount: number | null = null
    if (basis !== 'PERCENT') {
      computedAmount = roundMoney(Number(best.amount) * quantity)
      computableSubtotal += computedAmount
    } else {
      allLinesComputable = false
    }

    lines.push({
      resourceName,
      relationship: (link as any).relationship,
      quantity,
      matchedPricing: {
        pricingRuleId: best.pricing_rule_id,
        name: best.name,
        rateType: best.rate_type,
        billingBasis: basis,
        duration,
        amount: best.amount,
        currency: best.currency,
        status: best.status,
      },
      authorityState: best.authority_state,
      needsPrice: false,
      computedAmount,
    })
  }

  return {
    found: true,
    engagementNumber: engagement.engagement_number,
    engagementName: engagement.name,
    lines,
    summary: {
      lineCount: lines.length,
      anyNeedsPrice,
      anyDraftOnly,
      computedSubtotal: allLinesComputable ? roundMoney(computableSubtotal) : null,
      note: allLinesComputable
        ? null
        : 'Subtotal is partial or unavailable — one or more lines need a price or use PERCENT billing, which this proposal does not auto-compute.',
    },
    proposalOnly: true,
  }
}

/* ============================== save_quote_draft ==============================
   Persists a DRAFT commercial_documents QUOTE + lines — ONLY after the human has approved the
   exact line list (normally the output of build_quote_draft, reviewed and approved as-is or
   edited). Faithfully ports the existing, already-proven validation rules from
   src/lib/pricingRuntime.ts's createDraftQuote/addQuoteLineFromPriceRule/addManualQuoteLine —
   no new pricing policy is invented here. Every line is validated BEFORE anything is written, so
   one bad line aborts the whole call rather than leaving a partial quote. Respects the existing
   "one current DRAFT quote per engagement" rule from pricingRuntime.ts rather than creating a
   duplicate. Never promotes a DRAFT_CANDIDATE Price Book rule to APPROVED_AUTHORITY — it only
   records which authority state was in effect at the moment of the quote. */

const COMMERCIAL_LINE_TYPES = ['RESOURCE', 'SERVICE', 'LABOR', 'LOGISTICS', 'DISCOUNT', 'FEE', 'CUSTOM', 'OTHER'] as const
const TRANSACTION_TYPES = ['RENTAL', 'SALE', 'SERVICE', 'INSTALLATION', 'MIXED', 'UNKNOWN', 'OTHER'] as const

interface QuoteLineInput {
  source: 'MANUAL' | 'PRICE_RULE'
  lineType: string
  description?: string
  quantity?: number
  unitPrice?: number
  pricingRuleId?: string
  billingUnits?: number
  allowDraft?: boolean
  proposedTotal?: number
  priceAdjustmentReason?: string
  groupLabel?: string
  detailText?: string
}

interface SaveQuoteDraftArgs {
  engagementNumber: string
  transactionType?: string
  notes?: string
  validThrough?: string
  lines: QuoteLineInput[]
  confirmed: boolean
  idempotencyKey: string
}

async function saveQuoteDraft(supabase: ScopedSupabase, args: SaveQuoteDraftArgs) {
  const notSaved = (reason: string, extra: Record<string, unknown> = {}) => ({
    saved: false,
    verificationState: 'NOT_SAVED',
    engagementNumber: args.engagementNumber ?? null,
    reason,
    ...extra,
  })

  if (args.confirmed !== true) {
    return notSaved('Refused: confirmed must be literally true. This tool only writes after explicit human approval of the exact line list.')
  }
  if (!args.idempotencyKey) return notSaved('idempotencyKey is required.')
  if (!args.engagementNumber) return notSaved('engagementNumber is required.')
  if (!Array.isArray(args.lines) || args.lines.length === 0) return notSaved('At least one line is required.')
  if (args.transactionType !== undefined && !(TRANSACTION_TYPES as readonly string[]).includes(args.transactionType)) {
    return notSaved(`Invalid transactionType: ${args.transactionType}. Must be one of ${TRANSACTION_TYPES.join(', ')}.`)
  }

  const { data: engagement, error: engagementError } = await supabase
    .from('engagements')
    .select('id,engagement_number')
    .eq('engagement_number', args.engagementNumber)
    .maybeSingle()
  if (engagementError) return notSaved(`Could not look up engagement: ${engagementError.message}`)
  if (!engagement) return notSaved(`No engagement found with number ${args.engagementNumber}. Nothing was written.`)

  const sourceKey = `mcp:save_quote_draft:${args.idempotencyKey}`
  const payloadSignature = JSON.stringify({
    transactionType: args.transactionType ?? null,
    notes: args.notes ?? null,
    validThrough: args.validThrough ?? null,
    lines: args.lines,
  })

  const { data: currentQuote, error: currentQuoteError } = await supabase
    .from('commercial_documents')
    .select('id,document_state,version_no,metadata')
    .eq('engagement_id', engagement.id)
    .eq('document_type', 'QUOTE')
    .neq('document_state', 'VOID')
    .order('version_no', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (currentQuoteError) return notSaved(`Could not check for an existing quote: ${currentQuoteError.message}`)

  if (currentQuote?.document_state === 'DRAFT') {
    if (currentQuote.metadata?.mcp_idempotency_key === sourceKey) {
      if (currentQuote.metadata?.mcp_payload_signature === payloadSignature) {
        return rereadSavedQuote(supabase, currentQuote.id, 'Idempotent replay — no new document created.')
      }
      return notSaved('This idempotencyKey was already used for a different quote proposal on this engagement.', { quoteId: currentQuote.id })
    }
    return notSaved(
      'This engagement already has a current DRAFT quote. Continue editing that quote (via a future targeted edit capability) instead of creating a duplicate — the same rule pricingRuntime.ts already enforces.',
      { quoteId: currentQuote.id },
    )
  }

  // Validate every line BEFORE writing anything, so one bad line aborts the whole call.
  const preparedLines: Record<string, unknown>[] = []
  for (const [index, line] of args.lines.entries()) {
    const fail = (reason: string) => `Line ${index + 1}: ${reason}`
    if (!(COMMERCIAL_LINE_TYPES as readonly string[]).includes(line.lineType)) {
      return notSaved(fail(`invalid lineType ${line.lineType}. Must be one of ${COMMERCIAL_LINE_TYPES.join(', ')}.`))
    }
    const quantity = line.quantity ?? 1
    if (!Number.isFinite(quantity) || quantity <= 0) return notSaved(fail('quantity must be greater than zero.'))

    if (line.source === 'MANUAL') {
      if (!line.description?.trim()) return notSaved(fail('description is required for a MANUAL line.'))
      if (typeof line.unitPrice !== 'number' || !Number.isFinite(line.unitPrice)) return notSaved(fail('unitPrice is required and must be a finite number for a MANUAL line.'))
      if (line.lineType !== 'DISCOUNT' && line.unitPrice < 0) return notSaved(fail('only a DISCOUNT line may use a negative unitPrice.'))
      preparedLines.push({
        line_type: line.lineType,
        group_label: line.groupLabel?.trim() || null,
        description: line.description.trim(),
        detail_text: line.detailText?.trim() || null,
        quantity,
        unit_price: line.unitPrice,
        line_total: roundMoney(quantity * line.unitPrice),
        pricing_authority_state: 'MANUAL_PRICE',
        price_adjustment_reason: line.priceAdjustmentReason?.trim() || null,
        metadata: { pricing_runtime: 'mcp_v1', calculation_method: 'QUANTITY_X_MANUAL_UNIT_PRICE' },
      })
      continue
    }

    if (line.source === 'PRICE_RULE') {
      if (!line.pricingRuleId) return notSaved(fail('pricingRuleId is required when source is PRICE_RULE.'))
      const { data: rule, error: ruleError } = await supabase
        .from('pricing_rules')
        .select('id,name,status,rule_kind,resource_id,rate_type,amount,percentage,effective_from,effective_through,price_position,billing_basis,duration_value,duration_unit')
        .eq('id', line.pricingRuleId)
        .maybeSingle()
      if (ruleError) return notSaved(fail(`could not look up Price Book rule: ${ruleError.message}`))
      if (!rule) return notSaved(fail(`no Price Book rule found with id ${line.pricingRuleId}.`))
      if (rule.status === 'RETIRED') return notSaved(fail('that Price Book rule is retired and cannot be applied to a new quote.'))
      if (rule.status === 'DRAFT' && !line.allowDraft) {
        return notSaved(fail('that Price Book rule is still DRAFT. Explicitly allow the draft candidate (allowDraft) or approve it before applying it.'))
      }
      if (rule.rule_kind !== 'BASE_RATE') {
        return notSaved(fail('save_quote_draft applies BASE_RATE rules to quote lines. Discounts/minimums/surcharges remain explicit MANUAL lines.'))
      }
      if (rule.status === 'APPROVED') {
        const today = new Date().toISOString().slice(0, 10)
        if (rule.effective_from && rule.effective_from > today) return notSaved(fail('that approved price is not effective yet.'))
        if (rule.effective_through && rule.effective_through < today) return notSaved(fail('that approved price is no longer effective.'))
      }
      if (rule.amount === null) return notSaved(fail('that Price Book rule does not contain a fixed amount and cannot be applied yet.'))

      const basis = effectiveBillingBasis(rule)
      if (basis === 'PERCENT') return notSaved(fail('percentage pricing is not a base quote-line calculation here — use a MANUAL line.'))
      const rate = Number(rule.amount)
      let multiplier = quantity
      if (basis === 'PER_HOUR' || basis === 'PER_DAY' || basis === 'PER_MILE') {
        const billingUnits = line.billingUnits ?? NaN
        if (!Number.isFinite(billingUnits) || billingUnits <= 0) return notSaved(fail(`${basis} pricing requires billingUnits greater than zero.`))
        multiplier *= billingUnits
      }
      const policyTotal = roundMoney(rate * multiplier)
      const proposedTotal = line.proposedTotal === undefined ? policyTotal : roundMoney(line.proposedTotal)
      if (!Number.isFinite(proposedTotal)) return notSaved(fail('proposedTotal must be a finite number.'))
      if (proposedTotal < 0 && line.lineType !== 'DISCOUNT') return notSaved(fail('proposedTotal cannot be negative for this line type.'))
      const differsFromPolicy = Math.abs(proposedTotal - policyTotal) > 0.009
      if (differsFromPolicy && !line.priceAdjustmentReason?.trim()) {
        return notSaved(fail('a priceAdjustmentReason is required when the proposed price differs from the Price Book rate.'))
      }

      const duration = effectiveDuration(rule)
      const authorityState = rule.status === 'APPROVED' ? 'APPROVED_AUTHORITY' : 'DRAFT_CANDIDATE'
      const customerUnitPrice = roundMoney(proposedTotal / quantity)

      preparedLines.push({
        line_type: line.lineType,
        group_label: line.groupLabel?.trim() || null,
        resource_id: rule.resource_id ?? null,
        description: line.description?.trim() || rule.name,
        detail_text: line.detailText?.trim() || null,
        quantity,
        unit_price: customerUnitPrice,
        line_total: proposedTotal,
        pricing_rule_id: rule.id,
        policy_amount_snapshot: rule.amount,
        policy_percentage_snapshot: rule.percentage,
        policy_price_position: rule.price_position,
        policy_billing_basis: basis,
        policy_duration_value: duration.value,
        policy_duration_unit: duration.unit,
        policy_total_snapshot: policyTotal,
        pricing_authority_state: authorityState,
        price_adjustment_reason: line.priceAdjustmentReason?.trim() || null,
        metadata: { pricing_runtime: 'mcp_v1', calculation_method: 'PRICE_RULE_APPLIED' },
      })
      continue
    }

    return notSaved(fail(`invalid source ${(line as any).source}. Must be MANUAL or PRICE_RULE.`))
  }

  const { data: userData } = await supabase.auth.getUser()
  const actorUserId = userData.user?.id ?? null
  const today = new Date().toISOString().slice(0, 10)

  const { data: doc, error: docError } = await supabase
    .from('commercial_documents')
    .insert({
      engagement_id: engagement.id,
      document_type: 'QUOTE',
      transaction_type: args.transactionType ?? 'UNKNOWN',
      document_state: 'DRAFT',
      source_system: 'Stage Presence OS',
      document_date: today,
      currency: 'USD',
      certainty_state: 'KNOWN',
      notes: args.notes?.trim() || null,
      valid_through: args.validThrough || null,
      version_no: (currentQuote?.version_no ?? 0) + 1,
      supersedes_document_id: currentQuote?.id ?? null,
      client_visible: true,
      created_by: actorUserId,
      metadata: { pricing_runtime: 'mcp_v1', commercial_origin: 'MCP', mcp_idempotency_key: sourceKey, mcp_payload_signature: payloadSignature },
    })
    .select('id')
    .single()
  if (docError) return notSaved(`Could not create the quote document: ${docError.message}`)

  const { error: linesError } = await supabase
    .from('commercial_document_lines')
    .insert(preparedLines.map((line) => ({ ...line, commercial_document_id: doc.id })))
  if (linesError) return notSaved(`Could not write quote lines: ${linesError.message}`, { quoteId: doc.id })

  // Mirrors src/lib/pricingRuntime.ts's recalculateQuoteTotals exactly: any negative line_total
  // counts as a discount for subtotal/discount_total purposes, not just DISCOUNT-typed lines.
  let subtotal = 0
  let discounts = 0
  let total = 0
  for (const l of preparedLines) {
    const amount = Number(l.line_total ?? 0)
    total += amount
    if (l.line_type === 'DISCOUNT' || amount < 0) discounts += Math.abs(amount)
    else subtotal += amount
  }
  const { error: totalsError } = await supabase.from('commercial_documents').update({
    subtotal: roundMoney(subtotal),
    discount_total: roundMoney(discounts),
    total: roundMoney(total),
    grand_total: roundMoney(total),
  }).eq('id', doc.id)
  if (totalsError) return notSaved(`Quote and lines were written but totals could not be recalculated: ${totalsError.message}`, { quoteId: doc.id })

  return rereadSavedQuote(supabase, doc.id, null)
}

async function rereadSavedQuote(supabase: ScopedSupabase, quoteId: string, note: string | null) {
  // Canonical re-read: never trust the write response alone.
  const { data: doc, error: docError } = await supabase
    .from('commercial_documents')
    .select('id,engagement_id,document_type,document_state,transaction_type,version_no,currency,subtotal,discount_total,total,grand_total,notes,valid_through')
    .eq('id', quoteId)
    .maybeSingle()
  if (docError) return { saved: false, verificationState: 'NOT_SAVED', reason: `Canonical re-read failed: ${docError.message}` }
  if (!doc || doc.document_type !== 'QUOTE' || doc.document_state !== 'DRAFT') {
    return { saved: false, verificationState: 'NOT_SAVED', reason: 'Canonical re-read did not confirm a DRAFT quote document.' }
  }

  const { data: lines, error: linesError } = await supabase
    .from('commercial_line_pricing_v')
    .select('commercial_line_id,line_type,description,quantity,unit_price,line_total,pricing_rule_id,current_pricing_rule_status,resource_name')
    .eq('commercial_document_id', quoteId)
  if (linesError) return { saved: false, verificationState: 'NOT_SAVED', reason: `Canonical line re-read failed: ${linesError.message}` }
  if (!lines || lines.length === 0) {
    return { saved: false, verificationState: 'NOT_SAVED', reason: 'Canonical re-read found the quote but no lines.' }
  }

  const { data: engagementRow } = await supabase
    .from('engagements')
    .select('engagement_number')
    .eq('id', doc.engagement_id)
    .maybeSingle()

  return {
    saved: true,
    verificationState: 'VERIFIED_SAVED',
    quoteId: doc.id,
    engagementNumber: engagementRow?.engagement_number ?? null,
    documentState: doc.document_state,
    versionNo: doc.version_no,
    currency: doc.currency,
    subtotal: doc.subtotal,
    discountTotal: doc.discount_total,
    total: doc.total,
    grandTotal: doc.grand_total,
    lines,
    note,
  }
}

/* ============================== assign_team_member ==============================
   Proposes — never confirms — a crew assignment. Only POSSIBLE and REQUESTED are permitted;
   CONFIRMED/DECLINED/COMPLETED/UNKNOWN are refused, because there is no availability or
   acknowledgement evidence source anywhere in the schema to justify a CONFIRMED assignment —
   crossing that line without evidence is an explicit, documented frontier. */

const ROLE_CODES = [
  'SALES_LEAD', 'PROJECT_MANAGER', 'VIDEO_TECH', 'LED_TECH', 'AUDIO_TECH', 'A1', 'A2',
  'CAMERA', 'CONTENT', 'WAREHOUSE', 'DRIVER', 'LABOR', 'INSTALLER', 'OTHER',
] as const
const ASSIGNABLE_STATES = ['POSSIBLE', 'REQUESTED'] as const

interface AssignTeamMemberArgs {
  engagementNumber: string
  teamMemberId: string
  roleCode: string
  assignmentState: string
  roleLabel?: string
  scheduledStart?: string
  scheduledEnd?: string
  notes?: string
  confirmed: boolean
  idempotencyKey: string
}

function assignmentPayloadMatches(existing: any, requested: Record<string, unknown>) {
  return (
    existing.team_member_id === requested.team_member_id &&
    existing.role_code === requested.role_code &&
    existing.assignment_state === requested.assignment_state &&
    (existing.role_label ?? null) === (requested.role_label ?? null) &&
    (existing.scheduled_start ?? null) === (requested.scheduled_start ?? null) &&
    (existing.scheduled_end ?? null) === (requested.scheduled_end ?? null) &&
    (existing.notes ?? null) === (requested.notes ?? null)
  )
}

async function assignTeamMember(supabase: ScopedSupabase, args: AssignTeamMemberArgs) {
  const notSaved = (reason: string, extra: Record<string, unknown> = {}) => ({
    saved: false,
    verificationState: 'NOT_SAVED',
    reason,
    ...extra,
  })

  if (args.confirmed !== true) {
    return notSaved('Refused: confirmed must be literally true. This tool only writes after explicit human approval.')
  }
  if (!args.idempotencyKey) return notSaved('idempotencyKey is required.')
  if (!args.engagementNumber) return notSaved('engagementNumber is required.')
  if (!args.teamMemberId) return notSaved('teamMemberId is required — resolve one first with find_team_member.')
  if (!(ROLE_CODES as readonly string[]).includes(args.roleCode)) {
    return notSaved(`Invalid roleCode: ${args.roleCode}. Must be one of ${ROLE_CODES.join(', ')}.`)
  }
  if (!(ASSIGNABLE_STATES as readonly string[]).includes(args.assignmentState)) {
    return notSaved(
      `Invalid assignmentState: ${args.assignmentState}. This tool only creates POSSIBLE or REQUESTED assignments — CONFIRMED requires an availability/acknowledgement evidence rule that does not exist yet.`,
    )
  }
  if (args.scheduledStart && args.scheduledEnd && args.scheduledEnd < args.scheduledStart) {
    return notSaved('scheduledEnd cannot be before scheduledStart.')
  }

  const { data: engagement, error: engagementError } = await supabase
    .from('engagements')
    .select('id,engagement_number')
    .eq('engagement_number', args.engagementNumber)
    .maybeSingle()
  if (engagementError) return notSaved(`Could not look up engagement: ${engagementError.message}`)
  if (!engagement) return notSaved(`No engagement found with number ${args.engagementNumber}. Nothing was written.`)

  const { data: teamMember, error: teamMemberError } = await supabase
    .from('team_members')
    .select('id,display_name,active')
    .eq('id', args.teamMemberId)
    .maybeSingle()
  if (teamMemberError) return notSaved(`Could not look up team member: ${teamMemberError.message}`)
  if (!teamMember) return notSaved(`No team member found with id ${args.teamMemberId}. Nothing was written.`)

  const sourceKey = `mcp:assign_team_member:${args.idempotencyKey}`
  const requestedPayload = {
    engagement_id: engagement.id,
    team_member_id: teamMember.id,
    role_code: args.roleCode,
    assignment_state: args.assignmentState,
    role_label: args.roleLabel?.trim() || null,
    scheduled_start: args.scheduledStart ?? null,
    scheduled_end: args.scheduledEnd ?? null,
    notes: args.notes?.trim() || null,
  }

  const { data: existing, error: existingError } = await supabase
    .from('engagement_assignments')
    .select('id,team_member_id,role_code,assignment_state,role_label,scheduled_start,scheduled_end,notes')
    .eq('source_key', sourceKey)
    .maybeSingle()
  if (existingError) return notSaved(`Could not check for a prior write with this idempotencyKey: ${existingError.message}`)

  let assignmentId: string
  if (existing) {
    if (!assignmentPayloadMatches(existing, requestedPayload)) {
      return notSaved(
        'This idempotencyKey was already used for a different proposed assignment. Use a new idempotencyKey for a new or edited proposal.',
        { assignmentId: existing.id },
      )
    }
    assignmentId = existing.id
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from('engagement_assignments')
      .insert({
        ...requestedPayload,
        source_key: sourceKey,
        certainty_state: 'KNOWN',
        metadata: { canonical_role: 'MCP_PROPOSED_ASSIGNMENT', capture_surface: 'stage_presence_mcp' },
      })
      .select('id')
      .single()
    if (insertError) return notSaved(`Write failed: ${insertError.message}`)
    assignmentId = inserted.id
  }

  // Canonical re-read: never trust the write (or the pre-check) response alone.
  const { data: verified, error: verifyError } = await supabase
    .from('engagement_assignments')
    .select('id,engagement_id,team_member_id,role_code,role_label,assignment_state,scheduled_start,scheduled_end,notes')
    .eq('id', assignmentId)
    .maybeSingle()
  if (verifyError) return notSaved(`Canonical re-read failed: ${verifyError.message}`, { assignmentId })
  if (!verified) return notSaved('Canonical re-read did not find the record after write.', { assignmentId })

  return {
    saved: true,
    verificationState: 'VERIFIED_SAVED',
    assignmentId: verified.id,
    engagementNumber: engagement.engagement_number,
    teamMemberId: verified.team_member_id,
    teamMemberName: teamMember.display_name,
    teamMemberActive: teamMember.active,
    roleCode: verified.role_code,
    roleLabel: verified.role_label,
    assignmentState: verified.assignment_state,
    scheduledStart: verified.scheduled_start,
    scheduledEnd: verified.scheduled_end,
    availabilityNote:
      'This assignment_state records a proposal only — it does not prove or confirm actual crew availability. Confirming availability requires an evidence rule that does not exist yet.',
  }
}

/* ============================== add_resource_requirement ==============================
   Records that an engagement needs/is considering/is configuring a resource — never that
   inventory is available, held, or reserved. Targets only the existing engagement_resources
   requirement/configuration layer (relationship + requirement-window + sourcing fields already
   established by the schema); never touches resource_commitments (HOLD/RESERVATION/ALLOCATION),
   which remains a separate, not-yet-built frontier.
   Idempotent via a source_artifacts provenance row (engagement_resources has no metadata/source_key
   column of its own — same pattern create_lead already established) plus the table's own real
   unique(engagement_id, resource_id, relationship) constraint as an independent second guard. */

const RESOURCE_RELATIONSHIPS = ['CUSTOMER_REQUESTED', 'CONSIDERING', 'RECOMMENDED', 'CONFIGURED'] as const
const REQUIREMENT_WINDOW_STATES = ['UNKNOWN', 'INFERRED_FROM_EVENT', 'ESTIMATED', 'KNOWN', 'VERIFIED'] as const
const SOURCING_MODELS = ['OWNED', 'SUBCONTRACTED', 'PARTNER', 'VENUE', 'UNKNOWN'] as const

interface AddResourceRequirementArgs {
  engagementNumber: string
  resourceId: string
  relationship: string
  quantity?: number
  notes?: string
  requiredFromDate?: string
  requiredThroughDate?: string
  requirementWindowState?: string
  plannedSourcingModel?: string
  confirmed: boolean
  idempotencyKey: string
}

async function addResourceRequirement(supabase: ScopedSupabase, args: AddResourceRequirementArgs) {
  const notSaved = (reason: string, extra: Record<string, unknown> = {}) => ({
    saved: false,
    verificationState: 'NOT_SAVED',
    reason,
    ...extra,
  })

  if (args.confirmed !== true) {
    return notSaved('Refused: confirmed must be literally true. This tool only writes after explicit human approval.')
  }
  if (!args.idempotencyKey) return notSaved('idempotencyKey is required.')
  if (!args.engagementNumber) return notSaved('engagementNumber is required.')
  if (!args.resourceId) return notSaved('resourceId is required — resolve one first with find_resource rather than guessing a name.')
  if (!(RESOURCE_RELATIONSHIPS as readonly string[]).includes(args.relationship)) {
    return notSaved(`Invalid relationship: ${args.relationship}. Must be one of ${RESOURCE_RELATIONSHIPS.join(', ')}.`)
  }
  if (args.quantity !== undefined && (!Number.isFinite(args.quantity) || args.quantity <= 0)) {
    return notSaved('quantity must be a positive number if supplied.')
  }
  if (args.requirementWindowState !== undefined && !(REQUIREMENT_WINDOW_STATES as readonly string[]).includes(args.requirementWindowState)) {
    return notSaved(`Invalid requirementWindowState: ${args.requirementWindowState}. Must be one of ${REQUIREMENT_WINDOW_STATES.join(', ')}.`)
  }
  if (args.plannedSourcingModel !== undefined && !(SOURCING_MODELS as readonly string[]).includes(args.plannedSourcingModel)) {
    return notSaved(`Invalid plannedSourcingModel: ${args.plannedSourcingModel}. Must be one of ${SOURCING_MODELS.join(', ')}.`)
  }
  if (args.requiredFromDate && args.requiredThroughDate && args.requiredThroughDate < args.requiredFromDate) {
    return notSaved('requiredThroughDate cannot be before requiredFromDate.')
  }

  const { data: engagement, error: engagementError } = await supabase
    .from('engagements')
    .select('id,engagement_number')
    .eq('engagement_number', args.engagementNumber)
    .maybeSingle()
  if (engagementError) return notSaved(`Could not look up engagement: ${engagementError.message}`)
  if (!engagement) return notSaved(`No engagement found with number ${args.engagementNumber}. Nothing was written.`)

  const { data: resource, error: resourceError } = await supabase
    .from('resources')
    .select('id,name,active')
    .eq('id', args.resourceId)
    .maybeSingle()
  if (resourceError) return notSaved(`Could not look up resource: ${resourceError.message}`)
  if (!resource) return notSaved(`No resource found with id ${args.resourceId}. Nothing was written.`)

  const sourceKey = `mcp:add_resource_requirement:${args.idempotencyKey}`
  const windowState = args.requirementWindowState ?? (args.requiredFromDate || args.requiredThroughDate ? 'KNOWN' : undefined)
  const requestedPayload: Record<string, unknown> = {
    engagement_id: engagement.id,
    resource_id: resource.id,
    relationship: args.relationship,
    quantity: args.quantity ?? null,
    notes: args.notes?.trim() || null,
    required_from_date: args.requiredFromDate ?? null,
    required_through_date: args.requiredThroughDate ?? null,
  }
  if (windowState !== undefined) requestedPayload.requirement_window_state = windowState
  if (args.plannedSourcingModel !== undefined) requestedPayload.planned_sourcing_model = args.plannedSourcingModel
  const payloadSignature = JSON.stringify(requestedPayload, Object.keys(requestedPayload).sort())

  // Idempotency check via provenance row (engagement_resources has no metadata column of its own).
  const { data: priorArtifact, error: priorError } = await supabase
    .from('source_artifacts')
    .select('id,metadata')
    .eq('metadata->>mcp_idempotency_key', sourceKey)
    .maybeSingle()
  if (priorError) return notSaved(`Could not check for a prior submission with this idempotencyKey: ${priorError.message}`)
  if (priorArtifact) {
    if (priorArtifact.metadata?.mcp_payload_signature !== payloadSignature) {
      return notSaved('This idempotencyKey was already used for a different proposed requirement. Use a new idempotencyKey for a new or edited proposal.')
    }
    const priorRequirementId = priorArtifact.metadata?.mcp_requirement_id
    if (!priorRequirementId) return notSaved('A prior submission with this idempotencyKey exists but its requirement record could not be resolved.')
    return rereadResourceRequirement(supabase, priorRequirementId, 'Idempotent replay — no new record created.')
  }

  const { data: userData } = await supabase.auth.getUser()
  const actorUserId = userData.user?.id ?? null

  const { data: artifact, error: artifactError } = await supabase
    .from('source_artifacts')
    .insert({
      artifact_type: 'TEXT',
      processing_state: 'NOT_REQUIRED',
      created_by: actorUserId,
      metadata: { capture_surface: 'stage_presence_mcp', mcp_idempotency_key: sourceKey, mcp_payload_signature: payloadSignature },
    })
    .select('id')
    .single()
  if (artifactError) return notSaved(`Could not record provenance: ${artifactError.message}`)

  const { data: inserted, error: insertError } = await supabase
    .from('engagement_resources')
    .insert({ ...requestedPayload, source_artifact_id: artifact.id })
    .select('id')
    .single()

  if (insertError) {
    // The table's own unique(engagement_id, resource_id, relationship) constraint means this exact
    // combination may already exist from a different write — never silently touch someone else's row.
    const { data: existingRow } = await supabase
      .from('engagement_resources')
      .select('id')
      .eq('engagement_id', engagement.id)
      .eq('resource_id', resource.id)
      .eq('relationship', args.relationship)
      .maybeSingle()
    if (existingRow) {
      return notSaved(
        `This engagement already has a ${args.relationship} requirement for resource "${resource.name}". Changing its fields needs a future targeted update capability — this tool only creates.`,
        { requirementId: existingRow.id },
      )
    }
    return notSaved(`Write failed: ${insertError.message}`)
  }

  await supabase.from('source_artifacts').update({
    metadata: { capture_surface: 'stage_presence_mcp', mcp_idempotency_key: sourceKey, mcp_payload_signature: payloadSignature, mcp_requirement_id: inserted.id },
  }).eq('id', artifact.id)

  return rereadResourceRequirement(supabase, inserted.id, null)
}

async function rereadResourceRequirement(supabase: ScopedSupabase, requirementId: string, note: string | null) {
  // Canonical re-read: never trust the write response alone.
  const { data: verified, error: verifyError } = await supabase
    .from('engagement_resources')
    .select('id,engagement_id,resource_id,relationship,quantity,notes,required_from_date,required_through_date,requirement_window_state,planned_sourcing_model,resources(name)')
    .eq('id', requirementId)
    .maybeSingle()
  if (verifyError) return { saved: false, verificationState: 'NOT_SAVED', reason: `Canonical re-read failed: ${verifyError.message}` }
  if (!verified) return { saved: false, verificationState: 'NOT_SAVED', reason: 'Canonical re-read did not find the record after write.' }

  return {
    saved: true,
    verificationState: 'VERIFIED_SAVED',
    requirementId: verified.id,
    resourceName: (verified as any).resources?.name ?? null,
    relationship: verified.relationship,
    quantity: verified.quantity,
    requiredFromDate: verified.required_from_date,
    requiredThroughDate: verified.required_through_date,
    requirementWindowState: verified.requirement_window_state,
    plannedSourcingModel: verified.planned_sourcing_model,
    note,
    availabilityNote:
      'This records a requirement/consideration only — it does not mean this resource is available, held, or reserved. A real hold/reservation policy (resource_commitments) remains a separate, not-yet-built capability.',
  }
}

/* ============================== generate_email (draft-only, never sends) ============================== */

const EMAIL_KINDS = [
  'LEAD_RESPONSE', 'MISSING_INFO_REQUEST', 'QUOTE_FOLLOW_UP', 'QUOTE_COVER',
  'EVENT_CONFIRMATION_DRAFT', 'LOGISTICS_REQUEST', 'INTERNAL_HANDOFF',
] as const

async function generateEmail(supabase: ScopedSupabase, args: { engagementNumber: string; kind: string }) {
  if (!(EMAIL_KINDS as readonly string[]).includes(args.kind)) {
    return { found: false, reason: `Invalid kind: ${args.kind}. Must be one of ${EMAIL_KINDS.join(', ')}.` }
  }
  const e = await loadEngagementByNumber(supabase, args.engagementNumber)
  if (!e) return { found: false, engagementNumber: args.engagementNumber, reason: 'No engagement found.' }

  const primary = (e.engagement_parties || []).find((p: any) => p.is_primary) || (e.engagement_parties || [])[0]
  const contactName = primary?.parties?.name || 'there'

  const { data: quote } = await supabase
    .from('commercial_documents')
    .select('id,document_state,total,grand_total,currency,version_no')
    .eq('engagement_id', e.id)
    .eq('document_type', 'QUOTE')
    .neq('document_state', 'VOID')
    .order('version_no', { ascending: false })
    .limit(1)
    .maybeSingle()

  const openFacts = (e.engagement_facts || [])
    .filter((f: any) => ['UNKNOWN', 'REQUESTED', 'CONFLICTING'].includes(f.certainty_state))
    .map((f: any) => f.label)

  const quoteAmount = quote ? `${quote.currency} ${quote.grand_total ?? quote.total ?? 'TBD'}` : null
  const factualInputsUsed = [
    `Engagement: ${e.name} (${e.engagement_number})`,
    `Commercial state: ${e.commercial_state}, Commitment state: ${e.commitment_state}`,
    e.event_start_date ? `Event date: ${e.event_start_date}` : 'Event date: unknown',
    quote ? `Current quote: v${quote.version_no}, ${quote.document_state}, ${quoteAmount}` : 'No current quote on file',
  ]
  const assumptions: string[] = []
  if (!primary) assumptions.push('No primary contact on file — recipient name is a placeholder.')
  if (openFacts.length) assumptions.push(`Open/unresolved facts not addressed in this draft: ${openFacts.join('; ')}`)

  let subject = ''
  let body = ''
  switch (args.kind) {
    case 'LEAD_RESPONSE':
      subject = `Re: ${e.name}`
      body = `Hi ${contactName},\n\nThanks for reaching out about ${e.name}. We'd love to help — could you share a bit more about your event so we can put together the right solution?\n\nBest,\nStage Presence`
      break
    case 'MISSING_INFO_REQUEST':
      subject = `A couple of details for ${e.name}`
      body = `Hi ${contactName},\n\nTo move forward on ${e.name}, could you confirm:\n${(openFacts.length ? openFacts : ['event date, venue, and scope']).map((f: string) => `- ${f}`).join('\n')}\n\nThanks,\nStage Presence`
      break
    case 'QUOTE_FOLLOW_UP':
      subject = `Following up on your ${e.name} quote`
      body = `Hi ${contactName},\n\nJust checking in on the quote${quoteAmount ? ` (v${quote?.version_no}, ${quoteAmount})` : ''} for ${e.name}. Let us know if you have any questions or would like to move forward.\n\nBest,\nStage Presence`
      break
    case 'QUOTE_COVER':
      subject = `Your quote for ${e.name}`
      body = `Hi ${contactName},\n\nAttached is our proposal for ${e.name}${quoteAmount ? ` (${quoteAmount})` : ''}. Happy to walk through any part of it.\n\nBest,\nStage Presence`
      break
    case 'EVENT_CONFIRMATION_DRAFT':
      subject = `Confirming details for ${e.name}`
      body = `Hi ${contactName},\n\nAs we get closer to ${e.event_start_date ?? 'your event date'}, wanted to confirm the plan for ${e.name}. Let us know if anything has changed.\n\nBest,\nStage Presence`
      break
    case 'LOGISTICS_REQUEST':
      subject = `Logistics details for ${e.name}`
      body = `Hi ${contactName},\n\nCould you confirm load-in access, parking, and power availability at the venue for ${e.name}?\n\nThanks,\nStage Presence`
      break
    case 'INTERNAL_HANDOFF':
      subject = `Handoff: ${e.name} (${e.engagement_number})`
      body = `Team,\n\nHanding off ${e.name} (${e.engagement_number}). Commercial: ${e.commercial_state}, Commitment: ${e.commitment_state}.${openFacts.length ? ` Open items: ${openFacts.join('; ')}.` : ''}\n\nThanks`
      break
  }

  return {
    found: true,
    engagementNumber: e.engagement_number,
    kind: args.kind,
    intendedAudience: args.kind === 'INTERNAL_HANDOFF' ? 'INTERNAL' : 'CUSTOMER',
    recipientHint: primary ? (primary.parties?.email || primary.parties?.name || null) : null,
    subject,
    body,
    factualInputsUsed,
    assumptions,
    draftOnly: true,
    sent: false,
  }
}

/* ============================== get_capabilities (read-only capability truth) ==============================
   Lets the calling AI (or Greg) truthfully ask what this system can actually do, reconciling
   src/lib/capabilityRegistry.ts's SPA-facing surface with what is really deployed here. Never
   advertises email sending, confirmed crew availability, inventory availability/holds/reservations,
   pricing authority changes, or payment-truth changes — those are FRONTIER or NOT_IMPLEMENTED until
   they are actually built and proven. */

const CAPABILITY_TRUTH = [
  { name: 'find_contact', category: 'READ' },
  { name: 'find_engagement', category: 'READ' },
  { name: 'get_pricing', category: 'READ' },
  { name: 'generate_lead_summary', category: 'READ' },
  { name: 'generate_job_sheet', category: 'READ', note: 'Internal projection only — never presents REQUESTED crew as confirmed or a requirement as reserved inventory.' },
  { name: 'search_stage_presence', category: 'READ' },
  { name: 'get_attention_items', category: 'READ' },
  { name: 'get_upcoming_engagements', category: 'READ' },
  { name: 'build_quote_draft', category: 'READ', note: 'Proposes a quote; never persists anything.' },
  { name: 'find_team_member', category: 'READ' },
  { name: 'find_resource', category: 'READ' },
  { name: 'get_capabilities', category: 'READ' },
  { name: 'generate_email', category: 'DRAFT_ONLY', note: 'Produces subject/body only. Never sends. Sending email is NOT_IMPLEMENTED.' },
  { name: 'set_next_action', category: 'APPROVAL_REQUIRED' },
  { name: 'complete_next_action', category: 'APPROVAL_REQUIRED' },
  { name: 'update_next_action', category: 'APPROVAL_REQUIRED' },
  { name: 'create_lead', category: 'APPROVAL_REQUIRED' },
  { name: 'save_quote_draft', category: 'APPROVAL_REQUIRED', note: 'Never promotes DRAFT_CANDIDATE pricing to approved policy.' },
  { name: 'assign_team_member', category: 'APPROVAL_REQUIRED', note: 'Only creates POSSIBLE/REQUESTED. Cannot create CONFIRMED — see confirm_crew_availability frontier.' },
  { name: 'add_resource_requirement', category: 'APPROVAL_REQUIRED', note: 'Records requirement/consideration/configuration only — never inventory availability or a hold/reservation.' },
  { name: 'confirm_crew_availability', category: 'FRONTIER', note: 'No availability/acknowledgement evidence source exists yet in the schema.' },
  { name: 'create_resource_hold_or_reservation', category: 'FRONTIER', note: 'resource_commitments (HOLD/RESERVATION/ALLOCATION) exists cleanly, but the CONFIGURED -> REQUIREMENT WINDOW -> PRESSURE -> HOLD -> RESERVATION policy has not been built.' },
  { name: 'approve_or_change_pricing_authority', category: 'FRONTIER', note: 'Pricing authority decisions are a standing hard-stop boundary.' },
  { name: 'send_email', category: 'NOT_IMPLEMENTED' },
  { name: 'mark_invoice_or_payment_paid', category: 'NOT_IMPLEMENTED' },
  { name: 'delete_or_void_business_record', category: 'NOT_IMPLEMENTED' },
] as const

async function getCapabilities() {
  return {
    generatedAt: new Date().toISOString(),
    capabilities: CAPABILITY_TRUTH,
    rules: [
      'Never advertise email sending, confirmed crew availability, inventory availability/holds/reservations, pricing authority changes, or payment-truth changes unless actually implemented and proven.',
      'Every APPROVAL_REQUIRED capability requires confirmed:true and is never reported SAVED until a canonical re-read confirms it.',
    ],
  }
}

Deno.serve(
  pipeline(
    [withOAuthProtectedResource(), withSupabase({ auth: 'user' })],
    async (req, { supabase }) => {
      const handler = createMcpHandler(() => {
        const server = new McpServer({ name: 'stage-presence', version: '1.4.0' })

        server.registerTool('find_contact', {
          description: 'Search Stage Presence contacts by name, organization, email, or phone. Read-only.',
          inputSchema: z.object({ query: z.string() }),
          annotations: { readOnlyHint: true },
        }, async ({ query }) => {
          try { return toolResult(await findContact(supabase, query)) }
          catch (error) { return toolError(error) }
        })

        server.registerTool('find_engagement', {
          description: 'Search Stage Presence engagements by name, number, or request text. Read-only.',
          inputSchema: z.object({ query: z.string() }),
          annotations: { readOnlyHint: true },
        }, async ({ query }) => {
          try { return toolResult(await findEngagement(supabase, query)) }
          catch (error) { return toolError(error) }
        })

        server.registerTool('get_pricing', {
          description: 'Read the current Stage Presence Price Book with explicit pricing authority state. Read-only.',
          inputSchema: z.object({
            item: z.string().optional(),
            category: z.string().optional(),
            roleCode: z.string().optional(),
            scopeType: z.string().optional(),
          }),
          annotations: { readOnlyHint: true },
        }, async (args) => {
          try { return toolResult(await getPricing(supabase, args)) }
          catch (error) { return toolError(error) }
        })

        server.registerTool('generate_lead_summary', {
          description: 'Generate a lead summary for a real engagement number. Read-only.',
          inputSchema: z.object({ engagementNumber: z.string() }),
          annotations: { readOnlyHint: true },
        }, async ({ engagementNumber }) => {
          try { return toolResult(await generateLeadSummary(supabase, engagementNumber)) }
          catch (error) { return toolError(error) }
        })

        server.registerTool('generate_job_sheet', {
          description: 'Generate a job sheet for a real engagement number. Read-only.',
          inputSchema: z.object({ engagementNumber: z.string() }),
          annotations: { readOnlyHint: true },
        }, async ({ engagementNumber }) => {
          try { return toolResult(await generateJobSheet(supabase, engagementNumber)) }
          catch (error) { return toolError(error) }
        })

        server.registerTool('search_stage_presence', {
          description: 'Search Stage Presence engagements and contacts together. Read-only.',
          inputSchema: z.object({ query: z.string() }),
          annotations: { readOnlyHint: true },
        }, async ({ query }) => {
          try {
            const [engagements, contacts] = await Promise.all([
              findEngagement(supabase, query),
              findContact(supabase, query),
            ])
            return toolResult({ engagements, contacts })
          } catch (error) {
            return toolError(error)
          }
        })

        server.registerTool('get_attention_items', {
          description: 'Return current Stage Presence engagements that need attention or have open work. Read-only.',
          inputSchema: z.object({}),
          annotations: { readOnlyHint: true },
        }, async () => {
          try { return toolResult(await getAttentionItems(supabase)) }
          catch (error) { return toolError(error) }
        })

        server.registerTool('get_upcoming_engagements', {
          description: 'Return current future Stage Presence engagements, soonest first. Read-only.',
          inputSchema: z.object({ limit: z.number().int().positive().max(50).optional() }),
          annotations: { readOnlyHint: true },
        }, async ({ limit }) => {
          try { return toolResult(await getUpcomingEngagements(supabase, limit)) }
          catch (error) { return toolError(error) }
        })

        server.registerTool('find_team_member', {
          description: 'Search Stage Presence team members by display name, username, or primary role. Read-only.',
          inputSchema: z.object({ query: z.string() }),
          annotations: { readOnlyHint: true },
        }, async ({ query }) => {
          try { return toolResult(await findTeamMember(supabase, query)) }
          catch (error) { return toolError(error) }
        })

        server.registerTool('find_resource', {
          description: 'Search Stage Presence resources (equipment/inventory library) by name or type. Read-only — does not indicate current availability.',
          inputSchema: z.object({ query: z.string(), category: z.string().optional() }),
          annotations: { readOnlyHint: true },
        }, async (args) => {
          try { return toolResult(await findResource(supabase, args)) }
          catch (error) { return toolError(error) }
        })

        server.registerTool('get_capabilities', {
          description: 'Return the truthful, current capability list for this MCP surface (READ / DRAFT_ONLY / APPROVAL_REQUIRED / FRONTIER / NOT_IMPLEMENTED). Read-only.',
          inputSchema: z.object({}),
          annotations: { readOnlyHint: true },
        }, async () => {
          try { return toolResult(await getCapabilities()) }
          catch (error) { return toolError(error) }
        })

        server.registerTool('generate_email', {
          description: 'Generate a draft email (lead response, missing-info request, quote follow-up, quote cover, event confirmation draft, logistics request, or internal handoff) using live canonical engagement context. Draft only — never sends, never marks anything sent, never changes engagement state. Read-only.',
          inputSchema: z.object({
            engagementNumber: z.string(),
            kind: z.enum(EMAIL_KINDS),
          }),
          annotations: { readOnlyHint: true },
        }, async (args) => {
          try { return toolResult(await generateEmail(supabase, args)) }
          catch (error) { return toolError(error) }
        })

        server.registerTool('set_next_action', {
          description:
            'Write ONE new OPEN work item (next action) on a real engagement — ONLY after the human has explicitly approved the exact proposed change (confirmed=true). Never modifies, cancels, completes, or reprioritizes any existing work item. Idempotent: retries with the same idempotencyKey AND the same payload return the already-saved record instead of duplicating it; the same idempotencyKey with a different payload is refused (NOT_SAVED). Always re-reads the canonical row after writing and only reports success if that re-read confirms it.',
          inputSchema: z.object({
            engagementNumber: z.string().describe('Real engagement number, e.g. SP-000014'),
            title: z.string(),
            actionType: z.enum(ACTION_TYPES),
            priority: z.enum(PRIORITIES),
            dueDate: z.string().optional().describe('Optional ISO date (YYYY-MM-DD)'),
            whyNow: z.string().optional(),
            instructions: z.string().optional(),
            successCondition: z.string().optional(),
            confirmed: z.literal(true).describe('Must be literally true. Set only after the human clicked Approve on the exact proposed change.'),
            idempotencyKey: z.string().describe('A unique key for this proposed mutation; a retry with the same key and the same payload is a no-op, a different payload is refused.'),
          }),
          annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
        }, async (args) => {
          try { return toolResult(await setNextAction(supabase, args)) }
          catch (error) { return toolError(error) }
        })

        server.registerTool('complete_next_action', {
          description:
            'Mark ONE specific work item (by workItemId) DONE — ONLY after the human has explicitly approved it (confirmed=true). Only allows the transition OPEN/WAITING/BLOCKED -> DONE; refuses on any other current status. Never completes a different item. Idempotent: a retry with the same idempotencyKey on an already-completed item is a safe no-op; completing an already-DONE item under a different idempotencyKey is refused. Always re-reads the canonical row after writing and only reports success if that re-read confirms it.',
          inputSchema: z.object({
            workItemId: z.string().describe('The specific work item to complete — never "whatever is next".'),
            confirmed: z.literal(true).describe('Must be literally true. Set only after the human clicked Approve on the exact proposed change.'),
            idempotencyKey: z.string().describe('A unique key for this proposed mutation; a retry with the same key is a no-op once completed.'),
          }),
          annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
        }, async (args) => {
          try { return toolResult(await completeNextAction(supabase, args)) }
          catch (error) { return toolError(error) }
        })

        server.registerTool('update_next_action', {
          description:
            'Narrowly edit ONE specific work item (by workItemId) — ONLY after the human has explicitly approved the exact proposed change (confirmed=true). Only the fields explicitly supplied are changed; omitted fields are left untouched. Refuses to edit a DONE or CANCELLED (closed) item. Idempotent: a retry with the same idempotencyKey AND the same field payload is a safe no-op; the same idempotencyKey with a different payload is refused (NOT_SAVED). Always re-reads the canonical row after writing and only reports success if that re-read confirms every requested change.',
          inputSchema: z.object({
            workItemId: z.string().describe('The specific work item to edit.'),
            confirmed: z.literal(true).describe('Must be literally true. Set only after the human clicked Approve on the exact proposed change.'),
            idempotencyKey: z.string().describe('A unique key for this proposed mutation; a retry with the same key and the same payload is a no-op, a different payload is refused.'),
            title: z.string().optional(),
            actionType: z.enum(ACTION_TYPES).optional(),
            priority: z.enum(PRIORITIES).optional(),
            dueDate: z.string().optional().describe('ISO date (YYYY-MM-DD)'),
            whyNow: z.string().optional(),
            instructions: z.string().optional(),
            successCondition: z.string().optional(),
          }),
          annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
        }, async (args) => {
          try { return toolResult(await updateNextAction(supabase, args)) }
          catch (error) { return toolError(error) }
        })

        server.registerTool('create_lead', {
          description:
            'Create ONE new early-stage Engagement (a lead) — ONLY after the human has explicitly approved the exact proposed record (confirmed=true). A lead is not a separate entity: this creates a real engagements row plus, where supplied, a linked contact (Party), venue (Location), known-unknown facts, and an initial next action. Never auto-merges an ambiguous contact or venue match — reuses one only on an exact, unambiguous match; otherwise creates a new record and flags the ambiguity. Idempotent: a retry with the same idempotencyKey AND the same payload returns the already-created engagement instead of duplicating it; the same idempotencyKey with a different payload is refused (NOT_SAVED). Always re-reads the canonical engagement after writing and only reports success if that re-read confirms it.',
          inputSchema: z.object({
            title: z.string().describe('The engagement/project name.'),
            engagementType: z.enum(ENGAGEMENT_TYPES).optional(),
            contactName: z.string().optional(),
            organizationName: z.string().optional(),
            email: z.string().optional(),
            phone: z.string().optional(),
            eventDate: z.string().optional().describe('ISO date (YYYY-MM-DD)'),
            venueName: z.string().optional(),
            customerRequest: z.string().optional(),
            desiredOutcome: z.string().optional(),
            notes: z.string().optional(),
            knownUnknowns: z.array(z.string()).optional().describe('Plain-text list of things explicitly not yet known.'),
            nextActionTitle: z.string().optional().describe('If supplied, creates one OPEN FOLLOW_UP work item on the new engagement.'),
            confirmed: z.literal(true).describe('Must be literally true. Set only after the human clicked Approve on the exact proposed record.'),
            idempotencyKey: z.string().describe('A unique key for this proposed creation; a retry with the same key and the same payload is a no-op, a different payload is refused.'),
          }),
          annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
        }, async (args) => {
          try { return toolResult(await createLead(supabase, args)) }
          catch (error) { return toolError(error) }
        })

        server.registerTool('build_quote_draft', {
          description:
            'Read-only. Proposes (but never persists) a quote for a real engagement: matches its linked resources against the current Price Book, computing each line\'s amount where possible and clearly marking authority_state (APPROVED_AUTHORITY vs DRAFT_CANDIDATE) and any resource that needsPrice. Nothing is written — review this output with the human, then pass the approved lines explicitly to save_quote_draft.',
          inputSchema: z.object({
            engagementNumber: z.string().describe('Real engagement number, e.g. SP-000014'),
          }),
          annotations: { readOnlyHint: true },
        }, async (args) => {
          try { return toolResult(await buildQuoteDraft(supabase, args)) }
          catch (error) { return toolError(error) }
        })

        server.registerTool('save_quote_draft', {
          description:
            'Persist ONE new DRAFT quote (commercial_documents + lines) on a real engagement — ONLY after the human has explicitly approved the exact line list (confirmed=true), normally the reviewed output of build_quote_draft. Never promotes a DRAFT_CANDIDATE Price Book rate to approved policy — it only snapshots which authority state was in effect. Respects the existing one-current-DRAFT-quote-per-engagement rule rather than creating a duplicate. Every line is validated before anything is written, so one invalid line aborts the whole call. Idempotent: a retry with the same idempotencyKey AND the same lines returns the already-created quote instead of duplicating it; the same idempotencyKey with different lines is refused (NOT_SAVED). Always re-reads the canonical quote and lines before reporting VERIFIED_SAVED.',
          inputSchema: z.object({
            engagementNumber: z.string(),
            transactionType: z.enum(TRANSACTION_TYPES).optional(),
            notes: z.string().optional(),
            validThrough: z.string().optional().describe('ISO date (YYYY-MM-DD)'),
            lines: z.array(z.object({
              source: z.enum(['MANUAL', 'PRICE_RULE']),
              lineType: z.enum(COMMERCIAL_LINE_TYPES),
              description: z.string().optional().describe('Required for a MANUAL line.'),
              quantity: z.number().optional().describe('Defaults to 1.'),
              unitPrice: z.number().optional().describe('Required for a MANUAL line.'),
              pricingRuleId: z.string().optional().describe('Required for a PRICE_RULE line.'),
              billingUnits: z.number().optional().describe('Required for PER_HOUR/PER_DAY/PER_MILE rules.'),
              allowDraft: z.boolean().optional().describe('Must be true to apply a DRAFT (unapproved) Price Book rule.'),
              proposedTotal: z.number().optional().describe('Defaults to the Price Book policy amount.'),
              priceAdjustmentReason: z.string().optional().describe('Required if proposedTotal differs from the Price Book rate.'),
              groupLabel: z.string().optional(),
              detailText: z.string().optional(),
            })).min(1),
            confirmed: z.literal(true).describe('Must be literally true. Set only after the human clicked Approve on the exact proposed line list.'),
            idempotencyKey: z.string().describe('A unique key for this proposed quote; a retry with the same key and the same lines is a no-op, different lines are refused.'),
          }),
          annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
        }, async (args) => {
          try { return toolResult(await saveQuoteDraft(supabase, args)) }
          catch (error) { return toolError(error) }
        })

        server.registerTool('assign_team_member', {
          description:
            'Propose ONE crew assignment (POSSIBLE or REQUESTED only) on a real engagement — ONLY after the human has explicitly approved it (confirmed=true). Never creates CONFIRMED, DECLINED, COMPLETED, or UNKNOWN — there is no availability/acknowledgement evidence source to justify CONFIRMED yet. Does not prove or confirm actual crew availability. Idempotent: a retry with the same idempotencyKey AND the same payload returns the already-created assignment instead of duplicating it; the same idempotencyKey with a different payload is refused (NOT_SAVED). Always re-reads the canonical row before reporting VERIFIED_SAVED.',
          inputSchema: z.object({
            engagementNumber: z.string(),
            teamMemberId: z.string().describe('Resolve with find_team_member first — never guess a name.'),
            roleCode: z.enum(ROLE_CODES),
            assignmentState: z.enum(ASSIGNABLE_STATES).describe('Only POSSIBLE or REQUESTED are permitted.'),
            roleLabel: z.string().optional(),
            scheduledStart: z.string().optional().describe('ISO datetime'),
            scheduledEnd: z.string().optional().describe('ISO datetime'),
            notes: z.string().optional(),
            confirmed: z.literal(true).describe('Must be literally true. Set only after the human clicked Approve on the exact proposed assignment.'),
            idempotencyKey: z.string().describe('A unique key for this proposed mutation; a retry with the same key and the same payload is a no-op, a different payload is refused.'),
          }),
          annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
        }, async (args) => {
          try { return toolResult(await assignTeamMember(supabase, args)) }
          catch (error) { return toolError(error) }
        })

        server.registerTool('add_resource_requirement', {
          description:
            'Record ONE resource requirement/consideration/configuration on a real engagement — ONLY after the human has explicitly approved it (confirmed=true). Means only "this engagement needs/is considering/is configuring this resource" — NEVER that inventory is available, held, or reserved (that remains a separate, not-yet-built capability). Idempotent: a retry with the same idempotencyKey AND the same payload returns the already-created record instead of duplicating it; the same idempotencyKey with a different payload is refused (NOT_SAVED). Always re-reads the canonical row before reporting VERIFIED_SAVED.',
          inputSchema: z.object({
            engagementNumber: z.string(),
            resourceId: z.string().describe('Resolve with find_resource first — never guess a name.'),
            relationship: z.enum(RESOURCE_RELATIONSHIPS),
            quantity: z.number().optional(),
            notes: z.string().optional(),
            requiredFromDate: z.string().optional().describe('ISO date (YYYY-MM-DD)'),
            requiredThroughDate: z.string().optional().describe('ISO date (YYYY-MM-DD)'),
            requirementWindowState: z.enum(REQUIREMENT_WINDOW_STATES).optional(),
            plannedSourcingModel: z.enum(SOURCING_MODELS).optional(),
            confirmed: z.literal(true).describe('Must be literally true. Set only after the human clicked Approve on the exact proposed requirement.'),
            idempotencyKey: z.string().describe('A unique key for this proposed mutation; a retry with the same key and the same payload is a no-op, a different payload is refused.'),
          }),
          annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
        }, async (args) => {
          try { return toolResult(await addResourceRequirement(supabase, args)) }
          catch (error) { return toolError(error) }
        })

        return server
      })

      return handler.fetch(req)
    },
  ),
)
