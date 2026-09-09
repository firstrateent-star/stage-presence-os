-- Typed engagement-level money facts.
-- Purpose: distinguish quote, contract, deposit, invoice, collection and cost truths
-- without rebuilding the accounting ledger or overloading engagements.estimated_value.

create table public.engagement_financial_facts (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  fact_type text not null check (fact_type in (
    'QUOTE_TOTAL','CONTRACT_TOTAL','DEPOSIT_REQUIRED','DEPOSIT_RECEIVED',
    'INVOICE_TOTAL','AMOUNT_INVOICED','AMOUNT_COLLECTED',
    'DIRECT_COST_ESTIMATE','DIRECT_COST_ACTUAL','REFUND','OTHER'
  )),
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'USD' check (char_length(currency)=3),
  certainty_state text not null default 'KNOWN' check (certainty_state in ('VERIFIED','KNOWN','ESTIMATED','ASSUMED','CONFLICTING')),
  effective_date date,
  source_key text unique,
  source_artifact_id uuid references public.source_artifacts(id) on delete set null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index engagement_financial_facts_engagement_idx on public.engagement_financial_facts(engagement_id);
create index engagement_financial_facts_type_idx on public.engagement_financial_facts(fact_type);
create index engagement_financial_facts_source_idx on public.engagement_financial_facts(source_artifact_id);

alter table public.engagement_financial_facts enable row level security;
create policy engagement_financial_facts_member_select on public.engagement_financial_facts
for select using (private.is_app_member());
create policy engagement_financial_facts_member_insert on public.engagement_financial_facts
for insert with check (private.is_app_member());
create policy engagement_financial_facts_member_update on public.engagement_financial_facts
for update using (private.is_app_member()) with check (private.is_app_member());

create trigger engagement_financial_facts_touch_updated_at
before update on public.engagement_financial_facts
for each row execute function private.touch_updated_at();

create or replace function private.log_engagement_financial_fact_change()
returns trigger
language plpgsql
set search_path = ''
as $$
declare uid uuid := (select auth.uid());
begin
  insert into public.events (engagement_id,entity_type,entity_id,event_type,actor_user_id,summary,metadata)
  values (
    new.engagement_id,
    'engagement_financial_fact',
    new.id,
    case when tg_op='INSERT' then 'FINANCIAL_FACT_ADDED' else 'FINANCIAL_FACT_UPDATED' end,
    uid,
    case when tg_op='INSERT' then 'Financial fact added' else 'Financial fact updated' end,
    jsonb_build_object('fact_type',new.fact_type,'amount',new.amount,'currency',new.currency,'certainty_state',new.certainty_state)
  );
  return new;
end;
$$;

create trigger engagement_financial_facts_log_changes
after insert or update on public.engagement_financial_facts
for each row execute function private.log_engagement_financial_fact_change();
