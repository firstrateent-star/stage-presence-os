# Presentation Architecture — Backend Depth Without Frontend Clutter

**Status:** Active product contract  
**Date:** 2026-09-10

## Center

Stage Presence OS is allowed to become structurally deep because the business is structurally deep. The visible product is not allowed to become equally complicated.

> **Backend depth is a capability. Frontend simplicity is a constraint.**

A database field, relation, fact, observation, source segment, price observation or process step does not earn screen space merely because it exists.

The frontend presents the smallest complete amount of information a person needs to understand the situation and contribute well.

## Four-layer boundary

The durable path is:

**Canonical truth → business read contract → presentation model → visual component**

### 1. Canonical truth

Normalized tables preserve business reality, provenance, uncertainty, history and relationships. They may grow substantially over time.

They are not a UI schema.

### 2. Business read contracts

Purpose-built views answer stable business questions such as:
- what matters today;
- what is the state of this Engagement;
- what is its economic position;
- what should this contributor know;
- what may a client appropriately see;
- what process knowledge applies;
- what price evidence exists.

Views own joins and business semantics. Screens should not independently reconstruct the relational graph.

Existing examples include `engagement_frontend_v`, `engagement_workspace_v`, `engagement_economics_v`, `daily_work_queue_v`, `engagement_operating_focus_v`, `engagement_job_map_v`, `assignment_brief_v` and `engagement_client_surface_v`.

### 3. Presentation models

Frontend adapters intentionally promote selected contract fields into display-ready information.

This is an explicit allowlist boundary:

> **New backend information is hidden by default.**

A backend migration therefore cannot accidentally make a screen noisier. A product decision must intentionally map the new information into a presentation model.

Presentation models translate backend semantics into human language, formatting and hierarchy. They must preserve important distinctions such as unknown vs zero, suggestion vs obligation, configuration vs reservation, and observed vs approved price.

### 4. Visual components

Components render presentation models. They should not know database table shape and should rarely parse arbitrary JSON.

This keeps visual design replaceable without changing business truth.

## Five information tiers

Every visible datum should belong to one of five tiers.

### ATTENTION

What changes the person's next action now.

Examples: blocker, approval needed, payment decision, capacity conflict, imminent unresolved access, customer response required.

This tier earns prominent placement on Today and contributor/client action surfaces.

### SUMMARY

Enough context to identify and orient around the Engagement.

Examples: customer, date, venue, human-readable state, represented value, next movement.

This tier belongs on cards and the top of an Engagement workspace.

### OPERATING_DETAIL

Information needed to perform or manage this Engagement.

Examples: detailed schedule, fulfillment, assigned responsibilities, quote scope, commercial terms, resource requirements, delivery dependencies.

This tier belongs inside the Engagement workspace and is grouped by business purpose rather than database table.

### REFERENCE

Reusable knowledge useful when the user asks for or needs depth.

Examples: venue history, Playbook procedure, historical pricing range, related Engagements, contributor capability, resource specifications.

Reference information should normally be behind a disclosure, tab, search or contextual link.

### EVIDENCE

Provenance, original source, contradictions, import details, audit/event history and low-level technical metadata.

This tier is essential to trust but should almost never compete with daily operating information. It belongs at the deepest disclosure level.

## Progressive disclosure contract

### Today

Today is an attention allocator, not a dashboard warehouse.

Default surface budget:
- real committed actions first;
- selective system suggestions second;
- upcoming delivery and active sales context;
- capacity/relationship signals only where consequential;
- no raw evidence or long operational detail.

### Work

A Work card should answer, at a glance:
1. What is it?
2. When/where/who?
3. Where is it in the business lifecycle?
4. What value is represented, if known?
5. What movement matters next?

The card should not expand simply because the backend gains new domains.

### Engagement workspace

The Engagement may contain extensive information, but the top should remain a stable story spine:

**Outcome → state → next movement → date/place → customer → commercial/economic position → delivery readiness**

Additional domains appear as purposeful sections such as Commercial, Plan, Schedule, People, Resources, Job Map, Outputs, Learning and Evidence.

Sections with no represented reality may remain absent or collapsed instead of showing dozens of empty fields.

### Contributor surface

Show the smallest complete briefing required to contribute:

**why → where → when → responsibility → dependencies → required resources/context → completion/acceptance → escalation path**

Do not expose unrelated commercial or private management information.

### Client surface

Show only information the client can understand or act upon:

**what we understand → what is being delivered → decision/approval/input needed → schedule/location → commercial document/payment obligation → shared outputs**

Internal costs, private evidence, crew chatter and internal process details stay internal.

## Visual density rules

These are product heuristics, not database constraints:
- one card should normally carry one dominant state and one dominant next movement;
- summary cards should normally show no more than three small metrics;
- secondary warnings should not visually outrank NOW work unless critical;
- repeated low-value metadata should be aggregated rather than repeated row by row;
- unknown, not represented and zero must have different language;
- evidence badges should be subtle until uncertainty materially changes a decision;
- long lists should be grouped, filterable or collapsed by phase/domain;
- raw JSON is never a finished user experience.

## Contract evolution

Read contracts should be additive whenever possible.

Adding an optional field is safe because presentation adapters ignore it until intentionally mapped.

If existing field semantics must change materially, create a new contract/version rather than silently changing what an existing screen believes a field means.

A frontend change should therefore ask:
1. Which user and moment is this for?
2. Which information tier does it belong to?
3. What decision/action becomes easier because it is visible?
4. What should be removed or collapsed to preserve attention?
5. Does this belong in a reusable presentation adapter rather than screen-specific parsing?

## Growth rule

Backend expansion is encouraged when it increases truth, automation, economics, safety, repeatability or learning.

Frontend expansion is earned only when additional information improves a person's understanding or contribution at that moment.

The governing rule is:

> **Store richly. Interpret centrally. Present selectively. Reveal progressively.**

This allows Stage Presence OS to become substantially more intelligent over time without becoming substantially harder to use.
