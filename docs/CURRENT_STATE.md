# Current State — 2026-09-12

## Canonical system
- Private repo: `firstrateent-star/stage-presence-os`
- Default branch: `main`
- Supabase: `stage-presence-os` (`yaojcuvgtlncytujfxef`), `us-east-1`
- Hosting: Cloudflare Workers Static Assets
- Production URL: `https://stage-presence-os.falling-butterfly-aad6.workers.dev`
- Engineering discipline: Flower branch → GitHub Build Check → PR → `main` → Cloudflare.

## Current center

> **Operational Clarity: organize the real company before optimizing the interface or adding intelligence for its own sake.**

Stage Presence OS remains the shared operating memory for six connected business realities:

1. **Things** — equipment, warehouse, capability, commitments, usage, maintenance
2. **People** — contributors, roles, capabilities, rates, assignments, labor actuals
3. **Relationships** — people, organizations, customers, planners, venues, vendors, partners
4. **Work** — one persistent Engagement from inquiry through delivery and closeout
5. **Time** — schedules, calls, logistics, warehouse work, commitments and follow-up
6. **Money** — Price, Sale, Cost and Cash kept separate

Evidence, files, communication, history, Unknown and Capture/AI surround and support those six domains rather than replacing them.

One canonical Engagement persists through:

**intent → requirements → solution → feasibility → commercial decision → commitment → preparation → delivery → economic close → learning → recurrence**

Architecture rule:

> **Populate and use existing canonical homes before adding abstractions. Reality outranks model. Unknown is legitimate data.**

Frontend rule:

> **Store richly. Interpret centrally. Present selectively. Reveal progressively.**

Major frontend redesign remains secondary to Operational Core adoption.

---

## Operational Core direction

Stage Presence has already described the normal job path sufficiently. The current build is no longer trying to rediscover a generic “perfect job.”

The operating spine is now:

**customer demand → scope → expected cost → pricing/quote → customer commitment → equipment/people/time commitment → fulfillment → actuals → payment → return/reset → closeout/learning**

The immediate backend build sequence is:

1. **Price Book** — reusable governed selling-price authority
2. **Cost Book** — reusable governed internal/external cost assumptions
3. **Estimate Runtime** — job-specific expected costs
4. **Pricing Runtime** — scope + approved price policy + expected cost → commercial decision support
5. **Commercial → Operations Bridge** — accepted scope creates the commitments/work actually supported by evidence
6. **Fulfillment Runtime** — pull/load/deliver or pickup/setup/operate or install/strike/return/inspect/restock
7. **Actuals** — actual equipment, labor, direct costs, payments and outcome
8. **Closeout / Learning** — relationship, venue, crew, asset, pricing and process memory improve from delivered work

This spine is part of the larger OS; it does not replace Warehouse, Relationships, Calendar, Knowledge, Capture/AI, Files, Communication or accounting handoff.

---

## Canonical homes

- Engagement identity/lifecycle → `engagements`
- People/organizations → `parties`
- reusable Party relationships → `party_relationships`
- Engagement participant roles → `engagement_parties`
- venues/sites → `locations` + `engagement_locations`
- requirements/constraints/unknown/conflicting truth → `engagement_facts`
- next movement/waiting/blockers → `work_items`
- Resource/capability relevance → `engagement_resources`
- commercial scope/evidence → `commercial_documents` + `commercial_document_lines`
- accepted/prepared fulfillment → `fulfillment_plans` + `fulfillment_plan_lines`
- execution timing → `engagement_schedule_items`
- contributor identity/capability → `team_members` + `team_member_capabilities`
- job-specific crew assignment → `engagement_assignments`
- reusable internal/external cost assumptions → `economic_rate_profiles`
- reusable selling-price policy → `pricing_rules`
- direct Engagement costs → `engagement_cost_items`
- equipment hold/reservation/allocation → `resource_commitments`
- actual equipment use → `resource_usage`
- expected payment terms → `commercial_payment_schedule`
- actual payment evidence → `commercial_payments`
- reusable process knowledge → `operating_playbooks` + `operating_playbook_steps`
- actual process-state claims → `engagement_step_states`
- delivery learning → `engagement_closeouts`
- original evidence/provenance → `source_artifacts` + `source_artifact_segments` + `events`

Compatibility fields remain fallback/history rather than future write authority when a canonical domain exists.

---

## Live backend snapshot

Current production reality after the Price Book + Cost Book foundation activation:

- active Engagements: **30**
- customer/contact Parties: **20**
- active Resources: **102**
- active team members: **11**
- commercial documents: **30**
- commercial document lines: **208**
- fulfillment plans: **30**
- fulfillment plan lines: **208**
- Engagement-resource links: **132**
- normalized Locations: **21**
- schedule items: **40**
- persisted open Work items: **7**
- Engagement step states: **7**
- Engagement assignments: **1**
- Resource commitments: **0**
- Resource usage records: **0**
- Engagement direct-cost items: **0**
- structured payment transactions: **0**
- Engagement closeouts: **0**

Interpretation:

> **The backend contains substantial commercial/configuration knowledge, but normal Stage Presence execution still has almost no native commitment/actual records. Operational adoption remains the main constraint.**

---

## Price Book foundation — LIVE

Canonical design: `docs/PRICE_COST_BOOK_FOUNDATION_V1.md`.

`pricing_rules` is now the governed reusable selling-price home.

### Pricing policy dimensions now supported

- `price_position`
  - `STANDARD`
  - `ECONOMIC_FLOOR`
  - `COMMERCIAL_FLOOR`
  - `TARGET`
  - `VALUE_REFERENCE`
- `billing_basis`
  - `FLAT`
  - `PER_UNIT`
  - `PER_HOUR`
  - `PER_DAY`
  - `PER_MILE`
  - `PERCENT`
  - `OTHER`
- duration as `duration_value` + `duration_unit`
  - hour / day / week / month / event
- pricing scope now includes `ROLE` in addition to Resource/category/Engagement-type/general scope

This deliberately separates charge basis from duration so Stage Presence can faithfully represent real structures such as:

> **$80 per LED panel per day**

rather than forcing that meaning into one ambiguous rate type.

### Governance state

Current live Price Book rules:
- total pricing rules: **10**
- `DRAFT`: **10**
- `APPROVED`: **0**

No current price has been silently promoted into company policy.

Initial DRAFT candidates include:
- 17x10 LED Trailer — $4,500 / 1 day reference candidate
- 12x7 LED Trailer — $3,500 / 1 day reference candidate
- 10x5 LED Trailer — $2,000 / event legacy candidate
- 3.9mm LED Panels — $80 / unit / day reference candidate
- Delivery & Pickup — $350 / event flat candidate
- Load-in — $200 / event flat candidate
- Content & Video Tech — $1,000 / event flat candidate
- A1 sell rate — $750/day historical candidate
- A2 sell rate — $500/day historical candidate
- Project Manager sell rate — $1,000/day historical candidate

These are evidence/review candidates only.

LED Poster pricing was intentionally **not** promoted because the current `$500` reference does not establish whether it is per-panel, package, minimum or another commercial structure.

### `price_book_v`

Live governed Price Book/evidence contract.

Current authority coverage across its 105 rows:
- `DRAFT_CANDIDATE`: **10**
- `CURRENT_REFERENCE_ONLY`: **30**
- `HISTORICAL_ONLY`: **4**
- `NO_PRICE_EVIDENCE`: **61**
- `APPROVED_AUTHORITY`: **0**

Historical zero-dollar lines are counted separately and are not treated as evidence that normal price is zero.

The current approved-rule view remains backward-compatible; existing quote-readiness contracts still return all **30** Engagements after the migration.

---

## Cost Book foundation — LIVE

`economic_rate_profiles` remains the governed reusable cost-assumption home.

Current live reusable cost profiles:
- total: **2**
- `DRAFT`: **2**
- `APPROVED`: **0**

Represented DRAFT evidence:
- Scott — **$80/hour** pay-rate candidate
- Ben — **$80/hour** pay-rate candidate

Neither is automatically applied to a job and neither is approved company cost policy.

### `cost_book_v`

Live cost-authority/coverage contract.

Current active-team coverage:
- `DRAFT_CANDIDATE`: **2**
- `NO_RATE_EVIDENCE`: **9**
- `APPROVED_AUTHORITY`: **0**

The nine missing contributor rates remain explicit Unknowns rather than becoming zero-cost labor.

Cost Book can also later represent Resource, vendor/Party, role, category and general assumptions across labor, assets, subcontract, logistics, travel, materials, fees, overhead and other domains.

---

## Engagement estimate foundation — LIVE

`engagement_cost_items` already supports:
- `ESTIMATE`
- `COMMITTED`
- `ACTUAL`
- `CANCELLED`

and can snapshot quantity, unit cost, applied rate, rate basis, contributor, Resource, vendor/counterparty and reusable rate profile.

`engagement_estimate_position_v` now exposes those cost states separately for each Engagement.

Current production result:
- Engagement rows: **30**
- `NO_COST_EVIDENCE`: **30**

That is intentionally truthful. Customer-facing commercial lines are not assumed to be Stage Presence internal cost.

The next backend petal is to start creating real Engagement-specific estimates from actual scope rather than invent another cost subsystem.

---

## Economic constitution

The economy remains layered:

**Price → Sale → Cost → Cash**

These are not interchangeable.

- **Price** — reusable or contextual selling guidance
- **Sale** — what the customer actually agreed to
- **Cost** — what fulfillment costs Stage Presence
- **Cash** — what actually moved

Additional guardrails:
- Sale ≠ contribution
- contribution ≠ company profit
- document `amount_paid` evidence ≠ verified payment transaction ledger
- historical price ≠ current pricing authority
- reusable rate ≠ job-specific applied rate
- estimate ≠ committed cost ≠ actual cost

QuickBooks Desktop remains formal accounting / GL authority.

Current imported commercial rollup remains useful evidence, but direct-cost and structured cash actuals are still materially incomplete.

---

## Things / Warehouse reality

`resources` currently represents a broad capability/catalog universe and is **not yet a verified physical asset register**.

Current important boundaries remain:
- configured Resource ≠ reserved Resource
- catalog/capability identity ≠ verified physical inventory
- Goodshuffle quantity ≠ audited warehouse quantity
- Goodshuffle price ≠ approved Price Book policy

Current Resource actuals:
- commitments: **0**
- usage: **0**

The Warehouse Sweep remains required to physically reconcile identity, quantity, ownership, condition, location and asset-level reality.

Normal future warehouse runtime should progressively cover:

**available → reserved → pull → loaded → deployed/picked-up → returned → inspected → maintenance issue if needed → restocked → available**

Do not claim utilization until commitment/usage evidence exists.

---

## People / Crew reality

Known roster remains represented:
- Greg Walker
- Sean Stalker
- Nancy
- Bryan Mahanes
- Eric Jennings
- Kevin
- Scott
- Ben
- David
- Rico
- Hank Futch

Identity/capability representation is much stronger than job-level labor reality.

Current:
- active team members: **11**
- Engagement assignments: **1**
- approved reusable contributor cost rates: **0**

For real jobs the runtime still needs to establish:

**person → job role → planned time → agreed job rate → expected labor cost → actual time → actual labor cost**

Default/reusable rate, job-specific applied rate and actual cost remain separate.

---

## Relationships reality

Current imported Party data remains shallow compared with Greg's actual relationship network.

Important target semantics remain:
- one reusable Person/Organization identity wherever possible
- reusable person↔organization/vendor/partner/referrer relationships
- job-specific role separately represented through `engagement_parties`
- relationship history compounds across Engagements rather than recreating contacts per job

The Relationship Sweep remains necessary for Greg's contacts, Goodshuffle history, planners, venues, vendors, partners, universities, hospitality and recurring accounts.

---

## Time / Calendar reality

Job schedule truth exists in `engagement_schedule_items`; Work items carry action due dates; Resource commitments and crew assignments will add capacity timing as operational adoption grows.

The company calendar should eventually be a read projection across timed canonical truth rather than one table owning every date in the company.

Current schedule items: **40**.

Do not infer crew availability or physical Resource availability merely from Engagement dates.

---

## Evidence / Capture / AI

Chat-first interpretation remains a temporary validation bridge:

**real business input → ChatGPT interpretation → Stage Presence OS structured update**

Long-term target remains native secure Stage Presence capture with source retention, interpretation/matching, review candidates and exception-only human intervention.

AI may propose structure or pricing/cost interpretation, but it does not become authority for:
- accepted scope
- approved pricing
- pay/cost policy
- Resource commitments
- payment verification
- signatures
- deletion

The agent reasons. The system remembers.

---

## Current non-claims

Stage Presence OS does **not** currently claim:
- approved company Price Book policy
- approved internal cost-rate library
- complete Warehouse/asset register
- trustworthy equipment availability from reservation truth
- trustworthy utilization history
- complete crew scheduling
- complete direct-cost history
- complete payment transaction history
- accounting profit or cash-on-hand
- live QuickBooks sync
- live Goodshuffle sync
- mature native AI interpreter
- final role-specific frontend architecture

---

## Current next build

The Price Book + Cost Book foundation is live and verified.

The next Operational Core build should be:

### 1. Price Sweep
Human-govern the highest-value DRAFT/reference/conflicting prices rather than bulk-approving the catalog.

### 2. Cost Sweep
Confirm contributor/vendor/material/logistics cost assumptions where they affect real decisions.

### 3. Estimate Runtime
Use current `engagement_cost_items` to construct real job-specific expected costs from scope, beginning with actual active Stage Presence work.

### 4. Pricing Runtime
Combine scope + approved/reviewable pricing + expected direct cost into transparent quote decision support while preserving human negotiation.

### 5. Commercial → Operations Bridge
Once scope is actually accepted, deliberately establish the Resource commitments, crew assignments, schedule, payment expectations and operational work that are supported by reality.

The governing test remains:

> **Can Stage Presence run a real job from customer request through pricing, commitment, fulfillment, payment, return/reset and closeout without reconstructing reality from Greg's memory?**

Operational Core v1 succeeds when the answer becomes yes repeatedly, not when another dashboard exists.
