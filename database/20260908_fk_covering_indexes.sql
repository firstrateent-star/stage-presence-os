-- Performance follow-up after Supabase advisor review on 2026-09-08.
-- Adds covering indexes for foreign-key columns flagged by the database linter.
-- The advisor's remaining unused-index notices are expected on a new/mostly empty database.

create index if not exists engagement_facts_created_by_idx on public.engagement_facts (created_by);
create index if not exists engagement_facts_source_artifact_idx on public.engagement_facts (source_artifact_id);
create index if not exists engagement_parties_party_idx on public.engagement_parties (party_id);
create index if not exists engagement_resources_resource_idx on public.engagement_resources (resource_id);
create index if not exists engagements_created_by_idx on public.engagements (created_by);
create index if not exists engagements_next_action_owner_idx on public.engagements (next_action_owner_id);
create index if not exists events_actor_user_idx on public.events (actor_user_id);
create index if not exists resources_source_artifact_idx on public.resources (source_artifact_id);
create index if not exists source_artifacts_created_by_idx on public.source_artifacts (created_by);
