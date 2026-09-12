# Capture Evaluation v0.1

## Center

**Human review is evidence about interpreter behavior. It is not final truth accuracy.**

Stage Presence Capture Intelligence now preserves three distinct evidence layers:

1. **Execution evidence** — what the interpreter proposed and which interpreter version produced it.
2. **Human review evidence** — what a person approved, rejected, tracked, deferred, or left unreviewed.
3. **Outcome evidence** — what later business reality supports as having actually happened.

v0.1 observes the first two. It does not claim the third.

## Why approval rate is not accuracy

A proposal may be approved and later prove incomplete or wrong. A proposal may be rejected for workflow preference rather than factual error. An unreviewed proposal is not a rejection. A held payment report is deliberately non-actionable and must not be counted as approved or rejected.

Therefore the observatory reports counts such as:

- proposed;
- approved;
- rejected;
- unreviewed;
- held non-actionable;
- Unknown tracked;
- Unknown deferred;
- Unknown unreviewed.

It does not label these metrics as precision, recall, accuracy, or correctness.

## Correction notes

Optional human rejection notes are surfaced as learning evidence. Repeated notes may earn:

- a new golden eval case;
- an interpreter hypothesis;
- a domain rule candidate;
- additional observation.

They do not automatically become production rules or Vlourish Canon.

## Version comparison

Every review trace includes the interpreter identifier. This allows future experiments to compare deterministic v0.1 with a model-backed interpreter under the same proposal and authority contracts.

The future comparison path is:

`same source -> interpreter A + interpreter B -> human review -> later outcome evidence -> evaluation`

A stronger model earns promotion through evidence; it does not gain authority merely because it is newer or more capable.

## Placement

Capture Evaluation lives inside Reality Health / Recovery as an internal Vlourish observatory. It is not a primary operating dashboard and does not write canonical business truth.

## Current live state at introduction

When this capability was introduced, Stage Presence had source-add evidence but no persisted `CAPTURE_REVIEW_RECORDED` events yet. The correct initial state is therefore **Not yet observed**. The panel activates automatically as real human review traces accumulate.
