# Current State — 2026-09-08

## Canonical project
- Private GitHub repository: `firstrateent-star/stage-presence-os`
- Dedicated Supabase project: `stage-presence-os` (`yaojcuvgtlncytujfxef`), `us-east-1`
- Hosting target: Cloudflare Pages
- Lovable prototypes are frozen historical references only.

## Business reference
`docs/BUSINESS_MODEL_CURRENT.md` is the current whole-company reference. It distinguishes observed/current context from the working strategic thesis and open hypotheses so future builders do not reduce Stage Presence to a CRM or treat strategy as fact.

## Implemented in GitHub
- React + TypeScript + Vite + Tailwind application shell
- Mobile-first `Today / Engagements / Resources / + New` navigation
- Supabase auth boundary and login screen
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
- Constitution, data model, security model, AI contract, deployment runbook, roadmap, value ledger, and permission gates

## Live Supabase state
- Free organization/project; cost check at creation: $0/month
- 10 public application tables, all RLS-enabled
- Explicit `app_members` allowlist means authentication alone does not authorize company data
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

## Not yet done / intentionally dormant
- No Cloudflare Pages project/deployment yet
- No authorized Stage Presence app user has been bootstrapped into `app_members`
- No paid AI model
- No photo/voice file storage workflow yet
- No QuickBooks or Goodshuffle integration
- No outbound email/text automation
- No proposal/signature/payment system
- No resource holds/reservations or fake availability
- No crew scheduling, warehouse movement, maintenance, profitability, training, customer portal, or public website

## Build verification constraint
This execution environment cannot currently reach the npm registry, so a dependency lockfile/full compiled build has not been produced here. Package versions are pinned in `package.json`; the first connected build environment should run dependency installation, commit `package-lock.json`, and treat its TypeScript/Vite build as the authoritative compiler check before production use.

## Immediate next proof
1. Bootstrap one real authorized internal user.
2. Connect the private GitHub repo to Cloudflare Pages.
3. Add only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as build environment values.
4. Let Cloudflare perform the first authoritative build.
5. Fix any compile/runtime defects before entering real customer information.
6. Use 3–10 real Engagements and evaluate Shared Reality before activating another petal.
