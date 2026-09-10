-- Fulfillment-plan kernel earned from Goodshuffle pull sheets.
-- Commercial document = what was offered/billed.
-- Fulfillment plan = what the team is currently expected to prepare/deliver.
-- Neither implies physical reservation or actual usage by itself.

create table public.fulfillment_plans (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  plan_type text not null default 'PULL_SHEET' check (plan_type in ('PULL_SHEET','JOB_PLAN','ASSIGNMENT_SHEET','PACKING_LIST','OTHER')),
  plan_state text not null default 'ACTIVE' check (plan_state in ('DRAFT','ACTIVE','SUPERSEDED','COMPLETE','UNKNOWN')),
  source_system text,
  external_plan_id text,
  source_key text unique,
  snapshot_at timestamptz,
  notes text,
  source_artifact_id uuid references public.source_artifacts(id) on delete set null,
  source_segment_id uuid references public.source_artifact_segments(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index fulfillment_plans_engagement_idx on public.fulfillment_plans(engagement_id,plan_state);

create table public.fulfillment_plan_lines (
  id uuid primary key default gen_random_uuid(),
  fulfillment_plan_id uuid not null references public.fulfillment_plans(id) on delete cascade,
  source_key text unique,
  sort_order integer,
  line_type text not null default 'OTHER' check (line_type in ('RESOURCE','SERVICE','LABOR','LOGISTICS','CUSTOM','NOTE','OTHER')),
  item_type text,
  primary_category text,
  subcategory text,
  title text not null,
  description text,
  internal_notes text,
  quantity numeric(12,3),
  external_item_id text,
  resource_id uuid references public.resources(id) on delete set null,
  event_time_text text,
  source_segment_id uuid references public.source_artifact_segments(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index fulfillment_plan_lines_plan_idx on public.fulfillment_plan_lines(fulfillment_plan_id,sort_order);
create index fulfillment_plan_lines_resource_idx on public.fulfillment_plan_lines(resource_id);
create index fulfillment_plan_lines_external_idx on public.fulfillment_plan_lines(external_item_id);

alter table public.fulfillment_plans enable row level security;
alter table public.fulfillment_plan_lines enable row level security;
create policy fulfillment_plans_member_all on public.fulfillment_plans for all using (private.is_app_member()) with check (private.is_app_member());
create policy fulfillment_plan_lines_member_all on public.fulfillment_plan_lines for all using (private.is_app_member()) with check (private.is_app_member());
create trigger fulfillment_plans_touch_updated_at before update on public.fulfillment_plans for each row execute function private.touch_updated_at();

-- A fulfillment line is configuration/planning evidence only. It must never be treated
-- as an inventory hold, reservation, checkout or proof of actual usage without later state.
create view public.fulfillment_plan_current_v
with (security_invoker = true)
as
select
  p.id as plan_id,
  p.engagement_id,
  e.engagement_number,
  e.name as engagement_name,
  e.event_start_date,
  p.plan_state,
  p.snapshot_at,
  l.id as line_id,
  l.sort_order,
  l.line_type,
  l.item_type,
  l.primary_category,
  l.subcategory,
  l.title,
  l.description,
  l.internal_notes,
  l.quantity,
  l.external_item_id,
  l.resource_id,
  r.name as resource_name,
  l.event_time_text
from public.fulfillment_plans p
join public.engagements e on e.id=p.engagement_id
join public.fulfillment_plan_lines l on l.fulfillment_plan_id=p.id
left join public.resources r on r.id=l.resource_id
where p.plan_state='ACTIVE';
