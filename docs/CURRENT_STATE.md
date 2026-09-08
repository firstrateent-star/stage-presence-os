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
- Source preservation now keeps the raw natural capture verbatim while also preserving manually submitted structured fields in source metadata
- Source-added and manual-note events carry the authenticated actor
- Multidimensional Engagement states
- Deterministic attention logic, including WAITING resurfacing when its follow-up becomes due
- Engagement detail loads real facts, parties, linked resources, and activity
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
- Constitution, data model, security model, AI contract, deployment runbook, roadmap, value ledger, and permission gates

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
- Event history preserved the material changes and attributed the automated verification writes to the ADMIN identity
- Current active Engagement count: 0
- Rollback-only automated smoke test executed successfully; 0 AUTOTEST Engagements persisted afterward
- Security advisor reports one Auth warning: Leaked Password Protection is disabled. Current Supabase documentation states this feature is Pro-only, so this is recorded as a known Free-plan limitation rather than silently creating a paid dependency.
- Core table/RLS security remains intact; use a strong unique password for every internal account.
- Performance advisor currently reports only `unused_index` INFO findings expected on a new/no-traffic database
- Provisional inventory import is live:
  - 67 resource rows
  - 62 quantity states `UNVERIFIED`
  - 5 quantity states `UNKNOWN`
  - 5 prices marked `LEGACY_REFERENCE`
  - 1 explicitly `SUBCONTRACTED` capability row
- Known workbook conflicts remain preserved rather than silently reconciled

## Hosting stance
Cloudflare's current platform direction favors Workers for new applications. Stage Presence OS therefore uses Workers Static Assets rather than a new Pages project. First Breath has no Worker script; Cloudflare serves the compiled `dist/` bundle with SPA fallback. Static-asset requests are free/unlimited. Workers Builds currently supplies 3,000 build minutes/month on Free.

## Connected build evidence
The first connected build reached strict TypeScript and exposed two localized compiler issues. Both were corrected on `main` without weakening strictness.

The second Cloudflare build completed the full pipeline successfully:
- initialized Cloudflare build environment
- cloned the private GitHub repository
- installed project dependencies
- executed `npm run build`
- passed `tsc -b`
- Vite built the production bundle
- executed `npx wrangler deploy`
- uploaded static assets
- deployed Worker triggers
- produced the default `workers.dev` URL
- Cloudflare reported `Success: Build completed`

## First Breath evidence
The First Breath Shared Reality loop is now sufficiently proven for controlled internal use.

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

Manual human QA should now be reserved for usability/judgment, not repetitive data-entry testing.

## Current design priority
Do not expand simply because more features are imaginable. The next evidence phase should be 3–10 real Stage Presence Engagements handled through normal work. Observe where friction actually occurs, especially:
- how much Greg/Sean still has to type,
- which facts are repeatedly missing,
- where quote/commitment latency occurs,
- whether Today accurately surfaces attention,
- whether resource uncertainty creates friction,
- where Goodshuffle/QuickBooks duplication appears.

Evidence should determine the next petal. Given Stage Presence's stated operating goal, reducing capture/data-entry friction remains a high-priority candidate, but it should be implemented from observed use rather than adding complexity preemptively.

## Intentionally dormant
- No paid AI model
- No photo/voice file storage workflow yet
- No QuickBooks or Goodshuffle integration
- No outbound email/text automation
- No proposal/signature/payment system
- No resource holds/reservations or fake availability
- No crew scheduling, warehouse movement, maintenance, profitability, training, customer portal, or public website
