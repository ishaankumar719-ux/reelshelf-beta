-- Real regression found while auditing Continue Watching's data path (not
-- caused by that feature, but discovered here): "Public can view shared
-- diary entries"'s EXISTS subquery reads FROM profiles directly to check
-- username IS NOT NULL. Earlier this session, public.profiles' SELECT
-- policy was correctly restricted to auth.uid() = id only (closing a real
-- profiles.email exposure). Side effect, confirmed with a real cross-account
-- test: that EXISTS subquery can no longer see ANY other user's profiles
-- row, so it now always evaluates false for a cross-user caller -- this
-- "public" diary policy has been silently dead ever since, breaking real,
-- legitimate features that read another user's diary_entries: Friends
-- Activity, public profile pages, and other users' reviews on Movie Detail.
--
-- Fix: point the EXISTS check at public.public_profiles instead of the base
-- table. That view already exists specifically for cross-user reads, is
-- already granted to anon/authenticated, already excludes email, and
-- already only contains rows where username IS NOT NULL -- so the extra
-- null-check is redundant against it and dropped. No change to profiles'
-- own (correctly tightened) policy, no re-exposure of email, no weakening
-- of anything -- this only restores the diary-entries visibility that was
-- always intended to be public.
drop policy if exists "Public can view shared diary entries" on public.diary_entries;

create policy "Public can view shared diary entries"
  on public.diary_entries for select
  using (
    exists (
      select 1 from public.public_profiles
      where public_profiles.id = diary_entries.user_id
    )
  );
