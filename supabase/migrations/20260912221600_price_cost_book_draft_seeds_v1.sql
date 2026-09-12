-- Stage Presence Operational Core: Price Book + Cost Book DRAFT evidence seeds.
-- Nothing in this migration becomes APPROVED authority.

-- Resource/reference pricing candidates -------------------------------------------------

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

-- Historical role sell-rate candidates ------------------------------------------------
-- Sell price is deliberately separate from team-member pay/cost.

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

-- Draft contributor cost evidence ------------------------------------------------------

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
