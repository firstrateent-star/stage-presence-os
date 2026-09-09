# Current State — 2026-09-09

## Canonical project
- Private GitHub repository: `firstrateent-star/stage-presence-os`
- Dedicated Supabase project: `stage-presence-os` (`yaojcuvgtlncytujfxef`), `us-east-1`
- Hosting: Cloudflare Workers Static Assets
- First deployed URL: `https://stage-presence-os.falling-butterfly-aad6.workers.dev`
- First proven Cloudflare version: `ae5b510c-1175-480d-a2db-38bed797864a`
- Lovable prototypes remain frozen historical references only.

## Business references
- `docs/BUSINESS_MODEL_CURRENT.md` — whole-company working reference
- `docs/BUSINESS_MODEL_EVIDENCE_2026-09-09.md` — first real evidence test against imported Goodshuffle operating data
- `docs/CAPACITY_TRUTH.md` — configuration / requirement-window / pressure / hold / reservation truth model
- `docs/COMMITMENT_LADDER.md` — Quote Ready / Commit Ready / Reserve Ready / Execute Ready decision model
- `docs/REPEATABILITY_ENGINE.md` — learning/standardization architecture
- `docs/DECISION_RIGHTS.md` — authority and exception-routing model
- `docs/PORTFOLIO_GOVERNANCE.md` — opportunity-quality dimensions
- `docs/OPERATING_CADENCE.md` — system-driven management rhythm
- `docs/DECISIONS.md` — architecture/business-system decision log

## Governing system principle
> Legacy systems are evidence sources. They do not define the future operating model.

Goodshuffle, QuickBooks, spreadsheets, lead sheets and future sources may supply facts, identifiers, prices, history and provenance. Stage Presence OS translates that evidence into its own Engagement / Party / Fact / Resource / Event model and preserves uncertainty rather than copying legacy workflow assumptions.

## Shared Reality kernel
Implemented and proven:
- private Supabase Auth
- explicit `app_members` allowlist separate from authentication
- RLS on application tables
- one canonical Engagement across opportunity/job lifecycle
- multidimensional commercial / commitment / operational / attention state
- Parties and Engagement-party relationships
- facts with certainty/provenance
- explicit unknown/conflicting truth
- Resources and Engagement-resource relationships
- append-oriented event ledger
- next action / waiting / blocked continuity
- archive semantics rather than destructive delete
- URL-hash navigation persistence
- rollback-only First Breath and Capture smoke tests

## Capture layer
Implemented in current `main`:
- low-friction typed/pasted Quick Capture
- optional structured details rather than mandatory CRM entry
- private `source-artifacts` Storage bucket
- photo/camera upload path
- photo-only capture allowed
- photo-only Engagement defaults to `OTHER` / Unsure rather than asserting an Event
- human source evidence remains distinct from system-generated structure
- source-linked event history
- source-agnostic Capture Contract and printable Quick Lead Sheet standard

No paid AI/image interpretation is enabled. A real lead-sheet photo has not yet organically proven the newest browser upload path.

## Goodshuffle evidence import — 2026-09-09
Goodshuffle was treated as operating evidence, not canonical architecture.

Imported/translated live state:
- 30 active Goodshuffle-derived Engagements
- 20 identified customer/contact Parties
- 29 customer links; one customer remains legitimately unknown
- 15 `WON / SIGNED`
- 14 `PROPOSED / UNCOMMITTED`
- 1 `NEW / UNCOMMITTED`
- $127,804.01 known signed value in the limited imported sample
- 130 `CONFIGURED` Engagement-resource links
- 45 distinct Goodshuffle resource identities represented in current project configurations
- 19 project-level configuration facts preserving custom/untracked Goodshuffle lines instead of polluting inventory
- 2 explicit `CONFLICTING` facts
- 6 explicit `UNKNOWN` per-game economic allocations
- 32 immutable Goodshuffle import source artifacts
- 60 source-link events tying Engagements to master/project evidence

### Translation rules now live
- stable `source_key` prevents future exports from duplicating the same project
- event date may exist without exact event timestamp
- Goodshuffle `Contract Signed` maps to `WON / SIGNED`, not `CONFIRMED`
- no deposit evidence means reservation truth is not inferred
- `$0` per-game rows are not treated as zero-value work when economics are unresolved
- `CONFIGURED` means a resource/service appears in the evidenced project configuration; it does not mean customer-requested, recommended, reserved, available or owned
- Goodshuffle `Qty Posted / In Stock / Booked` values remain evidence rather than automatically replacing physical quantity truth

## Resource / Capacity Truth state
Original workbook evidence remains preserved alongside Goodshuffle evidence.

Current resource state:
- all 45 Goodshuffle resource IDs referenced by the imported 30 projects are represented
- clear matches enriched existing resources instead of duplicating them
- unmatched used resources were added conservatively with quantity/sourcing unknown where not evidenced
- current configured pricing is promoted only when the Goodshuffle mapping is clear
- quantity truth remains provisional unless independently verified

Capacity Truth is now active in the live backend:
- configured resources may carry `required_from_date` / `required_through_date`
- requirement-window state: `UNKNOWN / INFERRED_FROM_EVENT / ESTIMATED / KNOWN / VERIFIED`
- Engagement-specific planned sourcing: `OWNED / SUBCONTRACTED / PARTNER / VENUE / UNKNOWN`
- 130 imported Goodshuffle configured-resource links have event-date windows explicitly marked `INFERRED_FROM_EVENT`
- RLS-safe `capacity_pressure_signals` derived view is live
- current derived pressure: 3 `WATCH`, 0 `HIGH`

Constitution:
**configuration != requirement window != pressure != hold != reservation.**

No hold or reservation truth has been created.

## Business-model evidence signals
The first 30-project sample currently supports:

### LED-first strategic center
Structured configured-project evidence:
- 20 projects with VIDEO
- 5 with AUDIO
- 2 with LIGHTING
- 4 with STAGING
- 3 with POWER
- 18 currently appear video-led without another major technical category in structured resource configuration

Most frequently configured visual assets:
- 17x10 LED Trailer — 13 Engagements
- 12x7 LED Trailer — 12 Engagements
- MB-5 Mobile Video Trailer — 8 Engagements

### Relationship compounding / concentration
- 3 customer relationship nodes currently have more than one Engagement
- largest recurring relationship has 7 Engagements
- that relationship carries $102,000 of the $127,804.01 currently known signed value
- concentration of known signed value in that one relationship: 79.8%

This is both relationship opportunity and concentration risk; sample is incomplete and must not be treated as audited lifetime economics.

### Repeatability evidence
- UNC exact visual configuration appears 7 times
- 12x7 + load-in/load-out exact pattern appears 2 times
- 17x10 + delivery/pickup exact pattern appears 2 times
- 16 configured Engagements fall in the broad VIDEO + logistics/OTHER family
- Polk Place appears in 7 Engagements; 1750 Signal Point, Riverfront Park and The Refinery each recur

These are evidence for internal solution archetypes and venue memory, not customer-facing packages.

## Business Command Layer — current `main`
Today is recentered around the business model rather than a raw attention queue:
1. Protect Delivery
2. Convert Demand
3. Capacity Pressure
4. Verify Capacity Truth
5. Relationships
6. Unresolved Truth
7. Learn / Resolve
8. Recently Changed

Live backend currently resolves to:
- 3 delivery commitments inside the next 21 days
- 15 open commercial opportunities
- 3 physical capacity-pressure WATCH pairs
- 0 HIGH pairs
- 3 recurring customer relationships
- 2 conflicting facts
- 6 explicit unknown facts
- 4 past-dated review signals: 1 delivery-learning, 1 stale-commercial, 1 program-review, 1 conflict-review

Frontend command-layer code is pushed to `main`. The current tool environment cannot observe Cloudflare's newest auto-build/deploy result, so do not claim the newest Today experience is deployment-proven until independent build/browser evidence exists.

## Commitment Ladder / readiness
Do not persist one generic readiness status.

Derived decisions remain separate:
1. Quote Ready
2. Commit Ready
3. Reserve Ready
4. Execute Ready

Current imported evidence gap:
- 14 proposed Engagements: 13 customer-known, all date-known, 11 configured solutions, no typed OS `QUOTE_TOTAL`
- 15 won/signed: all customer/date/solution-known, 9 known contract totals, but no deposit-received evidence, no KNOWN/VERIFIED resource windows, and no Engagement-specific sourcing confirmation

This is evidence incompleteness, not a claim that historical operations failed.

## Repeatability / Learning Closeout — LIVE BACKEND, UI IN MAIN
A lightweight learning kernel is now active.

Live backend:
- `engagement_closeouts` — max one structured learning closeout per Engagement
- closeout kind: `DELIVERY / CANCELLED / LOST / OTHER`
- actual outcome: `AS_EXPECTED / CHANGED / PARTIAL / ISSUE / UNKNOWN`
- optional setup minutes, strike minutes and Greg-dependent minutes
- optional solution-changed, what-worked, what-changed, venue-learning, next-time and recurrence evidence
- RLS member SELECT/INSERT/UPDATE; no browser delete policy
- event history: `CLOSEOUT_RECORDED / CLOSEOUT_UPDATED`
- `learning_review_signals` distinguishes delivery learning, stale commercial history, program-parent review and conflicting-history review

Proof:
- authenticated rollback test recorded a temporary Red Palm closeout
- closeout was visible under RLS
- ledger event fired
- Red Palm disappeared from the derived learning queue
- rollback restored the original signal
- 0 fake closeouts and 0 fake closeout events persisted

Current `main` also includes:
- Today `Learn / Resolve` queue
- modular low-friction Learning panel beneath past Engagement detail
- only closeout kind and broad outcome are required; actual timing/learning fields are optional

Do not auto-close because a date passed. Do not force closeout merely to clear a queue. Actuals should be recorded only when somebody actually knows them.

## Security / platform state
- Supabase project remains `ACTIVE_HEALTHY`
- RLS member/non-member isolation previously verified
- private source-artifact bucket remains locked to active-member access and own-folder uploads
- browser receives publishable key only; no service-role/DB secrets
- security advisor after learning schema reports only the known Auth warning: Leaked Password Protection disabled
- accepted Free-plan limitation; reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- two pre-existing uncovered `created_by` foreign keys found by performance advisor were indexed on 2026-09-09
- performance advisor now reports only unused-index INFO expected in a young application; do not remove indexes merely because early traffic has not exercised them

## Reproducible database changes
Canonical migrations include:
- `database/20260908_initial_shared_reality_kernel.sql`
- `database/20260908_fk_covering_indexes.sql`
- `database/20260908_shared_reality_event_triggers.sql`
- `database/20260908_log_all_engagement_semantic_changes.sql`
- `database/20260908_add_private_source_artifact_storage.sql`
- `database/20260909_engagement_external_key_and_date_only_fields.sql`
- `database/20260909_goodshuffle_provenance_and_configured_resources.sql`
- `database/20260909_resource_requirement_windows.sql`
- `database/20260909_capacity_pressure_signals.sql`
- `database/20260909_learning_closeout_kernel.sql`
- `database/20260909_add_missing_created_by_indexes.sql`

## Current strategic priority
Do not revert to feature-list development.

Business-model-driven sequence:
1. Business Command Layer — allocate scarce attention
2. Capture — get new reality in with minimal clerical burden
3. Capacity Truth — progressively improve timing/sourcing/hold/reservation evidence
4. Lightweight Learning Closeout — make actual delivery teach the system
5. Relationship intelligence — strengthen the relationship graph without invented account structures
6. Economics / pricing — acquire direct-cost/contribution truth before optimizing quote automation
7. Commitment/proposal/deposit and operational handoff where real friction earns them
8. Crew / warehouse / maintenance and deeper integrations

The loops are parallel, not a rigid waterfall. The next implementation should improve a real decision or capture high-leverage evidence rather than merely add features.

## Still intentionally not claimed
- no audited company revenue / margin model
- no complete historical customer lifetime value
- no confirmed resource availability calendar
- no deposit/payment truth imported
- no actual holds/reservations
- no full proposal/signature/payment engine
- no automatic Goodshuffle sync
- no QuickBooks integration
- no paid AI interpreter
- no crew scheduling / warehouse movement / maintenance / profitability engine
- no claim that Goodshuffle inventory quantities equal physical ownership
- no claim that newest frontend commits have independently passed the latest Cloudflare build from this tool environment
