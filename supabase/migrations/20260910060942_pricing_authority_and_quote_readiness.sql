-- Pricing authority and quote-readiness kernel.
-- Historical observations and current references remain evidence; only APPROVED pricing_rules are authority.

create table public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  status text not null default 'DRAFT' check (status = any (array['DRAFT'::text, 'APPROVED'::text, 'RETIRED'::text])),
  rule_kind text not null default 'BASE_RATE' check (rule_kind = any (array['BASE_RATE'::text, 'MINIMUM'::text, 'DISCOUNT'::text, 'SURCHARGE'::text, 'LOGISTICS'::text, 'OTHER'::text])),
  scope_type text not null check (scope_type = any (array['RESOURCE'::text, 'CATEGORY'::text, 'ENGAGEMENT_TYPE'::text, 'GENERAL'::text])),
  resource_id uuid references public.resources(id) on delete cascade,
  category text,
  engagement_type text check (engagement_type is null or engagement_type = any (array['EVENT'::text, 'LONG_TERM_RENTAL'::text, 'INSTALLATION'::text, 'EQUIPMENT_SALE'::text, 'SERVICE'::text, 'OTHER'::text])),
  rate_type text not null check (rate_type = any (array['ONE_DAY'::text, 'THREE_DAY'::text, 'WEEK'::text, 'MONTH'::text, 'FLAT'::text, 'PER_HOUR'::text, 'PER_DAY'::text, 'PER_UNIT'::text, 'MILEAGE'::text, 'PERCENT'::text, 'OTHER'::text])),
  amount numeric,
  percentage numeric,
  currency text not null default 'USD',
  effective_from date,
  effective_through date,
  requires_approval boolean not null default false,
  rationale text,
  notes text,
  source_artifact_id uuid references public.source_artifacts(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pricing_rules_date_order check (effective_from is null or effective_through is null or effective_through >= effective_from),
  constraint pricing_rules_approval_shape check (status <> 'APPROVED' or (approved_by is not null and approved_at is not null)),
  constraint pricing_rules_scope_shape check (
    (scope_type = 'RESOURCE' and resource_id is not null and category is null and engagement_type is null)
    or (scope_type = 'CATEGORY' and resource_id is null and category is not null and engagement_type is null)
    or (scope_type = 'ENGAGEMENT_TYPE' and resource_id is null and category is null and engagement_type is not null)
    or (scope_type = 'GENERAL' and resource_id is null and category is null and engagement_type is null)
  ),
  constraint pricing_rules_value_shape check (
    (rate_type = 'PERCENT' and percentage is not null and amount is null)
    or (rate_type <> 'PERCENT' and amount is not null and percentage is null)
  )
);

create index pricing_rules_status_effective_idx on public.pricing_rules(status, effective_from, effective_through);
create index pricing_rules_resource_idx on public.pricing_rules(resource_id) where resource_id is not null;
create index pricing_rules_source_artifact_idx on public.pricing_rules(source_artifact_id) where source_artifact_id is not null;
create index pricing_rules_approved_by_idx on public.pricing_rules(approved_by) where approved_by is not null;
create index pricing_rules_created_by_idx on public.pricing_rules(created_by) where created_by is not null;

alter table public.pricing_rules enable row level security;

create policy pricing_rules_member_select on public.pricing_rules for select to authenticated using ((select private.is_app_member()));
create policy pricing_rules_member_insert on public.pricing_rules for insert to authenticated with check ((select private.is_app_member()));
create policy pricing_rules_member_update on public.pricing_rules for update to authenticated using ((select private.is_app_member())) with check ((select private.is_app_member()));
create policy pricing_rules_member_delete on public.pricing_rules for delete to authenticated using ((select private.is_app_member()));

revoke all on public.pricing_rules from anon;
grant all on public.pricing_rules to authenticated, service_role;

create or replace view public.pricing_rule_current_v
with (security_invoker = true)
as
select
  pr.*,
  case pr.scope_type
    when 'RESOURCE' then 1
    when 'CATEGORY' then 2
    when 'ENGAGEMENT_TYPE' then 3
    else 4
  end as scope_precedence
from public.pricing_rules pr
where pr.status = 'APPROVED'
  and (pr.effective_from is null or pr.effective_from <= current_date)
  and (pr.effective_through is null or pr.effective_through >= current_date);

create or replace view public.pricing_observations_v
with (security_invoker = true)
as
select
  l.id as commercial_line_id,
  d.id as commercial_document_id,
  d.engagement_id,
  e.name as engagement_name,
  e.event_start_date,
  d.document_type,
  d.document_state,
  d.transaction_type,
  d.document_date,
  d.signature_date,
  l.group_label,
  l.line_type,
  l.external_item_id,
  l.resource_id,
  r.name as resource_name,
  l.description,
  l.quantity,
  l.unit_price,
  l.line_total,
  d.currency,
  d.source_system,
  d.external_document_id,
  coalesce((l.metadata ->> 'gross_line_total')::numeric, l.line_total) as gross_line_total,
  coalesce(
    (l.metadata ->> 'effective_unit_price')::numeric,
    case when l.quantity is not null and l.quantity <> 0 then l.line_total / l.quantity else null end,
    l.unit_price
  ) as effective_unit_price,
  coalesce((l.metadata ->> 'line_discount_observed')::numeric, 0) as line_discount_observed,
  d.discount_total as document_discount_total,
  r.reference_price as current_reference_price,
  r.price_basis as current_reference_basis,
  r.price_state as current_reference_state,
  case
    when r.reference_price is not null
      and coalesce((l.metadata ->> 'effective_unit_price')::numeric, case when l.quantity is not null and l.quantity <> 0 then l.line_total / l.quantity else null end) is not null
    then coalesce((l.metadata ->> 'effective_unit_price')::numeric, case when l.quantity is not null and l.quantity <> 0 then l.line_total / l.quantity else null end) - r.reference_price
    else null
  end as effective_vs_reference_delta,
  case
    when r.reference_price is not null and r.reference_price <> 0
      and coalesce((l.metadata ->> 'effective_unit_price')::numeric, case when l.quantity is not null and l.quantity <> 0 then l.line_total / l.quantity else null end) is not null
    then coalesce((l.metadata ->> 'effective_unit_price')::numeric, case when l.quantity is not null and l.quantity <> 0 then l.line_total / l.quantity else null end) / r.reference_price
    else null
  end as effective_vs_reference_ratio,
  case
    when l.resource_id is null then 'UNLINKED_HISTORY'
    when r.price_state = 'VERIFIED_CURRENT' then 'HISTORY_PLUS_CURRENT_REFERENCE'
    when r.reference_price is not null then 'HISTORY_PLUS_LEGACY_REFERENCE'
    else 'HISTORY_ONLY'
  end as price_evidence_state,
  l.metadata ->> 'certainty_state' as extraction_certainty
from public.commercial_document_lines l
join public.commercial_documents d on d.id = l.commercial_document_id
join public.engagements e on e.id = d.engagement_id
left join public.resources r on r.id = l.resource_id
where l.unit_price is not null or l.line_total is not null;

create or replace view public.engagement_quote_line_candidates_v
with (security_invoker = true)
as
with current_plan as (
  select distinct on (fp.engagement_id)
    fp.id, fp.engagement_id, fp.plan_state, fp.snapshot_at
  from public.fulfillment_plans fp
  where fp.plan_state <> all (array['SUPERSEDED'::text, 'COMPLETE'::text])
  order by fp.engagement_id, fp.snapshot_at desc nulls last, fp.created_at desc
), hist as (
  select
    po.resource_id,
    count(*) filter (where po.effective_unit_price is not null and po.line_type <> 'DISCOUNT') as historical_observation_count,
    min(po.effective_unit_price) filter (where po.effective_unit_price is not null and po.line_type <> 'DISCOUNT') as historical_min_effective_unit,
    avg(po.effective_unit_price) filter (where po.effective_unit_price is not null and po.line_type <> 'DISCOUNT') as historical_avg_effective_unit,
    max(po.effective_unit_price) filter (where po.effective_unit_price is not null and po.line_type <> 'DISCOUNT') as historical_max_effective_unit
  from public.pricing_observations_v po
  where po.resource_id is not null
  group by po.resource_id
)
select
  e.id as engagement_id,
  e.engagement_number,
  e.name as engagement_name,
  e.engagement_type,
  e.commercial_state,
  e.commitment_state,
  cp.id as fulfillment_plan_id,
  fpl.id as fulfillment_line_id,
  fpl.sort_order,
  fpl.line_type as fulfillment_line_type,
  fpl.primary_category,
  fpl.subcategory,
  fpl.title,
  fpl.description,
  fpl.quantity,
  fpl.external_item_id,
  fpl.resource_id,
  r.name as resource_name,
  r.category as resource_category,
  r.resource_type,
  r.reference_price,
  r.price_basis as reference_price_basis,
  r.price_state as reference_price_state,
  coalesce(h.historical_observation_count, 0::bigint) as historical_observation_count,
  h.historical_min_effective_unit,
  h.historical_avg_effective_unit,
  h.historical_max_effective_unit,
  coalesce(ar.approved_rule_count, 0::bigint) as approved_rule_count,
  ar.approved_rules,
  case
    when fpl.line_type = 'PACKAGE_CHILD' then 'NON_PRICED_COMPONENT'
    when fpl.resource_id is null and coalesce(h.historical_observation_count, 0::bigint) = 0 then 'UNLINKED_SCOPE_REVIEW'
    when coalesce(ar.approved_rule_count, 0::bigint) > 0 then 'APPROVED_RULE_AVAILABLE'
    when r.reference_price is not null and r.price_state = 'VERIFIED_CURRENT' then 'CURRENT_REFERENCE_ONLY'
    when r.reference_price is not null then 'LEGACY_REFERENCE_ONLY'
    when coalesce(h.historical_observation_count, 0::bigint) > 0 then 'HISTORICAL_ONLY'
    else 'NO_PRICE_EVIDENCE'
  end as pricing_authority_state,
  coalesce(ar.approved_rule_count, 0::bigint) = 0 and fpl.line_type <> 'PACKAGE_CHILD' as requires_human_price_judgment
from public.engagements e
left join current_plan cp on cp.engagement_id = e.id
left join public.fulfillment_plan_lines fpl on fpl.fulfillment_plan_id = cp.id
left join public.resources r on r.id = fpl.resource_id
left join hist h on h.resource_id = fpl.resource_id
left join lateral (
  select
    count(*) as approved_rule_count,
    jsonb_agg(jsonb_build_object(
      'id', pr.id,
      'code', pr.code,
      'name', pr.name,
      'rule_kind', pr.rule_kind,
      'scope_type', pr.scope_type,
      'rate_type', pr.rate_type,
      'amount', pr.amount,
      'percentage', pr.percentage,
      'currency', pr.currency,
      'requires_approval', pr.requires_approval
    ) order by pr.scope_precedence, pr.code) as approved_rules
  from public.pricing_rule_current_v pr
  where pr.rule_kind = 'BASE_RATE'
    and (
      (pr.scope_type = 'RESOURCE' and pr.resource_id = fpl.resource_id)
      or (pr.scope_type = 'CATEGORY' and pr.category = coalesce(r.category, fpl.primary_category))
      or (pr.scope_type = 'ENGAGEMENT_TYPE' and pr.engagement_type = e.engagement_type)
      or pr.scope_type = 'GENERAL'
    )
) ar on true
where e.archived_at is null;

create or replace view public.engagement_quote_readiness_v
with (security_invoker = true)
as
with line_rollup as (
  select
    q.engagement_id,
    count(q.fulfillment_line_id) as scope_line_count,
    count(q.fulfillment_line_id) filter (where q.resource_id is not null) as resource_linked_line_count,
    count(q.fulfillment_line_id) filter (where q.approved_rule_count > 0) as lines_with_approved_rule,
    count(q.fulfillment_line_id) filter (where q.pricing_authority_state = 'CURRENT_REFERENCE_ONLY') as current_reference_only_lines,
    count(q.fulfillment_line_id) filter (where q.pricing_authority_state = 'LEGACY_REFERENCE_ONLY') as legacy_reference_only_lines,
    count(q.fulfillment_line_id) filter (where q.pricing_authority_state = 'HISTORICAL_ONLY') as historical_only_lines,
    count(q.fulfillment_line_id) filter (where q.pricing_authority_state = any (array['UNLINKED_SCOPE_REVIEW'::text, 'NO_PRICE_EVIDENCE'::text])) as no_authority_lines,
    count(q.fulfillment_line_id) filter (where q.requires_human_price_judgment) as human_price_judgment_lines,
    sum(coalesce(q.historical_observation_count, 0::bigint)) as historical_observation_count
  from public.engagement_quote_line_candidates_v q
  group by q.engagement_id
), current_quote as (
  select distinct on (cd.engagement_id)
    cd.engagement_id, cd.id, cd.document_state, cd.total, cd.external_document_id
  from public.commercial_documents cd
  where cd.document_type = 'QUOTE'
    and cd.document_state <> 'VOID'
    and not exists (
      select 1 from public.commercial_documents newer
      where newer.supersedes_document_id = cd.id and newer.document_state <> 'VOID'
    )
  order by cd.engagement_id, cd.version_no desc, cd.snapshot_at desc nulls last, cd.created_at desc
)
select
  e.id as engagement_id,
  e.engagement_number,
  e.name as engagement_name,
  e.engagement_type,
  e.commercial_state,
  e.commitment_state,
  e.event_start_date,
  coalesce(lr.scope_line_count, 0::bigint) as scope_line_count,
  coalesce(lr.resource_linked_line_count, 0::bigint) as resource_linked_line_count,
  coalesce(lr.lines_with_approved_rule, 0::bigint) as lines_with_approved_rule,
  coalesce(lr.current_reference_only_lines, 0::bigint) as current_reference_only_lines,
  coalesce(lr.legacy_reference_only_lines, 0::bigint) as legacy_reference_only_lines,
  coalesce(lr.historical_only_lines, 0::bigint) as historical_only_lines,
  coalesce(lr.no_authority_lines, 0::bigint) as no_authority_lines,
  coalesce(lr.human_price_judgment_lines, 0::bigint) as human_price_judgment_lines,
  coalesce(lr.historical_observation_count, 0::numeric) as historical_observation_count,
  cq.id as current_quote_id,
  cq.document_state as current_quote_state,
  cq.total as current_quote_total,
  cq.external_document_id as current_quote_external_id,
  case
    when coalesce(lr.scope_line_count, 0::bigint) = 0 then 'NEEDS_REQUIREMENTS'
    when coalesce(lr.human_price_judgment_lines, 0::bigint) = 0 then 'DRAFTABLE'
    when (coalesce(lr.current_reference_only_lines, 0::bigint) + coalesce(lr.legacy_reference_only_lines, 0::bigint) + coalesce(lr.historical_only_lines, 0::bigint)) > 0 then 'DRAFTABLE_WITH_REVIEW'
    else 'PRICING_REVIEW'
  end as readiness_state,
  case
    when coalesce(lr.scope_line_count, 0::bigint) = 0 then 'No represented fulfillment/scope lines are available for quote construction.'
    when coalesce(lr.human_price_judgment_lines, 0::bigint) = 0 then 'Represented scope has approved base-rate coverage. Quote construction can proceed subject to rule-specific approval flags and commercial review.'
    when coalesce(lr.current_reference_only_lines, 0::bigint) > 0 then 'Current reference prices exist for part of the scope, but reference evidence has not been promoted to approved pricing authority.'
    when coalesce(lr.historical_only_lines, 0::bigint) > 0 then 'Historical price observations exist, but history is evidence rather than current authority.'
    else 'Represented scope contains pricing gaps that require human commercial judgment.'
  end as readiness_reason
from public.engagements e
left join line_rollup lr on lr.engagement_id = e.id
left join current_quote cq on cq.engagement_id = e.id
where e.archived_at is null;

revoke all on public.pricing_rule_current_v, public.pricing_observations_v, public.engagement_quote_line_candidates_v, public.engagement_quote_readiness_v from anon;
grant select on public.pricing_rule_current_v, public.pricing_observations_v, public.engagement_quote_line_candidates_v, public.engagement_quote_readiness_v to authenticated, service_role;
