# Pricing Runtime v1

## Purpose

Pricing Runtime connects Stage Presence's governed Price Book, job-specific Estimate Runtime, and customer-facing commercial documents without collapsing them into one number.

The operating sequence is:

**scope → cost estimate → price-policy evidence → working quote → negotiated proposal → commercial commitment**

This runtime deliberately stops before acceptance automatically creates operational commitments. That Commercial → Operations bridge is the next layer.

## Core rule

> **Price Book policy is not the Sale. The quote remembers both.**

A commercial quote line stores the proposed customer value in the existing `unit_price` / `line_total` fields while retaining the Price Book rule and policy snapshot that informed the decision.

This preserves historical truth if the Price Book changes later.

## Canonical objects

No parallel Pricing Project is introduced.

- reusable selling policy/evidence → `pricing_rules`
- working customer proposal → `commercial_documents` where `document_type = 'QUOTE'`
- proposal lines → `commercial_document_lines`
- job-specific expected costs → `engagement_cost_items`
- represented operating scope → `fulfillment_plan_lines`

A DRAFT QUOTE is the working commercial decision object.

## Quote-line provenance

Pricing Runtime adds explicit quote-line links/snapshots:

- `fulfillment_line_id`
- `pricing_rule_id`
- `policy_amount_snapshot`
- `policy_percentage_snapshot`
- `policy_price_position`
- `policy_billing_basis`
- `policy_duration_value`
- `policy_duration_unit`
- `policy_total_snapshot`
- `pricing_authority_state`
- `price_adjustment_reason`

The customer proposal may differ from the policy snapshot, but a policy-based deviation requires an explicit reason in the application command layer.

## Governance

Price Book states remain meaningful:

- `APPROVED` → reusable authority when currently effective
- `DRAFT` → review candidate; explicit opt-in required
- `RETIRED` → unavailable for new quote calculations

Pricing Runtime does not approve rules.

Current Stage Presence Price Book has no APPROVED rules yet, so live use initially remains a deliberate review workflow rather than automatic pricing.

## Calculation semantics

Pricing Runtime v1 supports fixed-amount `BASE_RATE` rules.

### FLAT / PER_UNIT

`policy total = rate × quantity`

Duration can describe the pricing tier (for example one-day or three-day rental) without being blindly multiplied again.

### PER_HOUR / PER_DAY / PER_MILE

`policy total = rate × quantity × billing units`

Billing units are explicit command input and retained in line metadata.

### PERCENT

Percentage rules are not treated as a base quote-line calculation in v1. Discounts, surcharges and minimums remain explicit commercial decisions until their interaction rules are governed.

## Read contracts

### `commercial_line_pricing_v`

Explains each proposed line:

- customer-facing price
- Price Book rule used
- snapshotted policy basis
- variance from policy
- adjustment reason
- linked expected/committed/actual direct cost where represented

### `engagement_scope_price_coverage_v`

Compares represented fulfillment scope against pricing coverage and policy availability.

States include:

- `PRICE_REPRESENTED`
- `APPROVED_PRICE_AVAILABLE`
- `DRAFT_PRICE_AVAILABLE`
- `NEEDS_PRICE_DECISION`
- `NEEDS_MANUAL_PRICE_DECISION`
- `PACKAGE_COMPONENT`

### `engagement_pricing_position_v`

Combines commercial pricing and Estimate Runtime at the Engagement level.

It exposes:

- current quote/version/state
- quoted total
- policy/manual pricing coverage
- pricing gaps
- expected direct cost
- cost-coverage state
- partial projected contribution when some costs exist
- complete projected contribution/margin only when cost scope is represented

A mathematically available number is not promoted to a complete margin claim when cost coverage is incomplete.

## Application commands

`src/lib/pricingRuntime.ts` provides the write boundary:

- `createDraftQuote()`
- `addManualQuoteLine()`
- `addQuoteLineFromPriceRule()`
- `setQuoteLinePrice()`

The command layer:

- prevents duplicate current draft quotes
- versions/supersedes prior quotes deliberately
- blocks editing non-DRAFT quotes
- requires explicit opt-in for DRAFT Price Book candidates
- rejects RETIRED/out-of-effect approved rules
- snapshots Price Book policy at application time
- requires a reason when negotiated price differs from policy
- recalculates quote totals after line changes

## What this does not yet do

Pricing Runtime v1 does not:

- approve Price Book rules
- automatically choose a customer price from DRAFT evidence
- implement governed percentage discount/surcharge/minimum interaction
- automatically issue/send a quote
- automatically mark a quote accepted
- create Resource reservations
- assign crew
- create payment schedules
- claim complete profitability when cost coverage is partial

Those boundaries are deliberate.

## Next layer

After live Pricing Runtime verification:

1. govern highest-value Price Book candidates,
2. run a real quote/estimate through the runtime,
3. build the Commercial → Operations bridge so actual customer commitment can deliberately create the supported equipment, people, time and payment commitments.
