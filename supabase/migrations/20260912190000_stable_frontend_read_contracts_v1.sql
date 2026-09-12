-- Stable read contracts for the Stage Presence frontend rebuild.
-- These views project canonical truth; they do not own writes.

create or replace view public.engagement_summary_v
with (security_invoker = true)
as
select
  e.id,
  e.engagement_number,
  e.display_number,
  e.name,
  e.engagement_type,
  e.customer_request,
  e.desired_outcome,
  e.event_start,
  e.event_end,
  e.event_start_date,
  e.event_end_date,
  e.commercial_state,
  e.commitment_state,
  e.operational_state,
  e.attention_state,
  e.updated_at,
  pc.primary_customer,
  coalesce(cv.venue, case
    when e.venue_name is not null or e.venue_address is not null then jsonb_build_object(
      'id', null,
      'name', e.venue_name,
      'address', e.venue_address,
      'certainty_state', 'COMPATIBILITY_FALLBACK'
    )
    else null
  end) as venue,
  case
    when cv.venue is not null then 'CANONICAL_LOCATION'
    when e.venue_name is not null or e.venue_address is not null then 'COMPATIBILITY_FALLBACK'
    else 'UNKNOWN'
  end as venue_basis,
  nw.next_work,
  ns.next_schedule,
  jsonb_build_object(
    'proposal_value_observed', eco.proposal_value_observed,
    'committed_revenue_observed', eco.committed_revenue_observed,
    'invoiced_observed', eco.invoiced_observed,
    'collected_observed', eco.collected_observed,
    'outstanding_observed', eco.outstanding_observed,
    'direct_cost_estimate_observed', eco.direct_cost_estimate_observed,
    'direct_cost_actual_observed', eco.direct_cost_actual_observed,
    'projected_contribution_observed', eco.projected_contribution_observed,
    'contribution_observed', eco.contribution_observed,
    'economy_state', eco.economy_state,
    'cash_evidence_state', eco.cash_evidence_state,
    'cost_evidence_state', eco.cost_evidence_state
  ) as economy,
  coalesce(wc.open_work_count, 0) as open_work_count,
  coalesce(ac.active_assignment_count, 0) as active_assignment_count,
  coalesce(cc.active_commitment_count, 0) as active_resource_commitment_count,
  coalesce(ev.evidence_segment_count, 0) as evidence_segment_count
from public.engagements e
left join public.engagement_economy_v eco on eco.engagement_id = e.id
left join lateral (
  select jsonb_build_object(
    'party_id', p.id,
    'name', p.name,
    'organization_name', p.organization_name,
    'email', p.email,
    'phone', p.phone,
    'role', ep.role
  ) as primary_customer
  from public.engagement_parties ep
  join public.parties p on p.id = ep.party_id
  where ep.engagement_id = e.id
    and ep.role = any(array['CUSTOMER','PRIMARY_CONTACT','BUYER','DECISION_MAKER'])
  order by case ep.role
    when 'CUSTOMER' then 1
    when 'PRIMARY_CONTACT' then 2
    when 'BUYER' then 3
    else 4
  end, ep.is_primary desc, ep.created_at
  limit 1
) pc on true
left join lateral (
  select jsonb_build_object(
    'id', l.id,
    'name', l.name,
    'address', l.address,
    'city', l.city,
    'region', l.region,
    'postal_code', l.postal_code,
    'certainty_state', el.certainty_state
  ) as venue
  from public.engagement_locations el
  join public.locations l on l.id = el.location_id
  where el.engagement_id = e.id and el.role = 'VENUE'
  order by el.is_primary desc, el.created_at
  limit 1
) cv on true
left join lateral (
  select jsonb_build_object(
    'id', w.id,
    'title', w.title,
    'action_type', w.action_type,
    'status', w.status,
    'priority', w.priority,
    'due_at', w.due_at,
    'due_date', w.due_date,
    'waiting_on', w.waiting_on,
    'why_now', w.why_now,
    'owner_member_id', w.owner_member_id
  ) as next_work
  from public.work_items w
  where w.engagement_id = e.id
    and w.status = any(array['OPEN','WAITING','BLOCKED'])
  order by case w.priority
    when 'NOW' then 1
    when 'SOON' then 2
    when 'NORMAL' then 3
    else 4
  end,
  coalesce(w.due_at, w.due_date::timestamptz, 'infinity'::timestamptz),
  w.created_at
  limit 1
) nw on true
left join lateral (
  select jsonb_build_object(
    'id', s.id,
    'schedule_type', s.schedule_type,
    'label', s.label,
    'start_at', s.start_at,
    'end_at', s.end_at,
    'start_date', s.start_date,
    'end_date', s.end_date,
    'time_state', s.time_state,
    'location_name', coalesce(l.name, s.location_name),
    'location_address', coalesce(l.address, s.location_address)
  ) as next_schedule
  from public.engagement_schedule_items s
  left join public.locations l on l.id = s.location_id
  where s.engagement_id = e.id
    and coalesce(s.end_at::date, s.end_date, s.start_at::date, s.start_date) >= current_date
  order by coalesce(s.start_at, s.start_date::timestamptz, 'infinity'::timestamptz)
  limit 1
) ns on true
left join lateral (
  select count(*)::int as open_work_count
  from public.work_items w
  where w.engagement_id = e.id and w.status = any(array['OPEN','WAITING','BLOCKED'])
) wc on true
left join lateral (
  select count(*)::int as active_assignment_count
  from public.engagement_assignments a
  where a.engagement_id = e.id and a.assignment_state = any(array['REQUESTED','CONFIRMED'])
) ac on true
left join lateral (
  select count(*)::int as active_commitment_count
  from public.resource_commitments rc
  where rc.engagement_id = e.id and rc.commitment_state = any(array['TENTATIVE','CONFIRMED'])
) cc on true
left join lateral (
  select count(*)::int as evidence_segment_count
  from public.source_artifact_segments sas
  where sas.engagement_id = e.id
) ev on true
where e.archived_at is null;

comment on view public.engagement_summary_v is
  'Stable internal frontend summary contract. Canonical location/work/economy are projected explicitly; legacy venue is labeled only as compatibility fallback.';

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
    when r.quantity_state <> 'VERIFIED' or r.sourcing_model = 'UNKNOWN' then 'CAPABILITY_TRUTH_PARTIAL'
    when coalesce(ur.represented_actual_usage_count, 0) = 0 then 'ACTUAL_USE_NOT_YET_OBSERVED'
    else 'OPERATING_EVIDENCE_PRESENT'
  end as capability_evidence_state
from public.resources r
left join commitment_rollup cr on cr.resource_id = r.id
left join usage_rollup ur on ur.resource_id = r.id
left join commercial_rollup comr on comr.resource_id = r.id
left join cost_rollup costr on costr.resource_id = r.id
left join public.resource_economy_current_v econ on econ.resource_id = r.id
where r.archived_at is null and r.active = true;

comment on view public.capability_summary_v is
  'Stable internal capability read contract. Commercial support, commitments, actual use, direct-cost evidence, and asset economics remain explicitly distinguished.';
