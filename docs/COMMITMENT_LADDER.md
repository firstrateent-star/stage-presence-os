# Stage Presence — Commitment Ladder

**Status:** Working operating design, evidence-backed but not yet enforced as a blocking workflow  
**Date:** 2026-09-09  
**Purpose:** Define the distinct decisions that occur between customer demand and reliable execution so Stage Presence can move quickly without collapsing quote, commitment, reservation and readiness into one status.

---

## 1. Core principle

Stage Presence should not ask one vague question such as “Is this job confirmed?”

There are at least four materially different decisions:

1. **Quote Ready** — Do we know enough to responsibly put commercial terms in front of the customer?
2. **Commit Ready** — Do we know enough to responsibly accept/sign a commercial commitment?
3. **Reserve Ready** — Is there sufficient commercial and capacity evidence to protect specific capacity for this Engagement?
4. **Execute Ready** — Is the committed solution operationally prepared to be delivered reliably?

These are derived readiness judgments, not a replacement for commercial / commitment / operational / attention state.

An Engagement may be Quote Ready while not Reserve Ready. A signed Engagement may still be missing deposit or capacity evidence. A reserved Engagement may still not be Execute Ready.

---

## 2. Quote Ready

### Business question
Can Stage Presence responsibly price and describe a solution without hiding material uncertainty?

### Typical evidence
- identifiable customer / decision relationship, unless intentionally anonymous/preliminary;
- date or timing need for time-bound work, or explicit TBD;
- customer intent / desired outcome captured at a useful level;
- candidate solution or clearly rate-based/simple scope;
- material assumptions are visible rather than silently treated as facts;
- no unresolved conflict that would make the quote materially misleading;
- enough pricing evidence to state a price or clearly labeled estimate/range.

### What may remain unknown
A quote can contain explicit assumptions. Quote Ready does not mean the technical design is fully locked or capacity is reserved.

### Failure mode to avoid
Delaying legitimate demand until every production detail is known.

---

## 3. Commit Ready

### Business question
Can Stage Presence responsibly accept the customer’s yes without creating hidden delivery or economic risk?

### Typical evidence
- commercial scope/version is identifiable;
- quote/contract value is known or approved;
- major scope assumptions have been resolved or consciously accepted;
- material capacity pressure has been reviewed;
- critical resources have at least an estimated requirement window;
- likely sourcing is plausible for scarce resources;
- major technical, venue, logistics or regulatory blockers are resolved or explicitly accepted;
- pricing exceptions / unusual risk have the right authority.

### Failure mode to avoid
Making selling faster while making commitments less reliable.

---

## 4. Reserve Ready

### Business question
Is Stage Presence allowed to claim that specific capacity is protected for this Engagement?

### Required truth direction
Reserve Ready is stricter than Commit Ready.

The future reservation model should require evidence appropriate to the commercial terms, ordinarily including:
- signed/accepted commercial agreement;
- deposit/payment evidence when the deal requires it, or an explicit authorized waiver/exception;
- sufficiently known resource requirement window;
- planned sourcing known for the capacity being protected;
- adequate quantity/asset identity evidence to know what is actually being reserved;
- no unresolved capacity conflict unless a substitution/sourcing decision has been made.

### Constitutional rule
**No signature/deposit/capacity evidence = do not assert reservation.**

Deposit requirements can vary by customer/program, so the correct future model should support approved exceptions rather than hard-coding one universal payment rule.

### Failure mode to avoid
Treating `SIGNED`, Goodshuffle “booked,” or a configured line item as proof of physical reservation.

---

## 5. Execute Ready

### Business question
Can Stage Presence deliver the promised outcome reliably now?

### Typical evidence
- commercial commitment understood;
- reserved/sourced critical capacity or approved execution exception;
- real possession / setup / strike / return timing sufficiently known;
- technical configuration understood;
- venue/access/power/content/network/logistics dependencies resolved to the required level;
- crew / operator / PM ownership established where needed;
- customer deliverables/content inputs accounted for;
- material change orders / scope changes reflected commercially;
- operational next actions complete or actively owned.

### Failure mode to avoid
Assuming “signed” means operations are ready.

---

## 6. Readiness should be evidence-driven, not form-driven

Do not make a person fill every possible field to satisfy the database.

Instead, surface the missing truth that can change the decision currently being made.

Examples:
- If a simple repeat trailer job has known customer, venue, date, configuration and no capacity pressure, it may be Quote Ready with very little Greg involvement.
- If a proposal overlaps a signed 17×10 requirement, the capacity exception matters before another commitment.
- If a signed event has no deposit evidence because the customer has approved net terms, the system should preserve that exception rather than pretending a deposit exists.
- If an installation requires major procurement, working-capital and vendor risk may matter more than an event-style trailer window.

Readiness rules should evolve by Engagement type and solution archetype as evidence grows.

---

## 7. Exception-driven operating lanes

This is a working design proposal, not yet an automated policy.

### Fast Lane
Use for routine/repeat work where the system has strong evidence and no material exception.

Typical characteristics:
- known relationship;
- familiar solution archetype;
- known date/venue pattern;
- no material capacity pressure;
- pricing within approved guardrails;
- normal logistics/risk;
- no significant capital exposure.

Goal: routine work moves quickly without requiring Greg to reconstruct or approve every detail.

### Review Lane
Use when the job is valid but one or more material exceptions deserve human judgment.

Examples:
- uncertain sourcing;
- unfamiliar venue;
- capacity WATCH signal;
- meaningful subcontracting;
- unusual scope;
- pricing/margin exception;
- important relationship sensitivity.

Likely owners can include Sean, operations, Nancy or Greg depending on the exception type.

### Founder / High-Risk Lane
Reserve Greg’s attention for decisions where founder judgment materially changes outcome or risk.

Examples:
- major capacity conflict;
- complex technical design;
- large capital / procurement exposure;
- strategically important negotiation;
- unusual liability/risk;
- high-value relationship exception;
- non-standard commercial terms;
- significant installation/integration commitment.

Goal: Greg becomes strategic exception capacity, not the company’s continuity database.

---

## 8. Authority should follow exception type

Future automation should route the reason, not merely the record.

Examples:
- signature/deposit/admin continuity → Nancy/commercial administration;
- capacity/logistics/warehouse readiness → operations;
- routine commercial follow-up → system/Sean/commercial;
- technical exception → qualified technical authority;
- pricing/relationship/strategic exception → Greg or approved commercial authority.

The system should eventually say **why** Greg is needed, not merely mark an Engagement “Needs Greg.”

---

## 9. Current Goodshuffle evidence

The 2026-09-09 import currently shows:
- 14 PROPOSED / UNCOMMITTED Engagements;
- 13 of those 14 have a customer;
- all 14 have dates;
- 11 have a configured solution;
- none currently has a typed `QUOTE_TOTAL` in Stage Presence OS;
- 2 participate in current capacity-pressure WATCH signals.

It also shows:
- 15 WON / SIGNED Engagements;
- all 15 have customer/date/configured solution;
- 9 have known `CONTRACT_TOTAL` evidence;
- 0 have `DEPOSIT_RECEIVED` evidence in the current OS;
- 0 configured resource windows are yet KNOWN/VERIFIED (current imported windows are inferred from event dates);
- 0 Engagement-specific configured sourcing decisions are currently known.

This does **not** mean the historical jobs were handled incorrectly. It means the legacy export did not provide enough evidence for the new OS to assert reservation/readiness truth.

---

## 10. Current implementation stance

Do not create a single persisted `readiness_status` column.

Readiness should be derived from current evidence and remain explainable:
- what decision is being evaluated;
- which evidence supports proceeding;
- which assumptions remain;
- which exceptions require attention;
- who has authority to resolve them.

Do not turn incomplete legacy imports into a wall of red warnings. Apply the Commitment Ladder primarily to new/updated Engagements as Stage Presence begins capturing the evidence natively.

---

## 11. Strategic purpose

The Commitment Ladder exists to achieve both:

**commercial speed**

and

**delivery integrity**.

The target operating behavior is:

> Routine work moves quickly because the system already knows enough. Human attention is reserved for the exceptions where judgment changes risk, value or customer outcome.
