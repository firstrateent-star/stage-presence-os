# Capture Unknown Routing v0.1

## Center

**Unknown is valid business reality. It may be preserved without being guessed, assigned or forced into immediate action.**

This increment extends Capture Intelligence so interpreter-detected uncertainty can be explicitly promoted into the existing `engagement_facts` model with `certainty_state = UNKNOWN`.

## Flow

```text
SOURCE
  -> interpretation
  -> typed Unknown
  -> human review
  -> optional Track Unknown
  -> engagement_facts / UNKNOWN
  -> later Recovery / operating attention when relevant
```

The same source artifact remains provenance for the Unknown and any approved operating commands from the Capture.

## Typed Unknown contract

Each interpreter Unknown carries:

- stable id;
- code;
- human label;
- detail;
- fact category;
- decision-leverage hint: LOW / MEDIUM / HIGH.

Decision leverage is presentation context only in v0.1. It does not automatically create priority or Work.

Initial Unknown types:

- `PAYMENT_AMOUNT` — a payment is reported but amount is absent;
- `PAYMENT_VERIFICATION` — reported payment lacks accounting/processor verification;
- `SCHEDULE_DATE` — clock time is present but no Engagement date is available;
- `NO_TEXT` — interpreter received no source text.

## Canonical-write boundary

Selecting an Unknown creates an `engagement_facts` row:

- `certainty_state = UNKNOWN`;
- `source_type = CAPTURE_INTELLIGENCE`;
- source artifact linked;
- interpreter code and capture-time decision leverage preserved in notes.

The routing command checks for an equivalent existing UNKNOWN from the same source before insertion.

## Deliberate non-actions

Tracking an Unknown does not:

- create or replace the Engagement primary next move;
- create Work;
- assign an owner;
- invent a deadline;
- mark the underlying assertion true;
- create a payment;
- verify accounting evidence.

Those actions require separate evidence and/or explicit human intent.

## Eval extension

The Capture golden suite now also verifies:

- a payment with no amount emits typed HIGH-leverage amount and verification Unknowns;
- a schedule clock without an Engagement date emits a typed LOGISTICS Unknown and still does not invent a date.

## Vlourish learning status

Instance evidence supports the candidate principle that uncertainty should have a durable canonical representation separate from task urgency. This remains Stage Presence instance learning until cross-validated elsewhere.
