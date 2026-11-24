-- Shelves: the watchlist and reading list become shelves people can share.
--
-- • Film and TV shelves are filtered views of the existing watchlist
--   (saved_items, list_type 'watchlist', media_type 'movie' / 'tv'); the reading
--   shelf is list_type 'reading_shelf'. No entries move.
-- • Each of those three shelves has its own visibility: private (default, so
--   nothing already saved becomes visible), unlisted (anyone with the link,
--   which carries a per-user token), or public (shown on the profile).
-- • Owners can put a shelf in their own order. Until they do, the order stays
--   newest first exactly as today.
-- Custom lists keep their existing table, visibility, ranking, notes, likes
-- and saves.

-- ── Visibility ──────────────────────────────────────────────────────────────
create table if not exists public.shelf_settings (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  film_visibility    text not null default 'private' check (film_visibility in ('public', 'unlisted', 'private')),
  tv_visibility      text not null default 'private' check (tv_visibility in ('public', 'unlisted', 'private')),
  reading_visibility text not null default 'private' check (reading_visibility in ('public', 'unlisted', 'private')),
  share_token        uuid not null default gen_random_uuid(),
  updated_at         timestamptz not null default now()
);
alter table public.shelf_settings enable row level security;
drop policy if exists "Owners manage their shelf settings" on public.shelf_settings;
create policy "Owners manage their shelf settings" on public.shelf_settings
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Which shelf a saved item sits on.
create or replace function public.saved_item_shelf(p_list_type text, p_media_type text)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_list_type = 'reading_shelf' then 'reading'
    when p_media_type = 'tv' then 'tv'
    else 'film'
  end;
$$;

-- A shelf's visibility; private when the owner never changed it.
create or replace function public.shelf_visibility(p_user uuid, p_shelf text)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((
    select case p_shelf
      when 'film' then s.film_visibility
      when 'tv' then s.tv_visibility
      when 'reading' then s.reading_visibility
    end
    from public.shelf_settings s where s.user_id = p_user
  ), 'private');
$$;

-- Public shelves are readable by anyone; unlisted ones only through
-- get_shelf_items with the token; private ones only by the owner (existing policy).
drop policy if exists "Public shelves are readable" on public.saved_items;
create policy "Public shelves are readable" on public.saved_items
  for select using (public.shelf_visibility(user_id, public.saved_item_shelf(list_type, media_type)) = 'public');

-- ── Order ───────────────────────────────────────────────────────────────────
alter table public.saved_items add column if not exists shelf_position double precision;
create index if not exists saved_items_shelf_order_idx on public.saved_items (user_id, list_type, shelf_position);

-- Once someone has arranged a shelf, new titles go to the front, as they do today.
create or replace function public.saved_items_place_new()
returns trigger language plpgsql set search_path = '' as $$
declare v_min double precision;
begin
  if new.shelf_position is null then
    select min(shelf_position) into v_min from public.saved_items
     where user_id = new.user_id and list_type = new.list_type and shelf_position is not null;
    if v_min is not null then new.shelf_position := v_min - 1; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists saved_items_place_new on public.saved_items;
create trigger saved_items_place_new before insert on public.saved_items
  for each row execute function public.saved_items_place_new();

-- Save an arrangement: p_ids is the whole shelf, in the new order.
create or replace function public.reorder_shelf(p_list_type text, p_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  update public.saved_items s
     set shelf_position = o.pos
    from unnest(p_ids) with ordinality as o(id, pos)
   where s.id = o.id and s.user_id = auth.uid() and s.list_type = p_list_type;
end;
$$;

-- ── Reading a shelf ─────────────────────────────────────────────────────────
-- One call for the owner, a public shelf, or an unlisted shelf with its link token.
create or replace function public.get_shelf_items(p_user uuid, p_shelf text, p_token uuid default null)
returns setof public.saved_items language plpgsql stable security definer set search_path = '' as $$
declare
  v_vis text := public.shelf_visibility(p_user, p_shelf);
  v_ok boolean;
begin
  v_ok := p_user = auth.uid()
       or v_vis = 'public'
       or (v_vis = 'unlisted' and p_token is not null
           and exists (select 1 from public.shelf_settings s where s.user_id = p_user and s.share_token = p_token));
  if not v_ok then return; end if;
  return query
    select * from public.saved_items s
     where s.user_id = p_user
       and public.saved_item_shelf(s.list_type, s.media_type) = p_shelf
     order by s.shelf_position asc nulls last, s.added_at desc;
end;
$$;

-- The system shelves a profile shows: public ones (and all of them for the owner).
create or replace function public.profile_shelves(p_user uuid)
returns table (shelf text, visibility text, item_count integer)
language sql stable security definer set search_path = '' as $$
  select k.shelf, public.shelf_visibility(p_user, k.shelf),
         (select count(*)::int from public.saved_items s
           where s.user_id = p_user and public.saved_item_shelf(s.list_type, s.media_type) = k.shelf)
    from (values ('film'), ('tv'), ('reading')) as k(shelf)
   where p_user = auth.uid() or public.shelf_visibility(p_user, k.shelf) = 'public';
$$;

revoke all on function public.shelf_visibility(uuid, text) from public;
grant execute on function public.shelf_visibility(uuid, text) to anon, authenticated;
revoke all on function public.reorder_shelf(text, uuid[]) from public, anon;
grant execute on function public.reorder_shelf(text, uuid[]) to authenticated;
revoke all on function public.get_shelf_items(uuid, text, uuid) from public;
grant execute on function public.get_shelf_items(uuid, text, uuid) to anon, authenticated;
revoke all on function public.profile_shelves(uuid) from public;
grant execute on function public.profile_shelves(uuid) to anon, authenticated;
