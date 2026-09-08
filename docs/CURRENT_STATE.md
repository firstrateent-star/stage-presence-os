# Current State — 2026-09-08

## Canonical project
- Private GitHub repository: `firstrateent-star/stage-presence-os`
- Dedicated Supabase project: `stage-presence-os` (`yaojcuvgtlncytujfxef`), `us-east-1`
- Hosting target: Cloudflare Workers Static Assets
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
- Free organization/project; cost check at creation: $0/month
- 10 public application tables, all RLS-enabled
- Explicit `app_members` allowlist means authentication alone does not authorize company data
- One real internal account is active as `ADMIN`
- RLS verification passed: simulated ADMIN sees all 67 provisional resources; simulated authenticated non-member sees zero resources and zero memberships
- Security advisor currently returns no lints
- Performance advisor currently returns only `unused_index` INFO findings expected on a new/no-traffic database
- No live customer or Engagement records yet
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
Cloudflare successfully:
- initialized its build environment,
- cloned the private GitHub repository,
- installed project dependencies,
- resolved React/Vite/Tailwind/Supabase/Wrangler packages,
- reached the strict TypeScript compiler.

The first build stopped on two localized TypeScript issues rather than infrastructure/dependency failure:
1. `EngagementDetailScreen.tsx`: async closures referenced the optional `engagement` prop after narrowing, so TypeScript correctly treated it as possibly undefined.
2. `TodayScreen.tsx`: `Array.filter(isWaiting)` supplied the array index as the helper's optional second argument, which is typed as a `Date`.

Both issues were corrected on `main` without weakening compiler strictness:
- Engagement detail now captures `engagementId` immediately after the not-found guard and uses that stable ID in async callbacks.
- Today wraps `isWaiting` in a one-argument filter callback.

The next Cloudflare build is the next compiler proof.

## Not yet done / intentionally dormant
- First successful Cloudflare deployment has not yet been confirmed
- No paid AI model
- No photo/voice file storage workflow yet
- No QuickBooks or Goodshuffle integration
- No outbound email/text automation
- No proposal/signature/payment system
- No resource holds/reservations or fake availability
- No crew scheduling, warehouse movement, maintenance, profitability, training, customer portal, or public website

## Immediate next proof
1. Let Cloudflare rebuild `main` after the compiler fixes.
2. Fix any additional compile/deploy/runtime defect exposed by that build rather than relaxing strictness.
3. Confirm deployment to the default `workers.dev` address.
4. Sign in with the first authorized ADMIN and verify browser-level RLS-backed access.
5. Enter only test/internal Engagements initially; no real customer data until the deployed loop is verified.
6. Use 3–10 real Engagements after verification and evaluate Shared Reality before activating another petal.
