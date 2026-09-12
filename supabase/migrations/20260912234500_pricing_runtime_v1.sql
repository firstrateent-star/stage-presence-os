-- Stage Presence Operational Core: Pricing Runtime v1.
-- DRAFT QUOTE is the working commercial pricing object.
-- Price Book policy/evidence remains separate from the customer-facing proposed sale.

alter table public.commercial_document_lines
  add column if not exists fulfillment_line_id uuid references public.fulfillment_plan_lines(id) on delete set null,
  add column if not exists pricing_rule_id uuid references public.pricing_rules(id) on delete set null,
  add column if not exists policy_amount_snapshot numeric,
  add column if not exists policy_percentage_snapshot numeric,
  add column if not exists policy_price_position text,
  add column if not exists policy_billing_basis text,
  add column if not exists policy_duration_value numeric,
  add column if not exists policy_duration_unit text,
  add column if not exists policy_total_snapshot numeric,
  add column if not exists pricing_authority_state text,
  add column if not exists price_adjustment_reason text;

alter table public.commercial_document_lines
  drop constraint if exists commercial_document_lines_policy_amount_snapshot_check,
  drop constraint if exists commercial_document_lines_policy_percentage_snapshot_check,
  drop constraint if exists commercial_document_lines_policy_price_position_check,
  drop constraint if exists commercial_document_lines_policy_billing_basis_check,
  drop constraint if exists commercial_document_lines_policy_duration_unit_check,
  drop constraint if exists commercial_document_lines_policy_duration_shape,
  drop constraint if exists commercial_document_lines_policy_total_snapshot_check,
  drop constraint if exists commercial_document_lines_pricing_authority_state_check;

alter table public.commercial_document_lines
  add constraint commercial_document_lines_policy_amount_snapshot_check
    check (policy_amount_snapshot is null or policy_amount_snapshot >= 0),
  add constraint commercial_document_lines_policy_percentage_snapshot_check
    check (policy_percentage_snapshot is null or policy_percentage_snapshot >= 0),
  add constraint commercial_document_lines_policy_price_position_check
    check (policy_price_position is null or policy_price_position in ('STANDARD','ECONOMIC_FLOOR','COMMERCIAL_FLOOR','TARGET','VALUE_REFERENCE')),
  add constraint commercial_document_lines_policy_billing_basis_check
    check (policy_billing_basis is null or policy_billing_basis in ('FLAT','PER_UNIT','PER_HOUR','PER_DAY','PER_MILE','PERCENT','OTHER')),
  add constraint commercial_document_lines_policy_duration_unit_check
    check (policy_duration_unit is null or policy_duration_unit in ('HOUR','DAY','WEEK','MONTH','EVENT')),
  add constraint commercial_document_lines_policy_duration_shape
    check (
      (policy_duration_value is null and policy_duration_unit is null)
      or (policy_duration_value is not null and policy_duration_value > 0 and policy_duration_unit is not null)
    ),
  add constraint commercial_document_lines_policy_total_snapshot_check
    check (policy_total_snapshot is null or policy_total_snapshot >= 0),
  add constraint commercial_document_lines_pricing_authority_state_check
    check (pricing_authority_state is null or pricing_authority_state in ('APPROVED_AUTHORITY','DRAFT_CANDIDATE','MANUAL_PRICE','HISTORICAL_EVIDENCE','OTHER'));

create index if not exists commercial_document_lines_fulfillment_line_idx
  on public.commercial_document_lines(fulfillment_line_id)
  where fulfillment_line_id is not null;

create index if not exists commercial_document_lines_pricing_rule_idx
  on public.commercial_document_lines(pricing_rule_id)
  where pricing_rule_id is not null;

-- Enriched customer-price line contract. The customer-facing unit/line price is the
-- proposal/sale value; policy snapshots explain the rule/evidence that informed it.
create or replace view public.commercial_line_pricing_v
with (security_invoker = true)
as
with cost_rollup as (
  select
    ci.commercial_line_id,
    count(*) filter (where ci.cost_state <> 'CANCELLED') as represented_cost_item_count,
    sum(ci.amount) filter (where ci.cost_state = 'ESTIMATE') as estimated_direct_cost,
    sum(ci.amount) filter (where ci.cost_state = 'COMMITTED') as committed_direct_cost,
    sum(ci.amount) filter (where ci.cost_state = 'ACTUAL') as actual_direct_cost
  from public.engagement_cost_items ci
  where ci.commercial_line_id is not null
  group by ci.commercial_line_id
)
select
  l.id as commercial_line_id,
  d.id as commercial_document_id,
  d.engagement_id,
  e.engagement_number,
  e.name as engagement_name,
  d.document_type,
  d.document_state,
  d.transaction_type,
  d.version_no,
  d.currency,
  l.sort_order,
  l.line_type,
  l.group_label,
  l.description,
  l.detail_text,
  l.quantity,
  l.unit_price,
  l.line_total,
  l.resource_id,
  r.name as resource_name,
  l.fulfillment_line_id,
  fpl.title as fulfillment_line_title,
  l.pricing_rule_id,
  pr.code as pricing_rule_code,
  pr.name as pricing_rule_name,
  pr.status as current_pricing_rule_status,
  pr.rule_kind as current_rule_kind,
  pr.price_position as current_rule_price_position,
  pr.amount as current_rule_amount,
  pr.percentage as current_rule_percentage,
  l.policy_amount_snapshot,
  l.policy_percentage_snapshot,
  l.policy_price_position,
  l.policy_billing_basis,
  l.policy_duration_value,
  l.policy_duration_unit,
  l.policy_total_snapshot,
  l.pricing_authority_state,
  l.price_adjustment_reason,
  case
    when l.policy_total_snapshot is null or l.line_total is null then null
    else l.line_total - l.policy_total_snapshot
  end as price_variance_from_policy,
  case
    when l.policy_total_snapshot is null or l.policy_total_snapshot = 0 or l.line_total is null then null
    else (l.line_total - l.policy_total_snapshot) / l.policy_total_snapshot
  end as price_variance_ratio,
  coalesce(cr.represented_cost_item_count,0::bigint) as represented_cost_item_count,
  cr.estimated_direct_cost,
  cr.committed_direct_cost,
  cr.actual_direct_cost,
  case
    when l.line_total is null or cr.estimated_direct_cost is null then null
    else l.line_total - cr.estimated_direct_cost
  end as estimated_line_contribution_observed,
  case
    when l.pricing_rule_id is null then 'MANUAL_PRICE'
    when l.pricing_authority_state = 'APPROVED_AUTHORITY' then 'APPROVED_POLICY_USED'
    when l.pricing_authority_state = 'DRAFT_CANDIDATE' then 'DRAFT_POLICY_USED'
    else 'POLICY_EVIDENCE_USED'
  end as pricing_basis_state,
  l.metadata,
  l.created_at
from public.commercial_document_lines l
join public.commercial_documents d on d.id = l.commercial_document_id
join public.engagements e on e.id = d.engagement_id
left join public.resources r on r.id = l.resource_id
left join public.fulfillment_plan_lines fpl on fpl.id = l.fulfillment_line_id
left join public.pricing_rules pr on pr.id = l.pricing_rule_id
left join cost_rollup cr on cr.commercial_line_id = l.id
where e.archived_at is null;

-- Scope-level pricing coverage. This mirrors Cost Runtime coverage but keeps policy
-- availability separate from an actual proposed customer price.
create or replace view public.engagement_scope_price_coverage_v
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
), current_quote as (
  select distinct on (d.engagement_id)
    d.id,
    d.engagement_id,
    d.document_state,
    d.version_no,
    d.created_at
  from public.commercial_documents d
  where d.document_type = 'QUOTE'
    and d.document_state <> 'VOID'
    and not exists (
      select 1 from public.commercial_documents newer
      where newer.supersedes_document_id = d.id and newer.document_state <> 'VOID'
    )
  order by d.engagement_id, d.version_no desc, d.created_at desc
), quoted as (
  select
    l.fulfillment_line_id,
    count(*) as quote_line_count,
    sum(l.line_total) as quoted_line_total,
    count(*) filter (where l.pricing_rule_id is not null) as policy_linked_line_count,
    count(*) filter (where l.pricing_authority_state = 'APPROVED_AUTHORITY') as approved_policy_line_count,
    count(*) filter (where l.pricing_authority_state = 'DRAFT_CANDIDATE') as draft_policy_line_count
  from current_quote q
  join public.commercial_document_lines l on l.commercial_document_id = q.id
  where l.fulfillment_line_id is not null
  group by l.fulfillment_line_id
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
  coalesce(qd.quote_line_count,0::bigint) as quote_line_count,
  qd.quoted_line_total,
  coalesce(qd.policy_linked_line_count,0::bigint) as policy_linked_line_count,
  coalesce(qd.approved_policy_line_count,0::bigint) as approved_policy_line_count,
  coalesce(qd.draft_policy_line_count,0::bigint) as draft_policy_line_count,
  coalesce(rule_match.approved_rule_count,0::bigint) as approved_rule_count,
  coalesce(rule_match.draft_rule_count,0::bigint) as draft_rule_count,
  rule_match.best_pricing_rule_id,
  rule_match.best_pricing_rule_name,
  rule_match.best_rule_status,
  rule_match.best_price_position,
  rule_match.best_rule_amount,
  rule_match.best_rule_percentage,
  rule_match.best_billing_basis,
  rule_match.best_duration_value,
  rule_match.best_duration_unit,
  case
    when fpl.line_type = 'PACKAGE_CHILD' then 'PACKAGE_COMPONENT'
    when coalesce(qd.quote_line_count,0::bigint) > 0 then 'PRICE_REPRESENTED'
    when coalesce(rule_match.approved_rule_count,0::bigint) > 0 then 'APPROVED_PRICE_AVAILABLE'
    when coalesce(rule_match.draft_rule_count,0::bigint) > 0 then 'DRAFT_PRICE_AVAILABLE'
    when fpl.resource_id is null then 'NEEDS_MANUAL_PRICE_DECISION'
    else 'NEEDS_PRICE_DECISION'
  end as price_coverage_state,
  fpl.line_type <> 'PACKAGE_CHILD'
    and coalesce(qd.quote_line_count,0::bigint) = 0 as price_decision_required
from public.engagements e
join current_plan cp on cp.engagement_id = e.id
join public.fulfillment_plan_lines fpl on fpl.fulfillment_plan_id = cp.id
left join public.resources r on r.id = fpl.resource_id
left join quoted qd on qd.fulfillment_line_id = fpl.id
left join lateral (
  select
    count(*) filter (
      where pr.status = 'APPROVED'
        and (pr.effective_from is null or pr.effective_from <= current_date)
        and (pr.effective_through is null or pr.effective_through >= current_date)
    ) as approved_rule_count,
    count(*) filter (where pr.status = 'DRAFT') as draft_rule_count,
    (array_agg(pr.id order by
      case pr.status when 'APPROVED' then 1 when 'DRAFT' then 2 else 3 end,
      case pr.price_position when 'STANDARD' then 1 when 'TARGET' then 2 when 'COMMERCIAL_FLOOR' then 3 when 'ECONOMIC_FLOOR' then 4 else 5 end,
      case pr.scope_type when 'RESOURCE' then 1 when 'CATEGORY' then 2 when 'ENGAGEMENT_TYPE' then 3 when 'GENERAL' then 4 else 5 end,
      pr.updated_at desc
    ))[1] as best_pricing_rule_id,
    (array_agg(pr.name order by
      case pr.status when 'APPROVED' then 1 when 'DRAFT' then 2 else 3 end,
      case pr.price_position when 'STANDARD' then 1 when 'TARGET' then 2 when 'COMMERCIAL_FLOOR' then 3 when 'ECONOMIC_FLOOR' then 4 else 5 end,
      case pr.scope_type when 'RESOURCE' then 1 when 'CATEGORY' then 2 when 'ENGAGEMENT_TYPE' then 3 when 'GENERAL' then 4 else 5 end,
      pr.updated_at desc
    ))[1] as best_pricing_rule_name,
    (array_agg(pr.status order by
      case pr.status when 'APPROVED' then 1 when 'DRAFT' then 2 else 3 end,
      case pr.price_position when 'STANDARD' then 1 when 'TARGET' then 2 when 'COMMERCIAL_FLOOR' then 3 when 'ECONOMIC_FLOOR' then 4 else 5 end,
      case pr.scope_type when 'RESOURCE' then 1 when 'CATEGORY' then 2 when 'ENGAGEMENT_TYPE' then 3 when 'GENERAL' then 4 else 5 end,
      pr.updated_at desc
    ))[1] as best_rule_status,
    (array_agg(pr.price_position order by
      case pr.status when 'APPROVED' then 1 when 'DRAFT' then 2 else 3 end,
      case pr.price_position when 'STANDARD' then 1 when 'TARGET' then 2 when 'COMMERCIAL_FLOOR' then 3 when 'ECONOMIC_FLOOR' then 4 else 5 end,
      case pr.scope_type when 'RESOURCE' then 1 when 'CATEGORY' then 2 when 'ENGAGEMENT_TYPE' then 3 when 'GENERAL' then 4 else 5 end,
      pr.updated_at desc
    ))[1] as best_price_position,
    (array_agg(pr.amount order by
      case pr.status when 'APPROVED' then 1 when 'DRAFT' then 2 else 3 end,
      case pr.price_position when 'STANDARD' then 1 when 'TARGET' then 2 when 'COMMERCIAL_FLOOR' then 3 when 'ECONOMIC_FLOOR' then 4 else 5 end,
      case pr.scope_type when 'RESOURCE' then 1 when 'CATEGORY' then 2 when 'ENGAGEMENT_TYPE' then 3 when 'GENERAL' then 4 else 5 end,
      pr.updated_at desc
    ))[1] as best_rule_amount,
    (array_agg(pr.percentage order by
      case pr.status when 'APPROVED' then 1 when 'DRAFT' then 2 else 3 end,
      case pr.price_position when 'STANDARD' then 1 when 'TARGET' then 2 when 'COMMERCIAL_FLOOR' then 3 when 'ECONOMIC_FLOOR' then 4 else 5 end,
      case pr.scope_type when 'RESOURCE' then 1 when 'CATEGORY' then 2 when 'ENGAGEMENT_TYPE' then 3 when 'GENERAL' then 4 else 5 end,
      pr.updated_at desc
    ))[1] as best_rule_percentage,
    (array_agg(coalesce(pr.billing_basis,
      case pr.rate_type when 'PER_UNIT' then 'PER_UNIT' when 'PER_HOUR' then 'PER_HOUR' when 'PER_DAY' then 'PER_DAY' when 'MILEAGE' then 'PER_MILE' when 'PERCENT' then 'PERCENT' else 'FLAT' end)
      order by
      case pr.status when 'APPROVED' then 1 when 'DRAFT' then 2 else 3 end,
      case pr.price_position when 'STANDARD' then 1 when 'TARGET' then 2 when 'COMMERCIAL_FLOOR' then 3 when 'ECONOMIC_FLOOR' then 4 else 5 end,
      case pr.scope_type when 'RESOURCE' then 1 when 'CATEGORY' then 2 when 'ENGAGEMENT_TYPE' then 3 when 'GENERAL' then 4 else 5 end,
      pr.updated_at desc
    ))[1] as best_billing_basis,
    (array_agg(coalesce(pr.duration_value,
      case pr.rate_type when 'ONE_DAY' then 1::numeric when 'THREE_DAY' then 3::numeric when 'WEEK' then 1::numeric when 'MONTH' then 1::numeric else null::numeric end)
      order by
      case pr.status when 'APPROVED' then 1 when 'DRAFT' then 2 else 3 end,
      case pr.price_position when 'STANDARD' then 1 when 'TARGET' then 2 when 'COMMERCIAL_FLOOR' then 3 when 'ECONOMIC_FLOOR' then 4 else 5 end,
      case pr.scope_type when 'RESOURCE' then 1 when 'CATEGORY' then 2 when 'ENGAGEMENT_TYPE' then 3 when 'GENERAL' then 4 else 5 end,
      pr.updated_at desc
    ))[1] as best_duration_value,
    (array_agg(coalesce(pr.duration_unit,
      case pr.rate_type when 'ONE_DAY' then 'DAY' when 'THREE_DAY' then 'DAY' when 'WEEK' then 'WEEK' when 'MONTH' then 'MONTH' else null::text end)
      order by
      case pr.status when 'APPROVED' then 1 when 'DRAFT' then 2 else 3 end,
      case pr.price_position when 'STANDARD' then 1 when 'TARGET' then 2 when 'COMMERCIAL_FLOOR' then 3 when 'ECONOMIC_FLOOR' then 4 else 5 end,
      case pr.scope_type when 'RESOURCE' then 1 when 'CATEGORY' then 2 when 'ENGAGEMENT_TYPE' then 3 when 'GENERAL' then 4 else 5 end,
      pr.updated_at desc
    ))[1] as best_duration_unit
  from public.pricing_rules pr
  where pr.status <> 'RETIRED'
    and pr.rule_kind = 'BASE_RATE'
    and (
      (pr.scope_type = 'RESOURCE' and pr.resource_id = fpl.resource_id)
      or (pr.scope_type = 'CATEGORY' and pr.category = coalesce(r.category, fpl.primary_category))
      or (pr.scope_type = 'ENGAGEMENT_TYPE' and pr.engagement_type = e.engagement_type)
      or pr.scope_type = 'GENERAL'
    )
) rule_match on true
where e.archived_at is null;

-- Engagement-level commercial decision surface. Contribution is only promoted to
-- a complete projection when the cost scope is fully represented.
create or replace view public.engagement_pricing_position_v
with (security_invoker = true)
as
with current_quote as (
  select distinct on (d.engagement_id)
    d.*
  from public.commercial_documents d
  where d.document_type = 'QUOTE'
    and d.document_state <> 'VOID'
    and not exists (
      select 1 from public.commercial_documents newer
      where newer.supersedes_document_id = d.id and newer.document_state <> 'VOID'
    )
  order by d.engagement_id, d.version_no desc, d.created_at desc
), quote_rollup as (
  select
    q.engagement_id,
    q.id as quote_document_id,
    q.document_state as quote_state,
    q.transaction_type,
    q.version_no as quote_version,
    coalesce(q.grand_total,q.total,sum(l.line_total)) as quoted_total,
    count(l.id) as quote_line_count,
    count(l.id) filter (where l.pricing_rule_id is not null) as policy_linked_line_count,
    count(l.id) filter (where l.pricing_authority_state = 'APPROVED_AUTHORITY') as approved_policy_line_count,
    count(l.id) filter (where l.pricing_authority_state = 'DRAFT_CANDIDATE') as draft_policy_line_count,
    count(l.id) filter (where l.pricing_rule_id is null) as manual_price_line_count,
    count(l.id) filter (where l.price_adjustment_reason is not null) as adjusted_price_line_count,
    sum(l.policy_total_snapshot) filter (where l.policy_total_snapshot is not null) as represented_policy_total
  from current_quote q
  left join public.commercial_document_lines l on l.commercial_document_id = q.id
  group by q.engagement_id,q.id,q.document_state,q.transaction_type,q.version_no,q.grand_total,q.total
), scope_rollup as (
  select
    engagement_id,
    count(*) filter (where fulfillment_line_type <> 'PACKAGE_CHILD') as scope_line_count,
    count(*) filter (where fulfillment_line_type <> 'PACKAGE_CHILD' and quote_line_count > 0) as scope_lines_with_price,
    count(*) filter (where price_decision_required) as price_decision_gap_count,
    count(*) filter (where price_coverage_state = 'APPROVED_PRICE_AVAILABLE') as approved_price_available_count,
    count(*) filter (where price_coverage_state = 'DRAFT_PRICE_AVAILABLE') as draft_price_available_count
  from public.engagement_scope_price_coverage_v
  group by engagement_id
)
select
  e.id as engagement_id,
  e.engagement_number,
  e.name as engagement_name,
  e.engagement_type,
  e.commercial_state,
  e.commitment_state,
  qr.quote_document_id,
  qr.quote_state,
  qr.transaction_type,
  qr.quote_version,
  qr.quoted_total,
  coalesce(qr.quote_line_count,0::bigint) as quote_line_count,
  coalesce(qr.policy_linked_line_count,0::bigint) as policy_linked_line_count,
  coalesce(qr.approved_policy_line_count,0::bigint) as approved_policy_line_count,
  coalesce(qr.draft_policy_line_count,0::bigint) as draft_policy_line_count,
  coalesce(qr.manual_price_line_count,0::bigint) as manual_price_line_count,
  coalesce(qr.adjusted_price_line_count,0::bigint) as adjusted_price_line_count,
  qr.represented_policy_total,
  coalesce(sr.scope_line_count,0::bigint) as scope_line_count,
  coalesce(sr.scope_lines_with_price,0::bigint) as scope_lines_with_price,
  coalesce(sr.price_decision_gap_count,0::bigint) as price_decision_gap_count,
  coalesce(sr.approved_price_available_count,0::bigint) as approved_price_available_count,
  coalesce(sr.draft_price_available_count,0::bigint) as draft_price_available_count,
  ep.estimate_item_count,
  ep.estimated_direct_cost,
  ep.scope_lines_with_cost,
  ep.cost_decision_gap_count,
  ep.estimate_coverage_state,
  case
    when qr.quoted_total is null or ep.estimate_item_count = 0 then null
    else qr.quoted_total - ep.estimated_direct_cost
  end as partial_projected_contribution_observed,
  case
    when ep.estimate_coverage_state = 'COST_SCOPE_REPRESENTED' and qr.quoted_total is not null
      then qr.quoted_total - ep.estimated_direct_cost
    else null
  end as projected_contribution,
  case
    when qr.quoted_total is null or qr.quoted_total = 0 or ep.estimate_item_count = 0 then null
    else (qr.quoted_total - ep.estimated_direct_cost) / qr.quoted_total
  end as partial_projected_margin_ratio_observed,
  case
    when ep.estimate_coverage_state = 'COST_SCOPE_REPRESENTED' and qr.quoted_total is not null and qr.quoted_total <> 0
      then (qr.quoted_total - ep.estimated_direct_cost) / qr.quoted_total
    else null
  end as projected_margin_ratio,
  case
    when qr.quote_document_id is null then 'PRICING_NOT_STARTED'
    when coalesce(sr.price_decision_gap_count,0::bigint) > 0 then 'PRICE_SCOPE_INCOMPLETE'
    when ep.estimate_item_count = 0 then 'PRICE_ONLY_NO_COST_ESTIMATE'
    when ep.estimate_coverage_state <> 'COST_SCOPE_REPRESENTED' then 'PRICE_WITH_PARTIAL_COST'
    when coalesce(qr.draft_policy_line_count,0::bigint) > 0 then 'DRAFT_POLICY_REVIEW_REQUIRED'
    when qr.quote_state = 'DRAFT' then 'READY_FOR_COMMERCIAL_REVIEW'
    when qr.quote_state in ('SENT','UNSIGNED') then 'QUOTE_OUT'
    when qr.quote_state in ('SIGNED','PARTIALLY_PAID','PAID') then 'ACCEPTED_COMMERCIAL'
    else 'PRICING_REVIEW'
  end as pricing_readiness_state,
  case
    when qr.quote_line_count is null or qr.quote_line_count = 0 then 'NO_PRICING_BASIS'
    when qr.approved_policy_line_count = qr.quote_line_count then 'APPROVED_POLICY_ONLY'
    when qr.draft_policy_line_count > 0 and qr.approved_policy_line_count > 0 then 'MIXED_POLICY_AUTHORITY'
    when qr.draft_policy_line_count > 0 then 'DRAFT_POLICY_PRESENT'
    when qr.manual_price_line_count = qr.quote_line_count then 'MANUAL_PRICING_ONLY'
    else 'MIXED_PRICING_BASIS'
  end as pricing_authority_coverage_state
from public.engagements e
left join quote_rollup qr on qr.engagement_id = e.id
left join scope_rollup sr on sr.engagement_id = e.id
left join public.engagement_estimate_position_v ep on ep.engagement_id = e.id
where e.archived_at is null;

revoke all on public.commercial_line_pricing_v from anon, authenticated;
revoke all on public.engagement_scope_price_coverage_v from anon, authenticated;
revoke all on public.engagement_pricing_position_v from anon, authenticated;

grant select on public.commercial_line_pricing_v to authenticated, service_role;
grant select on public.engagement_scope_price_coverage_v to authenticated, service_role;
grant select on public.engagement_pricing_position_v to authenticated, service_role;
