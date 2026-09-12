# Current State — 2026-09-12

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

Frontend presentation rule:

> **Store richly. Interpret centrally. Present selectively. Reveal progressively.**

Current architecture rule:

> **Populate and use existing canonical homes before adding abstractions. Compatibility fields may remain for inherited reality, but new workflows must not reinforce duplicate truth.**

## Current operating sequence

1. Populate and use what already exists.
2. Move information to its canonical home.
3. Stop creating duplicate truth.
4. Observe where the model genuinely fails.
5. Only then migrate.

The two largest possible missing abstractions remain **solution design** and **explicit commitment/change-control**, but neither is currently approved for schema expansion. They must be earned by repeated real operating failure that the present model cannot faithfully represent.

## Canonical homes now enforced

- Venues / sites → `locations` + `engagement_locations`
- Real next actions / waiting / blockers → `work_items`
- Requirements / constraints / unresolved truth → `engagement_facts`
- Resource relevance / need → `engagement_resources`
- Accepted operational scope → `fulfillment_plans` + `fulfillment_plan_lines`
- Execution timing → `engagement_schedule_items`
- Reusable process knowledge → `operating_playbook_steps`
- Actual job process state → `engagement_step_states`
- Contributor identity / capability → `team_members` + `team_member_capabilities`
- Job assignment → `engagement_assignments` only when job-specific evidence exists
- Capacity commitment → `resource_commitments` only when a hold/reservation/allocation actually exists
- Actual deployment/use → `resource_usage`
- Payments → `commercial_payments` only for actual transaction evidence beyond aggregate baselines
- Direct costs → `engagement_cost_items`
- Delivery learning → `engagement_closeouts`

Compatibility fields such as `engagements.venue_name`, `next_action`, `next_action_at`, `waiting_on` and `blocked_reason` remain inherited fallback data. PR #21 changes the application write boundary so new Venue and Next Move input is written to canonical Location/Work records and projected back through the UI rather than reinforcing those fields.

## Current translated reality

- 30 active Goodshuffle-derived Engagements
- 20 identified customer/contact Parties
- 30 commercial documents
- 208 commercial document lines
- 30 fulfillment plans
- 208 fulfillment plan lines
- commercial and fulfillment sources reconcile 208-for-208
- 132 Engagement-resource links after closing the final known fulfillment→Resource gap
- 21 normalized locations / 28 inherited Engagement-location links; no current legacy venue-without-Location gap remains
- 37 native schedule items promoted from existing fulfillment timing evidence
- 7 persisted open work items
- 7 matching `engagement_step_states`; every current persisted work item is linked to its represented Playbook step state
- 11 active contributor identities
- 13 confirmed capability tags; proficiency remains intentionally unknown where not evidenced
- 90 source-artifact segments

Original Goodshuffle binaries are not generally stored in Supabase Storage. Provenance does not imply binary recoverability.

## Canonical population pass — 2026-09-12

### Contributor reality
`team_members` is now populated with the currently known Stage Presence roster supplied by the business: Greg Walker, Sean Stalker, Nancy, Bryan Mahanes, Eric Jennings, Kevin, Scott, Ben, David, Rico and Hank Futch.

Only supported capability existence was added. Employment classification and proficiency were deliberately not inferred. Bryan and Eric remain represented people without fabricated capability detail.

Current:
- `team_members`: **11**
- `team_member_capabilities`: **13**
- `engagement_assignments`: **0**
- `engagement_step_assignments`: **0**

General company role is not job-specific assignment evidence.

### Schedule truth
37 `engagement_schedule_items` were promoted from existing fulfillment timing evidence.

Rules used:
- preserve explicit source date/timing text;
- preserve `TBD` as `TBD`;
- do not manufacture clock timestamps merely because source text contains a human-readable time;
- retain source artifact/segment provenance;
- attach canonical Location where already known;
- use schedule types conservatively (`LOAD_IN`, `LOAD_OUT`, `PREP`, `PICKUP`, `RETURN`, `DELIVERY`, `OTHER`).

The Recovery Queue's schedule-recovery lane fell from 21 candidates to 0 after the evidence moved to its canonical home.

### Playbook state
The seven real persisted work items already referenced Playbook steps. Seven matching `engagement_step_states` were therefore created and linked back to those work items.

No historical checklist was invented. Missing step state still means **untracked / not asserted**, not incomplete.

### Resource canonicalization
One remaining fulfillment Resource had no corresponding `engagement_resources` link:
- SP-000007 — Genie-Sarah Lillie
- 5x10 Video Trailer Double
- quantity 1

That accepted fulfillment evidence is now represented as `CONFIGURED` Resource truth with the inherited requirement window and source provenance.

Known fulfillment→Resource canonical gaps: **0**.

## Recovery Queue

Recovery is a derived decision-leverage layer, not a second truth database.

Architecture:

**existing evidence / unresolved truth / operating gaps → `recovery_queue_v` → review disposition → correct canonical home**

Human disposition lives in `recovery_item_decisions`; the underlying truth continues to live in its owning domain.

Initial activation before the population pass:
- 54 active candidates
- 12 NOW
- 21 directly recoverable

After moving recoverable evidence into existing canonical structures:
- 33 active candidates
- 6 NOW
- 0 in the direct `RECOVER` lane

This reduction is important evidence: much of the apparent incompleteness was an adoption/population problem, not a missing-schema problem.

## Legacy action boundary

There are 24 inherited `engagements.next_action` values without current open Work records. They were inspected rather than automatically migrated.

Most are import placeholders such as:
- `Review operational readiness`
- `Review quote status and set follow-up`

These are explicitly **not** promoted into `work_items`. A database blank or historical placeholder is not a business obligation.

New workflows are moving to canonical Work while these inherited fields remain compatibility/history fallback only.

## Frontend now

Top-level operating surfaces:
- **Today** — persisted Needs You + derived System Sees + delivery/sales/capacity/relationship context
- **Work** — Opportunities / Upcoming Jobs / Past or Needs Resolution
- **Recovery** — decision-leverage recovery/review queue; defaults to what matters now
- **Economy** — company commercial/economic transparency + evidence coverage
- **Resources** — capability/resource reference
- **Playbook** — reusable lifecycle knowledge

Engagement detail progressively exposes:
- business story
- selective movement
- Engagement economy
- quote intelligence
- Job Map
- deeper working details/evidence
- learning closeout

PR #21 introduces a compatibility presentation boundary that reads canonical Location/Work first and inherited Engagement fields only as fallback, so frontend continuity does not require duplicate write authority.

## Economic transparency

The economy remains four connected layers:

**Engagement economics + company operating costs + asset economics + funds/accounts**

Commercial flow:

**price → revenue source → invoice → collection → balance owed → direct cost → contribution**

Current imported rollup remains approximately:
- open proposal value: ~$89.8k
- supported committed revenue: ~$127.8k
- observed collected: ~$56.3k
- represented outstanding: ~$71.5k

Current evidence boundaries remain intentional:
- `commercial_payments`: **0** transaction rows — aggregate imported collection evidence is not rewritten as fake transactions
- `engagement_cost_items`: **0** — customer-facing line prices are not assumed to be internal costs
- `company_cost_items`: **0**
- approved/draft economic rate profiles represented in live evidence: **0**
- financial accounts/snapshots: **0**
- resource economic snapshots: **0**

Therefore no accounting-profit or cash-on-hand claim is earned.

## Capacity truth

Sequence remains:

**configuration → requirement window → pressure → hold → reservation/allocation → actual usage**

Current:
- `engagement_resources`: **132**
- `resource_commitments`: **0**
- `resource_usage`: **0**

Signed/configured work is not automatically a hold, reservation or actual deployment.

## Assignment + closeout boundaries

Current:
- `engagement_assignments`: **0**
- `engagement_step_assignments`: **0**
- `engagement_closeouts`: **0**

This is intentional until actual job-specific contributor responsibility and actual delivery/learning evidence arrive.

For example, general contributor roles do not justify creating assignments, and a proposed Snyder wedding scope mentioning Hank Futch does not justify a confirmed job assignment while the Engagement remains uncommitted.

## Selective Movement

`engagement_movement_candidates_v` and `engagement_operating_focus_v` remain read-only deterministic reasoning.

Ordering: **NOW → SOON → WATCH → LATER**, then materiality/consequence/economic context.

**Needs You = persisted business work**  
**System Sees = derived recommendation**  
**Recovery = evidence/review opportunity, not automatic work**

No recommendation autonomously creates a task, assignment, reservation, message or approval.

## UNC economic guardrail

The UNC season carries $102,000 observed committed value with a Sep 9 baseline of $51,000 observed collected / $51,000 observed remaining.

Six component game documents contain literal `$0` while explicit evidence says per-game allocation is unknown. They remain economically unknown and are never interpreted as free work.

## Current true evidence counts

- Engagements: **30**
- commercial lines: **208**
- fulfillment lines: **208**
- Engagement-resource links: **132**
- normalized Locations: **21**
- Engagement-location links: **28** inherited links
- schedule items: **37**
- open work items: **7**
- Engagement step states: **7**
- team members: **11**
- capability tags: **13**
- assignments: **0**
- payment transactions: **0**
- direct job cost items: **0**
- resource commitments: **0**
- resource usage: **0**
- closeouts: **0**
- Recovery active candidates: **33**
- Recovery NOW candidates: **6**
- Recovery direct-recover lane: **0**

## Current boundaries

Not currently claimed:
- live Goodshuffle sync
- QuickBooks/accounting sync
- bank/account connection
- complete historical payment-event reconstruction
- audited direct-cost/company-cost completeness
- accounting profit or tax basis
- automatic asset depreciation or formal book value
- approved internal cost-rate library
- automated quote approval/sending
- equipment holds/reservations/usage not evidenced in reality
- job assignments not evidenced in reality
- automatic crew scheduling
- external client login
- mature native AI interpreter
- a first-class solution-design aggregate
- a first-class commitment/change-order aggregate

## Current next-center test

Use the system against real Stage Presence work and ask:

1. Can existing structures faithfully hold the reality once it arrives?
2. Does a canonical fact have one owner/home?
3. Does the UI stay simple while reading that richer reality?
4. Which repeated real failure, if any, cannot be represented without a new abstraction?

Only after that evidence should solution design, commitment/change-control, or another schema expansion be designed.
