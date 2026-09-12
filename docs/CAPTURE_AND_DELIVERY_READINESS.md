# Capture + Delivery Readiness

## Center

Stage Presence OS should become easier to operate as the model becomes richer.

Two complementary interfaces now support that goal:

- **Capture** answers: *What changed in reality?*
- **Delivery Readiness** answers: *What execution truth is represented strongly enough to operate from?*

Neither is a new truth domain. Both are application layers over existing canonical structures.

## Capture

Capture replaces the mental model of “create a new record.”

The global action is now:

> **+ Capture**

Capture has two paths.

### New opportunity

Preserve the incoming source first, then create the Engagement and only write explicitly known structure:

- customer request → Engagement request;
- date-only evidence remains date-only;
- Venue → canonical `locations` + `engagement_locations`;
- real next move → canonical `work_items`;
- source photo/text → `source_artifacts` + event history.

### Existing work

Attach new reality to an existing Engagement through one of four deliberately narrow modes:

1. **Evidence** — preserve and link the source only. Creates no business claim.
2. **Known fact** — preserve the source, then write `engagement_facts` with KNOWN certainty.
3. **Need answer** — preserve the source, then write `engagement_facts` with UNKNOWN certainty.
4. **Next move** — preserve the source, then write canonical Work through the existing next-move command.

This first native Capture iteration intentionally does **not** provide one generic form for assignments, payments, reservations, usage or closeout. Those domains already have or are gaining purpose-specific controls where their semantics can be protected.

AI may later interpret Capture and propose structured actions, but source preservation and deterministic domain commands remain the authority boundary.

## Delivery Readiness

Delivery Readiness is **derived**, not persisted.

It reads the Engagement workspace and explains seven dimensions:

1. commercial commitment;
2. operational/fulfillment scope;
3. canonical Venue/place;
4. execution timing;
5. crew/job responsibility;
6. resource commitment evidence;
7. open persisted Work.

The posture is deliberately not a percentage and not a guarantee.

Possible postures:

- `PRE_COMMITMENT` — delivery is not yet the primary decision;
- `NEEDS_STRUCTURING` — a committed Engagement lacks a core represented dimension such as scope/place/time;
- `NEEDS_REVIEW` — the delivery picture exists but some represented truth remains tentative/unverified;
- `SUPPORTED` — current represented execution truth exposes no obvious evidence gap under these rules.

Important semantics:

- `TBD` timing is valid reality, not a software error;
- configured equipment is not treated as held/reserved;
- a roster is not treated as job assignment;
- POSSIBLE/REQUESTED assignment is not CONFIRMED assignment;
- missing canonical records do not prove real-world failure;
- readiness is only a statement about what the OS can currently support with evidence.

## Product flow

```text
incoming reality
      ↓
   CAPTURE
      ↓
source evidence
      ↓
canonical business truth
      ↓
ENGAGEMENT WORKSPACE
      ↓
Operating Reality
      ↓
Delivery Readiness
      ↓
Selective Movement / persisted Work
      ↓
actual delivery
      ↓
usage + costs + payments + closeout
      ↓
learning
```

This is how Stage Presence OS should progressively complete its model: **normal business use creates better structured reality**, rather than a separate historical data-entry project.

## Still intentionally not added

No new solution-design aggregate.
No new commitment/change-order aggregate.
No readiness table.
No generic Capture truth table.
No automatic task/assignment/reservation/payment creation from free text.

Those abstractions remain subject to the same rule:

> use existing architecture → observe repeated representational failure → only then migrate.
