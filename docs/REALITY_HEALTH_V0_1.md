# Reality Health v0.1

## Center

**Reality Health describes what Stage Presence OS can currently support with evidence. It is not a completeness score.**

The observatory sits inside Recovery because it is a system-level view of evidence coverage and uncertainty, not a primary operating destination.

## States

- `SUPPORTED` — current structured evidence broadly supports the domain claim being made.
- `PARTIAL` — meaningful evidence exists, but coverage is incomplete or not asserted complete.
- `UNKNOWN` — the OS cannot currently determine the state from its represented evidence.
- `NOT_YET_OBSERVED` — the OS has not yet accumulated structured operating evidence for the domain. This never means the activity did not happen.
- `DECISION_RELEVANT_GAP` — reserved for gaps where missing evidence is currently important enough to affect a decision. v0.1 does not manufacture these from blank coverage alone.

## Domains in v0.1

Reality Health observes existing canonical structures and read models for:

- Commercial
- Fulfillment
- Relationships
- Schedule
- Crew
- Capacity commitments
- Actual equipment use
- Direct costs
- Collections
- Closeout / outcomes
- Capture learning

Capture learning is observed from `events.event_type = CAPTURE_REVIEW_RECORDED` and therefore reflects real human review traces, not merely that Capture Intelligence exists in code.

## Evidence boundary

Reality Health is read-only. It does not:

- create Recovery candidates,
- change Engagement state,
- assign work,
- verify payments,
- infer costs,
- reserve equipment,
- mark crew confirmed,
- close jobs,
- or convert absence into failure.

A domain showing `NOT_YET_OBSERVED` should be read as: **the OS does not yet hold enough structured evidence to make a stronger claim.**

## Why no percentage

A single percentage would collapse different meanings of missingness. A job that has not yet reached delivery should not be penalized for having no actual usage or closeout. A historical job may have happened successfully even when the OS lacks structured actuals. Reality Health therefore reports state and evidence counts rather than pretending all fields deserve equal completeness.

## Relationship to Recovery

Reality Health answers: **where is our model of reality strong, partial, or not yet observed?**

Recovery answers: **which specific gaps currently deserve review, recovery, deferral, or a decision?**

The two should remain distinct.
