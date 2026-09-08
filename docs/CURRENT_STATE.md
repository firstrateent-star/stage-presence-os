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

## Not yet done / intentionally dormant
- No Cloudflare Worker/deployment exists in the user's account yet
- No paid AI model
- No photo/voice file storage workflow yet
- No QuickBooks or Goodshuffle integration
- No outbound email/text automation
- No proposal/signature/payment system
- No resource holds/reservations or fake availability
- No crew scheduling, warehouse movement, maintenance, profitability, training, customer portal, or public website

## Build verification constraint
This execution environment cannot currently reach the npm registry, so a dependency lockfile/full compiled build has not been produced here. Package versions are pinned in `package.json`; Node is constrained to `>=22.12`. The first connected Cloudflare Workers Build should run dependency installation and become the authoritative TypeScript/Vite compiler check before production use.

## Immediate next proof
1. Connect/import the private GitHub repo into Cloudflare Workers Builds.
2. Add only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as build environment values.
3. Let Cloudflare perform the first authoritative build/deploy to the default `workers.dev` address.
4. Fix any compile/runtime defects before entering real customer information.
5. Sign in with the first authorized ADMIN and verify browser-level RLS-backed access.
6. Use 3–10 real Engagements and evaluate Shared Reality before activating another petal.
