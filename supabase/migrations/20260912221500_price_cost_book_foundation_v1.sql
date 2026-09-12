-- Stage Presence Operational Core: Price Book + Cost Book foundation v1.
--
-- Goals:
-- 1) keep historical/reference pricing as evidence rather than authority;
-- 2) represent rental pricing with both charge basis and duration;
-- 3) surface governed price/cost books without forcing frontend table choreography;
-- 4) seed only DRAFT candidates from already represented business evidence;
-- 5) expose engagement estimate coverage without overstating profitability.

-- ---------------------------------------------------------------------------
-- PRICE RULE DIMENSIONALITY
-- ---------------------------------------------------------------------------
-- `rate_type` remains as a compatibility field. The new fields separate:
-- - price position (standard / floors / target / value reference),
-- - charge basis (flat / per unit / hourly / etc.), and
-- - duration (e.g. 1 DAY, 3 DAY, 1 WEEK, 1 MONTH, EVENT).
--
-- This is necessary for real Stage Presence pricing such as "$80 per panel per day",
-- which cannot be expressed faithfully by the original single `rate_type` dimension.

alter table public.pricing_rules
  add column if not exists price_position text not null default 'STANDARD',
  add column if not exists billing_basis text,
  add column if not exists duration_value numeric,
  add column if not exists duration_unit text,
  add column if not exists role_code text;

alter table public.pricing_rules
  drop constraint if exists pricing_rules_scope_type_check,
  drop constraint if exists pricing_rules_scope_shape,
  drop constraint if exists pricing_rules_price_position_check,
  drop constraint if exists pricing_rules_billing_basis_check,
  drop constraint if exists pricing_rules_duration_unit_check,
  drop constraint if exists pricing_rules_duration_shape;

alter table public.pricing_rules
  add constraint pricing_rules_scope_type_check
    check (scope_type = any (array['RESOURCE'::text, 'ROLE'::text, 'CATEGORY'::text, 'ENGAGEMENT_TYPE'::text, 'GENERAL'::text])),
  add constraint pricing_rules_scope_shape
    check (
      (scope_type = 'RESOURCE' and resource_id is not null and role_code is null and category is null and engagement_type is null)
      or (scope_type = 'ROLE' and resource_id is null and role_code is not null and category is null and engagement_type is null)
      or (scope_type = 'CATEGORY' and resource_id is null and role_code is null and category is not null and engagement_type is null)
      or (scope_type = 'ENGAGEMENT_TYPE' and resource_id is null and role_code is null and category is null and engagement_type is not null)
      or (scope_type = 'GENERAL' and resource_id is null and role_code is null and category is null and engagement_type is null)
    ),
  add constraint pricing_rules_price_position_check
    check (price_position = any (array['STANDARD'::text, 'ECONOMIC_FLOOR'::text, 'COMMERCIAL_FLOOR'::text, 'TARGET'::text, 'VALUE_REFERENCE'::text])),
  add constraint pricing_rules_billing_basis_check
    check (billing_basis is null or billing_basis = any (array['FLAT'::text, 'PER_UNIT'::text, 'PER_HOUR'::text, 'PER_DAY'::text, 'PER_MILE'::text, 'PERCENT'::text, 'OTHER'::text])),
  add constraint pricing_rules_duration_unit_check
    check (duration_unit is null or duration_unit = any (array['HOUR'::text, 'DAY'::text, 'WEEK'::text, 'MONTH'::text, 'EVENT'::text])),
  add constraint pricing_rules_duration_shape
    check (
      (duration_value is null and duration_unit is null)
      or (duration_value is not null and duration_value > 0 and duration_unit is not null)
    );

create index if not exists pricing_rules_role_idx
  on public.pricing_rules(role_code)
  where role_code is not null;

-- Preserve the approved-only authority contract while exposing the richer dimensions.
create or replace view public.pricing_rule_current_v
with (security_invoker = true)
as
select
  pr.*,
  case pr.scope_type
    when 'RESOURCE' then 1
    when 'ROLE' then 2
    when 'CATEGORY' then 3
    when 'ENGAGEMENT_TYPE' then 4
    else 5
  end as scope_precedence,
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
  ) as effective_billing_basis,
  coalesce(
    pr.duration_value,
    case pr.rate_type
      when 'ONE_DAY' then 1::numeric
      when 'THREE_DAY' then 3::numeric
      when 'WEEK' then 1::numeric
      when 'MONTH' then 1::numeric
      else null::numeric
    end
  ) as effective_duration_value,
  coalesce(
    pr.duration_unit,
    case pr.rate_type
      when 'ONE_DAY' then 'DAY'
      when 'THREE_DAY' then 'DAY'
      when 'WEEK' then 'WEEK'
      when 'MONTH' then 'MONTH'
      else null::text
    end
  ) as effective_duration_unit
from public.pricing_rules pr
where pr.status = 'APPROVED'
  and (pr.effective_from is null or pr.effective_from <= current_date)
  and (pr.effective_through is null or pr.effective_through >= current_date);

-- ---------------------------------------------------------------------------
-- DRAFT PRICE BOOK SEEDS
-- ---------------------------------------------------------------------------
-- These rows intentionally remain DRAFT and require approval. They copy already
-- represented evidence into the governed price-policy home; they do not promote
-- Goodshuffle/current references or historical rates into canonical authority.

insert into public.pricing_rules (
  code, name, status, rule_kind, scope_type, resource_id, rate_type,
  amount, currency, requires_approval, rationale, notes, source_artifact_id,
  metadata, price_position, billing_basis, duration_value, duration_unit
)
select
  'resource.17x10_led_trailer.one_day.reference_candidate',
  '17x10 LED Trailer — 1 day candidate',
  'DRAFT', 'BASE_RATE', 'RESOURCE', r.id, 'ONE_DAY',
  r.reference_price, 'USD', true,
  'Draft candidate copied from represented current resource reference pricing; human approval is required before this becomes pricing authority.',
  'Historical commercial evidence includes other realized prices. Preserve those observations rather than treating this candidate as universal policy.',
  r.source_artifact_id,
  jsonb_build_object('source_type','RESOURCE_REFERENCE_PRICE','reference_price_state',r.price_state,'reference_price_basis',r.price_basis),
  'STANDARD', 'FLAT', 1, 'DAY'
from public.resources r
where r.active = true and r.name = '17x10 LED Trailer' and r.reference_price is not null
on conflict (code) do nothing;

insert into public.pricing_rules (
  code, name, status, rule_kind, scope_type, resource_id, rate_type,
  amount, currency, requires_approval, rationale, notes, source_artifact_id,
  metadata, price_position, billing_basis, duration_value, duration_unit
)
select
  'resource.12x7_led_trailer.one_day.reference_candidate',
  '12x7 LED Trailer — 1 day candidate',
  'DRAFT', 'BASE_RATE', 'RESOURCE', r.id, 'ONE_DAY',
  r.reference_price, 'USD', true,
  'Draft candidate copied from represented current resource reference pricing; human approval is required before this becomes pricing authority.',
  'Historical commercial evidence includes other realized prices. Preserve those observations rather than treating this candidate as universal policy.',
  r.source_artifact_id,
  jsonb_build_object('source_type','RESOURCE_REFERENCE_PRICE','reference_price_state',r.price_state,'reference_price_basis',r.price_basis),
  'STANDARD', 'FLAT', 1, 'DAY'
from public.resources r
where r.active = true and r.name = '12x7 LED Trailer' and r.reference_price is not null
on conflict (code) do nothing;

insert into public.pricing_rules (
  code, name, status, rule_kind, scope_type, resource_id, rate_type,
  amount, currency, requires_approval, rationale, notes, source_artifact_id,
  metadata, price_position, billing_basis, duration_value, duration_unit
)
select
  'resource.10x5_led_trailer.event.legacy_candidate',
  '10x5 LED Trailer — event candidate',
  'DRAFT', 'BASE_RATE', 'RESOURCE', r.id, 'FLAT',
  r.reference_price, 'USD', true,
  'Draft candidate copied from legacy Stage Presence reference pricing. This is evidence only until approved.',
  'The current record is legacy-reference evidence and must not be treated as approved rental policy.',
  r.source_artifact_id,
  jsonb_build_object('source_type','RESOURCE_REFERENCE_PRICE','reference_price_state',r.price_state,'reference_price_basis',r.price_basis),
  'STANDARD', 'FLAT', 1, 'EVENT'
from public.resources r
where r.active = true and r.name = '10x5 LED Trailer' and r.reference_price is not null
on conflict (code) do nothing;

insert into public.pricing_rules (
  code, name, status, rule_kind, scope_type, resource_id, rate_type,
  amount, currency, requires_approval, rationale, notes, source_artifact_id,
  metadata, price_position, billing_basis, duration_value, duration_unit
)
select
  'resource.3_9mm_led_panels.per_unit_day.reference_candidate',
  '3.9mm LED Panels — per panel / day candidate',
  'DRAFT', 'BASE_RATE', 'RESOURCE', r.id, 'PER_UNIT',
  r.reference_price, 'USD', true,
  'Draft candidate copied from represented current one-day per-panel reference pricing; human approval is required.',
  'This seed demonstrates the separated billing and duration dimensions: PER_UNIT for 1 DAY.',
  r.source_artifact_id,
  jsonb_build_object('source_type','RESOURCE_REFERENCE_PRICE','reference_price_state',r.price_state,'reference_price_basis',r.price_basis),
  'STANDARD', 'PER_UNIT', 1, 'DAY'
from public.resources r
where r.active = true and r.name = '3.9mm LED Panels' and r.reference_price is not null
on conflict (code) do nothing;

insert into public.pricing_rules (
  code, name, status, rule_kind, scope_type, resource_id, rate_type,
  amount, currency, requires_approval, rationale, notes, source_artifact_id,
  metadata, price_position, billing_basis, duration_value, duration_unit
)
select
  'resource.delivery_pickup.flat.reference_candidate',
  'Delivery & Pickup — flat candidate',
  'DRAFT', 'LOGISTICS', 'RESOURCE', r.id, 'FLAT',
  r.reference_price, 'USD', true,
  'Draft candidate copied from represented current logistics reference pricing; actual logistics pricing may vary by distance, vehicle, scope and complexity.',
  'Do not treat this as a universal delivery minimum until approved.',
  r.source_artifact_id,
  jsonb_build_object('source_type','RESOURCE_REFERENCE_PRICE','reference_price_state',r.price_state,'reference_price_basis',r.price_basis),
  'STANDARD', 'FLAT', 1, 'EVENT'
from public.resources r
where r.active = true and r.name = 'DELIVERY & PICK UP' and r.reference_price is not null
on conflict (code) do nothing;

insert into public.pricing_rules (
  code, name, status, rule_kind, scope_type, resource_id, rate_type,
  amount, currency, requires_approval, rationale, notes, source_artifact_id,
  metadata, price_position, billing_basis, duration_value, duration_unit
)
select
  'resource.load_in.flat.reference_candidate',
  'Load-in — flat candidate',
  'DRAFT', 'LOGISTICS', 'RESOURCE', r.id, 'FLAT',
  r.reference_price, 'USD', true,
  'Draft candidate copied from represented current logistics reference pricing. Historical realized load-in prices vary materially by job.',
  'This row is deliberately DRAFT because current reference and historical sales evidence do not establish one universal policy.',
  r.source_artifact_id,
  jsonb_build_object('source_type','RESOURCE_REFERENCE_PRICE','reference_price_state',r.price_state,'reference_price_basis',r.price_basis),
  'STANDARD', 'FLAT', 1, 'EVENT'
from public.resources r
where r.active = true and r.name = 'Load-in' and r.reference_price is not null
on conflict (code) do nothing;

insert into public.pricing_rules (
  code, name, status, rule_kind, scope_type, resource_id, rate_type,
  amount, currency, requires_approval, rationale, notes, source_artifact_id,
  metadata, price_position, billing_basis, duration_value, duration_unit
)
select
  'resource.content_video_tech.flat.reference_candidate',
  'Content & Video Tech — flat candidate',
  'DRAFT', 'BASE_RATE', 'RESOURCE', r.id, 'FLAT',
  r.reference_price, 'USD', true,
  'Draft candidate copied from represented current service reference pricing; human approval is required.',
  'Historical realized pricing varies. Preserve job-specific commercial evidence separately.',
  r.source_artifact_id,
  jsonb_build_object('source_type','RESOURCE_REFERENCE_PRICE','reference_price_state',r.price_state,'reference_price_basis',r.price_basis),
  'STANDARD', 'FLAT', 1, 'EVENT'
from public.resources r
where r.active = true and r.name = 'Content & Video Tech' and r.reference_price is not null
on conflict (code) do nothing;

-- Historical Stage Presence sell-rate evidence. These are DRAFT price-book candidates,
-- not cost assumptions and not approved policy.
insert into public.pricing_rules (
  code, name, status, rule_kind, scope_type, role_code, rate_type,
  amount, currency, requires_approval, rationale, notes, metadata,
  price_position, billing_basis, duration_value, duration_unit
)
values
  (
    'role.a1.per_day.historical_candidate', 'A1 sell rate — daily candidate',
    'DRAFT','BASE_RATE','ROLE','A1','PER_DAY',750,'USD',true,
    'Historical Stage Presence operating reference supplied by the business; approval is required before use as pricing authority.',
    'Sell-rate evidence only. Do not confuse with technician pay/cost.',
    jsonb_build_object('source_type','USER_PROVIDED_OPERATING_CONTEXT','evidence_kind','HISTORICAL_REFERENCE'),
    'STANDARD','PER_DAY',1,'DAY'
  ),
  (
    'role.a2.per_day.historical_candidate', 'A2 sell rate — daily candidate',
    'DRAFT','BASE_RATE','ROLE','A2','PER_DAY',500,'USD',true,
    'Historical Stage Presence operating reference supplied by the business; approval is required before use as pricing authority.',
    'Sell-rate evidence only. Do not confuse with technician pay/cost.',
    jsonb_build_object('source_type','USER_PROVIDED_OPERATING_CONTEXT','evidence_kind','HISTORICAL_REFERENCE'),
    'STANDARD','PER_DAY',1,'DAY'
  ),
  (
    'role.project_manager.per_day.historical_candidate', 'Project Manager sell rate — daily candidate',
    'DRAFT','BASE_RATE','ROLE','PROJECT_MANAGER','PER_DAY',1000,'USD',true,
    'Historical Stage Presence operating reference supplied by the business; approval is required before use as pricing authority.',
    'Sell-rate evidence only. Do not confuse with internal owner/project-management cost.',
    jsonb_build_object('source_type','USER_PROVIDED_OPERATING_CONTEXT','evidence_kind','HISTORICAL_REFERENCE'),
    'STANDARD','PER_DAY',1,'DAY'
  )
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- DRAFT COST BOOK SEEDS
-- ---------------------------------------------------------------------------
-- Scott and Ben $80/hour are represented as DRAFT pay-cost evidence only.
-- If these rows already exist in production, the unique key keeps this migration idempotent.

insert into public.economic_rate_profiles (
  profile_key, version_no, name, status, cost_domain, rate_kind, scope_type,
  team_member_id, unit_basis, amount, currency, certainty_state, rationale, notes,
  metadata
)
select
  'team:scott:pay-hourly', 1, 'Scott hourly pay rate', 'DRAFT', 'LABOR', 'PAY', 'TEAM_MEMBER',
  tm.id, 'HOUR', 80, 'USD', 'KNOWN',
  'User-provided Stage Presence operating context identified this contributor at $80/hour for programming/install work.',
  'Draft only. This rate is not automatically applied to an Engagement and is not approved cost authority.',
  jsonb_build_object('source_type','USER_PROVIDED_OPERATING_CONTEXT','applies_to_context','programming_install')
from public.team_members tm
where tm.active = true and tm.display_name = 'Scott'
on conflict (profile_key, version_no) do nothing;

insert into public.economic_rate_profiles (
  profile_key, version_no, name, status, cost_domain, rate_kind, scope_type,
  team_member_id, unit_basis, amount, currency, certainty_state, rationale, notes,
  metadata
)
select
  'team:ben:pay-hourly', 1, 'Ben hourly pay rate', 'DRAFT', 'LABOR', 'PAY', 'TEAM_MEMBER',
  tm.id, 'HOUR', 80, 'USD', 'KNOWN',
  'User-provided Stage Presence operating context identified this contributor at $80/hour for programming/install work.',
  'Draft only. This rate is not automatically applied to an Engagement and is not approved cost authority.',
  jsonb_build_object('source_type','USER_PROVIDED_OPERATING_CONTEXT','applies_to_context','programming_install')
from public.team_members tm
where tm.active = true and tm.display_name = 'Ben'
on conflict (profile_key, version_no) do nothing;

-- ---------------------------------------------------------------------------
-- PRICE BOOK READ CONTRACT
-- ---------------------------------------------------------------------------
-- One read surface for governed rules and evidence-only resources. It explicitly
-- distinguishes APPROVED authority, DRAFT policy candidates, current references,
-- legacy references, historical-only evidence and no represented evidence.

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
      case pr.rate_type when 'ONE_DAY' then 1::numeric when 'THREE_DAY' then 3::numeric when 'WEEK' then 1::numeric when 'MONTH' then 1::numeric else null::numeric end
    ) as duration_value,
    coalesce(
      pr.duration_unit,
      case pr.rate_type when 'ONE_DAY' then 'DAY' when 'THREE_DAY' then 'DAY' when 'WEEK' then 'WEEK' when 'MONTH' then 'MONTH' else null::text end
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

-- ---------------------------------------------------------------------------
-- COST BOOK READ CONTRACT
-- ---------------------------------------------------------------------------
-- Latest reusable cost profile per profile_key, plus explicit missing-rate rows
-- for active team members so UNKNOWN remains visible instead of becoming zero.

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

-- ---------------------------------------------------------------------------
-- ENGAGEMENT ESTIMATE POSITION READ CONTRACT
-- ---------------------------------------------------------------------------
-- This exposes estimate/committed/actual cost evidence side by side. It does not
-- infer that an ACTUAL subtotal is complete merely because one actual row exists.

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

-- Read contracts are internal/authenticated only.
revoke all on public.price_book_v from anon, authenticated;
revoke all on public.cost_book_v from anon, authenticated;
revoke all on public.engagement_estimate_position_v from anon, authenticated;

grant select on public.price_book_v to authenticated, service_role;
grant select on public.cost_book_v to authenticated, service_role;
grant select on public.engagement_estimate_position_v to authenticated, service_role;
