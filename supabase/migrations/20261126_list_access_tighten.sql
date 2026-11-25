-- Step 2 of 2: run only after build 28 is "Ready to Test" for every TestFlight group.
-- Requires 20261125_list_access_rpcs.sql.
--
-- Unlisted lists must open by direct link but must not be discoverable.
--
-- Before: user_lists / user_list_items were readable whenever visibility was
-- 'public' OR 'unlisted', so `select * from user_lists where visibility = 'unlisted'`
-- (or the REST equivalent) listed everyone's unlisted lists. list_likes was readable
-- by anyone, which also leaked unlisted list ids.
--
-- After: table reads by other people are limited to public lists. Opening an
-- unlisted list goes through get_list / get_list_items, which need the exact id.
-- Owners keep full access through the existing owner policies.
--
-- Build 27 limitation: build 27 opens lists by reading user_lists directly, so after
-- this it shows "not found" for other people's unlisted lists and drops them from
-- Saved Lists. Owners, public lists and private lists are unaffected.
--
-- ALTER POLICY is used (not drop/create) so the change is in-place and reversible.

alter policy "Allow visibility-based read access to lists" on public.user_lists
  using (visibility = 'public');

alter policy "Allow visibility-based read access to list items" on public.user_list_items
  using (exists (
    select 1 from public.user_lists l
     where l.id = user_list_items.list_id and l.visibility = 'public'
  ));

alter policy "Anyone can read list_likes" on public.list_likes
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.user_lists l
       where l.id = list_likes.list_id
         and (l.visibility = 'public' or l.user_id = auth.uid())
    )
  );


-- Rollback (restores today's behaviour, including the enumeration leak):
--   alter policy "Allow visibility-based read access to lists" on public.user_lists
--     using (visibility = any (array['public','unlisted']));
--   alter policy "Allow visibility-based read access to list items" on public.user_list_items
--     using (exists (select 1 from public.user_lists where user_lists.id = user_list_items.list_id
--                    and user_lists.visibility = any (array['public','unlisted'])));
--   alter policy "Anyone can read list_likes" on public.list_likes using (true);
