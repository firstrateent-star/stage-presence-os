# Selective Movement Engine — Working Design

**Status:** Initial deterministic read-only engine live in Supabase; frontend integration on `flower/selective-movement-engine`  
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

Time horizon is applied before score on the main operating-focus surface: **NOW → SOON → WATCH → LATER**. Materiality, economic value, and business consequence refine priority inside that horizon. This prevents an important medium-term signal from displacing an imminent delivery issue merely because its abstract score is higher.

## Movement candidate contract

Movement candidates are **derived signals**, not tasks and not proof a Playbook step is required.

Each candidate exposes:
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

The first implementation is deterministic and inspectable. It does not use an opaque generic rules engine and does not autonomously approve consequential commitments.

## Activation principles

### Stage before detail
The Engagement's commercial/commitment/operational state determines which part of the lifecycle deserves attention. The system should not request preproduction detail from an early inquiry unless that detail can change feasibility or price.

### Decision leverage before completeness
Ask for or verify information when it can change a decision. Do not audit every inventory item or every venue field merely because a field is empty.

### Inherited evidence debt is not automatically work
Imported Goodshuffle Engagements often have fulfillment/commercial evidence without native Stage Presence OS schedule or contributor records. A missing native record becomes a candidate only when timing, commitment, delivery risk, economics, or another current decision makes reconciliation valuable.

### Time pressure changes priority
Known dates can raise otherwise routine movement. Date-only truth is sufficient for date-based urgency; exact times must remain unknown until supported.

### Existing work suppresses duplicates
A derived candidate may explain why something matters even when a work item already exists, but it must not create duplicate continuity tasks. Current candidate rows expose `COVERED` versus `UNMATERIALIZED` continuity state by matching the same Engagement + Playbook step to open work.

### Consequential actions stay human-governed
Price exceptions, unusual terms, scarce-capacity commitments, technical/safety ambiguity, relationship-sensitive communication, major procurement/working-capital decisions and material scope changes require human judgment unless an explicitly approved boundary is later encoded.

### Routine continuity can become assisted/system work
Examples include formatting known data, surfacing venue history, calculating represented totals, preparing a draft job brief, reminding against a known due date, or generating a draft from approved structured truth.

## Initial deterministic signal families — live

`engagement_movement_candidates_v` currently derives these high-confidence families from represented reality:

- **OPEN_PROPOSAL_DECISION** → `FOLLOW_UP_DECISION`: proposed/negotiating demand still needing a customer decision.
- **OPEN_DEMAND_NEEDS_SCOPE** → `TRANSLATE_REQUIREMENTS`: open demand with no commercial document, where requirements/solution need shaping before pricing.
- **COMMITTED_SCOPE_NOT_HANDED_OFF** → `HANDOFF_ACCEPTED_SCOPE`: committed work with no represented fulfillment handoff.
- **IMMINENT_JOB_SCHEDULE_NOT_REPRESENTED** → `BUILD_EXECUTION_SCHEDULE`: committed work within seven days without a native execution schedule; explicitly a reconciliation need, not proof no timing exists in source material.
- **IMMINENT_JOB_CREW_NOT_REPRESENTED** → `ASSIGN_JOB_ROLES`: committed field work within seven days without represented contributor assignments; no person is inferred.
- **IMMINENT_SITE_ACCESS_RECONCILIATION** → `CONFIRM_VENUE_ACCESS`: near-term committed work with a known site but no native schedule context carrying access detail.
- **BALANCE_SNAPSHOT_NEEDS_VERIFICATION** → `VERIFY_PAYMENT_STATE`: a near-term/recent committed Engagement whose represented commercial snapshot shows a balance; the snapshot is not promoted to current bank/accounting truth.
- **FINAL_EXECUTION_READINESS** → `FINAL_READINESS_REVIEW`: committed work within two days; final exception scan rather than a claim that every Playbook step is tracked.
- **RECENT_DELIVERY_NEEDS_CLOSEOUT** → `CAPTURE_DELIVERY_OUTCOME`: recently delivered committed work without closeout, while learning is still fresh.
- **RESOURCE_WINDOW_PRESSURE** → `CHECK_CAPACITY_PRESSURE`: overlapping represented resource requirement windows; pressure remains distinct from hold/reservation/availability truth.

`engagement_operating_focus_v` exposes only uncovered non-LATER candidates and ranks them for the operating surface.

## Current reality stress test

The first live run proved several useful Flower behaviors:

- existing real work suppresses equivalent model suggestions instead of duplicating them;
- current Goodshuffle fulfillment can satisfy handoff context without being mistaken for reservation/usage;
- Music Farm and the Sep 12 UNC opener rise because their represented dates make schedule, crew, access, payment/readiness questions consequential now;
- a recently delivered Red Palm Engagement surfaces payment-verification and learning-closeout opportunities without claiming the commercial snapshot is current accounting truth;
- a Sep 4 equipment-sale proposal still commercially open surfaces as stale decision truth needing resolution rather than silently disappearing;
- November resource overlap remains visible as WATCH capacity pressure instead of outranking September execution needs;
- existing Cummins/IES/20th Anniversary follow-up work is recognized as covered rather than re-created.

This is exactly the desired transition from **database completeness** to **business consequence**.

## Materialization boundary

The first engine is read-only/derived. A movement candidate becomes persisted work only when:

- the candidate represents a real continuing obligation or human action;
- there is no equivalent open work item;
- the system can state a useful success condition;
- persistence improves continuity beyond merely displaying the signal.

Automatic materialization comes later, after observing false-positive/false-negative behavior on real Stage Presence work.

The frontend therefore distinguishes:

**Needs You = persisted business work**  
**System Sees = derived movement recommendation**

No recommendation becomes an assignment, reservation, client message, or task simply because the model can derive it.

## Economic integration

The engine reasons with separate economic states:

**proposal value → committed value → payment obligation → collected cash → direct cost → contribution**

It must never infer contribution from revenue alone or treat a source snapshot as current bank/accounting truth.

Historical commercial lines will strengthen quote/pricing movement through:

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
