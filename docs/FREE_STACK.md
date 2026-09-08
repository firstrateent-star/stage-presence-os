# Free Stack — Stage Presence OS v0.1

## Chosen shape
- GitHub: canonical code + docs
- Cloudflare Workers Static Assets: React/Vite frontend hosting
- Supabase Free: Auth + Postgres + later Storage
- No paid AI API in First Breath
- Lovable frozen as historical prototype environment

## Why this shape
The app is private/internal and does not need SEO or a full application server. The browser talks directly to Supabase using a publishable key while RLS enforces authorization. Cloudflare serves the compiled Vite bundle as static assets.

Cloudflare now recommends Workers for new applications. Stage Presence OS does not currently need a Worker script: `wrangler.jsonc` points directly at `dist/` and uses SPA fallback routing. Static asset requests are free and unlimited, and Workers Builds currently includes 3,000 build minutes/month on the Free plan. This avoids per-deploy credit anxiety while preserving a path to server-side Workers later if evidence earns it.

## Cloudflare configuration
Repository configuration is committed in `wrangler.jsonc`:
- Worker name: `stage-presence-os`
- static asset directory: `./dist/`
- SPA fallback: `single-page-application`
- no Worker `main` entrypoint in First Breath

Workers Builds configuration:
- production branch: `main`
- build command: `npm run build`
- deploy command: `npx wrangler deploy`
- non-production deploy command: Cloudflare default `npx wrangler versions upload`

Build environment values:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

These values are intentionally browser-visible. Never add a service-role key, database password, or other secret to Vite-prefixed variables.

## Current status / remaining permission gates
Completed:
- Dedicated private GitHub repository created.
- Dedicated Stage Presence Supabase project created at $0/month.
- Database schema/RLS applied and security-advisor clean.
- First real Auth user bootstrapped as active ADMIN.
- RLS verified: ADMIN sees the 67 provisional resources; simulated authenticated non-member sees zero.
- Workers Static Assets configuration committed.

Still required:
1. Connect/import the private GitHub repository into the user's Cloudflare account using Workers Builds.
2. Add the two Supabase publishable build environment values.
3. Allow the first Cloudflare build to become the authoritative dependency install / TypeScript / Vite verification.
