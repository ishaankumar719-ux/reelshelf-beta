-- One stored id per title on watchlists, reading lists and custom lists.
--
-- The problem: TMDB titles were stored as both "tmdb-123" (iPhone app, film/series
-- pages) and "123" (the web app's local-watchlist sync strips the prefix for films
-- and writes it back). The unique key treats them as different titles, so the same
-- film could appear twice, and removing one copy left the other behind.
--
-- The fix has two parts:
--   1. canonical_media_id + BEFORE triggers: every insert/update is stored as
--      "tmdb-<id>" for numeric film/series ids. Because BEFORE INSERT triggers run
--      before ON CONFLICT is checked, an upsert of "123" now updates the existing
--      "tmdb-123" row instead of adding a second one.
--   2. maintenance.cleanup_duplicate_media_ids(): merges existing duplicates. Removed rows are
--      copied to maintenance.*_duplicate_backup first, the surviving row keeps the best shelf
--      position and the original save date, list notes are merged, and ranked lists
--      are renumbered without gaps. Run it once per environment, after the triggers.

create or replace function public.canonical_media_id(p_media_type text, p_media_id text)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_media_type in ('movie', 'tv') and p_media_id ~ '^[0-9]+$' then 'tmdb-' || p_media_id
    else p_media_id
  end;
$$;

create or replace function public.saved_items_canonical_id()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.media_id := public.canonical_media_id(new.media_type, new.media_id);
  return new;
end;
$$;

-- Named to sort before saved_items_place_new (triggers fire alphabetically).
create trigger saved_items_canonical_id
  before insert or update of media_id, media_type on public.saved_items
  for each row execute function public.saved_items_canonical_id();

create trigger user_list_items_canonical_id
  before insert or update of media_id, media_type on public.user_list_items
  for each row execute function public.saved_items_canonical_id();

-- The cleanup, its report and its backups live in a schema the API doesn't expose,
-- so they can only be run from the SQL editor / migrations, never by app users.
create schema if not exists maintenance;

create table if not exists maintenance.saved_items_duplicate_backup
  (like public.saved_items, backed_up_at timestamptz not null default now(), kept_id uuid);
create table if not exists maintenance.user_list_items_duplicate_backup
  (like public.user_list_items, backed_up_at timestamptz not null default now(), kept_id uuid);

-- Dry run: what the cleanup would merge (one row per duplicate group).
create or replace function maintenance.duplicate_media_id_report()
returns table (source text, owner_or_list uuid, list_type text, media_type text, canonical_id text, copies bigint, ids text[])
language sql stable set search_path = '' as $$
  select 'saved_items', user_id, list_type, media_type, public.canonical_media_id(media_type, media_id),
         count(*), array_agg(media_id order by media_id)
    from public.saved_items
   group by user_id, list_type, media_type, public.canonical_media_id(media_type, media_id)
  having count(*) > 1
  union all
  select 'user_list_items', list_id, null, media_type, public.canonical_media_id(media_type, media_id),
         count(*), array_agg(media_id order by media_id)
    from public.user_list_items
   group by list_id, media_type, public.canonical_media_id(media_type, media_id)
  having count(*) > 1;
$$;

create or replace function maintenance.cleanup_duplicate_media_ids()
returns table (saved_items_removed bigint, list_items_removed bigint, ids_rewritten bigint)
language plpgsql set search_path = '' as $$
declare
  v_saved bigint := 0;
  v_items bigint := 0;
  v_rewritten bigint := 0;
  v_n bigint;
begin
  -- saved_items ------------------------------------------------------------
  create temp table _si on commit drop as
  select s.id,
         first_value(s.id) over w as keep_id,
         row_number() over w as rn,
         min(s.shelf_position) over g as best_pos,
         min(s.added_at) over g as first_added,
         count(*) over g as copies
    from public.saved_items s
  window g as (partition by s.user_id, s.list_type, s.media_type, public.canonical_media_id(s.media_type, s.media_id)),
         w as (partition by s.user_id, s.list_type, s.media_type, public.canonical_media_id(s.media_type, s.media_id)
               order by s.shelf_position asc nulls last, s.added_at asc,
                        (s.media_id like 'tmdb-%') desc, s.created_at asc, s.id);

  insert into maintenance.saved_items_duplicate_backup
  select s.*, now(), t.keep_id from public.saved_items s join _si t on t.id = s.id where t.rn > 1;

  delete from public.saved_items s using _si t where t.id = s.id and t.rn > 1;
  get diagnostics v_saved = row_count;

  -- The kept row takes the group's earliest save date and best arranged position.
  update public.saved_items s
     set added_at = t.first_added,
         shelf_position = coalesce(s.shelf_position, t.best_pos)
    from _si t
   where t.id = s.id and t.rn = 1 and t.copies > 1;

  -- user_list_items ---------------------------------------------------------
  create temp table _li on commit drop as
  with ranked as (
    select i.id, i.list_id, i.media_type, public.canonical_media_id(i.media_type, i.media_id) as cid,
           first_value(i.id) over w as keep_id,
           row_number() over w as rn,
           count(*) over (partition by i.list_id, i.media_type, public.canonical_media_id(i.media_type, i.media_id)) as copies
      from public.user_list_items i
    window w as (partition by i.list_id, i.media_type, public.canonical_media_id(i.media_type, i.media_id)
                 order by i.rank_order asc, (i.media_id like 'tmdb-%') desc, i.created_at asc, i.id)
  ), notes as (
    select i.list_id, i.media_type, public.canonical_media_id(i.media_type, i.media_id) as cid,
           string_agg(distinct nullif(btrim(i.notes), ''), E'\n') as all_notes
      from public.user_list_items i
     group by 1, 2, 3
  )
  select r.id, r.keep_id, r.rn, r.copies, n.all_notes
    from ranked r join notes n using (list_id, media_type, cid);

  insert into maintenance.user_list_items_duplicate_backup
  select i.*, now(), t.keep_id from public.user_list_items i join _li t on t.id = i.id where t.rn > 1;

  -- Notes from every copy survive on the kept item.
  update public.user_list_items i
     set notes = coalesce(t.all_notes, i.notes)
    from _li t
   where t.id = i.id and t.rn = 1 and t.copies > 1;

  delete from public.user_list_items i using _li t where t.id = i.id and t.rn > 1;
  get diagnostics v_items = row_count;

  -- Renumber lists that lost an item so ranks stay 1..n in the same order.
  update public.user_list_items i
     set rank_order = r.new_rank
    from (select id, row_number() over (partition by list_id order by rank_order, created_at, id) as new_rank
            from public.user_list_items
           where list_id in (select b.list_id from maintenance.user_list_items_duplicate_backup b)) r
   where r.id = i.id and i.rank_order <> r.new_rank;

  -- Rewrite the remaining old-style ids (the triggers apply the canonical form).
  update public.saved_items set media_id = media_id
   where media_id <> public.canonical_media_id(media_type, media_id);
  get diagnostics v_n = row_count;
  v_rewritten := v_n;
  update public.user_list_items set media_id = media_id
   where media_id <> public.canonical_media_id(media_type, media_id);
  get diagnostics v_n = row_count;
  v_rewritten := v_rewritten + v_n;

  return query select v_saved, v_items, v_rewritten;
end;
$$;

-- Run once, after reviewing the dry run:
--   select * from maintenance.duplicate_media_id_report();
--   select * from maintenance.cleanup_duplicate_media_ids();
