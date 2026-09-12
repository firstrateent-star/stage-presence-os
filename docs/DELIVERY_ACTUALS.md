# Delivery Actuals

## Center

> **Plan and actual are different truths. Stage Presence OS must never turn represented scope into actual delivery without explicit evidence or human confirmation.**

Delivery Actuals activates structures that already existed in the Stage Presence model:

- `engagement_resources` = represented relevance / requirement / configuration;
- `resource_commitments` = hold / reservation / allocation truth;
- `resource_usage` = what was actually deployed, used, returned, consumed or completed;
- `engagement_assignments` = job-specific contributor responsibility;
- assignment state `COMPLETED` = confirmed responsibility that actually occurred;
- `engagement_closeouts` = outcome and learning after delivery.

The intended sequence remains:

```text
PLAN
  ↓
COMMIT / RESERVE when evidenced
  ↓
DELIVER
  ↓
ACTUAL USAGE + ACTUAL CREW
  ↓
VARIANCE
  ↓
CLOSEOUT / LEARNING
```

## Interface behavior

Delivery Actuals appears when delivery is active/complete/closed, when the represented delivery date has arrived, or when actual evidence already exists.

### Resource / service use

The interface starts from existing `engagement_resources`, but **does not create usage automatically**.

A human must explicitly confirm:

- usage state;
- quantity if known;
- actual from/through timing if useful;
- notes about material differences/context.

Each manually confirmed actual uses deterministic source key:

`manual-usage:<engagement_resource_id>`

so repeat edits update the same actual instead of creating competing manual actuals.

The original planned/configured row remains intact for future variance analysis.

### Crew completion

The interface only loads assignments in `CONFIRMED` or `COMPLETED` state.

Only a `CONFIRMED` assignment can be promoted to `COMPLETED`.

`POSSIBLE` and `REQUESTED` are never treated as proof the person actually worked the Engagement.

## Epistemic boundary

Manual actual confirmation currently writes `certainty_state = KNOWN`.

It does not claim `VERIFIED` because this first interface records a trusted operator assertion, not independent reconciliation against another source.

Source photos, receipts, timesheets or other evidence can later strengthen the certainty through existing provenance/recovery patterns.

## Observed semantic seam: equipment sale

`resource_usage` is naturally suited to event production, rentals, installation/service deployment and similar use/deployment reality.

An **equipment sale** may instead require a different actual truth: transfer/disposition of an asset or sold inventory. The current interface does not establish a new transfer/disposition aggregate merely because that possibility exists.

For now:

- do not interpret a configured sale item as actual usage automatically;
- preserve sale-delivery evidence through Capture / commercial / fulfillment / closeout structures;
- observe repeated real equipment-sale workflows;
- only introduce transfer/disposition semantics if existing structures repeatedly cannot represent the business faithfully.

This is an intentional example of the governing sequence:

**use existing architecture → observe genuine failure → only then migrate.**
