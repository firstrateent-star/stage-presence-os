# Stage Presence OS

Canonical reference for the Stage Presence operating-system build.

## Purpose
Stage Presence OS is a private internal company-state and decision-support system for Stage Presence, an LED-first live visual production and integration company.

The operating goal is **Intuitive Business Reality**: tell the system what is happening once; it remembers it, distinguishes known from unknown, preserves provenance, surfaces what matters, and keeps the next movement from disappearing.

This repository/document bundle is intentionally clean-slate. It does **not** inherit the old CRM assumption of separate Lead -> Quote -> Event universes.

## Read order
1. `docs/BUSINESS_MODEL_CURRENT.md`
2. `docs/CURRENT_STATE.md`
3. `docs/CHAT_OPERATING_WORKFLOW.md`
4. `docs/CONSTITUTION.md`
5. `docs/SYSTEM_MAP.md`
6. `docs/DATA_MODEL.md`
7. `docs/CAPABILITIES_CURRENT.md`
8. `docs/ROADMAP.md`
9. `docs/QUICK_LEAD_SHEET.md`
10. `docs/CAPTURE_CONTRACT.md`
11. `docs/DECISIONS.md`
12. `docs/AI_CONTRACT.md`
13. `docs/INVENTORY_IMPORT.md`
14. `docs/VALUE_LEDGER.md`
15. `docs/TEST_PLAN.md`

## Current operating mode — 2026-09-09
The system is live enough for controlled internal use and is now in **Operational Validation** rather than continuous feature expansion.

Goodshuffle has seeded historical/current operating evidence into the canonical Stage Presence model. New work should enter according to Forward-Born Truth, while inherited work is strengthened only where real business continuity requires it.

For now, ChatGPT is the preferred flexible interpretation layer for photos, pasted text, conversations, call recaps, quote/payment/job updates, and similar Stage Presence reality. See `docs/CHAT_OPERATING_WORKFLOW.md` for the exact workflow and resume instructions if a chat reaches its context limit.

The default is **operate and learn, not keep building**. Reopen development when real use exposes a recurring representational, decision, capacity, continuity, or re-entry problem that the current backend cannot handle well.

Lovable remains frozen as historical prototype context. No paid AI API interpreter, public intake, autonomous reservation, payment automation, or customer-facing commitment automation has been enabled.

## Existing prototypes
Historical Lovable prototypes exist and should be treated as reference only:
- Stage Presence Hub
- Stage Presence Hub (57)
- Stage Presence Intake

They are not the canonical architecture for Stage Presence OS.

## Free-stack implementation
The repository includes:
- React 19 + TypeScript + Vite
- Tailwind CSS
- Supabase client/backend boundary
- Cloudflare Workers Static Assets deployment
- applied database/RLS migrations under `database/`
- GitHub branch -> build check -> PR -> `main` deployment discipline

The UI runs in explicit DEMO MODE when Supabase environment variables are absent. Demo records are synthetic and never presented as Stage Presence data.

See `docs/FREE_STACK.md`, `docs/SECURITY_MODEL.md`, `docs/DEPLOYMENT.md`, and `docs/PERMISSION_GATES.md`.
