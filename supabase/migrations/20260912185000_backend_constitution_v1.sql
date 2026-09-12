-- Stage Presence OS backend constitution v1
-- Non-destructive hardening before the frontend rebuild.

-- Canonical movement lives in work_items. These legacy constraints required
-- duplicate waiting/blocker context on engagements and could reject the
-- canonical write path even when a valid Work record carried the context.
alter table public.engagements
  drop constraint if exists waiting_requires_context,
  drop constraint if exists blocked_requires_reason;

comment on column public.engagements.next_action is
  'Compatibility/import field. New operating movement truth belongs in public.work_items.';
comment on column public.engagements.next_action_at is
  'Compatibility/import field. New due/follow-up truth belongs in public.work_items.';
comment on column public.engagements.next_action_owner_id is
  'Compatibility/import field. New Work ownership belongs in public.work_items.owner_member_id.';
comment on column public.engagements.waiting_on is
  'Compatibility/import field. Waiting context belongs in public.work_items.waiting_on.';
comment on column public.engagements.blocked_reason is
  'Compatibility/import field. Blocker context belongs in public.work_items / why_now and owning domain evidence.';
comment on column public.engagements.venue_name is
  'Compatibility/import field. Canonical venue identity belongs in public.locations + public.engagement_locations.';
comment on column public.engagements.venue_address is
  'Compatibility/import field. Canonical venue address belongs in public.locations + public.engagement_locations.';
comment on column public.engagements.estimated_value is
  'Compatibility/import estimate. Commercial/economic evidence belongs in commercial documents and financial/economic evidence.';
comment on column public.engagements.default_resource_from_date is
  'Compatibility/default planning field. Specific resource windows belong in engagement_resources / resource_commitments.';
comment on column public.engagements.default_resource_through_date is
  'Compatibility/default planning field. Specific resource windows belong in engagement_resources / resource_commitments.';
comment on column public.engagements.default_resource_window_state is
  'Compatibility/default planning field. Specific certainty belongs with the resource requirement/commitment.';
comment on column public.engagements.default_planned_sourcing_model is
  'Compatibility/default planning field. Specific sourcing belongs with the resource requirement/commitment.';

-- Stable role helper for future domain-by-domain RLS hardening.
-- This migration does not change existing policies yet.
create or replace function private.has_app_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_app_member()
    and coalesce(private.current_app_role() = any(allowed_roles), false);
$$;

revoke all on function private.has_app_role(text[]) from public;
grant execute on function private.has_app_role(text[]) to authenticated;
