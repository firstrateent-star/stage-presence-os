# Commercial → Operations Bridge v1

## Purpose

This bridge turns accepted commercial truth into explicit operational obligations without pretending that a signed quote automatically proves equipment availability, crew assignment, schedule completeness, or payment structure.

Sequence:

**accepted commercial → resource/people/time/payment decisions → explicit commitments → fulfillment**

## Core distinction

> **Customer commitment is not the same as operational commitment.**

A signed quote means Stage Presence has a commercial obligation. It does not by itself prove:

- a specific Resource is available,
- warehouse quantity has been verified,
- a crew member has accepted an assignment,
- exact call/load/strike timing is known,
- payment terms are structurally represented.

The bridge makes those obligations visible and provides safe command boundaries for creating them.

## Read contracts

### `accepted_scope_commitment_coverage_v`

For each represented fulfillment line it shows:

- accepted commercial document evidence
- physical Resource identity where relevant
- requirement-window evidence
- sourcing model
- existing tentative/confirmed commitments
- whether a requirement window must be resolved
- whether a Resource commitment decision is required

Key states:

- `NOT_COMMERCIALLY_COMMITTED`
- `NON_RESOURCE_SCOPE`
- `REQUIREMENT_WINDOW_NEEDED`
- `RESOURCE_COMMITMENT_NEEDED`
- `RESOURCE_COMMITMENT_REPRESENTED`

### `engagement_commitment_bridge_v`

Engagement-level operating transition surface:

- accepted commercial document/value
- represented fulfillment scope
- Resource-window gaps
- Resource-commitment gaps
- assignment coverage
- schedule coverage/TBD count
- payment-schedule coverage

Bridge states:

- `NOT_COMMERCIALLY_COMMITTED`
- `RESOURCE_WINDOWS_NEEDED`
- `RESOURCE_COMMITMENTS_NEEDED`
- `PAYMENT_TERMS_NEED_STRUCTURING`
- `ACCEPTED_SCOPE_BASELINE_REPRESENTED`

`ACCEPTED_SCOPE_BASELINE_REPRESENTED` does not mean the job is execution-ready. It means the commercial-to-operations baseline no longer has the earlier bridge blockers.

## Commands

### `acceptQuote()`

Records explicit quote acceptance and updates Engagement commercial/commitment state:

- quote → `SIGNED`
- Engagement commercial state → `WON`
- Engagement commitment state → `SIGNED`
- `NOT_STARTED` operational state → `PLANNING`

It does not reserve Resources or assign crew.

### `createTentativeResourceHoldFromQuoteLine()`

Creates a dated `HOLD / TENTATIVE` commitment from an accepted commercial line.

Requirements:

- accepted commercial evidence
- identified physical Resource
- positive quantity
- complete requirement window

A tentative hold intentionally does not claim verified availability.

### `confirmResourceReservation()`

Promotes a tentative hold to `RESERVATION / CONFIRMED`.

For owned Resources:

- VERIFIED quantity is checked against overlapping confirmed demand,
- unverified warehouse quantity requires explicit human override,
- a verified capacity conflict requires explicit human override.

Any override is retained in commitment metadata.

This allows the OS to become operational before the Warehouse Sweep is complete without silently presenting uncertainty as verified capacity.

### `createCrewAssignment()`

Creates an explicit person/job role relationship. The bridge never invents a crew member from a service line.

A `CONFIRMED` assignment requires a commercially committed Engagement. Planning-level `POSSIBLE` / `REQUESTED` assignments remain available.

Crew cost remains a separate job-cost decision through Estimate Runtime / Cost Book.

### `createPaymentScheduleTerm()`

Structures an accepted document's payment obligation as Deposit / Installment / Final / Balance / Other.

A Deposit term moves a `SIGNED` Engagement to `DEPOSIT_PENDING`; actual receipt remains a separate Cash event.

## Why no automatic mass materialization

Commercial acceptance has business consequence, but many operational facts are conditional:

- pickup may require no show crew,
- a Resource may have an unknown warehouse quantity,
- an external/subcontracted Resource may not use owned-capacity logic,
- exact requirement windows may still be unresolved,
- payment terms vary by contract.

Therefore v1 makes deterministic obligations visible and provides commands rather than manufacturing reservations, assignments, tasks, or payment terms from incomplete evidence.

## Next

After live verification:

1. use the bridge on a real accepted Stage Presence job,
2. begin capturing warehouse pull/load/return/inspection state,
3. record actual crew time and Resource usage,
4. connect payment schedule to actual Cash evidence,
5. close the Engagement and feed learning back into Price Book, Cost Book, Warehouse, Relationships and Playbooks.
