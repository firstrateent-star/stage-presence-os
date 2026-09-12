-- Stage Presence Operational Core: Price Book / Cost Book / Estimate read contracts v1.

create or replace view public.price_book_v
with (security_invoker = true)
as
with historical as (
  select
    po.resource_id,
    count(*) filter (where po.effective_unit_price is not null and po.line_type <> 'DISCOUNT') as observation_count,
    count(*) filter (where po.effective_unit_price = 0 and po.line_type <> 'DISCOUNT') as zero_observation_count,
    count(*) filter (where po.effective_unit_price > 0 and po.line_type <> 'DISCOUNT') as positive_observation_count,
    min(po.effective_unit_price) filter (where po.effective_unit_price > 0 and po.line_type <> 'DISCOUNT') as positive_min_price,
    avg(po.effective_unit_price) filter (where po.effective_unit_price > 0 and po.line_type <> 'DISCOUNT') as positive_avg_price,
    max(po.effective_unit_price) filter (where po.effective_unit_price > 0 and po.line_type <> 'DISCOUNT') as positive_max_price
  from public.pricing_observations_v po
  where po.resource_id is not null
  group by po.resource_id
), rule_rows as (
  select
    pr.id as pricing_rule_id,
    'RULE'::text as entry_kind,
    pr.code,
    pr.name,
    pr.status,
    pr.rule_kind,
    pr.price_position,
    pr.scope_type,
    pr.resource_id,
    pr.role_code,
    pr.category,
    pr.engagement_type,
    r.name as resource_name,
    coalesce(
      r.name,
      case when pr.scope_type = 'ROLE' then pr.role_code end,
      case when pr.scope_type = 'CATEGORY' then pr.category end,
      case when pr.scope_type = 'ENGAGEMENT_TYPE' then pr.engagement_type end,
      'GENERAL'
    ) as scope_label,
    pr.rate_type,
    coalesce(
      pr.billing_basis,
      case pr.rate_type
        when 'PER_UNIT' then 'PER_UNIT'
        when 'PER_HOUR' then 'PER_HOUR'
        when 'PER_DAY' then 'PER_DAY'
        when 'MILEAGE' then 'PER_MILE'
        when 'PERCENT' then 'PERCENT'
        else 'FLAT'
      end
    ) as billing_basis,
    coalesce(
      pr.duration_value,
      case pr.rate_type
        when 'ONE_DAY' then 1::numeric
        when 'THREE_DAY' then 3::numeric
        when 'WEEK' then 1::numeric
        when 'MONTH' then 1::numeric
        else null::numeric
      end
    ) as duration_value,
    coalesce(
      pr.duration_unit,
      case pr.rate_type
        when 'ONE_DAY' then 'DAY'
        when 'THREE_DAY' then 'DAY'
        when 'WEEK' then 'WEEK'
        when 'MONTH' then 'MONTH'
        else null::text
      end
    ) as duration_unit,
    pr.amount,
    pr.percentage,
    pr.currency,
    pr.effective_from,
    pr.effective_through,
    pr.requires_approval,
    pr.rationale,
    pr.notes,
    pr.source_artifact_id,
    pr.metadata,
    pr.approved_by,
    pr.approved_at,
    r.reference_price,
    r.price_basis as reference_price_basis,
    r.price_state as reference_price_state,
    coalesce(h.observation_count,0::bigint) as historical_observation_count,
    coalesce(h.zero_observation_count,0::bigint) as historical_zero_observation_count,
    coalesce(h.positive_observation_count,0::bigint) as historical_positive_observation_count,
    h.positive_min_price as historical_positive_min_price,
    h.positive_avg_price as historical_positive_avg_price,
    h.positive_max_price as historical_positive_max_price,
    case
      when pr.status = 'APPROVED' then 'APPROVED_AUTHORITY'
      when pr.status = 'DRAFT' then 'DRAFT_CANDIDATE'
      else 'RETIRED_POLICY'
    end as authority_state
  from public.pricing_rules pr
  left join public.resources r on r.id = pr.resource_id
  left join historical h on h.resource_id = pr.resource_id
), evidence_only_resources as (
  select
    null::uuid as pricing_rule_id,
    'RESOURCE_EVIDENCE'::text as entry_kind,
    null::text as code,
    r.name,
    null::text as status,
    null::text as rule_kind,
    null::text as price_position,
    'RESOURCE'::text as scope_type,
    r.id as resource_id,
    null::text as role_code,
    r.category,
    null::text as engagement_type,
    r.name as resource_name,
    r.name as scope_label,
    null::text as rate_type,
    null::text as billing_basis,
    null::numeric as duration_value,
    null::text as duration_unit,
    null::numeric as amount,
    null::numeric as percentage,
    'USD'::text as currency,
    null::date as effective_from,
    null::date as effective_through,
    true as requires_approval,
    null::text as rationale,
    r.notes,
    r.source_artifact_id,
    jsonb_build_object('resource_source',r.source,'resource_price_state',r.price_state) as metadata,
    null::uuid as approved_by,
    null::timestamptz as approved_at,
    r.reference_price,
    r.price_basis as reference_price_basis,
    r.price_state as reference_price_state,
    coalesce(h.observation_count,0::bigint) as historical_observation_count,
    coalesce(h.zero_observation_count,0::bigint) as historical_zero_observation_count,
    coalesce(h.positive_observation_count,0::bigint) as historical_positive_observation_count,
    h.positive_min_price as historical_positive_min_price,
    h.positive_avg_price as historical_positive_avg_price,
    h.positive_max_price as historical_positive_max_price,
    case
      when r.reference_price is not null and r.price_state = 'VERIFIED_CURRENT' then 'CURRENT_REFERENCE_ONLY'
      when r.reference_price is not null then 'LEGACY_REFERENCE_ONLY'
      when coalesce(h.positive_observation_count,0::bigint) > 0 then 'HISTORICAL_ONLY'
      else 'NO_PRICE_EVIDENCE'
    end as authority_state
  from public.resources r
  left join historical h on h.resource_id = r.id
  where r.active = true
    and not exists (
      select 1 from public.pricing_rules pr
      where pr.resource_id = r.id and pr.status <> 'RETIRED'
    )
)
select * from rule_rows
union all
select * from evidence_only_resources;

create or replace view public.cost_book_v
with (security_invoker = true)
as
with latest_profile as (
  select distinct on (erp.profile_key)
    erp.*
  from public.economic_rate_profiles erp
  order by erp.profile_key, erp.version_no desc, erp.created_at desc
), profile_rows as (
  select
    lp.id as economic_rate_profile_id,
    'RATE_PROFILE'::text as entry_kind,
    lp.profile_key,
    lp.version_no,
    lp.name,
    lp.status,
    lp.cost_domain,
    lp.rate_kind,
    lp.scope_type,
    lp.resource_id,
    r.name as resource_name,
    lp.team_member_id,
    tm.display_name as team_member_name,
    lp.party_id,
    p.name as party_name,
    lp.role_code,
    lp.category,
    lp.unit_basis,
    lp.amount,
    lp.currency,
    lp.effective_from,
    lp.effective_through,
    lp.certainty_state,
    lp.rationale,
    lp.notes,
    lp.source_artifact_id,
    lp.metadata,
    lp.approved_by,
    lp.approved_at,
    case
      when lp.status = 'APPROVED'
        and (lp.effective_from is null or lp.effective_from <= current_date)
        and (lp.effective_through is null or lp.effective_through >= current_date)
        then 'APPROVED_AUTHORITY'
      when lp.status = 'DRAFT' then 'DRAFT_CANDIDATE'
      else 'RETIRED_OR_OUT_OF_EFFECT'
    end as authority_state
  from latest_profile lp
  left join public.resources r on r.id = lp.resource_id
  left join public.team_members tm on tm.id = lp.team_member_id
  left join public.parties p on p.id = lp.party_id
), missing_team_rates as (
  select
    null::uuid as economic_rate_profile_id,
    'MISSING_TEAM_RATE'::text as entry_kind,
    ('team:' || tm.username || ':unrepresented')::text as profile_key,
    null::integer as version_no,
    (tm.display_name || ' — rate unknown')::text as name,
    null::text as status,
    'LABOR'::text as cost_domain,
    null::text as rate_kind,
    'TEAM_MEMBER'::text as scope_type,
    null::uuid as resource_id,
    null::text as resource_name,
    tm.id as team_member_id,
    tm.display_name as team_member_name,
    null::uuid as party_id,
    null::text as party_name,
    null::text as role_code,
    null::text as category,
    null::text as unit_basis,
    null::numeric as amount,
    'USD'::text as currency,
    null::date as effective_from,
    null::date as effective_through,
    null::text as certainty_state,
    null::text as rationale,
    'No reusable pay/cost rate is represented for this active contributor.'::text as notes,
    null::uuid as source_artifact_id,
    '{}'::jsonb as metadata,
    null::uuid as approved_by,
    null::timestamptz as approved_at,
    'NO_RATE_EVIDENCE'::text as authority_state
  from public.team_members tm
  where tm.active = true
    and not exists (
      select 1 from latest_profile lp
      where lp.scope_type = 'TEAM_MEMBER' and lp.team_member_id = tm.id and lp.status <> 'RETIRED'
    )
)
select * from profile_rows
union all
select * from missing_team_rates;

create or replace view public.engagement_estimate_position_v
with (security_invoker = true)
as
select
  e.id as engagement_id,
  e.engagement_number,
  e.name as engagement_name,
  e.engagement_type,
  e.commercial_state,
  e.commitment_state,
  count(ci.id) filter (where ci.cost_state = 'ESTIMATE') as estimate_item_count,
  coalesce(sum(ci.amount) filter (where ci.cost_state = 'ESTIMATE'),0::numeric) as estimated_direct_cost,
  count(ci.id) filter (where ci.cost_state = 'COMMITTED') as committed_item_count,
  coalesce(sum(ci.amount) filter (where ci.cost_state = 'COMMITTED'),0::numeric) as committed_direct_cost,
  count(ci.id) filter (where ci.cost_state = 'ACTUAL') as actual_item_count,
  coalesce(sum(ci.amount) filter (where ci.cost_state = 'ACTUAL'),0::numeric) as actual_direct_cost,
  count(ci.id) filter (where ci.cost_state = 'CANCELLED') as cancelled_item_count,
  count(distinct ci.cost_category) filter (where ci.cost_state <> 'CANCELLED') as represented_cost_category_count,
  case
    when count(ci.id) = 0 then 'NO_COST_EVIDENCE'
    when count(ci.id) filter (where ci.cost_state = 'ACTUAL') > 0 then 'ACTUAL_EVIDENCE_PRESENT'
    when count(ci.id) filter (where ci.cost_state = 'COMMITTED') > 0 then 'COMMITTED_COST_PRESENT'
    when count(ci.id) filter (where ci.cost_state = 'ESTIMATE') > 0 then 'ESTIMATE_PRESENT'
    else 'NO_ACTIVE_COST_EVIDENCE'
  end as cost_evidence_state
from public.engagements e
left join public.engagement_cost_items ci on ci.engagement_id = e.id
where e.archived_at is null
group by e.id, e.engagement_number, e.name, e.engagement_type, e.commercial_state, e.commitment_state;

revoke all on public.price_book_v from anon, authenticated;
revoke all on public.cost_book_v from anon, authenticated;
revoke all on public.engagement_estimate_position_v from anon, authenticated;

grant select on public.price_book_v to authenticated, service_role;
grant select on public.cost_book_v to authenticated, service_role;
grant select on public.engagement_estimate_position_v to authenticated, service_role;
