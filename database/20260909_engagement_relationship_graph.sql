-- Engagement-to-Engagement relationship graph.
-- Purpose: represent program/component, recurrence and renewal structure without
-- inventing special-case schemas. Relationship certainty and provenance remain explicit.

create table public.engagement_relationships (
  id uuid primary key default gen_random_uuid(),
  from_engagement_id uuid not null references public.engagements(id) on delete cascade,
  to_engagement_id uuid not null references public.engagements(id) on delete cascade,
  relationship_type text not null check (relationship_type in ('PROGRAM_COMPONENT','RECURRENCE_OF','RENEWAL_OF','RELATED_TO')),
  certainty_state text not null default 'KNOWN' check (certainty_state in ('VERIFIED','KNOWN','ESTIMATED','ASSUMED','CONFLICTING')),
  source_artifact_id uuid references public.source_artifacts(id) on delete set null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint engagement_relationships_no_self check (from_engagement_id <> to_engagement_id),
  constraint engagement_relationships_unique unique (from_engagement_id,to_engagement_id,relationship_type)
);

create index engagement_relationships_from_idx on public.engagement_relationships(from_engagement_id);
create index engagement_relationships_to_idx on public.engagement_relationships(to_engagement_id);
create index engagement_relationships_source_idx on public.engagement_relationships(source_artifact_id);

alter table public.engagement_relationships enable row level security;

create policy engagement_relationships_member_select on public.engagement_relationships
for select using (private.is_app_member());
create policy engagement_relationships_member_insert on public.engagement_relationships
for insert with check (private.is_app_member());
create policy engagement_relationships_member_update on public.engagement_relationships
for update using (private.is_app_member()) with check (private.is_app_member());

create trigger engagement_relationships_touch_updated_at
before update on public.engagement_relationships
for each row execute function private.touch_updated_at();

create or replace function private.log_engagement_relationship_change()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  summary_text text;
begin
  if tg_op = 'INSERT' then
    summary_text := 'Engagement relationship added';
    insert into public.events (engagement_id,entity_type,entity_id,event_type,actor_user_id,summary,metadata)
    values
      (new.from_engagement_id,'engagement_relationship',new.id,'ENGAGEMENT_RELATIONSHIP_ADDED',uid,summary_text,
       jsonb_build_object('relationship_type',new.relationship_type,'other_engagement_id',new.to_engagement_id,'certainty_state',new.certainty_state)),
      (new.to_engagement_id,'engagement_relationship',new.id,'ENGAGEMENT_RELATIONSHIP_ADDED',uid,summary_text,
       jsonb_build_object('relationship_type',new.relationship_type,'other_engagement_id',new.from_engagement_id,'certainty_state',new.certainty_state));
    return new;
  end if;

  insert into public.events (engagement_id,entity_type,entity_id,event_type,actor_user_id,summary,metadata)
  values
    (new.from_engagement_id,'engagement_relationship',new.id,'ENGAGEMENT_RELATIONSHIP_UPDATED',uid,'Engagement relationship updated',
     jsonb_build_object('relationship_type',new.relationship_type,'other_engagement_id',new.to_engagement_id,'certainty_state',new.certainty_state)),
    (new.to_engagement_id,'engagement_relationship',new.id,'ENGAGEMENT_RELATIONSHIP_UPDATED',uid,'Engagement relationship updated',
     jsonb_build_object('relationship_type',new.relationship_type,'other_engagement_id',new.from_engagement_id,'certainty_state',new.certainty_state));
  return new;
end;
$$;

create trigger engagement_relationships_log_changes
after insert or update on public.engagement_relationships
for each row execute function private.log_engagement_relationship_change();
