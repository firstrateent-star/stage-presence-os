-- Package-child state is stored in fulfillment_plan_lines.metadata.is_child.
-- Keep package components visible as scope without treating them as independent pricing decisions.

create or replace view public.engagement_quote_line_candidates_v
with (security_invoker = true)
as
with current_plan as (
  select distinct on (fp.engagement_id)
    fp.id,
    fp.engagement_id,
    fp.plan_state,
    fp.snapshot_at
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
    when fpl.metadata @> '{"is_child": true}'::jsonb then 'NON_PRICED_COMPONENT'::text
    when fpl.resource_id is null and coalesce(h.historical_observation_count, 0::bigint) = 0 then 'UNLINKED_SCOPE_REVIEW'::text
    when coalesce(ar.approved_rule_count, 0::bigint) > 0 then 'APPROVED_RULE_AVAILABLE'::text
    when r.reference_price is not null and r.price_state = 'VERIFIED_CURRENT'::text then 'CURRENT_REFERENCE_ONLY'::text
    when r.reference_price is not null then 'LEGACY_REFERENCE_ONLY'::text
    when coalesce(h.historical_observation_count, 0::bigint) > 0 then 'HISTORICAL_ONLY'::text
    else 'NO_PRICE_EVIDENCE'::text
  end as pricing_authority_state,
  coalesce(ar.approved_rule_count, 0::bigint) = 0
    and not (fpl.metadata @> '{"is_child": true}'::jsonb) as requires_human_price_judgment
from public.engagements e
left join current_plan cp on cp.engagement_id = e.id
left join public.fulfillment_plan_lines fpl on fpl.fulfillment_plan_id = cp.id
left join public.resources r on r.id = fpl.resource_id
left join hist h on h.resource_id = fpl.resource_id
left join lateral (
  select
    count(*) as approved_rule_count,
    jsonb_agg(
      jsonb_build_object(
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
      ) order by pr.scope_precedence, pr.code
    ) as approved_rules
  from public.pricing_rule_current_v pr
  where pr.rule_kind = 'BASE_RATE'::text
    and (
      (pr.scope_type = 'RESOURCE'::text and pr.resource_id = fpl.resource_id)
      or (pr.scope_type = 'CATEGORY'::text and pr.category = coalesce(r.category, fpl.primary_category))
      or (pr.scope_type = 'ENGAGEMENT_TYPE'::text and pr.engagement_type = e.engagement_type)
      or pr.scope_type = 'GENERAL'::text
    )
) ar on true
where e.archived_at is null;

revoke all on public.engagement_quote_line_candidates_v from anon;
grant select on public.engagement_quote_line_candidates_v to authenticated, service_role;
