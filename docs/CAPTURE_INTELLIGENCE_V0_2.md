# Capture Intelligence v0.2

## Why this version exists

A real Stage Presence source artifact attached to `SP-000026 — Music Farm` contained the direct update:

> `we finished this job`

The source was preserved, correctly linked to the Engagement, and reviewed by `DETERMINISTIC_V0_1`, but the interpreter emitted no proposal, unknown, rejection, or structured closeout because v0.1 only recognized crew confirmation, schedule timing, Resource commitment, and reported payment language.

That created a projection failure:

**reality existed → evidence was preserved → interpreter ran → structured outcome remained absent**

v0.2 is the smallest repair earned by that evidence.

## Added proposal

`DETERMINISTIC_V0_2` adds one proposal kind:

`CLOSEOUT`

Explicit reported completion language such as `we finished this job` may produce:

- `closeout_kind = DELIVERY`
- `actual_outcome = UNKNOWN`
- `solution_changed = null`
- `recurrence_signal = UNKNOWN`
- authority = `REVERSIBLE`
- explicit human review required

The proposal routes to the existing canonical `engagement_closeouts` domain.

## What completion language does **not** prove

A completion report does not automatically establish:

- that delivery was as expected;
- crew completion or actual labor;
- actual equipment/resource usage;
- payment or collection;
- final job cost or contribution;
- operational/commercial closure;
- recurrence likelihood;
- absence of issues or onsite changes.

Those truths remain in their existing canonical homes and require their own evidence.

## Provenance

Capture preserves the original source before applying an approved proposal. The approved closeout stores that `source_artifact_id` so structured outcome evidence remains traceable to the source that justified it.

An existing closeout is never overwritten from Capture. If one already exists, the user is directed to the existing Learning Closeout surface for review/update.

## Human boundary

Detection is not mutation.

The runtime remains:

```text
SOURCE TEXT
  → deterministic interpretation
  → CLOSEOUT proposal
  → explicit human review
  → existing reversible closeout command
  → engagement_closeouts
  → CLOSEOUT_RECORDED event
```

No closeout is written merely because text contains completion language.

## Regression evidence

The golden eval suite now includes:

1. `we finished this job` produces a reviewed `CLOSEOUT` proposal with outcome quality left `UNKNOWN`.
2. future/conditional language such as `When we finish this job...`, `We will finish this job tomorrow`, or `We need to complete the job first` does not create a closeout.
3. all prior v0.1 crew/schedule/resource/payment discipline remains in the same Build Check.

## Architectural lesson

Outcome starvation can be projection starvation rather than absence of reality.

When an existing canonical domain and governed write path already represent the truth, prefer extending the interpreter vocabulary over creating a new outcome subsystem.
