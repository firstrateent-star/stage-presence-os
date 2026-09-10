# Current State — 2026-09-10

## Canonical system
- Private repo: `firstrateent-star/stage-presence-os`
- Default branch: `main`
- Supabase: `stage-presence-os` (`yaojcuvgtlncytujfxef`), `us-east-1`
- Hosting: Cloudflare Workers Static Assets
- Production URL: `https://stage-presence-os.falling-butterfly-aad6.workers.dev`
- Engineering discipline: Flower branch → GitHub Build Check (`tsc` + Vite) → PR → `main` → Cloudflare.

## Product center

> **History informs. Active inherited work gets enough truth to move. New work is born correctly. Systems carry continuity; people handle material judgment.**

One canonical Engagement persists through:

**intent → requirements → solution → feasibility → commercial decision → commitment → preparation → delivery → economic close → learning → recurrence**

Goodshuffle, QuickBooks, spreadsheets and conversations are evidence sources, not Stage Presence OS architecture.

The backend is deliberately richer than the visible experience. The frontend should expose the business while the backend carries provenance, uncertainty, economics, capacity, reusable process knowledge, assignment responsibility and learning.

## Frontend operating backend

Canonical references:
- `docs/BUSINESS_MODEL_CURRENT.md`
- `docs/FRONTEND_OPERATING_CONTRACT.md`
- `docs/JOB_LIFECYCLE_PLAYBOOK.md`
- `docs/DATA_MODEL.md`

The operating backend remains organized around seven connected information petals without splitting the Engagement:

1. **People** — customer/contact/buyer/payer/planner/referrer/vendor/partner/end-user/contributor reality.
2. **Engagement** — one commercial/operational lifecycle root, facts, relationships and movement.
3. **Money** — documents, payment evidence, direct costs and evidence-aware economics.
4. **Capability** — resources, fulfillment, requirement windows, pressure, commitments and actual usage.
5. **Time + Place** — schedules, delivery/load-in/out and reusable venue/site memory.
6. **Evidence + Outputs** — original source/provenance plus generated business representations.
7. **Learning** — closeout, experience, reliability, venue/relationship/pricing/process learning.

### Frontend read contracts live

- `engagement_frontend_v` — lightweight one-row-per-active-Engagement operating summary.
- `engagement_workspace_v` — complete internal single-Engagement workspace.
- `daily_work_queue_v` — open/waiting/blocked movement.
- `engagement_economics_v` — proposal/commitment/cash/cost/contribution evidence.
- `relationship_summary_v` — recurring relationship memory.
- `location_memory_v` — recurring venue/site memory.
- `contributor_work_v` — contributor-oriented work.
- `resource_commitment_current_v` — true resource commitments only.
- `engagement_client_surface_v` — curated future client contract; internal-only today.
- `playbook_catalog_v` — reusable lifecycle knowledge.
- `engagement_job_map_v` — applicable lifecycle map overlaid with actual per-job tracking.
- `assignment_brief_v` — role + schedule/location + granular responsibility briefing.

Existing capacity, fulfillment, pricing-observation and learning views remain available.

## Job lifecycle knowledge — live

Canonical: `docs/JOB_LIFECYCLE_PLAYBOOK.md`.

The system now distinguishes:

**Playbook knowledge ≠ Engagement step state ≠ work item ≠ contributor assignment**

Current active Playbook:
- code: `STAGE_PRESENCE_CORE_LIFECYCLE`
- version: 1
- 105 active reusable steps
- 13 phases
- covers EVENT, LONG_TERM_RENTAL, INSTALLATION, EQUIPMENT_SALE and SERVICE branches plus universal lifecycle steps.

The 13 phases are:
- Intent & Intake
- Requirements
- Solution Design
- Feasibility & Risk
- Commercial
- Commitment & Handoff
- Installation-Specific Preparation
- Preproduction & Preparation
- Delivery & Experience
- Strike, Return & Reconciliation
- Economic Close
- Closeout & Learning
- Relationship & Recurrence

Each step can express requiredness, automation mode, default role/capability, Engagement-type applicability, client touchpoint, completion definition, risk, evidence expectation, dependencies and procedure maturity.

Procedure maturity is explicit:
`MAP_ONLY / CHECKLIST / SOP / VERIFIED_SOP`.

Technical and safety-sensitive steps are deliberately conservative. `MAP_ONLY` means the system knows the step exists and why it matters but does **not** claim to contain a qualified detailed technical/safety procedure.

### No checklist inflation

The Playbook is not materialized into 105 tasks on every job.

Current persisted `engagement_step_states`: **0**.

This is intentional. Existing historical jobs were not assigned fake completion histories. `engagement_job_map_v` exposes applicable process knowledge as `UNTRACKED` until actual job evidence creates a tracked state.

All seven current reality-derived work items are mapped to the lifecycle knowledge they belong to. A work item continues to mean an action/decision/dependency that deserves attention, not a generic process checkbox.

## Assignment depth — live structure, no invented people

`engagement_assignments` now supports role-level assignment detail:
- role and assignment state;
- schedule window;
- location/schedule linkage;
- scope summary;
- briefing notes;
- acceptance criteria;
- acknowledgement state/time.

`engagement_step_assignments` adds granular responsibility:
`LEAD / SUPPORT / APPROVER / CONSULTED / INFORMED`.

This lets the OS distinguish “this person is the Video Tech on the job” from “this person leads commissioning, supports load-in, verifies playback and is informed about client acceptance.”

Current reality boundary:
- `team_members`: 0
- `engagement_assignments`: 0
- `engagement_step_assignments`: 0

No contributor identities, availability, rates, capabilities or assignments were invented merely to populate the feature.

## Frontend transition underway on `flower/job-playbook`

The live branch progressively moves visible surfaces onto the operating read contracts while preserving the existing editor for continuity.

### Today
Backend-connected Today now uses `engagement_frontend_v`, `daily_work_queue_v` and `relationship_summary_v` to show:
- Needs You
- Next Up
- Sales
- Capacity
- Relationships
- known committed value only where represented.

The screen no longer needs to independently reconstruct the business model from raw tables.

### Work
Backend-connected Work now consumes `engagement_frontend_v` and groups the same Engagement reality into:
- Opportunities
- Upcoming Jobs
- Past / Needs Resolution

Cards can show customer/date/venue, observed proposal/committed value, open movement count, fulfillment depth, capacity signal and next movement without creating separate lead/job objects.

### Engagement
The existing business story and detailed editor remain in place. A new **Job Map** panel exposes the relevant start-to-finish Playbook for that Engagement species.

Untracked steps are shown as available knowledge, not overdue/incomplete work.

### Playbook
A new internal Playbook navigation surface allows the company to browse lifecycle knowledge by:
- Event
- Long-term Rental
- Installation
- Equipment Sale
- Service
- All Knowledge

The Playbook stays a reference/learning surface rather than dominating daily operations.

Demo mode retains the older Today/Work presentation because live operating read contracts require Supabase.

## Goodshuffle reality translation

Live imported/translated reality remains:
- 30 active Goodshuffle-derived Engagements
- 20 identified customer/contact Parties
- 30 commercial documents
- 30 fulfillment plans
- **208 raw fulfillment lines** from individual pull-sheet workbooks
- 128 exact Resource links by Goodshuffle external ID
- 2 unmatched service IDs: Film Festival `Video Tech` and `Content Creation`
- 1 Shellabration zero-quantity promotional-discount line preserved although the aggregate export omitted it
- 3 package-child lines preserved
- 90 source-artifact segments for document/project/pull-sheet provenance
- 21 normalized locations / 28 Engagement-location links
- 7 current system-derived work items

Translation rules remain:
- signed source evidence does not automatically mean deposit received or operationally confirmed;
- fulfillment does not imply hold/reservation/usage;
- `CONFIGURED` does not mean requested/recommended/owned/available/held/reserved;
- `$0` unresolved program components are not free work;
- source quantity does not equal audited physical inventory;
- unknown/TBD/conflicting history is preserved rather than repaired by guess.

### UNC economic guardrail

The UNC season carries $102,000 observed committed value with a Sep 9 source snapshot of $51,000 observed collected / $51,000 observed remaining.

Six component games have literal `$0` project documents while explicit facts say their per-game economic allocation is unknown. `engagement_economics_v` returns `PROGRAM_ALLOCATION_UNKNOWN` for those children rather than $0 revenue/receivable truth.

## Commercial + economic model

Current flow can represent:

**commercial document → document lines → payment schedule/payment evidence → direct Engagement costs → evidence-aware contribution**

Commercial documents support versioning/supersession and lifecycle timestamps. Historical quoted price remains evidence rather than current approved pricing authority.

Current reality boundary:
- `commercial_document_lines`: 0; line-level commercial recovery remains a high-value next evidence move.
- `commercial_payment_schedule`: 0
- `commercial_payments`: 0
- `engagement_cost_items`: 0
- audited contribution/margin is not claimed.

Constitution:

**revenue != cash != contribution**

## Capability + capacity truth

Current sequence remains:

**configuration → requirement window → pressure → hold → reservation/allocation → actual usage**

Live structures exist for all stages. Current evidence boundary:
- `resource_commitments`: 0
- `resource_usage`: 0

The OS therefore does not mistake imported fulfillment for committed/used inventory.

## Time + location memory

Reusable `locations` / `engagement_locations` / `location_memory_v` are live.

Existing venue text was normalized only from exact canonical name/address pairs. No fuzzy venue merge was used.

Location knowledge can progressively accumulate access, load-in, parking, power and connectivity learning so repeat venues become easier rather than being rediscovered.

## People, clients and delivered experience

Party roles support customer, primary contact, buyer, payer, decision maker, planner, referrer, venue contact, end user, production partner and vendor.

Contributor identity remains separate from authentication through `team_members`.

External client access is still **not activated**. `engagement_client_surface_v` remains an internal preview of a future curated client experience and intentionally excludes internal costs, evidence and private operating work.

Closeout supports client feedback, audience/end-user experience and reliability so the system can learn from the delivered human outcome, not only equipment movement.

## Evidence + generated outputs

Original evidence remains append-oriented in `source_artifacts`, `source_artifact_segments` and `events`.

`engagement_outputs` provides a versioned home for quote, invoice, contract, job brief, assignment sheet, pull sheet, packing list, client summary, install scope, service report and closeout report representations. Outputs may now reference the Playbook step they came from.

Current `engagement_outputs`: 0. Automatic rendering/sending is not claimed.

Rule:

**generated representation != canonical business truth**

## Automation direction

The new Playbook creates a stronger substrate for the intended low-technical-intervention loop:

**source arrives → preserve → interpret/match → promote supported truth → evaluate applicable process knowledge → satisfy deterministic steps → create only necessary work/decisions → route responsibility → generate representations → human judgment at material exceptions → capture actual result → learn → improve Playbook**

The system should eliminate remembering and duplicate entry, not automate consequential judgment invisibly.

Future assignment automation should reason from required capability and job steps, then propose/route people based on represented capability/availability rather than names or habit.

## Source-storage boundary

Private Supabase `source-artifacts` storage remains image-oriented and member-only. Goodshuffle hashes/structured provenance are not equivalent to recoverable original source binaries. A general private document-import seam remains future deliberate work.

## Security + scale

- explicit `app_members` allowlist + RLS remains the internal access boundary
- new Playbook/step-state/step-assignment tables use RLS
- frontend views use `security_invoker=true`
- anonymous Data API privileges are revoked
- browser app uses publishable credentials only
- no external client access is active
- no unrelated infrastructure, especially NFL DFS, is touched

## Current true boundaries

Not currently claimed:
- automatic Goodshuffle sync
- QuickBooks/accounting integration
- payment processor integration
- AI interpretation of uploaded sources
- automatic customer/Party matching
- complete line-level commercial/pricing recovery
- approved price-book/rules engine
- audited job-cost completeness or margin
- actual holds/reservations/usage records
- contributor roster/capability/availability truth
- automatic crew scheduling
- detailed verified technical/safety SOPs for MAP_ONLY steps
- external client login/portal authorization
- automatic document rendering/sending/e-signature
- independent browser verification of the next Cloudflare deployment until observed.

## Current direction

The immediate coherent boundary is now:

**Operating read contracts + lifecycle knowledge + deep assignment model + progressive Today/Work/Engagement frontend migration.**

After this branch passes Build Check and merges, the strongest next reality-driven layers are:

1. commercial line recovery + approved price/rules seam so quote generation can begin learning from history without turning history into policy;
2. selective process activation so current Engagement truth opens only the Playbook steps/work items that actually need attention;
3. real contributor roster/capability/assignment evidence when Stage Presence is ready to represent the team;
4. assignment-sheet/job-brief generation from canonical schedule, fulfillment, location, assignments and step responsibility;
5. closeout/actual-cost/actual-usage learning so process and economics improve from real jobs.
