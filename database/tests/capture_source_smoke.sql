-- Stage Presence OS Capture Layer smoke test.
--
-- Purpose: prove PHOTO source-artifact -> Engagement -> SOURCE_ADDED linkage
-- under an authenticated active app-member context without leaving fake data.
-- This does not write storage.objects; Storage file operations must use the API.

begin;
set local role authenticated;

do $$
declare
  aid uuid := gen_random_uuid();
  eid uuid;
  linked_count integer;
begin
  if auth.uid() is null then
    raise exception 'Capture smoke test requires auth.uid()';
  end if;
  if not private.is_app_member() then
    raise exception 'Capture smoke test requires an active app member';
  end if;

  insert into public.source_artifacts (
    id, artifact_type, storage_path, original_filename, mime_type,
    processing_state, created_by, metadata
  ) values (
    aid,
    'PHOTO',
    auth.uid()::text || '/' || aid::text || '.jpg',
    'autotest.jpg',
    'image/jpeg',
    'RECEIVED',
    auth.uid(),
    jsonb_build_object('test_mode','rollback_only')
  );

  insert into public.engagements (
    name, engagement_type, created_by
  ) values (
    'AUTOTEST — Photo linkage',
    'OTHER',
    auth.uid()
  ) returning id into eid;

  insert into public.events (
    engagement_id, entity_type, entity_id, event_type,
    actor_user_id, summary, metadata
  ) values (
    eid,
    'source_artifact',
    aid,
    'SOURCE_ADDED',
    auth.uid(),
    'Original lead-sheet photo preserved',
    jsonb_build_object('source_type','PHOTO')
  );

  select count(*) into linked_count
  from public.events e
  join public.source_artifacts s on s.id = e.entity_id
  where e.engagement_id = eid
    and e.entity_type = 'source_artifact'
    and e.event_type = 'SOURCE_ADDED'
    and s.artifact_type = 'PHOTO';

  if linked_count <> 1 then
    raise exception 'Expected one linked photo source artifact, got %', linked_count;
  end if;
end;
$$;

rollback;
