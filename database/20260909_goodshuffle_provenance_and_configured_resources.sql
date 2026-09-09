alter table public.engagement_resources
  drop constraint if exists engagement_resources_relationship_check;

alter table public.engagement_resources
  add constraint engagement_resources_relationship_check
  check (relationship = any (array['CUSTOMER_REQUESTED','CONSIDERING','RECOMMENDED','CONFIGURED']));

alter table public.engagement_resources
  add column if not exists source_artifact_id uuid references public.source_artifacts(id) on delete set null;

create index if not exists engagement_resources_source_artifact_idx on public.engagement_resources(source_artifact_id);

alter table public.engagement_parties
  add column if not exists source_artifact_id uuid references public.source_artifacts(id) on delete set null;

create index if not exists engagement_parties_source_artifact_idx on public.engagement_parties(source_artifact_id);
