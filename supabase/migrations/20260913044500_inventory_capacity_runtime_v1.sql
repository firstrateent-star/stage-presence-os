create table if not exists public.resource_inventory_verifications (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  verified_quantity numeric not null check (verified_quantity >= 0),
  serviceable_quantity numeric not null check (serviceable_quantity >= 0 and serviceable_quantity <= verified_quantity),
  location_id uuid references public.locations(id) on delete set null,
  counted_at timestamptz not null default now(),
  counted_by uuid references auth.users(id) on delete set null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists resource_inventory_verifications_resource_idx on public.resource_inventory_verifications(resource_id, counted_at desc);
alter table public.resource_inventory_verifications enable row level security;
create policy resource_inventory_verifications_member_all on public.resource_inventory_verifications for all using ((select private.is_app_member())) with check ((select private.is_app_member()));
grant select, insert, update, delete on public.resource_inventory_verifications to authenticated;

create view public.resource_inventory_current_v with (security_invoker = true) as
with latest as (
  select distinct on (v.resource_id) v.*, l.name as location_name
  from public.resource_inventory_verifications v
  left join public.locations l on l.id = v.location_id
  order by v.resource_id, v.counted_at desc, v.created_at desc
)
select r.id resource_id, r.name resource_name, r.category, r.sourcing_model,
       r.quantity catalog_quantity, r.quantity_state, r.condition_state,
       x.id verification_id, x.verified_quantity, x.serviceable_quantity,
       greatest(coalesce(x.verified_quantity,0)-coalesce(x.serviceable_quantity,0),0) unavailable_quantity,
       x.location_id, x.location_name, x.counted_at, x.counted_by,
       case when r.sourcing_model <> 'OWNED' then 'NOT_OWNED'
            when x.id is null then 'UNVERIFIED'
            when x.verified_quantity = x.serviceable_quantity then 'VERIFIED_SERVICEABLE'
            when x.serviceable_quantity = 0 and x.verified_quantity > 0 then 'VERIFIED_OUT_OF_SERVICE'
            else 'VERIFIED_PARTIAL_SERVICE' end inventory_authority_state
from public.resources r left join latest x on x.resource_id=r.id where r.active=true;
grant select on public.resource_inventory_current_v to authenticated, service_role;

create view public.resource_capacity_position_v with (security_invoker = true) as
with c as (
  select resource_id,
         count(*) filter (where commitment_state='CONFIRMED')::int confirmed_commitment_count,
         coalesce(sum(quantity) filter (where commitment_state='CONFIRMED' and from_date<=current_date and through_date>=current_date),0)::numeric committed_quantity_today
  from public.resource_commitments group by resource_id
)
select i.*, coalesce(c.confirmed_commitment_count,0) confirmed_commitment_count,
       coalesce(c.committed_quantity_today,0) committed_quantity_today,
       case when i.sourcing_model<>'OWNED' or i.verification_id is null then null else greatest(i.serviceable_quantity-coalesce(c.committed_quantity_today,0),0) end available_quantity_today,
       case when i.sourcing_model<>'OWNED' then 'EXTERNAL_CAPACITY'
            when i.verification_id is null then 'CAPACITY_UNVERIFIED'
            when coalesce(c.committed_quantity_today,0)>i.serviceable_quantity then 'CAPACITY_CONFLICT'
            when coalesce(c.committed_quantity_today,0)=i.serviceable_quantity and i.serviceable_quantity>0 then 'FULLY_COMMITTED_TODAY'
            else 'CAPACITY_AVAILABLE' end capacity_state
from public.resource_inventory_current_v i left join c on c.resource_id=i.resource_id;
grant select on public.resource_capacity_position_v to authenticated, service_role;
