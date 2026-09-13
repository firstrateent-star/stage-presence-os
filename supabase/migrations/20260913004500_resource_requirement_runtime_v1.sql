-- Stage Presence Operational Core: Resource Requirement Runtime v1.
-- Requirement windows are explicit operational truth. Schedule/event dates may suggest
-- a candidate window, but this view never promotes that candidate automatically.

create or replace view public.resource_requirement_position_v
with (security_invoker = true)
as
with accepted_doc as (
  select distinct on (d.engagement_id)
    d.engagement_id,
    d.id as commercial_document_id,
    d.document_state,
    d.transaction_type
  from public.commercial_documents d
  where d.document_state in ('SIGNED','PARTIALLY_PAID','PAID')
    and d.document_type in ('QUOTE','CONTRACT','ORDER','INVOICE')
    and not exists (
      select 1 from public.commercial_documents newer
      where newer.supersedes_document_id = d.id and newer.document_state <> 'VOID'
    )
  order by d.engagement_id,
    coalesce(d.accepted_at,d.signature_date::timestamptz,d.created_at) desc,
    d.version_no desc,
    d.created_at desc
), schedule_window as (
  select
    s.engagement_id,
    min(coalesce(s.start_date,s.start_at::date)) as earliest_schedule_date,
    max(coalesce(s.end_date,s.end_at::date,s.start_date,s.start_at::date)) as latest_schedule_date,
    count(*) filter (where s.time_state in ('KNOWN','VERIFIED')) as known_schedule_items,
    count(*) filter (where s.time_state = 'TBD') as tbd_schedule_items
  from public.engagement_schedule_items s
  group by s.engagement_id
), commitment_rollup as (
  select
    rc.engagement_id,
    rc.resource_id,
    count(*) filter (where rc.commitment_state in ('TENTATIVE','CONFIRMED')) as active_commitment_count,
    count(*) filter (where rc.commitment_state = 'CONFIRMED') as confirmed_commitment_count,
    sum(rc.quantity) filter (where rc.commitment_state = 'CONFIRMED') as confirmed_quantity,
    min(rc.from_date) filter (where rc.commitment_state in ('TENTATIVE','CONFIRMED')) as committed_from_date,
    max(rc.through_date) filter (where rc.commitment_state in ('TENTATIVE','CONFIRMED')) as committed_through_date
  from public.resource_commitments rc
  group by rc.engagement_id,rc.resource_id
)
select
  er.id as engagement_resource_id,
  e.id as engagement_id,
  e.engagement_number,
  e.name as engagement_name,
  e.engagement_type,
  e.event_start_date,
  e.event_end_date,
  ad.commercial_document_id as accepted_document_id,
  ad.document_state as accepted_document_state,
  er.resource_id,
  r.name as resource_name,
  r.category as resource_category,
  r.resource_type,
  r.sourcing_model as resource_default_sourcing_model,
  er.relationship,
  er.quantity,
  er.required_from_date,
  er.required_through_date,
  er.requirement_window_state,
  er.planned_sourcing_model,
  er.notes,
  sw.earliest_schedule_date,
  sw.latest_schedule_date,
  coalesce(sw.known_schedule_items,0::bigint) as known_schedule_items,
  coalesce(sw.tbd_schedule_items,0::bigint) as tbd_schedule_items,
  case
    when sw.earliest_schedule_date is not null then sw.earliest_schedule_date
    when e.event_start_date is not null then e.event_start_date
    else null::date
  end as candidate_from_date,
  case
    when sw.latest_schedule_date is not null then sw.latest_schedule_date
    when e.event_end_date is not null then e.event_end_date
    when e.event_start_date is not null then e.event_start_date
    else null::date
  end as candidate_through_date,
  case
    when sw.earliest_schedule_date is not null then 'SCHEDULE_EVIDENCE'
    when e.event_start_date is not null then 'EVENT_DATE_ONLY'
    else 'NO_CANDIDATE'
  end as candidate_basis,
  coalesce(cr.active_commitment_count,0::bigint) as active_commitment_count,
  coalesce(cr.confirmed_commitment_count,0::bigint) as confirmed_commitment_count,
  cr.confirmed_quantity,
  cr.committed_from_date,
  cr.committed_through_date,
  case
    when ad.commercial_document_id is null then 'NOT_COMMERCIALLY_COMMITTED'
    when er.required_from_date is not null and er.required_through_date is not null
      and er.requirement_window_state = 'VERIFIED' then 'WINDOW_VERIFIED'
    when er.required_from_date is not null and er.required_through_date is not null
      and er.requirement_window_state = 'KNOWN' then 'WINDOW_KNOWN'
    when er.required_from_date is not null and er.required_through_date is not null
      and er.requirement_window_state = 'ESTIMATED' then 'WINDOW_ESTIMATED'
    when er.required_from_date is not null and er.required_through_date is not null
      and er.requirement_window_state = 'INFERRED_FROM_EVENT' then 'WINDOW_INFERRED'
    when sw.earliest_schedule_date is not null or e.event_start_date is not null then 'WINDOW_CANDIDATE_AVAILABLE'
    else 'WINDOW_UNKNOWN'
  end as requirement_runtime_state,
  case
    when coalesce(cr.active_commitment_count,0::bigint) > 0 then 'COMMITMENT_REPRESENTED'
    when er.required_from_date is null or er.required_through_date is null then 'WINDOW_NEEDED'
    else 'READY_FOR_COMMITMENT_DECISION'
  end as next_resource_decision,
  ad.commercial_document_id is not null
    and (er.required_from_date is null or er.required_through_date is null) as window_resolution_required,
  ad.commercial_document_id is not null
    and er.required_from_date is not null
    and er.required_through_date is not null
    and coalesce(cr.active_commitment_count,0::bigint) = 0 as commitment_decision_required
from public.engagement_resources er
join public.engagements e on e.id = er.engagement_id
join public.resources r on r.id = er.resource_id
left join accepted_doc ad on ad.engagement_id = e.id
left join schedule_window sw on sw.engagement_id = e.id
left join commitment_rollup cr on cr.engagement_id = e.id and cr.resource_id = er.resource_id
where e.archived_at is null
  and r.active = true;

create or replace view public.engagement_resource_requirement_summary_v
with (security_invoker = true)
as
select
  e.id as engagement_id,
  e.engagement_number,
  e.name as engagement_name,
  e.commercial_state,
  e.commitment_state,
  count(rr.engagement_resource_id) as represented_resource_count,
  count(rr.engagement_resource_id) filter (where rr.accepted_document_id is not null) as commercially_committed_resource_count,
  count(rr.engagement_resource_id) filter (where rr.requirement_runtime_state = 'WINDOW_VERIFIED') as verified_window_count,
  count(rr.engagement_resource_id) filter (where rr.requirement_runtime_state = 'WINDOW_KNOWN') as known_window_count,
  count(rr.engagement_resource_id) filter (where rr.requirement_runtime_state in ('WINDOW_ESTIMATED','WINDOW_INFERRED')) as provisional_window_count,
  count(rr.engagement_resource_id) filter (where rr.requirement_runtime_state = 'WINDOW_CANDIDATE_AVAILABLE') as candidate_window_count,
  count(rr.engagement_resource_id) filter (where rr.requirement_runtime_state = 'WINDOW_UNKNOWN') as unknown_window_count,
  count(rr.engagement_resource_id) filter (where rr.window_resolution_required) as window_resolution_gap_count,
  count(rr.engagement_resource_id) filter (where rr.commitment_decision_required) as commitment_decision_gap_count,
  count(rr.engagement_resource_id) filter (where rr.active_commitment_count > 0) as resources_with_commitment,
  case
    when count(rr.engagement_resource_id) = 0 then 'NO_RESOURCE_SCOPE'
    when count(rr.engagement_resource_id) filter (where rr.accepted_document_id is not null) = 0 then 'NOT_COMMERCIALLY_COMMITTED'
    when count(rr.engagement_resource_id) filter (where rr.window_resolution_required) > 0 then 'RESOURCE_WINDOWS_NEEDED'
    when count(rr.engagement_resource_id) filter (where rr.commitment_decision_required) > 0 then 'RESOURCE_COMMITMENTS_NEEDED'
    else 'RESOURCE_REQUIREMENTS_REPRESENTED'
  end as resource_requirement_state
from public.engagements e
left join public.resource_requirement_position_v rr on rr.engagement_id = e.id
where e.archived_at is null
group by e.id,e.engagement_number,e.name,e.commercial_state,e.commitment_state;

revoke all on public.resource_requirement_position_v from anon, authenticated;
revoke all on public.engagement_resource_requirement_summary_v from anon, authenticated;
grant select on public.resource_requirement_position_v to authenticated, service_role;
grant select on public.engagement_resource_requirement_summary_v to authenticated, service_role;
