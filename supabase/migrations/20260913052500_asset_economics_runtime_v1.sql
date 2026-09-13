create view public.resource_utilization_position_v with (security_invoker = true) as
with commitments as (
  select
    rc.resource_id,
    count(*) filter (where rc.commitment_state = 'CONFIRMED')::int as confirmed_reservation_count,
    count(distinct rc.engagement_id) filter (where rc.commitment_state = 'CONFIRMED')::int as confirmed_engagement_count,
    coalesce(sum(
      case
        when rc.commitment_state = 'CONFIRMED' and rc.from_date is not null and rc.through_date is not null
          then coalesce(rc.quantity, 1) * ((rc.through_date - rc.from_date) + 1)
        else 0
      end
    ), 0)::numeric as reserved_quantity_days,
    max(rc.through_date) filter (where rc.commitment_state = 'CONFIRMED') as last_reserved_through_date
  from public.resource_commitments rc
  group by rc.resource_id
), usage as (
  select
    ru.resource_id,
    count(*)::int as usage_record_count,
    count(distinct ru.engagement_id)::int as usage_engagement_count,
    coalesce(sum(coalesce(ru.quantity, 0)), 0)::numeric as actual_usage_quantity_total,
    coalesce(sum(
      case
        when ru.used_from is not null and ru.used_through is not null and ru.used_through >= ru.used_from
          then extract(epoch from (ru.used_through - ru.used_from)) / 3600.0
        else 0
      end
    ), 0)::numeric as actual_usage_hours,
    max(coalesce(ru.used_through, ru.used_from)) as last_usage_at
  from public.resource_usage ru
  group by ru.resource_id
)
select
  cp.resource_id,
  cp.resource_name,
  cp.category,
  cp.sourcing_model,
  cp.verified_quantity,
  cp.serviceable_quantity,
  cp.available_quantity_today,
  cp.capacity_state,
  cp.inventory_authority_state,
  coalesce(c.confirmed_reservation_count, 0) as confirmed_reservation_count,
  coalesce(c.confirmed_engagement_count, 0) as confirmed_engagement_count,
  coalesce(c.reserved_quantity_days, 0) as reserved_quantity_days,
  c.last_reserved_through_date,
  coalesce(u.usage_record_count, 0) as usage_record_count,
  coalesce(u.usage_engagement_count, 0) as usage_engagement_count,
  coalesce(u.actual_usage_quantity_total, 0) as actual_usage_quantity_total,
  coalesce(u.actual_usage_hours, 0) as actual_usage_hours,
  u.last_usage_at,
  case
    when cp.sourcing_model <> 'OWNED' then 'EXTERNAL_CAPACITY'
    when cp.verification_id is null then 'INVENTORY_UNVERIFIED'
    when coalesce(c.confirmed_reservation_count, 0) = 0 and coalesce(u.usage_record_count, 0) = 0 then 'NO_OPERATIONAL_HISTORY'
    when coalesce(u.usage_record_count, 0) = 0 then 'RESERVATION_HISTORY_ONLY'
    else 'USAGE_EVIDENCE_PRESENT'
  end as utilization_evidence_state
from public.resource_capacity_position_v cp
left join commitments c on c.resource_id = cp.resource_id
left join usage u on u.resource_id = cp.resource_id;

grant select on public.resource_utilization_position_v to authenticated, service_role;

create view public.resource_maintenance_economics_v with (security_invoker = true) as
with issues as (
  select
    rmi.resource_id,
    count(*)::int as issue_count,
    count(*) filter (where rmi.status not in ('RESOLVED','CANCELLED'))::int as open_issue_count,
    count(*) filter (where rmi.status = 'RESOLVED')::int as resolved_issue_count,
    coalesce(sum(rmi.affected_quantity) filter (where rmi.status not in ('RESOLVED','CANCELLED')), 0)::numeric as open_affected_quantity,
    coalesce(sum(
      case
        when rmi.status = 'RESOLVED' and rmi.resolved_at is not null then extract(epoch from (rmi.resolved_at - rmi.discovered_at)) / 86400.0
        when rmi.status not in ('RESOLVED','CANCELLED') then extract(epoch from (now() - rmi.discovered_at)) / 86400.0
        else 0
      end
    ), 0)::numeric as observed_downtime_days,
    max(rmi.discovered_at) as last_issue_discovered_at,
    max(rmi.resolved_at) as last_issue_resolved_at
  from public.resource_maintenance_issues rmi
  group by rmi.resource_id
), costs as (
  select
    cci.resource_id,
    count(*) filter (where cci.cost_category = 'MAINTENANCE' and cci.cost_state = 'ESTIMATE')::int as maintenance_estimate_count,
    coalesce(sum(cci.amount) filter (where cci.cost_category = 'MAINTENANCE' and cci.cost_state = 'ESTIMATE'), 0)::numeric as maintenance_estimated_cost,
    count(*) filter (where cci.cost_category = 'MAINTENANCE' and cci.cost_state = 'ACTUAL')::int as maintenance_actual_count,
    coalesce(sum(cci.amount) filter (where cci.cost_category = 'MAINTENANCE' and cci.cost_state = 'ACTUAL'), 0)::numeric as maintenance_actual_cost,
    max(cci.incurred_date) filter (where cci.cost_category = 'MAINTENANCE' and cci.cost_state = 'ACTUAL') as last_maintenance_cost_date
  from public.company_cost_items cci
  where cci.resource_id is not null
  group by cci.resource_id
)
select
  r.id as resource_id,
  r.name as resource_name,
  coalesce(i.issue_count, 0) as issue_count,
  coalesce(i.open_issue_count, 0) as open_issue_count,
  coalesce(i.resolved_issue_count, 0) as resolved_issue_count,
  coalesce(i.open_affected_quantity, 0) as open_affected_quantity,
  coalesce(i.observed_downtime_days, 0) as observed_downtime_days,
  i.last_issue_discovered_at,
  i.last_issue_resolved_at,
  coalesce(c.maintenance_estimate_count, 0) as maintenance_estimate_count,
  coalesce(c.maintenance_estimated_cost, 0) as maintenance_estimated_cost,
  coalesce(c.maintenance_actual_count, 0) as maintenance_actual_count,
  coalesce(c.maintenance_actual_cost, 0) as maintenance_actual_cost,
  c.last_maintenance_cost_date,
  case
    when coalesce(i.issue_count, 0) = 0 and coalesce(c.maintenance_actual_count, 0) = 0 then 'NO_MAINTENANCE_HISTORY'
    when coalesce(c.maintenance_actual_count, 0) = 0 then 'ISSUE_HISTORY_NO_ACTUAL_COST'
    else 'MAINTENANCE_EVIDENCE_PRESENT'
  end as maintenance_evidence_state
from public.resources r
left join issues i on i.resource_id = r.id
left join costs c on c.resource_id = r.id
where r.active = true;

grant select on public.resource_maintenance_economics_v to authenticated, service_role;

create view public.resource_commercial_support_v with (security_invoker = true) as
with ranked_documents as (
  select
    cd.*,
    row_number() over (
      partition by cd.engagement_id
      order by cd.version_no desc, coalesce(cd.accepted_at, cd.snapshot_at, cd.created_at) desc, cd.created_at desc
    ) as engagement_rank
  from public.commercial_documents cd
  where cd.document_state in ('SIGNED','PARTIALLY_PAID','PAID')
), resource_engagements as (
  select
    cdl.resource_id,
    rd.engagement_id,
    sum(coalesce(cdl.line_total, 0))::numeric as resource_line_revenue_supported,
    max(coalesce(rd.grand_total, rd.total, 0))::numeric as engagement_revenue_context
  from ranked_documents rd
  join public.commercial_document_lines cdl on cdl.commercial_document_id = rd.id
  where rd.engagement_rank = 1
    and cdl.resource_id is not null
  group by cdl.resource_id, rd.engagement_id
), supported as (
  select
    re.resource_id,
    count(*)::int as supported_engagement_count,
    coalesce(sum(re.resource_line_revenue_supported), 0)::numeric as commercial_line_revenue_supported,
    coalesce(sum(re.engagement_revenue_context), 0)::numeric as engagement_revenue_supported,
    count(*) filter (where eap.actuals_state = 'ACTUALS_BASELINE_COMPLETE')::int as contribution_supported_engagement_count,
    coalesce(sum(eap.actual_contribution_from_structured_cost) filter (where eap.actuals_state = 'ACTUALS_BASELINE_COMPLETE'), 0)::numeric as contribution_supported,
    max(e.event_start_date) as last_supported_engagement_date
  from resource_engagements re
  join public.engagements e on e.id = re.engagement_id
  left join public.engagement_actuals_position_v eap on eap.engagement_id = re.engagement_id
  group by re.resource_id
)
select
  r.id as resource_id,
  r.name as resource_name,
  coalesce(s.supported_engagement_count, 0) as supported_engagement_count,
  coalesce(s.commercial_line_revenue_supported, 0) as commercial_line_revenue_supported,
  coalesce(s.engagement_revenue_supported, 0) as engagement_revenue_supported,
  coalesce(s.contribution_supported_engagement_count, 0) as contribution_supported_engagement_count,
  coalesce(s.contribution_supported, 0) as contribution_supported,
  s.last_supported_engagement_date,
  case
    when coalesce(s.supported_engagement_count, 0) = 0 then 'NO_COMMERCIAL_SUPPORT_EVIDENCE'
    when coalesce(s.contribution_supported_engagement_count, 0) = 0 then 'REVENUE_SUPPORT_ONLY'
    else 'CONTRIBUTION_SUPPORT_EVIDENCE_PRESENT'
  end as commercial_support_evidence_state
from public.resources r
left join supported s on s.resource_id = r.id
where r.active = true;

grant select on public.resource_commercial_support_v to authenticated, service_role;

create view public.resource_asset_measurement_v with (security_invoker = true) as
select
  u.resource_id,
  u.resource_name,
  u.category,
  u.sourcing_model,
  u.verified_quantity,
  u.serviceable_quantity,
  u.available_quantity_today,
  u.capacity_state,
  u.inventory_authority_state,
  u.confirmed_reservation_count,
  u.confirmed_engagement_count,
  u.reserved_quantity_days,
  u.usage_record_count,
  u.usage_engagement_count,
  u.actual_usage_quantity_total,
  u.actual_usage_hours,
  u.last_usage_at,
  m.issue_count,
  m.open_issue_count,
  m.open_affected_quantity,
  m.observed_downtime_days,
  m.maintenance_estimated_cost,
  m.maintenance_actual_cost,
  c.supported_engagement_count,
  c.commercial_line_revenue_supported,
  c.engagement_revenue_supported,
  c.contribution_supported_engagement_count,
  c.contribution_supported,
  u.utilization_evidence_state,
  m.maintenance_evidence_state,
  c.commercial_support_evidence_state,
  (u.capacity_state in ('CAPACITY_CONFLICT','FULLY_COMMITTED_TODAY')) as capacity_pressure_observed,
  (m.open_issue_count > 0 or m.maintenance_actual_cost > 0) as maintenance_pressure_observed,
  case
    when u.sourcing_model <> 'OWNED' then 'OUTSIDE_OWNED_ASSET_SCOPE'
    when u.inventory_authority_state = 'UNVERIFIED' then 'INSUFFICIENT_EVIDENCE'
    when u.usage_record_count = 0 then 'INSUFFICIENT_EVIDENCE'
    when c.supported_engagement_count = 0 then 'INSUFFICIENT_EVIDENCE'
    when c.contribution_supported_engagement_count = 0 then 'MEASUREMENT_ACTIVE_LIMITED_ECONOMICS'
    else 'MEASUREMENT_ACTIVE'
  end as measurement_state,
  array_remove(array[
    case when u.inventory_authority_state = 'UNVERIFIED' then 'VERIFY_PHYSICAL_INVENTORY' end,
    case when u.confirmed_reservation_count = 0 then 'NO_CONFIRMED_RESERVATION_HISTORY' end,
    case when u.usage_record_count = 0 then 'NO_ACTUAL_USAGE_HISTORY' end,
    case when c.supported_engagement_count = 0 then 'NO_ACCEPTED_COMMERCIAL_SUPPORT_HISTORY' end,
    case when c.supported_engagement_count > 0 and c.contribution_supported_engagement_count = 0 then 'NO_COMPLETE_ACTUAL_CONTRIBUTION_HISTORY' end,
    case when m.issue_count > 0 and m.maintenance_actual_count = 0 then 'MAINTENANCE_COST_ACTUALS_MISSING' end
  ], null) as evidence_gaps
from public.resource_utilization_position_v u
join public.resource_maintenance_economics_v m on m.resource_id = u.resource_id
join public.resource_commercial_support_v c on c.resource_id = u.resource_id;

grant select on public.resource_asset_measurement_v to authenticated, service_role;
