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

The backend is deliberately richer than the visible experience. The frontend should expose the business while the backend carries provenance, uncertainty, economics, capacity, reusable process knowledge, assignment responsibility, derived movement and learning.

## Governing references
- `docs/BUSINESS_MODEL_CURRENT.md`
- `docs/FRONTEND_OPERATING_CONTRACT.md`
- `docs/JOB_LIFECYCLE_PLAYBOOK.md`
- `docs/SELECTIVE_MOVEMENT_ENGINE.md`
- `docs/DATA_MODEL.md`
- `docs/DECISIONS.md`

## Seven connected operating petals

The backend remains organized around seven related realities without splitting the Engagement:

1. **People** — customer/contact/buyer/payer/planner/referrer/vendor/partner/end-user/contributor reality.
2. **Engagement** — one lifecycle root, facts, relationships, state and next movement.
3. **Money** — commercial documents, payment evidence, direct costs and evidence-aware economics.
4. **Capability** — resources, fulfillment, requirement windows, pressure, commitments and actual usage.
5. **Time + Place** — schedules, delivery/load-in/out and reusable venue/site memory.
6. **Evidence + Outputs** — source/provenance plus generated business representations.
7. **Learning** — closeout, experience, reliability, venue/relationship/pricing/process learning.

Reusable Playbook knowledge and Selective Movement are cross-cutting reasoning layers over these petals; neither creates another job object.

## Frontend read contracts live

Core operating contracts:
- `engagement_frontend_v` — lightweight one-row-per-active-Engagement summary.
- `engagement_workspace_v` — complete internal single-Engagement workspace.
- `daily_work_queue_v` — persisted open/waiting/blocked business work.
- `engagement_economics_v` — proposal/commitment/cash/cost/contribution evidence.
- `relationship_summary_v` — recurring relationship memory.
- `location_memory_v` — recurring venue/site memory.
- `contributor_work_v` — contributor-oriented work.
- `resource_commitment_current_v` — actual holds/reservations/allocations only.
- `engagement_client_surface_v` — curated future client contract; internal-only today.

Process/assignment contracts:
- `playbook_catalog_v` — reusable lifecycle knowledge.
- `engagement_job_map_v` — applicable lifecycle map overlaid with actual per-job tracking.
- `assignment_brief_v` — role + schedule/location + granular responsibility briefing.

Selective-movement contracts:
- `engagement_movement_candidates_v` — explainable derived movement candidates; not tasks.
- `engagement_operating_focus_v` — uncovered non-LATER candidates ranked NOW → SOON → WATCH, then by consequence/materiality/economic context.

Existing capacity, fulfillment, pricing-observation and learning views remain available.

## Job lifecycle knowledge

Canonical: `docs/JOB_LIFECYCLE_PLAYBOOK.md`.

Constitution:

**Playbook knowledge != Engagement step state != work item != contributor assignment**

Current active Playbook:
- `STAGE_PRESENCE_CORE_LIFECYCLE` v1
- 105 active reusable steps
- 13 phases
- universal flow plus EVENT, LONG_TERM_RENTAL, INSTALLATION, EQUIPMENT_SALE and SERVICE branches.

The 13 phases are Intent & Intake, Requirements, Solution Design, Feasibility & Risk, Commercial, Commitment & Handoff, Installation-Specific Preparation, Preproduction & Preparation, Delivery & Experience, Strike/Return/Reconciliation, Economic Close, Closeout & Learning, and Relationship & Recurrence.

Each step may express requiredness, automation mode, role/capability hint, applicability, client touchpoint, completion definition, evidence/risk/dependencies, and procedure maturity.

Procedure maturity is explicit:
`MAP_ONLY / CHECKLIST / SOP / VERIFIED_SOP`.

Technical/safety-sensitive detail remains conservative. MAP_ONLY means the system knows the step exists but does not claim a qualified technical or safety procedure.

Current persisted `engagement_step_states`: **0**. Historical jobs were not assigned fake completion histories. All seven current reality-derived work items are linked to the Playbook steps they actually represent.

## Assignment depth

`engagement_assignments` supports role-level scope, schedule, location, briefing, acceptance criteria and acknowledgement.

`engagement_step_assignments` supports `LEAD / SUPPORT / APPROVER / CONSULTED / INFORMED` responsibility over concrete lifecycle steps.

Current reality boundary:
- `team_members`: 0
- `engagement_assignments`: 0
- `engagement_step_assignments`: 0

No contributor identities, availability, rates, capabilities or assignments are invented merely to populate the product.

## Selective Movement Engine — live read-only reasoning

Canonical: `docs/SELECTIVE_MOVEMENT_ENGINE.md`.

Operating rule:

> **Know the whole path. Activate only what reality earns. Automate continuity. Escalate consequential judgment. Learn from the result.**

The first deterministic engine is live in Supabase and remains read-only. It derives explainable candidates from represented business reality and Playbook knowledge without creating work, assignments, reservations, client messages or approvals.

Current signal families include:
- open proposal/customer decision;
- open demand needing requirement/solution shaping;
- committed scope lacking fulfillment handoff;
- imminent schedule reconciliation;
- imminent contributor-role reconciliation;
- imminent venue/access reconciliation;
- represented balance needing current payment verification;
- final execution readiness;
- recent delivery needing lightweight closeout;
- overlapping resource requirement pressure.

Existing open work for the same Engagement + Playbook step marks a candidate `COVERED`; otherwise it remains `UNMATERIALIZED`.

The operating surface ranks by time horizon first: **NOW → SOON → WATCH → LATER**. Business consequence, materiality and represented economic value refine order inside the horizon.

This prevents medium-term capacity pressure from outranking work that can fail today while still keeping the future pressure visible.

### Current reality learned from the first run

- Music Farm (Sep 10) and the UNC Sep 12 opener surface schedule, crew, venue/access and readiness movement because their dates make those gaps consequential now.
- Existing Music Farm payment/readiness work and current proposal follow-ups are recognized as covered rather than duplicated.
- Red Palm's recent delivered job surfaces payment-verification and closeout learning without treating its Sep 9 commercial snapshot as current accounting truth.
- the Sep 4 equipment-sale proposal still commercially open surfaces as stale decision truth needing resolution.
- November LED/trailer overlap remains WATCH capacity pressure rather than displacing September delivery work.

Frontend distinction:

**Needs You = persisted business work**  
**System Sees = derived model recommendation**

The Engagement detail also exposes its own selective movement panel before the full Job Map.

## Goodshuffle reality translation

Current translated reality remains:
- 30 active Goodshuffle-derived Engagements
- 20 identified customer/contact Parties
- 30 commercial documents
- 30 fulfillment plans
- **208 raw fulfillment lines** from individual pull-sheet workbooks
- 128 exact Resource links by Goodshuffle external ID
- 2 unmatched service IDs: Film Festival `Video Tech` and `Content Creation`
- 1 Shellabration zero-quantity promotional-discount line preserved although the aggregate export omitted it
- 3 package-child lines preserved
- 90 source-artifact segments
- 21 normalized locations / 28 Engagement-location links
- 7 persisted system-derived work items.

Translation rules remain:
- signed source evidence does not automatically mean deposit received or operational confirmation;
- fulfillment does not imply hold/reservation/usage;
- `CONFIGURED` does not mean requested/recommended/owned/available/held/reserved;
- `$0` unresolved program components are not free work;
- source quantity does not equal audited inventory;
- unknown/TBD/conflicting history is preserved rather than repaired by guess.

### UNC economic guardrail

The UNC season carries $102,000 observed committed value with a Sep 9 source snapshot of $51,000 observed collected / $51,000 observed remaining.

Six component games have literal `$0` project documents while explicit evidence says their per-game economic allocation is unknown. `engagement_economics_v` returns `PROGRAM_ALLOCATION_UNKNOWN` rather than inventing $0 revenue/receivable truth.

## Commercial + economic model

Representable flow:

**commercial document → document lines → payment schedule/payment evidence → direct Engagement costs → evidence-aware contribution**

Current evidence boundary:
- `commercial_document_lines`: 0
- `commercial_payment_schedule`: 0
- `commercial_payments`: 0
- `engagement_cost_items`: 0
- audited contribution/margin is not claimed.

Historical commercial line recovery remains a high-value next evidence move because it can teach pricing without making historical price current authority.

Constitution:

**revenue != cash != contribution**  
**historical quoted price != current pricing authority**

## Capability + capacity truth

Current sequence remains:

**configuration → requirement window → pressure → hold → reservation/allocation → actual usage**

Current evidence boundary:
- `resource_commitments`: 0
- `resource_usage`: 0

The selective engine may surface pressure, but never converts pressure or fulfillment into a reservation automatically.

## Time + location memory

Reusable `locations`, `engagement_locations` and `location_memory_v` are live. Existing venue text was normalized only from exact canonical name/address pairs. No fuzzy venue merge was used.

Location knowledge can accumulate access, load-in, parking, power and connectivity learning so repeat venues become easier rather than being rediscovered.

## People, clients and delivered experience

Party roles support customer, primary contact, buyer, payer, decision maker, planner, referrer, venue contact, end user, production partner and vendor.

Contributor identity remains separate from authentication through `team_members`.

External client access is still **not activated**. `engagement_client_surface_v` remains an internal preview and excludes internal costs, evidence and private operating work.

Closeout supports client feedback, audience/end-user experience and reliability so the system can learn from delivered human outcome, not only equipment movement.

## Evidence + outputs

Original evidence remains append-oriented in `source_artifacts`, `source_artifact_segments` and `events`.

`engagement_outputs` is the versioned home for quote, invoice, contract, job brief, assignment sheet, pull sheet, packing list, client summary, install scope, service report and closeout report representations.

Current `engagement_outputs`: 0. Automatic rendering/sending is not claimed.

Rule:

**generated representation != canonical business truth**

## Automation direction

The emerging low-technical-intervention loop is now structurally:

**source arrives → preserve → interpret/match → promote supported truth → evaluate Playbook → derive selective movement → suppress already-covered work → system handles routine continuity → human handles consequential exceptions → capture result → update economics/capacity/relationship/process learning → recenter**

The present engine stops before autonomous work creation so false-positive/false-negative behavior can be observed on real Stage Presence work first.

## Security + scale

- explicit `app_members` allowlist + RLS remains the internal access boundary
- Playbook/step-state/assignment tables use RLS
- frontend/derived views use `security_invoker=true`
- anonymous Data API privileges are revoked from these views
- browser app uses publishable credentials only
- no external client access is active
- no unrelated infrastructure, especially NFL DFS, is touched.

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
- automatic selective-candidate materialization
- detailed verified technical/safety SOPs for MAP_ONLY steps
- external client login/portal authorization
- automatic document rendering/sending/e-signature
- independent authenticated browser verification of the next Cloudflare deployment until observed.

## Current direction

Finish and validate the selective-movement frontend boundary, then continue from reality rather than adding generic modules.

Strong next Flowers after this boundary:
1. recover high-confidence historical commercial lines and build the approved pricing-policy seam;
2. observe selective-movement signals against real work and only then graduate safe signal families toward automatic work materialization;
3. introduce real contributor roster/capability/assignment evidence when Stage Presence is ready;
4. generate job briefs/assignment sheets from canonical schedule + fulfillment + location + assignment responsibility;
5. capture actual cost/usage/outcome so economics, capacity, process and relationship knowledge improve from each delivered Engagement.
