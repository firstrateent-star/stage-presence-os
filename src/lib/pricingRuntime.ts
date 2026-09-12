import { supabase } from './supabase'

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured. Copy .env.example to .env and add Supabase values.')
  return supabase
}

export type TransactionType = 'RENTAL' | 'SALE' | 'SERVICE' | 'INSTALLATION' | 'MIXED' | 'UNKNOWN' | 'OTHER'
export type CommercialLineType = 'RESOURCE' | 'SERVICE' | 'LABOR' | 'LOGISTICS' | 'DISCOUNT' | 'FEE' | 'CUSTOM' | 'OTHER'
export type PricingAuthorityState = 'APPROVED_AUTHORITY' | 'DRAFT_CANDIDATE' | 'MANUAL_PRICE' | 'HISTORICAL_EVIDENCE' | 'OTHER'

export interface EngagementPricingPosition {
  engagement_id: string
  engagement_number: string
  engagement_name: string
  engagement_type: string
  commercial_state: string
  commitment_state: string
  quote_document_id: string | null
  quote_state: string | null
  transaction_type: string | null
  quote_version: number | null
  quoted_total: number | null
  quote_line_count: number
  policy_linked_line_count: number
  approved_policy_line_count: number
  draft_policy_line_count: number
  manual_price_line_count: number
  adjusted_price_line_count: number
  represented_policy_total: number | null
  scope_line_count: number
  scope_lines_with_price: number
  price_decision_gap_count: number
  approved_price_available_count: number
  draft_price_available_count: number
  estimate_item_count: number
  estimated_direct_cost: number
  scope_lines_with_cost: number
  cost_decision_gap_count: number
  estimate_coverage_state: string
  partial_projected_contribution_observed: number | null
  projected_contribution: number | null
  partial_projected_margin_ratio_observed: number | null
  projected_margin_ratio: number | null
  pricing_readiness_state: string
  pricing_authority_coverage_state: string
}

export interface ScopePriceCoverageLine {
  engagement_id: string
  engagement_number: string
  engagement_name: string
  engagement_type: string
  fulfillment_plan_id: string
  plan_type: string
  fulfillment_line_id: string
  sort_order: number | null
  fulfillment_line_type: string
  primary_category: string | null
  subcategory: string | null
  title: string
  description: string | null
  quantity: number | null
  resource_id: string | null
  resource_name: string | null
  resource_category: string | null
  quote_line_count: number
  quoted_line_total: number | null
  policy_linked_line_count: number
  approved_policy_line_count: number
  draft_policy_line_count: number
  approved_rule_count: number
  draft_rule_count: number
  best_pricing_rule_id: string | null
  best_pricing_rule_name: string | null
  best_rule_status: string | null
  best_price_position: string | null
  best_rule_amount: number | null
  best_rule_percentage: number | null
  best_billing_basis: string | null
  best_duration_value: number | null
  best_duration_unit: string | null
  price_coverage_state: string
  price_decision_required: boolean
}

export interface CommercialPricingLine {
  commercial_line_id: string
  commercial_document_id: string
  engagement_id: string
  engagement_number: string
  engagement_name: string
  document_type: string
  document_state: string
  transaction_type: string
  version_no: number
  currency: string
  sort_order: number | null
  line_type: CommercialLineType
  group_label: string | null
  description: string
  detail_text: string | null
  quantity: number | null
  unit_price: number | null
  line_total: number | null
  resource_id: string | null
  resource_name: string | null
  fulfillment_line_id: string | null
  fulfillment_line_title: string | null
  pricing_rule_id: string | null
  pricing_rule_code: string | null
  pricing_rule_name: string | null
  current_pricing_rule_status: string | null
  policy_amount_snapshot: number | null
  policy_percentage_snapshot: number | null
  policy_price_position: string | null
  policy_billing_basis: string | null
  policy_duration_value: number | null
  policy_duration_unit: string | null
  policy_total_snapshot: number | null
  pricing_authority_state: PricingAuthorityState | null
  price_adjustment_reason: string | null
  price_variance_from_policy: number | null
  price_variance_ratio: number | null
  represented_cost_item_count: number
  estimated_direct_cost: number | null
  committed_direct_cost: number | null
  actual_direct_cost: number | null
  estimated_line_contribution_observed: number | null
  pricing_basis_state: string
}

export async function getEngagementPricingPosition(engagementId: string): Promise<EngagementPricingPosition | null> {
  const client = requireClient()
  const { data, error } = await client.from('engagement_pricing_position_v').select('*').eq('engagement_id', engagementId).maybeSingle()
  if (error) throw error
  return data as EngagementPricingPosition | null
}

export async function listScopePriceCoverage(engagementId: string): Promise<ScopePriceCoverageLine[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('engagement_scope_price_coverage_v')
    .select('*')
    .eq('engagement_id', engagementId)
    .order('sort_order', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data ?? []) as ScopePriceCoverageLine[]
}

export async function listQuotePricingLines(commercialDocumentId: string): Promise<CommercialPricingLine[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('commercial_line_pricing_v')
    .select('*')
    .eq('commercial_document_id', commercialDocumentId)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at')
  if (error) throw error
  return (data ?? []) as CommercialPricingLine[]
}

async function currentQuoteForEngagement(engagementId: string) {
  const client = requireClient()
  const { data, error } = await client
    .from('commercial_documents')
    .select('id,document_state,version_no,transaction_type')
    .eq('engagement_id', engagementId)
    .eq('document_type', 'QUOTE')
    .neq('document_state', 'VOID')
    .order('version_no', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export interface CreateDraftQuoteInput {
  engagementId: string
  transactionType: TransactionType
  notes?: string
  validThrough?: string
}

export async function createDraftQuote(input: CreateDraftQuoteInput) {
  const client = requireClient()
  const current = await currentQuoteForEngagement(input.engagementId)
  if (current?.document_state === 'DRAFT') {
    throw new Error('This Engagement already has a current DRAFT quote. Continue editing that quote instead of creating a duplicate.')
  }

  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id ?? null
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await client
    .from('commercial_documents')
    .insert({
      engagement_id: input.engagementId,
      document_type: 'QUOTE',
      transaction_type: input.transactionType,
      document_state: 'DRAFT',
      source_system: 'Stage Presence OS',
      document_date: today,
      currency: 'USD',
      certainty_state: 'KNOWN',
      notes: input.notes?.trim() || null,
      valid_through: input.validThrough ?? null,
      version_no: (current?.version_no ?? 0) + 1,
      supersedes_document_id: current?.id ?? null,
      client_visible: true,
      created_by: userId,
      metadata: { pricing_runtime: 'v1', commercial_origin: 'NATIVE' },
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

async function requireDraftQuote(quoteId: string) {
  const client = requireClient()
  const { data, error } = await client
    .from('commercial_documents')
    .select('id,engagement_id,document_type,document_state,currency')
    .eq('id', quoteId)
    .single()
  if (error) throw error
  if (data.document_type !== 'QUOTE') throw new Error('Pricing Runtime can only edit QUOTE documents.')
  if (data.document_state !== 'DRAFT') throw new Error('Only a DRAFT quote can be edited.')
  return data
}

function finiteNumber(value: number, label: string) {
  if (!Number.isFinite(value)) throw new Error(`${label} must be a finite number.`)
  return value
}

function positiveQuantity(value: number | undefined) {
  const quantity = value ?? 1
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Quantity must be greater than zero.')
  return quantity
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

async function recalculateQuoteTotals(quoteId: string) {
  const client = requireClient()
  const { data: lines, error: lineError } = await client
    .from('commercial_document_lines')
    .select('line_type,line_total')
    .eq('commercial_document_id', quoteId)
  if (lineError) throw lineError

  let subtotal = 0
  let discounts = 0
  let total = 0
  for (const line of lines ?? []) {
    const amount = Number(line.line_total ?? 0)
    total += amount
    if (line.line_type === 'DISCOUNT' || amount < 0) discounts += Math.abs(amount)
    else subtotal += amount
  }

  const { error } = await client.from('commercial_documents').update({
    subtotal: roundMoney(subtotal),
    discount_total: roundMoney(discounts),
    total: roundMoney(total),
    grand_total: roundMoney(total),
  }).eq('id', quoteId)
  if (error) throw error
}

export interface ManualQuoteLineInput {
  quoteId: string
  lineType: CommercialLineType
  description: string
  quantity?: number
  unitPrice: number
  resourceId?: string
  fulfillmentLineId?: string
  groupLabel?: string
  detailText?: string
  priceAdjustmentReason?: string
}

export async function addManualQuoteLine(input: ManualQuoteLineInput): Promise<CommercialPricingLine> {
  const client = requireClient()
  const quote = await requireDraftQuote(input.quoteId)
  const quantity = positiveQuantity(input.quantity)
  const unitPrice = finiteNumber(input.unitPrice, 'Unit price')
  if (input.lineType !== 'DISCOUNT' && unitPrice < 0) throw new Error('Only DISCOUNT lines may use a negative unit price.')
  const lineTotal = roundMoney(quantity * unitPrice)

  const { data, error } = await client.from('commercial_document_lines').insert({
    commercial_document_id: quote.id,
    line_type: input.lineType,
    group_label: input.groupLabel?.trim() || null,
    resource_id: input.resourceId ?? null,
    fulfillment_line_id: input.fulfillmentLineId ?? null,
    description: input.description.trim(),
    detail_text: input.detailText?.trim() || null,
    quantity,
    unit_price: unitPrice,
    line_total: lineTotal,
    pricing_authority_state: 'MANUAL_PRICE',
    price_adjustment_reason: input.priceAdjustmentReason?.trim() || null,
    metadata: { pricing_runtime: 'v1', calculation_method: 'QUANTITY_X_MANUAL_UNIT_PRICE' },
  }).select('id').single()
  if (error) throw error

  await recalculateQuoteTotals(quote.id)
  const { data: line, error: readError } = await client.from('commercial_line_pricing_v').select('*').eq('commercial_line_id', data.id).single()
  if (readError) throw readError
  return line as CommercialPricingLine
}

export interface PriceRuleQuoteLineInput {
  quoteId: string
  pricingRuleId: string
  lineType: CommercialLineType
  description?: string
  quantity?: number
  billingUnits?: number
  resourceId?: string
  fulfillmentLineId?: string
  groupLabel?: string
  detailText?: string
  allowDraft?: boolean
  proposedTotal?: number
  priceAdjustmentReason?: string
}

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
  return { value: null, unit: null }
}

export async function addQuoteLineFromPriceRule(input: PriceRuleQuoteLineInput): Promise<CommercialPricingLine> {
  const client = requireClient()
  const quote = await requireDraftQuote(input.quoteId)
  const quantity = positiveQuantity(input.quantity)

  const { data: rule, error: ruleError } = await client
    .from('pricing_rules')
    .select('id,code,name,status,rule_kind,scope_type,resource_id,rate_type,amount,percentage,currency,effective_from,effective_through,price_position,billing_basis,duration_value,duration_unit')
    .eq('id', input.pricingRuleId)
    .single()
  if (ruleError) throw ruleError

  if (rule.status === 'RETIRED') throw new Error('That Price Book rule is retired and cannot be applied to a new quote.')
  if (rule.status === 'DRAFT' && !input.allowDraft) {
    throw new Error('That Price Book rule is still DRAFT. Explicitly allow the draft candidate or approve it before applying it.')
  }
  if (rule.rule_kind !== 'BASE_RATE') throw new Error('Pricing Runtime v1 applies BASE_RATE rules to quote lines. Discounts/minimums/surcharges remain explicit commercial decisions.')
  if (rule.status === 'APPROVED') {
    const today = new Date().toISOString().slice(0, 10)
    if (rule.effective_from && rule.effective_from > today) throw new Error('That approved price is not effective yet.')
    if (rule.effective_through && rule.effective_through < today) throw new Error('That approved price is no longer effective.')
  }
  if (rule.amount === null) throw new Error('That Price Book rule does not contain a fixed amount and cannot be applied by this runtime yet.')

  const basis = effectiveBillingBasis(rule)
  if (basis === 'PERCENT') throw new Error('Percentage pricing is not a base quote-line calculation in Pricing Runtime v1.')
  const rate = Number(rule.amount)
  let multiplier = quantity
  let billingUnits: number | null = null
  if (basis === 'PER_HOUR' || basis === 'PER_DAY' || basis === 'PER_MILE') {
    billingUnits = input.billingUnits ?? NaN
    if (!Number.isFinite(billingUnits) || billingUnits <= 0) throw new Error(`${basis} pricing requires billingUnits greater than zero.`)
    multiplier *= billingUnits
  }
  const policyTotal = roundMoney(rate * multiplier)
  const proposedTotal = input.proposedTotal === undefined ? policyTotal : roundMoney(finiteNumber(input.proposedTotal, 'Proposed total'))
  if (proposedTotal < 0 && input.lineType !== 'DISCOUNT') throw new Error('Proposed total cannot be negative for this line type.')
  const differsFromPolicy = Math.abs(proposedTotal - policyTotal) > 0.009
  if (differsFromPolicy && !input.priceAdjustmentReason?.trim()) {
    throw new Error('A reason is required when the proposed customer price differs from the Price Book basis.')
  }

  const duration = effectiveDuration(rule)
  const authorityState: PricingAuthorityState = rule.status === 'APPROVED' ? 'APPROVED_AUTHORITY' : 'DRAFT_CANDIDATE'
  const customerUnitPrice = roundMoney(proposedTotal / quantity)

  const { data, error } = await client.from('commercial_document_lines').insert({
    commercial_document_id: quote.id,
    line_type: input.lineType,
    group_label: input.groupLabel?.trim() || null,
    resource_id: input.resourceId ?? rule.resource_id ?? null,
    fulfillment_line_id: input.fulfillmentLineId ?? null,
    description: input.description?.trim() || rule.name,
    detail_text: input.detailText?.trim() || null,
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
    price_adjustment_reason: input.priceAdjustmentReason?.trim() || null,
    metadata: {
      pricing_runtime: 'v1',
      calculation_method: billingUnits === null ? 'RATE_X_QUANTITY' : 'RATE_X_QUANTITY_X_BILLING_UNITS',
      billing_units: billingUnits,
      pricing_rule_code: rule.code,
      pricing_rule_status_at_application: rule.status,
      pricing_authority_state_at_application: authorityState,
    },
  }).select('id').single()
  if (error) throw error

  await recalculateQuoteTotals(quote.id)
  const { data: line, error: readError } = await client.from('commercial_line_pricing_v').select('*').eq('commercial_line_id', data.id).single()
  if (readError) throw readError
  return line as CommercialPricingLine
}

export interface SetQuoteLinePriceInput {
  commercialLineId: string
  proposedTotal: number
  reason?: string
}

export async function setQuoteLinePrice(input: SetQuoteLinePriceInput): Promise<CommercialPricingLine> {
  const client = requireClient()
  const { data: existing, error: existingError } = await client
    .from('commercial_document_lines')
    .select('id,commercial_document_id,line_type,quantity,policy_total_snapshot,pricing_rule_id')
    .eq('id', input.commercialLineId)
    .single()
  if (existingError) throw existingError
  await requireDraftQuote(existing.commercial_document_id)

  const proposedTotal = roundMoney(finiteNumber(input.proposedTotal, 'Proposed total'))
  if (existing.line_type !== 'DISCOUNT' && proposedTotal < 0) throw new Error('Proposed total cannot be negative for this line type.')
  const policyTotal = existing.policy_total_snapshot === null ? null : Number(existing.policy_total_snapshot)
  if (existing.pricing_rule_id && policyTotal !== null && Math.abs(proposedTotal - policyTotal) > 0.009 && !input.reason?.trim()) {
    throw new Error('A reason is required when changing a policy-based line away from its Price Book basis.')
  }
  const quantity = Number(existing.quantity ?? 1)
  const unitPrice = quantity === 0 ? proposedTotal : roundMoney(proposedTotal / quantity)

  const { error } = await client.from('commercial_document_lines').update({
    unit_price: unitPrice,
    line_total: proposedTotal,
    price_adjustment_reason: input.reason?.trim() || null,
  }).eq('id', existing.id)
  if (error) throw error
  await recalculateQuoteTotals(existing.commercial_document_id)

  const { data: line, error: readError } = await client.from('commercial_line_pricing_v').select('*').eq('commercial_line_id', existing.id).single()
  if (readError) throw readError
  return line as CommercialPricingLine
}
