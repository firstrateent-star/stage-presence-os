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

Deno.serve(
  pipeline(
    [withOAuthProtectedResource(), withSupabase({ auth: 'user' })],
    async (req, { supabase }) => {
      const handler = createMcpHandler(() => {
        const server = new McpServer({ name: 'stage-presence', version: '1.0.0' })

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

        return server
      })

      return handler.fetch(req)
    },
  ),
)
