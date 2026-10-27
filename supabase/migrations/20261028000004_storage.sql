-- =============================================================================
-- MediCare+  ·  04 · STORAGE BUCKETS & POLICIES
--   medical-reports  (private)  path: {patient_id}/{uuid}-{filename}
--   avatars          (public)   path: {user_id}/avatar-{timestamp}.{ext}
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('medical-reports', 'medical-reports', false, 10485760,
     array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']),
  ('avatars', 'avatars', true, 2097152,
     array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---- medical-reports -------------------------------------------------------
drop policy if exists "reports bucket: read" on storage.objects;
create policy "reports bucket: read"
  on storage.objects for select to authenticated
  using (bucket_id = 'medical-reports' and public.can_access_patient_folder((storage.foldername(name))[1]));

drop policy if exists "reports bucket: upload" on storage.objects;
create policy "reports bucket: upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'medical-reports' and public.can_access_patient_folder((storage.foldername(name))[1]));

drop policy if exists "reports bucket: delete" on storage.objects;
create policy "reports bucket: delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'medical-reports' and (owner_id = auth.uid()::text or public.is_admin()));

-- ---- avatars ---------------------------------------------------------------
drop policy if exists "avatars: public read" on storage.objects;
create policy "avatars: public read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars');

drop policy if exists "avatars: upload own" on storage.objects;
create policy "avatars: upload own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

drop policy if exists "avatars: update own" on storage.objects;
create policy "avatars: update own"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

drop policy if exists "avatars: delete own" on storage.objects;
create policy "avatars: delete own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
