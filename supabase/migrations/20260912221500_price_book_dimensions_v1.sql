-- Stage Presence Operational Core: governed Price Book dimensionality v1.
-- Historical/reference prices remain evidence. Only APPROVED rules are authority.

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

-- Keep every pre-existing pricing_rule_current_v column in its original order so
-- dependent quote-readiness views remain valid. New fields append after the old contract.
create or replace view public.pricing_rule_current_v
with (security_invoker = true)
as
select
  pr.id,
  pr.code,
  pr.name,
  pr.status,
  pr.rule_kind,
  pr.scope_type,
  pr.resource_id,
  pr.category,
  pr.engagement_type,
  pr.rate_type,
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
  pr.created_by,
  pr.created_at,
  pr.updated_at,
  case pr.scope_type
    when 'RESOURCE' then 1
    when 'ROLE' then 2
    when 'CATEGORY' then 3
    when 'ENGAGEMENT_TYPE' then 4
    else 5
  end as scope_precedence,
  pr.price_position,
  pr.billing_basis,
  pr.duration_value,
  pr.duration_unit,
  pr.role_code,
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
