# Stage Presence OS — Reality Recovery & Discovery

**Status:** Current architecture/operating contract  
**Date:** 2026-09-12  
**Purpose:** Define how Stage Presence OS recovers existing business reality, represents uncertainty, discovers missing knowledge, and creates new policy without requiring a one-time database-completion project.

## Center

Stage Presence OS must never require complete knowledge before it can operate.

The system should recover what existing evidence supports, preserve uncertainty where evidence is weak, surface only decision-relevant gaps, and improve through normal business use.

> **Using the OS is how the OS learns the company.**

Database completeness is not the goal. Decision-quality business reality is the goal.

## Reality states

Every important business truth should be treated as one of these states:

- **KNOWN** — supported by credible evidence and usable operationally.
- **PARTIAL** — some decision-relevant parts are represented but important pieces remain absent.
- **INFERRED** — a reasonable interpretation exists but has not been confirmed as canonical truth.
- **CONFLICTING** — available sources disagree materially.
- **UNKNOWN** — the system knows the concept matters but does not have the answer.
- **NOT_APPLICABLE** — the concept does not apply in this context.
- **NEEDS_DECISION** — no established company rule appears to exist; Stage Presence must deliberately create one.

Where practical, business facts should retain source/provenance, certainty, timing, and who confirmed or approved them.

## Three jobs of the recovery layer

### 1. Reality Recovery

Reconstruct existing Stage Presence reality from sources that already exist:

- Supabase canonical data
- imported Goodshuffle evidence
- source artifacts and source segments
- historical quotes and fulfillment lines
- business-model documents
- operating playbooks
- inventory evidence
- prior approved decisions and policies

Recovery must not silently strengthen evidence. Imported or inferred information stays imported or inferred until evidence supports promotion.

### 2. Reality Discovery

Identify what is genuinely missing, but rank gaps by decision leverage rather than by database completeness.

Examples:

- Unknown quantity on a scarce LED trailer involved in overlapping demand = high leverage.
- Unknown quantity on an obscure accessory with no current demand = low leverage.
- Missing crew assignment for an imminent committed engagement = high leverage.
- Missing historical crew assignment on an old closed job = usually low leverage.

### 3. Reality Creation

Some gaps are not recoverable because Stage Presence has never formally decided the answer.

Examples may include:

- discount authority
- target contribution thresholds
- quote approval exceptions
- cancellation policy variants
- crew capability standards
- maintenance standards
- closeout requirements

These are **NEEDS_DECISION**, not missing-data errors. The OS should help Stage Presence make, document, version, and later revisit the decision.

---

# Current Reality Coverage Snapshot — 2026-09-12

This snapshot reflects the live Stage Presence Supabase project and current GitHub operating documents at audit time. It is not a claim of audited financial completeness.

## Strong recovered foundation

Current live evidence includes:

- 30 active Engagements (31 total rows including archived history)
- 20 Parties
- 29 Engagement-party links
- 21 Locations
- 28 Engagement-location links
- 102 active Resources
- 131 Engagement-resource links
- 30 commercial documents
- 208 commercial document lines
- 30 fulfillment plans
- 208 fulfillment lines
- 30 engagement facts
- 35 source artifacts
- 90 source-artifact segments
- 379 events in the event ledger
- 7 materialized work items

33 of 35 current source artifacts identify Goodshuffle Pro as their source system.

The imported evidence layer is therefore meaningful and should be mined before asking humans to recreate information manually.

## Source evidence recoverability

The 30 imported pull-sheet source segments retain raw structured text.

Observed recovery potential:

- 27 of 30 contain timing/date language
- 16 of 30 contain labor/people-role language
- 26 of 30 contain location/logistics language
- 25 Engagements have at least one fulfillment line with retained `event_time_text`
- 43 fulfillment lines retain `event_time_text`

This means schedule/logistics/labor candidates can often be reconstructed from existing evidence, but they must not automatically be treated as confirmed operational schedules or named crew assignments.

## Engagement lifecycle coverage

Across the 30 active Engagements at audit time:

- 1 = NEW / UNCOMMITTED
- 14 = PROPOSED / UNCOMMITTED
- 15 = WON / SIGNED

Coverage is strong for imported commercial and fulfillment history:

- all 30 active Engagements have a commercial document
- all 30 active Engagements have a fulfillment plan
- all 30 have start/end dates
- 28 have legacy venue text
- 27 have Engagement-level resource requirement windows inferred from event dates

But current imported Engagements have no populated `customer_request` or `desired_outcome` values. Those concepts exist architecturally but have not yet been recovered from the historical evidence.

## Requirements / facts

`engagement_facts` currently preserves explicit uncertainty:

- 20 KNOWN
- 1 VERIFIED
- 7 UNKNOWN
- 2 CONFLICTING

The two conflicting facts are event/chronology conflicts. Six current unknowns concern per-game economic allocation; one additional unknown is an automated test item.

The table already supports `CUSTOMER_REQUEST`, `REQUIREMENT`, `CONSTRAINT`, `PREFERENCE`, `OBSERVATION`, `ASSUMPTION`, and `OUTCOME`. Do not create a separate requirements subsystem until evidence demonstrates that `engagement_facts` cannot carry the needed semantics.

## Resources and capacity

Resource-library evidence is useful but not yet a verified physical asset register:

- 102 active Resources
- 67 have a represented sourcing model
- 35 have UNKNOWN sourcing
- 62 have UNVERIFIED represented quantity
- 40 have UNKNOWN quantity
- 0 have quantity marked VERIFIED
- 36 have price state `VERIFIED_CURRENT`
- 65 have UNKNOWN price state
- 1 has `LEGACY_REFERENCE`

Current capacity truth:

- 27 active Engagements use event-date-derived default resource windows (`INFERRED_FROM_EVENT`)
- 3 active Engagements still have UNKNOWN default resource windows
- resource-specific requirement windows remain intentionally UNKNOWN unless an actual override is known
- 3 current capacity-pressure signals are WATCH
- 0 current signals are HIGH
- no active holds/reservations/usage records are yet represented

Do not convert configured resources or inferred event windows into reservations.

## Commercial / pricing / collections

Historical commercial evidence is one of the strongest recovered areas:

- 208/208 recovered commercial lines represented
- 208/208 recovered fulfillment lines represented

However current pricing evidence is not the same as pricing authority:

- `pricing_rules`: 0 approved/current rows
- `economic_rate_profiles`: 0 rows

Historical prices, current resource references, and business-model examples are candidate evidence only until Stage Presence explicitly approves pricing authority.

Current collections coverage is partial:

- 9 committed Engagements currently participate in the economy coverage calculation
- 4 have collection evidence
- 5 do not yet have sufficient collection evidence
- `commercial_payments`: 0 native payment rows
- `commercial_payment_schedule`: 0 native schedule rows

Imported document snapshots may contain amount-paid/balance evidence, but new payment transactions should not be fabricated from snapshots.

## People / labor

The current GitHub business model names core roles and known contributors, but the governed live people layer has not yet been activated:

- `team_members`: 0
- `team_member_capabilities`: 0
- `engagement_assignments`: 0
- `engagement_step_assignments`: 0

This is not equivalent to “Stage Presence knows nobody.” Existing business-model documents and source evidence provide candidate identities and role context.

Recovery rule:

1. create candidate roster facts from documented evidence;
2. do not infer employment/contractor status, qualification, pay rate, or availability without supporting evidence;
3. promote only decision-relevant facts as they are confirmed;
4. allow capabilities to improve through actual assignments, closeouts, training evidence, and future work.

## Scheduling / operations

The current native operational tables are largely unactivated:

- `engagement_schedule_items`: 0
- `engagement_assignments`: 0
- `resource_commitments`: 0
- `resource_usage`: 0
- `engagement_step_states`: 0

But source evidence contains partial schedule/logistics clues, and fulfillment lines contain event-time text for 25 Engagements.

Recovery rule:

- derive **schedule candidates** from source evidence where possible;
- preserve TBD as TBD;
- do not turn an event date into a load-in/show/strike time unless the source actually supports it;
- activate native schedules on current/future work where operational decisions depend on them;
- do not perform low-value historical backfill merely for completeness.

## Economics

The current economy coverage view identifies major gaps:

- direct job costs: MISSING (0 of 9 represented committed Engagements)
- company operating costs: MISSING
- account/funds representation: MISSING
- owned asset economics: MISSING (0 of 66 known-owned Resources)
- approved cost rates: MISSING
- approved sell-price authority: MISSING

These gaps have different causes and must not be treated identically:

- some can be recovered from receipts, vendor records, invoices, and accounting evidence;
- some require current account/balance evidence;
- some require human approval of reusable cost assumptions;
- some require a new business decision rather than historical reconstruction.

## Closeout / learning

`engagement_closeouts` currently has 0 rows.

This does not justify fabricating historical outcomes. For old jobs, recover only what credible sources support. For future/current jobs, closeout should become a lightweight normal workflow that captures actual labor/resource usage, what changed, what worked, venue learning, customer feedback, recurrence, and founder dependency while context is fresh.

## Relationship intelligence

The current business has 20 Parties and 29 Engagement-party links, but `party_relationships` currently has 0 rows.

Relationship graph recovery should begin from strong evidence only (for example, documented contact-for / employee-of / referrer / vendor relationships). It should not infer organizational relationships solely from similar names or historical co-occurrence.

---

# Domain Classification

| Domain | Current state | Primary next treatment |
|---|---|---|
| Engagement identity/history | KNOWN | Preserve and continue native capture |
| Commercial history | KNOWN / STRONG | Preserve; use as evidence for future pricing intelligence |
| Fulfillment history | KNOWN / STRONG | Preserve; use as evidence for scope patterns |
| Parties / client links | PARTIAL | Recover relationship graph where evidence is strong |
| Customer intent / desired outcome | PARTIAL / UNKNOWN | Reconstruct candidates from source evidence; confirm when decision-relevant |
| Requirements / constraints | PARTIAL | Use `engagement_facts`; extract candidates; retain certainty |
| Locations / venue memory | PARTIAL / STRONG | Continue canonicalizing legacy venue text into Locations |
| Resources | PARTIAL | Resolve sourcing/quantity only where decision leverage is high |
| Capacity | INFERRED / PARTIAL | Preserve pressure model; activate holds/reservations only with real evidence |
| People / contributor roster | PARTIAL / RECOVERABLE | Build governed candidates from documented roles, then confirm |
| Capabilities / qualifications | UNKNOWN / PARTIAL | Confirm organically through real assignments/training evidence |
| Schedules | PARTIAL / RECOVERABLE | Extract candidates; activate for current/future jobs |
| Assignments | UNKNOWN | Capture when work is actually assigned; avoid fabricated history |
| Direct job costs | UNKNOWN / MISSING | Recover from real cost evidence; start native capture going forward |
| Collections | PARTIAL | Reconcile current committed work; then record new real payment events |
| Pricing authority | NEEDS_DECISION | Promote only explicitly approved rates/rules |
| Cost-rate assumptions | NEEDS_DECISION | Establish only from supported business economics |
| Company accounts/funds | UNKNOWN / MISSING | Represent only from current accounting/account evidence |
| Company operating costs | UNKNOWN / MISSING | Recover from accounting/vendor evidence where useful |
| Asset economics | PARTIAL / MISSING | Start with material owned assets, not every accessory |
| Process/playbooks | KNOWN / STRONG MODEL | Activate step state only where useful in current/future work |
| Work / attention | PARTIAL | Let movement logic propose; `work_items` becomes committed action |
| Closeout / learning | MISSING OPERATING HABIT | Activate lightweight closeout going forward |
| Generated outputs | STAGED | Generate from canonical truth when underlying domains are reliable |

---

# Recovery Priority Rules

## P0 — Decision-changing now

Recover or verify when the unknown can materially change a live promise, delivery, collection, or major economic decision.

Examples:
- imminent job schedule/crew gap
- capacity pressure on scarce equipment
- payment state near delivery
- accepted scope with no operational handoff
- conflicting dates affecting delivery

## P1 — High reusable leverage

Recover once when the result improves many future decisions.

Examples:
- governed contributor roster
- core capability/qualification map
- canonical venue memory
- approved primary equipment pricing
- core labor/logistics cost rates
- materially important owned-asset economics

## P2 — Capture organically

Do not conduct a giant backfill. Capture as normal work produces evidence.

Examples:
- actual labor time
- resource usage
- setup/strike duration
- venue access details
- customer feedback
- actual delivery variance
- recurrence/referrals

## P3 — Leave unknown until useful

Unknown information with little current decision leverage should remain unknown.

---

# Human interaction contract

When Stage Presence OS encounters an important gap, it should prefer a small contextual question rather than a large setup exercise.

Valid responses include:

- Confirmed / yes
- Incorrect / replace it
- Ask another person
- I do not know
- We do not currently have a rule
- Not important right now

All are legitimate business states.

`I do not know` must never force the system to invent certainty.

`We do not have a rule` should become **NEEDS_DECISION** and can enter the Flower methodology for deliberate policy creation.

---

# Governing architecture loop

```text
SOURCE / EXPERIENCE
       ↓
RECOVER OBSERVATION
       ↓
CLASSIFY CERTAINTY
       ↓
KNOWN / PARTIAL / INFERRED / CONFLICTING / UNKNOWN / NEEDS_DECISION
       ↓
DECISION LEVERAGE
       ↓
ACCEPT / VERIFY / RESEARCH / ASK / CREATE RULE / DEFER
       ↓
CANONICAL REALITY
       ↓
OPERATE
       ↓
NEW EVIDENCE
       ↓
LEARNING
       ↺
```

## Governing sentence

> **Never demand completeness, never fabricate certainty, and never ask a human to recreate information the system can responsibly recover from existing evidence. Resolve uncertainty according to decision leverage, then let normal operation continuously improve the model of Stage Presence reality.**
