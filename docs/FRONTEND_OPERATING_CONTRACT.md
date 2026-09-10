# Frontend Operating Contract — 2026-09-09

## Center

The frontend should show Stage Presence as a business, not as a database.

The backend therefore owns the complexity required to answer:

> **What is this piece of business, what is true about it, what matters next, what has been promised, what will it consume, what happened economically, and what did we learn?**

One canonical `engagements` record remains the root throughout opportunity, commitment, preparation, delivery, closeout and recurrence.

No separate Lead / Quote / Job truth was introduced.

## Seven durable information petals

### 1. People

Purpose: understand everyone contributing to, buying, paying for, referring, planning, supplying or experiencing an Engagement.

Core structures:
- `parties`
- `engagement_parties`
- `party_relationships`
- `team_members`
- `team_member_capabilities`
- `engagement_assignments`
- `engagement_access_grants`

Engagement party roles now include buyer, payer, decision maker, end user, production partner and vendor in addition to existing customer/contact/planner roles.

`team_members` remains business identity; authentication is separate. Product surfaces should prefer username / display identity rather than hard-coding a founder's personal name into system vocabulary.

`engagement_access_grants` is a future authorization seam only. It does **not** activate external client access in the current release.

### 2. Engagement

Purpose: keep one canonical piece of business while its state changes.

Core structures:
- `engagements`
- `engagement_facts`
- `engagement_relationships`
- `work_items`

Facts now have room for commercial, experience, safety and access evidence as well as technical requirements.

Work items can distinguish:
- who inside owns continuity;
- which outside Party is responsible when appropriate;
- internal / shared / client visibility intent;
- manual / system / automation / import / client origin.

The seven current reality-derived actions are explicitly `SYSTEM` origin.

### 3. Money

Purpose: separate commercial documents, cash movement and directly caused Engagement economics without trying to replace the general ledger.

Core structures:
- `commercial_documents`
- `commercial_document_lines`
- `commercial_payment_schedule`
- `commercial_payments`
- `engagement_financial_facts`
- `engagement_cost_items`
- `engagement_economics_v`

Commercial documents now support revision lineage and lifecycle timing through version, supersession, issued/sent/accepted/valid-through and client-visibility fields.

Direct Engagement cost items support estimates, committed costs and actual costs across labor, subcontract, rental, travel, lodging, fuel, materials, purchasing and processing fees.

Constitutional distinctions remain:
- revenue != cash;
- cash != contribution;
- historical price != current pricing authority;
- a partial set of direct-cost line items is not automatically a complete job cost.

The economics read model explicitly preserves the UNC program exception: `$0` game documents with known-unknown allocation return `PROGRAM_ALLOCATION_UNKNOWN`, not zero economic value.

### 4. Capability

Purpose: understand what Stage Presence can provide, how it may be sourced, what has merely been configured, and what has actually been committed or consumed.

Core structures:
- `resources`
- `engagement_resources`
- `fulfillment_plans`
- `fulfillment_plan_lines`
- `resource_commitments`
- `resource_usage`
- `resource_commitment_current_v`

The state ladder remains intentionally separated:

**configured solution != requirement != pressure != hold != reservation != allocation != actual usage**

The 208 imported Goodshuffle pull-sheet lines remain fulfillment evidence. They do not become reservations merely because they appear on a pull sheet.

### 5. Time + Place

Purpose: make event, delivery, pickup, setup, show, strike, travel and venue knowledge reusable rather than repeatedly retyped.

Core structures:
- `engagement_schedule_items`
- `locations`
- `engagement_locations`
- `location_memory_v`

Existing exact canonical venue text was promoted into normalized location records without fuzzy matching:
- 21 distinct locations
- 28 Engagement-to-location links
- two active Engagements remain without venue truth rather than receiving invented locations.

Locations can progressively retain access, load-in, parking, power and connectivity knowledge.

### 6. Evidence + Outputs

Purpose: preserve where truth came from and generate useful business artifacts from canonical truth without turning the artifact into a second source of truth.

Evidence structures:
- `source_artifacts`
- `source_artifact_segments`
- `events`

Output structure:
- `engagement_outputs`

Outputs can represent quote, invoice, contract, job brief, assignment sheet, pull sheet, packing list, client summary, install scope, service report and closeout report.

An output has version/state/content/storage/client-visibility metadata and may reference the commercial document or fulfillment plan it represents.

Generated document != commercial truth. Commercial truth remains in structured records; generated documents are representations of that truth.

### 7. Learning

Purpose: make completed work improve future decisions, relationships, pricing, venues, execution and capital allocation.

Core structures/read models:
- `engagement_closeouts`
- `learning_review_signals`
- `relationship_summary_v`
- `location_memory_v`
- `pricing_observations_v`

Closeout now has generic `founder_dependent_minutes` plus client feedback, audience experience and reliability notes. The old `greg_minutes` field remains only as a compatibility field and should not be used by new product surfaces.

## Frontend read surfaces

The frontend should not need to reconstruct the graph itself.

### `engagement_frontend_v`

Lightweight one-row-per-Engagement list/dashboard surface. Includes:
- primary customer;
- current commercial document;
- economic position;
- next meaningful work;
- work count;
- fulfillment count;
- assignment count;
- next schedule item;
- capacity signal;
- evidence count.

Use this for Work / Today / portfolio-style screens rather than loading many raw tables per card.

### `engagement_workspace_v`

Complete internal Engagement workspace. Query by Engagement `id`.

One response can expose:
- core Engagement state;
- economics;
- parties;
- facts;
- configured resources;
- commercial documents + lines + payment schedule + payments;
- fulfillment plans + lines;
- schedule;
- assignments;
- work items;
- direct costs;
- resource commitments;
- actual usage;
- generated outputs;
- normalized locations;
- Engagement relationships;
- evidence/source segments;
- closeout.

Empty/unearned layers return empty arrays or null rather than fake completeness.

### `daily_work_queue_v`

Continuity surface for what deserves action. Original columns remain stable; new visibility/origin/external-responsibility fields are appended for compatibility.

### `contributor_work_v`

Contributor-oriented assignment/work projection using business-facing member identity.

### `relationship_summary_v`

Relationship memory across Engagements with observed revenue/cash/contribution where supported.

### `location_memory_v`

Venue/site recurrence plus accumulated operational knowledge.

### `engagement_economics_v`

Observed proposal/commitment/cash/cost/contribution position with explicit evidence basis and uncertainty.

### `engagement_client_surface_v`

Curated future client contract. Deliberately excludes internal costs, evidence, internal notes and internal work. It remains member-only under current RLS; external access is not activated simply because this view exists.

## Automation model

Automation should operate on the same canonical records as people.

The intended path is:

**source arrives -> preserve source -> interpret candidates -> match reality -> promote supported truth -> derive next movement -> route routine work -> generate representation -> human judgment only where material -> capture result -> learn**

This lets future AI reduce typing/reconstruction without becoming an untracked parallel operator.

`work_items.origin`, provenance fields, certainty states and output states make system behavior inspectable.

## Security boundary

- all new tables have RLS;
- current write access remains limited to authenticated active `app_members`;
- all frontend views use `security_invoker=true`;
- anonymous Data API privileges are explicitly revoked across Stage Presence public relations;
- client-access records are modeled but do not grant external users access yet;
- service-role credentials remain server-only and absent from browser/repo.

## Scale posture

The goal is not maximum schema. It is minimum repeated reconstruction.

New primitives were added only for realities the business model already requires:
- durable venue/site memory;
- multi-party commercial relationships;
- contributor capability/assignment;
- direct engagement cost;
- true resource commitment;
- actual resource usage;
- generated operational/client documents;
- future scoped access.

Foreign-key paths surfaced by the Supabase advisor are indexed so provenance and operational history can grow without avoidable relational drag.

## Current unearned layers

Do not imply these are live yet:
- external client login/portal authorization;
- automatic AI interpretation;
- automatic quote approval;
- payment processor / QuickBooks sync;
- complete commercial line-item recovery from the Goodshuffle packet;
- audited direct-cost completeness or contribution;
- actual equipment reservations or usage capture;
- contributor availability scheduling;
- automatic document rendering/sending.

The backend now has clean places for those truths when reality earns them.
