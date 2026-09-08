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
- Multidimensional Engagement states
- Deterministic attention logic, including WAITING resurfacing when its follow-up becomes due
- Engagement detail loads real facts, parties, linked resources, and activity
- Add known fact / material unknown
- Link person or organization
- Link provisional resource without implying availability
- Edit next movement / waiting / blocked state
- Internal notes
- Archive rather than destructive delete
- Exact applied database migration recorded under `database/`
- Foreign-key index patch recorded
- Database-level event triggers for Engagement, Fact, Party-link, and Resource-link history
- Inventory source/conflict evidence recorded under `data/`
- Cloudflare Workers static-asset configuration committed in `wrangler.jsonc`
- Constitution, data model, security model, AI contract, deployment runbook, roadmap, value ledger, and permission gates

## Live Supabase state
- Project status: `ACTIVE_HEALTHY`
- Free organization/project; cost check at creation: $0/month
- 10 public application tables, all RLS-enabled
- Explicit `app_members` allowlist means authentication alone does not authorize company data
- One real internal account is active as `ADMIN`
- RLS verification passed: simulated ADMIN sees all 67 provisional resources; simulated authenticated non-member sees zero resources and zero memberships
- Current data counts after deployment: 0 active Engagements, 0 active Parties, 67 active provisional Resources, 1 active app member
- Security advisor now reports one Auth warning: Leaked Password Protection is disabled. Current Supabase documentation states this feature is Pro-only, so this is recorded as a known Free-plan limitation rather than silently creating a paid dependency.
- Core table/RLS security remains intact; use a strong unique password for every internal account.
- Performance advisor previously returned only `unused_index` INFO findings expected on a new/no-traffic database
- Provisional inventory import is live:
  - 67 resource rows
  - 62 quantity states `UNVERIFIED`
  - 5 quantity states `UNKNOWN`
  - 5 prices marked `LEGACY_REFERENCE`
  - 1 explicitly `SUBCONTRACTED` capability row
- Known workbook conflicts remain preserved rather than silently reconciled

## Hosting stance
Cloudflare's current platform direction favors Workers for new applications. Stage Presence OS therefore uses Workers Static Assets rather than a new Pages project. First Breath has no Worker script; Cloudflare serves the compiled `dist/` bundle with SPA fallback. Static-asset requests are free/unlimited. Workers Builds currently supplies 3,000 build minutes/month on Free.

## First connected build evidence
The first connected build reached strict TypeScript and exposed two localized compiler issues. Both were corrected on `main` without weakening strictness.

The second Cloudflare build on 2026-09-08 completed the full pipeline successfully:
- initialized Cloudflare build environment
- cloned the private GitHub repository
- installed 88 packages / resolved 572 dependency artifacts through Bun
- executed `npm run build`
- passed `tsc -b`
- Vite 8.2.2 transformed 75 modules
- generated production `dist/` assets
- executed `npx wrangler deploy`
- uploaded static assets
- deployed Worker triggers
- produced the default `workers.dev` URL
- Cloudflare reported `Success: Build completed`

The build-cache warning is not an application failure. Cloudflare could not cache dependencies because no lockfile is committed yet. Package versions are pinned exactly; committing a lockfile remains a supply-chain/reproducibility cleanup item.

## Not yet done / intentionally dormant
- Browser-level login/runtime verification on the deployed URL is still pending
- No live customer or Engagement records
- No paid AI model
- No photo/voice file storage workflow yet
- No QuickBooks or Goodshuffle integration
- No outbound email/text automation
- No proposal/signature/payment system
- No resource holds/reservations or fake availability
- No crew scheduling, warehouse movement, maintenance, profitability, training, customer portal, or public website

## Immediate next proof
1. Open the deployed `workers.dev` URL in a real browser.
2. Confirm the Stage Presence OS login screen renders rather than DEMO mode or a blank/error page.
3. Sign in with the first authorized ADMIN account.
4. Confirm Resources shows the 67 provisional resource records and Today/Engagements load with zero real Engagements.
5. Create one clearly labeled internal TEST Engagement and exercise the First Breath loop before entering any customer data.
6. Verify the resulting database/event-ledger records and then remove/archive the test Engagement.
7. Commit a dependency lockfile once we have an environment that can produce and preserve it.
8. Only after those proofs should 3–10 real Engagements be entered to evaluate Shared Reality before activating another petal.
