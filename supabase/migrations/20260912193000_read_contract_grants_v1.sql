-- Backend Constitution v1: read-contract views are authenticated, read-only API surfaces.
-- RLS remains authoritative through security_invoker on underlying relations.

revoke all on public.engagement_summary_v from anon, authenticated;
revoke all on public.capability_summary_v from anon, authenticated;
revoke all on public.relationship_summary_v from anon, authenticated;
revoke all on public.economy_overview_v from anon, authenticated;
revoke all on public.recovery_queue_v from anon, authenticated;

grant select on public.engagement_summary_v to authenticated;
grant select on public.capability_summary_v to authenticated;
grant select on public.relationship_summary_v to authenticated;
grant select on public.economy_overview_v to authenticated;
grant select on public.recovery_queue_v to authenticated;

comment on view public.engagement_summary_v is
  'Stable authenticated read contract for engagement index surfaces. SELECT-only through Data API.';
comment on view public.capability_summary_v is
  'Stable authenticated Capability read contract. SELECT-only through Data API.';
