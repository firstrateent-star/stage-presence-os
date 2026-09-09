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
- `docs/DECISIONS.md` — architecture/business-system decision log

## Governing system principle
> Legacy systems are evidence sources. They do not define the future operating model.

Goodshuffle, QuickBooks, spreadsheets, lead sheets and future sources may supply facts, identifiers, prices, history and provenance. Stage Presence OS translates that evidence into its own Engagement / Party / Fact / Resource / Event model and preserves uncertainty rather than copying legacy workflow assumptions.

## Shared Reality kernel
Implemented and proven:
- private Supabase Auth
- explicit `app_members` allowlist separate from authentication
- RLS on all public application tables
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

### Goodshuffle translation rules now live
- stable `source_key` prevents future exports from duplicating the same project
- event date may exist without exact event timestamp
- Goodshuffle `Contract Signed` maps to `WON / SIGNED`, not `CONFIRMED`
- no deposit evidence means reservation truth is not inferred
- `$0` per-game rows are not treated as zero-value work when economics are unresolved
- `CONFIGURED` means a resource/service appears in the evidenced project configuration; it does not mean customer-requested, recommended, reserved, available or owned
- Goodshuffle `Qty Posted / In Stock / Booked` values remain evidence rather than automatically replacing physical quantity truth

## Resource state
Original workbook evidence remains preserved alongside Goodshuffle evidence.

Current Goodshuffle reconciliation:
- all 45 Goodshuffle resource IDs referenced by the imported 30 projects are represented
- clear matches enriched existing resources instead of duplicating them
- unmatched used resources were added conservatively with quantity/sourcing unknown where not evidenced
- current configured pricing is promoted only when the Goodshuffle mapping is clear
- quantity truth remains provisional unless independently verified

Examples of current Goodshuffle-configured price evidence:
- 17x10 LED Trailer — $4,500
- 12x7 LED Trailer — $3,500
- 3.9mm LED Panels — $80
- LED Poster Panels — $500 configured flat-fee evidence
- Midas M32 — $220
- Midas M32R — $150
- DL32 — $100
- RCF HDL-6 — $85
- RCF NX12 — $75
- RCF double-18 sub — $225

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

### Near-term operating pressure
Between 2026-09-09 and 2026-09-30:
- 6 Engagements have event dates
- 3 are signed/won
- 3 are proposed/uncommitted

### Capacity pressure
Current physical-resource overlap logic finds:
- 0 high-pressure pairs where two committed Engagements overlap on the same configured physical resource
- 3 watch pairs where committed work overlaps an open opportunity on the same configured physical resource

Examples include November 14 pressure around the 17x10, 12x7 and MB-5 visual fleet.

These are pressure signals only. The system does not claim double-booking, availability, reservation or ownership certainty from configuration evidence alone.

## Business Command Layer — current `main`
Today is being recentered around the business model rather than a raw attention queue:
1. Protect Delivery
2. Convert Demand
3. Capacity Pressure
4. Relationships
5. Unresolved Truth
6. Recently Changed

Live data currently resolves to:
- 3 delivery commitments inside the next 21 days
- 15 open commercial opportunities
- 3 physical capacity-pressure watch pairs
- 3 recurring customer relationships
- 2 conflicting facts
- 6 explicit unknown facts

Frontend command-layer code is pushed to `main`. The current tool environment cannot observe Cloudflare's newest auto-build/deploy result, so do not claim this newest Today experience is deployment-proven until independent build/browser evidence exists.

## Security / platform state
- Supabase project remains `ACTIVE_HEALTHY`
- RLS member/non-member isolation previously verified
- private source-artifact bucket remains locked to active-member access and own-folder uploads
- browser receives publishable key only; no service-role/DB secrets
- security advisor after Goodshuffle schema/import changes reports only the known Auth warning: Leaked Password Protection disabled
- this warning remains an accepted Free-plan limitation; remediation reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- performance advisor reports only unused-index INFO findings expected in a young application; no index is being removed merely because early traffic has not exercised it

## Reproducible database changes
Canonical migration files include:
- `database/20260908_initial_shared_reality_kernel.sql`
- `database/20260908_fk_covering_indexes.sql`
- `database/20260908_shared_reality_event_triggers.sql`
- `database/20260908_log_all_engagement_semantic_changes.sql`
- `database/20260908_add_private_source_artifact_storage.sql`
- `database/20260909_engagement_external_key_and_date_only_fields.sql`
- `database/20260909_goodshuffle_provenance_and_configured_resources.sql`

## Current strategic priority
Do not revert to feature-list development.

The business-model-driven sequence now is:
1. Business Command Layer — make scarce human attention legible
2. Capture — reduce clerical entry for new reality
3. Capacity truth — move from pressure warnings toward explicit holds/reservations/sourcing only when evidence earns it
4. Relationship intelligence — persistent account/contact/recurrence history
5. Economics / pricing — acquire direct-cost/contribution truth before optimizing quote automation
6. Operational handoff / crew / warehouse / closeout
7. Deeper integrations and automation

Fast quoting remains important, but accelerating quotes before capacity and economics are visible could accelerate poor commitments.

## Still intentionally not claimed
- no audited company revenue / margin model
- no complete historical customer lifetime value
- no confirmed resource availability calendar
- no deposit/payment truth imported
- no full proposal/signature/payment engine
- no automatic Goodshuffle sync
- no QuickBooks integration
- no paid AI interpreter
- no crew scheduling / warehouse movement / maintenance / profitability engine
- no claim that Goodshuffle inventory quantities equal physical ownership
