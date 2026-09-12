-- Refine the stable Capability contract without splitting historical Resource identity.
-- The resources table remains canonical; capability_kind is a derived semantic.
-- Existing column order is preserved; new semantic columns are appended.

create or replace view public.capability_summary_v
with (security_invoker = true)
as
with commitment_rollup as (
  select resource_id,
    count(*) filter (where commitment_state = any(array['TENTATIVE','CONFIRMED']))::int as active_commitment_count,
    sum(quantity) filter (where commitment_state = any(array['TENTATIVE','CONFIRMED'])) as active_committed_quantity,
    min(from_date) filter (where commitment_state = any(array['TENTATIVE','CONFIRMED'])) as next_commitment_from,
    max(through_date) filter (where commitment_state = any(array['TENTATIVE','CONFIRMED'])) as active_commitment_through
  from public.resource_commitments
  group by resource_id
), usage_rollup as (
  select resource_id,
    count(*)::int as usage_record_count,
    count(*) filter (where usage_state = any(array['IN_USE','RETURNED','CONSUMED','COMPLETE']))::int as represented_actual_usage_count,
    sum(quantity) filter (where usage_state = any(array['IN_USE','RETURNED','CONSUMED','COMPLETE'])) as represented_actual_quantity,
    max(used_through) as latest_usage_through
  from public.resource_usage
  group by resource_id
), commercial_rollup as (
  select l.resource_id,
    count(*)::int as commercial_line_count,
    sum(coalesce(l.line_total, l.quantity * l.unit_price)) as represented_commercial_line_value
  from public.commercial_document_lines l
  join public.commercial_documents d on d.id = l.commercial_document_id
  where l.resource_id is not null and d.document_state <> 'VOID'
  group by l.resource_id
), cost_rollup as (
  select resource_id,
    count(*) filter (where cost_state <> 'CANCELLED')::int as direct_cost_record_count,
    sum(amount) filter (where cost_state = 'ACTUAL') as represented_actual_direct_cost,
    sum(amount) filter (where cost_state = 'COMMITTED') as represented_committed_direct_cost,
    sum(amount) filter (where cost_state = 'ESTIMATE') as represented_estimated_direct_cost
  from public.engagement_cost_items
  where resource_id is not null
  group by resource_id
), classified as (
  select r.*,
    case
      when coalesce(r.resource_type, '') ilike '%discount%' then 'COMMERCIAL_ADJUSTMENT'
      when coalesce(r.resource_type, '') ilike '%logistics%' then 'LOGISTICS'
      when coalesce(r.resource_type, '') ilike 'service /%' then 'SERVICE'
      when r.category <> 'OTHER' then 'PHYSICAL_CAPACITY'
      when r.quantity is not null or r.sourcing_model = 'OWNED' then 'PHYSICAL_CAPACITY'
      else 'OTHER'
    end as capability_kind
  from public.resources r
)
select
  r.id as resource_id,
  r.name,
  r.category,
  r.resource_type,
  r.sourcing_model,
  r.quantity,
  r.quantity_state,
  r.condition_state,
  r.reference_price,
  r.price_basis,
  r.price_state,
  r.active,
  coalesce(cr.active_commitment_count, 0) as active_commitment_count,
  cr.active_committed_quantity,
  cr.next_commitment_from,
  cr.active_commitment_through,
  coalesce(ur.usage_record_count, 0) as usage_record_count,
  coalesce(ur.represented_actual_usage_count, 0) as represented_actual_usage_count,
  ur.represented_actual_quantity,
  ur.latest_usage_through,
  coalesce(comr.commercial_line_count, 0) as commercial_line_count,
  comr.represented_commercial_line_value,
  coalesce(costr.direct_cost_record_count, 0) as direct_cost_record_count,
  costr.represented_actual_direct_cost,
  costr.represented_committed_direct_cost,
  costr.represented_estimated_direct_cost,
  econ.as_of as economic_as_of,
  econ.ownership_state,
  econ.represented_quantity as economic_represented_quantity,
  econ.acquisition_cost_total,
  econ.current_value_estimate,
  econ.replacement_cost_total,
  econ.financing_balance,
  econ.annual_maintenance_estimate,
  econ.certainty_state as economic_certainty_state,
  case
    when r.capability_kind <> 'PHYSICAL_CAPACITY' then 'NON_CAPACITY_CAPABILITY'
    when r.quantity_state <> 'VERIFIED' or r.sourcing_model = 'UNKNOWN' then 'CAPABILITY_TRUTH_PARTIAL'
    when coalesce(ur.represented_actual_usage_count, 0) = 0 then 'ACTUAL_USE_NOT_YET_OBSERVED'
    else 'OPERATING_EVIDENCE_PRESENT'
  end as capability_evidence_state,
  r.capability_kind,
  (r.capability_kind = 'PHYSICAL_CAPACITY') as capacity_relevant
from classified r
left join commitment_rollup cr on cr.resource_id = r.id
left join usage_rollup ur on ur.resource_id = r.id
left join commercial_rollup comr on comr.resource_id = r.id
left join cost_rollup costr on costr.resource_id = r.id
left join public.resource_economy_current_v econ on econ.resource_id = r.id
where r.archived_at is null and r.active = true;

comment on view public.capability_summary_v is
  'Stable Capability read contract. capability_kind distinguishes physical capacity from service/logistics/commercial catalog concepts without rewriting historical Resource identity.';
