alter table public.engagement_resources
  add column if not exists required_from_date date,
  add column if not exists required_through_date date,
  add column if not exists requirement_window_state text not null default 'UNKNOWN',
  add column if not exists planned_sourcing_model text not null default 'UNKNOWN';

alter table public.engagement_resources
  drop constraint if exists engagement_resources_requirement_window_state_check;
alter table public.engagement_resources
  add constraint engagement_resources_requirement_window_state_check
  check (requirement_window_state in ('UNKNOWN','INFERRED_FROM_EVENT','ESTIMATED','KNOWN','VERIFIED'));

alter table public.engagement_resources
  drop constraint if exists engagement_resources_planned_sourcing_model_check;
alter table public.engagement_resources
  add constraint engagement_resources_planned_sourcing_model_check
  check (planned_sourcing_model in ('OWNED','SUBCONTRACTED','PARTNER','VENUE','UNKNOWN'));

alter table public.engagement_resources
  drop constraint if exists engagement_resources_requirement_window_order_check;
alter table public.engagement_resources
  add constraint engagement_resources_requirement_window_order_check
  check (required_from_date is null or required_through_date is null or required_through_date >= required_from_date);

create index if not exists engagement_resources_requirement_window_idx
  on public.engagement_resources(resource_id, required_from_date, required_through_date)
  where required_from_date is not null and required_through_date is not null;

comment on column public.engagement_resources.required_from_date is 'Earliest date this configured resource is believed to be required for the Engagement. This is not a hold or reservation.';
comment on column public.engagement_resources.required_through_date is 'Latest date this configured resource is believed to be required for the Engagement. This is not a hold or reservation.';
comment on column public.engagement_resources.requirement_window_state is 'Epistemic state of the resource requirement window. INFERRED_FROM_EVENT means event dates were used only as a provisional pressure window.';
comment on column public.engagement_resources.planned_sourcing_model is 'Engagement-specific expected source of this requirement; does not prove availability or commitment.';
