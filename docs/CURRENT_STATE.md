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

Frontend presentation rule:

> **Store richly. Interpret centrally. Present selectively. Reveal progressively.**

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
- direct job cost != company operating cost
- operational inventory != asset economic value
- contribution != accounting profit
- reusable cost rate != a historical job cost
- aggregate collection snapshot != transaction ledger
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
- **Economy** — company commercial/economic transparency + economic-structure capture
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

## Economic transparency — completed operating structure

Canonical: `docs/ECONOMIC_TRANSPARENCY.md`.

The economy is intentionally four connected layers:

**Engagement economics + company operating costs + asset economics + funds/accounts**

Commercial flow remains:

**price → revenue source → invoice → collection → balance owed → direct job cost → contribution**

Company economy then adds operating-cost, asset and account evidence without promoting partial coverage into profit.

### Revenue + cash

Primary read contracts:
- `engagement_revenue_sources_v`
- `engagement_cash_position_v`
- `engagement_money_position_v`
- `engagement_economy_v`
- `economy_overview_v`

Current observed imported rollup remains approximately:
- open proposal value: **$89.8k**
- supported committed revenue: **$127.8k**
- observed collected: **$56.3k**
- represented outstanding: **$71.5k**

Imported/document collection values are now treated as dated aggregate baselines. `commercial_payments` represents later transaction evidence. Only payments after the baseline date are incremented, preventing both stale cash views and historical double counting.

A transactional test against the UNC season proved the rule: a temporary $1,000 Sep 10 payment moved the Sep 9 $51,000/$51,000 collected/outstanding baseline to $52,000/$50,000 and was then rolled back.

Current persisted payment rows: **0**.

### Direct Engagement costs

`engagement_cost_items` supports ESTIMATE / COMMITTED / ACTUAL / CANCELLED across labor, subcontract, rentals, owned-equipment allocation, logistics/travel, materials/purchases/maintenance, fees, allocated overhead and other directly caused costs.

Current direct-cost rows: **0**.

Therefore no current Engagement or company profit claim is earned. Revenue-visible jobs remain explicitly cost-unpopulated until real cost evidence is entered.

### Company operating costs

`company_cost_items` now represents costs that should not be forced onto one job: admin labor, software, insurance, facility, vehicle, marketing, professional, license/tax, financing, equipment, maintenance, utilities, office, training and other operating costs.

`company_cost_breakdown_v` groups these into operating-economy buckets while preserving estimate/committed/actual/cancelled state and optional account/vendor/resource/rate links.

Current company operating-cost rows: **0**. `economy_overview_v` therefore reports `NO_COMPANY_COST_DATA`, not $0 overhead.

### Effective-dated rates

`economic_rate_profiles` remains the versioned reusable assumption library for asset, labor, subcontract, logistics, travel, materials, fees, overhead and other costs.

The frontend creates **DRAFT** rates only. Approval is a separate governance action and no rate is automatically applied to a job.

Current rate profiles: **0**.

### Asset economics

`resource_economic_snapshots` is an append-oriented evidence layer for Resource ownership state, represented quantity, acquisition cost, current value estimate, replacement cost, financing balance and annual maintenance estimate.

`resource_economy_current_v` exposes the latest snapshot per Resource.

Operational Resource truth—quantity, capacity, commitments and usage—remains separate from economic valuation.

Current asset-economic snapshots: **0**. Existing Resource records do not imply ownership or value.

### Funds/accounts

`financial_accounts` + append-oriented `financial_account_snapshots` represent actual bank/cash/credit/loan evidence.

Balance convention:
- positive = Stage Presence asset/value
- negative = liability/obligation

The frontend lets users enter a liability as a positive amount owed and normalizes the sign internally.

Current financial accounts/snapshots: **0**. Collected job revenue is therefore not presented as cash-on-hand.

### Economy frontend behavior

Top-level Economy presents:
- Open proposals
- Committed
- Collected
- Outstanding
- Actual funds
- Job cost visibility
- Company costs YTD
- Asset value represented
- Contribution where supported
- explicit economy evidence state

Heavy structure is progressively disclosed under:
- Accounts + funds
- Company operating costs
- Asset economics
- Cost rates + assumptions

Engagement Money presents:
- commercial value / invoice / collected / outstanding
- line-level revenue source mix
- collection baseline + newer payment bridge
- direct cost estimate/commitment/actual
- contribution only where supportable
- direct-cost capture
- post-baseline payment capture

UNC component Engagements with unknown program allocation do not expose misleading payment capture.

## Pricing + quote intelligence

Recovered historical commercial lines support `pricing_observations_v`.

Governed pricing remains separate in `pricing_rules` / `pricing_rule_current_v`; current approved pricing rules remain **0** by design.

`engagement_quote_line_candidates_v` and `engagement_quote_readiness_v` expose evidence/readiness without promoting history/reference prices to approved authority. Package children remain visible non-independent pricing components.

## Job lifecycle knowledge

Active Playbook:
- `STAGE_PRESENCE_CORE_LIFECYCLE` v1
- 105 reusable steps
- 13 phases
- universal + EVENT / LONG_TERM_RENTAL / INSTALLATION / EQUIPMENT_SALE / SERVICE branches

Technical/safety maturity remains `MAP_ONLY / CHECKLIST / SOP / VERIFIED_SOP`.

Current persisted `engagement_step_states`: **0**. All 7 current real work items remain mapped to relevant Playbook steps; no fake historical checklist was created.

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

**Needs You = persisted business work**

**System Sees = derived recommendation**

No recommendation autonomously creates a task, assignment, reservation, message or approval yet.

## UNC economic guardrail

The UNC season carries $102,000 observed committed value with a Sep 9 baseline of $51,000 observed collected / $51,000 observed remaining.

Six component game documents literally contain $0 while explicit evidence says per-game economic allocation is unknown. They remain:
- `value_basis = PROGRAM_ALLOCATION_UNKNOWN`
- `committed_revenue_observed = null`
- `economy_state = PROGRAM_ALLOCATION_UNKNOWN`

They are never interpreted as free work.

## Security + scale

- authenticated active `app_members` remain the internal access boundary
- exposed economic tables use RLS
- browser-facing views use `security_invoker=true`
- anonymous Data API privileges are explicitly revoked
- service credentials remain server-only
- external client access remains inactive
- no unrelated infrastructure is touched

## Current true evidence counts

- Engagements: 30
- commercial lines: 208
- fulfillment lines: 208
- open work items: 7
- UNC unknown allocations: 6
- commercial payment transactions: 0
- direct job cost items: 0
- company operating cost items: 0
- economic rate profiles: 0
- financial accounts: 0
- financial account snapshots: 0
- asset economic snapshots: 0
- team members: 0
- assignments: 0
- resource commitments: 0
- resource usage: 0

## Current boundaries

Not currently claimed:
- live Goodshuffle sync
- QuickBooks/accounting sync
- bank/account connection
- complete historical payment-event reconstruction
- audited direct-cost completeness
- audited company operating-cost completeness
- accounting profit or tax basis
- automatic asset depreciation or formal book value
- populated/approved internal rate library
- automatic rate application to jobs
- automated quote approval/sending
- actual equipment holds/reservations/usage
- populated contributor roster/availability
- automatic crew scheduling
- external client login
- authenticated post-deploy browser verification until independently observed

## Current operating experiment

Use Stage Presence OS alongside real work. The economic learning loop is now structurally complete enough to learn from reality:

**sell value → preserve collection baseline → add later receipts → capture expected/actual job costs → capture company costs → observe asset/funds state → understand supported contribution → identify repeated cost patterns → promote governed rate assumptions → improve pricing/source/capacity/staffing decisions → repeat.**
