# Decision Resolver — Advisory v0.2

**Flower center:** Decision-Grade Flow  
**Status:** Advisory logic implemented in `src/lib/decisionResolver.ts`; not allowed to commit, reserve, message customers, or mutate Engagement state automatically.

## Purpose

The Decision Resolver converts current Engagement evidence into a concise answer to five questions:

1. **What decision is next?**
2. **Why does it matter now?**
3. **Which weak/missing truths can materially change that decision?**
4. **Who is the least-expensive capable owner for resolving each exception?**
5. **How should the system try to resolve the gap with the least re-entry?**

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

## Decision evidence state

Resolver output carries a derived evidence state:

- `CLEAR` — no currently detected material exception for the decision;
- `REVIEW` — weak/missing evidence deserves review but is not currently treated as a hard blocker;
- `BLOCKED` — the OS lacks or conflicts on truth required for responsible system-driven movement.

This is a statement about **the OS's decision evidence**, not a claim that Stage Presence historically failed to perform or could not perform the work.

## Decision-gap structure

Each gap has:
- code;
- human-readable label;
- logical owner;
- severity: `BLOCKING / MATERIAL / WATCH`;
- resolution strategy;
- resolution hint.

Owners are advisory roles:
- `SYSTEM`
- `NANCY`
- `SEAN`
- `OPERATIONS`
- `GREG`

These are routing concepts, not application permissions or user-account assignments.

## Resolution without re-entry

The resolver now distinguishes **how** a gap should be resolved.

### `REUSE_EVIDENCE`
Before asking anyone anything, determine whether existing Stage Presence OS facts/history already answer the question strongly enough for the current decision.

### `SOURCE_RECOVERY`
Recover truth from the originating evidence/system/document before asking a person to retype it.

Examples:
- Goodshuffle proposal/contract value;
- Goodshuffle project/customer/venue evidence;
- QuickBooks/payment evidence when integrated or otherwise available;
- source documents already attached to the Engagement.

### `OWNER_CONFIRMATION`
Ask the least-expensive capable human **one precise question** when the truth is genuinely not recoverable.

Examples:
- Operations confirms owned/subcontracted/partner sourcing;
- Operations confirms possession/load-in/return timing;
- Sean clarifies a new customer's actual request.

### `POLICY_DECISION`
The missing truth is not a data problem yet; Stage Presence has not represented the governing policy.

Example:
- whether deposit/payment evidence is required before execution in a particular class of Engagement.

Do not collect a field repeatedly when the real missing object is a policy/exception rule.

### `HUMAN_JUDGMENT`
A material conflict/tradeoff remains after evidence recovery and ordinary role resolution.

Examples:
- conflicting source truth;
- real scarce-capacity tradeoff;
- unusual technical/commercial risk.

Greg is not the default for this strategy. Escalate only when founder-level authority is actually needed.

## Source-aware interpretation

Legacy imports and new captures are not judged identically.

A future Quick Lead should preserve literal customer intent because we control the capture contract.

A legacy Goodshuffle proposal may have:
- customer;
- date;
- evidenced proposed configuration;
- project status;

while lacking a textual `customer_request` because the source system did not preserve it in the form Stage Presence OS wants.

The Resolver should **not** automatically block a legacy Commit decision merely because that desired future field is blank. When configuration evidence already exists, literal-intent recovery becomes a `WATCH / SOURCE_RECOVERY` item unless the missing intent can materially change the decision.

This prevents the OS from forcing people to reconstruct history just to satisfy its newer ontology.

## Current routing philosophy

### Sean / commercial
Examples:
- customer unidentified;
- timing/need clarification when commercially material;
- solution not configured sufficiently;
- conflicting scope/source truth;
- ordinary qualification / commercial movement.

### Nancy / commercial administration
Examples:
- authoritative proposal/contract value recovery;
- deposit/payment evidence;
- later invoice/collection continuity.

### Operations / technical
Examples:
- requirement-window evidence too weak;
- Engagement-specific sourcing unknown;
- ordinary capacity WATCH review;
- technical/operational readiness gaps.

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
- customer;
- date;
- venue;
- 3 configured resources;
- contract total represented.

Current high-leverage evidence gaps:
- 3/3 resource requirement windows are not KNOWN/VERIFIED;
- 3/3 configured resources have Engagement-specific sourcing `UNKNOWN`.

Primary resolution domain: **OPERATIONS**.

Deposit/payment is a policy-dependent commercial review, not automatically an execution blocker until Stage Presence explicitly governs that policy.

#### SP-000006 — UNC Home Opener — 2026-09-12
Known:
- customer;
- date;
- configured program solution.

Current high-leverage evidence gaps:
- 5/5 resource requirement windows weak;
- 5/5 sourcing decisions unknown.

The program relationship means economic evidence must not be invented merely to make the component look complete.

### Commit Ready examples

Current proposals such as Cummins Family Fun Day, IES Panels and 20th Anniversary Party already have meaningful date/configuration evidence, but current OS evidence does not contain typed proposal/quote value facts.

For these imported proposals the resolver should prefer:

**SOURCE RECOVERY — Nancy/commercial admin**  
Recover authoritative proposal value from Goodshuffle/originating commercial evidence before asking anyone to re-enter it.

Most of these legacy proposals also lack textual customer-intent fields. Where proposed configuration already exists, that is not automatically a hard blocker; recover the original intent only when it can change the commitment decision.

## Decision-specific discipline

### Quote Ready
A quote total is **not** a prerequisite. The quote is the output.

### Commit Ready
Commercial/proposal value is decision-critical because the OS must know what the customer would be accepting.

### Reserve Ready
Capacity timing/sourcing and commercial commitment/payment policy become important. Missing deposit evidence is review-worthy until Stage Presence governs the policy; it does not prove nonpayment.

### Execute Ready
Operational timing, sourcing, final usable configuration, venue/access and real operational conflicts dominate. Contract amount should not clutter execution simply because it exists as a financial fact.

## Guardrails

1. **Advisory first.** Resolver output does not mutate business state.
2. **Relevance over completeness.** Missing data is surfaced only when material to the current decision.
3. **Resolution before re-entry.** Recover/reuse evidence before asking humans to type anything.
4. **No historical blame.** Missing imported evidence does not mean Stage Presence failed to perform the work historically.
5. **No reservation inference.** Signed != reserved.
6. **No payment inference.** Absence of a deposit fact means payment truth is unavailable to the OS, not necessarily that payment never occurred.
7. **No automatic Greg escalation.** Founder attention is a scarce resource.
8. **Time can change the decision.** As an event approaches, Execute Ready can outrank Reserve Ready.
9. **Learning should reduce future gaps.** Repeated jobs should progressively create stronger defaults and fewer exceptions.
10. **New capture can be held to a stronger contract than legacy history.** Do not force old evidence to look like new evidence.

## Evidence gates before stronger automation

Before the resolver can automatically advance state, send communications, create holds/reservations, or assign operational work, prove that:

- derived next decisions match real human judgment on routine Engagements;
- decision-critical gaps are materially relevant rather than bureaucratic;
- logical owners are generally correct;
- resolution strategy reduces re-entry;
- Greg is not over-routed;
- the resolver correctly handles installations, sales, long-term rentals and service—not only events;
- payment/deposit policy is explicit;
- economic guardrails are governed;
- capacity/hold/reservation authority is governed.

## Desired evolution

Current:

**Evidence -> advisory next decision -> material gaps -> resolution strategy -> owner**

Next:

**Evidence -> source recovery / precise owner confirmation -> resolved decision truth -> approved propagation**

Later:

**Evidence -> deterministic routine resolution -> AI-supported interpretation -> human exception -> approved propagation**

Long-term success means the resolver increasingly says not only what is missing, but also when enough evidence exists for routine work to move without another human review.
