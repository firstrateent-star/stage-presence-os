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
      'engagement_resources(quantity,relationship,resources(name))',
      'engagement_facts(label,certainty_state)',
      'engagement_assignments(role_code,assignment_state,team_members(display_name))',
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

async function generateJobSheet(supabase: ScopedSupabase, engagementNumber: string) {
  const e = await loadEngagementByNumber(supabase, engagementNumber)
  if (!e) return { found: false, engagementNumber }

  const contacts = (e.engagement_parties || []).map(
    (p: any) => `- ${p.role}: ${p.parties?.name ?? 'unknown'}${p.parties?.phone ? ' · ' + p.parties.phone : ''}`,
  )
  const resources = (e.engagement_resources || []).map(
    (r: any) => `- ${r.resources?.name ?? 'unknown resource'} (${r.relationship}${r.quantity ? ' × ' + r.quantity : ''})`,
  )
  const schedule = (e.engagement_schedule_items || []).map(
    (s: any) => `- ${s.schedule_type} — ${s.label} — ${s.start_at || s.start_date || 'TBD'} (${s.time_state})`,
  )

  return {
    found: true,
    engagement: e,
    text: [
      `JOB SHEET — ${e.name} (${e.engagement_number})`,
      e.event_start_date ? `Date: ${e.event_start_date}` : 'Date: TBD',
      '',
      'Contacts:',
      ...(contacts.length ? contacts : ['- none recorded']),
      '',
      'Resources:',
      ...(resources.length ? resources : ['- none recorded']),
      '',
      'Schedule:',
      ...(schedule.length ? schedule : ['- not scheduled']),
    ].join('\n'),
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

Deno.serve(
  pipeline(
    [withOAuthProtectedResource(), withSupabase({ auth: 'user' })],
    async (req, { supabase }) => {
      const handler = createMcpHandler(() => {
        const server = new McpServer({ name: 'stage-presence', version: '1.1.0' })

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

        return server
      })

      return handler.fetch(req)
    },
  ),
)
