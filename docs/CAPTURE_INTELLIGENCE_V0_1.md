# Capture Intelligence v0.1

## Center

**Tell Stage Presence what happened once. Intelligence interprets; governed commands decide what may become business truth.**

Capture Intelligence is the first Stage Presence runtime feature explicitly organized under the Vlourish separation of Reality, Intelligence, Authority, Evidence and Learning.

## Runtime contract

```text
SOURCE TEXT
  -> interpreter
  -> typed proposals
  -> authority classification
  -> human review
  -> deterministic canonical command
  -> Stage Presence reality
  -> event / source provenance
```

The interpreter never owns canonical truth.

## v0.1 scope

The first interpreter is intentionally deterministic and replaceable. It recognizes a narrow set of high-value operating signals in text updates attached to an existing Engagement:

- explicit crew confirmation;
- load-in / setup / show / strike / load-out timing;
- represented Resource commitment language;
- reported collection/payment language.

It uses the existing Team Member roster and Engagement Resource links as context. It does not create new people, Resources, Engagements or accounting records.

## Authority

| Proposal | Canonical home | Authority |
| --- | --- | --- |
| confirmed crew | `engagement_assignments` | consequential |
| schedule timing | `engagement_schedule_items` | reversible, still reviewed |
| confirmed Resource reservation | `resource_commitments` | consequential |
| reported payment | Economy / collection verification | suggest only |

Every proposal requires explicit human review in v0.1.

Reported payment language is preserved as source evidence but is not written as `commercial_payments` by the interpreter. QuickBooks / processor evidence still governs verification.

## Provenance

When approved proposals are applied, Capture preserves the original text as a `source_artifact` first. The resulting Schedule, Assignment or Resource Commitment receives that artifact id as provenance.

The structured record therefore never replaces its source.

## Unknown handling

Unknown is a valid output. Examples:

- reported payment amount absent;
- accounting verification absent;
- time detected without a represented Engagement date;
- no governed operating command confidently recognized.

The interpreter must not fill those gaps merely to complete a command.

## Golden evals

`scripts/captureIntelligence.test.mjs` runs as part of Build Check. Initial cases require:

1. `Scott and Ben confirmed ... Load-in 9am ... Taking the 17x10 trailer ... Balance ... $2,500` produces separate crew, schedule, resource and reported-payment proposals.
2. `Sales Lead: Greg Walker` does not infer Greg as field crew.
3. A 17x10 trailer mentioned only for pricing does not become a reservation proposal.
4. `Balance paid yesterday` remains a reported payment with amount and verification explicitly unknown.
5. `Load-in 10am` without an Engagement date does not invent a date.

These evals measure interpreter behavior, not business outcome. Outcome evidence remains a separate Vlourish evidence layer.

## Replaceability

A future model-backed interpreter may replace `DETERMINISTIC_V0_1` without changing the canonical command boundary. It must emit the same or a versioned proposal contract, retain evidence/confidence/unknowns, pass the eval suite, and remain subject to the same authority rules.

## Not yet included

- automatic Engagement matching;
- image understanding;
- email ingestion;
- voice transcription;
- automatic payment transaction creation;
- automatic scope/change-order decisions;
- autonomous crew or capacity commitment;
- model-generated canonical facts without review.

Those are later expansions only after the text runtime proves the contract.
