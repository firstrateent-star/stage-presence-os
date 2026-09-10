begin;

create or replace view public.engagement_movement_candidates_v
with (security_invoker=true)
as
with
ctx as (
  select (now() at time zone 'America/New_York')::date as today
),
latest_doc_ranked as (
  select cd.*,
         row_number() over (
           partition by cd.engagement_id
           order by cd.snapshot_at desc nulls last,
                    cd.document_date desc nulls last,
                    cd.created_at desc,
                    cd.id
         ) as rn
  from public.commercial_documents cd
),
latest_doc as (
  select * from latest_doc_ranked where rn=1
),
stats as (
  select e.id as engagement_id,
         count(distinct fp.id) filter (where fp.plan_state <> 'SUPERSEDED') as fulfillment_plan_count,
         count(distinct si.id) as schedule_item_count,
         count(distinct a.id) filter (where a.assignment_state <> 'DECLINED') as assignment_count,
         count(distinct c.id) as closeout_count
  from public.engagements e
  left join public.fulfillment_plans fp on fp.engagement_id=e.id
  left join public.engagement_schedule_items si on si.engagement_id=e.id
  left join public.engagement_assignments a on a.engagement_id=e.id
  left join public.engagement_closeouts c on c.engagement_id=e.id
  where e.archived_at is null
  group by e.id
),
base as (
  select e.id as engagement_id,e.engagement_number,e.name as engagement_name,e.engagement_type,
         e.customer_request,e.desired_outcome,e.event_start_date,e.event_end_date,e.venue_name,
         e.commercial_state,e.commitment_state,e.operational_state,e.attention_state,e.updated_at,
         coalesce(st.fulfillment_plan_count,0) as fulfillment_plan_count,
         coalesce(st.schedule_item_count,0) as schedule_item_count,
         coalesce(st.assignment_count,0) as assignment_count,
         coalesce(st.closeout_count,0) as closeout_count,
         ld.id as commercial_document_id,ld.document_type,ld.document_state,ld.document_date,ld.snapshot_at,
         ld.total as document_total,ld.due_on_signature,ld.final_due_date,ld.final_due_amount,
         ld.amount_paid,ld.remaining_balance,ld.certainty_state as document_certainty_state,
         eco.proposal_value_observed,eco.committed_revenue_observed,eco.collected_observed,
         eco.remaining_balance_observed,eco.value_basis,eco.cost_evidence_state,
         ctx.today
  from public.engagements e
  cross join ctx
  left join stats st on st.engagement_id=e.id
  left join latest_doc ld on ld.engagement_id=e.id
  left join public.engagement_economics_v eco on eco.engagement_id=e.id
  where e.archived_at is null
),
seed as (
  select b.engagement_id,b.engagement_number,b.engagement_name,b.engagement_type,b.event_start_date,b.event_end_date,
         'FOLLOW_UP_DECISION'::text as step_code,
         'DECISION'::text as movement_class,'DEMAND'::text as focus_domain,'OPEN_PROPOSAL_DECISION'::text as reason_code,
         case when b.event_start_date < b.today then
           'The represented event date has passed while the Engagement is still commercially open. Resolve the customer decision or correct the source state rather than carrying a stale opportunity.'
         else
           'A proposal/negotiation is represented without commitment. Advance the customer decision, revision, next decision date, or loss state.' end as why_now,
         case when coalesce(b.proposal_value_observed,b.document_total,0) >= 10000 then 'HIGH' else 'MEDIUM' end::text as materiality,
         case when b.event_start_date is null then 'WATCH'
              when b.event_start_date < b.today then 'NOW'
              when b.event_start_date <= b.today+14 then 'NOW'
              when b.event_start_date <= b.today+45 then 'SOON'
              when b.event_start_date <= b.today+120 then 'WATCH'
              else 'LATER' end::text as urgency,
         'ASSISTED'::text as recommended_handling,'FOLLOW_UP'::text as suggested_action_type,
         (b.event_start_date is not null and b.event_start_date <= b.today+45)::boolean as should_create_work,
         null::date as due_date_hint,
         'KNOWN'::text as certainty_state,
         jsonb_build_object('commercial_state',b.commercial_state,'commitment_state',b.commitment_state,'commercial_document_id',b.commercial_document_id,'document_state',b.document_state,'proposal_value_observed',b.proposal_value_observed,'event_start_date',b.event_start_date) as evidence_basis,
         coalesce(b.proposal_value_observed,b.document_total) as economic_value,
         60::integer as base_score
  from base b
  where b.commercial_state in ('PROPOSED','NEGOTIATING')
    and b.commitment_state not in ('SIGNED','DEPOSIT_PENDING','CONFIRMED','CANCELLED')
    and (b.event_start_date is null or b.event_start_date >= b.today-14)

  union all

  select b.engagement_id,b.engagement_number,b.engagement_name,b.engagement_type,b.event_start_date,b.event_end_date,
         'TRANSLATE_REQUIREMENTS','ACTION','DEMAND','OPEN_DEMAND_NEEDS_SCOPE',
         'Legitimate demand is represented without a commercial document. Clarify the decision-changing requirement and shape a coherent solution before pricing.',
         'MEDIUM',
         case when b.event_start_date is null then 'WATCH'
              when b.event_start_date <= b.today+30 then 'NOW'
              when b.event_start_date <= b.today+90 then 'SOON'
              else 'WATCH' end,
         'ASSISTED','CREATE_QUOTE',
         (b.event_start_date is not null and b.event_start_date <= b.today+90),
         null::date,'KNOWN',
         jsonb_build_object('commercial_state',b.commercial_state,'commercial_document_id',b.commercial_document_id,'customer_request_present',b.customer_request is not null,'desired_outcome_present',b.desired_outcome is not null,'event_start_date',b.event_start_date),
         b.proposal_value_observed,55
  from base b
  where b.commercial_state in ('NEW','DISCOVERY','DESIGNING')
    and b.commitment_state not in ('SIGNED','DEPOSIT_PENDING','CONFIRMED','CANCELLED')
    and b.commercial_document_id is null
    and (b.event_start_date is null or b.event_start_date >= b.today)

  union all

  select b.engagement_id,b.engagement_number,b.engagement_name,b.engagement_type,b.event_start_date,b.event_end_date,
         'HANDOFF_ACCEPTED_SCOPE','ACTION','COORDINATION','COMMITTED_SCOPE_NOT_HANDED_OFF',
         'Committed work has no represented fulfillment plan. Translate the accepted promise into operational scope without re-entering or guessing the sale.',
         'HIGH',
         case when b.event_start_date is not null and b.event_start_date <= b.today+14 then 'NOW' else 'SOON' end,
         'ASSISTED','PREP',true,null::date,'KNOWN',
         jsonb_build_object('commitment_state',b.commitment_state,'commercial_state',b.commercial_state,'fulfillment_plan_count',b.fulfillment_plan_count,'commercial_document_id',b.commercial_document_id),
         b.committed_revenue_observed,78
  from base b
  where (b.commercial_state='WON' or b.commitment_state in ('SIGNED','DEPOSIT_PENDING','CONFIRMED'))
    and b.commitment_state <> 'CANCELLED'
    and b.fulfillment_plan_count=0
    and (b.event_start_date is null or b.event_start_date >= b.today)

  union all

  select b.engagement_id,b.engagement_number,b.engagement_name,b.engagement_type,b.event_start_date,b.event_end_date,
         'BUILD_EXECUTION_SCHEDULE','ACTION','COORDINATION','IMMINENT_JOB_SCHEDULE_NOT_REPRESENTED',
         'This committed Engagement is near execution and no native execution schedule is represented in Stage Presence OS. Reconcile known source timing into one usable timeline; keep TBD as TBD.',
         'HIGH',
         case when b.event_start_date <= b.today+2 then 'NOW' else 'SOON' end,
         'ASSISTED','PREP',true,
         case when b.event_start_date <= b.today then b.today else b.event_start_date-2 end,
         'KNOWN',
         jsonb_build_object('event_start_date',b.event_start_date,'schedule_item_count',b.schedule_item_count,'commitment_state',b.commitment_state,'fulfillment_plan_count',b.fulfillment_plan_count),
         b.committed_revenue_observed,82
  from base b
  where (b.commercial_state='WON' or b.commitment_state in ('SIGNED','DEPOSIT_PENDING','CONFIRMED'))
    and b.commitment_state <> 'CANCELLED'
    and b.engagement_type in ('EVENT','LONG_TERM_RENTAL','INSTALLATION','SERVICE','EQUIPMENT_SALE')
    and b.event_start_date between b.today and b.today+7
    and b.schedule_item_count=0

  union all

  select b.engagement_id,b.engagement_number,b.engagement_name,b.engagement_type,b.event_start_date,b.event_end_date,
         'ASSIGN_JOB_ROLES','ACTION','COORDINATION','IMMINENT_JOB_CREW_NOT_REPRESENTED',
         'This committed Engagement is near execution and no native contributor assignment is represented. Confirm the real crew/role ownership; do not infer people from historical habits or source names.',
         'HIGH',
         case when b.event_start_date <= b.today+2 then 'NOW' else 'SOON' end,
         'HUMAN','CREW',true,
         case when b.event_start_date <= b.today then b.today else b.event_start_date-2 end,
         'KNOWN',
         jsonb_build_object('event_start_date',b.event_start_date,'assignment_count',b.assignment_count,'commitment_state',b.commitment_state),
         b.committed_revenue_observed,84
  from base b
  where (b.commercial_state='WON' or b.commitment_state in ('SIGNED','DEPOSIT_PENDING','CONFIRMED'))
    and b.commitment_state <> 'CANCELLED'
    and b.engagement_type in ('EVENT','LONG_TERM_RENTAL','INSTALLATION','SERVICE')
    and b.event_start_date between b.today and b.today+7
    and b.assignment_count=0

  union all

  select b.engagement_id,b.engagement_number,b.engagement_name,b.engagement_type,b.event_start_date,b.event_end_date,
         'CONFIRM_VENUE_ACCESS','CHECK','DELIVERY','IMMINENT_SITE_ACCESS_RECONCILIATION',
         'The committed job is near execution and a venue/site is known, but no native schedule record is available to carry arrival/access detail. Confirm usable access instructions and preserve them for the crew.',
         'HIGH',
         case when b.event_start_date <= b.today+2 then 'NOW' else 'SOON' end,
         'HUMAN','VENUE',true,
         case when b.event_start_date <= b.today then b.today else b.event_start_date-2 end,
         'KNOWN',
         jsonb_build_object('venue_name',b.venue_name,'event_start_date',b.event_start_date,'schedule_item_count',b.schedule_item_count),
         b.committed_revenue_observed,86
  from base b
  where (b.commercial_state='WON' or b.commitment_state in ('SIGNED','DEPOSIT_PENDING','CONFIRMED'))
    and b.commitment_state <> 'CANCELLED'
    and b.engagement_type in ('EVENT','LONG_TERM_RENTAL','INSTALLATION','SERVICE')
    and b.event_start_date between b.today and b.today+7
    and b.venue_name is not null
    and b.schedule_item_count=0

  union all

  select b.engagement_id,b.engagement_number,b.engagement_name,b.engagement_type,b.event_start_date,b.event_end_date,
         'VERIFY_PAYMENT_STATE','CHECK','ECONOMICS','BALANCE_SNAPSHOT_NEEDS_VERIFICATION',
         'The latest represented commercial source shows a remaining balance near delivery or closeout. Verify current payment truth before treating the snapshot as a receivable or blocking execution.',
         case when coalesce(b.remaining_balance,b.remaining_balance_observed,0) >= 5000 then 'HIGH' else 'MEDIUM' end,
         case when coalesce(b.final_due_date,b.event_start_date,b.today) <= b.today+3 then 'NOW' else 'SOON' end,
         'ASSISTED','PAYMENT',true,
         case
           when coalesce(b.final_due_date,b.event_start_date) is null then null
           when coalesce(b.final_due_date,b.event_start_date) < b.today then b.today
           else coalesce(b.final_due_date,b.event_start_date)
         end,
         'KNOWN',
         jsonb_build_object('commercial_document_id',b.commercial_document_id,'document_state',b.document_state,'snapshot_at',b.snapshot_at,'remaining_balance',b.remaining_balance,'remaining_balance_observed',b.remaining_balance_observed,'final_due_date',b.final_due_date,'event_start_date',b.event_start_date),
         coalesce(b.remaining_balance,b.remaining_balance_observed),74
  from base b
  where (b.commercial_state='WON' or b.commitment_state in ('SIGNED','DEPOSIT_PENDING','CONFIRMED'))
    and b.commitment_state <> 'CANCELLED'
    and coalesce(b.remaining_balance,b.remaining_balance_observed,0) > 0
    and (
      b.event_start_date between b.today-14 and b.today+14
      or b.final_due_date between b.today-14 and b.today+14
    )

  union all

  select b.engagement_id,b.engagement_number,b.engagement_name,b.engagement_type,b.event_start_date,b.event_end_date,
         'FINAL_READINESS_REVIEW','DECISION','DELIVERY','FINAL_EXECUTION_READINESS',
         'Execution is imminent. Run one final exception review across people, equipment, timing, site/client inputs, capacity and material money dependencies; unresolved items need owners rather than hidden assumptions.',
         'CRITICAL','NOW','ASSISTED','REVIEW',true,b.today,'KNOWN',
         jsonb_build_object('event_start_date',b.event_start_date,'schedule_item_count',b.schedule_item_count,'assignment_count',b.assignment_count,'fulfillment_plan_count',b.fulfillment_plan_count,'attention_state',b.attention_state),
         b.committed_revenue_observed,100
  from base b
  where (b.commercial_state='WON' or b.commitment_state in ('SIGNED','DEPOSIT_PENDING','CONFIRMED'))
    and b.commitment_state <> 'CANCELLED'
    and b.event_start_date between b.today and b.today+2

  union all

  select b.engagement_id,b.engagement_number,b.engagement_name,b.engagement_type,b.event_start_date,b.event_end_date,
         'CAPTURE_DELIVERY_OUTCOME','LEARNING','KNOWLEDGE','RECENT_DELIVERY_NEEDS_CLOSEOUT',
         'This committed Engagement has recently passed its represented delivery date and has no closeout. Capture the actual outcome and only the learning worth reusing while context is still fresh.',
         'MEDIUM','NOW','ASSISTED','REVIEW',true,b.today,'KNOWN',
         jsonb_build_object('event_end_date',b.event_end_date,'operational_state',b.operational_state,'closeout_count',b.closeout_count,'fulfillment_plan_count',b.fulfillment_plan_count),
         b.committed_revenue_observed,58
  from base b
  where (b.commercial_state='WON' or b.commitment_state in ('SIGNED','DEPOSIT_PENDING','CONFIRMED'))
    and b.commitment_state <> 'CANCELLED'
    and coalesce(b.event_end_date,b.event_start_date) between b.today-14 and b.today-1
    and b.closeout_count=0

  union all

  select e.id,e.engagement_number,e.name,e.engagement_type,e.event_start_date,e.event_end_date,
         'CHECK_CAPACITY_PRESSURE','CHECK','DELIVERY','RESOURCE_WINDOW_PRESSURE',
         'A represented requirement window overlaps another Engagement for '||c.resource_name||'. Verify decision-changing capacity/sourcing before making or protecting a commitment; this signal is not a reservation.',
         case when c.signal_level='HIGH' then 'CRITICAL' else 'HIGH' end,
         case when least(c.engagement_a_from,c.engagement_b_from) <= ctx.today+30 then 'SOON'
              when least(c.engagement_a_from,c.engagement_b_from) <= ctx.today+90 then 'WATCH'
              else 'LATER' end,
         'ASSISTED','CAPACITY',
         (c.signal_level='HIGH' or least(c.engagement_a_from,c.engagement_b_from) <= ctx.today+30),
         null::date,
         case when c.engagement_a_window_state='KNOWN' and c.engagement_b_window_state='KNOWN' then 'KNOWN' else 'ESTIMATED' end,
         jsonb_build_object('resource_id',c.resource_id,'resource_name',c.resource_name,'signal_level',c.signal_level,'other_engagement_id',c.engagement_b_id,'other_engagement_number',c.engagement_b_number,'overlap_from',greatest(c.engagement_a_from,c.engagement_b_from),'overlap_through',least(c.engagement_a_through,c.engagement_b_through)),
         null::numeric,88
  from public.capacity_pressure_signals c
  cross join ctx
  join public.engagements e on e.id=c.engagement_a_id
  where e.archived_at is null

  union all

  select e.id,e.engagement_number,e.name,e.engagement_type,e.event_start_date,e.event_end_date,
         'CHECK_CAPACITY_PRESSURE','CHECK','DELIVERY','RESOURCE_WINDOW_PRESSURE',
         'A represented requirement window overlaps another Engagement for '||c.resource_name||'. Verify decision-changing capacity/sourcing before making or protecting a commitment; this signal is not a reservation.',
         case when c.signal_level='HIGH' then 'CRITICAL' else 'HIGH' end,
         case when least(c.engagement_a_from,c.engagement_b_from) <= ctx.today+30 then 'SOON'
              when least(c.engagement_a_from,c.engagement_b_from) <= ctx.today+90 then 'WATCH'
              else 'LATER' end,
         'ASSISTED','CAPACITY',
         (c.signal_level='HIGH' or least(c.engagement_a_from,c.engagement_b_from) <= ctx.today+30),
         null::date,
         case when c.engagement_a_window_state='KNOWN' and c.engagement_b_window_state='KNOWN' then 'KNOWN' else 'ESTIMATED' end,
         jsonb_build_object('resource_id',c.resource_id,'resource_name',c.resource_name,'signal_level',c.signal_level,'other_engagement_id',c.engagement_a_id,'other_engagement_number',c.engagement_a_number,'overlap_from',greatest(c.engagement_a_from,c.engagement_b_from),'overlap_through',least(c.engagement_a_through,c.engagement_b_through)),
         null::numeric,88
  from public.capacity_pressure_signals c
  cross join ctx
  join public.engagements e on e.id=c.engagement_b_id
  where e.archived_at is null
),
joined as (
  select s.*,
         ps.id as playbook_step_id,ps.phase_order,ps.phase_code,ps.phase_name,ps.title as step_title,
         ps.automation_mode as playbook_automation_mode,ps.procedure_depth,
         coalesce((select count(*) from public.work_items w
                   where w.engagement_id=s.engagement_id
                     and w.playbook_step_id=ps.id
                     and w.status in ('OPEN','WAITING','BLOCKED')),0)::bigint as equivalent_open_work_count
  from seed s
  join public.operating_playbooks p on p.code='STAGE_PRESENCE_CORE_LIFECYCLE' and p.status='ACTIVE'
  join public.operating_playbook_steps ps on ps.playbook_id=p.id and ps.step_code=s.step_code and ps.active=true
),
scored as (
  select j.*,
         case when j.equivalent_open_work_count > 0 then 'COVERED' else 'UNMATERIALIZED' end::text as continuity_state,
         (j.base_score
          + case j.urgency when 'NOW' then 20 when 'SOON' then 10 when 'WATCH' then 0 else -10 end
          + case j.materiality when 'CRITICAL' then 20 when 'HIGH' then 12 when 'MEDIUM' then 6 else 0 end
          + case when coalesce(j.economic_value,0) >= 10000 then 8
                 when coalesce(j.economic_value,0) >= 5000 then 5
                 when coalesce(j.economic_value,0) >= 1000 then 2 else 0 end
          - case when j.equivalent_open_work_count > 0 then 100 else 0 end
         )::integer as priority_score
  from joined j
)
select md5(engagement_id::text||':'||reason_code||':'||step_code||':'||coalesce(evidence_basis::text,'')) as candidate_key,
       engagement_id,engagement_number,engagement_name,engagement_type,event_start_date,event_end_date,
       playbook_step_id,step_code,phase_order,phase_code,phase_name,step_title,
       movement_class,focus_domain,reason_code,why_now,materiality,urgency,recommended_handling,playbook_automation_mode,
       procedure_depth,suggested_action_type,should_create_work,due_date_hint,certainty_state,evidence_basis,economic_value,
       equivalent_open_work_count,continuity_state,priority_score
from scored;

revoke all on table public.engagement_movement_candidates_v from anon;
grant select on table public.engagement_movement_candidates_v to authenticated;

create or replace view public.engagement_operating_focus_v
with (security_invoker=true)
as
with ranked as (
  select c.*,
         row_number() over (
           partition by c.engagement_id
           order by c.priority_score desc,c.phase_order,c.step_code,c.candidate_key
         ) as engagement_focus_rank,
         row_number() over (
           order by c.priority_score desc,
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

commit;
