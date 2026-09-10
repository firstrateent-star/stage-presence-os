-- Link the seven current reality-derived operating actions to their reusable process knowledge.
-- This does not imply the surrounding playbook steps are complete or applicable.

update public.work_items w set playbook_step_id=s.id
from public.operating_playbook_steps s
join public.operating_playbooks p on p.id=s.playbook_id
where p.code='STAGE_PRESENCE_CORE_LIFECYCLE' and p.version=1 and (
  (w.title='Prepare Music Farm rental and lock delivery timing' and s.step_code='FINAL_READINESS_REVIEW') or
  (w.title='Verify Music Farm balance status' and s.step_code='VERIFY_PAYMENT_STATE') or
  (w.title='Lock UNC home opener logistics and crew plan' and s.step_code='FINAL_READINESS_REVIEW') or
  (w.title in ('Advance Cummins quote to commitment','Advance IES panel rental decision','Advance 20th Anniversary Party quote') and s.step_code='FOLLOW_UP_DECISION') or
  (w.title='Confirm St. John Neumann delivery details' and s.step_code='CONFIRM_VENUE_ACCESS')
);
