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

The frontend presentation rule is:

> **Store richly. Interpret centrally. Present selectively. Reveal progressively.**

New backend truth is invisible by default until intentionally promoted through a business read contract and presentation model.

## Governing references
- `docs/BUSINESS_MODEL_CURRENT.md`
- `docs/FRONTEND_OPERATING_CONTRACT.md`
- `docs/PRESENTATION_ARCHITECTURE.md`
- `docs/JOB_LIFECYCLE_PLAYBOOK.md`
- `docs/SELECTIVE_MOVEMENT_ENGINE.md`
- `docs/ECONOMIC_TRANSPARENCY.md`
- `docs/DATA_MODEL.md`
- `docs/DECISIONS.md`

## Core constitutional distinctions

- source evidence != structured business truth
- customer request != technical requirement
- commercial document != fulfillment plan
- configured != required != pressure != hold != reservation/allocation != actual usage
- reusable Playbook knowledge != actual job state
- derived movement recommendation != persisted work
- role assignment != concrete lifecycle responsibility
- historical price != current approved pricing authority
- quoted value != committed revenue != invoice != collected cash
- collected cash != current company funds
- revenue != direct cost != contribution
- contribution != accounting profit
- reusable cost rate != a historical job cost
- missing cost evidence != $0 cost
- generated document != canonical truth
- unknown is legitimate data

## Current translated reality

- 30 active Goodshuffle-derived Engagements
- 20 identified customer/contact Parties
- 30 commercial documents
- **208 recovered commercial document lines**
- 30 fulfillment plans
- **208 fulfillment plan lines**
- commercial and fulfillment sources reconcile 208-for-208 by project/row count
- 204 rows align by source order + normalized title
- 127 commercial rows inherit exact Goodshuffle item/Resource links
- 4 conflicting commercial/fulfillment rows deliberately remain unlinked
- 128 exact fulfillment Resource links by Goodshuffle external ID
- 2 unmatched Film Festival service IDs remain unresolved rather than name-matched
- 1 zero-quantity Shellabration promotional line preserved
- 3 package-child lines preserved and excluded from independent pricing decisions
- 90 source-artifact segments
- 21 normalized locations / 28 Engagement-location links
- 7 persisted system-derived work items

Original Goodshuffle binaries are not generally stored in Supabase Storage. Provenance does not imply binary recoverability.

## Frontend now

Top-level operating surfaces:
- **Today** — persisted Needs You + derived System Sees + delivery/sales/capacity/relationship context
- **Work** — Opportunities / Upcoming Jobs / Past or Needs Resolution
- **Economy** — company commercial/economic transparency
- **Resources** — capability/resource reference
- **Playbook** — reusable lifecycle knowledge

Today and Work share `presentationModel.ts` / `EngagementSummaryCard` semantics so screens do not independently reinterpret backend fields.

Presentation tiers remain:

**ATTENTION → SUMMARY → OPERATING_DETAIL → REFERENCE → EVIDENCE**

Engagement detail now progressively exposes:
- business story
- selective movement
- Engagement economy
- quote intelligence
- Job Map
- deeper working details/evidence
- learning closeout

## Economic transparency — live backend

Canonical: `docs/ECONOMIC_TRANSPARENCY.md`.

The economic flow is now modeled as:

**price → revenue source → invoice → collection → balance owed → direct cost → contribution → optional company-funds evidence**

### Revenue and cash contracts

- `engagement_revenue_sources_v` — line-level explanation of where current commercial value comes from
- `engagement_money_position_v` — proposal, committed, invoiced, collected, outstanding, payment schedule and cash-evidence freshness
- `engagement_economy_v` — complete per-Engagement operating economy
- `economy_overview_v` — company-level operating-economy rollup

Current observed rollup from imported evidence:
- open proposal value: about **$89.8k**
- supported committed revenue: about **$127.8k**
- observed collected: about **$56.3k**
- represented outstanding: about **$71.5k**

These are operating evidence, not audited statements.

Current cash evidence is primarily the Sep 9 Goodshuffle/document snapshot. It is not live accounting or bank truth.

### Direct costs

`engagement_cost_items` supports ESTIMATE / COMMITTED / ACTUAL / CANCELLED and now covers:
- labor
- subcontract
- external equipment rental
- owned-equipment internal allocation
- transport/travel/lodging/per diem/fuel
- materials/purchases/maintenance
- processing fees
- explicitly allocated overhead
- other direct costs

A cost may point to a Resource, contributor, vendor/Party, commercial line, fulfillment line, assignment and reusable rate profile.

Current direct-cost rows: **0** at migration time.

Therefore current contribution/profit must not be inferred. All 24 economically allocated Engagements show revenue visible/costs unpopulated; six UNC component Engagements remain program-allocation unknown.

The Engagement Money panel now includes a minimal manual cost-capture seam so real estimates/committed costs/actuals can begin populating from live work. Cancelling a record preserves history rather than deleting it.

### Effective-dated rates

`economic_rate_profiles` is the reusable, versioned cost-assumption library.

It can represent asset, labor, subcontract, logistics, travel, material, fee, overhead and other assumptions with Resource/member/Party/role/category/general scope.

Supported examples include ownership allocation, maintenance reserve, replacement reference, internal labor cost, external vendor cost, pay and burdened cost.

`economic_rate_current_v` exposes only APPROVED profiles effective today.

Current rate profiles: **0**. Nothing was seeded from assumption merely to populate the screen.

Historical job cost snapshots store the applied rate/amount; changing a future reusable rate therefore does not rewrite prior Engagement economics.

### Company funds seam

`financial_accounts` + append-oriented `financial_account_snapshots` provide a future home for actual bank/cash/credit/loan evidence.

Normalized balance convention:
- positive = value available/owned by Stage Presence
- negative = obligation owed by Stage Presence

`financial_account_current_v` exposes the latest represented snapshot per active account.

Current financial accounts/snapshots: **0**. The frontend therefore says funds are not represented rather than treating collections as cash-on-hand.

## Pricing + quote intelligence

Recovered historical commercial lines now support `pricing_observations_v`.

Governed pricing remains separate in `pricing_rules` / `pricing_rule_current_v`.

Current approved pricing rules: **0** by design.

`engagement_quote_line_candidates_v` and `engagement_quote_readiness_v` may expose current references, historical evidence and gaps without promoting any of them to approved price authority.

Package children are visible scope components but `NON_PRICED_COMPONENT` for independent pricing judgment.

Frontend `Quote intelligence` is Engagement-scoped and read-only. It cannot send/approve/change a quote.

## Job lifecycle knowledge

Active Playbook:
- `STAGE_PRESENCE_CORE_LIFECYCLE` v1
- 105 reusable steps
- 13 phases
- universal + EVENT / LONG_TERM_RENTAL / INSTALLATION / EQUIPMENT_SALE / SERVICE branches

Technical/safety maturity remains explicit:
`MAP_ONLY / CHECKLIST / SOP / VERIFIED_SOP`.

Current persisted `engagement_step_states`: **0**. No historical completion was manufactured.

All 7 current real work items are mapped to relevant Playbook steps; the Playbook is not materialized as 105 tasks per job.

## Assignment depth

`engagement_assignments` = who this contributor is on the Engagement.

`engagement_step_assignments` = what lifecycle responsibility they lead/support/approve/consult/are informed about.

Current reality remains:
- `team_members`: 0
- `engagement_assignments`: 0
- `engagement_step_assignments`: 0

No contributor truth is invented.

## Selective Movement

`engagement_movement_candidates_v` and `engagement_operating_focus_v` remain read-only deterministic reasoning.

Ordering: **NOW → SOON → WATCH → LATER**, then materiality/consequence/economic context.

Frontend distinction remains:

**Needs You = persisted business work**

**System Sees = derived recommendation**

No recommendation autonomously creates a task, assignment, reservation, message or approval yet.

## UNC economic guardrail

The UNC season carries $102,000 observed committed value with a Sep 9 snapshot of $51,000 observed collected / $51,000 observed remaining.

Six component game documents literally contain $0 while explicit evidence says per-game economic allocation is unknown.

They remain:
- `value_basis = PROGRAM_ALLOCATION_UNKNOWN`
- `committed_revenue_observed = null`
- `economy_state = PROGRAM_ALLOCATION_UNKNOWN`

They are never interpreted as free work.

## Security + scale

- authenticated active `app_members` remain the internal access boundary
- new economic tables have RLS
- browser-facing derived views use `security_invoker=true`
- anonymous Data API privileges are explicitly revoked
- service credentials remain server-only
- external client access is still not activated
- no unrelated infrastructure is touched

Current Supabase security advisor continues to report only the existing leaked-password-protection warning. New economic relations do not add a new security advisor class.

## Current boundaries

Not currently claimed:
- live Goodshuffle sync
- QuickBooks/accounting sync
- bank balance/account connection
- complete payment-event history
- audited cost completeness
- accounting profit or tax basis
- automatic asset depreciation
- populated/approved internal rate library
- automatic rate application to jobs
- automated quote approval/sending
- actual equipment holds/reservations/usage
- populated contributor roster/availability
- automatic crew scheduling
- external client login
- authenticated post-deploy browser verification until independently observed

## Current operating experiment

Stage Presence OS should now be used alongside real work.

For economics, the learning loop is:

**sell value → observe collection → capture expected/actual direct cost → compare contribution → identify repeated rate patterns → promote governed cost assumptions → improve pricing/source/capacity/staffing decisions → repeat.**

The next economic data should come from reality rather than invented completeness.
