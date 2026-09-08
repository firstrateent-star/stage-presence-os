# Free Stack — Stage Presence OS v0.1

## Chosen shape
- GitHub: canonical code + docs
- Cloudflare Pages: static React/Vite frontend
- Supabase Free: Auth + Postgres + later Storage
- No paid AI API in First Breath
- Lovable frozen as historical prototype environment

## Why this shape
The app is private/internal and does not need SEO or a full application server. The browser can talk directly to Supabase using a publishable key while RLS enforces authorization. Cloudflare serves static compiled assets. This minimizes cost and moving parts.

## Cloudflare configuration
- build command: `npm run build`
- build output: `dist`
- Free plan: 500 builds/month
- Static asset requests are free/unlimited
- No Pages Functions are required in v0.1

`public/_redirects` contains the SPA fallback.

## Current status / remaining permission gates
- Dedicated private GitHub repository: created.
- Dedicated Stage Presence Supabase project: created at $0/month.
- Database schema/RLS: applied and security-advisor clean.

Still required:
1. Create/invite actual auth users and bootstrap `app_members`.
2. Create/connect Cloudflare Pages project to the GitHub repository.
3. Add Supabase URL and publishable key as Cloudflare build environment values.
