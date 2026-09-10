set local lock_timeout = '5s';

-- Reusable cost assumptions are versioned/effective-dated. They are not job costs
-- until a job-level cost item snapshots the rate/amount actually used.
create table if not exists public.economic_rate_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_key text not null,
  version_no integer not null default 1 check (version_no > 0),
  name text not null,
  status text not null default 'DRAFT' check (status in ('DRAFT','APPROVED','RETIRED')),
  cost_domain text not null check (cost_domain in ('ASSET','LABOR','SUBCONTRACT','LOGISTICS','TRAVEL','MATERIALS','FEES','OVERHEAD','OTHER')),
  rate_kind text not null check (rate_kind in ('INTERNAL_COST','EXTERNAL_COST','OWNERSHIP_ALLOCATION','MAINTENANCE_RESERVE','REPLACEMENT_REFERENCE','PAY','BURDENED_COST','OTHER')),
  scope_type text not null check (scope_type in ('RESOURCE','TEAM_MEMBER','PARTY','ROLE','CATEGORY','GENERAL')),
  resource_id uuid references public.resources(id) on delete set null,
  team_member_id uuid references public.team_members(id) on delete set null,
  party_id uuid references public.parties(id) on delete set null,
  role_code text,
  category text,
  unit_basis text not null check (unit_basis in ('HOUR','DAY','EVENT','UNIT','MILE','WEEK','MONTH','FLAT','OTHER')),
  amount numeric not null check (amount >= 0),
  currency text not null default 'USD' check (char_length(currency) = 3),
  effective_from date,
  effective_through date,
  certainty_state text not null default 'KNOWN' check (certainty_state in ('VERIFIED','KNOWN','ESTIMATED','ASSUMED','CONFLICTING')),
  rationale text,
  notes text,
  source_artifact_id uuid references public.source_artifacts(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_key, version_no),
  constraint economic_rate_profiles_date_order check (effective_from is null or effective_through is null or effective_through >= effective_from),
  constraint economic_rate_profiles_approval_shape check (status <> 'APPROVED' or (approved_by is not null and approved_at is not null)),
  constraint economic_rate_profiles_scope_shape check (
    (scope_type = 'RESOURCE' and resource_id is not null and team_member_id is null and party_id is null and role_code is null and category is null) or
    (scope_type = 'TEAM_MEMBER' and resource_id is null and team_member_id is not null and party_id is null and role_code is null and category is null) or
    (scope_type = 'PARTY' and resource_id is null and team_member_id is null and party_id is not null and role_code is null and category is null) or
    (scope_type = 'ROLE' and resource_id is null and team_member_id is null and party_id is null and role_code is not null and category is null) or
    (scope_type = 'CATEGORY' and resource_id is null and team_member_id is null and party_id is null and role_code is null and category is not null) or
    (scope_type = 'GENERAL' and resource_id is null and team_member_id is null and party_id is null and role_code is null and category is null)
  )
);

create index if not exists economic_rate_profiles_resource_idx on public.economic_rate_profiles(resource_id) where resource_id is not null;
create index if not exists economic_rate_profiles_member_idx on public.economic_rate_profiles(team_member_id) where team_member_id is not null;
create index if not exists economic_rate_profiles_party_idx on public.economic_rate_profiles(party_id) where party_id is not null;
create index if not exists economic_rate_profiles_source_idx on public.economic_rate_profiles(source_artifact_id) where source_artifact_id is not null;
create index if not exists economic_rate_profiles_created_by_idx on public.economic_rate_profiles(created_by) where created_by is not null;
create index if not exists economic_rate_profiles_approved_by_idx on public.economic_rate_profiles(approved_by) where approved_by is not null;
create index if not exists economic_rate_profiles_current_idx on public.economic_rate_profiles(status, effective_from, effective_through);

drop trigger if exists economic_rate_profiles_touch_updated_at on public.economic_rate_profiles;
create trigger economic_rate_profiles_touch_updated_at before update on public.economic_rate_profiles for each row execute function private.touch_updated_at();

alter table public.economic_rate_profiles enable row level security;
drop policy if exists economic_rate_profiles_member_all on public.economic_rate_profiles;
create policy economic_rate_profiles_member_all on public.economic_rate_profiles for all to authenticated using ((select private.is_app_member())) with check ((select private.is_app_member()));
revoke all on table public.economic_rate_profiles from anon;
grant select, insert, update, delete on table public.economic_rate_profiles to authenticated;
grant select, insert, update, delete on table public.economic_rate_profiles to service_role;

create or replace view public.economic_rate_current_v with (security_invoker = true) as
select p.*,
  case p.scope_type when 'RESOURCE' then 1 when 'TEAM_MEMBER' then 2 when 'PARTY' then 3 when 'ROLE' then 4 when 'CATEGORY' then 5 else 6 end as scope_precedence
from public.economic_rate_profiles p
where p.status = 'APPROVED'
  and (p.effective_from is null or p.effective_from <= current_date)
  and (p.effective_through is null or p.effective_through >= current_date);
revoke all on table public.economic_rate_current_v from anon;
grant select on table public.economic_rate_current_v to authenticated, service_role;

-- Optional account snapshots provide a future seam for bank/accounting integrations.
-- Balance convention: positive = value available/owned by Stage Presence; negative = obligation owed.
create table if not exists public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  account_type text not null check (account_type in ('CASH','BANK','CREDIT_CARD','LOAN','OTHER_ASSET','OTHER_LIABILITY','OTHER')),
  account_nature text not null check (account_nature in ('ASSET','LIABILITY')),
  institution_name text,
  external_system text,
  external_account_id text,
  currency text not null default 'USD' check (char_length(currency) = 3),
  active boolean not null default true,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_accounts_type_nature check (
    (account_type in ('CASH','BANK','OTHER_ASSET') and account_nature = 'ASSET') or
    (account_type in ('CREDIT_CARD','LOAN','OTHER_LIABILITY') and account_nature = 'LIABILITY') or
    account_type = 'OTHER'
  )
);
create unique index if not exists financial_accounts_external_unique on public.financial_accounts(external_system, external_account_id) where external_system is not null and external_account_id is not null;
create index if not exists financial_accounts_created_by_idx on public.financial_accounts(created_by) where created_by is not null;
drop trigger if exists financial_accounts_touch_updated_at on public.financial_accounts;
create trigger financial_accounts_touch_updated_at before update on public.financial_accounts for each row execute function private.touch_updated_at();
alter table public.financial_accounts enable row level security;
drop policy if exists financial_accounts_member_all on public.financial_accounts;
create policy financial_accounts_member_all on public.financial_accounts for all to authenticated using ((select private.is_app_member())) with check ((select private.is_app_member()));
revoke all on table public.financial_accounts from anon;
grant select, insert, update, delete on table public.financial_accounts to authenticated;
grant select, insert, update, delete on table public.financial_accounts to service_role;

create table if not exists public.financial_account_snapshots (
  id uuid primary key default gen_random_uuid(),
  financial_account_id uuid not null references public.financial_accounts(id) on delete cascade,
  source_key text unique,
  as_of timestamptz not null,
  balance numeric not null,
  available_balance numeric,
  balance_kind text not null default 'CURRENT' check (balance_kind in ('CURRENT','AVAILABLE','STATEMENT','OTHER')),
  certainty_state text not null default 'KNOWN' check (certainty_state in ('VERIFIED','KNOWN','ESTIMATED','ASSUMED','CONFLICTING')),
  source_system text,
  external_snapshot_id text,
  source_artifact_id uuid references public.source_artifacts(id) on delete set null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists financial_account_snapshots_account_asof_idx on public.financial_account_snapshots(financial_account_id, as_of desc);
create index if not exists financial_account_snapshots_source_idx on public.financial_account_snapshots(source_artifact_id) where source_artifact_id is not null;
create index if not exists financial_account_snapshots_created_by_idx on public.financial_account_snapshots(created_by) where created_by is not null;
alter table public.financial_account_snapshots enable row level security;
drop policy if exists financial_account_snapshots_member_select on public.financial_account_snapshots;
create policy financial_account_snapshots_member_select on public.financial_account_snapshots for select to authenticated using ((select private.is_app_member()));
drop policy if exists financial_account_snapshots_member_insert on public.financial_account_snapshots;
create policy financial_account_snapshots_member_insert on public.financial_account_snapshots for insert to authenticated with check ((select private.is_app_member()));
revoke all on table public.financial_account_snapshots from anon;
grant select, insert on table public.financial_account_snapshots to authenticated;
grant select, insert, update, delete on table public.financial_account_snapshots to service_role;

create or replace view public.financial_account_current_v with (security_invoker = true) as
select distinct on (a.id)
  a.id as financial_account_id, a.name, a.account_type, a.account_nature, a.institution_name, a.currency, a.active,
  s.id as snapshot_id, s.as_of, s.balance, s.available_balance, s.balance_kind, s.certainty_state, s.source_system, s.external_snapshot_id
from public.financial_accounts a
left join public.financial_account_snapshots s on s.financial_account_id = a.id
where a.active
order by a.id, s.as_of desc nulls last, s.created_at desc nulls last;
revoke all on table public.financial_account_current_v from anon;
grant select on table public.financial_account_current_v to authenticated, service_role;

-- A job snapshots the rate it actually used so future profile changes never rewrite history.
alter table public.engagement_cost_items
  add column if not exists economic_rate_profile_id uuid references public.economic_rate_profiles(id) on delete set null,
  add column if not exists commercial_line_id uuid references public.commercial_document_lines(id) on delete set null,
  add column if not exists fulfillment_line_id uuid references public.fulfillment_plan_lines(id) on delete set null,
  add column if not exists engagement_assignment_id uuid references public.engagement_assignments(id) on delete set null,
  add column if not exists applied_rate numeric,
  add column if not exists rate_basis text,
  add column if not exists source_type text not null default 'MANUAL';
alter table public.engagement_cost_items drop constraint if exists engagement_cost_items_cost_category_check;
alter table public.engagement_cost_items add constraint engagement_cost_items_cost_category_check check (cost_category in ('LABOR','SUBCONTRACT','EQUIPMENT_RENTAL','EQUIPMENT_OWNERSHIP','TRANSPORT','TRAVEL','LODGING','PER_DIEM','FUEL','MATERIALS','PURCHASE','MAINTENANCE','PROCESSING_FEE','OVERHEAD_ALLOCATED','OTHER'));
alter table public.engagement_cost_items drop constraint if exists engagement_cost_items_rate_basis_check;
alter table public.engagement_cost_items add constraint engagement_cost_items_rate_basis_check check (rate_basis is null or rate_basis in ('HOUR','DAY','EVENT','UNIT','MILE','WEEK','MONTH','FLAT','OTHER'));
alter table public.engagement_cost_items drop constraint if exists engagement_cost_items_applied_rate_check;
alter table public.engagement_cost_items add constraint engagement_cost_items_applied_rate_check check (applied_rate is null or applied_rate >= 0);
alter table public.engagement_cost_items drop constraint if exists engagement_cost_items_source_type_check;
alter table public.engagement_cost_items add constraint engagement_cost_items_source_type_check check (source_type in ('MANUAL','RATE_PROFILE','VENDOR','IMPORT','SYSTEM','ACCOUNTING','OTHER'));
create index if not exists engagement_cost_items_rate_profile_idx on public.engagement_cost_items(economic_rate_profile_id) where economic_rate_profile_id is not null;
create index if not exists engagement_cost_items_commercial_line_idx on public.engagement_cost_items(commercial_line_id) where commercial_line_id is not null;
create index if not exists engagement_cost_items_fulfillment_line_idx on public.engagement_cost_items(fulfillment_line_id) where fulfillment_line_id is not null;
create index if not exists engagement_cost_items_assignment_idx on public.engagement_cost_items(engagement_assignment_id) where engagement_assignment_id is not null;

create or replace view public.engagement_revenue_sources_v with (security_invoker = true) as
with current_docs as (
  select d.* from public.commercial_documents d
  where d.document_state <> 'VOID'
    and not exists (select 1 from public.commercial_documents newer where newer.supersedes_document_id=d.id and newer.document_state <> 'VOID')
), ranked_docs as (
  select d.*, row_number() over (partition by d.engagement_id order by
    case
      when d.document_type='INVOICE' and d.document_state in ('PAID','PARTIALLY_PAID','SIGNED') then 1
      when d.document_type in ('CONTRACT','ORDER') and d.document_state in ('PAID','PARTIALLY_PAID','SIGNED') then 2
      when d.document_type='QUOTE' and d.document_state in ('PAID','PARTIALLY_PAID','SIGNED') then 3
      when d.document_type='QUOTE' then 4 else 5 end,
    d.version_no desc, d.snapshot_at desc nulls last, d.created_at desc) as document_rank
  from current_docs d
), primary_docs as (select * from ranked_docs where document_rank=1)
select e.id as engagement_id, e.engagement_number, e.name as engagement_name, e.engagement_type, e.commercial_state, e.commitment_state,
  d.id as commercial_document_id, d.document_type, d.document_state, d.external_document_id, d.source_system, d.document_date, d.snapshot_at, d.currency,
  d.subtotal as document_subtotal, d.discount_total as document_discount_total, d.tax_total as document_tax_total,
  d.processing_fee_total as document_processing_fee_total, coalesce(d.grand_total,d.total) as document_total,
  l.id as commercial_line_id, l.sort_order, l.group_label, l.line_type, l.external_item_id, l.resource_id, r.name as resource_name,
  l.description, l.detail_text, l.quantity, l.unit_price, l.line_total as effective_line_total,
  coalesce((l.metadata->>'gross_line_total')::numeric,l.line_total) as gross_line_total,
  coalesce((l.metadata->>'line_discount_observed')::numeric,0::numeric) as line_discount_observed,
  case
    when coalesce(l.line_total,0)<0 or lower(l.description) like '%discount%' then 'DISCOUNT'
    when l.line_type='RESOURCE' then 'EQUIPMENT'
    when l.line_type='SERVICE' then 'SERVICE'
    when l.line_type='LOGISTICS' then 'LOGISTICS'
    when l.line_type='CUSTOM' then 'CUSTOM_PACKAGE'
    else 'OTHER' end as revenue_bucket,
  case when coalesce(d.grand_total,d.total,0)<>0 and l.line_total is not null then l.line_total/coalesce(d.grand_total,d.total) else null end as share_of_document_total,
  d.document_state in ('SIGNED','PARTIALLY_PAID','PAID') as committed_source, d.certainty_state, l.metadata as line_metadata
from public.engagements e
join primary_docs d on d.engagement_id=e.id
left join public.commercial_document_lines l on l.commercial_document_id=d.id
left join public.resources r on r.id=l.resource_id
where e.archived_at is null;
revoke all on table public.engagement_revenue_sources_v from anon;
grant select on table public.engagement_revenue_sources_v to authenticated, service_role;

create or replace view public.engagement_money_position_v with (security_invoker = true) as
with current_docs as (
  select d.* from public.commercial_documents d
  where d.document_state <> 'VOID'
    and not exists (select 1 from public.commercial_documents newer where newer.supersedes_document_id=d.id and newer.document_state <> 'VOID')
), ranked_docs as (
  select d.*, row_number() over (partition by d.engagement_id order by
    case
      when d.document_type='INVOICE' and d.document_state in ('PAID','PARTIALLY_PAID','SIGNED') then 1
      when d.document_type in ('CONTRACT','ORDER') and d.document_state in ('PAID','PARTIALLY_PAID','SIGNED') then 2
      when d.document_type='QUOTE' and d.document_state in ('PAID','PARTIALLY_PAID','SIGNED') then 3
      when d.document_type='QUOTE' then 4 else 5 end,
    d.version_no desc, d.snapshot_at desc nulls last, d.created_at desc) as document_rank
  from current_docs d
), primary_doc as (select * from ranked_docs where document_rank=1),
invoice_rollup as (
  select engagement_id,
    sum(coalesce(grand_total,total,0)) filter (where document_type='INVOICE' and document_state in ('SIGNED','PARTIALLY_PAID','PAID')) as invoiced_observed,
    max(snapshot_at) as latest_document_snapshot_at,
    bool_or(amount_paid is not null or remaining_balance is not null) as has_document_cash_snapshot
  from current_docs group by engagement_id
), payment_rollup as (
  select d.engagement_id,
    count(*) filter (where coalesce(p.status,'') not in ('VOID','FAILED')) as payment_record_count,
    max(p.payment_date) filter (where coalesce(p.status,'') not in ('VOID','FAILED')) as last_payment_date
  from public.commercial_payments p join public.commercial_documents d on d.id=p.commercial_document_id group by d.engagement_id
), schedule_rollup as (
  select d.engagement_id,
    count(*) filter (where s.status not in ('VOID','PAID','CANCELLED')) as payment_schedule_count,
    sum(s.amount) filter (where s.status not in ('VOID','PAID','CANCELLED')) as scheduled_outstanding_amount,
    sum(s.amount) filter (where s.status not in ('VOID','PAID','CANCELLED') and s.due_date<current_date) as overdue_scheduled_amount,
    count(*) filter (where s.amount is null and s.percentage is not null and s.status not in ('VOID','PAID','CANCELLED')) as percentage_schedule_count
  from public.commercial_payment_schedule s join public.commercial_documents d on d.id=s.commercial_document_id group by d.engagement_id
), collection_fact as (
  select distinct on (f.engagement_id) f.engagement_id, f.amount, f.effective_date, f.certainty_state
  from public.engagement_financial_facts f where f.fact_type='AMOUNT_COLLECTED'
  order by f.engagement_id, f.effective_date desc nulls last, f.updated_at desc
)
select e.id as engagement_id, e.engagement_number, e.name as engagement_name, e.engagement_type, e.commercial_state, e.commitment_state, e.event_start_date,
  econ.proposal_value_observed, econ.committed_revenue_observed, ir.invoiced_observed, econ.collected_observed,
  econ.remaining_balance_observed as outstanding_observed, sr.scheduled_outstanding_amount, sr.overdue_scheduled_amount,
  coalesce(sr.payment_schedule_count,0) as payment_schedule_count, coalesce(sr.percentage_schedule_count,0) as percentage_schedule_count,
  coalesce(pr.payment_record_count,0) as payment_record_count,
  pd.id as primary_document_id, pd.document_type as primary_document_type, pd.document_state as primary_document_state,
  pd.external_document_id as primary_document_external_id, pd.source_system as primary_document_source_system,
  pd.document_date as primary_document_date, pd.snapshot_at as primary_document_snapshot_at,
  pd.subtotal as primary_document_subtotal, pd.discount_total as primary_document_discount_total,
  pd.tax_total as primary_document_tax_total, pd.processing_fee_total as primary_document_processing_fee_total,
  coalesce(pd.grand_total,pd.total) as primary_document_total,
  case when coalesce(pr.payment_record_count,0)>0 then 'PAYMENT_RECORDS'
       when cf.engagement_id is not null then 'FINANCIAL_FACT_SNAPSHOT'
       when coalesce(ir.has_document_cash_snapshot,false) then 'DOCUMENT_SNAPSHOT' else 'UNKNOWN' end as cash_evidence_state,
  case when coalesce(pr.payment_record_count,0)>0 then pr.last_payment_date
       when cf.engagement_id is not null then cf.effective_date
       when ir.latest_document_snapshot_at is not null then ir.latest_document_snapshot_at::date else pd.document_date end as cash_evidence_as_of,
  econ.value_basis, econ.value_basis='PROGRAM_ALLOCATION_UNKNOWN' as allocation_is_unknown
from public.engagements e
left join public.engagement_economics_v econ on econ.engagement_id=e.id
left join invoice_rollup ir on ir.engagement_id=e.id
left join payment_rollup pr on pr.engagement_id=e.id
left join schedule_rollup sr on sr.engagement_id=e.id
left join collection_fact cf on cf.engagement_id=e.id
left join primary_doc pd on pd.engagement_id=e.id
where e.archived_at is null;
revoke all on table public.engagement_money_position_v from anon;
grant select on table public.engagement_money_position_v to authenticated, service_role;

create or replace view public.engagement_cost_breakdown_v with (security_invoker = true) as
select c.id as cost_item_id, c.engagement_id, e.engagement_number, e.name as engagement_name, c.cost_category,
  case when c.cost_category='LABOR' then 'LABOR'
       when c.cost_category in ('EQUIPMENT_RENTAL','EQUIPMENT_OWNERSHIP','PURCHASE','MAINTENANCE') then 'ASSETS_EQUIPMENT'
       when c.cost_category='SUBCONTRACT' then 'SUBCONTRACT'
       when c.cost_category in ('TRANSPORT','TRAVEL','LODGING','PER_DIEM','FUEL') then 'LOGISTICS_TRAVEL'
       when c.cost_category='MATERIALS' then 'MATERIALS'
       when c.cost_category='PROCESSING_FEE' then 'FEES'
       when c.cost_category='OVERHEAD_ALLOCATED' then 'OVERHEAD_ALLOCATED' else 'OTHER' end as economic_bucket,
  c.cost_state, c.description, c.quantity, c.unit_cost, c.amount, c.currency, c.expected_date, c.incurred_date,
  c.counterparty_party_id, p.name as counterparty_name, c.team_member_id, coalesce(tm.display_name,tm.username) as team_member_name,
  c.resource_id, r.name as resource_name, c.economic_rate_profile_id, rp.profile_key as rate_profile_key,
  rp.version_no as rate_profile_version, rp.name as rate_profile_name, c.applied_rate, c.rate_basis, c.source_type, c.certainty_state,
  c.commercial_line_id, c.fulfillment_line_id, c.engagement_assignment_id, c.notes, c.created_at, c.updated_at
from public.engagement_cost_items c
join public.engagements e on e.id=c.engagement_id
left join public.parties p on p.id=c.counterparty_party_id
left join public.team_members tm on tm.id=c.team_member_id
left join public.resources r on r.id=c.resource_id
left join public.economic_rate_profiles rp on rp.id=c.economic_rate_profile_id
where c.cost_state<>'CANCELLED' and e.archived_at is null;
revoke all on table public.engagement_cost_breakdown_v from anon;
grant select on table public.engagement_cost_breakdown_v to authenticated, service_role;

create or replace view public.engagement_economy_v with (security_invoker = true) as
with revenue_bucket_totals as (
  select engagement_id,revenue_bucket,sum(coalesce(effective_line_total,0)) as amount
  from public.engagement_revenue_sources_v where commercial_line_id is not null group by engagement_id,revenue_bucket
), revenue_rollup as (
  select engagement_id,sum(amount) as represented_line_revenue,jsonb_object_agg(revenue_bucket,amount order by revenue_bucket) as revenue_mix
  from revenue_bucket_totals group by engagement_id
), revenue_counts as (
  select engagement_id,count(commercial_line_id) as revenue_source_line_count from public.engagement_revenue_sources_v
  where commercial_line_id is not null group by engagement_id
), cost_bucket_totals as (
  select engagement_id,cost_state,economic_bucket,sum(amount) as amount from public.engagement_cost_breakdown_v group by engagement_id,cost_state,economic_bucket
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
  mp.primary_document_tax_total,mp.primary_document_processing_fee_total,mp.primary_document_total,
  mp.cash_evidence_state,mp.cash_evidence_as_of,mp.value_basis,mp.allocation_is_unknown,
  coalesce(rc.revenue_source_line_count,0) as revenue_source_line_count,rr.represented_line_revenue,rr.revenue_mix,
  econ.direct_cost_estimate_observed,econ.direct_cost_committed_observed,econ.direct_cost_actual_observed,econ.cost_item_count,
  ce.estimated_cost_mix,cc.committed_cost_mix,ca.actual_cost_mix,econ.projected_contribution_observed,econ.contribution_observed,
  case when coalesce(mp.committed_revenue_observed,mp.proposal_value_observed)>0 and econ.projected_contribution_observed is not null
       then econ.projected_contribution_observed/coalesce(mp.committed_revenue_observed,mp.proposal_value_observed) else null end as projected_contribution_margin,
  case when mp.committed_revenue_observed>0 and econ.contribution_observed is not null then econ.contribution_observed/mp.committed_revenue_observed else null end as contribution_margin,
  econ.cost_evidence_state,
  case when mp.allocation_is_unknown then 'PROGRAM_ALLOCATION_UNKNOWN'
       when mp.committed_revenue_observed is not null and econ.direct_cost_actual_observed is not null then 'ACTUAL_CONTRIBUTION_SUPPORTED'
       when coalesce(mp.committed_revenue_observed,mp.proposal_value_observed) is not null and econ.direct_cost_estimate_observed is not null then 'PROJECTED_CONTRIBUTION_SUPPORTED'
       when coalesce(mp.committed_revenue_observed,mp.proposal_value_observed) is not null and econ.direct_cost_estimate_observed is null and econ.direct_cost_actual_observed is null then 'REVENUE_VISIBLE_COSTS_UNPOPULATED'
       when mp.proposal_value_observed is not null then 'COMMERCIAL_VALUE_ONLY' else 'PARTIAL_OR_UNKNOWN' end as economy_state
from public.engagement_money_position_v mp
left join public.engagement_economics_v econ on econ.engagement_id=mp.engagement_id
left join revenue_rollup rr on rr.engagement_id=mp.engagement_id
left join revenue_counts rc on rc.engagement_id=mp.engagement_id
left join cost_est ce on ce.engagement_id=mp.engagement_id
left join cost_committed cc on cc.engagement_id=mp.engagement_id
left join cost_actual ca on ca.engagement_id=mp.engagement_id;
revoke all on table public.engagement_economy_v from anon;
grant select on table public.engagement_economy_v to authenticated, service_role;

create or replace view public.economy_overview_v with (security_invoker = true) as
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
)
select et.*,at.active_account_count,at.accounts_with_snapshot,at.liquid_funds_observed,at.liabilities_observed,at.net_account_position_observed,
  at.oldest_account_snapshot_at,at.newest_account_snapshot_at,
  case when coalesce(at.active_account_count,0)=0 then 'NO_ACCOUNT_DATA'
       when coalesce(at.accounts_with_snapshot,0)=0 then 'NO_ACCOUNT_SNAPSHOTS'
       when at.accounts_with_snapshot<at.active_account_count then 'PARTIAL_ACCOUNT_SNAPSHOTS' else 'ACCOUNT_SNAPSHOTS' end as funds_evidence_state
from engagement_totals et cross join account_totals at;
revoke all on table public.economy_overview_v from anon;
grant select on table public.economy_overview_v to authenticated, service_role;
