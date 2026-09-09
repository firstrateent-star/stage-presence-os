-- Rollback-only Learning Closeout smoke test.
-- Run against a database with at least one active ADMIN member and one Engagement.
-- Proves member-scoped closeout write -> event ledger -> derived learning signal removal.
-- Leaves no business data behind.

begin;

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select user_id::text from public.app_members where active = true and role = 'ADMIN' limit 1),
    'role', 'authenticated'
  )::text,
  true
);

set local role authenticated;

-- Choose the most recent past, committed Engagement with no closeout.
with candidate as (
  select s.engagement_id
  from public.learning_review_signals s
  where s.review_reason = 'DELIVERY_LEARNING'
  order by s.priority desc, s.event_end_date desc
  limit 1
)
insert into public.engagement_closeouts (
  engagement_id,
  closeout_kind,
  actual_outcome,
  recurrence_signal,
  created_by,
  what_worked
)
select
  candidate.engagement_id,
  'DELIVERY',
  'AS_EXPECTED',
  'UNKNOWN',
  auth.uid(),
  'AUTOTEST only — rollback'
from candidate;

-- Expected when a DELIVERY_LEARNING candidate exists:
-- closeouts_visible = 1
-- closeout_events_visible = 1
-- learning_signals_after_closeout = 0
select
  count(*) filter (where c.what_worked = 'AUTOTEST only — rollback') as closeouts_visible,
  (
    select count(*)
    from public.events ev
    where ev.event_type = 'CLOSEOUT_RECORDED'
      and ev.entity_type = 'engagement_closeout'
      and ev.entity_id in (
        select id from public.engagement_closeouts where what_worked = 'AUTOTEST only — rollback'
      )
  ) as closeout_events_visible,
  (
    select count(*)
    from public.learning_review_signals s
    where s.engagement_id in (
      select engagement_id from public.engagement_closeouts where what_worked = 'AUTOTEST only — rollback'
    )
  ) as learning_signals_after_closeout
from public.engagement_closeouts c;

rollback;
