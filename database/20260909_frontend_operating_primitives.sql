-- Stage Presence OS — frontend operating backend primitives
-- 2026-09-09
--
-- The frontend should stay simpler than the business model underneath it.
-- These primitives extend the canonical Engagement rather than creating parallel
-- lead/job/accounting/inventory realities.

begin;

alter table public.engagement_parties drop constraint if exists engagement_parties_role_check;
alter table public.engagement_parties add constraint engagement_parties_role_check check (role = any (array['CUSTOMER','PRIMARY_CONTACT','BUYER','PAYER','DECISION_MAKER','PLANNER','REFERRER','VENUE_CONTACT','END_USER','PRODUCTION_PARTNER','VENDOR','OTHER']::text[]));

alter table public.engagement_facts drop constraint if exists engagement_facts_category_check;
alter table public.engagement_facts add constraint engagement_facts_category_check check (category = any (array['EVENT','VISUAL','AUDIO','LIGHTING','STAGING','POWER','NETWORK','VENUE','LOGISTICS','LABOR','CONTENT','CUSTOMER','COMMERCIAL','EXPERIENCE','SAFETY','ACCESS','OTHER']::text[]));
alter table public.engagement_facts drop constraint if exists engagement_facts_kind_check;
alter table public.engagement_facts add constraint engagement_facts_kind_check check (kind = any (array['REQUIREMENT','CONSTRAINT','CUSTOMER_REQUEST','OBSERVATION','ASSUMPTION','PREFERENCE','OUTCOME','OTHER']::text[]));

alter table public.work_items add column if not exists responsible_party_id uuid references public.parties(id) on delete set null;
alter table public.work_items add column if not exists visibility text not null default 'INTERNAL';
alter table public.work_items add column if not exists origin text not null default 'MANUAL';
alter table public.work_items drop constraint if exists work_items_visibility_check;
alter table public.work_items add constraint work_items_visibility_check check (visibility = any (array['INTERNAL','SHARED','CLIENT']::text[]));
alter table public.work_items drop constraint if exists work_items_origin_check;
alter table public.work_items add constraint work_items_origin_check check (origin = any (array['MANUAL','SYSTEM','AUTOMATION','IMPORT','CLIENT','OTHER']::text[]));
update public.work_items set origin='SYSTEM' where source_key like 'derived:daily-action:%' and origin='MANUAL';

alter table public.commercial_documents add column if not exists version_no integer not null default 1;
alter table public.commercial_documents add column if not exists supersedes_document_id uuid references public.commercial_documents(id) on delete set null;
alter table public.commercial_documents add column if not exists issued_at timestamptz;
alter table public.commercial_documents add column if not exists sent_at timestamptz;
alter table public.commercial_documents add column if not exists accepted_at timestamptz;
alter table public.commercial_documents add column if not exists valid_through date;
alter table public.commercial_documents add column if not exists client_visible boolean not null default true;
alter table public.commercial_documents drop constraint if exists commercial_documents_version_no_check;
alter table public.commercial_documents add constraint commercial_documents_version_no_check check (version_no > 0);

alter table public.engagement_schedule_items add column if not exists location_id uuid;

alter table public.engagement_closeouts add column if not exists founder_dependent_minutes integer;
alter table public.engagement_closeouts add column if not exists client_feedback text;
alter table public.engagement_closeouts add column if not exists audience_experience text;
alter table public.engagement_closeouts add column if not exists reliability_notes text;
alter table public.engagement_closeouts drop constraint if exists engagement_closeouts_founder_dependent_minutes_check;
alter table public.engagement_closeouts add constraint engagement_closeouts_founder_dependent_minutes_check check (founder_dependent_minutes is null or founder_dependent_minutes >= 0);
update public.engagement_closeouts set founder_dependent_minutes=greg_minutes where founder_dependent_minutes is null and greg_minutes is not null;
comment on column public.engagement_closeouts.greg_minutes is 'Legacy compatibility field. New product surfaces should use founder_dependent_minutes.';

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(), source_key text unique, name text not null,
  location_type text not null default 'VENUE' check (location_type = any (array['VENUE','WAREHOUSE','OFFICE','INSTALL_SITE','CUSTOMER_SITE','OTHER']::text[])),
  address text, city text, region text, postal_code text, country text default 'US',
  access_notes text, load_in_notes text, parking_notes text, power_notes text, connectivity_notes text, notes text,
  metadata jsonb not null default '{}'::jsonb, source_artifact_id uuid references public.source_artifacts(id) on delete set null,
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);

create table if not exists public.engagement_locations (
  id uuid primary key default gen_random_uuid(), engagement_id uuid not null references public.engagements(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade, source_key text unique,
  role text not null default 'VENUE' check (role = any (array['VENUE','LOAD_IN','LOAD_OUT','DELIVERY','PICKUP','INSTALL_SITE','CUSTOMER_SITE','OTHER']::text[])),
  is_primary boolean not null default false, notes text,
  certainty_state text not null default 'KNOWN' check (certainty_state = any (array['VERIFIED','KNOWN','ESTIMATED','ASSUMED','CONFLICTING']::text[])),
  source_artifact_id uuid references public.source_artifacts(id) on delete set null,
  source_segment_id uuid references public.source_artifact_segments(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(engagement_id,location_id,role)
);

alter table public.engagement_schedule_items drop constraint if exists engagement_schedule_items_location_id_fkey;
alter table public.engagement_schedule_items add constraint engagement_schedule_items_location_id_fkey foreign key(location_id) references public.locations(id) on delete set null;

create table if not exists public.party_relationships (
  id uuid primary key default gen_random_uuid(), from_party_id uuid not null references public.parties(id) on delete cascade,
  to_party_id uuid not null references public.parties(id) on delete cascade, source_key text unique,
  relationship_type text not null check (relationship_type = any (array['CONTACT_FOR','EMPLOYEE_OF','DEPARTMENT_OF','REFERS_TO','PARTNER_WITH','VENDOR_TO','RELATED_TO','OTHER']::text[])),
  certainty_state text not null default 'KNOWN' check (certainty_state = any (array['VERIFIED','KNOWN','ESTIMATED','ASSUMED','CONFLICTING']::text[])),
  notes text, source_artifact_id uuid references public.source_artifacts(id) on delete set null, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(from_party_id<>to_party_id), unique(from_party_id,to_party_id,relationship_type)
);

create table if not exists public.engagement_access_grants (
  id uuid primary key default gen_random_uuid(), engagement_id uuid not null references public.engagements(id) on delete cascade,
  party_id uuid references public.parties(id) on delete cascade, user_id uuid references auth.users(id) on delete cascade,
  access_role text not null default 'CLIENT' check (access_role = any (array['CLIENT','CONTRIBUTOR','OBSERVER','OTHER']::text[])),
  access_state text not null default 'INVITED' check (access_state = any (array['INVITED','ACTIVE','REVOKED']::text[])),
  can_view_commercial boolean not null default false, can_view_operations boolean not null default false,
  can_upload boolean not null default false, can_approve boolean not null default false,
  notes text, metadata jsonb not null default '{}'::jsonb, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(party_id is not null or user_id is not null)
);

create table if not exists public.team_member_capabilities (
  id uuid primary key default gen_random_uuid(), team_member_id uuid not null references public.team_members(id) on delete cascade,
  capability_code text not null, capability_label text,
  proficiency text not null default 'UNKNOWN' check (proficiency = any (array['LEARNING','ASSIST','INDEPENDENT','LEAD','EXPERT','UNKNOWN']::text[])),
  certainty_state text not null default 'KNOWN' check (certainty_state = any (array['VERIFIED','KNOWN','ESTIMATED','ASSUMED','CONFLICTING']::text[])),
  notes text, source_artifact_id uuid references public.source_artifacts(id) on delete set null, metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(team_member_id,capability_code)
);

create table if not exists public.engagement_cost_items (
  id uuid primary key default gen_random_uuid(), engagement_id uuid not null references public.engagements(id) on delete cascade, source_key text unique,
  cost_category text not null check (cost_category = any (array['LABOR','SUBCONTRACT','EQUIPMENT_RENTAL','TRANSPORT','TRAVEL','LODGING','PER_DIEM','FUEL','MATERIALS','PURCHASE','PROCESSING_FEE','OTHER']::text[])),
  cost_state text not null default 'ESTIMATE' check (cost_state = any (array['ESTIMATE','COMMITTED','ACTUAL','CANCELLED']::text[])),
  description text not null, quantity numeric, unit_cost numeric, amount numeric not null check(amount>=0),
  currency text not null default 'USD' check(char_length(currency)=3), expected_date date, incurred_date date,
  counterparty_party_id uuid references public.parties(id) on delete set null, team_member_id uuid references public.team_members(id) on delete set null,
  resource_id uuid references public.resources(id) on delete set null,
  certainty_state text not null default 'KNOWN' check (certainty_state = any (array['VERIFIED','KNOWN','ESTIMATED','ASSUMED','CONFLICTING']::text[])),
  source_artifact_id uuid references public.source_artifacts(id) on delete set null, source_segment_id uuid references public.source_artifact_segments(id) on delete set null,
  notes text, metadata jsonb not null default '{}'::jsonb, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.resource_commitments (
  id uuid primary key default gen_random_uuid(), engagement_id uuid not null references public.engagements(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade, fulfillment_plan_line_id uuid references public.fulfillment_plan_lines(id) on delete set null,
  commercial_document_line_id uuid references public.commercial_document_lines(id) on delete set null, source_key text unique,
  commitment_type text not null check (commitment_type = any (array['HOLD','RESERVATION','ALLOCATION']::text[])),
  commitment_state text not null default 'TENTATIVE' check (commitment_state = any (array['TENTATIVE','CONFIRMED','RELEASED','FULFILLED','CANCELLED','UNKNOWN']::text[])),
  quantity numeric check(quantity is null or quantity>=0), from_date date, through_date date,
  planned_sourcing_model text not null default 'UNKNOWN' check (planned_sourcing_model = any (array['OWNED','SUBCONTRACTED','PARTNER','VENUE','UNKNOWN']::text[])),
  certainty_state text not null default 'KNOWN' check (certainty_state = any (array['VERIFIED','KNOWN','ESTIMATED','ASSUMED','CONFLICTING']::text[])),
  source_artifact_id uuid references public.source_artifacts(id) on delete set null, source_segment_id uuid references public.source_artifact_segments(id) on delete set null,
  notes text, metadata jsonb not null default '{}'::jsonb, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(through_date is null or from_date is null or through_date>=from_date)
);

create table if not exists public.resource_usage (
  id uuid primary key default gen_random_uuid(), engagement_id uuid not null references public.engagements(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade, resource_commitment_id uuid references public.resource_commitments(id) on delete set null,
  fulfillment_plan_line_id uuid references public.fulfillment_plan_lines(id) on delete set null, source_key text unique,
  usage_state text not null default 'UNKNOWN' check (usage_state = any (array['IN_USE','RETURNED','CONSUMED','COMPLETE','UNKNOWN']::text[])),
  quantity numeric check(quantity is null or quantity>=0), used_from timestamptz, used_through timestamptz,
  certainty_state text not null default 'KNOWN' check (certainty_state = any (array['VERIFIED','KNOWN','ESTIMATED','ASSUMED','CONFLICTING']::text[])),
  source_artifact_id uuid references public.source_artifacts(id) on delete set null, source_segment_id uuid references public.source_artifact_segments(id) on delete set null,
  notes text, metadata jsonb not null default '{}'::jsonb, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(used_through is null or used_from is null or used_through>=used_from)
);

create table if not exists public.engagement_outputs (
  id uuid primary key default gen_random_uuid(), engagement_id uuid not null references public.engagements(id) on delete cascade,
  commercial_document_id uuid references public.commercial_documents(id) on delete set null, fulfillment_plan_id uuid references public.fulfillment_plans(id) on delete set null,
  source_key text unique,
  output_type text not null check (output_type = any (array['QUOTE','INVOICE','CONTRACT','JOB_BRIEF','ASSIGNMENT_SHEET','PULL_SHEET','PACKING_LIST','CLIENT_SUMMARY','INSTALL_SCOPE','SERVICE_REPORT','CLOSEOUT_REPORT','OTHER']::text[])),
  output_state text not null default 'DRAFT' check (output_state = any (array['DRAFT','GENERATED','REVIEWED','APPROVED','SENT','SUPERSEDED','VOID']::text[])),
  version_no integer not null default 1 check(version_no>0), title text not null, content_text text, payload jsonb not null default '{}'::jsonb,
  storage_path text, mime_type text, client_visible boolean not null default false, generated_at timestamptz, approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- RLS remains internal/member-only. Client access is only a modeled future seam;
-- no client account receives database access here.
do $$ declare t text; begin
  foreach t in array array['locations','engagement_locations','party_relationships','engagement_access_grants','team_member_capabilities','engagement_cost_items','resource_commitments','resource_usage','engagement_outputs'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists %I on public.%I',t||'_member_all',t);
    execute format('create policy %I on public.%I for all to authenticated using ((select private.is_app_member())) with check ((select private.is_app_member()))',t||'_member_all',t);
    execute format('revoke all on table public.%I from anon',t);
    execute format('grant select,insert,update,delete on table public.%I to authenticated',t);
  end loop;
end $$;

-- Remove anonymous Data API access from all Stage Presence public relations.
do $$ declare r record; begin
  for r in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p','v') loop
    execute format('revoke all on table public.%I from anon',r.relname);
  end loop;
end $$;

-- Core access-path indexes.
create index if not exists engagement_locations_engagement_idx on public.engagement_locations(engagement_id);
create index if not exists engagement_locations_location_idx on public.engagement_locations(location_id);
create index if not exists locations_type_active_idx on public.locations(location_type,active);
create index if not exists party_relationships_from_idx on public.party_relationships(from_party_id);
create index if not exists party_relationships_to_idx on public.party_relationships(to_party_id);
create index if not exists engagement_access_grants_engagement_idx on public.engagement_access_grants(engagement_id);
create index if not exists engagement_access_grants_user_idx on public.engagement_access_grants(user_id) where user_id is not null;
create index if not exists engagement_access_grants_party_idx on public.engagement_access_grants(party_id) where party_id is not null;
create index if not exists team_member_capabilities_member_idx on public.team_member_capabilities(team_member_id,active);
create index if not exists engagement_cost_items_engagement_state_idx on public.engagement_cost_items(engagement_id,cost_state);
create index if not exists engagement_cost_items_counterparty_idx on public.engagement_cost_items(counterparty_party_id) where counterparty_party_id is not null;
create index if not exists engagement_cost_items_member_idx on public.engagement_cost_items(team_member_id) where team_member_id is not null;
create index if not exists engagement_cost_items_resource_idx on public.engagement_cost_items(resource_id) where resource_id is not null;
create index if not exists resource_commitments_engagement_idx on public.resource_commitments(engagement_id,commitment_state);
create index if not exists resource_commitments_resource_window_idx on public.resource_commitments(resource_id,from_date,through_date) where commitment_state in ('TENTATIVE','CONFIRMED');
create index if not exists resource_commitments_fulfillment_line_idx on public.resource_commitments(fulfillment_plan_line_id) where fulfillment_plan_line_id is not null;
create index if not exists resource_commitments_commercial_line_idx on public.resource_commitments(commercial_document_line_id) where commercial_document_line_id is not null;
create index if not exists resource_usage_engagement_idx on public.resource_usage(engagement_id);
create index if not exists resource_usage_resource_idx on public.resource_usage(resource_id,used_from,used_through);
create index if not exists resource_usage_commitment_idx on public.resource_usage(resource_commitment_id) where resource_commitment_id is not null;
create index if not exists engagement_outputs_engagement_type_idx on public.engagement_outputs(engagement_id,output_type,output_state);
create index if not exists engagement_outputs_commercial_document_idx on public.engagement_outputs(commercial_document_id) where commercial_document_id is not null;
create index if not exists engagement_outputs_fulfillment_plan_idx on public.engagement_outputs(fulfillment_plan_id) where fulfillment_plan_id is not null;
create index if not exists work_items_responsible_party_idx on public.work_items(responsible_party_id) where responsible_party_id is not null;
create index if not exists commercial_documents_supersedes_idx on public.commercial_documents(supersedes_document_id) where supersedes_document_id is not null;
create index if not exists engagement_schedule_items_location_idx on public.engagement_schedule_items(location_id) where location_id is not null;

-- FK-covering indexes surfaced by the Supabase advisor.
create index if not exists commercial_document_lines_source_segment_idx on public.commercial_document_lines(source_segment_id) where source_segment_id is not null;
create index if not exists commercial_documents_created_by_idx on public.commercial_documents(created_by) where created_by is not null;
create index if not exists commercial_documents_source_artifact_idx on public.commercial_documents(source_artifact_id) where source_artifact_id is not null;
create index if not exists commercial_documents_source_segment_idx on public.commercial_documents(source_segment_id) where source_segment_id is not null;
create index if not exists commercial_payment_schedule_source_segment_idx on public.commercial_payment_schedule(source_segment_id) where source_segment_id is not null;
create index if not exists commercial_payments_source_segment_idx on public.commercial_payments(source_segment_id) where source_segment_id is not null;
create index if not exists engagement_access_grants_created_by_idx on public.engagement_access_grants(created_by) where created_by is not null;
create index if not exists engagement_assignments_source_artifact_idx on public.engagement_assignments(source_artifact_id) where source_artifact_id is not null;
create index if not exists engagement_assignments_source_segment_idx on public.engagement_assignments(source_segment_id) where source_segment_id is not null;
create index if not exists engagement_cost_items_created_by_idx on public.engagement_cost_items(created_by) where created_by is not null;
create index if not exists engagement_cost_items_source_artifact_idx on public.engagement_cost_items(source_artifact_id) where source_artifact_id is not null;
create index if not exists engagement_cost_items_source_segment_idx on public.engagement_cost_items(source_segment_id) where source_segment_id is not null;
create index if not exists engagement_locations_source_artifact_idx on public.engagement_locations(source_artifact_id) where source_artifact_id is not null;
create index if not exists engagement_locations_source_segment_idx on public.engagement_locations(source_segment_id) where source_segment_id is not null;
create index if not exists engagement_outputs_approved_by_idx on public.engagement_outputs(approved_by) where approved_by is not null;
create index if not exists engagement_outputs_created_by_idx on public.engagement_outputs(created_by) where created_by is not null;
create index if not exists engagement_schedule_items_created_by_idx on public.engagement_schedule_items(created_by) where created_by is not null;
create index if not exists engagement_schedule_items_source_artifact_idx on public.engagement_schedule_items(source_artifact_id) where source_artifact_id is not null;
create index if not exists engagement_schedule_items_source_segment_idx on public.engagement_schedule_items(source_segment_id) where source_segment_id is not null;
create index if not exists fulfillment_plan_lines_source_segment_idx on public.fulfillment_plan_lines(source_segment_id) where source_segment_id is not null;
create index if not exists fulfillment_plans_created_by_idx on public.fulfillment_plans(created_by) where created_by is not null;
create index if not exists fulfillment_plans_source_artifact_idx on public.fulfillment_plans(source_artifact_id) where source_artifact_id is not null;
create index if not exists fulfillment_plans_source_segment_idx on public.fulfillment_plans(source_segment_id) where source_segment_id is not null;
create index if not exists locations_source_artifact_idx on public.locations(source_artifact_id) where source_artifact_id is not null;
create index if not exists party_relationships_source_artifact_idx on public.party_relationships(source_artifact_id) where source_artifact_id is not null;
create index if not exists resource_commitments_created_by_idx on public.resource_commitments(created_by) where created_by is not null;
create index if not exists resource_commitments_source_artifact_idx on public.resource_commitments(source_artifact_id) where source_artifact_id is not null;
create index if not exists resource_commitments_source_segment_idx on public.resource_commitments(source_segment_id) where source_segment_id is not null;
create index if not exists resource_usage_created_by_idx on public.resource_usage(created_by) where created_by is not null;
create index if not exists resource_usage_fulfillment_line_idx on public.resource_usage(fulfillment_plan_line_id) where fulfillment_plan_line_id is not null;
create index if not exists resource_usage_source_artifact_idx on public.resource_usage(source_artifact_id) where source_artifact_id is not null;
create index if not exists resource_usage_source_segment_idx on public.resource_usage(source_segment_id) where source_segment_id is not null;
create index if not exists source_artifact_segments_created_by_idx on public.source_artifact_segments(created_by) where created_by is not null;
create index if not exists team_member_capabilities_source_artifact_idx on public.team_member_capabilities(source_artifact_id) where source_artifact_id is not null;
create index if not exists work_items_created_by_idx on public.work_items(created_by) where created_by is not null;
create index if not exists work_items_source_artifact_idx on public.work_items(source_artifact_id) where source_artifact_id is not null;
create index if not exists work_items_source_segment_idx on public.work_items(source_segment_id) where source_segment_id is not null;

-- Keep updated_at reliable without screen-specific bookkeeping.
do $$ declare t text; begin
  foreach t in array array['locations','engagement_locations','party_relationships','engagement_access_grants','team_member_capabilities','engagement_cost_items','resource_commitments','resource_usage','engagement_outputs'] loop
    execute format('drop trigger if exists %I on public.%I',t||'_touch_updated_at',t);
    execute format('create trigger %I before update on public.%I for each row execute function private.touch_updated_at()',t||'_touch_updated_at',t);
  end loop;
end $$;

-- Promote existing canonical venue fields into location memory using exact text only.
insert into public.locations(source_key,name,location_type,address,metadata)
select distinct 'derived:venue:'||md5(lower(trim(venue_name))||'|'||lower(trim(coalesce(venue_address,'')))),trim(venue_name),'VENUE',nullif(trim(venue_address),''),jsonb_build_object('promoted_from','engagement.venue_name/venue_address','promotion_rule','exact canonical text only')
from public.engagements where archived_at is null and venue_name is not null
on conflict(source_key) do update set name=excluded.name,address=excluded.address,updated_at=now();

insert into public.engagement_locations(engagement_id,location_id,source_key,role,is_primary,certainty_state,metadata)
select e.id,l.id,'derived:engagement-venue:'||e.id::text,'VENUE',true,'KNOWN',jsonb_build_object('promoted_from','engagement venue fields','no_fuzzy_matching',true)
from public.engagements e join public.locations l on l.source_key='derived:venue:'||md5(lower(trim(e.venue_name))||'|'||lower(trim(coalesce(e.venue_address,''))))
where e.archived_at is null and e.venue_name is not null
on conflict(source_key) do update set location_id=excluded.location_id,is_primary=true,certainty_state='KNOWN',updated_at=now();

commit;
