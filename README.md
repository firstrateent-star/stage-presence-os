# Stage Presence OS

Canonical reference for the Stage Presence operating-system build.

## Purpose
Stage Presence OS is a private internal company-state and decision-support system for Stage Presence, an LED-first live visual production and integration company.

The first product goal is **Shared Business Reality**: tell the system what is happening once; it remembers it, distinguishes known from unknown, preserves provenance, surfaces what needs attention, and keeps the next movement from disappearing.

This repository/document bundle is intentionally clean-slate. It does **not** inherit the old CRM assumption of separate Lead -> Quote -> Event universes.

## Read order
1. `docs/BUSINESS_MODEL_CURRENT.md`
2. `docs/CONSTITUTION.md`
3. `docs/SYSTEM_MAP.md`
4. `docs/DATA_MODEL.md`
5. `docs/CURRENT_STATE.md`
6. `docs/CAPABILITIES_CURRENT.md`
7. `docs/ROADMAP.md`
8. `docs/QUICK_LEAD_SHEET.md`
9. `docs/CAPTURE_CONTRACT.md`
10. `docs/DECISIONS.md`
11. `docs/AI_CONTRACT.md`
12. `docs/INVENTORY_IMPORT.md`
13. `docs/VALUE_LEDGER.md`
14. `docs/TEST_PLAN.md`

## Current status — 2026-09-08
The clean-slate free-stack implementation is live enough for controlled internal use. A dedicated Supabase project is active and secured; the private GitHub repository is the canonical code/documentation home; Cloudflare serves the deployed internal app; the first internal account is authorized as ADMIN; RLS has been verified against member and non-member contexts; browser login/write behavior has been proven; and First Breath now has rollback-only automated smoke coverage.

The next earned petal is **Capture**: reduce human clerical work by letting photographed Quick Lead Sheets, natural typed/pasted notes, future voice, web inquiries, email references, and later external imports converge into the same Engagement/Party/Fact/Resource/Event model.

Lovable remains frozen as historical prototype context. No paid AI call, public intake, QuickBooks/Goodshuffle write integration, payment automation, or autonomous commercial commitment has been enabled.

## Existing prototypes
Historical Lovable prototypes exist and should be treated as reference only:
- Stage Presence Hub
- Stage Presence Hub (57)
- Stage Presence Intake

They are not the canonical architecture for Stage Presence OS.

## Free-stack implementation
The repository now includes a zero-cost-first implementation scaffold:
- React 19 + TypeScript + Vite
- Tailwind CSS
- Supabase client boundary
- Cloudflare Workers Static Assets configuration in `wrangler.jsonc`
- applied v0.1 database/RLS migrations under `database/`

The Cloudflare target is intentionally static-only in First Breath: no Worker script is required. `dist/` is served with single-page-app fallback, leaving server-side Workers as a future capability only if evidence earns it.

The UI runs in explicit DEMO MODE when Supabase environment variables are absent. Demo records are synthetic and never presented as Stage Presence data.

See `docs/FREE_STACK.md`, `docs/SECURITY_MODEL.md`, `docs/DEPLOYMENT.md`, and `docs/PERMISSION_GATES.md`.
