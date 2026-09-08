# Current State — 2026-09-08

## Canonical project
- Private GitHub repository: `firstrateent-star/stage-presence-os`
- Dedicated Supabase project: `stage-presence-os` (`yaojcuvgtlncytujfxef`), `us-east-1`
- Hosting: Cloudflare Workers Static Assets
- First deployed URL: `https://stage-presence-os.falling-butterfly-aad6.workers.dev`
- First successful Cloudflare version: `ae5b510c-1175-480d-a2db-38bed797864a`
- Lovable prototypes are frozen historical references only.

## Business reference
`docs/BUSINESS_MODEL_CURRENT.md` is the current whole-company reference. It distinguishes observed/current context from the working strategic thesis and open hypotheses so future builders do not reduce Stage Presence to a CRM or treat strategy as fact.

## Implemented in GitHub
- React + TypeScript + Vite + Tailwind application shell
- Mobile-first `Today / Engagements / Resources / + New` navigation
- Supabase auth boundary and login screen
- Authentication and Stage Presence membership are separate gates; Shared Reality data loads only after an active `app_members` check succeeds
- Explicit unauthorized-account state and sign-out path
- Explicit DEMO mode when backend environment variables are absent
- Real Engagement create/list/detail paths
- Typed natural capture is preserved as a source artifact; no AI inference is fabricated
- Source preservation keeps raw natural capture verbatim while also preserving manually submitted structured fields in source metadata
- Source-added and manual-note events carry the authenticated actor
- Multidimensional Engagement states
- Deterministic attention logic, including WAITING resurfacing when its follow-up becomes due
- Engagement detail loads real facts, parties, linked resources, activity, and source-artifact metadata
- Add known fact / material unknown
- Link person or organization
- Link provisional resource without implying availability
- Edit next movement / waiting / blocked state
- Internal notes
- Archive rather than destructive delete
- Exact applied database migrations recorded under `database/`
- Database-level event triggers for Engagement, Fact, Party-link, and Resource-link history
- Engagement update ledger records every semantic dimension changed in one save rather than only the first detected change
- Inventory source/conflict evidence recorded under `data/`
- Cloudflare Workers static-asset configuration committed in `wrangler.jsonc`
- URL-hash navigation state (`#today`, `#resources`, `#engagement/<id>`, etc.) preserves/restores location after refresh or tab unloading
- Repeatable rollback-only First Breath smoke test under `database/tests/first_breath_smoke.sql`
- Repeatable rollback-only Capture linkage smoke test under `database/tests/capture_source_smoke.sql`
- One-page Quick Lead Sheet operating standard
- Source-agnostic Capture Contract
- Capability matrix distinguishing live / partial / staged / dormant functionality
- Quick Capture is photo-first in current `main`: Take Photo / Choose Image, optional natural note, optional type/date/venue/request/next move
- Photo-only capture defaults Engagement type to `OTHER` / Unsure rather than silently asserting an Event
- Photo-only generated Engagement names are treated as system structure, not fabricated TEXT evidence
- Private source-artifact read-back helpers exist for future source-evidence viewing

## Live Supabase state
- Project status: `ACTIVE_HEALTHY`
- Free organization/project; cost check at creation: $0/month
- 10 public application tables, all RLS-enabled
- Explicit `app_members` allowlist means authentication alone does not authorize company data
- One real internal account is active as `ADMIN`
- RLS verification passed: simulated ADMIN sees all 67 provisional resources; simulated authenticated non-member sees zero resources and zero memberships
- Browser login on the deployed Cloudflare app successfully completed by the authorized ADMIN
- Browser `+ New` write successfully created `SP-000001`
- TEST Engagement was subsequently exercised under authenticated ADMIN context with a verified fact, explicit unknown, provisional resource link, WAITING/Next Move state and note, then archived
- Event history preserved material changes and attributed verification writes to the ADMIN identity
- Current active Engagement count: 0
- Rollback-only automated First Breath smoke test executed successfully; 0 AUTOTEST Engagements persisted afterward
- Private Storage bucket `source-artifacts` is live
  - `public = false`
  - 15 MB per-file maximum
  - accepted MIME types: JPEG, PNG, WebP, HEIC, HEIF
  - active Stage Presence members may read objects
  - active members may upload only to their own top-level user-ID folder
  - no browser UPDATE or DELETE policy is granted on original source evidence
  - no public asset URLs are used
- Capture-layer rollback test proved PHOTO source artifact -> Engagement -> `SOURCE_ADDED` ledger linkage under authenticated ADMIN context
- Post-test state verified: 0 active Engagements, 0 persisted capture AUTOTEST artifacts, 0 test Storage objects
- No real lead-sheet photo has yet been stored; the bucket currently contains no test object from our rollback proofs
- Security advisor reports one Auth warning: Leaked Password Protection is disabled. Current Supabase documentation states this feature is Pro-only, so this is recorded as a known Free-plan limitation rather than silently creating a paid dependency.
- Core table/RLS/storage security remains intact; use a strong unique password for every internal account.
- Performance advisor currently reports only `unused_index` INFO findings expected on a new/no-traffic database
- Provisional inventory import is live:
  - 67 resource rows
  - 62 quantity states `UNVERIFIED`
  - 5 quantity states `UNKNOWN`
  - 5 prices marked `LEGACY_REFERENCE`
  - 1 explicitly `SUBCONTRACTED` capability row
- Known workbook conflicts remain preserved rather than silently reconciled

## Hosting stance
Cloudflare serves the compiled Vite `dist/` bundle through Workers Static Assets. The previously proven production pipeline passed strict TypeScript, Vite build, asset upload and Wrangler deploy.

Recent Capture-layer code has been pushed to `main` and should enter Cloudflare's normal auto-build/deploy path. The current tool surface cannot directly observe the newest Cloudflare build result, so do not claim the newest photo UI is deployment-proven until Cloudflare or a real browser provides that evidence.

## First Breath evidence
The First Breath Shared Reality loop is sufficiently proven for controlled internal use.

Evidence includes:
- deployed browser login,
- real browser Engagement creation,
- source/provenance creation,
- authenticated RLS reads/writes,
- verified fact,
- explicit unknown,
- provisional resource link,
- WAITING + Next Move,
- activity note,
- archive semantics,
- durable event ledger,
- unauthorized-user denial,
- repeatable rollback-only automated smoke test.

Manual human QA should be reserved for usability/judgment, not repetitive data-entry testing.

## Capture Layer state
The first Capture seam is now implemented far enough for organic validation:

Quick Lead Sheet / camera image
-> private immutable source evidence
-> `source_artifacts` metadata
-> one canonical Engagement
-> `SOURCE_ADDED` ledger relationship
-> later interpretation.

The binary Storage upload itself has not been exercised by a real browser yet. Per the low-manual-work design rule, do not ask Sean/Greg to perform dummy QA. The first real or low-stakes Quick Lead Sheet photo should become the organic end-to-end upload proof.

## Current design priority
Do not add more capture complexity merely because it is possible. The next evidence should come from real Stage Presence information entering through Quick Capture.

Observe:
- whether taking one photo is genuinely lower friction than current behavior,
- whether a photo-only placeholder is understandable,
- whether source-evidence viewing is actually needed in the Engagement screen,
- which fields must be interpreted automatically to prevent retyping,
- how often duplicate customers/contacts/Engagements appear,
- which ambiguities genuinely require Greg.

If the photo seam works, the next likely petal is the Engagement Interpreter. That requires a separate privacy/cost/AI permission decision before any paid model or automated image interpretation is enabled.

## Intentionally dormant
- No paid AI model or image interpretation
- No voice transcription/capture pipeline yet
- No QuickBooks or Goodshuffle integration
- No outbound email/text automation
- No proposal/signature/payment system
- No resource holds/reservations or fake availability
- No crew scheduling, warehouse movement, maintenance, profitability, training, customer portal, or public website intake
