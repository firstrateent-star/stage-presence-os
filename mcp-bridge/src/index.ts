export interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  BRIDGE_TOKEN: string
}

function sanitizeTerm(raw: string): string {
  return String(raw || '').replace(/[,()*]/g, ' ').trim().slice(0, 120)
}

async function pgrest(env: Env, path: string, params: Record<string, string>): Promise<any> {
  const url = new URL(env.SUPABASE_URL + '/rest/v1/' + path)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  const res = await fetch(url.toString(), {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY,
      Accept: 'application/json',
    },
  })
  if (!res.ok) throw new Error(`Supabase read failed (${res.status}): ${await res.text()}`)
  return res.json()
}

/* Single mutation path used by the one write tool below. Always a fixed upsert-by-source_key
   shape against public.work_items — never arbitrary SQL, never touches any row it didn't just
   create/re-affirm via that source_key. */
async function pgrestUpsert(env: Env, path: string, onConflict: string, body: unknown): Promise<any> {
  const url = new URL(env.SUPABASE_URL + '/rest/v1/' + path)
  url.searchParams.set('on_conflict', onConflict)
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Supabase write failed (${res.status}): ${await res.text()}`)
  return res.json()
}

/* ============================== the 8 narrow read capabilities ============================== */
/* Every function below issues a fixed, parameterized PostgREST call against an existing canonical
   view or table. Nothing here accepts or builds arbitrary SQL, and nothing writes. */

async function findContact(env: Env, args: { query: string }) {
  const term = sanitizeTerm(args.query)
  if (!term) return []
  return pgrest(env, 'parties', {
    select: 'id,party_type,name,organization_name,email,phone',
    or: `(name.ilike.*${term}*,organization_name.ilike.*${term}*,email.ilike.*${term}*,phone.ilike.*${term}*)`,
    limit: '20',
  })
}

async function findEngagement(env: Env, args: { query: string }) {
  const term = sanitizeTerm(args.query)
  if (!term) return []
  return pgrest(env, 'engagement_summary_v', {
    select: 'id,engagement_number,name,engagement_type,customer_request,event_start_date,commercial_state,commitment_state,operational_state,attention_state,venue,primary_customer,next_work',
    or: `(name.ilike.*${term}*,engagement_number.ilike.*${term}*,customer_request.ilike.*${term}*,venue->>name.ilike.*${term}*,primary_customer->>name.ilike.*${term}*,primary_customer->>organization_name.ilike.*${term}*)`,
    limit: '20',
    order: 'updated_at.desc',
  })
}

async function getPricing(env: Env, args: { item?: string; category?: string; roleCode?: string; scopeType?: string }) {
  const params: Record<string, string> = {
    select: 'pricing_rule_id,entry_kind,name,scope_label,resource_name,rate_type,billing_basis,duration_value,duration_unit,amount,currency,status,authority_state,effective_from,effective_through',
    order: 'authority_state,resource_name',
  }
  if (args.item) {
    const term = sanitizeTerm(args.item)
    params.or = `(resource_name.ilike.*${term}*,scope_label.ilike.*${term}*,name.ilike.*${term}*)`
  }
  if (args.category) params.category = `eq.${args.category}`
  if (args.roleCode) params.role_code = `eq.${args.roleCode}`
  if (args.scopeType) params.scope_type = `eq.${args.scopeType}`
  return pgrest(env, 'price_book_v', params)
}

async function loadEngagementByNumber(env: Env, engagementNumber: string) {
  const rows = await pgrest(env, 'engagements', {
    select: [
      'id,engagement_number,name,engagement_type,commercial_state,commitment_state,operational_state,attention_state,event_start_date,customer_request',
      'engagement_parties(role,is_primary,parties(name,organization_name,email,phone))',
      'engagement_resources(quantity,relationship,resources(name))',
      'engagement_facts(label,certainty_state)',
      'engagement_assignments(role_code,assignment_state,team_members(display_name))',
      'engagement_schedule_items(schedule_type,label,start_at,start_date,time_state)',
    ].join(','),
    engagement_number: `eq.${engagementNumber}`,
    limit: '1',
  })
  return rows?.[0] ?? null
}

async function generateLeadSummary(env: Env, args: { engagementNumber: string }) {
  const e = await loadEngagementByNumber(env, args.engagementNumber)
  if (!e) return { found: false, engagementNumber: args.engagementNumber }
  const primary = (e.engagement_parties || []).find((p: any) => p.is_primary) || (e.engagement_parties || [])[0]
  const customerName = primary?.parties?.organization_name || primary?.parties?.name || 'Unknown customer'
  const openFacts = (e.engagement_facts || []).filter((f: any) => ['UNKNOWN', 'REQUESTED', 'CONFLICTING'].includes(f.certainty_state)).map((f: any) => f.label)
  const resourceNames = (e.engagement_resources || []).map((r: any) => r.resources?.name).filter(Boolean)
  const lines = [
    `${e.name} (${e.engagement_number})`,
    `Customer: ${customerName}`,
    `Type: ${e.engagement_type} · Commercial: ${e.commercial_state} · Commitment: ${e.commitment_state}`,
    e.event_start_date ? `Date: ${e.event_start_date}` : 'Date: unknown',
    e.customer_request ? `Request: ${e.customer_request}` : 'Request: not recorded',
    resourceNames.length ? `Resources: ${resourceNames.join(', ')}` : 'Resources: none linked yet',
    openFacts.length ? `Open unknowns: ${openFacts.join('; ')}` : 'Open unknowns: none recorded',
  ]
  return { found: true, engagement: e, text: lines.join('\n') }
}

async function generateJobSheet(env: Env, args: { engagementNumber: string }) {
  const e = await loadEngagementByNumber(env, args.engagementNumber)
  if (!e) return { found: false, engagementNumber: args.engagementNumber }
  const contacts = (e.engagement_parties || []).map((p: any) => `- ${p.role}: ${p.parties?.name ?? 'unknown'}${p.parties?.phone ? ' · ' + p.parties.phone : ''}`)
  const resources = (e.engagement_resources || []).map((r: any) => `- ${r.resources?.name ?? 'unknown resource'} (${r.relationship}${r.quantity ? ' × ' + r.quantity : ''})`)
  const schedule = (e.engagement_schedule_items || []).map((s: any) => `- ${s.schedule_type} — ${s.label} — ${s.start_at || s.start_date || 'TBD'} (${s.time_state})`)
  const lines = [
    `JOB SHEET — ${e.name} (${e.engagement_number})`,
    e.event_start_date ? `Date: ${e.event_start_date}` : 'Date: TBD',
    '',
    'Contacts:', ...(contacts.length ? contacts : ['- none recorded']),
    '',
    'Resources:', ...(resources.length ? resources : ['- none recorded']),
    '',
    'Schedule:', ...(schedule.length ? schedule : ['- not scheduled']),
  ]
  return { found: true, engagement: e, text: lines.join('\n') }
}

async function searchStagePresence(env: Env, args: { query: string }) {
  const [engagements, contacts] = await Promise.all([findEngagement(env, args), findContact(env, args)])
  return {
    engagements: engagements.map((e: any) => ({ kind: 'ENGAGEMENT', id: e.id, number: e.engagement_number, label: e.name })),
    contacts: contacts.map((c: any) => ({ kind: 'CONTACT', id: c.id, label: c.name, subtitle: c.organization_name || c.email || c.phone || null })),
  }
}

async function getAttentionItems(env: Env) {
  return pgrest(env, 'engagement_summary_v', {
    select: 'id,engagement_number,name,attention_state,commercial_state,commitment_state,open_work_count,primary_customer,venue,next_work,event_start_date',
    or: '(attention_state.neq.NORMAL,open_work_count.gt.0)',
    order: 'attention_state.desc,event_start_date.asc',
    limit: '25',
  })
}

async function getUpcomingEngagements(env: Env, args: { limit?: number }) {
  const today = new Date().toISOString().slice(0, 10)
  return pgrest(env, 'engagement_summary_v', {
    select: 'id,engagement_number,name,event_start_date,commercial_state,commitment_state,operational_state,attention_state,primary_customer,venue,next_work',
    event_start_date: `gte.${today}`,
    order: 'event_start_date.asc',
    limit: String(args.limit && args.limit > 0 && args.limit <= 50 ? args.limit : 15),
  })
}

/* ============================== the one write capability: set_next_action ==============================
   Mirrors src/lib/canonicalWrites.ts's real public.work_items schema exactly (see
   database/20260909_reality_commercial_operations_kernel.sql and
   database/20260909_frontend_operating_primitives.sql) — no invented columns.
   Only ever INSERTs (or re-affirms its own prior insert via source_key on retry). Never touches
   any other existing work_items row, never cancels/completes/reprioritizes anything. */

const ACTION_TYPES = ['CALL', 'EMAIL', 'TEXT', 'CREATE_QUOTE', 'REVISE_QUOTE', 'APPROVAL', 'CAPACITY', 'CREW', 'PAYMENT', 'VENUE', 'PREP', 'DELIVERY', 'FOLLOW_UP', 'REVIEW', 'OTHER']
const PRIORITIES = ['NOW', 'SOON', 'NORMAL', 'LOW']

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

async function resolveEngagementId(env: Env, engagementNumber: string) {
  const rows = await pgrest(env, 'engagements', {
    select: 'id,engagement_number',
    engagement_number: `eq.${engagementNumber}`,
    limit: '1',
  })
  return rows?.[0] ?? null
}

async function setNextAction(env: Env, args: SetNextActionArgs) {
  const notSaved = (reason: string, extra: Record<string, unknown> = {}) => ({
    saved: false,
    verificationState: 'NOT_SAVED',
    engagementNumber: args.engagementNumber ?? null,
    reason,
    ...extra,
  })

  if (args.confirmed !== true) {
    return notSaved('Refused: confirmed must be literally true. This tool only writes after explicit human approval — propose the change and wait for Approve/Edit/Cancel first.')
  }
  if (!args.idempotencyKey) return notSaved('idempotencyKey is required.')
  if (!args.engagementNumber) return notSaved('engagementNumber is required.')
  const title = String(args.title || '').trim()
  if (!title) return notSaved('title is required.')
  if (!ACTION_TYPES.includes(args.actionType)) return notSaved(`Invalid actionType: ${args.actionType}. Must be one of ${ACTION_TYPES.join(', ')}.`)
  if (!PRIORITIES.includes(args.priority)) return notSaved(`Invalid priority: ${args.priority}. Must be one of ${PRIORITIES.join(', ')}.`)

  let engagement: { id: string; engagement_number: string } | null
  try {
    engagement = await resolveEngagementId(env, args.engagementNumber)
  } catch (err: any) {
    return notSaved(`Could not look up engagement: ${err?.message || err}`)
  }
  if (!engagement) return notSaved(`No engagement found with number ${args.engagementNumber}. Nothing was written.`)

  const sourceKey = `mcp:set_next_action:${args.idempotencyKey}`
  const payload = {
    engagement_id: engagement.id,
    source_key: sourceKey,
    title,
    action_type: args.actionType,
    status: 'OPEN',
    priority: args.priority,
    due_date: args.dueDate ?? null,
    why_now: args.whyNow ?? null,
    instructions: args.instructions ?? null,
    success_condition: args.successCondition ?? null,
    certainty_state: 'KNOWN',
    origin: 'MANUAL',
    visibility: 'INTERNAL',
    metadata: { canonical_role: 'MCP_PROPOSED_ACTION', capture_surface: 'stage_presence_cockpit_artifact' },
  }

  let inserted: any
  try {
    const rows = await pgrestUpsert(env, 'work_items', 'source_key', payload)
    inserted = Array.isArray(rows) ? rows[0] : rows
  } catch (err: any) {
    return notSaved(`Write failed: ${err?.message || err}`, { engagementNumber: engagement.engagement_number })
  }
  if (!inserted?.id) return notSaved('Write returned no record.', { engagementNumber: engagement.engagement_number })

  // Canonical re-read: never trust the write response alone.
  let verified: any = null
  try {
    const rows = await pgrest(env, 'work_items', {
      select: 'id,engagement_id,source_key,title,action_type,status,priority,due_date,why_now,instructions,success_condition',
      id: `eq.${inserted.id}`,
      limit: '1',
    })
    verified = rows?.[0] ?? null
  } catch (err: any) {
    return notSaved(`Canonical re-read failed: ${err?.message || err}`, { engagementNumber: engagement.engagement_number, workItemId: inserted.id })
  }
  if (!verified) return notSaved('Canonical re-read did not find the record after write.', { engagementNumber: engagement.engagement_number, workItemId: inserted.id })

  let currentNextWork: any = null
  try {
    const rows = await pgrest(env, 'engagement_summary_v', {
      select: 'id,engagement_number,next_work',
      id: `eq.${engagement.id}`,
      limit: '1',
    })
    currentNextWork = rows?.[0]?.next_work ?? null
  } catch {
    currentNextWork = null
  }

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

/* ============================== MCP tool registry ============================== */

interface McpTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  annotations?: { title?: string; readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean }
  run: (env: Env, args: any) => Promise<any>
}

const TOOLS: McpTool[] = [
  {
    name: 'find_contact',
    description: 'Search real Stage Presence Parties by name, organization, email, or phone. Read-only.',
    inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    run: findContact,
  },
  {
    name: 'find_engagement',
    description: 'Search real Stage Presence Engagements by name, number, customer, or venue. Read-only.',
    inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    run: findEngagement,
  },
  {
    name: 'get_pricing',
    description: 'Read the real, current Price Book, with authority_state (APPROVED_AUTHORITY / DRAFT_CANDIDATE / etc). Optionally filter by item name, category, roleCode, or scopeType. Read-only.',
    inputSchema: { type: 'object', properties: { item: { type: 'string' }, category: { type: 'string' }, roleCode: { type: 'string' }, scopeType: { type: 'string' } } },
    run: getPricing,
  },
  {
    name: 'generate_lead_summary',
    description: 'Produce a plain-text summary of a real Engagement by its engagement number (e.g. SP-000014). Read-only.',
    inputSchema: { type: 'object', properties: { engagementNumber: { type: 'string' } }, required: ['engagementNumber'] },
    run: generateLeadSummary,
  },
  {
    name: 'generate_job_sheet',
    description: 'Produce a plain-text job sheet (venue, contacts, resources, schedule) for a real Engagement by its engagement number. Read-only.',
    inputSchema: { type: 'object', properties: { engagementNumber: { type: 'string' } }, required: ['engagementNumber'] },
    run: generateJobSheet,
  },
  {
    name: 'search_stage_presence',
    description: 'Search across real Engagements and Contacts for a free-text query. Read-only.',
    inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    run: searchStagePresence,
  },
  {
    name: 'get_attention_items',
    description: "Return the real Engagements that currently need attention (attention_state != NORMAL or have open work). This is Stage Presence's actual current 'needs attention' state, not a snapshot. Read-only.",
    inputSchema: { type: 'object', properties: {} },
    run: getAttentionItems,
  },
  {
    name: 'get_upcoming_engagements',
    description: 'Return real Engagements with an event date today or later, soonest first. Read-only.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number' } } },
    run: getUpcomingEngagements,
  },
  {
    name: 'set_next_action',
    description:
      'Write ONE new OPEN work item (next action) on a real engagement — ONLY after the human has explicitly approved the exact proposed change (confirmed=true). Never modifies, cancels, completes, or reprioritizes any existing work item. Idempotent: retries with the same idempotencyKey re-affirm the same row instead of duplicating it. Always re-reads the canonical row after writing and only reports success if that re-read confirms it.',
    inputSchema: {
      type: 'object',
      properties: {
        engagementNumber: { type: 'string', description: 'Real engagement number, e.g. SP-000014' },
        title: { type: 'string' },
        actionType: { type: 'string', enum: ACTION_TYPES },
        priority: { type: 'string', enum: PRIORITIES },
        dueDate: { type: 'string', description: 'Optional ISO date (YYYY-MM-DD)' },
        whyNow: { type: 'string' },
        instructions: { type: 'string' },
        successCondition: { type: 'string' },
        confirmed: { type: 'boolean', description: 'Must be literally true. Set only after the human clicked Approve on the exact proposed change.' },
        idempotencyKey: { type: 'string', description: 'A unique key for this proposed mutation; retries with the same key never create a duplicate.' },
      },
      required: ['engagementNumber', 'title', 'actionType', 'priority', 'confirmed', 'idempotencyKey'],
    },
    annotations: { title: 'Set Next Action', readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    run: setNextAction,
  },
]

const TOOLS_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]))

/* ============================== JSON-RPC / MCP protocol plumbing ============================== */

function jsonRpcResult(id: unknown, result: unknown) {
  return { jsonrpc: '2.0', id, result }
}
function jsonRpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

async function handleRpc(env: Env, body: any) {
  const { id, method, params } = body || {}
  if (method === 'initialize') {
    return jsonRpcResult(id, {
      protocolVersion: params?.protocolVersion || '2026-06-18',
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'stage-presence-mcp-bridge', version: '0.1.0' },
    })
  }
  if (method === 'notifications/initialized' || method === 'ping') {
    return jsonRpcResult(id, {})
  }
  if (method === 'tools/list') {
    return jsonRpcResult(id, {
      tools: TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
        ...(t.annotations ? { annotations: t.annotations } : {}),
      })),
    })
  }
  if (method === 'tools/call') {
    const toolName = params?.name
    const tool = TOOLS_BY_NAME.get(toolName)
    if (!tool) return jsonRpcResult(id, { content: [{ type: 'text', text: `Unknown tool: ${toolName}` }], isError: true })
    try {
      const data = await tool.run(env, params?.arguments || {})
      return jsonRpcResult(id, { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false })
    } catch (err: any) {
      return jsonRpcResult(id, { content: [{ type: 'text', text: `Stage Presence data is currently unavailable. (${err?.message || err})` }], isError: true })
    }
  }
  return jsonRpcError(id, -32601, `Method not found: ${method}`)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'GET' && url.pathname === '/') {
      return Response.json({ name: 'stage-presence-mcp-bridge', status: 'ok', tools: TOOLS.map((t) => t.name) })
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const auth = request.headers.get('authorization') || ''
    if (!env.BRIDGE_TOKEN || auth !== `Bearer ${env.BRIDGE_TOKEN}`) {
      return new Response('Unauthorized', { status: 401 })
    }

    let body: any
    try {
      body = await request.json()
    } catch {
      return Response.json(jsonRpcError(null, -32700, 'Parse error'), { status: 400 })
    }

    try {
      const response = await handleRpc(env, body)
      return Response.json(response)
    } catch (err: any) {
      return Response.json(jsonRpcError(body?.id ?? null, -32603, err?.message || 'Internal error'), { status: 500 })
    }
  },
}
