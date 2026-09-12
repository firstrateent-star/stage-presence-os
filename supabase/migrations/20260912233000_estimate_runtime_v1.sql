-- Stage Presence Operational Core: Engagement Estimate Runtime v1.
-- Reuses engagement_cost_items as the single job-cost truth store.
-- No second estimate aggregate is introduced.

create or replace view public.engagement_estimate_lines_v
with (security_invoker = true)
as
select
  ci.id as cost_item_id,
  ci.engagement_id,
  e.engagement_number,
  e.name as engagement_name,
  ci.cost_category,
  ci.cost_state,
  ci.description,
  ci.quantity,
  ci.unit_cost,
  ci.amount,
  ci.currency,
  ci.expected_date,
  ci.incurred_date,
  ci.certainty_state,
  ci.source_type,
  ci.notes,
  ci.resource_id,
  r.name as resource_name,
  ci.team_member_id,
  tm.display_name as team_member_name,
  ci.counterparty_party_id,
  p.name as counterparty_name,
  ci.economic_rate_profile_id,
  erp.profile_key as rate_profile_key,
  erp.name as rate_profile_name,
  erp.status as rate_profile_status,
  erp.cost_domain as rate_cost_domain,
  erp.rate_kind,
  erp.unit_basis as rate_profile_unit_basis,
  erp.amount as current_profile_amount,
  ci.applied_rate,
  ci.rate_basis,
  case
    when ci.economic_rate_profile_id is null then null
    when erp.status = 'APPROVED'
      and (erp.effective_from is null or erp.effective_from <= current_date)
      and (erp.effective_through is null or erp.effective_through >= current_date)
      then 'APPROVED_AUTHORITY'
    when erp.status = 'DRAFT' then 'DRAFT_CANDIDATE'
    else 'RETIRED_OR_OUT_OF_EFFECT'
  end as rate_authority_state,
  ci.fulfillment_line_id,
  fpl.title as fulfillment_line_title,
  ci.commercial_line_id,
  cdl.description as commercial_line_description,
  ci.engagement_assignment_id,
  ci.source_artifact_id,
  ci.source_segment_id,
  ci.metadata,
  ci.created_by,
  ci.created_at,
  ci.updated_at
from public.engagement_cost_items ci
join public.engagements e on e.id = ci.engagement_id
left join public.resources r on r.id = ci.resource_id
left join public.team_members tm on tm.id = ci.team_member_id
left join public.parties p on p.id = ci.counterparty_party_id
left join public.economic_rate_profiles erp on erp.id = ci.economic_rate_profile_id
left join public.fulfillment_plan_lines fpl on fpl.id = ci.fulfillment_line_id
left join public.commercial_document_lines cdl on cdl.id = ci.commercial_line_id
where e.archived_at is null;

create or replace view public.engagement_scope_cost_coverage_v
with (security_invoker = true)
as
with current_plan as (
  select distinct on (fp.engagement_id)
    fp.id,
    fp.engagement_id,
    fp.plan_type,
    fp.plan_state,
    fp.snapshot_at
  from public.fulfillment_plans fp
  where fp.plan_state <> all (array['SUPERSEDED'::text, 'COMPLETE'::text])
  order by fp.engagement_id, fp.snapshot_at desc nulls last, fp.created_at desc
), cost_rollup as (
  select
    ci.fulfillment_line_id,
    count(*) filter (where ci.cost_state <> 'CANCELLED') as represented_cost_item_count,
    count(*) filter (where ci.cost_state = 'ESTIMATE') as estimate_item_count,
    count(*) filter (where ci.cost_state = 'COMMITTED') as committed_item_count,
    count(*) filter (where ci.cost_state = 'ACTUAL') as actual_item_count,
    sum(ci.amount) filter (where ci.cost_state = 'ESTIMATE') as estimated_cost,
    sum(ci.amount) filter (where ci.cost_state = 'COMMITTED') as committed_cost,
    sum(ci.amount) filter (where ci.cost_state = 'ACTUAL') as actual_cost
  from public.engagement_cost_items ci
  where ci.fulfillment_line_id is not null
  group by ci.fulfillment_line_id
)
select
  e.id as engagement_id,
  e.engagement_number,
  e.name as engagement_name,
  e.engagement_type,
  cp.id as fulfillment_plan_id,
  cp.plan_type,
  fpl.id as fulfillment_line_id,
  fpl.sort_order,
  fpl.line_type as fulfillment_line_type,
  fpl.primary_category,
  fpl.subcategory,
  fpl.title,
  fpl.description,
  fpl.quantity,
  fpl.resource_id,
  r.name as resource_name,
  r.category as resource_category,
  r.sourcing_model as resource_sourcing_model,
  coalesce(cr.represented_cost_item_count,0::bigint) as represented_cost_item_count,
  coalesce(cr.estimate_item_count,0::bigint) as estimate_item_count,
  coalesce(cr.committed_item_count,0::bigint) as committed_item_count,
  coalesce(cr.actual_item_count,0::bigint) as actual_item_count,
  cr.estimated_cost,
  cr.committed_cost,
  cr.actual_cost,
  coalesce(rate_match.approved_rate_count,0::bigint) as approved_rate_count,
  coalesce(rate_match.draft_rate_count,0::bigint) as draft_rate_count,
  rate_match.best_rate_profile_id,
  rate_match.best_rate_profile_name,
  rate_match.best_rate_status,
  rate_match.best_rate_amount,
  rate_match.best_rate_unit_basis,
  case
    when fpl.line_type = 'PACKAGE_CHILD' then 'PACKAGE_COMPONENT'
    when coalesce(cr.represented_cost_item_count,0::bigint) > 0 then 'COST_REPRESENTED'
    when coalesce(rate_match.approved_rate_count,0::bigint) > 0 then 'APPROVED_RATE_AVAILABLE'
    when coalesce(rate_match.draft_rate_count,0::bigint) > 0 then 'DRAFT_RATE_AVAILABLE'
    when fpl.resource_id is null then 'NEEDS_MANUAL_COST_DECISION'
    else 'NEEDS_COST_DECISION'
  end as cost_coverage_state,
  fpl.line_type <> 'PACKAGE_CHILD'
    and coalesce(cr.represented_cost_item_count,0::bigint) = 0 as cost_decision_required
from public.engagements e
join current_plan cp on cp.engagement_id = e.id
join public.fulfillment_plan_lines fpl on fpl.fulfillment_plan_id = cp.id
left join public.resources r on r.id = fpl.resource_id
left join cost_rollup cr on cr.fulfillment_line_id = fpl.id
left join lateral (
  select
    count(*) filter (
      where erp.status = 'APPROVED'
        and (erp.effective_from is null or erp.effective_from <= current_date)
        and (erp.effective_through is null or erp.effective_through >= current_date)
    ) as approved_rate_count,
    count(*) filter (where erp.status = 'DRAFT') as draft_rate_count,
    (array_agg(erp.id order by
      case erp.status when 'APPROVED' then 1 when 'DRAFT' then 2 else 3 end,
      case erp.scope_type when 'RESOURCE' then 1 when 'CATEGORY' then 2 else 3 end,
      erp.version_no desc
    ))[1] as best_rate_profile_id,
    (array_agg(erp.name order by
      case erp.status when 'APPROVED' then 1 when 'DRAFT' then 2 else 3 end,
      case erp.scope_type when 'RESOURCE' then 1 when 'CATEGORY' then 2 else 3 end,
      erp.version_no desc
    ))[1] as best_rate_profile_name,
    (array_agg(erp.status order by
      case erp.status when 'APPROVED' then 1 when 'DRAFT' then 2 else 3 end,
      case erp.scope_type when 'RESOURCE' then 1 when 'CATEGORY' then 2 else 3 end,
      erp.version_no desc
    ))[1] as best_rate_status,
    (array_agg(erp.amount order by
      case erp.status when 'APPROVED' then 1 when 'DRAFT' then 2 else 3 end,
      case erp.scope_type when 'RESOURCE' then 1 when 'CATEGORY' then 2 else 3 end,
      erp.version_no desc
    ))[1] as best_rate_amount,
    (array_agg(erp.unit_basis order by
      case erp.status when 'APPROVED' then 1 when 'DRAFT' then 2 else 3 end,
      case erp.scope_type when 'RESOURCE' then 1 when 'CATEGORY' then 2 else 3 end,
      erp.version_no desc
    ))[1] as best_rate_unit_basis
  from public.economic_rate_profiles erp
  where erp.status <> 'RETIRED'
    and (
      (erp.scope_type = 'RESOURCE' and erp.resource_id = fpl.resource_id)
      or (erp.scope_type = 'CATEGORY' and erp.category = coalesce(r.category, fpl.primary_category))
      or erp.scope_type = 'GENERAL'
    )
) rate_match on true
where e.archived_at is null;

-- Preserve the original engagement_estimate_position_v columns and append runtime coverage.
create or replace view public.engagement_estimate_position_v
with (security_invoker = true)
as
with cost_rollup as (
  select
    e.id as engagement_id,
    count(ci.id) filter (where ci.cost_state = 'ESTIMATE') as estimate_item_count,
    coalesce(sum(ci.amount) filter (where ci.cost_state = 'ESTIMATE'),0::numeric) as estimated_direct_cost,
    count(ci.id) filter (where ci.cost_state = 'COMMITTED') as committed_item_count,
    coalesce(sum(ci.amount) filter (where ci.cost_state = 'COMMITTED'),0::numeric) as committed_direct_cost,
    count(ci.id) filter (where ci.cost_state = 'ACTUAL') as actual_item_count,
    coalesce(sum(ci.amount) filter (where ci.cost_state = 'ACTUAL'),0::numeric) as actual_direct_cost,
    count(ci.id) filter (where ci.cost_state = 'CANCELLED') as cancelled_item_count,
    count(distinct ci.cost_category) filter (where ci.cost_state <> 'CANCELLED') as represented_cost_category_count,
    count(ci.id) filter (where ci.cost_state <> 'CANCELLED' and ci.certainty_state in ('VERIFIED','KNOWN')) as known_cost_item_count,
    count(ci.id) filter (where ci.cost_state <> 'CANCELLED' and ci.certainty_state = 'ESTIMATED') as estimated_certainty_item_count,
    count(ci.id) filter (where ci.cost_state <> 'CANCELLED' and ci.certainty_state = 'ASSUMED') as assumed_cost_item_count,
    coalesce(sum(ci.amount) filter (where ci.cost_state = 'ESTIMATE' and ci.cost_category = 'LABOR'),0::numeric) as estimated_labor_cost,
    coalesce(sum(ci.amount) filter (where ci.cost_state = 'ESTIMATE' and ci.cost_category = 'SUBCONTRACT'),0::numeric) as estimated_subcontract_cost,
    coalesce(sum(ci.amount) filter (where ci.cost_state = 'ESTIMATE' and ci.cost_category in ('EQUIPMENT_RENTAL','EQUIPMENT_OWNERSHIP')),0::numeric) as estimated_equipment_cost,
    coalesce(sum(ci.amount) filter (where ci.cost_state = 'ESTIMATE' and ci.cost_category in ('MATERIALS','PURCHASE')),0::numeric) as estimated_materials_purchase_cost,
    coalesce(sum(ci.amount) filter (where ci.cost_state = 'ESTIMATE' and ci.cost_category in ('TRANSPORT','TRAVEL','LODGING','PER_DIEM','FUEL')),0::numeric) as estimated_logistics_travel_cost,
    coalesce(sum(ci.amount) filter (where ci.cost_state = 'ESTIMATE' and ci.cost_category in ('MAINTENANCE','PROCESSING_FEE','OVERHEAD_ALLOCATED','OTHER')),0::numeric) as estimated_other_direct_cost
  from public.engagements e
  left join public.engagement_cost_items ci on ci.engagement_id = e.id
  where e.archived_at is null
  group by e.id
), scope_rollup as (
  select
    engagement_id,
    count(*) filter (where fulfillment_line_type <> 'PACKAGE_CHILD') as scope_line_count,
    count(*) filter (where fulfillment_line_type <> 'PACKAGE_CHILD' and represented_cost_item_count > 0) as scope_lines_with_cost,
    count(*) filter (where cost_decision_required) as cost_decision_gap_count,
    count(*) filter (where cost_coverage_state = 'APPROVED_RATE_AVAILABLE') as approved_rate_available_count,
    count(*) filter (where cost_coverage_state = 'DRAFT_RATE_AVAILABLE') as draft_rate_available_count
  from public.engagement_scope_cost_coverage_v
  group by engagement_id
)
select
  e.id as engagement_id,
  e.engagement_number,
  e.name as engagement_name,
  e.engagement_type,
  e.commercial_state,
  e.commitment_state,
  coalesce(cr.estimate_item_count,0::bigint) as estimate_item_count,
  coalesce(cr.estimated_direct_cost,0::numeric) as estimated_direct_cost,
  coalesce(cr.committed_item_count,0::bigint) as committed_item_count,
  coalesce(cr.committed_direct_cost,0::numeric) as committed_direct_cost,
  coalesce(cr.actual_item_count,0::bigint) as actual_item_count,
  coalesce(cr.actual_direct_cost,0::numeric) as actual_direct_cost,
  coalesce(cr.cancelled_item_count,0::bigint) as cancelled_item_count,
  coalesce(cr.represented_cost_category_count,0::bigint) as represented_cost_category_count,
  case
    when coalesce(cr.estimate_item_count,0::bigint) + coalesce(cr.committed_item_count,0::bigint) + coalesce(cr.actual_item_count,0::bigint) = 0 then 'NO_COST_EVIDENCE'
    when coalesce(cr.actual_item_count,0::bigint) > 0 then 'ACTUAL_EVIDENCE_PRESENT'
    when coalesce(cr.committed_item_count,0::bigint) > 0 then 'COMMITTED_COST_PRESENT'
    when coalesce(cr.estimate_item_count,0::bigint) > 0 then 'ESTIMATE_PRESENT'
    else 'NO_ACTIVE_COST_EVIDENCE'
  end as cost_evidence_state,
  coalesce(cr.known_cost_item_count,0::bigint) as known_cost_item_count,
  coalesce(cr.estimated_certainty_item_count,0::bigint) as estimated_certainty_item_count,
  coalesce(cr.assumed_cost_item_count,0::bigint) as assumed_cost_item_count,
  coalesce(cr.estimated_labor_cost,0::numeric) as estimated_labor_cost,
  coalesce(cr.estimated_subcontract_cost,0::numeric) as estimated_subcontract_cost,
  coalesce(cr.estimated_equipment_cost,0::numeric) as estimated_equipment_cost,
  coalesce(cr.estimated_materials_purchase_cost,0::numeric) as estimated_materials_purchase_cost,
  coalesce(cr.estimated_logistics_travel_cost,0::numeric) as estimated_logistics_travel_cost,
  coalesce(cr.estimated_other_direct_cost,0::numeric) as estimated_other_direct_cost,
  coalesce(sr.scope_line_count,0::bigint) as scope_line_count,
  coalesce(sr.scope_lines_with_cost,0::bigint) as scope_lines_with_cost,
  coalesce(sr.cost_decision_gap_count,0::bigint) as cost_decision_gap_count,
  coalesce(sr.approved_rate_available_count,0::bigint) as approved_rate_available_count,
  coalesce(sr.draft_rate_available_count,0::bigint) as draft_rate_available_count,
  case
    when coalesce(sr.scope_line_count,0::bigint) = 0 then 'NO_REPRESENTED_SCOPE'
    when coalesce(sr.cost_decision_gap_count,0::bigint) = 0 then 'COST_SCOPE_REPRESENTED'
    when coalesce(sr.scope_lines_with_cost,0::bigint) = 0 then 'COSTING_NOT_STARTED'
    else 'PARTIAL_COST_COVERAGE'
  end as estimate_coverage_state
from public.engagements e
left join cost_rollup cr on cr.engagement_id = e.id
left join scope_rollup sr on sr.engagement_id = e.id
where e.archived_at is null;

revoke all on public.engagement_estimate_lines_v from anon, authenticated;
revoke all on public.engagement_scope_cost_coverage_v from anon, authenticated;
revoke all on public.engagement_estimate_position_v from anon, authenticated;

grant select on public.engagement_estimate_lines_v to authenticated, service_role;
grant select on public.engagement_scope_cost_coverage_v to authenticated, service_role;
grant select on public.engagement_estimate_position_v to authenticated, service_role;
