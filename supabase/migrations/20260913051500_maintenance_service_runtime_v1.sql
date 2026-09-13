create table if not exists public.resource_maintenance_issues (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  source_inventory_verification_id uuid references public.resource_inventory_verifications(id) on delete set null,
  title text not null,
  status text not null default 'OPEN' check (status in ('OPEN','DIAGNOSING','WAITING_PARTS','SCHEDULED','IN_REPAIR','READY_FOR_VERIFY','RESOLVED','CANCELLED')),
  severity text not null default 'MEDIUM' check (severity in ('LOW','MEDIUM','HIGH','CRITICAL')),
  affected_quantity numeric not null check (affected_quantity > 0),
  owner_team_member_id uuid references public.team_members(id) on delete set null,
  vendor_party_id uuid references public.parties(id) on delete set null,
  diagnosis text,
  resolution text,
  discovered_at timestamptz not null default now(),
  target_return_at timestamptz,
  resolved_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists resource_maintenance_issues_resource_idx on public.resource_maintenance_issues(resource_id,status);
alter table public.resource_maintenance_issues enable row level security;
create policy resource_maintenance_issues_member_all on public.resource_maintenance_issues for all using ((select private.is_app_member())) with check ((select private.is_app_member()));
grant select,insert,update,delete on public.resource_maintenance_issues to authenticated;

alter table public.company_cost_items add column if not exists maintenance_issue_id uuid references public.resource_maintenance_issues(id) on delete set null;
create index if not exists company_cost_items_maintenance_issue_idx on public.company_cost_items(maintenance_issue_id);

create view public.resource_maintenance_queue_v with (security_invoker = true) as
select m.id maintenance_issue_id,m.resource_id,r.name resource_name,r.category,m.title,m.status,m.severity,m.affected_quantity,
       m.owner_team_member_id,tm.display_name owner_name,m.vendor_party_id,coalesce(p.organization_name,p.name) vendor_name,
       m.diagnosis,m.resolution,m.discovered_at,m.target_return_at,m.resolved_at,m.source_inventory_verification_id,
       coalesce(sum(c.amount) filter (where c.cost_state='ESTIMATE'),0)::numeric estimated_cost,
       coalesce(sum(c.amount) filter (where c.cost_state='COMMITTED'),0)::numeric committed_cost,
       coalesce(sum(c.amount) filter (where c.cost_state='ACTUAL'),0)::numeric actual_cost,
       case when m.status in ('RESOLVED','CANCELLED') then 'CLOSED'
            when m.target_return_at is not null and m.target_return_at < now() then 'OVERDUE'
            when m.severity in ('HIGH','CRITICAL') then 'PRIORITY'
            else 'OPEN' end service_attention_state
from public.resource_maintenance_issues m
join public.resources r on r.id=m.resource_id
left join public.team_members tm on tm.id=m.owner_team_member_id
left join public.parties p on p.id=m.vendor_party_id
left join public.company_cost_items c on c.maintenance_issue_id=m.id
where m.status<>'CANCELLED'
group by m.id,r.name,r.category,tm.display_name,p.organization_name,p.name;
grant select on public.resource_maintenance_queue_v to authenticated,service_role;

create view public.resource_service_position_v with (security_invoker = true) as
select r.id resource_id,r.name resource_name,
       count(m.id) filter (where m.status not in ('RESOLVED','CANCELLED'))::int open_issue_count,
       coalesce(sum(m.affected_quantity) filter (where m.status not in ('RESOLVED','CANCELLED')),0)::numeric open_affected_quantity,
       max(m.severity) filter (where m.status not in ('RESOLVED','CANCELLED')) highest_open_severity,
       case when count(m.id) filter (where m.status not in ('RESOLVED','CANCELLED'))=0 then 'SERVICE_CLEAR'
            when bool_or(m.severity='CRITICAL' and m.status not in ('RESOLVED','CANCELLED')) then 'CRITICAL_SERVICE'
            else 'SERVICE_REQUIRED' end service_state
from public.resources r left join public.resource_maintenance_issues m on m.resource_id=r.id
where r.active=true
group by r.id,r.name;
grant select on public.resource_service_position_v to authenticated,service_role;