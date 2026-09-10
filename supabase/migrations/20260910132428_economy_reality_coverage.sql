create or replace view public.economy_reality_coverage_v
with (security_invoker = true)
as
with m as (
  select
    (select count(*)::int from public.commercial_documents where document_state <> 'VOID') as commercial_documents,
    (select count(*)::int from public.commercial_document_lines) as commercial_lines,
    (select count(*)::int from public.fulfillment_plans) as fulfillment_plans,
    (select count(*)::int from public.fulfillment_plan_lines) as fulfillment_lines,
    (select count(*)::int from public.engagement_economy_v where committed_revenue_observed is not null) as committed_engagements,
    (select count(*)::int from public.engagement_economy_v where committed_revenue_observed is not null and collected_observed is not null) as committed_with_collection,
    (select count(*)::int from public.engagement_economy_v where committed_revenue_observed is not null and (direct_cost_estimate_observed is not null or direct_cost_committed_observed is not null or direct_cost_actual_observed is not null)) as committed_with_costs,
    (select count(*)::int from public.financial_accounts where active is true) as active_accounts,
    (select count(*)::int from public.financial_account_current_v where active is true and snapshot_id is not null) as accounts_with_snapshot,
    (select count(*)::int from public.company_cost_items where cost_state <> 'CANCELLED') as company_costs,
    (select count(*)::int from public.resources where active is true) as active_resources,
    (select count(*)::int from public.resources where active is true and sourcing_model <> 'UNKNOWN') as resources_with_sourcing,
    (select count(*)::int from public.resources where active is true and sourcing_model = 'OWNED') as known_owned_resources,
    (select count(*)::int from public.resource_economy_current_v re join public.resources r on r.id = re.resource_id where r.active is true and r.sourcing_model = 'OWNED') as owned_with_economics,
    (select count(*)::int from public.economic_rate_profiles where status = 'APPROVED') as approved_cost_rates,
    (select count(*)::int from public.pricing_rules where status = 'APPROVED') as approved_pricing_rules,
    (select count(*)::int from public.team_members where active is true) as active_team_members
)
select * from (
  select 'JOB_COSTS'::text as domain_code, 'Job economics'::text as domain_group, 'Direct job costs'::text as label,
    case when m.committed_engagements = 0 then 'NOT_APPLICABLE' when m.committed_with_costs = m.committed_engagements then 'SUPPORTED' when m.committed_with_costs > 0 then 'PARTIAL' else 'MISSING' end::text as coverage_state,
    m.committed_with_costs as represented_count, m.committed_engagements as expected_count,
    case when m.committed_engagements > 0 then round(m.committed_with_costs::numeric / m.committed_engagements, 4) end as coverage_ratio,
    'Know what each committed job is expected to consume and what it actually consumed.'::text as summary,
    'Without direct-cost evidence, contribution and future pricing cannot be trusted.'::text as why_it_matters,
    'For each committed Engagement, capture expected or committed labor, subcontract, rental, logistics, fuel/material and other direct costs; replace estimates with actuals as work closes.'::text as evidence_to_produce,
    'Engagement > Money > Costs + reality capture'::text as frontend_surface,
    array['engagement_cost_items','engagement_cost_breakdown_v','engagement_economy_v']::text[] as source_objects,
    10::int as priority_rank from m
  union all
  select 'FUNDS','Company economy','Accounts + funds',
    case when m.active_accounts = 0 then 'MISSING' when m.accounts_with_snapshot = m.active_accounts then 'SUPPORTED' when m.accounts_with_snapshot > 0 then 'PARTIAL' else 'MISSING' end,
    m.accounts_with_snapshot,m.active_accounts,
    case when m.active_accounts > 0 then round(m.accounts_with_snapshot::numeric / m.active_accounts,4) end,
    'Know where Stage Presence funds and liabilities actually sit.',
    'Collections are not cash-on-hand. Account evidence is required before the OS can describe available funds or liabilities.',
    'Add the real operating bank/cash/credit/loan accounts, then record current dated balance snapshots for each represented account.',
    'Economy > Economic structure > Accounts + funds',
    array['financial_accounts','financial_account_snapshots','financial_account_current_v'],20 from m
  union all
  select 'COLLECTIONS','Job economics','Collections + balances',
    case when m.committed_engagements = 0 then 'NOT_APPLICABLE' when m.committed_with_collection = m.committed_engagements then 'SUPPORTED' when m.committed_with_collection > 0 then 'PARTIAL' else 'MISSING' end,
    m.committed_with_collection,m.committed_engagements,
    case when m.committed_engagements > 0 then round(m.committed_with_collection::numeric / m.committed_engagements,4) end,
    'Know what has actually been collected and what remains owed on committed work.',
    'A quote or invoice total does not prove payment state. Current collection evidence protects cash planning and follow-up.',
    'Confirm the current collection/balance state for committed Engagements that do not yet have cash evidence; record only new post-baseline receipts as payment transactions.',
    'Engagement > Money > Collections + payment evidence',
    array['engagement_financial_facts','commercial_payments','engagement_money_position_v'],30 from m
  union all
  select 'COMPANY_COSTS','Company economy','Company operating costs',
    case when m.company_costs > 0 then 'PARTIAL' else 'MISSING' end,
    m.company_costs,null,null,
    'Know what Stage Presence spends outside individual jobs.',
    'Company overhead is economically real but should not be forced onto one Engagement or silently omitted from a company view.',
    'Capture current recurring and material actual operating costs such as insurance, software, facility, vehicle, marketing, licenses, financing, maintenance and administration.',
    'Economy > Economic structure > Company operating costs',
    array['company_cost_items','company_cost_breakdown_v','economy_overview_v'],40 from m
  union all
  select 'RESOURCE_SOURCING','Assets + capability','Resource sourcing classification',
    case when m.active_resources = 0 then 'NOT_APPLICABLE' when m.resources_with_sourcing = m.active_resources then 'SUPPORTED' when m.resources_with_sourcing > 0 then 'PARTIAL' else 'MISSING' end,
    m.resources_with_sourcing,m.active_resources,
    case when m.active_resources > 0 then round(m.resources_with_sourcing::numeric / m.active_resources,4) end,
    'Know whether each active Resource is owned, subcontracted, rented, or still unknown.',
    'Asset economics and capacity decisions depend on knowing how capability is sourced.',
    'Resolve UNKNOWN sourcing for active Resources using inventory records, purchase history, vendor relationships or direct confirmation.',
    'Resources + Economy > Asset economics',
    array['resources','resource_economy_current_v'],50 from m
  union all
  select 'ASSET_ECONOMICS','Assets + capability','Owned asset economics',
    case when m.known_owned_resources = 0 then 'NOT_APPLICABLE' when m.owned_with_economics = m.known_owned_resources then 'SUPPORTED' when m.owned_with_economics > 0 then 'PARTIAL' else 'MISSING' end,
    m.owned_with_economics,m.known_owned_resources,
    case when m.known_owned_resources > 0 then round(m.owned_with_economics::numeric / m.known_owned_resources,4) end,
    'Know the economic life of the capability Stage Presence owns.',
    'Owned equipment has acquisition, replacement, maintenance, financing and current-value realities that are different from inventory availability.',
    'Start with material assets and record dated ownership/economic snapshots: quantity, acquisition cost, current value, replacement value, financing balance and annual maintenance estimate where known.',
    'Economy > Economic structure > Asset economics',
    array['resource_economic_snapshots','resource_economy_current_v','resources'],60 from m
  union all
  select 'TEAM_ROSTER','People + labor','Contributor roster',
    case when m.active_team_members > 0 then 'PARTIAL' else 'MISSING' end,
    m.active_team_members,null,null,
    'Represent the people who actually carry Stage Presence work.',
    'Labor costing, assignment, availability, responsibility and contributor learning all depend on a governed business identity layer.',
    'Create the current contributor roster with role/capability truth only where confirmed. Do not infer employment or assignment from historical names alone.',
    'Future People / Assignment surface',
    array['team_members','team_member_capabilities','engagement_assignments'],70 from m
  union all
  select 'COST_RATES','Pricing + assumptions','Approved cost rates',
    case when m.approved_cost_rates > 0 then 'PARTIAL' else 'MISSING' end,
    m.approved_cost_rates,null,null,
    'Turn repeating cost knowledge into governed reusable assumptions.',
    'Reusable rates reduce data entry and improve projected contribution, but they must remain separate from historical job costs.',
    'Define and approve the recurring internal cost assumptions that reality supports first: core labor roles, outside rentals/subcontractors, delivery/logistics, and material owned-equipment allocation methods.',
    'Economy > Economic structure > Cost rates + assumptions',
    array['economic_rate_profiles','engagement_cost_items'],80 from m
  union all
  select 'PRICING_AUTHORITY','Pricing + assumptions','Approved sell-price authority',
    case when m.approved_pricing_rules > 0 then 'PARTIAL' else 'MISSING' end,
    m.approved_pricing_rules,null,null,
    'Separate what Stage Presence has charged historically from what it is authorized to quote now.',
    'Historical quotes and current catalog references are evidence, not automatically current pricing policy.',
    'Promote only confirmed current sell rates, minimums, discount rules, rental periods and exception thresholds into approved pricing rules.',
    'Engagement > Quote intelligence / future Pricing reference',
    array['pricing_rules','pricing_observations_v','quote_line_readiness_v'],90 from m
  union all
  select 'COMMERCIAL_EVIDENCE','Recovered evidence','Commercial line history',
    case when m.commercial_documents > 0 and m.commercial_lines > 0 then 'SUPPORTED' else 'MISSING' end,
    m.commercial_lines,m.commercial_lines,
    case when m.commercial_lines > 0 then 1::numeric end,
    'Preserve what customers were actually quoted and charged at atomic line level.',
    'This history is the evidence base for pricing observation, scope patterns and commercial learning.',
    'Continue using native Stage Presence commercial records for new work; preserve imported Goodshuffle history as source evidence.',
    'Engagement > Quote intelligence > Revenue detail',
    array['commercial_documents','commercial_document_lines','engagement_revenue_sources_v'],100 from m
  union all
  select 'FULFILLMENT_EVIDENCE','Recovered evidence','Fulfillment line history',
    case when m.fulfillment_plans > 0 and m.fulfillment_lines > 0 then 'SUPPORTED' else 'MISSING' end,
    m.fulfillment_lines,m.fulfillment_lines,
    case when m.fulfillment_lines > 0 then 1::numeric end,
    'Preserve what each job was configured to deliver.',
    'Commercial scope and fulfillment configuration must remain separate so price history never substitutes for execution truth.',
    'Continue creating native fulfillment plans for new committed work and reconcile inherited configuration only when decision-changing.',
    'Engagement > Job Map / fulfillment detail',
    array['fulfillment_plans','fulfillment_plan_lines','fulfillment_plan_current_v'],110 from m
) coverage
order by priority_rank;

revoke all on public.economy_reality_coverage_v from anon;
grant select on public.economy_reality_coverage_v to authenticated, service_role;
