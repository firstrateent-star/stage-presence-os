# Permission Gates

The build should proceed autonomously until an action changes an external account, incurs cost, exposes customer/business data to a new processor or audience, sends communication, grants access, or creates an irreversible business commitment.

## Completed gates
- Private GitHub repository created and verified private.
- Dedicated Stage Presence Supabase project created on the Free plan.
- Shared Reality schema, RLS and history triggers applied/reviewed.
- Provisional inventory evidence imported without treating uncertain quantities/prices as canonical truth.
- Internal ADMIN account created and membership boundary verified; non-member access returns no company data.
- Cloudflare connected to the private repository and production deployment proven by the user.
- Private `source-artifacts` Storage enabled for Stage Presence members.
- Photo/camera source capture enabled with private object access; no public source URLs.
- Goodshuffle historical project/resource evidence translated into the Stage Presence model.

These approvals do **not** authorize unrelated projects, public exposure, new users, paid AI, outbound communication, payments, or automatic reservations.

## Current gate — Capture Interpreter / external AI processing

The next major leverage point is translating a photographed lead sheet or natural-language capture into candidate Stage Presence structure with almost no Greg administration.

Activating this requires a fresh explicit approval because customer/business source material would be processed by an external AI API and API usage can incur cost.

Before activation, resolve and document:
1. **Provider/project ownership** — use a dedicated Vlourish / Stage Presence API project rather than a personal catch-all key.
2. **Data boundary** — send only source/context necessary for interpretation; do not send unrelated Stage Presence records.
3. **Output authority** — AI output is candidate interpretation, not verified business truth.
4. **Promotion authority** — no silent contractual, pricing, capacity, payment, reservation, or safety commitments.
5. **Confidence handling** — material ambiguity must remain visible or ask one targeted question.
6. **Matching** — ambiguous Party/Engagement matches must never be silently merged.
7. **Cost/budget** — establish a small explicit operating budget/limit before paid calls are enabled.
8. **Secrets** — API keys must be server-side only; never in Vite/browser environment variables or GitHub source.
9. **Logging/retention** — retain enough interpreter provenance to know what source produced each candidate while avoiding unnecessary duplication of sensitive source content.

Until this gate is approved, Quick Capture remains useful: it preserves photo/text evidence privately and creates a canonical Engagement without manufacturing interpretation.

### Scoped resolution — Claude-in-Artifact cockpit (2026-09-20)

Greg approved moving forward specifically for a Claude-powered Artifact cockpit calling the Stage Presence Capability Registry (`src/lib/capabilityRegistry.ts`), not a server-side paid third-party API integration. See `docs/DECISIONS.md` (2026-09-20) for how each of the nine items above resolves for that specific form — several (provider/project ownership, cost/budget, secrets) are structurally inapplicable because there is no separate API key or metered usage; the rest (data boundary, output authority, promotion authority, confidence handling, matching, logging/retention) are satisfied by the Capability Registry's read-only surface and `requiresHumanReview` enforcement. A future server-side paid AI integration is a different case and still requires this gate's full, unscoped resolution.

## Other future gates
- adding Greg, Nancy, Operations, or other internal accounts / changing access roles
- widening private source Storage from images to documents/spreadsheets through an actual intake surface
- public website/customer intake
- sending automated email/text/customer communications
- QuickBooks or Goodshuffle write access
- contractual proposal/signature automation
- provisional holds/reservations created automatically
- payment collection or payment-method access
- custom/public Stage Presence domain exposure if it changes audience/security assumptions
- any paid service not already explicitly approved

## Permanent boundaries
- Never expose Supabase service-role keys, DB passwords, payment credentials, or AI secrets to the browser.
- Never infer `CONFIRMED`, payment, hold, reservation, ownership, availability, or verified technical requirement merely from a legacy status or AI interpretation.
- Never touch the separate `nfl-dfs-monster` project while working on Stage Presence OS.
