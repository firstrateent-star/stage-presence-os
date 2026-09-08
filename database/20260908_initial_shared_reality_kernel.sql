-- Stage Presence OS v0.1 Shared Reality kernel.
-- Applied to Supabase project stage-presence-os (yaojcuvgtlncytujfxef) on 2026-09-08.
-- RLS is mandatory. Authenticated users still require an active app_members row.

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.app_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('ADMIN','COMMERCIAL','OPERATIONS','VIEWER')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function private.is_app_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.app_members
      where user_id = (select auth.uid()) and active = true
    );
$$;
revoke all on function private.is_app_member() from public;
grant execute on function private.is_app_member() to authenticated;

create or replace function private.current_app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.app_members
  where user_id = (select auth.uid()) and active = true
  limit 1;
$$;
revoke all on function private.current_app_role() from public;
grant execute on function private.current_app_role() to authenticated;

create table public.parties (
  id uuid primary key default gen_random_uuid(),
  party_type text not null check (party_type in ('PERSON','ORGANIZATION')),
  name text not null,
  organization_name text,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.engagements (
  id uuid primary key default gen_random_uuid(),
  display_number bigint generated always as identity unique,
  engagement_number text generated always as ('SP-' || lpad(display_number::text, 6, '0')) stored,
  name text not null,
  engagement_type text not null default 'EVENT' check (engagement_type in ('EVENT','LONG_TERM_RENTAL','INSTALLATION','EQUIPMENT_SALE','SERVICE','OTHER')),
  customer_request text,
  desired_outcome text,
  internal_summary text,
  event_start timestamptz,
  event_end timestamptz,
  venue_name text,
  venue_address text,
  estimated_value numeric(12,2),
  commercial_state text not null default 'NEW' check (commercial_state in ('NEW','DISCOVERY','DESIGNING','PROPOSED','NEGOTIATING','WON','LOST')),
  commitment_state text not null default 'UNCOMMITTED' check (commitment_state in ('UNCOMMITTED','VERBAL_YES','SIGNED','DEPOSIT_PENDING','CONFIRMED','CANCELLED')),
  operational_state text not null default 'NOT_STARTED' check (operational_state in ('NOT_STARTED','PLANNING','READY','ACTIVE','COMPLETE','CLOSED')),
  attention_state text not null default 'NORMAL' check (attention_state in ('NORMAL','NEEDS_ATTENTION','WAITING','BLOCKED')),
  next_action text,
  next_action_at timestamptz,
  next_action_owner_id uuid references public.profiles(id) on delete set null,
  waiting_on text,
  blocked_reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint waiting_requires_context check (attention_state <> 'WAITING' or waiting_on is not null),
  constraint blocked_requires_reason check (attention_state <> 'BLOCKED' or blocked_reason is not null)
);

create table public.engagement_parties (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  party_id uuid not null references public.parties(id) on delete restrict,
  role text not null check (role in ('CUSTOMER','PRIMARY_CONTACT','PLANNER','REFERRER','VENUE_CONTACT','OTHER')),
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  unique (engagement_id, party_id, role)
);

create table public.source_artifacts (
  id uuid primary key default gen_random_uuid(),
  artifact_type text not null check (artifact_type in ('PHOTO','VOICE','TEXT','IMPORT','EMAIL_REFERENCE','DOCUMENT','OTHER')),
  storage_path text,
  reference text,
  original_filename text,
  mime_type text,
  raw_text text,
  processing_state text not null default 'RECEIVED' check (processing_state in ('RECEIVED','PENDING_ANALYSIS','ANALYZED','FAILED','NOT_REQUIRED')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.engagement_facts (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  category text not null check (category in ('EVENT','VISUAL','AUDIO','LIGHTING','STAGING','POWER','NETWORK','VENUE','LOGISTICS','LABOR','CONTENT','CUSTOMER','OTHER')),
  kind text not null check (kind in ('REQUIREMENT','CONSTRAINT','CUSTOMER_REQUEST','OBSERVATION','ASSUMPTION','PREFERENCE','OTHER')),
  label text not null,
  value_text text,
  certainty_state text not null check (certainty_state in ('VERIFIED','KNOWN','ESTIMATED','ASSUMED','UNKNOWN','REQUESTED','CONFLICTING','OBSOLETE','NOT_APPLICABLE')),
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  source_type text not null default 'MANUAL' check (source_type in ('MANUAL','AI_EXTRACTION','PHOTO','VOICE','TEXT','IMPORT','EMAIL_REFERENCE','DOCUMENT','SYSTEM','CUSTOMER','OTHER')),
  source_artifact_id uuid references public.source_artifacts(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_key text unique,
  category text not null check (category in ('VIDEO','AUDIO','LIGHTING','STAGING','RIGGING','POWER','NETWORKING','TRANSPORT','OTHER')),
  resource_type text,
  sourcing_model text not null default 'UNKNOWN' check (sourcing_model in ('OWNED','SUBCONTRACTED','PARTNER','VENUE','UNKNOWN')),
  quantity numeric,
  quantity_state text not null default 'UNKNOWN' check (quantity_state in ('VERIFIED','UNVERIFIED','ESTIMATED','UNKNOWN')),
  condition_state text check (condition_state is null or condition_state in ('VERIFIED_GOOD','GOOD','FAIR','NEEDS_SERVICE','OUT_OF_SERVICE','UNKNOWN')),
  reference_price numeric(12,2),
  price_basis text,
  price_state text not null default 'UNKNOWN' check (price_state in ('VERIFIED_CURRENT','LEGACY_REFERENCE','ESTIMATED','UNKNOWN')),
  attributes jsonb not null default '{}'::jsonb,
  source text,
  source_artifact_id uuid references public.source_artifacts(id) on delete set null,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.engagement_resources (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete restrict,
  relationship text not null check (relationship in ('CUSTOMER_REQUESTED','CONSIDERING','RECOMMENDED')),
  quantity numeric,
  notes text,
  created_at timestamptz not null default now(),
  unique (engagement_id, resource_id, relationship)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid references public.engagements(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  event_type text not null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_label text,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index engagements_active_idx on public.engagements (updated_at desc) where archived_at is null;
create index engagements_attention_idx on public.engagements (attention_state, next_action_at) where archived_at is null;
create index engagements_event_start_idx on public.engagements (event_start) where archived_at is null;
create index facts_engagement_idx on public.engagement_facts (engagement_id, created_at);
create index event_ledger_engagement_idx on public.events (engagement_id, created_at desc);
create index resources_category_idx on public.resources (category, name) where archived_at is null and active = true;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function private.touch_updated_at() from public;
grant execute on function private.touch_updated_at() to authenticated;

create trigger profiles_touch before update on public.profiles for each row execute function private.touch_updated_at();
create trigger parties_touch before update on public.parties for each row execute function private.touch_updated_at();
create trigger engagements_touch before update on public.engagements for each row execute function private.touch_updated_at();
create trigger facts_touch before update on public.engagement_facts for each row execute function private.touch_updated_at();
create trigger resources_touch before update on public.resources for each row execute function private.touch_updated_at();

create or replace function private.log_engagement_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  event_name text;
  event_summary text;
  event_meta jsonb := '{}'::jsonb;
begin
  if tg_op = 'INSERT' then
    event_name := 'ENGAGEMENT_CREATED';
    event_summary := 'Engagement created';
    event_meta := jsonb_build_object('name', new.name, 'engagement_number', new.engagement_number);
  elsif tg_op = 'UPDATE' then
    if old.commercial_state is distinct from new.commercial_state then
      event_name := 'COMMERCIAL_STATE_CHANGED';
      event_summary := 'Commercial state changed';
      event_meta := jsonb_build_object('from', old.commercial_state, 'to', new.commercial_state);
    elsif old.commitment_state is distinct from new.commitment_state then
      event_name := 'COMMITMENT_STATE_CHANGED';
      event_summary := 'Commitment state changed';
      event_meta := jsonb_build_object('from', old.commitment_state, 'to', new.commitment_state);
    elsif old.operational_state is distinct from new.operational_state then
      event_name := 'OPERATIONAL_STATE_CHANGED';
      event_summary := 'Operational state changed';
      event_meta := jsonb_build_object('from', old.operational_state, 'to', new.operational_state);
    elsif old.attention_state is distinct from new.attention_state then
      event_name := 'ATTENTION_STATE_CHANGED';
      event_summary := 'Attention state changed';
      event_meta := jsonb_build_object('from', old.attention_state, 'to', new.attention_state);
    elsif old.next_action is distinct from new.next_action or old.next_action_at is distinct from new.next_action_at then
      event_name := 'NEXT_ACTION_SET';
      event_summary := 'Next move updated';
      event_meta := jsonb_build_object('from_action', old.next_action, 'to_action', new.next_action, 'from_at', old.next_action_at, 'to_at', new.next_action_at);
    elsif old.archived_at is null and new.archived_at is not null then
      event_name := 'ENGAGEMENT_ARCHIVED';
      event_summary := 'Engagement archived';
    else
      event_name := 'ENGAGEMENT_UPDATED';
      event_summary := 'Engagement updated';
    end if;
  end if;

  insert into public.events (engagement_id, entity_type, entity_id, event_type, actor_user_id, summary, metadata)
  values (new.id, 'engagement', new.id, event_name, uid, event_summary, event_meta);
  return new;
end;
$$;
revoke all on function private.log_engagement_change() from public;
grant execute on function private.log_engagement_change() to authenticated;

create trigger engagements_log after insert or update on public.engagements for each row execute function private.log_engagement_change();

alter table public.profiles enable row level security;
alter table public.app_members enable row level security;
alter table public.parties enable row level security;
alter table public.engagements enable row level security;
alter table public.engagement_parties enable row level security;
alter table public.source_artifacts enable row level security;
alter table public.engagement_facts enable row level security;
alter table public.resources enable row level security;
alter table public.engagement_resources enable row level security;
alter table public.events enable row level security;

grant select on public.profiles, public.app_members, public.parties, public.engagements, public.engagement_parties, public.source_artifacts, public.engagement_facts, public.resources, public.engagement_resources, public.events to authenticated;
grant insert, update on public.parties, public.engagements, public.engagement_parties, public.source_artifacts, public.engagement_facts, public.resources, public.engagement_resources to authenticated;
grant usage, select on sequence public.engagements_display_number_seq to authenticated;
grant insert on public.events to authenticated;
grant all on public.profiles, public.app_members, public.parties, public.engagements, public.engagement_parties, public.source_artifacts, public.engagement_facts, public.resources, public.engagement_resources, public.events to service_role;

create policy profiles_member_read on public.profiles for select to authenticated using (private.is_app_member());
create policy profiles_self_update on public.profiles for update to authenticated using (id = (select auth.uid()) and private.is_app_member()) with check (id = (select auth.uid()) and private.is_app_member());
create policy membership_self_read on public.app_members for select to authenticated using (user_id = (select auth.uid()));

create policy parties_member_select on public.parties for select to authenticated using (private.is_app_member());
create policy parties_member_insert on public.parties for insert to authenticated with check (private.is_app_member());
create policy parties_member_update on public.parties for update to authenticated using (private.is_app_member()) with check (private.is_app_member());

create policy engagements_member_select on public.engagements for select to authenticated using (private.is_app_member());
create policy engagements_member_insert on public.engagements for insert to authenticated with check (private.is_app_member());
create policy engagements_member_update on public.engagements for update to authenticated using (private.is_app_member()) with check (private.is_app_member());

create policy engagement_parties_member_select on public.engagement_parties for select to authenticated using (private.is_app_member());
create policy engagement_parties_member_insert on public.engagement_parties for insert to authenticated with check (private.is_app_member());
create policy engagement_parties_member_update on public.engagement_parties for update to authenticated using (private.is_app_member()) with check (private.is_app_member());

create policy artifacts_member_select on public.source_artifacts for select to authenticated using (private.is_app_member());
create policy artifacts_member_insert on public.source_artifacts for insert to authenticated with check (private.is_app_member());
create policy artifacts_member_update on public.source_artifacts for update to authenticated using (private.is_app_member()) with check (private.is_app_member());

create policy facts_member_select on public.engagement_facts for select to authenticated using (private.is_app_member());
create policy facts_member_insert on public.engagement_facts for insert to authenticated with check (private.is_app_member());
create policy facts_member_update on public.engagement_facts for update to authenticated using (private.is_app_member()) with check (private.is_app_member());

create policy resources_member_select on public.resources for select to authenticated using (private.is_app_member());
create policy resources_member_insert on public.resources for insert to authenticated with check (private.is_app_member());
create policy resources_member_update on public.resources for update to authenticated using (private.is_app_member()) with check (private.is_app_member());

create policy engagement_resources_member_select on public.engagement_resources for select to authenticated using (private.is_app_member());
create policy engagement_resources_member_insert on public.engagement_resources for insert to authenticated with check (private.is_app_member());
create policy engagement_resources_member_update on public.engagement_resources for update to authenticated using (private.is_app_member()) with check (private.is_app_member());

create policy events_member_select on public.events for select to authenticated using (private.is_app_member());
create policy events_member_insert on public.events for insert to authenticated with check (private.is_app_member());

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_auth_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();
