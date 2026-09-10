# Selective Movement Engine — Working Design

**Status:** Active working architecture
**Date:** 2026-09-10

## Center

Stage Presence OS should know the full Engagement lifecycle while asking people to touch only the moments where human contribution creates value, resolves uncertainty, protects delivery, protects economics, or strengthens a relationship.

The operating rule is:

> **Know the whole path. Activate only what reality earns. Automate continuity. Escalate consequential judgment. Learn from the result.**

This is an application of both the current Stage Presence business model and Flower methodology. It does not turn the 105-step Playbook into a mandatory checklist.

## Why this layer exists

The Playbook answers **what can happen**. The Job Map answers **what can apply to this Engagement**. Neither should automatically create work.

The Selective Movement Engine answers:

1. What changed in reality?
2. Which lifecycle decision is now relevant?
3. Why does it matter now?
4. What is the cost of waiting or getting it wrong?
5. Can the system resolve it deterministically?
6. If a person is needed, what is the smallest useful human action?
7. What evidence would close the loop?

The goal is less administrative work, not more workflow.

## Flower loop

The engine follows the project methodology directly:

**Context** — current Engagement state, source evidence, customer/venue relationship, schedule, fulfillment, economics and capacity.

**Direction** — determine the highest-leverage movement toward customer outcome, reliable delivery and sustainable contribution.

**Practice** — system resolves routine continuity or surfaces a concise action/decision to the appropriate contributor/client.

**Evidence** — capture the response, approval, payment, document, schedule, assignment, usage, cost, delivery result or exception.

**Reflection** — compare expected and actual state; preserve uncertainty and contradictions.

**Expansion** — update reusable venue, relationship, pricing, process, resource and contributor knowledge.

**Recenter** — recompute what matters next from the new reality.

## Value ordering

Candidate movement should be ranked by business consequence, not by database completeness. The durable priority order is:

1. **Protect people and delivery** — safety, impossible promises, imminent execution blockers, critical capacity, venue/site access, qualified capability.
2. **Protect economic truth and cash** — commitment, payment, working-capital exposure, unpriced scope change, collection, direct-cost visibility.
3. **Convert legitimate demand** — clarify decision-changing unknowns, produce/advance a coherent quote, obtain a decision.
4. **Reduce coordination friction** — assignments, schedule, job brief, pull/prep, client dependencies and handoff.
5. **Compound capability and relationships** — recurrence, venue memory, process learning, contributor capability, asset/solution learning.

A lower-ranked item can rise when time pressure or materiality makes it consequential.

## Movement candidate contract

Movement candidates are **derived signals**, not tasks and not proof a Playbook step is required.

Each candidate should expose:
- Engagement and Playbook step;
- reason code and human-readable `why_now`;
- movement class (`ACTION`, `DECISION`, `CHECK`, `AUTOMATION`, `LEARNING`);
- focus domain (`DELIVERY`, `ECONOMICS`, `DEMAND`, `COORDINATION`, `RELATIONSHIP`, `KNOWLEDGE`);
- materiality (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`);
- urgency (`NOW`, `SOON`, `WATCH`, `LATER`);
- evidence/certainty basis;
- recommended handling (`SYSTEM`, `ASSISTED`, `HUMAN`);
- whether a durable work item is warranted;
- due-date hint only when defensible from known dates;
- whether an equivalent open work item already exists.

The first implementation remains deterministic and inspectable. It does not use an opaque generic rules engine and does not autonomously approve consequential commitments.

## Activation principles

### Stage before detail
The Engagement's commercial/commitment/operational state determines which part of the lifecycle deserves attention. The system should not request preproduction detail from an early inquiry unless that detail can change feasibility or price.

### Decision leverage before completeness
Ask for or verify information when it can change a decision. Do not audit every inventory item or every venue field merely because a field is empty.

### Time pressure changes priority
Known dates can raise otherwise routine movement. Date-only truth is sufficient for date-based urgency; exact times must remain unknown until supported.

### Existing work suppresses duplicates
A derived candidate may explain why something matters even when a work item already exists, but it must not create duplicate continuity tasks.

### Consequential actions stay human-governed
Price exceptions, unusual terms, scarce-capacity commitments, technical/safety ambiguity, relationship-sensitive communication, major procurement/working-capital decisions and material scope changes require human judgment unless an explicitly approved boundary is later encoded.

### Routine continuity can become assisted/system work
Examples include formatting known data, surfacing venue history, calculating represented totals, preparing a draft job brief, reminding against a known due date, or generating a draft from approved structured truth.

## Initial deterministic signal families

The first engine should derive only high-confidence families supported by the current business model and data:

- **Demand / commercial decision** — open proposal or negotiation that needs a next decision.
- **Quote creation** — legitimate open demand where enough represented scope exists to begin a draft; never invent price authority.
- **Commitment handoff** — signed/won work whose accepted scope must be translated into operations.
- **Payment verification** — only where an actual payment obligation/evidence state exists; signature alone does not invent a deposit requirement.
- **Delivery readiness** — committed upcoming work with unresolved schedule, fulfillment, assignment, client dependency, access or capacity signals.
- **Capacity pressure** — scarce overlapping requirement signal; pressure is not reservation.
- **Economic close** — completed/past work with represented balance/cost/scope-change obligations still unresolved.
- **Learning closeout** — delivered work lacking a closeout when fresh learning can improve future work.
- **Recurrence / relationship** — evidenced recurring program/customer/venue where a future movement can compound relationship value.

## Materialization boundary

The first engine is read-only/derived. A movement candidate becomes persisted work only when:

- the candidate represents a real continuing obligation or human action;
- there is no equivalent open work item;
- the system can state a useful success condition;
- persistence improves continuity beyond merely displaying the signal.

Automatic materialization should come later, after observing false-positive/false-negative behavior on real Stage Presence work.

## Economic integration

The engine must reason with separate economic states:

**proposal value → committed value → payment obligation → collected cash → direct cost → contribution**

It must never infer contribution from revenue alone or treat a source snapshot as current bank/accounting truth.

Historical commercial lines will eventually strengthen quote/pricing movement through:

**current requirement + approved pricing policy + historical observations + capacity/risk/relationship context → draft commercial decision**

History informs; it never silently becomes authority.

## Contributor and client experience

Internal contributors should eventually receive the smallest complete briefing needed to perform their responsibility: why, where, when, scope, dependencies, tools/resources, acceptance criteria and escalation path.

Clients should receive only movements they can meaningfully act on: decision, approval, content/input, access information, payment obligation, schedule confirmation or feedback. Internal cost, private evidence and technical chatter stay internal.

The people experiencing the production remain represented through `END_USER` / `EXPERIENCE` evidence so Stage Presence can optimize for delivered outcome rather than merely completed equipment movement.

## Learning / expansion

A movement is successful not merely when a task is closed, but when it leaves better reusable reality. Repeated observations can graduate through:

**engagement-specific evidence → repeated pattern → suggested knowledge → human review → reusable Playbook / venue / relationship / pricing / capability knowledge**

No single anecdote automatically becomes policy.

## Current boundary

This architecture deliberately does not yet:
- create every derived candidate as a task;
- autonomously send client messages;
- approve quotes or commercial exceptions;
- reserve equipment from fulfillment evidence;
- infer employee availability;
- claim complete direct-cost/accounting truth;
- use AI interpretation as hidden authority.

Those capabilities can flower outward only after their evidence and governance are earned.
