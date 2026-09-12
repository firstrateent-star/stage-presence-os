# Capture Review Trace v0.1

## Center

**Human review is evidence about intelligence behavior. It is not itself business truth.**

Capture Intelligence already separates source evidence, interpretation, authority review, canonical commands and Unknown routing. Review Trace adds the missing evaluation seam: what the interpreter proposed and what the human explicitly decided about those proposals.

## Review vocabulary

For actionable proposals:
- `APPROVE` — human authorizes the canonical command.
- `REJECT` — human explicitly rejects the interpretation; an optional correction note may be preserved.
- `UNREVIEWED` — no conclusion may be inferred.

For Unknowns:
- `TRACK` — preserve the unresolved item as an `engagement_facts` row with `UNKNOWN` certainty.
- `DEFER` — explicitly record that the Unknown is not being tracked now; this does not imply low importance forever.
- `UNREVIEWED` — no conclusion may be inferred.

`PAYMENT_REPORT` remains `HELD_NON_ACTIONABLE` in Capture Intelligence v0.1. A report of payment is not a payment transaction and is not accounting verification.

## Storage boundary

Review evidence is written to the existing `events` audit stream as:

- `event_type = CAPTURE_REVIEW_RECORDED`
- `entity_type = source_artifact`
- `entity_id = original Capture source artifact`
- `engagement_id = affected Engagement`
- `metadata.schema_version = capture_review_v0_1`

No new business table is introduced. The original text remains in `source_artifacts`; the review event stores proposal/Unknown identifiers, review decisions, interpreter version, confidence/authority states, optional rejection correction, and aggregate counts. It does not duplicate the raw source text.

## Failure boundary

Canonical business actions run before review telemetry is recorded. Failure to write learning telemetry must not be reported as failure of an already-saved crew, schedule, resource commitment or Unknown Fact.

This is intentionally not a transaction across the whole Capture flow. The UI reports telemetry failure separately.

## Why this matters

The system can now distinguish:

`MODEL PROPOSED` → `HUMAN APPROVED / REJECTED / DID NOT REVIEW`

That gives future interpreter versions a real evaluation dataset without treating silence as negative feedback and without polluting canonical Stage Presence reality.

## Not yet claimed

Review Trace v0.1 does not yet prove:
- business time saved,
- lower operational error rate,
- model accuracy across enough real Captures,
- outcome correctness after delivery,
- safe autonomy.

Those require observed operating evidence.