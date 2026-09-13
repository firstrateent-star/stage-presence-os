-- Stage Presence Operational Core: Actuals Runtime v1.
-- Preserve plan truth. Actual activity and actual economics are represented separately.

create table public.engagement_labor_actuals (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  engagement_assignment_id uuid references public.engagement_assignments(id) on delete set null,
  team_member_id uuid not null references public.team_members(id) on delete restrict,
  source_key text unique,
  work_type text not null default 'GENERAL' check (work_type in (
    'GENERAL','WAREHOUSE','LOAD_IN','SETUP','SHOW','STRIKE','RETURN','INSTALL','SERVICE','DRIVE','PROGRAMMING','OTHER'
  )),
  actual_start timestamptz,
  actual_end timestamptz,
  actual_minutes integer not null check (actual_minutes > 0),
  certainty_state text not null default 'KNOWN' check (certainty_state in (
    'VERIFIED','KNOWN','ESTIMATED','ASSUMED','CONFLICTING'
  )),
  source_type text not null default 'MANUAL' check (source_type in (
    'MANUAL','TIMESHEET','IMPORT','SYSTEM','OTHER'
  )),
  source_artifact_id uuid references public.source_artifacts(id) on delete set null,
  source_segment_id uuid references public.source_artifact_segments(id) on delete set null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint engagement_labor_actuals_time_order check (
    actual_start is null or actual_end is null or actual_end >= actual_start
  )
);

create index engagement_labor_actuals_engagement_idx on public.engagement_labor_actuals(engagement_id);
create index engagement_labor_actuals_assignment_idx on public.engagement_labor_actuals(engagement_assignment_id) where engagement_assignment_id is not null;
create index engagement_labor_actuals_team_member_idx on public.engagement_labor_actuals(team_member_id);
create index engagement_labor_actuals_source_artifact_idx on public.engagement_labor_actuals(source_artifact_id) where source_artifact_id is not null;
create index engagement_labor_actuals_source_segment_idx on public.engagement_labor_actuals(source_segment_id) where source_segment_id is not null;
create index engagement_labor_actuals_created_by_idx on public.engagement_labor_actuals(created_by) where created_by is not null;

create or replace function private.validate_engagement_labor_actual()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  assignment_engagement uuid;
  assignment_member uuid;
begin
  if new.engagement_assignment_id is not null then
    select a.engagement_id, a.team_member_id
      into assignment_engagement, assignment_member
    from public.engagement_assignments a
    where a.id = new.engagement_assignment_id;

    if assignment_engagement is null then
      raise exception 'Referenced assignment does not exist.';
    end if;
    if assignment_engagement <> new.engagement_id then
      raise exception 'Labor actual and assignment must belong to the same Engagement.';
    end if;
    if assignment_member <> new.team_member_id then
      raise exception 'Labor actual team member must match the assignment team member.';
    end if;
  end if;
  return new;
end;
$$;

create trigger engagement_labor_actuals_validate
before insert or update on public.engagement_labor_actuals
for each row execute function private.validate_engagement_labor_actual();

create trigger engagement_labor_actuals_touch_updated_at
before update on public.engagement_labor_actuals
for each row execute function private.touch_updated_at();

alter table public.engagement_labor_actuals enable row level security;
create policy engagement_labor_actuals_member_all on public.engagement_labor_actuals
  for all to authenticated
  using ((select private.is_app_member()))
  with check ((select private.is_app_member()));
revoke all on public.engagement_labor_actuals from anon;
grant select,insert,update,delete on public.engagement_labor_actuals to authenticated, service_role;

alter table public.engagement_cost_items
  add column if not exists planned_cost_item_id uuid references public.engagement_cost_items(id) on delete set null,
  add column if not exists labor_actual_id uuid references public.engagement_labor_actuals(id) on delete set null,
  add column if not exists resource_usage_id uuid references public.resource_usage(id) on delete set null;

alter table public.engagement_cost_items
  add constraint engagement_cost_items_planned_not_self check (planned_cost_item_id is null or planned_cost_item_id <> id),
  add constraint engagement_cost_items_actual_link_shape check (
    (planned_cost_item_id is null or cost_state = 'ACTUAL')
    and (labor_actual_id is null or (cost_state = 'ACTUAL' and cost_category = 'LABOR'))
    and (resource_usage_id is null or cost_state = 'ACTUAL')
  );

create index engagement_cost_items_planned_cost_idx on public.engagement_cost_items(planned_cost_item_id) where planned_cost_item_id is not null;
create index engagement_cost_items_labor_actual_idx on public.engagement_cost_items(labor_actual_id) where labor_actual_id is not null;
create index engagement_cost_items_resource_usage_idx on public.engagement_cost_items(resource_usage_id) where resource_usage_id is not null;
create unique index engagement_cost_items_labor_actual_cost_uq
  on public.engagement_cost_items(labor_actual_id)
  where labor_actual_id is not null and cost_state = 'ACTUAL' and cost_category = 'LABOR';

create or replace function private.validate_actual_cost_links()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  planned_engagement uuid;
  planned_state text;
  labor_engagement uuid;
  usage_engagement uuid;
begin
  if new.planned_cost_item_id is not null then
    select c.engagement_id, c.cost_state into planned_engagement, planned_state
    from public.engagement_cost_items c where c.id = new.planned_cost_item_id;
    if planned_engagement is null or planned_engagement <> new.engagement_id then
      raise exception 'Planned cost and actual cost must belong to the same Engagement.';
    end if;
    if planned_state not in ('ESTIMATE','COMMITTED') then
      raise exception 'planned_cost_item_id must reference an ESTIMATE or COMMITTED cost item.';
    end if;
  end if;

  if new.labor_actual_id is not null then
    select l.engagement_id into labor_engagement
    from public.engagement_labor_actuals l where l.id = new.labor_actual_id;
    if labor_engagement is null or labor_engagement <> new.engagement_id then
      raise exception 'Labor actual and actual cost must belong to the same Engagement.';
    end if;
  end if;

  if new.resource_usage_id is not null then
    select u.engagement_id into usage_engagement
    from public.resource_usage u where u.id = new.resource_usage_id;
    if usage_engagement is null or usage_engagement <> new.engagement_id then
      raise exception 'Resource usage and actual cost must belong to the same Engagement.';
    end if;
  end if;
  return new;
end;
$$;

create trigger engagement_cost_items_validate_actual_links
before insert or update on public.engagement_cost_items
for each row execute function private.validate_actual_cost_links();

create or replace function private.preserve_planned_cost_history()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.cost_state <> 'ACTUAL' and new.cost_state = 'ACTUAL' then
    raise exception 'Plan cost rows cannot be converted into ACTUAL rows. Create a new ACTUAL row linked through planned_cost_item_id.';
  end if;
  return new;
end;
$$;

create trigger engagement_cost_items_preserve_plan_history
before update on public.engagement_cost_items
for each row execute function private.preserve_planned_cost_history();

create unique index resource_usage_commitment_uq
  on public.resource_usage(resource_commitment_id)
  where resource_commitment_id is not null;

create or replace view public.engagement_labor_actuals_v
with (security_invoker = true)
as
select
  la.id as labor_actual_id,
  la.engagement_id,
  e.engagement_number,
  e.name as engagement_name,
  la.engagement_assignment_id,
  a.assignment_state,
  a.role_code,
  a.role_label,
  a.scheduled_start,
  a.scheduled_end,
  case
    when a.scheduled_start is not null and a.scheduled_end is not null
    then round(extract(epoch from (a.scheduled_end - a.scheduled_start)) / 60.0)::integer
    else null
  end as scheduled_minutes,
  la.team_member_id,
  coalesce(tm.display_name,tm.username,'Unknown contributor') as team_member_name,
  la.work_type,
  la.actual_start,
  la.actual_end,
  la.actual_minutes,
  round(la.actual_minutes / 60.0, 2) as actual_hours,
  case
    when a.scheduled_start is not null and a.scheduled_end is not null
    then la.actual_minutes - round(extract(epoch from (a.scheduled_end - a.scheduled_start)) / 60.0)::integer
    else null
  end as schedule_variance_minutes,
  la.certainty_state,
  la.source_type,
  la.notes,
  ac.id as actual_labor_cost_id,
  ac.amount as actual_labor_cost,
  ac.quantity as actual_cost_quantity,
  ac.unit_cost as actual_cost_unit_rate,
  ac.applied_rate,
  ac.rate_basis,
  ac.economic_rate_profile_id,
  ac.planned_cost_item_id,
  case when ac.id is null then 'COST_UNRESOLVED' else 'COST_RECORDED' end as labor_cost_state,
  la.created_at,
  la.updated_at
from public.engagement_labor_actuals la
join public.engagements e on e.id = la.engagement_id
join public.team_members tm on tm.id = la.team_member_id
left join public.engagement_assignments a on a.id = la.engagement_assignment_id
left join public.engagement_cost_items ac
  on ac.labor_actual_id = la.id
 and ac.cost_state = 'ACTUAL'
 and ac.cost_category = 'LABOR';

create or replace view public.engagement_resource_actuals_v
with (security_invoker = true)
as
with committed as (
  select
    rc.id as resource_commitment_id,
    rc.engagement_id,
    rc.resource_id,
    rc.fulfillment_plan_line_id,
    rc.commitment_type,
    rc.commitment_state,
    rc.quantity as committed_quantity,
    rc.from_date,
    rc.through_date,
    rc.planned_sourcing_model
  from public.resource_commitments rc
  where rc.commitment_state not in ('CANCELLED','RELEASED')
), usage_cost as (
  select
    c.resource_usage_id,
    count(*) as actual_cost_item_count,
    sum(c.amount) as actual_resource_cost
  from public.engagement_cost_items c
  where c.cost_state = 'ACTUAL' and c.resource_usage_id is not null
  group by c.resource_usage_id
)
select
  coalesce(c.engagement_id,u.engagement_id) as engagement_id,
  e.engagement_number,
  e.name as engagement_name,
  c.resource_commitment_id,
  coalesce(c.resource_id,u.resource_id) as resource_id,
  r.name as resource_name,
  r.category as resource_category,
  coalesce(c.planned_sourcing_model,r.sourcing_model,'UNKNOWN') as planned_sourcing_model,
  c.fulfillment_plan_line_id,
  c.commitment_type,
  c.commitment_state,
  c.committed_quantity,
  c.from_date as committed_from_date,
  c.through_date as committed_through_date,
  u.id as resource_usage_id,
  u.usage_state,
  u.quantity as actual_quantity,
  u.used_from,
  u.used_through,
  u.certainty_state as usage_certainty_state,
  case
    when c.committed_quantity is not null and u.quantity is not null then u.quantity - c.committed_quantity
    else null
  end as quantity_variance,
  coalesce(uc.actual_cost_item_count,0::bigint) as actual_cost_item_count,
  uc.actual_resource_cost,
  case
    when c.resource_commitment_id is null then 'UNPLANNED_USAGE'
    when u.id is not null then 'USAGE_RECORDED'
    when c.commitment_state in ('CONFIRMED','FULFILLED') then 'USAGE_NOT_RECORDED'
    else 'USAGE_NOT_DUE'
  end as usage_coverage_state,
  case
    when u.id is null then 'NO_USAGE'
    when coalesce(c.planned_sourcing_model,r.sourcing_model,'UNKNOWN') in ('SUBCONTRACTED','PARTNER')
      and coalesce(uc.actual_cost_item_count,0::bigint) = 0 then 'DIRECT_COST_QUESTION'
    when coalesce(uc.actual_cost_item_count,0::bigint) > 0 then 'DIRECT_COST_RECORDED'
    else 'NO_AUTOMATIC_DIRECT_COST_REQUIRED'
  end as resource_cost_state
from committed c
full join public.resource_usage u on u.resource_commitment_id = c.resource_commitment_id
join public.engagements e on e.id = coalesce(c.engagement_id,u.engagement_id)
join public.resources r on r.id = coalesce(c.resource_id,u.resource_id)
left join usage_cost uc on uc.resource_usage_id = u.id
where e.archived_at is null;

create or replace view public.engagement_actual_cost_line_variance_v
with (security_invoker = true)
as
select
  ac.id as actual_cost_item_id,
  ac.engagement_id,
  e.engagement_number,
  e.name as engagement_name,
  ac.cost_category,
  ac.description as actual_description,
  ac.amount as actual_amount,
  ac.quantity as actual_quantity,
  ac.unit_cost as actual_unit_cost,
  ac.incurred_date,
  ac.planned_cost_item_id,
  pc.cost_state as planned_cost_state,
  pc.description as planned_description,
  pc.amount as planned_amount,
  pc.quantity as planned_quantity,
  pc.unit_cost as planned_unit_cost,
  case when pc.id is not null then ac.amount - pc.amount else null end as amount_variance,
  case when pc.amount is not null and pc.amount <> 0 then (ac.amount - pc.amount) / pc.amount else null end as amount_variance_ratio,
  ac.labor_actual_id,
  ac.resource_usage_id,
  ac.certainty_state,
  ac.source_type
from public.engagement_cost_items ac
join public.engagements e on e.id = ac.engagement_id
left join public.engagement_cost_items pc on pc.id = ac.planned_cost_item_id
where ac.cost_state = 'ACTUAL';

create or replace view public.engagement_cost_variance_v
with (security_invoker = true)
as
select
  e.id as engagement_id,
  e.engagement_number,
  e.name as engagement_name,
  c.cost_category,
  count(*) filter (where c.cost_state = 'ESTIMATE') as estimate_item_count,
  sum(c.amount) filter (where c.cost_state = 'ESTIMATE') as estimated_cost,
  count(*) filter (where c.cost_state = 'COMMITTED') as committed_item_count,
  sum(c.amount) filter (where c.cost_state = 'COMMITTED') as committed_cost,
  count(*) filter (where c.cost_state = 'ACTUAL') as actual_item_count,
  sum(c.amount) filter (where c.cost_state = 'ACTUAL') as actual_cost,
  case
    when count(*) filter (where c.cost_state = 'COMMITTED') > 0 then sum(c.amount) filter (where c.cost_state = 'COMMITTED')
    when count(*) filter (where c.cost_state = 'ESTIMATE') > 0 then sum(c.amount) filter (where c.cost_state = 'ESTIMATE')
    else null
  end as current_plan_baseline,
  case
    when count(*) filter (where c.cost_state = 'ACTUAL') = 0 then null
    when count(*) filter (where c.cost_state = 'COMMITTED') > 0
      then sum(c.amount) filter (where c.cost_state = 'ACTUAL') - sum(c.amount) filter (where c.cost_state = 'COMMITTED')
    when count(*) filter (where c.cost_state = 'ESTIMATE') > 0
      then sum(c.amount) filter (where c.cost_state = 'ACTUAL') - sum(c.amount) filter (where c.cost_state = 'ESTIMATE')
    else null
  end as actual_variance_to_plan,
  case
    when count(*) filter (where c.cost_state = 'ACTUAL') = 0 then 'NO_ACTUAL_COST'
    when count(*) filter (where c.cost_state in ('ESTIMATE','COMMITTED')) = 0 then 'ACTUAL_WITHOUT_PLAN'
    else 'VARIANCE_AVAILABLE'
  end as variance_state
from public.engagements e
join public.engagement_cost_items c on c.engagement_id = e.id and c.cost_state <> 'CANCELLED'
where e.archived_at is null
group by e.id,e.engagement_number,e.name,c.cost_category;

create or replace view public.engagement_actuals_position_v
with (security_invoker = true)
as
with assignment_rollup as (
  select
    a.engagement_id,
    count(*) filter (where a.assignment_state in ('CONFIRMED','COMPLETED')) as execution_assignment_count,
    count(*) filter (where a.assignment_state = 'COMPLETED') as completed_assignment_count
  from public.engagement_assignments a
  group by a.engagement_id
), labor_rollup as (
  select
    l.engagement_id,
    count(*) as labor_actual_segment_count,
    count(distinct l.engagement_assignment_id) filter (where l.engagement_assignment_id is not null) as assignments_with_labor_actual,
    sum(l.actual_minutes) as actual_labor_minutes,
    count(*) filter (where l.labor_cost_state = 'COST_UNRESOLVED') as labor_cost_gap_count,
    sum(l.actual_labor_cost) filter (where l.actual_labor_cost is not null) as actual_labor_cost
  from public.engagement_labor_actuals_v l
  group by l.engagement_id
), resource_rollup as (
  select
    r.engagement_id,
    count(*) filter (where r.commitment_state in ('CONFIRMED','FULFILLED')) as committed_resource_count,
    count(*) filter (where r.resource_usage_id is not null) as resource_usage_count,
    count(*) filter (where r.usage_coverage_state = 'USAGE_NOT_RECORDED') as resource_usage_gap_count,
    count(*) filter (where r.resource_cost_state = 'DIRECT_COST_QUESTION') as resource_cost_gap_count
  from public.engagement_resource_actuals_v r
  group by r.engagement_id
), cost_rollup as (
  select
    c.engagement_id,
    count(*) filter (where c.cost_state = 'ACTUAL') as actual_cost_item_count,
    sum(c.amount) filter (where c.cost_state = 'ACTUAL') as actual_direct_cost
  from public.engagement_cost_items c
  group by c.engagement_id
), cash_rollup as (
  select
    d.engagement_id,
    count(p.id) as structured_cash_transaction_count,
    sum(case
      when p.transaction_kind = 'REFUND' then -coalesce(p.applied_amount,p.charged_amount,0)
      else coalesce(p.applied_amount,p.charged_amount,0)
    end) as structured_cash_net
  from public.commercial_documents d
  left join public.commercial_payments p on p.commercial_document_id = d.id
  group by d.engagement_id
), closeout_rollup as (
  select c.engagement_id, count(*) as closeout_count
  from public.engagement_closeouts c
  group by c.engagement_id
)
select
  e.id as engagement_id,
  e.engagement_number,
  e.name as engagement_name,
  e.engagement_type,
  e.commercial_state,
  e.commitment_state,
  e.operational_state,
  e.event_start_date,
  coalesce(ar.execution_assignment_count,0::bigint) as execution_assignment_count,
  coalesce(ar.completed_assignment_count,0::bigint) as completed_assignment_count,
  coalesce(lr.labor_actual_segment_count,0::bigint) as labor_actual_segment_count,
  coalesce(lr.assignments_with_labor_actual,0::bigint) as assignments_with_labor_actual,
  coalesce(lr.actual_labor_minutes,0::bigint) as actual_labor_minutes,
  round(coalesce(lr.actual_labor_minutes,0::bigint) / 60.0,2) as actual_labor_hours,
  coalesce(lr.labor_cost_gap_count,0::bigint) as labor_cost_gap_count,
  lr.actual_labor_cost,
  coalesce(rr.committed_resource_count,0::bigint) as committed_resource_count,
  coalesce(rr.resource_usage_count,0::bigint) as resource_usage_count,
  coalesce(rr.resource_usage_gap_count,0::bigint) as resource_usage_gap_count,
  coalesce(rr.resource_cost_gap_count,0::bigint) as resource_cost_gap_count,
  coalesce(cr.actual_cost_item_count,0::bigint) as actual_cost_item_count,
  cr.actual_direct_cost,
  ee.direct_cost_estimate_observed,
  ee.direct_cost_committed_observed,
  ee.committed_revenue_observed,
  ee.collected_observed,
  ee.contribution_observed as actual_contribution_observed,
  case
    when cr.actual_direct_cost is not null and ee.committed_revenue_observed is not null
      then ee.committed_revenue_observed - cr.actual_direct_cost
    else null
  end as actual_contribution_from_structured_cost,
  coalesce(cash.structured_cash_transaction_count,0::bigint) as structured_cash_transaction_count,
  cash.structured_cash_net,
  case
    when coalesce(cash.structured_cash_transaction_count,0::bigint) > 0 then 'STRUCTURED_CASH_PRESENT'
    when coalesce(ee.collected_observed,0) > 0 then 'IMPORTED_COLLECTION_EVIDENCE_ONLY'
    when coalesce(ee.committed_revenue_observed,0) > 0 then 'NO_CASH_EVIDENCE'
    else 'NO_COMMITTED_REVENUE'
  end as cash_evidence_state,
  wp.warehouse_state,
  coalesce(co.closeout_count,0::bigint) as closeout_count,
  case
    when coalesce(ar.completed_assignment_count,0::bigint) > coalesce(lr.assignments_with_labor_actual,0::bigint) then 'LABOR_ACTUALS_NEEDED'
    when coalesce(rr.resource_usage_gap_count,0::bigint) > 0
      and wp.warehouse_state in ('RESOURCE_OUT','RETURN_INSPECTION_REQUIRED','RESTOCK_REQUIRED','WAREHOUSE_COMPLETE','WAREHOUSE_EXCEPTION')
      then 'RESOURCE_USAGE_NEEDED'
    when coalesce(lr.labor_cost_gap_count,0::bigint) + coalesce(rr.resource_cost_gap_count,0::bigint) > 0 then 'ACTUAL_COSTS_INCOMPLETE'
    when wp.warehouse_state in ('RESOURCE_OUT','RETURN_INSPECTION_REQUIRED','RESTOCK_REQUIRED','WAREHOUSE_EXCEPTION') then 'WAREHOUSE_RETURN_OPEN'
    when (coalesce(lr.labor_actual_segment_count,0::bigint) + coalesce(rr.resource_usage_count,0::bigint) + coalesce(cr.actual_cost_item_count,0::bigint)) > 0
      and coalesce(co.closeout_count,0::bigint) = 0 then 'CLOSEOUT_NEEDED'
    when coalesce(co.closeout_count,0::bigint) > 0 then 'ACTUALS_BASELINE_COMPLETE'
    when e.event_start_date is not null and e.event_start_date < current_date and e.commercial_state = 'WON' then 'ACTUALS_NOT_CAPTURED'
    else 'ACTUALS_NOT_STARTED'
  end as actuals_state,
  case
    when coalesce(ar.completed_assignment_count,0::bigint) > coalesce(lr.assignments_with_labor_actual,0::bigint) then 'BLOCKED_BY_LABOR_ACTUALS'
    when coalesce(rr.resource_usage_gap_count,0::bigint) > 0
      and wp.warehouse_state in ('RESOURCE_OUT','RETURN_INSPECTION_REQUIRED','RESTOCK_REQUIRED','WAREHOUSE_COMPLETE','WAREHOUSE_EXCEPTION')
      then 'BLOCKED_BY_RESOURCE_USAGE'
    when coalesce(lr.labor_cost_gap_count,0::bigint) + coalesce(rr.resource_cost_gap_count,0::bigint) > 0 then 'BLOCKED_BY_COST_ACTUALS'
    when wp.warehouse_state in ('RESOURCE_OUT','RETURN_INSPECTION_REQUIRED','RESTOCK_REQUIRED','WAREHOUSE_EXCEPTION') then 'BLOCKED_BY_WAREHOUSE'
    when (coalesce(lr.labor_actual_segment_count,0::bigint) + coalesce(rr.resource_usage_count,0::bigint) + coalesce(cr.actual_cost_item_count,0::bigint)) = 0 then 'NOT_READY'
    when coalesce(co.closeout_count,0::bigint) = 0 then 'READY_FOR_CLOSEOUT'
    else 'CLOSEOUT_RECORDED'
  end as closeout_readiness_state
from public.engagements e
left join assignment_rollup ar on ar.engagement_id = e.id
left join labor_rollup lr on lr.engagement_id = e.id
left join resource_rollup rr on rr.engagement_id = e.id
left join cost_rollup cr on cr.engagement_id = e.id
left join public.engagement_economics_v ee on ee.engagement_id = e.id
left join cash_rollup cash on cash.engagement_id = e.id
left join public.engagement_warehouse_position_v wp on wp.engagement_id = e.id
left join closeout_rollup co on co.engagement_id = e.id
where e.archived_at is null;

revoke all on public.engagement_labor_actuals_v from anon, authenticated;
revoke all on public.engagement_resource_actuals_v from anon, authenticated;
revoke all on public.engagement_actual_cost_line_variance_v from anon, authenticated;
revoke all on public.engagement_cost_variance_v from anon, authenticated;
revoke all on public.engagement_actuals_position_v from anon, authenticated;
grant select on public.engagement_labor_actuals_v to authenticated, service_role;
grant select on public.engagement_resource_actuals_v to authenticated, service_role;
grant select on public.engagement_actual_cost_line_variance_v to authenticated, service_role;
grant select on public.engagement_cost_variance_v to authenticated, service_role;
grant select on public.engagement_actuals_position_v to authenticated, service_role;
