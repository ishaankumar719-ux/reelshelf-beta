-- Close a real RLS gap: "Anyone can read list_saves" (qual: true, role:
-- public) let any caller -- authenticated or fully anonymous -- read every
-- user_id/list_id row in list_saves directly, i.e. see exactly which lists
-- any given user has personally saved. fetchSavedLists() in
-- lib/supabase/lists.ts is only ever called with the CURRENTLY signed-in
-- user's own id (app/(tabs)/lists.tsx), so nothing legitimate needs
-- cross-user row access to list_saves.
--
-- The one real caller that DID need to read other users' rows was
-- recalculateListEngagement() (lib/supabase/lists.ts), which computes
-- save_count/like_count/trending_score via a live client-side count(*)
-- query scoped only by list_id (not user_id), then hands those numbers to
-- update_list_engagement_counts() to persist onto user_lists. Naively
-- tightening list_saves' SELECT policy would have made that count silently
-- undercount to just the calling user's own save, corrupting every list's
-- publicly-displayed save_count/trending_score. Fixed by moving the count
-- computation itself inside update_list_engagement_counts (SECURITY
-- DEFINER, so it keeps reading true counts regardless of caller-side RLS)
-- instead of trusting client-supplied count parameters. This also closes a
-- separate, previously-unrelated gap: that RPC was EXECUTE-granted to
-- anon/authenticated with no ownership check at all, so any caller could
-- previously pass arbitrary like_count/save_count/trending_score values for
-- any list_id and corrupt its public engagement numbers. The function
-- signature is left unchanged (still accepts the same params) so existing
-- client call sites need zero code changes -- the passed-in values are
-- simply superseded by the server-computed real counts now.

create or replace function public.update_list_engagement_counts(
  p_list_id uuid,
  p_like_count integer,
  p_save_count integer,
  p_trending_score numeric
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_like_count integer;
  v_save_count integer;
  v_has_recent_activity boolean;
  v_trending_score numeric;
begin
  select count(*) into v_like_count from public.list_likes where list_id = p_list_id;
  select count(*) into v_save_count from public.list_saves where list_id = p_list_id;

  select
    exists (select 1 from public.list_likes where list_id = p_list_id and created_at >= now() - interval '7 days')
    or exists (select 1 from public.list_saves where list_id = p_list_id and created_at >= now() - interval '7 days')
  into v_has_recent_activity;

  v_trending_score := v_like_count * 2 + v_save_count * 3 + (case when v_has_recent_activity then 10 else 0 end);

  update public.user_lists
  set like_count = v_like_count, save_count = v_save_count, trending_score = v_trending_score
  where id = p_list_id;
end;
$function$;

drop policy if exists "Anyone can read list_saves" on public.list_saves;

create policy "Users can view own saved lists"
  on public.list_saves for select
  using (auth.uid() = user_id);
