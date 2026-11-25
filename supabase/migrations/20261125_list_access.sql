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

-- One list by id: public, unlisted (link holders), or the owner's own private list.
create or replace function public.get_list(p_list uuid)
returns setof public.user_lists
language sql stable security definer set search_path = '' as $$
  select * from public.user_lists l
   where l.id = p_list
     and (l.visibility in ('public', 'unlisted') or l.user_id = auth.uid());
$$;

create or replace function public.get_list_items(p_list uuid)
returns setof public.user_list_items
language sql stable security definer set search_path = '' as $$
  select i.* from public.user_list_items i
   where i.list_id = p_list
     and exists (
       select 1 from public.user_lists l
        where l.id = p_list
          and (l.visibility in ('public', 'unlisted') or l.user_id = auth.uid())
     )
   order by i.rank_order asc;
$$;

-- Lists the caller has saved that they can still open (a list made private drops out).
create or replace function public.get_saved_lists()
returns setof public.user_lists
language sql stable security definer set search_path = '' as $$
  select l.* from public.list_saves s
    join public.user_lists l on l.id = s.list_id
   where s.user_id = auth.uid()
     and (l.visibility in ('public', 'unlisted') or l.user_id = auth.uid())
   order by s.created_at desc;
$$;

grant execute on function public.get_list(uuid) to anon, authenticated;
grant execute on function public.get_list_items(uuid) to anon, authenticated;
grant execute on function public.get_saved_lists() to authenticated;
