-- Stage Presence Operational Core: Commercial -> Operations Bridge v1.
-- Accepted commercial truth creates operational obligations, but this migration
-- does not manufacture reservations, assignments, schedule, or payment terms.

create or replace view public.accepted_scope_commitment_coverage_v
with (security_invoker = true)
as
with accepted_doc as (
  select distinct on (d.engagement_id)
    d.id as commercial_document_id,
    d.engagement_id,
    d.document_type,
    d.document_state,
    d.transaction_type,
    coalesce(d.grand_total,d.total) as committed_value,
    d.accepted_at,
    d.signature_date,
    d.due_on_signature,
    d.final_due_date,
    d.final_due_amount,
    d.created_at
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
), current_plan as (
  select distinct on (fp.engagement_id)
    fp.id,
    fp.engagement_id,
    fp.plan_type,
    fp.plan_state,
    fp.snapshot_at
  from public.fulfillment_plans fp
  where fp.plan_state <> all (array['SUPERSEDED'::text,'COMPLETE'::text])
  order by fp.engagement_id,fp.snapshot_at desc nulls last,fp.created_at desc
), resource_requirement as (
  select distinct on (er.engagement_id,er.resource_id)
    er.engagement_id,
    er.resource_id,
    er.quantity as requirement_quantity,
    er.required_from_date,
    er.required_through_date,
    er.requirement_window_state,
    er.planned_sourcing_model
  from public.engagement_resources er
  order by er.engagement_id,er.resource_id,
    case er.requirement_window_state
      when 'VERIFIED' then 1 when 'KNOWN' then 2 when 'ESTIMATED' then 3
      when 'INFERRED_FROM_EVENT' then 4 else 5 end,
    er.created_at desc
), commitment_rollup as (
  select
    rc.engagement_id,
    rc.fulfillment_plan_line_id,
    count(*) filter (where rc.commitment_state in ('TENTATIVE','CONFIRMED')) as active_commitment_count,
    count(*) filter (where rc.commitment_state = 'TENTATIVE') as tentative_commitment_count,
    count(*) filter (where rc.commitment_state = 'CONFIRMED') as confirmed_commitment_count,
    sum(rc.quantity) filter (where rc.commitment_state = 'CONFIRMED') as confirmed_quantity,
    min(rc.from_date) filter (where rc.commitment_state in ('TENTATIVE','CONFIRMED')) as committed_from_date,
    max(rc.through_date) filter (where rc.commitment_state in ('TENTATIVE','CONFIRMED')) as committed_through_date
  from public.resource_commitments rc
  where rc.fulfillment_plan_line_id is not null
  group by rc.engagement_id,rc.fulfillment_plan_line_id
)
select
  e.id as engagement_id,
  e.engagement_number,
  e.name as engagement_name,
  e.engagement_type,
  ad.commercial_document_id,
  ad.document_type as accepted_document_type,
  ad.document_state as accepted_document_state,
  ad.transaction_type,
  ad.committed_value,
  ad.accepted_at,
  cp.id as fulfillment_plan_id,
  cp.plan_type,
  fpl.id as fulfillment_line_id,
  fpl.sort_order,
  fpl.line_type as fulfillment_line_type,
  fpl.primary_category,
  fpl.subcategory,
  fpl.title,
  fpl.description,
  fpl.quantity as scope_quantity,
  fpl.resource_id,
  r.name as resource_name,
  r.category as resource_category,
  r.sourcing_model as resource_default_sourcing_model,
  rr.requirement_quantity,
  rr.required_from_date,
  rr.required_through_date,
  rr.requirement_window_state,
  coalesce(rr.planned_sourcing_model,r.sourcing_model,'UNKNOWN') as planned_sourcing_model,
  coalesce(cr.active_commitment_count,0::bigint) as active_commitment_count,
  coalesce(cr.tentative_commitment_count,0::bigint) as tentative_commitment_count,
  coalesce(cr.confirmed_commitment_count,0::bigint) as confirmed_commitment_count,
  cr.confirmed_quantity,
  cr.committed_from_date,
  cr.committed_through_date,
  case
    when ad.commercial_document_id is null then 'NOT_COMMERCIALLY_COMMITTED'
    when fpl.resource_id is null then 'NON_RESOURCE_SCOPE'
    when coalesce(cr.active_commitment_count,0::bigint) > 0 then 'RESOURCE_COMMITMENT_REPRESENTED'
    when rr.required_from_date is null or rr.required_through_date is null then 'REQUIREMENT_WINDOW_NEEDED'
    else 'RESOURCE_COMMITMENT_NEEDED'
  end as operational_commitment_state,
  ad.commercial_document_id is not null
    and fpl.resource_id is not null
    and coalesce(cr.active_commitment_count,0::bigint) = 0
    and rr.required_from_date is not null
    and rr.required_through_date is not null as resource_commitment_decision_required,
  ad.commercial_document_id is not null
    and fpl.resource_id is not null
    and coalesce(cr.active_commitment_count,0::bigint) = 0
    and (rr.required_from_date is null or rr.required_through_date is null) as requirement_window_resolution_required
from public.engagements e
join current_plan cp on cp.engagement_id = e.id
join public.fulfillment_plan_lines fpl on fpl.fulfillment_plan_id = cp.id
left join accepted_doc ad on ad.engagement_id = e.id
left join public.resources r on r.id = fpl.resource_id
left join resource_requirement rr on rr.engagement_id = e.id and rr.resource_id = fpl.resource_id
left join commitment_rollup cr on cr.engagement_id = e.id and cr.fulfillment_plan_line_id = fpl.id
where e.archived_at is null;

create or replace view public.engagement_commitment_bridge_v
with (security_invoker = true)
as
with accepted_doc as (
  select distinct on (d.engagement_id)
    d.id as commercial_document_id,
    d.engagement_id,
    d.document_type,
    d.document_state,
    d.transaction_type,
    coalesce(d.grand_total,d.total) as committed_value,
    d.accepted_at,
    d.signature_date,
    d.due_on_signature,
    d.final_due_date,
    d.final_due_amount,
    d.created_at
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
), scope_rollup as (
  select
    c.engagement_id,
    count(*) filter (where c.fulfillment_line_type <> 'PACKAGE_CHILD') as scope_line_count,
    count(*) filter (where c.fulfillment_line_type <> 'PACKAGE_CHILD' and c.resource_id is not null) as resource_scope_line_count,
    count(*) filter (where c.fulfillment_line_type <> 'PACKAGE_CHILD' and c.resource_id is null) as non_resource_scope_line_count,
    count(*) filter (where c.active_commitment_count > 0) as resource_scope_lines_with_commitment,
    count(*) filter (where c.resource_commitment_decision_required) as resource_commitment_gap_count,
    count(*) filter (where c.requirement_window_resolution_required) as requirement_window_gap_count,
    count(*) filter (where c.confirmed_commitment_count > 0) as resource_scope_lines_confirmed
  from public.accepted_scope_commitment_coverage_v c
  group by c.engagement_id
), assignment_rollup as (
  select
    a.engagement_id,
    count(*) filter (where a.assignment_state in ('POSSIBLE','REQUESTED','CONFIRMED')) as represented_assignment_count,
    count(*) filter (where a.assignment_state = 'CONFIRMED') as confirmed_assignment_count,
    count(*) filter (where a.assignment_state = 'REQUESTED') as requested_assignment_count
  from public.engagement_assignments a
  group by a.engagement_id
), schedule_rollup as (
  select
    s.engagement_id,
    count(*) as schedule_item_count,
    count(*) filter (where s.time_state in ('KNOWN','VERIFIED')) as known_schedule_item_count,
    count(*) filter (where s.time_state = 'TBD') as tbd_schedule_item_count
  from public.engagement_schedule_items s
  group by s.engagement_id
), payment_rollup as (
  select
    d.engagement_id,
    count(ps.id) as payment_schedule_item_count,
    count(ps.id) filter (where ps.status in ('PLANNED','DUE','PARTIAL')) as open_payment_term_count,
    sum(ps.amount) filter (where ps.status <> 'WAIVED') as scheduled_amount
  from accepted_doc d
  left join public.commercial_payment_schedule ps on ps.commercial_document_id = d.commercial_document_id
  group by d.engagement_id
)
select
  e.id as engagement_id,
  e.engagement_number,
  e.name as engagement_name,
  e.engagement_type,
  e.commercial_state,
  e.commitment_state,
  e.operational_state,
  ad.commercial_document_id as accepted_document_id,
  ad.document_type as accepted_document_type,
  ad.document_state as accepted_document_state,
  ad.transaction_type,
  ad.committed_value,
  ad.accepted_at,
  ad.signature_date,
  coalesce(sr.scope_line_count,0::bigint) as scope_line_count,
  coalesce(sr.resource_scope_line_count,0::bigint) as resource_scope_line_count,
  coalesce(sr.non_resource_scope_line_count,0::bigint) as non_resource_scope_line_count,
  coalesce(sr.resource_scope_lines_with_commitment,0::bigint) as resource_scope_lines_with_commitment,
  coalesce(sr.resource_scope_lines_confirmed,0::bigint) as resource_scope_lines_confirmed,
  coalesce(sr.resource_commitment_gap_count,0::bigint) as resource_commitment_gap_count,
  coalesce(sr.requirement_window_gap_count,0::bigint) as requirement_window_gap_count,
  coalesce(ar.represented_assignment_count,0::bigint) as represented_assignment_count,
  coalesce(ar.confirmed_assignment_count,0::bigint) as confirmed_assignment_count,
  coalesce(ar.requested_assignment_count,0::bigint) as requested_assignment_count,
  coalesce(scr.schedule_item_count,0::bigint) as schedule_item_count,
  coalesce(scr.known_schedule_item_count,0::bigint) as known_schedule_item_count,
  coalesce(scr.tbd_schedule_item_count,0::bigint) as tbd_schedule_item_count,
  coalesce(pr.payment_schedule_item_count,0::bigint) as payment_schedule_item_count,
  coalesce(pr.open_payment_term_count,0::bigint) as open_payment_term_count,
  pr.scheduled_amount,
  case
    when ad.commercial_document_id is null then 'NO_ACCEPTED_COMMERCIAL'
    when coalesce(pr.payment_schedule_item_count,0::bigint) > 0 then 'PAYMENT_SCHEDULE_REPRESENTED'
    when ad.due_on_signature is not null or ad.final_due_date is not null or ad.final_due_amount is not null then 'PAYMENT_TERMS_NEED_STRUCTURING'
    else 'PAYMENT_TERMS_UNKNOWN'
  end as payment_term_state,
  case
    when coalesce(ar.confirmed_assignment_count,0::bigint) > 0 then 'CONFIRMED_ASSIGNMENT_PRESENT'
    when coalesce(ar.requested_assignment_count,0::bigint) > 0 then 'ASSIGNMENT_REQUESTED'
    when coalesce(ar.represented_assignment_count,0::bigint) > 0 then 'POSSIBLE_ASSIGNMENT_PRESENT'
    else 'NO_ASSIGNMENT_REPRESENTED'
  end as assignment_coverage_state,
  case
    when coalesce(scr.schedule_item_count,0::bigint) = 0 then 'NO_SCHEDULE_REPRESENTED'
    when coalesce(scr.tbd_schedule_item_count,0::bigint) > 0 then 'SCHEDULE_HAS_TBD'
    else 'SCHEDULE_REPRESENTED'
  end as schedule_coverage_state,
  case
    when ad.commercial_document_id is null then 'NOT_COMMERCIALLY_COMMITTED'
    when coalesce(sr.requirement_window_gap_count,0::bigint) > 0 then 'RESOURCE_WINDOWS_NEEDED'
    when coalesce(sr.resource_commitment_gap_count,0::bigint) > 0 then 'RESOURCE_COMMITMENTS_NEEDED'
    when coalesce(pr.payment_schedule_item_count,0::bigint) = 0
      and (ad.due_on_signature is not null or ad.final_due_date is not null or ad.final_due_amount is not null)
      then 'PAYMENT_TERMS_NEED_STRUCTURING'
    else 'ACCEPTED_SCOPE_BASELINE_REPRESENTED'
  end as operations_bridge_state
from public.engagements e
left join accepted_doc ad on ad.engagement_id = e.id
left join scope_rollup sr on sr.engagement_id = e.id
left join assignment_rollup ar on ar.engagement_id = e.id
left join schedule_rollup scr on scr.engagement_id = e.id
left join payment_rollup pr on pr.engagement_id = e.id
where e.archived_at is null;

revoke all on public.accepted_scope_commitment_coverage_v from anon, authenticated;
revoke all on public.engagement_commitment_bridge_v from anon, authenticated;
grant select on public.accepted_scope_commitment_coverage_v to authenticated, service_role;
grant select on public.engagement_commitment_bridge_v to authenticated, service_role;
