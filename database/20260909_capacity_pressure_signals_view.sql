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
  a.required_from_date as engagement_a_from,
  a.required_through_date as engagement_a_through,
  a.requirement_window_state as engagement_a_window_state,
  b.engagement_id as engagement_b_id,
  eb.engagement_number as engagement_b_number,
  eb.name as engagement_b_name,
  eb.commercial_state as engagement_b_commercial_state,
  eb.commitment_state as engagement_b_commitment_state,
  b.required_from_date as engagement_b_from,
  b.required_through_date as engagement_b_through,
  b.requirement_window_state as engagement_b_window_state,
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
  and a.required_from_date is not null
  and a.required_through_date is not null
  and b.required_from_date is not null
  and b.required_through_date is not null
  and daterange(a.required_from_date, a.required_through_date, '[]') && daterange(b.required_from_date, b.required_through_date, '[]')
  and r.category in ('VIDEO','AUDIO','LIGHTING','STAGING','RIGGING','POWER','NETWORKING','TRANSPORT')
  and ea.archived_at is null
  and eb.archived_at is null
  and ea.commercial_state <> 'LOST'
  and eb.commercial_state <> 'LOST'
  and ea.commitment_state <> 'CANCELLED'
  and eb.commitment_state <> 'CANCELLED';

comment on view public.capacity_pressure_signals is 'Derived early-warning signals from overlapping configured resource requirement windows. This view does not represent holds, reservations, or confirmed double bookings.';
