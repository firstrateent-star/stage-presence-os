set local lock_timeout = '5s';

-- Payment transactions become incremental cash evidence after imported/document baselines.
alter table public.commercial_payments
  add column if not exists financial_account_id uuid references public.financial_accounts(id) on delete set null,
  add column if not exists transaction_kind text not null default 'PAYMENT',
  add column if not exists source_type text not null default 'MANUAL',
  add column if not exists certainty_state text not null default 'KNOWN',
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.commercial_payments drop constraint if exists commercial_payments_transaction_kind_check;
alter table public.commercial_payments add constraint commercial_payments_transaction_kind_check check (transaction_kind in ('PAYMENT','REFUND','ADJUSTMENT'));
alter table public.commercial_payments drop constraint if exists commercial_payments_source_type_check;
alter table public.commercial_payments add constraint commercial_payments_source_type_check check (source_type in ('MANUAL','IMPORT','PROCESSOR','ACCOUNTING','SYSTEM','OTHER'));
alter table public.commercial_payments drop constraint if exists commercial_payments_certainty_state_check;
alter table public.commercial_payments add constraint commercial_payments_certainty_state_check check (certainty_state in ('VERIFIED','KNOWN','ESTIMATED','ASSUMED','CONFLICTING'));
create index if not exists commercial_payments_financial_account_idx on public.commercial_payments(financial_account_id) where financial_account_id is not null;
create index if not exists commercial_payments_created_by_idx on public.commercial_payments(created_by) where created_by is not null;
create index if not exists commercial_payments_document_date_idx on public.commercial_payments(commercial_document_id,payment_date desc);
drop policy if exists commercial_payments_member_all on public.commercial_payments;
create policy commercial_payments_member_all on public.commercial_payments for all to authenticated using ((select private.is_app_member())) with check ((select private.is_app_member()));
revoke all on table public.commercial_payments from anon;
grant select,insert,update,delete on table public.commercial_payments to authenticated;
grant select,insert,update,delete on table public.commercial_payments to service_role;

-- Company operating costs are deliberately separate from direct Engagement costs.
create table if not exists public.company_cost_items (
  id uuid primary key default gen_random_uuid(),
  source_key text unique,
  recurrence_key text,
  cost_category text not null check (cost_category in ('ADMIN_LABOR','SOFTWARE','INSURANCE','FACILITY','VEHICLE','MARKETING','PROFESSIONAL','TAX_LICENSE','FINANCING','EQUIPMENT','MAINTENANCE','UTILITIES','OFFICE','TRAINING','OTHER')),
  cost_state text not null default 'ESTIMATE' check (cost_state in ('ESTIMATE','COMMITTED','ACTUAL','CANCELLED')),
  description text not null,
  amount numeric not null check (amount >= 0),
  currency text not null default 'USD' check (char_length(currency)=3),
  expected_date date,
  incurred_date date,
  period_start date,
  period_end date,
  counterparty_party_id uuid references public.parties(id) on delete set null,
  financial_account_id uuid references public.financial_accounts(id) on delete set null,
  resource_id uuid references public.resources(id) on delete set null,
  economic_rate_profile_id uuid references public.economic_rate_profiles(id) on delete set null,
  certainty_state text not null default 'KNOWN' check (certainty_state in ('VERIFIED','KNOWN','ESTIMATED','ASSUMED','CONFLICTING')),
  source_type text not null default 'MANUAL' check (source_type in ('MANUAL','RATE_PROFILE','VENDOR','IMPORT','ACCOUNTING','SYSTEM','OTHER')),
  source_artifact_id uuid references public.source_artifacts(id) on delete set null,
  source_segment_id uuid references public.source_artifact_segments(id) on delete set null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_cost_items_period_order check (period_start is null or period_end is null or period_end >= period_start)
);
create index if not exists company_cost_items_state_date_idx on public.company_cost_items(cost_state,coalesce(incurred_date,expected_date,period_start));
create index if not exists company_cost_items_recurrence_idx on public.company_cost_items(recurrence_key) where recurrence_key is not null;
create index if not exists company_cost_items_counterparty_idx on public.company_cost_items(counterparty_party_id) where counterparty_party_id is not null;
create index if not exists company_cost_items_account_idx on public.company_cost_items(financial_account_id) where financial_account_id is not null;
create index if not exists company_cost_items_resource_idx on public.company_cost_items(resource_id) where resource_id is not null;
create index if not exists company_cost_items_rate_idx on public.company_cost_items(economic_rate_profile_id) where economic_rate_profile_id is not null;
create index if not exists company_cost_items_source_artifact_idx on public.company_cost_items(source_artifact_id) where source_artifact_id is not null;
create index if not exists company_cost_items_source_segment_idx on public.company_cost_items(source_segment_id) where source_segment_id is not null;
create index if not exists company_cost_items_created_by_idx on public.company_cost_items(created_by) where created_by is not null;
drop trigger if exists company_cost_items_touch_updated_at on public.company_cost_items;
create trigger company_cost_items_touch_updated_at before update on public.company_cost_items for each row execute function private.touch_updated_at();
alter table public.company_cost_items enable row level security;
drop policy if exists company_cost_items_member_all on public.company_cost_items;
create policy company_cost_items_member_all on public.company_cost_items for all to authenticated using ((select private.is_app_member())) with check ((select private.is_app_member()));
revoke all on table public.company_cost_items from anon;
grant select,insert,update,delete on table public.company_cost_items to authenticated;
grant select,insert,update,delete on table public.company_cost_items to service_role;

-- Asset economics are append-only snapshots. Operational inventory/capacity remains separate.
create table if not exists public.resource_economic_snapshots (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  source_key text unique,
  as_of date not null,
  ownership_state text not null default 'UNKNOWN' check (ownership_state in ('OWNED','FINANCED','LEASED','RENTED','BORROWED','UNKNOWN')),
  represented_quantity numeric check (represented_quantity is null or represented_quantity >= 0),
  acquired_on date,
  acquisition_cost_total numeric check (acquisition_cost_total is null or acquisition_cost_total >= 0),
  current_value_estimate numeric check (current_value_estimate is null or current_value_estimate >= 0),
  replacement_cost_total numeric check (replacement_cost_total is null or replacement_cost_total >= 0),
  financing_balance numeric check (financing_balance is null or financing_balance >= 0),
  annual_maintenance_estimate numeric check (annual_maintenance_estimate is null or annual_maintenance_estimate >= 0),
  certainty_state text not null default 'KNOWN' check (certainty_state in ('VERIFIED','KNOWN','ESTIMATED','ASSUMED','CONFLICTING')),
  source_type text not null default 'MANUAL' check (source_type in ('MANUAL','IMPORT','ACCOUNTING','VENDOR','SYSTEM','OTHER')),
  source_artifact_id uuid references public.source_artifacts(id) on delete set null,
  source_segment_id uuid references public.source_artifact_segments(id) on delete set null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists resource_economic_snapshots_resource_asof_idx on public.resource_economic_snapshots(resource_id,as_of desc,created_at desc);
create index if not exists resource_economic_snapshots_source_artifact_idx on public.resource_economic_snapshots(source_artifact_id) where source_artifact_id is not null;
create index if not exists resource_economic_snapshots_source_segment_idx on public.resource_economic_snapshots(source_segment_id) where source_segment_id is not null;
create index if not exists resource_economic_snapshots_created_by_idx on public.resource_economic_snapshots(created_by) where created_by is not null;
alter table public.resource_economic_snapshots enable row level security;
drop policy if exists resource_economic_snapshots_member_select on public.resource_economic_snapshots;
create policy resource_economic_snapshots_member_select on public.resource_economic_snapshots for select to authenticated using ((select private.is_app_member()));
drop policy if exists resource_economic_snapshots_member_insert on public.resource_economic_snapshots;
create policy resource_economic_snapshots_member_insert on public.resource_economic_snapshots for insert to authenticated with check ((select private.is_app_member()));
revoke all on table public.resource_economic_snapshots from anon;
grant select,insert on table public.resource_economic_snapshots to authenticated;
grant select,insert,update,delete on table public.resource_economic_snapshots to service_role;

create or replace view public.company_cost_breakdown_v with (security_invoker=true) as
select c.id as company_cost_id,c.cost_category,c.cost_state,c.description,c.amount,c.currency,c.expected_date,c.incurred_date,c.period_start,c.period_end,c.recurrence_key,
  case
    when c.cost_category in ('ADMIN_LABOR','TRAINING') then 'PEOPLE_OVERHEAD'
    when c.cost_category in ('FACILITY','UTILITIES','OFFICE') then 'FACILITIES'
    when c.cost_category='SOFTWARE' then 'TECHNOLOGY'
    when c.cost_category in ('INSURANCE','PROFESSIONAL') then 'INSURANCE_ADMIN'
    when c.cost_category='MARKETING' then 'SALES_MARKETING'
    when c.cost_category in ('VEHICLE','EQUIPMENT','MAINTENANCE') then 'ASSETS_VEHICLES'
    when c.cost_category in ('TAX_LICENSE','FINANCING') then 'FINANCE_TAX'
    else 'OTHER' end as economic_bucket,
  p.name as counterparty_name,a.name as financial_account_name,r.name as resource_name,
  rp.profile_key as rate_profile_key,rp.version_no as rate_profile_version,rp.name as rate_profile_name,
  c.certainty_state,c.source_type,c.notes,c.created_at,c.updated_at
from public.company_cost_items c
left join public.parties p on p.id=c.counterparty_party_id
left join public.financial_accounts a on a.id=c.financial_account_id
left join public.resources r on r.id=c.resource_id
left join public.economic_rate_profiles rp on rp.id=c.economic_rate_profile_id
where c.cost_state <> 'CANCELLED';
revoke all on table public.company_cost_breakdown_v from anon;
grant select on table public.company_cost_breakdown_v to authenticated,service_role;

create or replace view public.resource_economy_current_v with (security_invoker=true) as
select distinct on (s.resource_id)
  s.resource_id,r.name as resource_name,r.category as resource_category,r.resource_type,r.sourcing_model,r.active,
  s.id as snapshot_id,s.as_of,s.ownership_state,s.represented_quantity,s.acquired_on,s.acquisition_cost_total,
  s.current_value_estimate,s.replacement_cost_total,s.financing_balance,s.annual_maintenance_estimate,
  s.certainty_state,s.source_type,s.notes,s.created_at
from public.resource_economic_snapshots s
join public.resources r on r.id=s.resource_id
order by s.resource_id,s.as_of desc,s.created_at desc;
revoke all on table public.resource_economy_current_v from anon;
grant select on table public.resource_economy_current_v to authenticated,service_role;

-- Imported/document collected values are aggregate baselines. Only later payment transactions increment them.
create or replace view public.engagement_cash_position_v with (security_invoker=true) as
with current_docs as (
  select d.* from public.commercial_documents d
  where d.document_state <> 'VOID'
    and not exists (select 1 from public.commercial_documents newer where newer.supersedes_document_id=d.id and newer.document_state <> 'VOID')
), latest_fact as (
  select distinct on (f.engagement_id) f.engagement_id,f.amount,f.effective_date,f.certainty_state
  from public.engagement_financial_facts f
  where f.fact_type='AMOUNT_COLLECTED'
  order by f.engagement_id,f.effective_date desc nulls last,f.updated_at desc
), invoice_baseline as (
  select d.engagement_id,sum(coalesce(d.amount_paid,0)) as amount,max(coalesce(d.snapshot_at::date,d.document_date)) as as_of
  from current_docs d
  where d.document_type='INVOICE' and d.document_state in ('SIGNED','PARTIALLY_PAID','PAID') and d.amount_paid is not null
  group by d.engagement_id
), fallback_doc as (
  select distinct on (d.engagement_id) d.engagement_id,d.amount_paid as amount,coalesce(d.snapshot_at::date,d.document_date) as as_of
  from current_docs d
  where d.amount_paid is not null
  order by d.engagement_id,
    case when d.document_type in ('CONTRACT','ORDER') then 1 when d.document_type='QUOTE' then 2 else 3 end,
    d.version_no desc,d.snapshot_at desc nulls last,d.created_at desc
), baseline as (
  select e.id as engagement_id,
    case when lf.engagement_id is not null then lf.amount when ib.engagement_id is not null then ib.amount else fd.amount end as baseline_collected_observed,
    case when lf.engagement_id is not null then lf.effective_date when ib.engagement_id is not null then ib.as_of else fd.as_of end as baseline_as_of,
    case when lf.engagement_id is not null then 'FINANCIAL_FACT_SNAPSHOT' when ib.engagement_id is not null or fd.engagement_id is not null then 'DOCUMENT_SNAPSHOT' else 'NONE' end as baseline_source
  from public.engagements e
  left join latest_fact lf on lf.engagement_id=e.id
  left join invoice_baseline ib on ib.engagement_id=e.id
  left join fallback_doc fd on fd.engagement_id=e.id
  where e.archived_at is null
), valid_payments as (
  select d.engagement_id,p.id,p.payment_date,p.status,p.transaction_kind,p.source_type,p.certainty_state,
    case when p.transaction_kind='REFUND' then -coalesce(p.applied_amount,p.charged_amount,0) else coalesce(p.applied_amount,p.charged_amount,0) end as signed_amount
  from public.commercial_payments p
  join public.commercial_documents d on d.id=p.commercial_document_id
  where coalesce(p.status,'') not in ('VOID','FAILED')
), payment_rollup as (
  select engagement_id,count(*) as payment_record_count,sum(signed_amount) as all_payment_amount,max(payment_date) as last_payment_date
  from valid_payments group by engagement_id
), post_baseline as (
  select b.engagement_id,
    count(v.id) filter (where b.baseline_collected_observed is null or (b.baseline_as_of is not null and v.payment_date>b.baseline_as_of)) as post_baseline_payment_count,
    sum(v.signed_amount) filter (where b.baseline_collected_observed is null or (b.baseline_as_of is not null and v.payment_date>b.baseline_as_of)) as post_baseline_payments_observed,
    max(v.payment_date) filter (where b.baseline_collected_observed is null or (b.baseline_as_of is not null and v.payment_date>b.baseline_as_of)) as latest_post_baseline_payment_date,
    count(v.id) filter (where b.baseline_collected_observed is not null and b.baseline_as_of is not null and (v.payment_date is null or v.payment_date<=b.baseline_as_of)) as prebaseline_or_undated_payment_count
  from baseline b left join valid_payments v on v.engagement_id=b.engagement_id
  group by b.engagement_id
)
select b.engagement_id,b.baseline_collected_observed,b.baseline_as_of,b.baseline_source,
  coalesce(pr.payment_record_count,0) as payment_record_count,
  coalesce(pb.post_baseline_payment_count,0) as post_baseline_payment_count,
  case when b.baseline_collected_observed is null then pr.all_payment_amount else coalesce(pb.post_baseline_payments_observed,0) end as incremental_payments_observed,
  case when b.baseline_collected_observed is not null then b.baseline_collected_observed+coalesce(pb.post_baseline_payments_observed,0) else pr.all_payment_amount end as collected_observed,
  case
    when b.baseline_collected_observed is not null and coalesce(pb.post_baseline_payment_count,0)>0 then 'BASELINE_PLUS_PAYMENTS'
    when b.baseline_source='FINANCIAL_FACT_SNAPSHOT' then 'FINANCIAL_FACT_SNAPSHOT'
    when b.baseline_source='DOCUMENT_SNAPSHOT' then 'DOCUMENT_SNAPSHOT'
    when coalesce(pr.payment_record_count,0)>0 then 'PAYMENT_RECORDS'
    else 'UNKNOWN' end as cash_evidence_state,
  case when pb.latest_post_baseline_payment_date is not null then pb.latest_post_baseline_payment_date when b.baseline_as_of is not null then b.baseline_as_of else pr.last_payment_date end as cash_evidence_as_of,
  case
    when b.baseline_collected_observed is not null and b.baseline_as_of is null and coalesce(pr.payment_record_count,0)>0 then 'BASELINE_DATE_UNKNOWN_REVIEW_OVERLAP'
    when coalesce(pb.prebaseline_or_undated_payment_count,0)>0 then 'PREBASELINE_PAYMENTS_NOT_ADDED'
    else 'CLEAR' end as cash_overlap_state
from baseline b
left join payment_rollup pr on pr.engagement_id=b.engagement_id
left join post_baseline pb on pb.engagement_id=b.engagement_id;
revoke all on table public.engagement_cash_position_v from anon;
grant select on table public.engagement_cash_position_v to authenticated,service_role;

-- Preserve the existing public column order, then append baseline transparency.
create or replace view public.engagement_money_position_v with (security_invoker=true) as
with current_docs as (
  select d.* from public.commercial_documents d
  where d.document_state <> 'VOID'
    and not exists (select 1 from public.commercial_documents newer where newer.supersedes_document_id=d.id and newer.document_state <> 'VOID')
), ranked_docs as (
  select d.*,row_number() over (partition by d.engagement_id order by
    case
      when d.document_type='INVOICE' and d.document_state in ('PAID','PARTIALLY_PAID','SIGNED') then 1
      when d.document_type in ('CONTRACT','ORDER') and d.document_state in ('PAID','PARTIALLY_PAID','SIGNED') then 2
      when d.document_type='QUOTE' and d.document_state in ('PAID','PARTIALLY_PAID','SIGNED') then 3
      when d.document_type='QUOTE' then 4 else 5 end,
    d.version_no desc,d.snapshot_at desc nulls last,d.created_at desc) as document_rank
  from current_docs d
), primary_doc as (select * from ranked_docs where document_rank=1),
invoice_rollup as (
  select engagement_id,sum(coalesce(grand_total,total,0)) filter (where document_type='INVOICE' and document_state in ('SIGNED','PARTIALLY_PAID','PAID')) as invoiced_observed
  from current_docs group by engagement_id
), schedule_rollup as (
  select d.engagement_id,
    count(*) filter (where s.status not in ('VOID','PAID','CANCELLED')) as payment_schedule_count,
    sum(s.amount) filter (where s.status not in ('VOID','PAID','CANCELLED')) as scheduled_outstanding_amount,
    sum(s.amount) filter (where s.status not in ('VOID','PAID','CANCELLED') and s.due_date<current_date) as overdue_scheduled_amount,
    count(*) filter (where s.amount is null and s.percentage is not null and s.status not in ('VOID','PAID','CANCELLED')) as percentage_schedule_count
  from public.commercial_payment_schedule s
  join public.commercial_documents d on d.id=s.commercial_document_id
  group by d.engagement_id
)
select e.id as engagement_id,e.engagement_number,e.name as engagement_name,e.engagement_type,e.commercial_state,e.commitment_state,e.event_start_date,
  econ.proposal_value_observed,econ.committed_revenue_observed,ir.invoiced_observed,cp.collected_observed,
  case
    when econ.value_basis='PROGRAM_ALLOCATION_UNKNOWN' then null::numeric
    when pd.document_state='PAID' then 0::numeric
    when econ.remaining_balance_observed is not null and cp.post_baseline_payment_count>0 then greatest(econ.remaining_balance_observed-coalesce(cp.incremental_payments_observed,0),0)
    when econ.remaining_balance_observed is not null then econ.remaining_balance_observed
    when econ.committed_revenue_observed is not null and cp.collected_observed is not null then greatest(econ.committed_revenue_observed-cp.collected_observed,0)
    else null::numeric end as outstanding_observed,
  sr.scheduled_outstanding_amount,sr.overdue_scheduled_amount,coalesce(sr.payment_schedule_count,0::bigint) as payment_schedule_count,
  coalesce(sr.percentage_schedule_count,0::bigint) as percentage_schedule_count,coalesce(cp.payment_record_count,0::bigint) as payment_record_count,
  pd.id as primary_document_id,pd.document_type as primary_document_type,pd.document_state as primary_document_state,
  pd.external_document_id as primary_document_external_id,pd.source_system as primary_document_source_system,pd.document_date as primary_document_date,
  pd.snapshot_at as primary_document_snapshot_at,pd.subtotal as primary_document_subtotal,pd.discount_total as primary_document_discount_total,
  pd.tax_total as primary_document_tax_total,pd.processing_fee_total as primary_document_processing_fee_total,coalesce(pd.grand_total,pd.total) as primary_document_total,
  cp.cash_evidence_state,cp.cash_evidence_as_of,econ.value_basis,econ.value_basis='PROGRAM_ALLOCATION_UNKNOWN' as allocation_is_unknown,
  cp.baseline_collected_observed,cp.baseline_as_of,cp.incremental_payments_observed,cp.post_baseline_payment_count,cp.cash_overlap_state
from public.engagements e
left join public.engagement_economics_v econ on econ.engagement_id=e.id
left join invoice_rollup ir on ir.engagement_id=e.id
left join schedule_rollup sr on sr.engagement_id=e.id
left join primary_doc pd on pd.engagement_id=e.id
left join public.engagement_cash_position_v cp on cp.engagement_id=e.id
where e.archived_at is null;
revoke all on table public.engagement_money_position_v from anon;
grant select on table public.engagement_money_position_v to authenticated,service_role;

create or replace view public.engagement_economy_v with (security_invoker=true) as
with revenue_bucket_totals as (
  select engagement_id,revenue_bucket,sum(coalesce(effective_line_total,0)) as amount
  from public.engagement_revenue_sources_v where commercial_line_id is not null group by engagement_id,revenue_bucket
), revenue_rollup as (
  select engagement_id,sum(amount) as represented_line_revenue,jsonb_object_agg(revenue_bucket,amount order by revenue_bucket) as revenue_mix
  from revenue_bucket_totals group by engagement_id
), revenue_counts as (
  select engagement_id,count(commercial_line_id) as revenue_source_line_count
  from public.engagement_revenue_sources_v where commercial_line_id is not null group by engagement_id
), cost_bucket_totals as (
  select engagement_id,cost_state,economic_bucket,sum(amount) as amount
  from public.engagement_cost_breakdown_v group by engagement_id,cost_state,economic_bucket
), cost_est as (
  select engagement_id,jsonb_object_agg(economic_bucket,amount order by economic_bucket) as estimated_cost_mix from cost_bucket_totals where cost_state='ESTIMATE' group by engagement_id
), cost_committed as (
  select engagement_id,jsonb_object_agg(economic_bucket,amount order by economic_bucket) as committed_cost_mix from cost_bucket_totals where cost_state='COMMITTED' group by engagement_id
), cost_actual as (
  select engagement_id,jsonb_object_agg(economic_bucket,amount order by economic_bucket) as actual_cost_mix from cost_bucket_totals where cost_state='ACTUAL' group by engagement_id
)
select mp.engagement_id,mp.engagement_number,mp.engagement_name,mp.engagement_type,mp.commercial_state,mp.commitment_state,mp.event_start_date,
  mp.proposal_value_observed,mp.committed_revenue_observed,mp.invoiced_observed,mp.collected_observed,mp.outstanding_observed,
  mp.scheduled_outstanding_amount,mp.overdue_scheduled_amount,mp.payment_schedule_count,mp.payment_record_count,
  mp.primary_document_id,mp.primary_document_type,mp.primary_document_state,mp.primary_document_external_id,mp.primary_document_source_system,
  mp.primary_document_date,mp.primary_document_snapshot_at,mp.primary_document_subtotal,mp.primary_document_discount_total,
  mp.primary_document_tax_total,mp.primary_document_processing_fee_total,mp.primary_document_total,mp.cash_evidence_state,mp.cash_evidence_as_of,
  mp.value_basis,mp.allocation_is_unknown,coalesce(rc.revenue_source_line_count,0::bigint) as revenue_source_line_count,rr.represented_line_revenue,rr.revenue_mix,
  econ.direct_cost_estimate_observed,econ.direct_cost_committed_observed,econ.direct_cost_actual_observed,econ.cost_item_count,
  ce.estimated_cost_mix,cc.committed_cost_mix,ca.actual_cost_mix,econ.projected_contribution_observed,econ.contribution_observed,
  case when coalesce(mp.committed_revenue_observed,mp.proposal_value_observed)>0 and econ.projected_contribution_observed is not null then econ.projected_contribution_observed/coalesce(mp.committed_revenue_observed,mp.proposal_value_observed) else null::numeric end as projected_contribution_margin,
  case when mp.committed_revenue_observed>0 and econ.contribution_observed is not null then econ.contribution_observed/mp.committed_revenue_observed else null::numeric end as contribution_margin,
  econ.cost_evidence_state,
  case
    when mp.allocation_is_unknown then 'PROGRAM_ALLOCATION_UNKNOWN'
    when mp.committed_revenue_observed is not null and econ.direct_cost_actual_observed is not null then 'ACTUAL_CONTRIBUTION_SUPPORTED'
    when coalesce(mp.committed_revenue_observed,mp.proposal_value_observed) is not null and econ.direct_cost_estimate_observed is not null then 'PROJECTED_CONTRIBUTION_SUPPORTED'
    when coalesce(mp.committed_revenue_observed,mp.proposal_value_observed) is not null and econ.direct_cost_estimate_observed is null and econ.direct_cost_actual_observed is null then 'REVENUE_VISIBLE_COSTS_UNPOPULATED'
    when mp.proposal_value_observed is not null then 'COMMERCIAL_VALUE_ONLY'
    else 'PARTIAL_OR_UNKNOWN' end as economy_state,
  mp.baseline_collected_observed,mp.baseline_as_of,mp.incremental_payments_observed,mp.post_baseline_payment_count,mp.cash_overlap_state
from public.engagement_money_position_v mp
left join public.engagement_economics_v econ on econ.engagement_id=mp.engagement_id
left join revenue_rollup rr on rr.engagement_id=mp.engagement_id
left join revenue_counts rc on rc.engagement_id=mp.engagement_id
left join cost_est ce on ce.engagement_id=mp.engagement_id
left join cost_committed cc on cc.engagement_id=mp.engagement_id
left join cost_actual ca on ca.engagement_id=mp.engagement_id;
revoke all on table public.engagement_economy_v from anon;
grant select on table public.engagement_economy_v to authenticated,service_role;

-- Company overview remains evidence-aware: contribution is not promoted to profit.
create or replace view public.economy_overview_v with (security_invoker=true) as
with engagement_totals as (
  select
    sum(proposal_value_observed) filter (where commercial_state in ('NEW','DISCOVERY','DESIGNING','PROPOSED','NEGOTIATING') and commitment_state not in ('SIGNED','DEPOSIT_PENDING','CONFIRMED','CANCELLED')) as open_pipeline_value_observed,
    sum(committed_revenue_observed) as committed_revenue_observed,
    sum(invoiced_observed) as invoiced_observed,
    sum(collected_observed) as collected_observed,
    sum(outstanding_observed) as outstanding_observed,
    sum(direct_cost_estimate_observed) as direct_cost_estimate_observed,
    sum(direct_cost_committed_observed) as direct_cost_committed_observed,
    sum(direct_cost_actual_observed) as direct_cost_actual_observed,
    sum(projected_contribution_observed) as projected_contribution_observed_where_known,
    sum(contribution_observed) as contribution_observed_where_known,
    count(*) as engagement_count,
    count(*) filter (where committed_revenue_observed is not null) as engagements_with_known_committed_value,
    count(*) filter (where collected_observed is not null) as engagements_with_collection_evidence,
    count(*) filter (where outstanding_observed is not null) as engagements_with_outstanding_evidence,
    count(*) filter (where direct_cost_estimate_observed is not null or direct_cost_actual_observed is not null) as engagements_with_cost_evidence,
    count(*) filter (where contribution_observed is not null) as engagements_with_actual_contribution,
    count(*) filter (where allocation_is_unknown) as engagements_with_unknown_program_allocation,
    min(cash_evidence_as_of) filter (where cash_evidence_state<>'UNKNOWN') as oldest_cash_evidence_date,
    max(cash_evidence_as_of) filter (where cash_evidence_state<>'UNKNOWN') as newest_cash_evidence_date
  from public.engagement_economy_v
), account_totals as (
  select count(*) filter (where active) as active_account_count,
    count(*) filter (where active and snapshot_id is not null) as accounts_with_snapshot,
    sum(balance) filter (where active and account_type in ('CASH','BANK') and snapshot_id is not null) as liquid_funds_observed,
    sum(balance) filter (where active and snapshot_id is not null) as net_account_position_observed,
    sum(-balance) filter (where active and account_nature='LIABILITY' and snapshot_id is not null and balance<0) as liabilities_observed,
    min(as_of) filter (where active and snapshot_id is not null) as oldest_account_snapshot_at,
    max(as_of) filter (where active and snapshot_id is not null) as newest_account_snapshot_at
  from public.financial_account_current_v
), company_cost_totals as (
  select count(*) filter (where cost_state<>'CANCELLED') as company_cost_record_count,
    count(*) filter (where cost_state<>'CANCELLED' and coalesce(incurred_date,expected_date,period_start,created_at::date)>=date_trunc('year',current_date)::date) as company_cost_record_count_ytd,
    sum(amount) filter (where cost_state='ESTIMATE' and coalesce(expected_date,period_start,created_at::date)>=date_trunc('year',current_date)::date) as company_cost_estimate_ytd,
    sum(amount) filter (where cost_state='COMMITTED' and coalesce(expected_date,period_start,created_at::date)>=date_trunc('year',current_date)::date) as company_cost_committed_ytd,
    sum(amount) filter (where cost_state='ACTUAL' and coalesce(incurred_date,period_start,created_at::date)>=date_trunc('year',current_date)::date) as company_cost_actual_ytd
  from public.company_cost_items
), asset_totals as (
  select count(*) as resource_economic_snapshot_count,
    count(*) filter (where current_value_estimate is not null) as assets_with_value_estimate,
    sum(current_value_estimate) as asset_current_value_observed,
    sum(replacement_cost_total) as asset_replacement_value_observed,
    sum(financing_balance) as asset_financing_balance_observed,
    sum(annual_maintenance_estimate) as asset_annual_maintenance_estimate_observed,
    max(as_of) as newest_asset_economic_as_of
  from public.resource_economy_current_v
)
select et.open_pipeline_value_observed,et.committed_revenue_observed,et.invoiced_observed,et.collected_observed,et.outstanding_observed,
  et.direct_cost_estimate_observed,et.direct_cost_committed_observed,et.direct_cost_actual_observed,
  et.projected_contribution_observed_where_known,et.contribution_observed_where_known,et.engagement_count,
  et.engagements_with_known_committed_value,et.engagements_with_collection_evidence,et.engagements_with_outstanding_evidence,
  et.engagements_with_cost_evidence,et.engagements_with_actual_contribution,et.engagements_with_unknown_program_allocation,
  et.oldest_cash_evidence_date,et.newest_cash_evidence_date,
  at.active_account_count,at.accounts_with_snapshot,at.liquid_funds_observed,at.liabilities_observed,at.net_account_position_observed,
  at.oldest_account_snapshot_at,at.newest_account_snapshot_at,
  case when coalesce(at.active_account_count,0)=0 then 'NO_ACCOUNT_DATA' when coalesce(at.accounts_with_snapshot,0)=0 then 'NO_ACCOUNT_SNAPSHOTS' when at.accounts_with_snapshot<at.active_account_count then 'PARTIAL_ACCOUNT_SNAPSHOTS' else 'ACCOUNT_SNAPSHOTS' end as funds_evidence_state,
  cct.company_cost_record_count,cct.company_cost_record_count_ytd,cct.company_cost_estimate_ytd,cct.company_cost_committed_ytd,cct.company_cost_actual_ytd,
  case when coalesce(cct.company_cost_record_count,0)=0 then 'NO_COMPANY_COST_DATA' else 'OBSERVED_COMPANY_COSTS_NOT_ASSERTED_COMPLETE' end as company_cost_evidence_state,
  ast.resource_economic_snapshot_count,ast.assets_with_value_estimate,ast.asset_current_value_observed,ast.asset_replacement_value_observed,
  ast.asset_financing_balance_observed,ast.asset_annual_maintenance_estimate_observed,ast.newest_asset_economic_as_of,
  case when coalesce(ast.resource_economic_snapshot_count,0)=0 then 'NO_ASSET_ECONOMIC_DATA' else 'OBSERVED_ASSET_ECONOMICS_NOT_ASSERTED_COMPLETE' end as asset_evidence_state,
  case
    when coalesce(et.engagements_with_cost_evidence,0)<coalesce(et.engagements_with_known_committed_value,0) then 'DIRECT_COST_COVERAGE_INCOMPLETE'
    when coalesce(cct.company_cost_record_count,0)=0 then 'COMPANY_COST_COVERAGE_UNKNOWN'
    when coalesce(at.active_account_count,0)=0 then 'FUNDS_COVERAGE_UNKNOWN'
    else 'OPERATING_ECONOMY_PARTIALLY_REPRESENTED' end as operating_economy_evidence_state
from engagement_totals et cross join account_totals at cross join company_cost_totals cct cross join asset_totals ast;
revoke all on table public.economy_overview_v from anon;
grant select on table public.economy_overview_v to authenticated,service_role;
