# Permission Gates

The build should proceed autonomously until an action changes an external account, incurs cost, exposes data, sends communication, or creates an irreversible commitment.

## Completed gates
- Dedicated private GitHub repository created and verified private.
- Whole-company business model reference committed.
- Dedicated Stage Presence Supabase project created at $0/month.
- Shared Reality schema/RLS applied and reviewed.
- Database-level history triggers applied.
- Provisional inventory reference imported and verified.
- First Breath application/workspace committed to `main`.
- First real Supabase Auth user created by the user and deliberately bootstrapped as active `ADMIN`.
- Authentication-vs-membership boundary verified under simulated authenticated contexts: ADMIN can see company resources; non-member sees zero.

## Current gate — Cloudflare account / GitHub authorization
No Cloudflare account connector is available in this ChatGPT session. Creating a Cloudflare Worker, installing/authorizing Cloudflare's GitHub integration, and connecting the private repository changes the user's Cloudflare/GitHub account state and therefore requires human authorization.

Architecture has been updated to the current recommended Cloudflare path: **Workers Static Assets**, not a new Pages project.

Human action:
1. Sign into or create a Cloudflare account.
2. Go to **Workers & Pages** → **Create application**.
3. Choose **Import a repository** / get started with repository import.
4. Connect GitHub and authorize access to repository `firstrateent-star/stage-presence-os` (prefer repository-specific access rather than all repositories if GitHub offers that choice).
5. Select `stage-presence-os`.
6. Worker/project name must be exactly `stage-presence-os` to match `wrangler.jsonc`.
7. Production branch: `main`.
8. Build command: `npm run build`.
9. Deploy command: `npx wrangler deploy`.
10. Root directory: repository root.
11. Add build environment values `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never add a Supabase service-role/secret key.
12. Save/deploy using the default `workers.dev` address. Do not attach a public/custom Stage Presence domain yet.

The first Cloudflare build becomes the authoritative dependency install / TypeScript / Vite compiler check because the current execution environment cannot reach npm.

## Later gates
- adding more internal users / changing their access roles
- enabling source-document/photo storage
- connecting paid AI
- sending emails/texts
- QuickBooks or Goodshuffle writes
- creating contractual documents/signatures
- reserving scarce resources automatically
- payments
- public/custom-domain exposure
