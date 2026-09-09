# Decision Resolver — Advisory v0.1

**Flower center:** Decision-Grade Flow  
**Status:** Advisory logic implemented in `src/lib/decisionResolver.ts`; not yet allowed to commit, reserve, message customers, or mutate Engagement state automatically.

## Purpose

The Decision Resolver converts current Engagement evidence into a concise answer to four questions:

1. **What decision is next?**
2. **Why does it matter now?**
3. **Which weak/missing truths can materially change that decision?**
4. **Who is the least-expensive capable owner for resolving each exception?**

It is not a persisted workflow status and must not become a form-completeness engine.

## Current decision classes

- `QUALIFY_CLARIFY`
- `QUOTE_READY`
- `COMMIT_READY`
- `RESERVE_READY`
- `EXECUTE_READY`
- `LEARN_RESOLVE`
- `RELATIONSHIP_FOLLOWUP` (reserved for future relationship-trigger logic)

The resolver chooses the most consequential current decision rather than mechanically advancing through all classes.

Example: a signed job tomorrow should surface as `EXECUTE_READY` even when reservation evidence is incomplete. Those missing reserve truths remain visible as decision gaps beneath the urgent execution decision.

## Decision-gap structure

Each gap has:
- code
- human-readable label
- logical owner
- severity: `BLOCKING / MATERIAL / WATCH`

Owners are advisory roles:
- `SYSTEM`
- `NANCY`
- `SEAN`
- `OPERATIONS`
- `GREG`

These are routing concepts, not application permissions or user-account assignments.

## Current routing philosophy

### Sean / commercial
Examples:
- customer unidentified
- date missing when commercially material
- solution not configured sufficiently
- quote value not represented
- conflicting scope/source truth
- ordinary qualification / commercial movement

### Nancy / commercial administration
Examples:
- contract value evidence
- deposit/payment evidence
- later invoice/collection continuity

### Operations / technical
Examples:
- requirement-window evidence too weak
- Engagement-specific sourcing unknown
- ordinary capacity WATCH review
- technical/operational readiness gaps

### Greg
Do not route merely because something is incomplete.

Initial resolver escalates Greg only where current evidence supports a genuinely founder-level blocking exception, such as a future HIGH capacity conflict or other explicitly governed founder exception.

## Live-data stress test — 2026-09-09

Applying the resolver's current decision hierarchy conceptually to the 30 imported Engagements yields:

- `COMMIT_READY`: **13**
- `RESERVE_READY`: **11**
- `EXECUTE_READY`: **2**
- `LEARN_RESOLVE`: **4**

No current imported record needs to be automatically classified as Greg-required merely because evidence is incomplete.

### Execute Ready examples

#### SP-000026 — Music Farm — 2026-09-10
Known:
- customer
- date
- 3 configured resources
- contract total represented

Current material evidence gaps:
- 3/3 resource requirement windows are not KNOWN/VERIFIED
- 3/3 configured resources have Engagement-specific sourcing `UNKNOWN`
- no deposit-received evidence in Stage Presence OS

Primary resolution domain: **OPERATIONS**, with payment evidence owned commercially/admin according to policy.

#### SP-000006 — UNC Home Opener — 2026-09-12
Known:
- customer
- date
- 5 configured resources

Current material evidence gaps:
- 5/5 resource requirement windows weak
- 5/5 sourcing decisions unknown
- per-game contract value not represented as an independent typed financial fact
- no deposit-received evidence
- one unresolved fact remains

The program relationship means economic evidence must not be invented merely to make the component look complete.

### Commit Ready examples

Current proposals such as Cummins Family Fun Day, IES Panels and 20th Anniversary Party already have meaningful date/configuration evidence, but current OS evidence does not contain typed `QUOTE_TOTAL` facts. The correct first commercial question is therefore not "fill every operational field"; it is to recover/represent the legitimate quote/commercial value and surface only material feasibility exceptions.

## Guardrails

1. **Advisory first.** Resolver output does not mutate business state.
2. **Relevance over completeness.** Missing data is surfaced only when material to the current decision.
3. **No historical blame.** Missing imported evidence does not mean Stage Presence failed to perform the work historically.
4. **No reservation inference.** Signed != reserved.
5. **No payment inference.** Absence of a deposit fact means payment truth is unavailable to the OS, not necessarily that payment never occurred.
6. **No automatic Greg escalation.** Founder attention is a scarce resource.
7. **Time can change the decision.** As an event approaches, Execute Ready can outrank Reserve Ready.
8. **Learning should reduce future gaps.** Repeated jobs should progressively create stronger defaults and fewer exceptions.

## Evidence gates before stronger automation

Before the resolver can automatically advance state, send communications, create holds/reservations, or assign operational work, prove that:

- derived next decisions match real human judgment on routine Engagements;
- decision-critical gaps are materially relevant rather than bureaucratic;
- logical owners are generally correct;
- Greg is not over-routed;
- the resolver correctly handles installations, sales, long-term rentals and service—not only events;
- payment/deposit policy is explicit;
- economic guardrails are governed;
- capacity/hold/reservation authority is governed.

## Desired evolution

Current:

**Evidence -> advisory next decision -> gaps -> owner**

Later:

**Evidence -> deterministic routine resolution -> AI-supported interpretation -> human exception -> approved propagation**

Long-term success means the resolver increasingly says not only what is missing, but also when enough evidence exists for routine work to move without another human review.
