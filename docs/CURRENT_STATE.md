# Current State — 2026-09-09

## Canonical system
- Private repo: `firstrateent-star/stage-presence-os`
- Supabase project: `stage-presence-os` (`yaojcuvgtlncytujfxef`), `us-east-1`
- Hosting: Cloudflare Workers Static Assets
- First proven deployed URL: `https://stage-presence-os.falling-butterfly-aad6.workers.dev`
- First proven Cloudflare version: `ae5b510c-1175-480d-a2db-38bed797864a`
- Newest frontend commits are pushed to `main`; current tool environment still cannot independently observe the latest Cloudflare auto-build result.

## Governing rule
> Legacy systems are evidence sources. They do not define the future operating model.

Stage Presence OS translates Goodshuffle, spreadsheets, QuickBooks, lead sheets and future inputs into its own Engagement / Party / Fact / Resource / Event model while preserving provenance and uncertainty.

## Shared Reality / Capture
Proven or live:
- private Supabase Auth + explicit `app_members` allowlist
- RLS member/non-member boundary
- one canonical Engagement through opportunity/job lifecycle
- separate commercial / commitment / operational / attention state
- Parties, facts, unknowns/conflicts, resources, next move and event ledger
- typed/paste Quick Capture
- private source-artifact Storage
- photo/camera capture code in current `main`
- printable Quick Lead Sheet + Capture Contract
- rollback-only First Breath, Capture and Learning smoke-test patterns

No paid AI interpreter is enabled. Real browser photo upload still awaits organic use rather than synthetic human QA.

## Goodshuffle evidence translation
Live imported state:
- 30 Goodshuffle-derived Engagements
- 20 identified customer/contact Parties
- 29 customer links; one customer remains unknown
- 15 `WON / SIGNED`
- 14 `PROPOSED / UNCOMMITTED`
- 1 `NEW / UNCOMMITTED`
- $127,804.01 known contract value across 9 typed financial-fact Engagements
- 130 `CONFIGURED` Engagement-resource links
- 45 Goodshuffle resource identities represented in current configurations
- 19 project-level configuration facts for custom/untracked lines
- 2 explicit `CONFLICTING` facts
- 6 explicit `UNKNOWN` per-game economic allocations
- 32 immutable Goodshuffle import source artifacts

Translation rules:
- `Contract Signed` -> `WON / SIGNED`, not `CONFIRMED`
- no deposit evidence -> no reservation inference
- `$0` unresolved program components are not treated as free work
- `CONFIGURED` does not mean requested, recommended, owned, available, held or reserved
- Goodshuffle quantity fields remain evidence, not physical-inventory truth

## Current business evidence
### Strategic center
Configured sample:
- 20 Engagements include VIDEO
- 5 AUDIO
- 2 LIGHTING
- 4 STAGING
- 3 POWER
- 18 appear video-led without another major technical category represented in structured configuration

Most frequent visual assets:
- 17x10 LED Trailer — 13 Engagements
- 12x7 LED Trailer — 12
- MB-5 Mobile Video Trailer — 8

### Relationship / concentration
- 3 Party nodes currently have more than one Engagement
- largest recurring node has 7 Engagements
- $102,000 of $127,804.01 currently known value sits on that relationship node
- this is both compounding relationship value and concentration risk; sample is incomplete

### Repeatability
- UNC exact visual configuration appears 7 times
- 12x7 + load-in/load-out exact configuration appears 2 times
- 17x10 + delivery/pickup exact configuration appears 2 times
- 16 configured Engagements sit in the broad VIDEO + logistics/OTHER family
- Polk Place appears 7 times; 1750 Signal Point, Riverfront Park and The Refinery recur

These support internal solution archetypes and venue memory, not forced customer-facing packages.

## Business Command Layer
Current `main` Today order:
1. Protect Delivery
2. Convert Demand
3. Capacity Pressure
4. Verify Capacity Truth
5. Relationships
6. Unresolved Truth
7. Learn / Resolve
8. Recently Changed

Decision-relevant current signals:
- 3 delivery commitments inside 21 days
- **13 current/future/undated open-demand Engagements**
- 2 additional past-dated open records are intentionally excluded from Convert Demand and routed to Learn / Resolve
- 3 physical capacity-pressure `WATCH` pairs
- 0 `HIGH` pairs
- 3 recurring customer relationships
- 2 conflicting facts
- 6 explicit unknown facts
- 4 past-dated review signals: 1 delivery learning, 1 stale commercial, 1 program review, 1 conflict review

Important distinction:
raw status count != decision queue. A past-dated open proposal should not simultaneously appear as current demand and stale-history resolution.

## Capacity Truth — LIVE BACKEND
Canonical spec: `docs/CAPACITY_TRUTH.md`.

Live:
- `required_from_date` / `required_through_date` on configured resource links
- window certainty: `UNKNOWN / INFERRED_FROM_EVENT / ESTIMATED / KNOWN / VERIFIED`
- Engagement-specific planned sourcing: `OWNED / SUBCONTRACTED / PARTNER / VENUE / UNKNOWN`
- 130 Goodshuffle configured links backfilled with event-date windows marked `INFERRED_FROM_EVENT`
- RLS-safe `capacity_pressure_signals`
- current derived state: 3 `WATCH`, 0 `HIGH`

Constitution:
**configuration != requirement window != pressure != hold != reservation.**

No holds or reservations exist yet.

## Commitment Ladder — OPERATING DESIGN
Canonical: `docs/COMMITMENT_LADDER.md`.

Do not store one generic readiness status. Derive readiness for the decision:
1. Quote Ready
2. Commit Ready
3. Reserve Ready
4. Execute Ready

Import evidence shows why:
- 14 proposed Engagements: 13 customer-known, all date-known, 11 configured solutions, no typed OS `QUOTE_TOTAL`
- 15 won/signed: all customer/date/solution-known, 9 known contract totals, but no deposit-received evidence, KNOWN/VERIFIED resource windows or Engagement-specific sourcing confirmation

These are evidence gaps, not claims of historical operational failure.

## Repeatability / Learning Closeout — LIVE BACKEND + UI IN MAIN
Canonical: `docs/REPEATABILITY_ENGINE.md`.

Live backend:
- `engagement_closeouts` — one learning closeout per Engagement
- kind: `DELIVERY / CANCELLED / LOST / OTHER`
- outcome: `AS_EXPECTED / CHANGED / PARTIAL / ISSUE / UNKNOWN`
- optional setup, strike and Greg-dependent minutes
- optional solution-change, what-worked, what-changed, venue-learning, next-time and recurrence evidence
- RLS member SELECT/INSERT/UPDATE; no browser delete policy
- ledger events: `CLOSEOUT_RECORDED / CLOSEOUT_UPDATED`
- `learning_review_signals` separates delivery learning, stale commercial history, program-parent review and conflict review

Proof:
- authenticated rollback test created a temporary Red Palm closeout
- closeout was visible under member RLS
- ledger event fired
- Red Palm disappeared from the learning queue
- rollback restored the original signal
- 0 fake closeouts / 0 fake closeout events persisted

Current `main`:
- Today Learn / Resolve queue
- modular Learning panel beneath past Engagement detail
- context-aware default closeout kind: committed/won -> DELIVERY; lost -> LOST; cancelled -> CANCELLED; unresolved stale opportunity -> OTHER
- only closeout kind and broad outcome are required; all actuals/learning fields are optional
- DEMO mode remains isolated from backend-only learning calls

Do not auto-close because a date passed. Do not reconstruct facts merely to clear the queue.

## Security / platform
- Supabase remains `ACTIVE_HEALTHY`
- security advisor after new DDL reports only known `auth_leaked_password_protection` warning
- this remains an accepted Free-plan limitation; reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- two pre-existing uncovered `created_by` FKs on financial facts / Engagement relationships were indexed on 2026-09-09
- performance advisor now reports only unused-index INFO expected in a young app
- browser uses publishable key only; no service-role/DB secret exposed

## Reproducible database changes added on 2026-09-09
Including:
- `database/20260909_engagement_external_key_and_date_only_fields.sql`
- `database/20260909_goodshuffle_provenance_and_configured_resources.sql`
- `database/20260909_resource_requirement_windows.sql`
- `database/20260909_capacity_pressure_signals.sql`
- `database/20260909_learning_closeout_kernel.sql`
- `database/20260909_add_missing_created_by_indexes.sql`
- `database/tests/learning_closeout_smoke.sql`

## Current strategic sequence
Parallel evidence-driven loops, not a feature waterfall:
1. Business Command Layer — allocate scarce human attention
2. Capture — minimize clerical entry
3. Capacity Truth — improve timing/sourcing evidence before holds/reservations
4. Learning Closeout — make real outcomes teach the system
5. Relationship Intelligence — grow the relationship graph without invented account structures
6. Economics / Pricing — acquire direct-cost/contribution truth before quote optimization
7. Commitment / proposal / deposit + operational handoff when actual friction earns them
8. Crew / warehouse / maintenance / deeper integrations later

## Still intentionally not claimed
- audited revenue or margin model
- complete customer lifetime value
- confirmed resource availability calendar
- deposit/payment truth
- any actual hold/reservation
- full proposal/signature/payment engine
- automatic Goodshuffle sync
- QuickBooks integration
- paid AI interpreter
- crew/warehouse/maintenance/profitability engine
- Goodshuffle quantity = physical ownership
- newest frontend Cloudflare build success until independently observed
