-- Close a real gap in the review-attachments storage bucket: the INSERT and
-- DELETE policies (auth_upload_review_attachments, auth_delete_review_attachments)
-- only checked bucket_id = 'review-attachments', with NO per-user ownership
-- check at all -- unlike the avatars bucket's equivalent policies, which
-- correctly scope to auth.uid() via the object path's folder segment. Any
-- authenticated user could DELETE or overwrite any OTHER user's uploaded
-- review attachment. Confirmed exploitable with a real cross-account test
-- before this fix: Account B successfully deleted an object Account A had
-- just uploaded.
--
-- review-attachments intentionally uses a FLAT path convention with no
-- per-user folder segment (attachments/{timestamp}-{random}.{ext} --
-- documented in lib/supabase/attachments.ts as a deliberate website-parity
-- decision, not an oversight), so the avatars bucket's
-- storage.foldername(name)[1] = auth.uid() pattern can't be reused here
-- without changing that path convention (and the app code that generates
-- it, on both mobile and the website -- out of scope for this fix). Instead
-- this uses storage.objects' own `owner` column, which Supabase Storage
-- already populates with the uploader's auth.uid() automatically on every
-- insert regardless of path structure -- confirmed via a real existing row
-- in the table before writing this policy. No app code changes needed on
-- either platform.

drop policy if exists "auth_upload_review_attachments" on storage.objects;
create policy "auth_upload_review_attachments"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'review-attachments' and auth.uid() = owner);

drop policy if exists "auth_delete_review_attachments" on storage.objects;
create policy "auth_delete_review_attachments"
  on storage.objects for delete to authenticated
  using (bucket_id = 'review-attachments' and auth.uid() = owner);
