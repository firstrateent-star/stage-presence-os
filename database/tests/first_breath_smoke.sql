-- Stage Presence OS First Breath smoke test
--
-- Purpose: verify the Shared Reality write path, RLS boundary, and event ledger
-- without leaving test business data behind.
--
-- Run only inside an authenticated app-member session/context. The caller must
-- already provide request.jwt.claim.sub / auth.uid() for an active app member.
-- This script intentionally ROLLS BACK every mutation.

begin;
set local role authenticated;

do $$
begin
  if auth.uid() is null then
    raise exception 'Smoke test requires an authenticated auth.uid() context';
  end if;
  if not private.is_app_member() then
    raise exception 'Smoke test requires an active Stage Presence app member';
  end if;
end;
$$;

create temporary table _first_breath_ids (
  engagement_id uuid,
  resource_id uuid
) on commit drop;

with created as (
  insert into public.engagements (
    name,
    engagement_type,
    customer_request,
    next_action,
    created_by
  )
  values (
    'AUTOTEST — First Breath',
    'EVENT',
    'Automated rollback-only verification',
    'Verify automated smoke test',
    auth.uid()
  )
  returning id
)
insert into _first_breath_ids (engagement_id)
select id from created;

update _first_breath_ids
set resource_id = (
  select id from public.resources where name = '17x10 LED Trailer' limit 1
);

do $$
begin
  if not exists (select 1 from _first_breath_ids where engagement_id is not null) then
    raise exception 'Engagement creation failed';
  end if;
  if not exists (select 1 from _first_breath_ids where resource_id is not null) then
    raise exception 'Reference resource missing: 17x10 LED Trailer';
  end if;
end;
$$;

insert into public.engagement_facts (
  engagement_id, category, kind, label, value_text,
  certainty_state, source_type, created_by
)
select engagement_id, 'OTHER', 'OBSERVATION', 'Smoke-test known fact',
       'Verified', 'VERIFIED', 'SYSTEM', auth.uid()
from _first_breath_ids;

insert into public.engagement_facts (
  engagement_id, category, kind, label, value_text,
  certainty_state, source_type, created_by
)
select engagement_id, 'OTHER', 'REQUIREMENT', 'Smoke-test unknown',
       null, 'UNKNOWN', 'SYSTEM', auth.uid()
from _first_breath_ids;

insert into public.engagement_resources (
  engagement_id, resource_id, relationship, notes
)
select engagement_id, resource_id, 'CONSIDERING',
       'Smoke test only; linking does not reserve availability.'
from _first_breath_ids;

update public.engagements e
set attention_state = 'WAITING',
    waiting_on = 'Automated smoke verification',
    next_action = 'Complete automated smoke verification',
    next_action_at = now() + interval '1 hour'
from _first_breath_ids ids
where e.id = ids.engagement_id;

insert into public.events (
  engagement_id, entity_type, entity_id, event_type,
  actor_user_id, summary, metadata
)
select engagement_id, 'engagement', engagement_id, 'NOTE_ADDED',
       auth.uid(), 'Automated First Breath smoke test',
       jsonb_build_object('test_mode', 'rollback_only')
from _first_breath_ids;

do $$
declare
  eid uuid;
  expected text[] := array[
    'ENGAGEMENT_CREATED',
    'FACT_ADDED',
    'FACT_MARKED_UNKNOWN',
    'RESOURCE_LINKED',
    'ATTENTION_STATE_CHANGED',
    'NEXT_ACTION_SET',
    'NOTE_ADDED'
  ];
  event_name text;
begin
  select engagement_id into eid from _first_breath_ids limit 1;

  if (select count(*) from public.engagement_facts where engagement_id = eid) <> 2 then
    raise exception 'Expected 2 engagement facts';
  end if;

  if (select count(*) from public.engagement_resources where engagement_id = eid) <> 1 then
    raise exception 'Expected 1 engagement resource link';
  end if;

  if not exists (
    select 1 from public.engagements
    where id = eid
      and attention_state = 'WAITING'
      and waiting_on = 'Automated smoke verification'
  ) then
    raise exception 'WAITING / next-move update failed';
  end if;

  foreach event_name in array expected loop
    if not exists (
      select 1 from public.events
      where engagement_id = eid and event_type = event_name
    ) then
      raise exception 'Missing expected event: %', event_name;
    end if;
  end loop;
end;
$$;

-- Nothing from this automated verification survives.
rollback;
