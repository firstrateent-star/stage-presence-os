# Stage Presence — Capacity Truth

**Status:** Canonical operating specification  
**Date:** 2026-09-09  
**Purpose:** Define how Stage Presence OS represents capacity before, during and after commercial commitment without fabricating availability or reservations.

## Center

Stage Presence does not sell database rows. It commits scarce physical and human capability to customer outcomes across time.

Capacity Truth exists to answer:

> Can Stage Presence responsibly promise this solution for this time window, from a known source, without creating hidden delivery risk?

The system must preserve the difference between relevance, requirement, pressure, hold and reservation.

## Five distinct truths

### 1. CONFIGURED
A resource/capability appears in the current solution configuration for an Engagement.

This means only:
- it is part of the known/imported/proposed configuration;
- it may matter to solution design.

It does **not** mean:
- owned;
- available;
- held;
- reserved;
- ultimately required;
- customer-requested;
- commercially committed.

### 2. REQUIREMENT WINDOW
For this Engagement, the resource/capability is believed to be needed during a time window.

Current fields on `engagement_resources`:
- `required_from_date`
- `required_through_date`
- `requirement_window_state`
- `planned_sourcing_model`

Window states:
- `UNKNOWN`
- `INFERRED_FROM_EVENT`
- `ESTIMATED`
- `KNOWN`
- `VERIFIED`

`INFERRED_FROM_EVENT` is deliberately weak. It means the event dates are being used only as a provisional pressure window until real possession/load-in/return timing is known.

The requirement window is still **not a hold or reservation**.

### 3. CAPACITY PRESSURE
Two active Engagements overlap on the same configured physical resource requirement window.

Current signal levels:
- `INFO`: overlapping open demand, no committed Engagement
- `WATCH`: at least one Engagement is commercially committed
- `HIGH`: both Engagements are commercially committed

Pressure is an early-warning signal.

Pressure is **not proof of conflict** because the system may still lack:
- verified owned quantity;
- actual possession window;
- planned sourcing source;
- subcontract/partner capacity;
- release/return timing;
- actual reservation evidence.

The derived view `capacity_pressure_signals` is explicitly informational and uses RLS-safe `security_invoker` behavior.

### 4. HOLD — future activation
A hold is an intentional temporary claim on capacity while commercial commitment is unresolved.

A future hold model should include at minimum:
- Engagement
- resource/capability
- quantity
- exact or date-only window
- source expected
- hold rank / precedence where legitimate
- created by / created at
- expiration / review time
- evidence/provenance
- released/cancelled state

A hold must never be represented as a reservation.

Stage Presence may legitimately support first/second/third holds where scarce resources and real customer demand require it. Fake scarcity is prohibited.

### 5. RESERVATION — future activation
A reservation is a committed allocation of deliverable capacity.

Constitutional rule:

> **No signature / no deposit = inventory not truly reserved.**

The exact future automation may vary by engagement type, but Stage Presence OS must not silently equate:
- Quote Sent
- Verbal Yes
- Signed
- Goodshuffle booked status
- resource configured

with a final reservation.

Reservation truth should eventually require evidence of the applicable commercial commitment and a known/sourced capacity allocation.

## Sourcing is Engagement-specific

The resource library may say Stage Presence owns a 17×10 trailer. That does not prove a specific Engagement will use the owned unit.

Therefore each configured resource may carry an Engagement-specific `planned_sourcing_model`:
- `OWNED`
- `SUBCONTRACTED`
- `PARTNER`
- `VENUE`
- `UNKNOWN`

Current Goodshuffle imports remain `UNKNOWN` at the Engagement-specific level until evidence supports the actual source.

## Current imported evidence

The 2026-09-09 Goodshuffle translation produced 130 `CONFIGURED` resource links across 30 Engagements.

Those 130 links now have provisional requirement windows copied from known event dates and explicitly labeled `INFERRED_FROM_EVENT`.

This does not strengthen the underlying evidence. It allows the system to detect where better capacity truth has decision leverage.

Current derived pressure state at activation:
- `WATCH`: 3
- `HIGH`: 0

This means the current imported evidence shows three signed/open-opportunity overlap signals, but no known signed-vs-signed physical-resource overlap.

## Verification priority

Do not perform a giant inventory audit merely because the database contains unknown quantities.

Verification should be prioritized where uncertainty can change a live decision.

Example:
- 17×10 LED Trailer quantity unverified + signed job + overlapping proposal = high verification leverage.
- obscure low-use accessory quantity unknown + no live demand = low verification leverage.

The OS should allocate attention according to decision leverage, not data completeness.

## Relationship to quoting

A future quote engine must consult Capacity Truth before strengthening commitment.

Desired logic:

customer need
→ solution configuration
→ provisional requirement windows
→ pressure/sourcing review
→ commercial proposal
→ legitimate hold if needed
→ signature/payment evidence
→ reservation
→ operational handoff

The goal is not to make quoting slower. The goal is to make routine quoting fast while surfacing only genuine capacity exceptions.

## Relationship to economics

Capacity is economic because scarce resource-days, labor-hours, transport windows and founder attention have opportunity cost.

Future economics should support measures such as:
- contribution per trailer-day
- contribution per scarce crew-hour
- contribution per Greg-dependent hour
- opportunity cost of long-term deployment versus event demand
- subcontract-vs-own decisions

Capacity Truth should therefore become one input into pricing and capital allocation, not merely an operations calendar.

## Current boundary

Not yet active:
- holds
- reservations
- deposit/payment evidence automation
- resource-level possession timestamps
- crew capacity
- transport capacity
- subcontract availability
- warehouse movement
- release/return workflow

These should be added only as evidence and workflow require them.

## Governing sentence

> **Configured tells us what the solution currently contains. Requirement Window tells us when it may be needed. Pressure tells us what deserves review. Hold expresses temporary intent. Reservation expresses a real capacity commitment. Never collapse them.**
