create or replace view public.engagement_operating_focus_v
with (security_invoker=true)
as
with ranked as (
  select c.*,
         row_number() over (
           partition by c.engagement_id
           order by case c.urgency when 'NOW' then 1 when 'SOON' then 2 when 'WATCH' then 3 else 4 end,
                    c.priority_score desc,c.phase_order,c.step_code,c.candidate_key
         ) as engagement_focus_rank,
         row_number() over (
           order by case c.urgency when 'NOW' then 1 when 'SOON' then 2 when 'WATCH' then 3 else 4 end,
                    c.priority_score desc,
                    c.event_start_date asc nulls last,
                    c.engagement_number,
                    c.step_code,
                    c.candidate_key
         ) as global_focus_rank
  from public.engagement_movement_candidates_v c
  where c.continuity_state='UNMATERIALIZED'
    and c.urgency <> 'LATER'
)
select * from ranked;

revoke all on table public.engagement_operating_focus_v from anon;
grant select on table public.engagement_operating_focus_v to authenticated;
