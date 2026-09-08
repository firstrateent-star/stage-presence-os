-- Stage Presence OS private source-evidence storage.
-- Applied to Supabase project stage-presence-os (yaojcuvgtlncytujfxef) on 2026-09-08.
--
-- Original source images are evidence. Active Stage Presence members may read
-- them and may upload only inside their own user-id top-level folder. Browser
-- clients are deliberately not granted UPDATE or DELETE policies on originals.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'source-artifacts',
  'source-artifacts',
  false,
  15728640,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "source_artifacts_members_can_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'source-artifacts'
  and private.is_app_member()
);

create policy "source_artifacts_members_can_upload_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'source-artifacts'
  and private.is_app_member()
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
