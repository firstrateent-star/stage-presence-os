create table public.engagement_closeouts (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null unique references public.engagements(id) on delete cascade,
  closeout_kind text not null default 'DELIVERY' check (closeout_kind in ('DELIVERY','CANCELLED','LOST','OTHER')),
  actual_outcome text not null default 'UNKNOWN' check (actual_outcome in ('AS_EXPECTED','CHANGED','PARTIAL','ISSUE','UNKNOWN')),
  actual_setup_minutes integer check (actual_setup_minutes is null or actual_setup_minutes >= 0),
  actual_strike_minutes integer check (actual_strike_minutes is null or actual_strike_minutes >= 0),
  greg_minutes integer check (greg_minutes is null or greg_minutes >= 0),
  solution_changed boolean,
  what_worked text,
  what_changed text,
  venue_learning text,
  next_time text,
  recurrence_signal text not null default 'UNKNOWN' check (recurrence_signal in ('YES','MAYBE','NO','UNKNOWN')),
  source_artifact_id uuid references public.source_artifacts(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index engagement_closeouts_created_by_idx on public.engagement_closeouts(created_by);
create index engagement_closeouts_source_artifact_idx on public.engagement_closeouts(source_artifact_id);

alter table public.engagement_closeouts enable row level security;

create policy engagement_closeouts_member_select on public.engagement_closeouts for select to authenticated using (private.is_app_member());
create policy engagement_closeouts_member_insert on public.engagement_closeouts for insert to authenticated with check (private.is_app_member());
create policy engagement_closeouts_member_update on public.engagement_closeouts for update to authenticated using (private.is_app_member()) with check (private.is_app_member());

create trigger engagement_closeouts_touch_updated_at before update on public.engagement_closeouts for each row execute function private.touch_updated_at();

create or replace function private.log_engagement_closeout_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.events (
    engagement_id,
    entity_type,
    entity_id,
    event_type,
    actor_user_id,
    summary,
    metadata
  ) values (
    new.engagement_id,
    'engagement_closeout',
    new.id,
    case when tg_op = 'INSERT' then 'CLOSEOUT_RECORDED' else 'CLOSEOUT_UPDATED' end,
    coalesce(new.created_by, auth.uid()),
    case when tg_op = 'INSERT' then 'Learning closeout recorded' else 'Learning closeout updated' end,
    jsonb_build_object(
      'closeout_kind', new.closeout_kind,
      'actual_outcome', new.actual_outcome,
      'recurrence_signal', new.recurrence_signal,
      'solution_changed', new.solution_changed
    )
  );
  return new;
end;
$$;

create trigger engagement_closeouts_log_event after insert or update on public.engagement_closeouts for each row execute function private.log_engagement_closeout_change();

create or replace view public.learning_review_signals
with (security_invoker = true)
as
select
  e.id as engagement_id,
  e.engagement_number,
  e.name,
  e.event_end_date,
  e.commercial_state,
  e.commitment_state,
  e.operational_state,
  case
    when exists (
      select 1 from public.engagement_facts f
      where f.engagement_id = e.id and f.certainty_state = 'CONFLICTING'
    ) then 'RESOLVE_CONFLICT'
    when exists (
      select 1 from public.engagement_relationships r
      where r.from_engagement_id = e.id
        and r.relationship_type = 'PROGRAM_COMPONENT'
        and r.certainty_state <> 'CONFLICTING'
    ) then 'PROGRAM_REVIEW'
    when e.commercial_state in ('NEW','DISCOVERY','DESIGNING','PROPOSED','NEGOTIATING')
      and e.commitment_state not in ('SIGNED','DEPOSIT_PENDING','CONFIRMED','CANCELLED') then 'STALE_COMMERCIAL'
    when e.commercial_state = 'WON'
      or e.commitment_state in ('SIGNED','DEPOSIT_PENDING','CONFIRMED') then 'DELIVERY_LEARNING'
    else 'REVIEW'
  end as review_reason,
  case
    when exists (
      select 1 from public.engagement_facts f
      where f.engagement_id = e.id and f.certainty_state = 'CONFLICTING'
    ) then 100
    when e.commercial_state = 'WON'
      or e.commitment_state in ('SIGNED','DEPOSIT_PENDING','CONFIRMED') then 80
    when e.commercial_state in ('NEW','DISCOVERY','DESIGNING','PROPOSED','NEGOTIATING') then 60
    else 40
  end as priority
from public.engagements e
left join public.engagement_closeouts c on c.engagement_id = e.id
where e.archived_at is null
  and c.id is null
  and e.event_end_date is not null
  and e.event_end_date < current_date;