# Stage Presence MCP Bridge

A narrow remote MCP server that lets the Stage Presence Cockpit Artifact query **real, current** Stage Presence data at the moment Greg asks — not an embedded snapshot — and write exactly one kind of approved change back.

```
Greg → Artifact → Claude (mcp capability) → this bridge → Supabase (canonical views/tables) → real data
```

It exposes exactly 9 tools, each a fixed, parameterized read or write against an existing canonical view/table (`engagement_summary_v`, `price_book_v`, `parties`, `engagements` + its relations, `work_items`). **It never accepts or runs arbitrary SQL.** This is deliberately the opposite of handing the Artifact Supabase's own developer MCP connector, which is a full database/project management surface (create/pause projects, run arbitrary SQL, manage billing) — not something that should ever be reachable from a Greg-facing surface.

Transport: MCP Streamable HTTP, served at `POST /mcp` (built with `@modelcontextprotocol/server` + `agents/mcp/server`). `GET /` is a plain JSON health check.

## Tools

**Reads (8):** `find_contact`, `find_engagement`, `get_pricing`, `generate_lead_summary`, `generate_job_sheet`, `search_stage_presence`, `get_attention_items`, `get_upcoming_engagements` — same names and intent as the capabilities in `src/lib/capabilityRegistry.ts`. Live reads through the deployed Worker have been proven against real Supabase data.

**Write (1): `set_next_action`.** Inserts exactly one `OPEN` row into `public.work_items` for a real engagement — never modifies, cancels, completes, or reprioritizes any other existing work item. Only runs when `confirmed: true` is passed (enforced both by the input schema and inside the handler) — the Artifact must only send that after the human clicked Approve on the exact proposed change. Idempotent: retries with the same `idempotencyKey` re-affirm the same row via the table's unique `source_key` column instead of creating a duplicate. Always re-reads the row (and the engagement's current `next_work`) after writing — reports `saved: true, verificationState: "VERIFIED_SAVED"` only if that re-read confirms it, otherwise `saved: false, verificationState: "NOT_SAVED"` with a `reason`. MCP annotations: `readOnlyHint: false`, `destructiveHint: false`, `idempotentHint: true`.

## Auth model

- **Bridge → Supabase**: a `SUPABASE_SERVICE_ROLE_KEY` held only as a Cloudflare Worker secret, never sent to the browser or the Artifact. It bypasses RLS, which is safe here specifically because the Worker code only ever runs the 9 fixed, hardcoded query/mutation shapes above — there is no path for a caller to widen what gets queried or written.
- **Claude → Bridge**: a shared `BRIDGE_TOKEN`, checked on every `/mcp` request via either an `x-api-key` header or an `Authorization: Bearer` header. Without a match, every request gets `401` (with no `WWW-Authenticate` challenge, so MCP clients don't mistakenly try to start an OAuth flow against a bridge that doesn't use it).

## Local development

```bash
cd mcp-bridge
npm install
cp .dev.vars.example .dev.vars   # fill in the real service-role key + a random bridge token
npm run dev                       # runs wrangler dev on this worker
```

`.dev.vars` is gitignored — never commit it.

## Deploying

```bash
cd mcp-bridge
npm install
npx wrangler login                                  # once, opens a browser
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# paste the value from Supabase → Project Settings → API → service_role secret key
npx wrangler secret put BRIDGE_TOKEN
# paste a random value, e.g. from: openssl rand -hex 32
npx wrangler deploy
```

This deploys a **separate** Worker (`stage-presence-mcp-bridge`) alongside the existing `stage-presence-os` static-assets Worker — it does not touch the deployed app. Wrangler prints the Worker's URL, e.g. `https://stage-presence-mcp-bridge.<your-subdomain>.workers.dev`.

## Registering it as a claude.ai connector

1. On claude.ai: **Settings → Connectors → Add connector → Remote**.
2. Name: `stage-presence` (lowercase, hyphens).
3. URL: the deployed Worker URL, with `/mcp` appended (e.g. `https://stage-presence-mcp-bridge.<subdomain>.workers.dev/mcp`).
4. Advanced settings → **Headers**: add `x-api-key: <the same BRIDGE_TOKEN>` (or `Authorization: Bearer <BRIDGE_TOKEN>` — both are accepted).
5. Save, then enable it for the chat/session where the Cockpit Artifact is used.

This is deployed and connected today — the Cockpit Artifact declares `capabilities: { mcp: { servers: [{ server: "stage-presence", tools: [...] }] } }` and live reads through it have been verified against real Supabase data.
