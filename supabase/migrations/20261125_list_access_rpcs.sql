-- Step 1 of 2 (additive, safe for build 27): by-id access to lists through RPCs.
-- The web and build 28 open lists with these. Nothing existing changes, so build 27
-- keeps working exactly as today. Step 2 (20261126_list_access_tighten.sql) removes
-- table reads of other people's unlisted lists and must wait until build 28 is
-- available to testers.

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
