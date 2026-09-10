# Current State — 2026-09-09

## Canonical system
- Private repo: `firstrateent-star/stage-presence-os`
- Default branch: `main`
- Supabase: `stage-presence-os` (`yaojcuvgtlncytujfxef`), `us-east-1`, `ACTIVE_HEALTHY`
- Hosting: Cloudflare Workers Static Assets
- Production URL: `https://stage-presence-os.falling-butterfly-aad6.workers.dev`
- Current implementation work uses the discipline: Flower branch → GitHub Build Check → PR → `main` → Cloudflare.

## Product center

> **History informs. Active inherited work gets enough truth to move. New work is born correctly. Systems carry continuity; people handle material judgment.**

One canonical Engagement remains the root through:

**opportunity → commitment → preparation → delivery → closeout → recurrence**

Goodshuffle, QuickBooks and other source systems are evidence sources, not Stage Presence OS architecture.

The backend is deliberately richer than the visible experience. The frontend should show the business while the backend carries provenance, uncertainty, commercial/economic distinctions, capacity truth, automation state and learning.

## Frontend operating backend

Canonical design: `docs/FRONTEND_OPERATING_CONTRACT.md`.
Current schema map: `docs/DATA_MODEL.md`.

The backend is now organized into seven durable information petals without splitting the canonical Engagement:

1. **People** — customers, buyers, payers, planners, referrers, vendors, contributors and end users.
2. **Engagement** — state, requirements/facts, relationships and next movement.
3. **Money** — documents, payment evidence, direct Engagement costs and evidence-aware economics.
4. **Capability** — resources, configured solution, fulfillment, true holds/reservations and actual usage.
5. **Time + Place** — schedules, delivery/load-in/out and reusable venue/site memory.
6. **Evidence + Outputs** — source provenance plus generated representations such as quotes, job briefs and assignment sheets.
7. **Learning** — closeout, relationship memory, venue memory, pricing observations and delivered experience.

### Frontend read contracts now live

- `engagement_frontend_v` — lightweight one-row-per-Engagement list/dashboard contract.
- `engagement_workspace_v` — complete internal single-Engagement workspace.
- `daily_work_queue_v` — actionable continuity queue with owner, responsible Party, visibility and origin.
- `engagement_economics_v` — evidence-aware proposal/commitment/cash/cost/contribution position.
- `relationship_summary_v` — recurring Party relationship memory.
- `location_memory_v` — venue/site recurrence and operational memory.
- `contributor_work_v` — contributor-oriented assignments/work.
- `resource_commitment_current_v` — actual tentative/confirmed resource commitments only.
- `engagement_client_surface_v` — curated future client contract; still internal-member-only today.
- Existing `capacity_pressure_signals`, `fulfillment_plan_current_v`, `pricing_observations_v`, and `learning_review_signals` remain available.

Current smoke counts:
- 30 active Engagement rows in the frontend/workspace/economics contracts.
- 20 Party relationship summaries.
- 21 normalized location-memory records.
- 7 open reality-derived work items, now explicitly marked `SYSTEM` origin.

A frontend can therefore access essentially the full represented Engagement story without joining the entire graph screen-by-screen. Missing/unearned layers return null/empty collections rather than fabricated completeness.

## Current product spine

### Today
Answers: **What actually matters now?**

Business-facing sections remain centered on:
- Needs You
- Next Up
- Sales
- Team Handling
- Capacity
- Relationships
- trustworthy known economic value only

The Decision Resolver / Exception Engine remains underneath rather than leading the experience.

### Work
Visible navigation remains **Work** while one Engagement remains the backend object.

Presentation may group work into Opportunities, Upcoming Jobs and Past / Needs Resolution without creating separate Lead / Quote / Job records.

### Engagement
The business-facing top should answer:

> **What is happening with this piece of business?**

The new `engagement_workspace_v` can provide the full internal story from one filtered read:
- people;
- facts/requirements;
- configured resources;
- commercial documents, lines, payment schedules and payments;
- fulfillment plans and lines;
- execution schedule;
- assignments;
- work items;
- direct costs;
- resource commitments;
- actual usage;
- generated outputs;
- locations;
- related Engagements;
- evidence/provenance;
- closeout/learning;
- economics.

## Goodshuffle reality translation

Live imported state:
- 30 active Goodshuffle-derived Engagements.
- 20 identified customer/contact Parties.
- 30 commercial-document records.
- 30 fulfillment plans.
- **208 raw fulfillment lines** preserved from the individual pull-sheet workbooks.
- 128 fulfillment lines linked to canonical Resources by exact Goodshuffle external ID.
- 2 unresolved external IDs remain: Film Festival `Video Tech` and `Content Creation`.
- 1 zero-quantity Shellabration promotional-discount line preserved even though the aggregate export omitted it.
- 3 package-child lines preserved.
- 90 source-artifact segments currently provide document/project/pull-sheet provenance.

Translation rules remain:
- `Contract Signed` → `WON / SIGNED`, not automatic operational confirmation.
- no deposit evidence → no reservation inference.
- `$0` unresolved program components are not free work.
- `CONFIGURED` does not mean requested, recommended, owned, available, held or reserved.
- fulfillment plan does not mean capacity commitment or actual usage.
- Goodshuffle quantity fields remain evidence, not audited physical-inventory truth.

### UNC economic exception proved by reality

The UNC season is the parent economic truth currently represented:
- $102,000 observed committed value.
- $51,000 observed collected in the Sep 9 source snapshot.
- $51,000 observed remaining in that snapshot.

The six individual game records have source documents whose project totals are `$0`, but the existing facts explicitly say per-game economic allocation is unknown.

`engagement_economics_v` therefore returns `PROGRAM_ALLOCATION_UNKNOWN` for those game components rather than falsely turning them into zero-value work.

## Commercial + economic model

Live structures now distinguish:

**Commercial document → document lines → payment schedule/payment evidence → directly caused Engagement costs → evidence-aware economics**

Commercial documents support revision lineage and lifecycle timestamps through version, supersession, issued/sent/accepted/valid-through and client-visible fields.

`engagement_cost_items` provides a place for direct labor, subcontract, external rental, transport, travel, lodging, per diem, fuel, materials, purchases and processing fees with estimate/committed/actual state.

Current reality boundary:
- `engagement_cost_items`: 0 rows.
- audited contribution/margin is therefore not claimed.
- `commercial_document_lines`: historical atomic price recovery still remains an important next evidence layer.

Constitution:

**revenue != cash != contribution**

and

**historical quoted price != current pricing authority**

## Capability + capacity truth

The resource model now has distinct first-class places for:

**configured solution → requirement window → pressure → hold/reservation/allocation → actual usage**

Live:
- resource library with mixed verified/unverified quantity and price evidence.
- Engagement-specific configured resources and requirement windows.
- 30 Goodshuffle fulfillment plans / 208 fulfillment lines.
- RLS-safe capacity-pressure derivation.
- `resource_commitments` exists for true holds/reservations/allocations.
- `resource_usage` exists for what actually went to the job.

Current reality boundary:
- `resource_commitments`: 0 rows.
- `resource_usage`: 0 rows.

Therefore the OS does **not** claim that imported pull-sheet lines are reservations or proof of actual asset usage.

## Time + place memory

A reusable site/venue layer now exists:
- `locations`
- `engagement_locations`
- `engagement_schedule_items.location_id`
- `location_memory_v`

Existing canonical Engagement venue text was promoted only by exact normalized name/address evidence — no fuzzy entity matching.

Current result:
- 21 distinct normalized locations.
- 28 Engagement-to-location links.
- two active Engagements still lack venue truth rather than receiving invented locations.

Locations can progressively retain access, load-in, parking, power and connectivity knowledge so recurring venue knowledge does not need to be rediscovered on every job.

## People, contributors and clients

Party roles now support different commercial/experience actors:
- customer
- primary contact
- buyer
- payer
- decision maker
- planner
- referrer
- venue contact
- end user
- production partner
- vendor

This lets Stage Presence distinguish who buys from who experiences the outcome.

Contributor identity remains separate from authentication through `team_members`; product surfaces should use business-facing username/display identity rather than hard-coded personal names.

New supporting structures:
- `team_member_capabilities`
- `engagement_assignments`
- `party_relationships`
- `engagement_access_grants`

Current reality boundary:
- active `team_members`: 0.
- `engagement_assignments`: 0.
- active external access grants: 0.

No Greg/Nancy/employee/client accounts or assignments were invented.

### Future client surface

`engagement_client_surface_v` now defines a curated representation that can eventually expose only:
- relevant Engagement/date/location state;
- client-facing people;
- client-visible commercial documents;
- schedule;
- client-visible generated outputs;
- shared/client actions.

It deliberately excludes internal costs, provenance/evidence, internal work and private operational detail.

This is a design/access seam only. Current RLS still restricts it to authenticated active Stage Presence app members; external client access has **not** been activated.

## Evidence + output generation

Evidence remains append-oriented through:
- `source_artifacts`
- `source_artifact_segments`
- `events`

`engagement_outputs` now provides a versioned home for generated/approved representations including:
- quote
- invoice
- contract
- job brief
- assignment sheet
- pull sheet
- packing list
- client summary
- install scope
- service report
- closeout report

Current reality boundary:
- `engagement_outputs`: 0 rows.
- automatic document rendering/sending is not claimed.

Rule:

**generated representation != canonical business truth**

The structured Engagement/commercial/fulfillment records remain authoritative; documents represent them.

## Automation direction

The target operating loop is now structurally supported:

**source arrives → preserve source → interpret candidates → match existing reality → promote supported truth → derive next movement → route routine work → generate representation → human judgment at material exceptions → capture result → learn**

`work_items.origin`, provenance, certainty states and output states make future system/AI behavior inspectable instead of allowing a hidden automation reality.

Current automation remains intentionally limited. The seven current business actions are system-derived, but there is no automatic AI interpretation, autonomous quote approval or source integration yet.

## Learning / repeatability

`engagement_closeouts` remains one learning record per Engagement and now has room for:
- delivery/lost/cancelled/other outcome;
- setup and strike time;
- generic `founder_dependent_minutes`;
- solution changes;
- venue learning;
- next-time improvement;
- recurrence;
- client feedback;
- audience/end-user experience;
- reliability notes.

The legacy `greg_minutes` field remains only for compatibility and should not be used by new product surfaces.

Existing reality still supports future internal archetypes rather than forced customer-facing packages:
- repeated UNC visual/production configuration;
- repeated trailer + logistics combinations;
- recurring venues such as Polk Place;
- recurring Party relationships.

## Forward-Born Truth

Canonical: `docs/FORWARD_BORN_TRUTH.md`.

Current private Quick Capture preserves:

**source evidence != structured business truth**

Freeform text/photo evidence can be preserved without automatically asserting customer request, technical requirement, Party identity or AI interpretation.

Goal remains:

**capture once → preserve source → interpret candidates → match existing reality → promote supported truth → ask only material questions → move the Engagement**

## Source storage boundary

Private Supabase bucket: `source-artifacts`.

Current bucket remains intentionally image-oriented:
- private;
- 15 MB limit;
- JPEG, PNG, WebP, HEIC, HEIF;
- authenticated active members may read;
- uploads restricted to the member's user-id folder.

The Goodshuffle recovery preserved source hashes/metadata and structured evidence, but the original export binaries were not retrospectively placed into Storage.

Do not pretend fingerprint/provenance equals a recoverable source file.

A general private document-import intake seam should be activated deliberately when useful rather than widening storage merely because it is possible.

## Security + performance

- Supabase remains behind the explicit `app_members` allowlist + RLS.
- all new operating tables have RLS.
- all frontend read models are `security_invoker=true`.
- anonymous Data API privileges are explicitly revoked from Stage Presence public relations.
- browser app still uses only publishable Supabase credentials.
- no service-role/database secret is exposed in browser or repo.
- no external client access has been activated.
- security advisor reports only the known leaked-password-protection warning.
- all foreign-key paths flagged by the performance advisor now have covering indexes; current remaining index notices are expected informational `unused_index` findings on this very small/new workload.

## Current true boundaries

Not currently claimed:
- automatic Goodshuffle sync;
- QuickBooks/accounting integration;
- payment processor integration;
- AI interpretation of uploaded sources;
- automatic customer/Party matching;
- complete commercial line-item recovery from the Goodshuffle packet;
- audited job-cost completeness, margin or contribution;
- actual holds/reservations/allocation records;
- actual resource usage capture;
- contributor roster/capability/availability truth;
- automated crew scheduling;
- external client login/portal authorization;
- automatic document rendering, sending or e-signature;
- newest Cloudflare deployment behavior after future merges until observed.

## Current direction

The next frontend should consume business read contracts rather than duplicate backend reasoning.

The immediate architecture now supports a low-technical-intervention path:

1. preserve source once;
2. derive/match supported truth;
3. show contributors only the work/context they need;
4. show clients only the state/actions/documents appropriate to them;
5. let economic/capacity/relationship logic live behind the UI;
6. automate routine continuity while preserving human approval at consequential exceptions;
7. capture actual outcome/cost/usage/experience so each Engagement improves the next one.
