# Stage Presence MCP Bridge

A narrow, read-only remote MCP server that lets the Stage Presence Cockpit Artifact query **real, current** Stage Presence data at the moment Greg asks — not an embedded snapshot.

```
Greg → Artifact → Claude (mcp capability) → this bridge → Supabase (canonical views) → real data
```

It exposes exactly 8 tools, each a fixed, parameterized read against an existing canonical view/table (`engagement_summary_v`, `price_book_v`, `parties`, `engagements` + its relations). **It never accepts or runs arbitrary SQL, and it never writes.** This is deliberately the opposite of handing the Artifact Supabase's own developer MCP connector, which is a full database/project management surface (create/pause projects, run arbitrary SQL, manage billing) — not something that should ever be reachable from a Greg-facing surface.

## Tools

`find_contact`, `find_engagement`, `get_pricing`, `generate_lead_summary`, `generate_job_sheet`, `search_stage_presence`, `get_attention_items`, `get_upcoming_engagements` — same names and intent as the capabilities in `src/lib/capabilityRegistry.ts`.

## Auth model

- **Bridge → Supabase**: a `SUPABASE_SERVICE_ROLE_KEY` held only as a Cloudflare Worker secret, never sent to the browser or the Artifact. It bypasses RLS, which is safe here specifically because the Worker code only ever runs the 8 fixed, hardcoded query shapes above — there is no path for a caller to widen what gets queried.
- **Claude → Bridge**: a shared `BRIDGE_TOKEN` bearer secret, checked on every request. Without it, every request gets `401`.

## Local development

```bash
cd mcp-bridge
cp .dev.vars.example .dev.vars   # fill in the real service-role key + a random bridge token
npm run mcp:dev                   # from repo root; runs wrangler dev on this worker
```

`.dev.vars` is gitignored — never commit it.

## Deploying (you'll need to do this — I don't have Cloudflare credentials in this session)

```bash
cd mcp-bridge
npx wrangler login                                        # once, opens a browser
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config wrangler.jsonc
# paste the value from Supabase → Project Settings → API → service_role secret key
npx wrangler secret put BRIDGE_TOKEN --config wrangler.jsonc
# paste a random value, e.g. from: openssl rand -hex 32
npx wrangler deploy --config wrangler.jsonc
```

This deploys a **separate** Worker (`stage-presence-mcp-bridge`) alongside the existing `stage-presence-os` static-assets Worker — it does not touch the deployed app. Wrangler will print the Worker's URL, something like `https://stage-presence-mcp-bridge.<your-subdomain>.workers.dev`.

## Registering it as a claude.ai connector (also your step)

1. On claude.ai: **Settings → Connectors → Add connector → Remote**.
2. Name: `stage-presence` (lowercase, hyphens).
3. URL: the Worker URL from the deploy step above.
4. Advanced settings → **Headers**: add `Authorization: Bearer <the same BRIDGE_TOKEN you set above>`.
5. Save, then enable it for the chat/session where the Cockpit Artifact is used.

Once connected, tell me — I'll update the Artifact to declare `capabilities: { mcp: { servers: [{ server: "stage-presence", tools: [...] }] } }` and switch its status indicator to reflect real per-query live reads, with the explicit try-live-then-offer-snapshot fallback behavior (never a silent fallback).

## What I verified from inside this session

- The JSON-RPC/MCP protocol handling (`initialize`, `tools/list`, `tools/call`), the `401` on missing/wrong `BRIDGE_TOKEN`, and the honest-failure path (`isError: true` with a plain message, never a silent empty result) — tested locally against a running `wrangler dev` instance.
- I could **not** verify an actual live Supabase read from this session: this sandbox's own network egress blocks arbitrary outbound hosts (unrelated to this code — the real deployed Worker runs on Cloudflare's network and won't have that restriction), and I don't have the real `SUPABASE_SERVICE_ROLE_KEY` (nor should I — that's yours to hold). Verify the 4 acceptance tests once it's deployed and connected.
