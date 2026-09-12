# Engagement Estimate Runtime v1

## Purpose
Turn represented Stage Presence scope into a trustworthy expected direct-cost position without creating a second job or estimate truth store.

## Canonical rule
`engagement_cost_items` remains the sole job-cost ledger across:

**ESTIMATE → COMMITTED → ACTUAL → CANCELLED**

Reusable Cost Book rates remain policy/evidence in `economic_rate_profiles`. Applying a rate to a job snapshots the rate, basis, authority state and profile link onto the job cost item so later policy changes never rewrite historical economics.

## Runtime surfaces

### `engagement_estimate_lines_v`
Readable job-cost lines enriched with:
- Resource
- contributor
- vendor/counterparty
- Cost Book profile
- rate authority state
- fulfillment/commercial links
- provenance and certainty

### `engagement_scope_cost_coverage_v`
Compares the current represented fulfillment scope with cost evidence.

Coverage states:
- `PACKAGE_COMPONENT`
- `COST_REPRESENTED`
- `APPROVED_RATE_AVAILABLE`
- `DRAFT_RATE_AVAILABLE`
- `NEEDS_MANUAL_COST_DECISION`
- `NEEDS_COST_DECISION`

A missing cost is not interpreted as `$0`.

### `engagement_estimate_position_v`
Rolls direct cost into:
- estimated / committed / actual totals
- labor
- subcontract
- equipment
- materials / purchases
- logistics / travel
- other direct cost
- certainty coverage
- represented-scope coverage

Estimate coverage is explicit:
- `NO_REPRESENTED_SCOPE`
- `COSTING_NOT_STARTED`
- `PARTIAL_COST_COVERAGE`
- `COST_SCOPE_REPRESENTED`

## Application command boundary
`src/lib/estimateRuntime.ts` owns estimate-specific reads/writes for future UI and AI surfaces.

### Manual estimate
`createManualEstimate()` accepts either:
- a flat amount, or
- quantity × unit cost.

If a supplied amount conflicts with quantity × unit cost, the command rejects it rather than persisting contradictory arithmetic.

### Cost Book estimate
`createEstimateFromRateProfile()`:
- snapshots the applied reusable rate;
- rejects retired rates;
- rejects out-of-effect approved rates;
- rejects DRAFT rates unless the caller explicitly opts into using draft evidence;
- preserves whether the applied rate was `APPROVED_AUTHORITY` or `DRAFT_CANDIDATE` at application time.

### Estimate progression
`transitionCostItem()` moves the same cost item through estimate/commitment/actual reality and can replace estimated quantity/unit cost with actuals.

Cancelled items are not silently reactivated; a new item must be created instead.

## Economic boundary
This runtime does not calculate accounting profit.

It creates direct-cost evidence that can eventually support:

**expected sale − expected direct cost = expected contribution**

and later:

**actual collected/revenue position − actual direct cost = observed contribution where supported**

QuickBooks remains formal accounting authority.

## Next seam
Once estimate behavior is validated on real jobs, connect:

**Scope + Estimate + Price Book → pricing decision → quote/sale**

Then accepted commercial scope can drive:

**resource commitments + crew assignments + schedule + warehouse/logistics + payment expectations**.
