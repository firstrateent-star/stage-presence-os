# Current State — 2026-09-08

## Confirmed context
- Vlourish Lovable workspace exists on Pro and is named `Vlourish`.
- Existing Stage Presence Lovable prototypes: Stage Presence Hub, Stage Presence Hub (57), Stage Presence Intake.
- Stage Presence Intake previously implemented concepts worth preserving in principle: private auth/roles, source uploads, extracted-field confidence, an activity ledger, and an AI processing boundary.
- Existing Intake schema should not become canonical because it hard-codes leads, quotes, and placeholder pricing too early.
- Current Stage Presence inventory workbook has been reviewed as a partial/reference snapshot.
- GitHub account `firstrateent-star` is connected. Dedicated repository `firstrateent-star/stage-presence-os` now exists and has been changed to private; it is the canonical code/documentation home.

## Implemented / prepared
- Stage Presence OS v0.1 constitution and current business-model reference
- Nine-object Shared Reality database kernel
- Multidimensional Engagement states
- Deterministic Today/Attention rules in frontend code
- Party/fact/resource/event architecture
- Typed/manual Engagement intake UI wired to the repository boundary
- Database-triggered Engagement event history
- AI interpreter contract boundary (no paid AI connected)
- Inventory import policy and real provisional resource seed
- Roadmap and test criteria

## Not yet done
- Cloudflare deployment
- First authorized Stage Presence app user / app_members bootstrap
- Full fact/party/resource editing flows in the frontend
- AI interpreter implementation
- Any QuickBooks, Goodshuffle, outbound messaging, payment, or other external operational integration

## Current infrastructure stance
Lovable remains frozen because the workspace is out of credits. The canonical build has moved to GitHub + Cloudflare Pages + Supabase rather than waiting for Lovable credits.

## Free-stack preparation update
- Cloudflare Pages + React/Vite + Supabase selected as the preferred $0 First Breath architecture.
- Connected Supabase organization is Free; dedicated Stage Presence project now exists at $0/month.
- Dedicated private GitHub repository now exists and is the canonical project home.
- Starter application source, schema, security model, deployment runbook, permission gates, and current business-model reference are prepared for canonical commit.
- Cloudflare Pages project has not been created yet.
- Dependency lockfile is not generated in this offline preparation environment; generate and commit `package-lock.json` on the first dependency install before deployment.

## 2026-09-08 — Supabase provisioned

- Dedicated Supabase project created: `stage-presence-os` (`yaojcuvgtlncytujfxef`) in `us-east-1`.
- Supabase organization remains on Free plan; project cost check was $0/month at creation.
- Shared Reality kernel migration applied successfully.
- Foreign-key covering indexes added after performance advisor review.
- Security advisor returned no lints.
- All ten public application tables have RLS enabled.
- Database intentionally contains no live Engagement/customer records yet.
- Inventory reference seed has been imported: 67 resource rows, 62 quantity states UNVERIFIED, 5 UNKNOWN, 5 LEGACY_REFERENCE price rows, and one explicitly SUBCONTRACTED capability row.
- Known workbook conflicts remain preserved in resource attributes instead of being silently reconciled.
- GitHub repository visibility has been corrected to private; canonical source/docs are being committed.
