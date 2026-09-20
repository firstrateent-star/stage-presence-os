import { supabase } from './supabase'
import { createEngagement, updateEngagement, linkResource, listPartiesForEngagement, listEngagementResources, listFacts, type CreateEngagementInput, type PartyLink, type ResourceLink } from './repository'
import { saveCanonicalNextMove } from './canonicalWrites'
import {
  createDraftQuote,
  addManualQuoteLine,
  addQuoteLineFromPriceRule,
  type CreateDraftQuoteInput,
  type ManualQuoteLineInput,
  type PriceRuleQuoteLineInput,
  type CommercialPricingLine,
} from './pricingRuntime'
import { assignCrewFromCommand } from './operationsCommands'
import { listEngagementSummaries, getEngagementSummary, type EngagementSummary } from './readContracts'
import type { CaptureAuthority } from './captureIntelligence'
import type { AssignmentRole } from './operationsReality'
import type { Engagement } from '../types/domain'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured. Copy .env.example to .env and add Supabase values.')
  return supabase
}

/**
 * The Stage Presence Capability Registry.
 *
 * This is the fixed, named surface an AI operating layer (Greg cockpit, chat
 * operating desk, or any future automation) is permitted to call. It adds no
 * new canonical writes: every entry either wraps an existing src/lib runtime
 * function, or (where explicitly marked NEW_READ_ONLY) performs a read-only
 * query against existing tables/views. Nothing here sends external
 * communication, alters pricing/schema, or commits a canonical write without
 * routing through the same functions the human UI already uses.
 */
export type CapabilityAuthority = CaptureAuthority
export type CapabilityBacking = 'CANONICAL_REUSE' | 'REFRAMED_REUSE' | 'NEW_READ_ONLY' | 'NEW_WRITE_WRAPPER'

export interface CapabilityDescriptor {
  name: string
  summary: string
  authority: CapabilityAuthority
  requiresHumanReview: boolean
  backing: CapabilityBacking
  note?: string
}

export const CAPABILITY_REGISTRY: readonly CapabilityDescriptor[] = [
  {
    name: 'find_contact',
    summary: 'Search existing Parties by name, organization, email, or phone.',
    authority: 'OBSERVE',
    requiresHumanReview: false,
    backing: 'NEW_READ_ONLY',
    note: 'Literal substring match only. Never silently merges or picks a best match — ambiguous results are returned for a human to choose.',
  },
  {
    name: 'find_engagement',
    summary: 'Search existing Engagements by name, engagement number, customer, or venue.',
    authority: 'OBSERVE',
    requiresHumanReview: false,
    backing: 'NEW_READ_ONLY',
    note: 'Literal substring match over engagement_summary_v. No fuzzy matching.',
  },
  {
    name: 'create_lead',
    summary: 'Create a new Engagement at intent stage. There is no separate Lead entity — a lead is an Engagement early in its lifecycle.',
    authority: 'REVERSIBLE',
    requiresHumanReview: true,
    backing: 'CANONICAL_REUSE',
    note: 'Wraps repository.createEngagement(). Archivable, not destructive.',
  },
  {
    name: 'update_lead',
    summary: 'Update an existing Engagement (request, outcome, commercial/commitment/operational/attention state, venue, next move).',
    authority: 'CONSEQUENTIAL',
    requiresHumanReview: true,
    backing: 'CANONICAL_REUSE',
    note: 'Wraps repository.updateEngagement(). Can change commercial/commitment state, so review is required.',
  },
  {
    name: 'set_next_action',
    summary: 'Set or clear the single canonical next move for an Engagement.',
    authority: 'REVERSIBLE',
    requiresHumanReview: true,
    backing: 'CANONICAL_REUSE',
    note: 'Wraps canonicalWrites.saveCanonicalNextMove().',
  },
  {
    name: 'get_pricing',
    summary: 'Read governed Price Book entries (approved authority, draft candidates, or reference-only evidence) for a resource, category, or role.',
    authority: 'OBSERVE',
    requiresHumanReview: false,
    backing: 'NEW_READ_ONLY',
    note: 'Reads price_book_v. Never returns a number without its authority_state — a DRAFT_CANDIDATE or reference price must never be presented as an approved sell price.',
  },
  {
    name: 'build_quote_draft',
    summary: 'Create a new DRAFT commercial quote document for an Engagement.',
    authority: 'CONSEQUENTIAL',
    requiresHumanReview: true,
    backing: 'CANONICAL_REUSE',
    note: 'Wraps pricingRuntime.createDraftQuote(). Fails if a DRAFT quote already exists for that Engagement.',
  },
  {
    name: 'save_quote_draft',
    summary: 'Add one or more lines (manual price or Price Book rule) to an existing DRAFT quote.',
    authority: 'CONSEQUENTIAL',
    requiresHumanReview: true,
    backing: 'CANONICAL_REUSE',
    note: 'Wraps pricingRuntime.addManualQuoteLine() / addQuoteLineFromPriceRule(). Refuses to edit a non-DRAFT quote.',
  },
  {
    name: 'create_job',
    summary: 'Move an Engagement into operational planning. There is no separate Job entity — this transitions the Engagement operational_state.',
    authority: 'CONSEQUENTIAL',
    requiresHumanReview: true,
    backing: 'REFRAMED_REUSE',
    note: 'Wraps repository.updateEngagement({ operational_state }). Fulfillment plans, crew, and schedule remain separate capabilities.',
  },
  {
    name: 'update_job',
    summary: 'Update an Engagement operational_state (planning, ready, active, complete, closed).',
    authority: 'CONSEQUENTIAL',
    requiresHumanReview: true,
    backing: 'REFRAMED_REUSE',
    note: 'Wraps repository.updateEngagement(). Same canonical write as update_lead, scoped to operational_state.',
  },
  {
    name: 'add_resource_requirement',
    summary: 'Link a Resource to an Engagement (customer-requested, considering, recommended, or configured).',
    authority: 'REVERSIBLE',
    requiresHumanReview: true,
    backing: 'CANONICAL_REUSE',
    note: 'Wraps repository.linkResource(). Configured/linked is not availability, hold, or reservation.',
  },
  {
    name: 'assign_team_member',
    summary: 'Propose or confirm a crew assignment for an Engagement.',
    authority: 'CONSEQUENTIAL',
    requiresHumanReview: true,
    backing: 'CANONICAL_REUSE',
    note: 'Wraps operationsCommands.assignCrewFromCommand(). Confirmed crew commitment always requires explicit approval.',
  },
  {
    name: 'generate_lead_summary',
    summary: 'Produce a plain-text summary of an Engagement (customer, request, resources, open unknowns) for human review.',
    authority: 'SUGGEST',
    requiresHumanReview: false,
    backing: 'NEW_READ_ONLY',
    note: 'Pure read/format over existing data. Writes nothing.',
  },
  {
    name: 'generate_email',
    summary: 'Draft an email for an Engagement (follow-up, quote send, schedule confirmation, or general).',
    authority: 'SUGGEST',
    requiresHumanReview: true,
    backing: 'NEW_READ_ONLY',
    note: 'Produces draft text only. Stage Presence OS has no outbound-communication capability and never sends email automatically — that is an unapproved permission gate.',
  },
  {
    name: 'generate_job_sheet',
    summary: 'Produce a plain-text job sheet for an Engagement (venue, date, contacts, resources).',
    authority: 'SUGGEST',
    requiresHumanReview: false,
    backing: 'NEW_READ_ONLY',
    note: 'Partial: does not yet include crew schedule or assignment detail. Extend once a shared read contract for those exists here.',
  },
  {
    name: 'search_stage_presence',
    summary: 'Search across Engagements and Contacts for a free-text query.',
    authority: 'OBSERVE',
    requiresHumanReview: false,
    backing: 'NEW_READ_ONLY',
    note: 'Composes find_engagement + find_contact. Does not yet cover Resources or Recovery Queue.',
  },
]

export interface ContactMatch {
  id: string
  party_type: 'PERSON' | 'ORGANIZATION'
  name: string
  organization_name: string | null
  email: string | null
  phone: string | null
}

export async function findContact(query: string): Promise<ContactMatch[]> {
  const trimmed = query.trim()
  if (!trimmed) return []
  const client = requireClient()
  const pattern = `%${trimmed}%`
  const { data, error } = await client
    .from('parties')
    .select('id,party_type,name,organization_name,email,phone')
    .or(`name.ilike.${pattern},organization_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`)
    .limit(20)
  if (error) throw error
  return (data ?? []) as ContactMatch[]
}

export async function findEngagement(query: string): Promise<EngagementSummary[]> {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return []
  const all = await listEngagementSummaries()
  return all
    .filter(engagement => {
      const haystack = [
        engagement.name,
        engagement.engagement_number,
        String((engagement.primary_customer as { name?: string } | null)?.name ?? ''),
        String((engagement.venue as { name?: string } | null)?.name ?? ''),
      ].join(' ').toLowerCase()
      return haystack.includes(trimmed)
    })
    .slice(0, 20)
}

export async function createLead(input: CreateEngagementInput): Promise<Engagement> {
  return createEngagement(input)
}

export async function updateLead(id: string, patch: Parameters<typeof updateEngagement>[1]) {
  return updateEngagement(id, patch)
}

export async function setNextAction(input: Parameters<typeof saveCanonicalNextMove>[0]) {
  return saveCanonicalNextMove(input)
}

export interface PriceBookEntry {
  pricing_rule_id: string | null
  entry_kind: string
  name: string | null
  scope_label: string | null
  resource_name: string | null
  rate_type: string | null
  billing_basis: string | null
  amount: number | null
  currency: string | null
  status: string | null
  authority_state: string
  effective_from: string | null
  effective_through: string | null
}

export async function getPricing(filter: { resourceId?: string; category?: string; roleCode?: string; scopeType?: string } = {}): Promise<PriceBookEntry[]> {
  const client = requireClient()
  let query = client
    .from('price_book_v')
    .select('pricing_rule_id,entry_kind,name,scope_label,resource_name,rate_type,billing_basis,amount,currency,status,authority_state,effective_from,effective_through')
  if (filter.resourceId) query = query.eq('resource_id', filter.resourceId)
  if (filter.category) query = query.eq('category', filter.category)
  if (filter.roleCode) query = query.eq('role_code', filter.roleCode)
  if (filter.scopeType) query = query.eq('scope_type', filter.scopeType)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as PriceBookEntry[]
}

export async function buildQuoteDraft(input: CreateDraftQuoteInput) {
  return createDraftQuote(input)
}

export type QuoteDraftLine =
  | ({ source: 'MANUAL' } & ManualQuoteLineInput)
  | ({ source: 'PRICE_RULE' } & PriceRuleQuoteLineInput)

export async function saveQuoteDraft(lines: QuoteDraftLine[]): Promise<CommercialPricingLine[]> {
  const saved: CommercialPricingLine[] = []
  for (const line of lines) {
    if (line.source === 'MANUAL') {
      const { source: _source, ...rest } = line
      saved.push(await addManualQuoteLine(rest))
    } else {
      const { source: _source, ...rest } = line
      saved.push(await addQuoteLineFromPriceRule(rest))
    }
  }
  return saved
}

export async function createJob(engagementId: string) {
  return updateEngagement(engagementId, { operational_state: 'PLANNING' })
}

export async function updateJob(engagementId: string, patch: Pick<Parameters<typeof updateEngagement>[1], 'operational_state'>) {
  return updateEngagement(engagementId, patch)
}

export async function addResourceRequirement(input: {
  engagementId: string
  resourceId: string
  relationship?: 'CUSTOMER_REQUESTED' | 'CONSIDERING' | 'RECOMMENDED' | 'CONFIGURED'
}) {
  return linkResource(input.engagementId, input.resourceId, input.relationship ?? 'CONSIDERING')
}

export async function assignTeamMember(input: {
  engagementId: string
  teamMemberId: string
  roleCode: AssignmentRole
  scheduledStart?: string | null
  scheduledEnd?: string | null
  confirmNow?: boolean
}) {
  return assignCrewFromCommand(input)
}

export interface LeadSummary {
  engagement: EngagementSummary
  parties: PartyLink[]
  resources: ResourceLink[]
  openFacts: string[]
  text: string
}

export async function generateLeadSummary(engagementId: string): Promise<LeadSummary> {
  const engagement = await getEngagementSummary(engagementId)
  if (!engagement) throw new Error('Engagement not found.')
  const [parties, resources, facts] = await Promise.all([
    listPartiesForEngagement(engagementId),
    listEngagementResources(engagementId),
    listFacts(engagementId),
  ])
  const openFacts = facts
    .filter(fact => fact.certainty_state === 'UNKNOWN' || fact.certainty_state === 'REQUESTED' || fact.certainty_state === 'CONFLICTING')
    .map(fact => fact.label)
  const customerName = parties.find(link => link.role === 'CUSTOMER')?.party?.name ?? 'Unknown customer'

  const lines = [
    `${engagement.name} (${engagement.engagement_number})`,
    `Customer: ${customerName}`,
    `Type: ${engagement.engagement_type} · Commercial: ${engagement.commercial_state} · Commitment: ${engagement.commitment_state}`,
    engagement.event_start_date ? `Date: ${engagement.event_start_date}` : 'Date: unknown',
    engagement.customer_request ? `Request: ${engagement.customer_request}` : 'Request: not recorded',
    resources.length ? `Resources: ${resources.map(link => link.resource?.name).filter(Boolean).join(', ')}` : 'Resources: none linked yet',
    openFacts.length ? `Open unknowns: ${openFacts.join('; ')}` : 'Open unknowns: none recorded',
  ]
  return { engagement, parties, resources, openFacts, text: lines.join('\n') }
}

export interface EmailDraft {
  subject: string
  body: string
}

export async function generateEmail(input: {
  engagementId: string
  purpose: 'FOLLOW_UP' | 'QUOTE_SEND' | 'SCHEDULE_CONFIRM' | 'GENERAL'
}): Promise<EmailDraft> {
  const summary = await generateLeadSummary(input.engagementId)
  const customerName = summary.parties.find(link => link.role === 'CUSTOMER')?.party?.name ?? 'there'
  const firstName = customerName.split(' ')[0]

  const subjectByPurpose: Record<typeof input.purpose, string> = {
    FOLLOW_UP: `Following up — ${summary.engagement.name}`,
    QUOTE_SEND: `Your Stage Presence quote — ${summary.engagement.name}`,
    SCHEDULE_CONFIRM: `Schedule confirmation — ${summary.engagement.name}`,
    GENERAL: summary.engagement.name,
  }

  const body = [
    `Hi ${firstName},`,
    '',
    `Reaching out about ${summary.engagement.name}${summary.engagement.event_start_date ? ` on ${summary.engagement.event_start_date}` : ''}.`,
    '',
    '[Draft — review and edit before sending. Stage Presence OS does not send email automatically.]',
  ].join('\n')

  return { subject: subjectByPurpose[input.purpose], body }
}

export interface JobSheet {
  engagement: EngagementSummary
  venue: string
  parties: PartyLink[]
  resources: ResourceLink[]
  text: string
}

export async function generateJobSheet(engagementId: string): Promise<JobSheet> {
  const engagement = await getEngagementSummary(engagementId)
  if (!engagement) throw new Error('Engagement not found.')
  const [parties, resources] = await Promise.all([
    listPartiesForEngagement(engagementId),
    listEngagementResources(engagementId),
  ])
  const venue = String((engagement.venue as { name?: string } | null)?.name ?? 'Venue not recorded')

  const lines = [
    `JOB SHEET — ${engagement.name} (${engagement.engagement_number})`,
    `Venue: ${venue}`,
    engagement.event_start_date ? `Date: ${engagement.event_start_date}` : 'Date: TBD',
    '',
    'Contacts:',
    ...parties.map(link => `- ${link.role}: ${link.party?.name ?? 'unknown'}${link.party?.phone ? ` · ${link.party.phone}` : ''}`),
    '',
    'Resources:',
    ...resources.map(link => `- ${link.resource?.name ?? 'unknown resource'} (${link.relationship}${link.quantity ? ` × ${link.quantity}` : ''})`),
  ]
  return { engagement, venue, parties, resources, text: lines.join('\n') }
}

export interface SearchResult {
  kind: 'ENGAGEMENT' | 'CONTACT'
  id: string
  label: string
  subtitle: string | null
}

export async function searchStagePresence(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []
  const [engagements, contacts] = await Promise.all([findEngagement(trimmed), findContact(trimmed)])
  const results: SearchResult[] = []
  for (const engagement of engagements) {
    results.push({ kind: 'ENGAGEMENT', id: engagement.id, label: engagement.name, subtitle: engagement.engagement_number })
  }
  for (const contact of contacts) {
    results.push({ kind: 'CONTACT', id: contact.id, label: contact.name, subtitle: contact.organization_name ?? contact.email ?? contact.phone ?? null })
  }
  return results
}
