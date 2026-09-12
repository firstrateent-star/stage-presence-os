# Stage Presence OS — Recovery Queue

**Status:** Active operating/recovery layer  
**Date:** 2026-09-12

## Center

> **Find what we know → recover what we can → ask what matters → grow through use.**

Recovery is not a database-completion project. It is a permanent operating layer that converts existing evidence, uncertainty, business gaps and decision leverage into a small set of useful review candidates.

The system must never treat an empty field as an automatic task.

## Architecture

The Recovery Queue deliberately separates two things:

1. **Derived candidates** — deterministic interpretations of existing Stage Presence reality.
2. **Human disposition** — lightweight persisted review state such as in-review, deferred, not-relevant, resolved or needs-decision.

Neither layer replaces canonical business truth.

```text
canonical reality + evidence + movement + coverage
                    ↓
             recovery_queue_v
                    ↓
          human review / disposition
                    ↓
       recovery_item_decisions
                    ↓
 canonical owning domain is corrected when needed
                    ↓
             candidate disappears
                    ↺
```

## Candidate sources

### Evidence recovery
Existing fulfillment/source evidence contains a useful fact that has not yet been represented natively.

Initial example: line-level Goodshuffle timing exists but no native Engagement schedule is represented.

The candidate exposes the evidence for review. It does **not** parse TBD text into invented timestamps or automatically create schedule rows.

### Unresolved truth
Existing `engagement_facts` explicitly marked `UNKNOWN` or `CONFLICTING` become candidates only when relevant enough to surface.

Conflict earns review. Unknown can remain `ASK_WHEN_RELEVANT`.

### Resource verification
Capacity pressure plus weak quantity/sourcing evidence can create a targeted Resource verification candidate.

This follows the Capacity Truth rule: verify only uncertainty with decision leverage; do not trigger a giant inventory audit.

### Operating gaps
Top selective-movement signals can enter Recovery when they represent a current reality gap that deserves review.

Derived movement remains distinct from persisted work.

### Reality coverage gaps
Selected business-wide gaps from `economy_reality_coverage_v` may surface when they have enough decision value. Examples include collection evidence, direct job costs, contributor roster and resource sourcing.

Missing coverage is never interpreted as `$0`, false, or operational failure.

### Business decisions
Some gaps cannot be recovered because Stage Presence has not established a governed answer. Initial examples include approved pricing authority and reusable internal cost-rate assumptions.

These are `NEEDS_DECISION`, not missing-data errors.

## Queue lanes

- **Now** — current candidates where timing/consequence makes review useful now.
- **Recover** — existing evidence can probably be translated into a canonical home after review.
- **Review** — evidence or operating state needs a human check.
- **Later** — valid uncertainty with low present decision leverage, including deliberately deferred candidates.
- **Decisions** — policy/authority questions the company must deliberately establish.
- **All** — complete active derived queue; not the default working surface.

## Persisted disposition

`recovery_item_decisions` stores only review continuity:

- `OPEN`
- `IN_REVIEW`
- `DEFERRED`
- `NOT_RELEVANT`
- `RESOLVED`
- `NEEDS_DECISION`

It may retain a review note, optional assignee and deferral date.

A Recovery decision does **not** own venue, schedule, payment, Resource, pricing, assignment, cost or other domain truth. Those facts remain in their canonical tables.

## Resolution semantics

- **In review** — someone is actively checking the candidate.
- **Defer** — valid but not worth attention now.
- **Not relevant** — candidate does not matter in this context; preserve disposition rather than deleting history.
- **Needs decision** — no recoverable answer or current authority exists; deliberate company rule/judgment is needed.
- **Resolved** — review is complete. If the candidate represented real business truth, the owning domain should have been updated separately.
- **Reopen** — return the review candidate to active attention.

## Security

- `recovery_item_decisions` uses RLS and the existing `private.is_app_member()` boundary.
- Anonymous/public access is revoked.
- `recovery_queue_v` is `security_invoker=true` and is readable only by authenticated app members.
- Recovery never introduces service-role credentials to the browser.

## Current activation baseline

At activation on 2026-09-12 the derived queue represented:

- 54 active candidates overall
- 12 `NOW`
- 21 directly recoverable evidence candidates
- 2 business-decision candidates

The UI defaults to `NOW` rather than showing the full queue. The purpose is attention compression, not completeness pressure.

## Governing distinctions

- candidate != canonical truth
- candidate != task
- recovered evidence != verified truth
- unresolved != wrong
- unknown != zero
- deferred != forgotten
- needs-decision != missing data
- resolved review != automatic domain mutation

## Growth path

Recovery can later expand toward safe candidate-to-domain workflows only when earned by repeated use. Examples might include reviewed schedule promotion, targeted Resource verification or capture-interpreter candidates.

The first version intentionally keeps canonical mutations explicit so Stage Presence can observe whether candidate quality is useful before automating promotion.
