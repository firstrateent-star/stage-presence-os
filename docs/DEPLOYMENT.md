# Deployment Runbook — Cloudflare Workers Static Assets

## Before deployment
1. Dedicated private GitHub repository exists.
2. Source tree and documentation are committed.
3. Dedicated Supabase project exists.
4. Schema has been reviewed/applied and security advisor is clean for v0.1.
5. At least one authorized internal user exists in Auth and `app_members`.
6. Authentication and membership are separate gates in the frontend.
7. `wrangler.jsonc` is committed and names the Worker `stage-presence-os`.

## Why Workers, not Pages
Cloudflare's current guidance recommends Workers for new applications. Stage Presence OS uses Workers Static Assets only in First Breath: no Worker script runs for normal app requests. Static asset requests are free/unlimited; Workers Builds supplies the CI/CD path and leaves room for server-side logic later without migrating hosting platforms.

## Cloudflare Workers Builds
In Cloudflare: Workers & Pages → Create application → Import a repository.

Connect GitHub repository:
- `firstrateent-star/stage-presence-os`

Configuration:
- Worker/project name: `stage-presence-os` (must match `wrangler.jsonc`)
- Production branch: `main`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: repository root

The committed `wrangler.jsonc` provides:
- static assets directory: `./dist/`
- SPA fallback: `single-page-application`

Environment values required at build time:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Do not add a service-role key, secret API key, or database password.

## First deployment policy
- Use the default `workers.dev` URL for First Breath.
- Do not attach a public Stage Presence custom domain yet.
- The first connected build is the authoritative dependency install / TypeScript / Vite compiler check because the ChatGPT execution environment could not reach npm.
- Do not enter live customer information until the first build, login, membership gate, and basic read/write loop are verified in-browser.

## Preview / production
Workers Builds listens to `main` for production. Non-production branches use Cloudflare's preview version flow. Keep architectural changes reviewable in Git before promoting them.

## Rollback
Cloudflare retains Worker versions/deployments. If a frontend release breaks the app, restore a known-good Worker version and revert the Git commit. Database migrations require a separate forward-fix plan; avoid destructive migrations.
