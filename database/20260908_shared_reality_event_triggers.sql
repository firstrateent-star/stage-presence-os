-- Applied 2026-09-08 to make Shared Reality mutations log at the database boundary.

create or replace function private.log_fact_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  event_name text;
  event_summary text;
  event_meta jsonb;
begin
  if tg_op = 'INSERT' then
    event_name := case when new.certainty_state in ('UNKNOWN','REQUESTED') then 'FACT_MARKED_UNKNOWN' else 'FACT_ADDED' end;
    event_summary := case when new.certainty_state in ('UNKNOWN','REQUESTED') then 'Material unknown recorded' else 'Engagement fact added' end;
    event_meta := jsonb_build_object('label', new.label, 'category', new.category, 'kind', new.kind, 'certainty_state', new.certainty_state, 'value_text', new.value_text, 'source_type', new.source_type);
  else
    if old.certainty_state is distinct from new.certainty_state and new.certainty_state = 'VERIFIED' then
      event_name := 'FACT_VERIFIED';
      event_summary := 'Engagement fact verified';
    elsif old.certainty_state is distinct from new.certainty_state and new.certainty_state in ('UNKNOWN','REQUESTED') then
      event_name := 'FACT_MARKED_UNKNOWN';
      event_summary := 'Engagement fact marked unknown';
    else
      event_name := 'FACT_UPDATED';
      event_summary := 'Engagement fact updated';
    end if;
    event_meta := jsonb_build_object('label', new.label, 'from_value', old.value_text, 'to_value', new.value_text, 'from_certainty', old.certainty_state, 'to_certainty', new.certainty_state);
  end if;

  insert into public.events (engagement_id, entity_type, entity_id, event_type, actor_user_id, summary, metadata)
  values (new.engagement_id, 'engagement_fact', new.id, event_name, uid, event_summary, coalesce(event_meta, '{}'::jsonb));
  return new;
end;
$$;
revoke all on function private.log_fact_change() from public;
grant execute on function private.log_fact_change() to authenticated;

drop trigger if exists facts_log on public.engagement_facts;
create trigger facts_log after insert or update on public.engagement_facts for each row execute function private.log_fact_change();

create or replace function private.log_party_link()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.events (engagement_id, entity_type, entity_id, event_type, actor_user_id, summary, metadata)
  values (new.engagement_id, 'engagement_party', new.id, 'PARTY_LINKED', (select auth.uid()), 'Party linked to engagement', jsonb_build_object('party_id', new.party_id, 'role', new.role, 'is_primary', new.is_primary));
  return new;
end;
$$;
revoke all on function private.log_party_link() from public;
grant execute on function private.log_party_link() to authenticated;

drop trigger if exists engagement_parties_log on public.engagement_parties;
create trigger engagement_parties_log after insert on public.engagement_parties for each row execute function private.log_party_link();

create or replace function private.log_resource_link()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.events (engagement_id, entity_type, entity_id, event_type, actor_user_id, summary, metadata)
  values (new.engagement_id, 'engagement_resource', new.id, 'RESOURCE_LINKED', (select auth.uid()), 'Resource linked to engagement', jsonb_build_object('resource_id', new.resource_id, 'relationship', new.relationship, 'quantity', new.quantity));
  return new;
end;
$$;
revoke all on function private.log_resource_link() from public;
grant execute on function private.log_resource_link() to authenticated;

drop trigger if exists engagement_resources_log on public.engagement_resources;
create trigger engagement_resources_log after insert on public.engagement_resources for each row execute function private.log_resource_link();
