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

## Current gate 1 — first internal identity
The database intentionally authorizes nobody yet. Supabase tooling available in this ChatGPT session does not expose a safe Auth-admin create/invite-user action, and we will not bypass Supabase Auth by inserting directly into `auth.users`.

Human action:
1. Open the Supabase project `stage-presence-os`.
2. Go to Authentication → Users.
3. Add/create one internal user account using the email/login you want for the first administrator.
4. Do not add real customer data yet.

After that account exists, ChatGPT can locate the new auth user and insert the corresponding `public.app_members` row with role `ADMIN`, then verify RLS access.

## Current gate 2 — Cloudflare Pages authorization
No Cloudflare deployment integration is available in this ChatGPT session. Connecting the private GitHub repository to a Cloudflare account requires human authentication/authorization.

Human action after/alongside the first user bootstrap:
1. Sign into Cloudflare.
2. Create/import a Pages project from GitHub repository `firstrateent-star/stage-presence-os`.
3. Production branch: `main`.
4. Build command: `npm run build`.
5. Build output directory: `dist`.
6. Add build environment values `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the Stage Presence Supabase project. Never add a service-role/secret key.
7. Use the default Pages URL for First Breath; do not attach a public Stage Presence custom domain yet.

The first Cloudflare build becomes the authoritative dependency install / TypeScript / Vite compiler check because the current execution environment cannot reach the npm registry.

## Later gates
- enabling source-document/photo storage
- connecting paid AI
- sending emails/texts
- QuickBooks or Goodshuffle writes
- creating contractual documents/signatures
- reserving scarce resources automatically
- payments
- public/custom-domain exposure
