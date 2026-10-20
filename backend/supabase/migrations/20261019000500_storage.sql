-- =============================================================================
-- 0500 Private storage bucket for request images.
--
-- Upload flow (no service_role key involved):
--   1. API generates a random object key {uid}/{request_id}/{uuid}.{ext}
--   2. API calls public.attach_request_image() as the citizen (registers path)
--   3. API asks Storage for a signed upload URL using the citizen's JWT; Storage
--      evaluates the INSERT policy below at that moment
--   4. Browser PUTs the file to the signed URL
-- Viewing always goes through short-lived signed URLs (bucket is private).
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'request-images',
  'request-images',
  false,
  5242880, -- 5 MB, enforced by the Storage server regardless of client claims
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Upload only into your own folder, only to the exact path registered on your
-- own request, only with a randomized name and an allowed extension, and only
-- with a verified email. Registering first means a citizen cannot use the
-- bucket as free general-purpose file hosting.
create policy request_images_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'request-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
    and (select public.is_email_verified())
    and exists (
      select 1
        from public.service_requests r
       where r.citizen_id = (select auth.uid())
         and r.image_path = storage.objects.name
    )
  );

-- Read your own files; admins read all files in the bucket.
create policy request_images_select_own_or_admin on storage.objects
  for select to authenticated
  using (
    bucket_id = 'request-images'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_admin())
    )
  );

-- No UPDATE / DELETE policies: uploaded evidence is immutable for clients.
