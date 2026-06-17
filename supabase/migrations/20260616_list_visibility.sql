-- Adds a 3-state visibility column to user_lists (public/private/unlisted),
-- replacing the boolean is_public as the source of truth for list access.
-- is_public is left in place (deprecated, unread by app code) rather than
-- dropped, since dropping a column isn't reversible.
alter table user_lists
  add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'private', 'unlisted'));

-- Backfill from the existing is_public flag rather than defaulting every
-- row to 'public' (the literal "where visibility is null" backfill is a
-- no-op given the NOT NULL DEFAULT above, and would have silently exposed
-- any currently-private list as public).
update user_lists set visibility = 'private' where is_public = false;

-- Unlisted lists are readable like public ones at the RLS layer (RLS can't
-- distinguish "direct ID lookup" from "list query" — that restriction is
-- enforced by the discovery/profile queries never requesting visibility =
-- 'unlisted' rows). Private lists remain owner-only via the existing
-- "Allow full access to list owners" / "Allow full item access to list
-- owners" policies, which are untouched.
drop policy if exists "Allow public read access to public lists" on public.user_lists;
create policy "Allow visibility-based read access to lists"
on public.user_lists for select
using (visibility in ('public', 'unlisted'));

drop policy if exists "Allow public read access to public list items" on public.user_list_items;
create policy "Allow visibility-based read access to list items"
on public.user_list_items for select
using (
  exists (
    select 1 from public.user_lists
    where user_lists.id = user_list_items.list_id
      and user_lists.visibility in ('public', 'unlisted')
  )
);
