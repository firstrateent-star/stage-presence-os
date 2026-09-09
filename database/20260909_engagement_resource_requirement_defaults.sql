alter table public.engagements
  add column if not exists default_resource_from_date date,
  add column if not exists default_resource_through_date date,
  add column if not exists default_resource_window_state text not null default 'UNKNOWN',
  add column if not exists default_planned_sourcing_model text not null default 'UNKNOWN';

alter table public.engagements
  drop constraint if exists engagements_default_resource_window_state_check;
alter table public.engagements
  add constraint engagements_default_resource_window_state_check
  check (default_resource_window_state in ('UNKNOWN','INFERRED_FROM_EVENT','ESTIMATED','KNOWN','VERIFIED'));

alter table public.engagements
  drop constraint if exists engagements_default_planned_sourcing_model_check;
alter table public.engagements
  add constraint engagements_default_planned_sourcing_model_check
  check (default_planned_sourcing_model in ('OWNED','SUBCONTRACTED','PARTNER','VENUE','UNKNOWN'));

alter table public.engagements
  drop constraint if exists engagements_default_resource_window_order_check;
alter table public.engagements
  add constraint engagements_default_resource_window_order_check
  check (default_resource_from_date is null or default_resource_through_date is null or default_resource_through_date >= default_resource_from_date);

comment on column public.engagements.default_resource_from_date is 'Engagement-level default earliest resource requirement date. Configured-resource-specific values override this default. This is not a hold or reservation.';
comment on column public.engagements.default_resource_through_date is 'Engagement-level default latest resource requirement date. Configured-resource-specific values override this default. This is not a hold or reservation.';
comment on column public.engagements.default_resource_window_state is 'Epistemic state for the Engagement-level default resource requirement window.';
comment on column public.engagements.default_planned_sourcing_model is 'Engagement-level default sourcing expectation inherited by configured resources unless a resource-specific override is represented.';

-- Promote repeated imported event-date inference to the Engagement scope.
update public.engagements e
set default_resource_from_date = coalesce(e.event_start_date, e.event_start::date),
    default_resource_through_date = coalesce(e.event_end_date, e.event_end::date, e.event_start_date, e.event_start::date),
    default_resource_window_state = 'INFERRED_FROM_EVENT'
where e.default_resource_window_state = 'UNKNOWN'
  and coalesce(e.event_start_date, e.event_start::date) is not null
  and exists (
    select 1
    from public.engagement_resources er
    where er.engagement_id = e.id
      and er.relationship = 'CONFIGURED'
      and er.requirement_window_state = 'INFERRED_FROM_EVENT'
      and er.required_from_date = coalesce(e.event_start_date, e.event_start::date)
      and er.required_through_date = coalesce(e.event_end_date, e.event_end::date, e.event_start_date, e.event_start::date)
  );

-- Collapse only exact duplicate imported event inference. Resource-level fields remain reserved for actual overrides/exceptions.
update public.engagement_resources er
set required_from_date = null,
    required_through_date = null,
    requirement_window_state = 'UNKNOWN'
from public.engagements e
where er.engagement_id = e.id
  and er.relationship = 'CONFIGURED'
  and er.requirement_window_state = 'INFERRED_FROM_EVENT'
  and er.required_from_date = coalesce(e.event_start_date, e.event_start::date)
  and er.required_through_date = coalesce(e.event_end_date, e.event_end::date, e.event_start_date, e.event_start::date)
  and e.default_resource_window_state = 'INFERRED_FROM_EVENT'
  and e.default_resource_from_date = er.required_from_date
  and e.default_resource_through_date = er.required_through_date;

create or replace view public.capacity_pressure_signals
with (security_invoker = true)
as
select
  a.resource_id,
  r.name as resource_name,
  r.category as resource_category,
  r.quantity as library_quantity,
  r.quantity_state,
  a.engagement_id as engagement_a_id,
  ea.engagement_number as engagement_a_number,
  ea.name as engagement_a_name,
  ea.commercial_state as engagement_a_commercial_state,
  ea.commitment_state as engagement_a_commitment_state,
  coalesce(a.required_from_date, ea.default_resource_from_date) as engagement_a_from,
  coalesce(a.required_through_date, ea.default_resource_through_date) as engagement_a_through,
  case when a.required_from_date is not null or a.required_through_date is not null or a.requirement_window_state <> 'UNKNOWN'
    then a.requirement_window_state else ea.default_resource_window_state end as engagement_a_window_state,
  b.engagement_id as engagement_b_id,
  eb.engagement_number as engagement_b_number,
  eb.name as engagement_b_name,
  eb.commercial_state as engagement_b_commercial_state,
  eb.commitment_state as engagement_b_commitment_state,
  coalesce(b.required_from_date, eb.default_resource_from_date) as engagement_b_from,
  coalesce(b.required_through_date, eb.default_resource_through_date) as engagement_b_through,
  case when b.required_from_date is not null or b.required_through_date is not null or b.requirement_window_state <> 'UNKNOWN'
    then b.requirement_window_state else eb.default_resource_window_state end as engagement_b_window_state,
  case
    when ea.commitment_state in ('SIGNED','DEPOSIT_PENDING','CONFIRMED')
     and eb.commitment_state in ('SIGNED','DEPOSIT_PENDING','CONFIRMED') then 'HIGH'
    when ea.commitment_state in ('SIGNED','DEPOSIT_PENDING','CONFIRMED')
      or eb.commitment_state in ('SIGNED','DEPOSIT_PENDING','CONFIRMED') then 'WATCH'
    else 'INFO'
  end as signal_level
from public.engagement_resources a
join public.engagement_resources b
  on b.resource_id = a.resource_id
 and b.id > a.id
join public.resources r on r.id = a.resource_id
join public.engagements ea on ea.id = a.engagement_id
join public.engagements eb on eb.id = b.engagement_id
where a.relationship = 'CONFIGURED'
  and b.relationship = 'CONFIGURED'
  and coalesce(a.required_from_date, ea.default_resource_from_date) is not null
  and coalesce(a.required_through_date, ea.default_resource_through_date) is not null
  and coalesce(b.required_from_date, eb.default_resource_from_date) is not null
  and coalesce(b.required_through_date, eb.default_resource_through_date) is not null
  and daterange(coalesce(a.required_from_date, ea.default_resource_from_date), coalesce(a.required_through_date, ea.default_resource_through_date), '[]')
      && daterange(coalesce(b.required_from_date, eb.default_resource_from_date), coalesce(b.required_through_date, eb.default_resource_through_date), '[]')
  and r.category in ('VIDEO','AUDIO','LIGHTING','STAGING','RIGGING','POWER','NETWORKING','TRANSPORT')
  and ea.archived_at is null
  and eb.archived_at is null
  and ea.commercial_state <> 'LOST'
  and eb.commercial_state <> 'LOST'
  and ea.commitment_state <> 'CANCELLED'
  and eb.commitment_state <> 'CANCELLED';

comment on view public.capacity_pressure_signals is 'Derived early-warning signals from effective configured-resource requirement windows. Resource-specific overrides take precedence over Engagement defaults. This view does not represent holds, reservations, or confirmed double bookings.';
