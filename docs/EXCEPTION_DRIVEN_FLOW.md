# Exception-Driven Flow

**Flower center:** Exception-Driven Flow  
**Status:** Advisory architecture. Exception Engine v0.1 exists in `src/lib/exceptionEngine.ts`; it does not mutate business state.

## Center

> Stage Presence OS should absorb routine business reality, resolve or compress what can be safely resolved, and present humans only with the smallest set of consequential exceptions necessary to keep commitments trustworthy and value flowing.

Decision-Grade Flow remains the decision model underneath this center. Resolution Compression and Attention Compression are the mechanisms that make it scalable.

## Atomic loop

Reality
→ derive next decision
→ identify decision-critical gaps
→ reuse existing evidence
→ inherit broader valid truth
→ recover authoritative source truth
→ group repeated gaps
→ evaluate urgency
→ route remaining exception
→ human judgment only where necessary
→ propagate approved truth
→ execute
→ learn
→ strengthen future defaults
→ fewer future exceptions

## Exception dispositions

### SYSTEM_RESOLVABLE
Existing or inherited evidence should be able to resolve the issue without another human question.

Examples:
- a resource inherits a known Engagement-level requirement window;
- a material unknown is already answered by stronger current evidence;
- a deterministic company policy applies without exception.

### SOURCE_RECOVERABLE
The truth likely exists in an authoritative source and should be recovered before asking someone to re-enter it.

Examples:
- proposal value from Goodshuffle/commercial document;
- deposit/payment state from Goodshuffle or accounting evidence;
- legacy customer identity from imported source material.

### GROUP_RESOLVABLE
One human confirmation at a broader valid scope may resolve many downstream gaps.

Examples:
- confirm the Engagement-level possession window once instead of for every resource;
- confirm default sourcing for the whole job, with resource-specific overrides only where needed;
- eventually validate an archetype or venue default that applies across repeated Engagements.

### DELEGATED
A real human judgment remains, but it belongs with a normal domain owner rather than Greg.

Examples:
- ordinary technical feasibility;
- commercial clarification;
- payment-policy administration;
- routine capacity substitution.

### FOUNDER_EXCEPTION
The remaining issue genuinely deserves Greg because it involves scarce strategic authority.

Examples:
- signed-vs-signed scarce-capacity tradeoff;
- strategic relationship decision;
- major pricing exception;
- material capital/liability exposure;
- unusual high-risk technical commitment.

Founder attention must never be the default consequence of incomplete data.

## Human-facing attention bands

### NOW
A consequential human action is required now or within the immediate operating horizon.

### DELEGATED
A domain owner can resolve the exception; it should not occupy everyone else's attention.

### WATCHING
The OS should continue monitoring; no immediate human action is justified yet.

### HANDLED
The issue is already absorbed by existing evidence, inheritance, or deterministic resolution. It should normally appear only as reassurance/metrics, not as a task.

## Resolution Compression

> Resolve truth once at the broadest valid scope; inherit it downward; override only genuine exceptions.

Truth hierarchy should trend toward:

Company policy
→ relationship/program/venue/archetype knowledge
→ Engagement defaults
→ resource/crew/execution component
→ specific override.

Specific stronger evidence always beats inherited defaults.

Current concrete proof:
- 27 imported Engagements carry event-derived resource-window defaults once at Engagement scope;
- 130 configured resource links inherit those defaults;
- one rollback-only Music Farm confirmation strengthened three effective resource windows and three sourcing decisions from one Engagement-level update;
- capacity-pressure truth remained 3 WATCH / 0 HIGH after compression.

## Attention Compression

The OS should not equate record count with human workload.

Example:

Bad:
- 13 weak resource windows = 13 tasks;
- 13 unknown sourcing values = 13 more tasks.

Better:
- identify repeated pattern;
- ask Operations for one Engagement-level default where valid;
- reuse archetype/venue knowledge when earned;
- expose only deviations.

The desired homepage eventually becomes closer to:

- NOW — what actually needs a decision;
- DELEGATED — what others own;
- WATCHING — what the system is monitoring;
- HANDLED — what was absorbed without new human work.

The existing detailed Decision Flow remains available during validation and should not be deleted merely to make the UI look simpler.

## Learning rule

A repeated exception is evidence of missing organizational structure.

When the same exception recurs, ask whether the correct response is:
- a company policy;
- a broader default;
- a solution archetype;
- venue memory;
- source integration;
- training;
- deterministic automation.

A note is not organizational learning unless it can improve a future decision or reduce future reconstruction.

## Guardrails

1. Do not hide unresolved risk merely to make Today look calm.
2. Compression must remain auditable: resolved, inherited, deferred, watching, and escalated are different states.
3. Inherited truth carries provenance/certainty and must not silently overpower stronger local evidence.
4. Archetypes are hypotheses/defaults, never replacements for customer intent.
5. Least-expensive capable owner means least-scarce appropriate authority, not simply lowest compensation.
6. Greg should remain active where his relationship/technical/strategic judgment creates leverage.
7. No automatic commitments, holds, reservations, messages, or payment conclusions are authorized by the Exception Engine v0.1.

## Metrics to learn later

- exception density — consequential human exceptions per Engagement;
- founder exception rate — Greg-required exceptions per Engagement;
- resolution leverage — downstream truths resolved per human decision;
- reconstruction burden — human effort required to recreate context already known somewhere;
- human touches per routine Engagement;
- source recovery rate;
- inherited/default truth utilization;
- repeated-exception recurrence.

Metrics are diagnostic, not goals to game. Fewer human touches are good only when commitments remain trustworthy.

## Build/deployment discipline learned 2026-09-09

Several Cloudflare builds failed because dependent frontend changes were committed directly to `main` in intermediate states. The final `1237490…` build was clean and production-proven.

Going forward:
- substantial Flowers are developed on a dedicated branch;
- a build check runs before promotion to `main`;
- `main` represents coherent deployment boundaries rather than every intermediate edit;
- Cloudflare remains the production deployment from `main`;
- a failed intermediate deployment is treated as engineering evidence, not hidden history.
