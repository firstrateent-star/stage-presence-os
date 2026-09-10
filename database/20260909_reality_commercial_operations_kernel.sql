-- Reality-derived commercial + operations kernel.
-- Evidence basis: 2026-09-09 Goodshuffle multi-project packet and pull sheets.
-- Principle: preserve raw source -> normalize only supported truth -> keep Engagement canonical.

-- 1. Queryable source slices. A source artifact can be one large PDF/export while
-- each project/document/page-range remains independently attributable.
create table public.source_artifact_segments (
  id uuid primary key default gen_random_uuid(),
  source_artifact_id uuid not null references public.source_artifacts(id) on delete cascade,
  engagement_id uuid references public.engagements(id) on delete set null,
  source_key text unique,
  segment_type text not null check (segment_type in (
    'PROJECT_PACKET','COMMERCIAL_DOCUMENT','PAYMENT_PAGE','PULL_SHEET','SCHEDULE','TERMS','RECEIPT','OTHER'
  )),
  page_start integer check (page_start is null or page_start > 0),
  page_end integer check (page_end is null or page_end > 0),
  raw_text text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint source_artifact_segments_page_order check (page_start is null or page_end is null or page_end >= page_start)
);
create index source_artifact_segments_artifact_idx on public.source_artifact_segments(source_artifact_id);
create index source_artifact_segments_engagement_idx on public.source_artifact_segments(engagement_id);

-- 2. Exact commercial snapshots. A quote/invoice is evidence of what was offered or billed
-- at that moment; it must never be reconstructed from the current price book.
create table public.commercial_documents (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  document_type text not null check (document_type in ('QUOTE','INVOICE','CONTRACT','ORDER','CREDIT','RECEIPT','OTHER')),
  transaction_type text not null default 'UNKNOWN' check (transaction_type in ('RENTAL','SALE','SERVICE','INSTALLATION','MIXED','UNKNOWN','OTHER')),
  document_state text not null default 'UNKNOWN' check (document_state in ('DRAFT','SENT','UNSIGNED','SIGNED','PARTIALLY_PAID','PAID','VOID','UNKNOWN')),
  external_document_id text,
  source_system text,
  source_key text unique,
  document_date date,
  signature_date date,
  snapshot_at timestamptz,
  currency text not null default 'USD' check (char_length(currency)=3),
  subtotal numeric(14,2),
  discount_total numeric(14,2),
  tax_total numeric(14,2),
  processing_fee_total numeric(14,2),
  total numeric(14,2),
  grand_total numeric(14,2),
  due_on_signature numeric(14,2),
  due_now numeric(14,2),
  final_due_date date,
  final_due_amount numeric(14,2),
  amount_paid numeric(14,2),
  remaining_balance numeric(14,2),
  terms_summary text,
  notes text,
  certainty_state text not null default 'KNOWN' check (certainty_state in ('VERIFIED','KNOWN','ESTIMATED','ASSUMED','CONFLICTING')),
  source_artifact_id uuid references public.source_artifacts(id) on delete set null,
  source_segment_id uuid references public.source_artifact_segments(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index commercial_documents_engagement_idx on public.commercial_documents(engagement_id,document_date);
create index commercial_documents_external_idx on public.commercial_documents(source_system,external_document_id);
create index commercial_documents_state_idx on public.commercial_documents(document_type,document_state);

create table public.commercial_document_lines (
  id uuid primary key default gen_random_uuid(),
  commercial_document_id uuid not null references public.commercial_documents(id) on delete cascade,
  source_key text unique,
  sort_order integer,
  line_type text not null default 'OTHER' check (line_type in ('RESOURCE','SERVICE','LABOR','LOGISTICS','DISCOUNT','FEE','CUSTOM','OTHER')),
  group_label text,
  external_item_id text,
  resource_id uuid references public.resources(id) on delete set null,
  description text not null,
  detail_text text,
  quantity numeric(12,3),
  unit_price numeric(14,2),
  line_total numeric(14,2),
  required_from_date date,
  required_through_date date,
  source_segment_id uuid references public.source_artifact_segments(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint commercial_document_lines_date_order check (required_from_date is null or required_through_date is null or required_through_date >= required_from_date)
);
create index commercial_document_lines_document_idx on public.commercial_document_lines(commercial_document_id,sort_order);
create index commercial_document_lines_resource_idx on public.commercial_document_lines(resource_id);

-- 3. Payment obligations and actual payments. This supports ordinary deposits,
-- installments like UNC's season schedule, and future financing without conflating them.
create table public.commercial_payment_schedule (
  id uuid primary key default gen_random_uuid(),
  commercial_document_id uuid not null references public.commercial_documents(id) on delete cascade,
  source_key text unique,
  sequence_no integer,
  term_type text not null check (term_type in ('DEPOSIT','INSTALLMENT','FINAL','BALANCE','OTHER')),
  amount numeric(14,2),
  percentage numeric(7,4) check (percentage is null or (percentage >= 0 and percentage <= 100)),
  due_date date,
  due_trigger text,
  status text not null default 'UNKNOWN' check (status in ('PLANNED','DUE','PARTIAL','PAID','WAIVED','UNKNOWN')),
  notes text,
  source_segment_id uuid references public.source_artifact_segments(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index commercial_payment_schedule_document_idx on public.commercial_payment_schedule(commercial_document_id,sequence_no);

create table public.commercial_payments (
  id uuid primary key default gen_random_uuid(),
  commercial_document_id uuid not null references public.commercial_documents(id) on delete cascade,
  source_key text unique,
  external_payment_id text,
  payment_date date,
  method text,
  status text,
  charged_amount numeric(14,2),
  fees numeric(14,2),
  applied_amount numeric(14,2),
  notes text,
  source_segment_id uuid references public.source_artifact_segments(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index commercial_payments_document_idx on public.commercial_payments(commercial_document_id,payment_date);

-- 4. Execution calendar. Event date alone is insufficient; raw jobs repeatedly contain
-- load-in, delivery, pickup, return, setup, show and strike windows.
create table public.engagement_schedule_items (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  source_key text unique,
  schedule_type text not null check (schedule_type in ('EVENT','LOAD_IN','LOAD_OUT','DELIVERY','PICKUP','RETURN','SETUP','SHOW','STRIKE','TRAVEL','PREP','OTHER')),
  label text not null,
  start_at timestamptz,
  end_at timestamptz,
  start_date date,
  end_date date,
  time_state text not null default 'UNKNOWN' check (time_state in ('VERIFIED','KNOWN','TBD','UNKNOWN')),
  location_name text,
  location_address text,
  notes text,
  source_artifact_id uuid references public.source_artifacts(id) on delete set null,
  source_segment_id uuid references public.source_artifact_segments(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint engagement_schedule_items_date_order check (start_date is null or end_date is null or end_date >= start_date),
  constraint engagement_schedule_items_time_order check (start_at is null or end_at is null or end_at >= start_at)
);
create index engagement_schedule_items_engagement_idx on public.engagement_schedule_items(engagement_id,start_date,start_at);

-- 5. Team identity is distinct from authentication. username is the business-facing label;
-- source documents may preserve legal/display names, while UI can say `you` for the signed-in user.
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  party_id uuid unique references public.parties(id) on delete set null,
  username text not null unique check (username ~ '^[a-z0-9][a-z0-9._-]{1,31}$'),
  display_name text,
  member_type text not null default 'OTHER' check (member_type in ('OWNER','EMPLOYEE','CONTRACTOR','PARTNER','ADVISOR','OTHER')),
  primary_role text,
  active boolean not null default true,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.engagement_assignments (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  source_key text unique,
  role_code text not null default 'OTHER' check (role_code in ('SALES_LEAD','PROJECT_MANAGER','VIDEO_TECH','LED_TECH','AUDIO_TECH','A1','A2','CAMERA','CONTENT','WAREHOUSE','DRIVER','LABOR','INSTALLER','OTHER')),
  role_label text,
  assignment_state text not null default 'UNKNOWN' check (assignment_state in ('POSSIBLE','REQUESTED','CONFIRMED','DECLINED','COMPLETED','UNKNOWN')),
  certainty_state text not null default 'KNOWN' check (certainty_state in ('VERIFIED','KNOWN','ESTIMATED','ASSUMED','CONFLICTING')),
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  notes text,
  source_artifact_id uuid references public.source_artifacts(id) on delete set null,
  source_segment_id uuid references public.source_artifact_segments(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint engagement_assignments_time_order check (scheduled_start is null or scheduled_end is null or scheduled_end >= scheduled_start)
);
create index engagement_assignments_engagement_idx on public.engagement_assignments(engagement_id,assignment_state);
create index engagement_assignments_member_idx on public.engagement_assignments(team_member_id,assignment_state);

-- 6. Action continuity. This is the durable version of `what needs to happen next?`
-- and can later be executed by humans, AI, integrations or automations without changing the business model.
create table public.work_items (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid references public.engagements(id) on delete cascade,
  source_key text unique,
  title text not null,
  action_type text not null default 'OTHER' check (action_type in ('CALL','EMAIL','TEXT','CREATE_QUOTE','REVISE_QUOTE','APPROVAL','CAPACITY','CREW','PAYMENT','VENUE','PREP','DELIVERY','FOLLOW_UP','REVIEW','OTHER')),
  status text not null default 'OPEN' check (status in ('OPEN','WAITING','BLOCKED','DONE','CANCELLED')),
  priority text not null default 'NORMAL' check (priority in ('NOW','SOON','NORMAL','LOW')),
  owner_member_id uuid references public.team_members(id) on delete set null,
  due_at timestamptz,
  due_date date,
  trigger_text text,
  waiting_on text,
  why_now text,
  instructions text,
  context_summary text,
  success_condition text,
  next_step_hint text,
  certainty_state text not null default 'KNOWN' check (certainty_state in ('VERIFIED','KNOWN','ESTIMATED','ASSUMED','CONFLICTING')),
  source_artifact_id uuid references public.source_artifacts(id) on delete set null,
  source_segment_id uuid references public.source_artifact_segments(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index work_items_open_queue_idx on public.work_items(status,priority,due_date,due_at);
create index work_items_engagement_idx on public.work_items(engagement_id,status);
create index work_items_owner_idx on public.work_items(owner_member_id,status);

-- RLS: same internal-member membrane as the existing kernel.
alter table public.source_artifact_segments enable row level security;
alter table public.commercial_documents enable row level security;
alter table public.commercial_document_lines enable row level security;
alter table public.commercial_payment_schedule enable row level security;
alter table public.commercial_payments enable row level security;
alter table public.engagement_schedule_items enable row level security;
alter table public.team_members enable row level security;
alter table public.engagement_assignments enable row level security;
alter table public.work_items enable row level security;

create policy source_artifact_segments_member_all on public.source_artifact_segments for all using (private.is_app_member()) with check (private.is_app_member());
create policy commercial_documents_member_all on public.commercial_documents for all using (private.is_app_member()) with check (private.is_app_member());
create policy commercial_document_lines_member_all on public.commercial_document_lines for all using (private.is_app_member()) with check (private.is_app_member());
create policy commercial_payment_schedule_member_all on public.commercial_payment_schedule for all using (private.is_app_member()) with check (private.is_app_member());
create policy commercial_payments_member_all on public.commercial_payments for all using (private.is_app_member()) with check (private.is_app_member());
create policy engagement_schedule_items_member_all on public.engagement_schedule_items for all using (private.is_app_member()) with check (private.is_app_member());
create policy team_members_member_all on public.team_members for all using (private.is_app_member()) with check (private.is_app_member());
create policy engagement_assignments_member_all on public.engagement_assignments for all using (private.is_app_member()) with check (private.is_app_member());
create policy work_items_member_all on public.work_items for all using (private.is_app_member()) with check (private.is_app_member());

create trigger commercial_documents_touch_updated_at before update on public.commercial_documents for each row execute function private.touch_updated_at();
create trigger engagement_schedule_items_touch_updated_at before update on public.engagement_schedule_items for each row execute function private.touch_updated_at();
create trigger team_members_touch_updated_at before update on public.team_members for each row execute function private.touch_updated_at();
create trigger engagement_assignments_touch_updated_at before update on public.engagement_assignments for each row execute function private.touch_updated_at();
create trigger work_items_touch_updated_at before update on public.work_items for each row execute function private.touch_updated_at();

-- Business-facing daily queue. UI should render the current signed-in owner's username as `You`
-- rather than hard-coding a founder's name throughout the product.
create view public.daily_work_queue_v
with (security_invoker = true)
as
select
  w.id,
  w.engagement_id,
  e.engagement_number,
  e.name as engagement_name,
  e.event_start_date,
  w.title,
  w.action_type,
  w.status,
  w.priority,
  w.due_at,
  w.due_date,
  w.trigger_text,
  w.waiting_on,
  w.why_now,
  w.instructions,
  w.context_summary,
  w.success_condition,
  w.next_step_hint,
  tm.id as owner_member_id,
  tm.username as owner_username,
  tm.display_name as owner_display_name,
  tm.user_id as owner_user_id
from public.work_items w
left join public.engagements e on e.id=w.engagement_id
left join public.team_members tm on tm.id=w.owner_member_id
where w.status in ('OPEN','WAITING','BLOCKED');

-- Historical pricing evidence. Current price policy remains separate from past quote snapshots.
create view public.pricing_observations_v
with (security_invoker = true)
as
select
  l.id as commercial_line_id,
  d.id as commercial_document_id,
  d.engagement_id,
  e.name as engagement_name,
  e.event_start_date,
  d.document_type,
  d.document_state,
  d.transaction_type,
  d.document_date,
  d.signature_date,
  l.group_label,
  l.line_type,
  l.external_item_id,
  l.resource_id,
  r.name as resource_name,
  l.description,
  l.quantity,
  l.unit_price,
  l.line_total,
  d.currency,
  d.source_system,
  d.external_document_id
from public.commercial_document_lines l
join public.commercial_documents d on d.id=l.commercial_document_id
join public.engagements e on e.id=d.engagement_id
left join public.resources r on r.id=l.resource_id
where l.unit_price is not null or l.line_total is not null;
