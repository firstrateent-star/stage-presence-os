-- Stage Presence Operational Core: Warehouse Fulfillment Runtime v1.
-- A confirmed Resource commitment can now carry a current warehouse/custody state.
-- Actual usage remains separately owned by resource_usage.

create table if not exists public.resource_fulfillment_states (
  id uuid primary key default gen_random_uuid(),
  resource_commitment_id uuid not null unique references public.resource_commitments(id) on delete cascade,
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete restrict,
  fulfillment_plan_line_id uuid references public.fulfillment_plan_lines(id) on delete set null,
  fulfillment_state text not null default 'AWAITING_PULL' check (fulfillment_state in (
    'AWAITING_PULL','PULLED','LOADED','OUT','RETURNED','INSPECTION_REQUIRED','INSPECTED','RESTOCKED','EXCEPTION'
  )),
  quantity numeric check (quantity is null or quantity >= 0),
  custody_state text not null default 'WAREHOUSE' check (custody_state in (
    'WAREHOUSE','STAGE_PRESENCE_TRANSIT','CUSTOMER','VENUE','FIELD','RETURN_TRANSIT','UNKNOWN'
  )),
  return_condition_state text not null default 'UNKNOWN' check (return_condition_state in (
    'UNKNOWN','OK','DAMAGED','MISSING','SERVICE_REQUIRED','CONFLICTING'
  )),
  issue_quantity numeric check (issue_quantity is null or issue_quantity >= 0),
  pulled_at timestamptz,
  loaded_at timestamptz,
  out_at timestamptz,
  returned_at timestamptz,
  inspected_at timestamptz,
  restocked_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resource_fulfillment_states_engagement_idx on public.resource_fulfillment_states(engagement_id);
create index if not exists resource_fulfillment_states_resource_idx on public.resource_fulfillment_states(resource_id);
create index if not exists resource_fulfillment_states_state_idx on public.resource_fulfillment_states(fulfillment_state);

drop trigger if exists resource_fulfillment_states_touch_updated_at on public.resource_fulfillment_states;
create trigger resource_fulfillment_states_touch_updated_at before update on public.resource_fulfillment_states for each row execute function private.touch_updated_at();

alter table public.resource_fulfillment_states enable row level security;
drop policy if exists resource_fulfillment_states_member_all on public.resource_fulfillment_states;
create policy resource_fulfillment_states_member_all on public.resource_fulfillment_states
  for all to authenticated using ((select private.is_app_member())) with check ((select private.is_app_member()));
revoke all on public.resource_fulfillment_states from anon;
grant select,insert,update,delete on public.resource_fulfillment_states to authenticated, service_role;

create or replace view public.warehouse_fulfillment_queue_v
with (security_invoker = true)
as
select
  rc.id as resource_commitment_id,
  rc.engagement_id,
  e.engagement_number,
  e.name as engagement_name,
  e.event_start_date,
  rc.resource_id,
  r.name as resource_name,
  r.category as resource_category,
  r.resource_type,
  rc.fulfillment_plan_line_id,
  fpl.title as fulfillment_line_title,
  rc.commitment_type,
  rc.commitment_state,
  rc.quantity as committed_quantity,
  rc.from_date,
  rc.through_date,
  rc.planned_sourcing_model,
  r.sourcing_model as resource_default_sourcing_model,
  fs.id as resource_fulfillment_state_id,
  coalesce(fs.fulfillment_state,'AWAITING_PULL') as fulfillment_state,
  coalesce(fs.custody_state,'WAREHOUSE') as custody_state,
  coalesce(fs.quantity,rc.quantity) as fulfillment_quantity,
  coalesce(fs.return_condition_state,'UNKNOWN') as return_condition_state,
  fs.issue_quantity,
  fs.pulled_at,
  fs.loaded_at,
  fs.out_at,
  fs.returned_at,
  fs.inspected_at,
  fs.restocked_at,
  fs.notes,
  case
    when rc.commitment_state <> 'CONFIRMED' then 'NOT_READY_FOR_WAREHOUSE'
    when fs.fulfillment_state is null then 'PULL_NEEDED'
    when fs.fulfillment_state = 'AWAITING_PULL' then 'PULL_NEEDED'
    when fs.fulfillment_state = 'PULLED' then 'LOAD_OR_RELEASE_NEEDED'
    when fs.fulfillment_state = 'LOADED' then 'OUTBOUND_NEEDED'
    when fs.fulfillment_state = 'OUT' then 'RETURN_PENDING'
    when fs.fulfillment_state = 'RETURNED' then 'INSPECTION_NEEDED'
    when fs.fulfillment_state = 'INSPECTION_REQUIRED' then 'INSPECTION_NEEDED'
    when fs.fulfillment_state = 'INSPECTED' then 'RESTOCK_NEEDED'
    when fs.fulfillment_state = 'RESTOCKED' then 'WAREHOUSE_COMPLETE'
    when fs.fulfillment_state = 'EXCEPTION' then 'EXCEPTION_REVIEW'
    else 'REVIEW'
  end as next_warehouse_decision,
  case
    when fs.fulfillment_state = 'RESTOCKED' and fs.return_condition_state in ('OK','UNKNOWN') then true
    else false
  end as warehouse_cycle_complete
from public.resource_commitments rc
join public.engagements e on e.id = rc.engagement_id
join public.resources r on r.id = rc.resource_id
left join public.fulfillment_plan_lines fpl on fpl.id = rc.fulfillment_plan_line_id
left join public.resource_fulfillment_states fs on fs.resource_commitment_id = rc.id
where e.archived_at is null
  and rc.commitment_state not in ('CANCELLED','RELEASED');

create or replace view public.engagement_warehouse_position_v
with (security_invoker = true)
as
select
  e.id as engagement_id,
  e.engagement_number,
  e.name as engagement_name,
  count(q.resource_commitment_id) as active_resource_commitment_count,
  count(q.resource_commitment_id) filter (where q.commitment_state = 'CONFIRMED') as confirmed_resource_commitment_count,
  count(q.resource_commitment_id) filter (where q.fulfillment_state = 'AWAITING_PULL') as awaiting_pull_count,
  count(q.resource_commitment_id) filter (where q.fulfillment_state = 'PULLED') as pulled_count,
  count(q.resource_commitment_id) filter (where q.fulfillment_state = 'LOADED') as loaded_count,
  count(q.resource_commitment_id) filter (where q.fulfillment_state = 'OUT') as out_count,
  count(q.resource_commitment_id) filter (where q.fulfillment_state in ('RETURNED','INSPECTION_REQUIRED')) as inspection_needed_count,
  count(q.resource_commitment_id) filter (where q.fulfillment_state = 'INSPECTED') as restock_needed_count,
  count(q.resource_commitment_id) filter (where q.fulfillment_state = 'RESTOCKED') as restocked_count,
  count(q.resource_commitment_id) filter (where q.fulfillment_state = 'EXCEPTION' or q.return_condition_state in ('DAMAGED','MISSING','SERVICE_REQUIRED','CONFLICTING')) as exception_count,
  case
    when count(q.resource_commitment_id) = 0 then 'NO_RESOURCE_COMMITMENTS'
    when count(q.resource_commitment_id) filter (where q.fulfillment_state = 'EXCEPTION' or q.return_condition_state in ('DAMAGED','MISSING','SERVICE_REQUIRED','CONFLICTING')) > 0 then 'WAREHOUSE_EXCEPTION'
    when count(q.resource_commitment_id) filter (where q.commitment_state = 'CONFIRMED' and q.fulfillment_state = 'AWAITING_PULL') > 0 then 'PULL_REQUIRED'
    when count(q.resource_commitment_id) filter (where q.fulfillment_state in ('PULLED','LOADED')) > 0 then 'OUTBOUND_PREP'
    when count(q.resource_commitment_id) filter (where q.fulfillment_state = 'OUT') > 0 then 'RESOURCE_OUT'
    when count(q.resource_commitment_id) filter (where q.fulfillment_state in ('RETURNED','INSPECTION_REQUIRED')) > 0 then 'RETURN_INSPECTION_REQUIRED'
    when count(q.resource_commitment_id) filter (where q.fulfillment_state = 'INSPECTED') > 0 then 'RESTOCK_REQUIRED'
    when count(q.resource_commitment_id) filter (where q.fulfillment_state = 'RESTOCKED') = count(q.resource_commitment_id) then 'WAREHOUSE_COMPLETE'
    else 'WAREHOUSE_REVIEW'
  end as warehouse_state
from public.engagements e
left join public.warehouse_fulfillment_queue_v q on q.engagement_id = e.id
where e.archived_at is null
group by e.id,e.engagement_number,e.name;

revoke all on public.warehouse_fulfillment_queue_v from anon, authenticated;
revoke all on public.engagement_warehouse_position_v from anon, authenticated;
grant select on public.warehouse_fulfillment_queue_v to authenticated, service_role;
grant select on public.engagement_warehouse_position_v to authenticated, service_role;
