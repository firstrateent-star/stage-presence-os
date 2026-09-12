# Stage Presence Price Book + Cost Book Foundation v1

**Status:** First Operational Core economic-policy activation  
**Date:** 2026-09-12  
**Center:** Operational Clarity

## Why this exists

Stage Presence already understands the normal commercial/operational path well enough to stop repeatedly redesigning job flow.

The immediate economic problem is simpler:

> When a customer calls, Stage Presence needs to understand what the solution requires, what it will cost the company, what pricing evidence/policy applies, what should be charged, and what becomes committed when the customer agrees.

This foundation activates the existing pricing/economic primitives without turning historical evidence into policy.

It remains one part of the larger Stage Presence OS. Relationships, People, Things/Warehouse, Work, Time, Money, Evidence, Files, Communication, Knowledge, Capture/AI and accounting handoff remain first-class domains.

---

# 1. Governing distinctions

## Price Book

Reusable **selling-price policy**.

Examples:
- 17x10 trailer standard one-day rate
- panel per-unit / per-day rental rate
- A1 daily sell rate
- delivery/logistics rule
- commercial floor
- target rate

Historical quotes and Goodshuffle reference prices are evidence, not automatically Price Book authority.

## Cost Book

Reusable **internal/external cost assumptions**.

Examples:
- contributor pay rate
- subcontractor rate
- vendor cost
- materials
- travel/logistics cost
- owned-asset allocation or maintenance reserve when later justified

Cost Book is not customer pricing.

## Engagement estimate

Job-specific expected cost created from the actual scope.

Reusable cost assumptions may seed an estimate, but the Engagement records the amount/rate actually applied to that job.

## Sale

What the customer actually agrees to pay for the Engagement.

Sale may differ from Price Book because of negotiation, package structure, relationship, scarcity, complexity, discount or exception judgment.

## Actual cost and cash

Actual fulfillment cost and actual customer payment remain separate from estimate and Sale.

Constitutional shorthand:

**PRICE != SALE != COST != CASH**

---

# 2. Rental-rate dimensionality

The original `pricing_rules.rate_type` mixed two separate ideas:

1. **how the customer is charged**, and
2. **what duration the price covers**.

That cannot faithfully express normal Stage Presence pricing such as:

> `$80 per LED panel per day`

v1 therefore introduces separate dimensions while retaining `rate_type` as a compatibility field:

### `billing_basis`
- `FLAT`
- `PER_UNIT`
- `PER_HOUR`
- `PER_DAY`
- `PER_MILE`
- `PERCENT`
- `OTHER`

### `duration_value` + `duration_unit`
Examples:
- `1 DAY`
- `3 DAY`
- `1 WEEK`
- `1 MONTH`
- `1 EVENT`

This allows the future Price Book to represent real duration curves instead of relying on hidden metadata or multiplying a day rate mechanically.

---

# 3. Price position

The new `price_position` dimension separates where a reusable number sits in the pricing stack:

- `STANDARD`
- `ECONOMIC_FLOOR`
- `COMMERCIAL_FLOOR`
- `TARGET`
- `VALUE_REFERENCE`

This does **not** mean all five layers must be populated now.

The normal sequence remains evidence-led:

**direct cost -> economic floor -> commercial floor -> target -> recommended/value-supported -> negotiated Sale**

Dynamic recommendation can remain a future decision layer; it is not silently encoded as policy.

---

# 4. Role pricing

`pricing_rules` now supports `scope_type = ROLE` with `role_code`.

This lets Stage Presence represent customer sell rates such as A1, A2 or Project Manager without pretending those rates are physical Resources or internal pay rates.

Role sell price and contributor pay remain intentionally separate.

---

# 5. Governance

## Pricing authority

Only an `APPROVED` pricing rule effective on the relevant date is reusable pricing authority.

`DRAFT` means:

> represented candidate/evidence requiring human governance.

`RETIRED` remains historical policy, not active authority.

Approval still requires explicit `approved_by` and `approved_at` evidence.

## Cost authority

The same principle applies to `economic_rate_profiles`.

Scott and Ben's represented `$80/hour` evidence remains `DRAFT`; it is not automatically applied to jobs and is not treated as approved company pay policy.

Unknown contributor rates remain explicitly visible through `cost_book_v` rather than appearing as zero.

---

# 6. Read contracts

## `price_book_v`

Unified pricing-policy/evidence surface.

It exposes:
- governed Price Book rules
- scope and duration dimensions
- approval state
- Resource reference price evidence
- historical commercial observations where linked
- positive-price min/average/max
- explicit authority state

Authority states include:
- `APPROVED_AUTHORITY`
- `DRAFT_CANDIDATE`
- `RETIRED_POLICY`
- `CURRENT_REFERENCE_ONLY`
- `LEGACY_REFERENCE_ONLY`
- `HISTORICAL_ONLY`
- `NO_PRICE_EVIDENCE`

Zero-dollar historical lines are counted separately and are **not** treated as evidence that the normal price is zero.

## `cost_book_v`

Latest reusable cost-profile surface.

It enriches cost profiles with Resource, team-member and Party/vendor identity and explicitly adds missing-rate rows for active contributors with no represented reusable cost rate.

Authority states include:
- `APPROVED_AUTHORITY`
- `DRAFT_CANDIDATE`
- `RETIRED_OR_OUT_OF_EFFECT`
- `NO_RATE_EVIDENCE`

## `engagement_estimate_position_v`

Job-level direct-cost evidence surface.

It keeps separate totals/counts for:
- `ESTIMATE`
- `COMMITTED`
- `ACTUAL`
- `CANCELLED`

The view deliberately does not claim that a partial set of ACTUAL rows represents the complete final cost of the job.

---

# 7. Initial draft candidates

The first migration seeds only evidence already represented or explicitly supplied by Stage Presence.

### Resource/reference candidates
- 17x10 LED Trailer — current represented one-day reference
- 12x7 LED Trailer — current represented one-day reference
- 10x5 LED Trailer — legacy event reference
- 3.9mm LED Panels — represented per-panel / one-day reference
- Delivery & Pickup — represented flat reference
- Load-in — represented flat reference
- Content & Video Tech — represented flat reference

### Historical role sell-rate candidates
- A1 — $750/day
- A2 — $500/day
- Project Manager — $1,000/day

### Draft internal cost evidence
- Scott — $80/hour
- Ben — $80/hour

All remain **DRAFT**.

LED poster pricing is deliberately not promoted into a draft rule yet because the current `$500` reference does not establish whether it is per-panel, package, minimum, or another commercial structure.

Likewise, conflicting historical prices remain visible rather than being silently reconciled.

---

# 8. What this unlocks next

This foundation enables the next Operational Core build steps without redesigning the entire OS:

1. **Price Sweep** — Greg/Nancy review draft/reference/historical evidence and approve/retire/replace pricing rules.
2. **Cost Sweep** — confirm team, vendor, material and common fulfillment cost assumptions.
3. **Estimate Runtime** — build job-specific `engagement_cost_items` from real scope.
4. **Pricing Runtime** — compare scope, approved pricing and expected cost during quoting.
5. **Commercial -> Operations Bridge** — accepted scope creates the reservations, assignments, schedule, payment expectations and operating work that are actually supported.
6. **Actuals** — usage, labor, direct cost, payments and closeout turn estimates into learning.

The OS as a whole remains larger than these economic systems. The economic spine exists to connect customer demand to executable work, then feed better truth back into Relationships, Warehouse, People, Calendar, Money and Knowledge.
