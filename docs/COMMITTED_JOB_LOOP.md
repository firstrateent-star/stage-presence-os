# Committed Job Loop

## Center

A signed Engagement should progressively become executable operating truth without collapsing planned, committed and actual reality into one state.

## Current loop

```text
SIGNED / WON
   ↓
FULFILLMENT SCOPE
   ↓
OPERATING REALITY
   ├── Schedule
   ├── Crew / responsibility
   └── Capacity commitment
   ↓
DELIVERY READINESS
   ↓
SELECTIVE MOVEMENT / WORK
   ↓
DELIVERY ACTUALS
   ↓
CLOSEOUT / LEARNING
```

## Canonical homes

- timing → `engagement_schedule_items`
- job-specific people → `engagement_assignments`
- configured need → `engagement_resources`
- hold / reservation / allocation → `resource_commitments`
- actual resource use → `resource_usage`
- next action / blocker → `work_items`
- delivered outcome → `engagement_closeouts`

## Capacity semantics

Configured equipment is not committed capacity.

A Resource can move through:

```text
CONFIGURED NEED
      ↓
HOLD / RESERVATION / ALLOCATION
      ↓
TENTATIVE or CONFIRMED
      ↓
FULFILLED / RELEASED / CANCELLED
      ↓
ACTUAL USAGE (when actually delivered)
```

The first interface intentionally requires a human to record the commitment. `TENTATIVE` is the safe default. `CONFIRMED` should only be selected when Stage Presence has actually committed that capacity to the Engagement.

Releasing a commitment changes its state to `RELEASED`; it does not delete the historical record.

## Vlourish authority model

- Reading configured resources: Level 0 — Observe.
- Suggesting a likely hold/reservation: Level 1 — Suggest.
- Recording a tentative hold: Level 2 — Reversible action.
- Recording a confirmed commitment: consequential business truth and therefore requires explicit human action in the current system.

No agent currently receives autonomous authority to commit capacity.

## What this does not claim

- A resource commitment does not prove actual use.
- A confirmed crew assignment does not prove the person actually worked the job.
- A represented schedule does not prove execution occurred at that time.
- Delivery Readiness is a derived evidence posture, not an operational guarantee.

Actuals remain separate and are captured after/during delivery.

## Why this is the next build

At the time this loop was activated, Stage Presence had 15 signed Engagements, but the live OS represented no active resource commitments and no signed-job crew assignments. The architecture already contained the correct canonical structures; the missing piece was an operating interface that made normal business use populate them.

This follows ADR-0003: activate existing canonical structures before introducing new abstractions.
