# Deployment Runbook — Cloudflare Pages

## Before deployment
1. Dedicated private GitHub repository exists.
2. Source tree and documentation are committed.
3. Dedicated Supabase project exists.
4. Schema has been reviewed/applied and advisors are clean enough for v0.1.
5. At least one authorized internal user exists in Auth and `app_members`.
6. Local `.env` has the Supabase URL + publishable key only.

## Cloudflare Pages
Create a Pages project by importing the GitHub repository.

Build configuration:
- Production branch: `main`
- Build command: `npm run build`
- Build directory: `dist`

Environment values:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Do not add a service-role key.

## Deployment policy
- Pull requests / branches are for preview and verification.
- `main` is the production branch.
- Do not add Pages Functions until a real requirement earns server-side compute.
- Do not attach a Stage Presence custom domain until the internal app has proven useful. The default pages.dev address is sufficient for First Breath.

## Rollback
Cloudflare retains deployment history. If a release breaks the app, roll back the Pages deployment and revert the Git commit. Database migrations require a separate forward-fix plan; avoid destructive migrations.
