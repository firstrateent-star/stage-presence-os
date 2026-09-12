-- Stage Presence OS — Recovery Queue kernel
-- Derived recovery candidates remain read-only business interpretation.
-- Human disposition is persisted separately so defer / review / decision state survives
-- without turning recovery candidates into a second source of business truth.

create table if not exists public.recovery_item_decisions (
  id uuid primary key default gen_random_uuid(),
  candidate_key text not null unique,
  candidate_type text not null,
  domain text not null,
  title_snapshot text not null,
  engagement_id uuid references public.engagements(id) on delete set null,
  resource_id uuid references public.resources(id) on delete set null,
  status text not null default 'OPEN',
  assigned_member_id uuid references public.team_members(id) on delete set null,
  decision_note text,
  deferred_until date,
  decision_payload jsonb not null default '{}'::jsonb,
  decided_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recovery_item_decisions_status_check check (
    status in ('OPEN','IN_REVIEW','DEFERRED','NOT_RELEVANT','RESOLVED','NEEDS_DECISION')
  )
);

comment on table public.recovery_item_decisions is
'Human disposition of deterministic Recovery Queue candidates. This table does not own the underlying business truth; canonical records must be updated in their domain tables.';
comment on column public.recovery_item_decisions.candidate_key is
'Stable deterministic key emitted by recovery_queue_v.';
comment on column public.recovery_item_decisions.decision_payload is
'Optional snapshot/context about the human disposition. Never substitutes for canonical domain truth.';

create index if not exists recovery_item_decisions_status_idx
  on public.recovery_item_decisions(status);
create index if not exists recovery_item_decisions_engagement_idx
  on public.recovery_item_decisions(engagement_id)
  where engagement_id is not null;
create index if not exists recovery_item_decisions_resource_idx
  on public.recovery_item_decisions(resource_id)
  where resource_id is not null;
create index if not exists recovery_item_decisions_assigned_member_idx
  on public.recovery_item_decisions(assigned_member_id)
  where assigned_member_id is not null;

alter table public.recovery_item_decisions enable row level security;

drop policy if exists recovery_item_decisions_member_select on public.recovery_item_decisions;
create policy recovery_item_decisions_member_select
  on public.recovery_item_decisions
  for select
  to authenticated
  using (private.is_app_member());

drop policy if exists recovery_item_decisions_member_insert on public.recovery_item_decisions;
create policy recovery_item_decisions_member_insert
  on public.recovery_item_decisions
  for insert
  to authenticated
  with check (private.is_app_member());

drop policy if exists recovery_item_decisions_member_update on public.recovery_item_decisions;
create policy recovery_item_decisions_member_update
  on public.recovery_item_decisions
  for update
  to authenticated
  using (private.is_app_member())
  with check (private.is_app_member());

drop trigger if exists recovery_item_decisions_touch_updated_at on public.recovery_item_decisions;
create trigger recovery_item_decisions_touch_updated_at
before update on public.recovery_item_decisions
for each row execute function private.touch_updated_at();

revoke all on public.recovery_item_decisions from anon;
revoke all on public.recovery_item_decisions from public;
grant select, insert, update on public.recovery_item_decisions to authenticated;

create or replace view public.recovery_queue_v
with (security_invoker = true)
as
with schedule_evidence as (
  select
    'schedule:' || fp.engagement_id::text as candidate_key,
    'EVIDENCE_RECOVERY'::text as candidate_type,
    'Schedule'::text as domain,
    'Recover execution timing from existing evidence'::text as title,
    'Goodshuffle fulfillment evidence contains timing text, but no native Stage Presence schedule item is represented yet.'::text as description,
    fp.engagement_id,
    e.engagement_number,
    e.name as engagement_name,
    null::uuid as resource_id,
    null::text as resource_name,
    min(p.source_artifact_id::text)::uuid as source_artifact_id,
    min(p.source_segment_id::text)::uuid as source_segment_id,
    'Goodshuffle pull sheet'::text as source_label,
    jsonb_build_object(
      'timing_texts',
      to_jsonb(array_agg(distinct fp.event_time_text order by fp.event_time_text))
    ) as evidence,
    'MEDIUM'::text as confidence,
    'ESTIMATED'::text as certainty_state,
    case
      when coalesce(e.event_start_date, e.event_start::date) <= current_date + 14 then 'NOW'
      when coalesce(e.event_start_date, e.event_start::date) <= current_date + 60 then 'SOON'
      else 'LATER'
    end::text as urgency,
    'RECOVER'::text as lane,
    'Crew timing, logistics, resource possession and client delivery can depend on this schedule.'::text as business_impact,
    'Review the recovered timing and create native schedule items without inventing TBD times.'::text as suggested_action,
    case
      when coalesce(e.event_start_date, e.event_start::date) <= current_date + 14 then 96
      when coalesce(e.event_start_date, e.event_start::date) <= current_date + 60 then 76
      else 46
    end::integer as priority_score
  from public.fulfillment_plan_current_v fp
  join public.fulfillment_plans p on p.id = fp.plan_id
  join public.engagements e on e.id = fp.engagement_id
  where fp.event_time_text is not null
    and e.archived_at is null
    and coalesce(e.event_end_date, e.event_end::date, e.event_start_date, e.event_start::date) >= current_date - 2
    and not exists (
      select 1
      from public.engagement_schedule_items s
      where s.engagement_id = fp.engagement_id
    )
  group by fp.engagement_id, e.engagement_number, e.name, e.event_start_date, e.event_start
),
unresolved_facts as (
  select
    'fact:' || f.id::text as candidate_key,
    'UNRESOLVED_TRUTH'::text as candidate_type,
    initcap(lower(f.category)) as domain,
    f.label as title,
    coalesce(f.value_text, 'A represented business fact is unresolved.') as description,
    f.engagement_id,
    e.engagement_number,
    e.name as engagement_name,
    null::uuid as resource_id,
    null::text as resource_name,
    f.source_artifact_id,
    null::uuid as source_segment_id,
    coalesce(f.source_type, 'Evidence') as source_label,
    jsonb_build_object(
      'kind', f.kind,
      'category', f.category,
      'value', f.value_text,
      'notes', f.notes
    ) as evidence,
    'LOW'::text as confidence,
    f.certainty_state,
    case
      when e.commitment_state in ('SIGNED','DEPOSIT_PENDING','CONFIRMED')
       and coalesce(e.event_start_date, e.event_start::date) <= current_date + 14 then 'NOW'
      when coalesce(e.event_start_date, e.event_start::date) <= current_date + 60 then 'SOON'
      else 'LATER'
    end::text as urgency,
    case when f.certainty_state = 'CONFLICTING' then 'REVIEW' else 'ASK_WHEN_RELEVANT' end::text as lane,
    'Unresolved truth can create bad downstream decisions if the business starts depending on it.'::text as business_impact,
    case
      when f.certainty_state = 'CONFLICTING' then 'Compare the underlying sources and choose the supported current truth.'
      else 'Capture the answer when it becomes decision-relevant; do not guess.'
    end::text as suggested_action,
    case when f.certainty_state = 'CONFLICTING' then 78 else 35 end::integer as priority_score
  from public.engagement_facts f
  join public.engagements e on e.id = f.engagement_id
  where f.certainty_state in ('UNKNOWN','CONFLICTING')
    and f.label not ilike 'Automated%'
    and e.archived_at is null
),
pressured_resources as (
  select
    cps.resource_id,
    max(cps.resource_name) as resource_name,
    bool_or(cps.signal_level = 'HIGH') as has_high,
    bool_or(cps.signal_level = 'WATCH') as has_watch,
    count(*)::integer as pressure_count
  from public.capacity_pressure_signals cps
  group by cps.resource_id
),
resource_gaps as (
  select
    'resource-capacity:' || r.id::text as candidate_key,
    'RESOURCE_VERIFICATION'::text as candidate_type,
    'Resource'::text as domain,
    'Verify capacity truth for ' || r.name as title,
    'This resource participates in overlapping demand, but its represented quantity or sourcing is not fully verified.'::text as description,
    null::uuid as engagement_id,
    null::text as engagement_number,
    null::text as engagement_name,
    r.id as resource_id,
    r.name as resource_name,
    r.source_artifact_id,
    null::uuid as source_segment_id,
    coalesce(r.source, 'Inventory evidence') as source_label,
    jsonb_build_object(
      'quantity', r.quantity,
      'quantity_state', r.quantity_state,
      'sourcing_model', r.sourcing_model,
      'pressure_count', pr.pressure_count
    ) as evidence,
    'MEDIUM'::text as confidence,
    case
      when r.quantity_state = 'VERIFIED' and r.sourcing_model <> 'UNKNOWN' then 'KNOWN'
      else 'ESTIMATED'
    end::text as certainty_state,
    case when pr.has_high then 'NOW' when pr.has_watch then 'SOON' else 'LATER' end::text as urgency,
    'REVIEW'::text as lane,
    'Capacity uncertainty matters because overlapping demand could change what Stage Presence can safely promise.'::text as business_impact,
    'Verify only the decision-changing quantity and sourcing facts; do not perform a giant inventory audit.'::text as suggested_action,
    case when pr.has_high then 94 when pr.has_watch then 74 else 44 end::integer as priority_score
  from pressured_resources pr
  join public.resources r on r.id = pr.resource_id
  where r.quantity_state <> 'VERIFIED' or r.sourcing_model = 'UNKNOWN'
),
movement_gaps as (
  select
    'movement:' || m.candidate_key as candidate_key,
    'OPERATING_GAP'::text as candidate_type,
    initcap(lower(m.focus_domain)) as domain,
    m.step_title as title,
    m.why_now as description,
    m.engagement_id,
    m.engagement_number,
    m.engagement_name,
    null::uuid as resource_id,
    null::text as resource_name,
    null::uuid as source_artifact_id,
    null::uuid as source_segment_id,
    'Stage Presence movement engine'::text as source_label,
    m.evidence_basis as evidence,
    case
      when m.certainty_state in ('VERIFIED','KNOWN') then 'HIGH'
      when m.certainty_state = 'ESTIMATED' then 'MEDIUM'
      else 'LOW'
    end::text as confidence,
    m.certainty_state,
    case when m.urgency in ('NOW','SOON') then m.urgency else 'LATER' end::text as urgency,
    'REVIEW'::text as lane,
    'This gap is currently affecting operating continuity or decision quality.'::text as business_impact,
    m.step_title as suggested_action,
    m.priority_score
  from public.engagement_operating_focus_v m
  where m.engagement_focus_rank = 1
    -- A richer evidence-recovery candidate replaces the generic missing-schedule signal.
    and m.reason_code <> 'IMMINENT_JOB_SCHEDULE_NOT_REPRESENTED'
),
coverage_gaps as (
  select
    'coverage:' || c.domain_code as candidate_key,
    case
      when c.domain_code in ('PRICING_AUTHORITY','COST_RATES') then 'BUSINESS_DECISION'
      else 'KNOWLEDGE_GAP'
    end::text as candidate_type,
    c.domain_group as domain,
    c.label as title,
    c.summary as description,
    null::uuid as engagement_id,
    null::text as engagement_number,
    null::text as engagement_name,
    null::uuid as resource_id,
    null::text as resource_name,
    null::uuid as source_artifact_id,
    null::uuid as source_segment_id,
    array_to_string(c.source_objects, ', ') as source_label,
    jsonb_build_object(
      'coverage_state', c.coverage_state,
      'represented_count', c.represented_count,
      'expected_count', c.expected_count,
      'coverage_ratio', c.coverage_ratio
    ) as evidence,
    case when c.coverage_state = 'PARTIAL' then 'MEDIUM' else 'LOW' end::text as confidence,
    case when c.coverage_state = 'PARTIAL' then 'ESTIMATED' else 'UNKNOWN' end::text as certainty_state,
    case
      when c.domain_code = 'COLLECTIONS' then 'NOW'
      when c.domain_code in ('TEAM_ROSTER','JOB_COSTS') then 'SOON'
      else 'LATER'
    end::text as urgency,
    case
      when c.domain_code in ('PRICING_AUTHORITY','COST_RATES') then 'NEEDS_DECISION'
      when c.domain_code = 'RESOURCE_SOURCING' then 'ASK_WHEN_RELEVANT'
      else 'REVIEW'
    end::text as lane,
    c.why_it_matters as business_impact,
    c.evidence_to_produce as suggested_action,
    greatest(15, 110 - c.priority_rank)::integer as priority_score
  from public.economy_reality_coverage_v c
  where c.coverage_state in ('MISSING','PARTIAL')
    and c.priority_rank <= 90
),
candidates as (
  select * from schedule_evidence
  union all select * from unresolved_facts
  union all select * from resource_gaps
  union all select * from movement_gaps
  union all select * from coverage_gaps
),
decorated as (
  select
    c.*,
    d.id as decision_id,
    case
      when d.status = 'DEFERRED'
       and d.deferred_until is not null
       and d.deferred_until <= current_date then 'OPEN'
      else coalesce(d.status, 'OPEN')
    end::text as status,
    case when d.status = 'NEEDS_DECISION' then 'NEEDS_DECISION' else c.lane end::text as effective_lane,
    d.assigned_member_id,
    tm.username as assigned_username,
    tm.display_name as assigned_display_name,
    d.decision_note,
    d.deferred_until,
    d.decision_payload,
    d.decided_by,
    d.created_at as decision_created_at,
    d.updated_at as decision_updated_at
  from candidates c
  left join public.recovery_item_decisions d on d.candidate_key = c.candidate_key
  left join public.team_members tm on tm.id = d.assigned_member_id
)
select
  row_number() over (
    order by
      case status
        when 'OPEN' then 0
        when 'IN_REVIEW' then 1
        when 'NEEDS_DECISION' then 2
        when 'DEFERRED' then 3
        when 'RESOLVED' then 4
        when 'NOT_RELEVANT' then 5
        else 6
      end,
      case urgency when 'NOW' then 0 when 'SOON' then 1 else 2 end,
      priority_score desc,
      candidate_key
  ) as queue_rank,
  candidate_key,
  candidate_type,
  domain,
  title,
  description,
  engagement_id,
  engagement_number,
  engagement_name,
  resource_id,
  resource_name,
  source_artifact_id,
  source_segment_id,
  source_label,
  evidence,
  confidence,
  certainty_state,
  urgency,
  effective_lane as lane,
  business_impact,
  suggested_action,
  priority_score,
  decision_id,
  status,
  assigned_member_id,
  assigned_username,
  assigned_display_name,
  decision_note,
  deferred_until,
  decision_payload,
  decided_by,
  decision_created_at,
  decision_updated_at
from decorated;

comment on view public.recovery_queue_v is
'Derived decision-leverage queue combining recoverable evidence, unresolved truth, capacity verification, operating gaps and selected reality-coverage gaps. Rows are candidates, not canonical truth. Human disposition overlays from recovery_item_decisions.';

revoke all on public.recovery_queue_v from anon;
revoke all on public.recovery_queue_v from public;
grant select on public.recovery_queue_v to authenticated;
