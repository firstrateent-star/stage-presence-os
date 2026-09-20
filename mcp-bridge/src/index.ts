import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  BRIDGE_TOKEN: string;
}

function sanitizeTerm(raw: string): string {
  return String(raw || "").replace(/[,()*]/g, " ").trim().slice(0, 120);
}

async function pgrest(env: Env, path: string, params: Record<string, string>): Promise<any> {
  const url = new URL(env.SUPABASE_URL + "/rest/v1/" + path);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const res = await fetch(url.toString(), {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase read failed (${res.status}): ${body.slice(0, 500)}`);
  }

  return res.json();
}

/* ============================== fixed read capabilities ============================== */

async function findContact(env: Env, args: { query: string }) {
  const term = sanitizeTerm(args.query);
  if (!term) return [];

  return pgrest(env, "parties", {
    select: "id,party_type,name,organization_name,email,phone",
    or: `(name.ilike.*${term}*,organization_name.ilike.*${term}*,email.ilike.*${term}*,phone.ilike.*${term}*)`,
    limit: "20",
  });
}

async function findEngagement(env: Env, args: { query: string }) {
  const term = sanitizeTerm(args.query);
  if (!term) return [];

  return pgrest(env, "engagement_summary_v", {
    select:
      "id,engagement_number,name,engagement_type,customer_request,event_start_date,commercial_state,commitment_state,operational_state,attention_state,venue,primary_customer,next_work",
    or: `(name.ilike.*${term}*,engagement_number.ilike.*${term}*,customer_request.ilike.*${term}*,venue->>name.ilike.*${term}*,primary_customer->>name.ilike.*${term}*,primary_customer->>organization_name.ilike.*${term}*)`,
    limit: "20",
    order: "updated_at.desc",
  });
}

async function getPricing(
  env: Env,
  args: { item?: string; category?: string; roleCode?: string; scopeType?: string },
) {
  const params: Record<string, string> = {
    select:
      "pricing_rule_id,entry_kind,name,scope_label,resource_name,rate_type,billing_basis,duration_value,duration_unit,amount,currency,status,authority_state,effective_from,effective_through",
    order: "authority_state,resource_name",
  };

  if (args.item) {
    const term = sanitizeTerm(args.item);
    params.or = `(resource_name.ilike.*${term}*,scope_label.ilike.*${term}*,name.ilike.*${term}*)`;
  }
  if (args.category) params.category = `eq.${args.category}`;
  if (args.roleCode) params.role_code = `eq.${args.roleCode}`;
  if (args.scopeType) params.scope_type = `eq.${args.scopeType}`;

  return pgrest(env, "price_book_v", params);
}

async function loadEngagementByNumber(env: Env, engagementNumber: string) {
  const rows = await pgrest(env, "engagements", {
    select: [
      "id,engagement_number,name,engagement_type,commercial_state,commitment_state,operational_state,attention_state,event_start_date,customer_request",
      "engagement_parties(role,is_primary,parties(name,organization_name,email,phone))",
      "engagement_resources(quantity,relationship,resources(name))",
      "engagement_facts(label,certainty_state)",
      "engagement_assignments(role_code,assignment_state,team_members(display_name))",
      "engagement_schedule_items(schedule_type,label,start_at,start_date,time_state)",
    ].join(","),
    engagement_number: `eq.${engagementNumber}`,
    limit: "1",
  });

  return rows?.[0] ?? null;
}

async function generateLeadSummary(env: Env, args: { engagementNumber: string }) {
  const e = await loadEngagementByNumber(env, args.engagementNumber);
  if (!e) return { found: false, engagementNumber: args.engagementNumber };

  const primary =
    (e.engagement_parties || []).find((p: any) => p.is_primary) ||
    (e.engagement_parties || [])[0];
  const customerName =
    primary?.parties?.organization_name || primary?.parties?.name || "Unknown customer";
  const openFacts = (e.engagement_facts || [])
    .filter((f: any) =>
      ["UNKNOWN", "REQUESTED", "CONFLICTING"].includes(f.certainty_state),
    )
    .map((f: any) => f.label);
  const resourceNames = (e.engagement_resources || [])
    .map((r: any) => r.resources?.name)
    .filter(Boolean);

  const lines = [
    `${e.name} (${e.engagement_number})`,
    `Customer: ${customerName}`,
    `Type: ${e.engagement_type} · Commercial: ${e.commercial_state} · Commitment: ${e.commitment_state}`,
    e.event_start_date ? `Date: ${e.event_start_date}` : "Date: unknown",
    e.customer_request ? `Request: ${e.customer_request}` : "Request: not recorded",
    resourceNames.length
      ? `Resources: ${resourceNames.join(", ")}`
      : "Resources: none linked yet",
    openFacts.length
      ? `Open unknowns: ${openFacts.join("; ")}`
      : "Open unknowns: none recorded",
  ];

  return { found: true, engagement: e, text: lines.join("\n") };
}

async function generateJobSheet(env: Env, args: { engagementNumber: string }) {
  const e = await loadEngagementByNumber(env, args.engagementNumber);
  if (!e) return { found: false, engagementNumber: args.engagementNumber };

  const contacts = (e.engagement_parties || []).map(
    (p: any) =>
      `- ${p.role}: ${p.parties?.name ?? "unknown"}${p.parties?.phone ? " · " + p.parties.phone : ""}`,
  );
  const resources = (e.engagement_resources || []).map(
    (r: any) =>
      `- ${r.resources?.name ?? "unknown resource"} (${r.relationship}${r.quantity ? " × " + r.quantity : ""})`,
  );
  const schedule = (e.engagement_schedule_items || []).map(
    (s: any) =>
      `- ${s.schedule_type} — ${s.label} — ${s.start_at || s.start_date || "TBD"} (${s.time_state})`,
  );

  const lines = [
    `JOB SHEET — ${e.name} (${e.engagement_number})`,
    e.event_start_date ? `Date: ${e.event_start_date}` : "Date: TBD",
    "",
    "Contacts:",
    ...(contacts.length ? contacts : ["- none recorded"]),
    "",
    "Resources:",
    ...(resources.length ? resources : ["- none recorded"]),
    "",
    "Schedule:",
    ...(schedule.length ? schedule : ["- not scheduled"]),
  ];

  return { found: true, engagement: e, text: lines.join("\n") };
}

async function searchStagePresence(env: Env, args: { query: string }) {
  const [engagements, contacts] = await Promise.all([
    findEngagement(env, args),
    findContact(env, args),
  ]);

  return {
    engagements: engagements.map((e: any) => ({
      kind: "ENGAGEMENT",
      id: e.id,
      number: e.engagement_number,
      label: e.name,
    })),
    contacts: contacts.map((c: any) => ({
      kind: "CONTACT",
      id: c.id,
      label: c.name,
      subtitle: c.organization_name || c.email || c.phone || null,
    })),
  };
}

async function getAttentionItems(env: Env) {
  return pgrest(env, "engagement_summary_v", {
    select:
      "id,engagement_number,name,attention_state,commercial_state,commitment_state,open_work_count,primary_customer,venue,next_work,event_start_date",
    or: "(attention_state.neq.NORMAL,open_work_count.gt.0)",
    order: "attention_state.desc,event_start_date.asc",
    limit: "25",
  });
}

async function getUpcomingEngagements(env: Env, args: { limit?: number }) {
  const today = new Date().toISOString().slice(0, 10);

  return pgrest(env, "engagement_summary_v", {
    select:
      "id,engagement_number,name,event_start_date,commercial_state,commitment_state,operational_state,attention_state,primary_customer,venue,next_work",
    event_start_date: `gte.${today}`,
    order: "event_start_date.asc",
    limit: String(args.limit && args.limit > 0 && args.limit <= 50 ? args.limit : 15),
  });
}

function asToolResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function asToolError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [
      {
        type: "text" as const,
        text: `Stage Presence data is currently unavailable. (${message})`,
      },
    ],
    isError: true,
  };
}

function createServer(env: Env) {
  const server = new McpServer({
    name: "stage-presence-mcp-bridge",
    version: "0.2.0",
  });

  server.registerTool(
    "find_contact",
    {
      description:
        "Search real Stage Presence Parties by name, organization, email, or phone. Read-only.",
      inputSchema: z.object({ query: z.string() }),
    },
    async ({ query }) => {
      try {
        return asToolResult(await findContact(env, { query }));
      } catch (error) {
        return asToolError(error);
      }
    },
  );

  server.registerTool(
    "find_engagement",
    {
      description:
        "Search real Stage Presence Engagements by name, number, customer, or venue. Read-only.",
      inputSchema: z.object({ query: z.string() }),
    },
    async ({ query }) => {
      try {
        return asToolResult(await findEngagement(env, { query }));
      } catch (error) {
        return asToolError(error);
      }
    },
  );

  server.registerTool(
    "get_pricing",
    {
      description:
        "Read the real current Price Book with explicit authority state. Read-only.",
      inputSchema: z.object({
        item: z.string().optional(),
        category: z.string().optional(),
        roleCode: z.string().optional(),
        scopeType: z.string().optional(),
      }),
    },
    async (args) => {
      try {
        return asToolResult(await getPricing(env, args));
      } catch (error) {
        return asToolError(error);
      }
    },
  );

  server.registerTool(
    "generate_lead_summary",
    {
      description:
        "Produce a summary of a real Engagement by engagement number. Read-only.",
      inputSchema: z.object({ engagementNumber: z.string() }),
    },
    async ({ engagementNumber }) => {
      try {
        return asToolResult(await generateLeadSummary(env, { engagementNumber }));
      } catch (error) {
        return asToolError(error);
      }
    },
  );

  server.registerTool(
    "generate_job_sheet",
    {
      description:
        "Produce a job sheet for a real Engagement by engagement number. Read-only.",
      inputSchema: z.object({ engagementNumber: z.string() }),
    },
    async ({ engagementNumber }) => {
      try {
        return asToolResult(await generateJobSheet(env, { engagementNumber }));
      } catch (error) {
        return asToolError(error);
      }
    },
  );

  server.registerTool(
    "search_stage_presence",
    {
      description:
        "Search across real Stage Presence Engagements and Contacts. Read-only.",
      inputSchema: z.object({ query: z.string() }),
    },
    async ({ query }) => {
      try {
        return asToolResult(await searchStagePresence(env, { query }));
      } catch (error) {
        return asToolError(error);
      }
    },
  );

  server.registerTool(
    "get_attention_items",
    {
      description:
        "Return real Stage Presence Engagements that currently need attention. Read-only.",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        return asToolResult(await getAttentionItems(env));
      } catch (error) {
        return asToolError(error);
      }
    },
  );

  server.registerTool(
    "get_upcoming_engagements",
    {
      description:
        "Return real future Stage Presence Engagements, soonest first. Read-only.",
      inputSchema: z.object({
        limit: z.number().int().positive().max(50).optional(),
      }),
    },
    async ({ limit }) => {
      try {
        return asToolResult(await getUpcomingEngagements(env, { limit }));
      } catch (error) {
        return asToolError(error);
      }
    },
  );

  return server;
}

function unauthorized() {
  // This bridge uses a static API key, not OAuth. Do not advertise a
  // WWW-Authenticate challenge or MCP clients may incorrectly start OAuth.
  return new Response("Unauthorized", { status: 401 });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return Response.json({
        name: "stage-presence-mcp-bridge",
        status: "ok",
        protocol: "streamable-http",
        endpoint: "/mcp",
        authentication: "x-api-key",
      });
    }

    if (url.pathname !== "/mcp") {
      return new Response("Not found", { status: 404 });
    }

    const apiKey = request.headers.get("x-api-key") || "";
    const auth = request.headers.get("authorization") || "";
    const tokenMatches =
      apiKey === env.BRIDGE_TOKEN || auth === `Bearer ${env.BRIDGE_TOKEN}`;

    if (!env.BRIDGE_TOKEN || !tokenMatches) {
      return unauthorized();
    }

    const handler = createMcpHandler(() => createServer(env), {
      route: "/mcp",
      legacy: "stateless",
    });

    return handler(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
