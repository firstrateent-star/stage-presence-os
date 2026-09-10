# Stage Presence Reality Coverage

## Purpose

The Stage Presence OS backend is intentionally richer than the everyday frontend. Reality Coverage is the translation boundary between those two layers.

It answers four questions for each important domain:

1. What does the system currently know?
2. How complete is that knowledge where a meaningful denominator exists?
3. Why does the missing truth matter to Stage Presence?
4. What evidence should be produced next, and where will it appear in the frontend?

The goal is not database completeness. The goal is decision-useful reality.

## Current contract

`economy_reality_coverage_v` is a read-only `security_invoker` presentation contract. It derives coverage from canonical operating tables and views; it does not create tasks, fabricate missing records, or mutate business state.

Current domains:

- Direct job costs
- Accounts + funds
- Collections + balances
- Company operating costs
- Resource sourcing classification
- Owned asset economics
- Contributor roster
- Approved cost rates
- Approved sell-price authority
- Recovered commercial-line evidence
- Recovered fulfillment-line evidence

## Coverage states

- `SUPPORTED` — the defined evidence relationship is represented for the current scope.
- `PARTIAL` — some useful evidence exists, but the defined relationship is incomplete.
- `MISSING` — the domain has not yet been represented enough to support the intended decision.
- `NOT_APPLICABLE` — the current live scope does not require the evidence relationship.

`SUPPORTED` does not mean audited, perfect, or permanently complete. It means the contract's present evidence expectation is met.

## Frontend behavior

The Economy screen presents the contract as a Reality Map.

The first layer shows:

- count of grounded / partial / missing domains
- the three highest-priority evidence gaps
- exactly what should be produced next
- where that evidence becomes visible when entered

The full map is progressively disclosed and groups domains by business meaning rather than database schema. Raw source table/view names remain behind an optional Backend Evidence Map detail.

## Governance

Reality Coverage must not become a generic completeness score or checklist factory.

Rules:

- Missing fields are not automatically work.
- A denominator is used only when the business relationship supports one.
- Open-ended domains such as company overhead, roster size, cost-rate count, and pricing-rule count do not receive invented targets.
- Historical Goodshuffle evidence can support observed history but does not become approved pricing, current payment transactions, asset value, or current cost policy.
- Collections remain different from actual account funds.
- Asset economics remain different from resource availability and commitment.
- Cost assumptions remain different from historical job cost evidence.
- Contributor identities must be confirmed rather than inferred from names appearing in historical source material.

## Current baseline at creation

When this contract was introduced on 2026-09-10, the live backend reported:

- 208 recovered commercial lines and 208 recovered fulfillment lines
- 9 Engagements with supported committed revenue
- 4 of 9 committed Engagements with collection evidence
- 0 of 9 committed Engagements with direct-cost evidence
- 0 represented financial accounts
- 0 represented company operating-cost records
- 67 of 102 active Resources with non-UNKNOWN sourcing
- 0 of 66 known-owned Resources with an economic snapshot
- 0 approved reusable cost-rate profiles
- 0 approved pricing rules
- 0 active team-member identities

These numbers are not hard-coded in the frontend. The view recalculates them from live reality.

## Flower principle

**Store richly → derive business meaning → expose the smallest useful truth → show the missing evidence → learn from what reality corrects.**
