-- Staging only: brings the cleanup on staging up to the full-snapshot version in
-- migrations/20261125_saved_items_canonical_ids.sql (production gets that file whole).
create schema if not exists maintenance;
revoke all on schema maintenance from public, anon, authenticated;

create table if not exists maintenance.cleanup_runs (
  run_id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  saved_items_removed bigint, list_items_removed bigint, ids_rewritten bigint,
  restored_at timestamptz
);
-- Original rows, exactly as they were before the run (one row per touched row).
create table if not exists maintenance.saved_items_snapshot
  (like public.saved_items, run_id uuid not null, action text not null);
create table if not exists maintenance.user_list_items_snapshot
  (like public.user_list_items, run_id uuid not null, action text not null);

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

drop function if exists maintenance.cleanup_duplicate_media_ids();
create function maintenance.cleanup_duplicate_media_ids()
returns table (run_id uuid, saved_items_removed bigint, list_items_removed bigint, ids_rewritten bigint)
language plpgsql set search_path = '' as $$
declare
  v_run uuid := gen_random_uuid();
  v_saved bigint := 0;
  v_items bigint := 0;
  v_rewritten bigint := 0;
  v_n bigint;
begin
  -- saved_items ------------------------------------------------------------
  create temp table _si on commit drop as
  select s.id,
         row_number() over w as rn,
         min(s.shelf_position) over g as best_pos,
         min(s.added_at) over g as first_added,
         count(*) over g as copies,
         s.media_id <> public.canonical_media_id(s.media_type, s.media_id) as bare
    from public.saved_items s
  window g as (partition by s.user_id, s.list_type, s.media_type, public.canonical_media_id(s.media_type, s.media_id)),
         w as (partition by s.user_id, s.list_type, s.media_type, public.canonical_media_id(s.media_type, s.media_id)
               order by s.shelf_position asc nulls last, s.added_at asc,
                        (s.media_id like 'tmdb-%') desc, s.created_at asc, s.id);

  -- Snapshot every row this run will delete or change, before touching anything.
  insert into maintenance.saved_items_snapshot
  select s.*, v_run,
         case when t.rn > 1 then 'removed' when t.copies > 1 then 'merged' else 'id_rewritten' end
    from public.saved_items s join _si t on t.id = s.id
   where t.copies > 1 or t.bare;

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
           row_number() over w as rn,
           count(*) over (partition by i.list_id, i.media_type, public.canonical_media_id(i.media_type, i.media_id)) as copies,
           i.media_id <> public.canonical_media_id(i.media_type, i.media_id) as bare
      from public.user_list_items i
    window w as (partition by i.list_id, i.media_type, public.canonical_media_id(i.media_type, i.media_id)
                 order by i.rank_order asc, (i.media_id like 'tmdb-%') desc, i.created_at asc, i.id)
  ), notes as (
    select i.list_id, i.media_type, public.canonical_media_id(i.media_type, i.media_id) as cid,
           string_agg(distinct nullif(btrim(i.notes), ''), E'\n') as all_notes
      from public.user_list_items i
     group by 1, 2, 3
  )
  select r.id, r.list_id, r.rn, r.copies, r.bare, n.all_notes,
         bool_or(r.copies > 1) over (partition by r.list_id) as list_has_dupes
    from ranked r join notes n using (list_id, media_type, cid);

  -- Lists that lose an item get renumbered, so every item in them is snapshotted.
  insert into maintenance.user_list_items_snapshot
  select i.*, v_run,
         case when t.rn > 1 then 'removed' when t.copies > 1 then 'merged'
              when t.bare then 'id_rewritten' else 'renumbered' end
    from public.user_list_items i join _li t on t.id = i.id
   where t.copies > 1 or t.bare or t.list_has_dupes;

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
    from (select x.id, row_number() over (partition by x.list_id order by x.rank_order, x.created_at, x.id) as new_rank
            from public.user_list_items x
           where x.list_id in (select t.list_id from _li t where t.list_has_dupes)) r
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

  insert into maintenance.cleanup_runs (run_id, saved_items_removed, list_items_removed, ids_rewritten)
  values (v_run, v_saved, v_items, v_rewritten);

  return query select v_run, v_saved, v_items, v_rewritten;
end;
$$;

-- Undo one run: every snapshotted row goes back exactly as it was (id, media_id, dates,
-- position, notes, rank). Triggers are off for the restore so nothing is rewritten or
-- re-stamped. A row someone re-added since the run under the same title wins over its
-- snapshot; those are counted as skipped.
create or replace function maintenance.restore_cleanup(p_run uuid)
returns table (saved_items_restored bigint, saved_items_skipped bigint,
               list_items_restored bigint, list_items_skipped bigint)
language plpgsql set search_path = '' as $$
declare
  v_si bigint; v_si_all bigint; v_li bigint; v_li_all bigint;
begin
  if not exists (select 1 from maintenance.cleanup_runs where run_id = p_run and restored_at is null) then
    raise exception 'run % not found or already restored', p_run;
  end if;

  alter table public.saved_items disable trigger user;
  alter table public.user_list_items disable trigger user;

  delete from public.saved_items s using maintenance.saved_items_snapshot b
   where b.run_id = p_run and b.id = s.id;
  insert into public.saved_items
    (id, user_id, list_type, media_id, media_type, title, poster, year, creator, genres,
     runtime, vote_average, added_at, created_at, updated_at, shelf_position)
  select id, user_id, list_type, media_id, media_type, title, poster, year, creator, genres,
         runtime, vote_average, added_at, created_at, updated_at, shelf_position
    from maintenance.saved_items_snapshot where run_id = p_run
  on conflict do nothing;
  get diagnostics v_si = row_count;
  select count(*) into v_si_all from maintenance.saved_items_snapshot where run_id = p_run;

  delete from public.user_list_items i using maintenance.user_list_items_snapshot b
   where b.run_id = p_run and b.id = i.id;
  insert into public.user_list_items
    (id, list_id, media_type, media_id, title, poster_url, year, rank_order, notes, created_at, author)
  select b.id, b.list_id, b.media_type, b.media_id, b.title, b.poster_url, b.year, b.rank_order,
         b.notes, b.created_at, b.author
    from maintenance.user_list_items_snapshot b
   where b.run_id = p_run
     and exists (select 1 from public.user_lists l where l.id = b.list_id)  -- list not deleted since
  on conflict do nothing;
  get diagnostics v_li = row_count;
  select count(*) into v_li_all from maintenance.user_list_items_snapshot where run_id = p_run;

  alter table public.saved_items enable trigger user;
  alter table public.user_list_items enable trigger user;

  update maintenance.cleanup_runs set restored_at = now() where run_id = p_run;
  return query select v_si, v_si_all - v_si, v_li, v_li_all - v_li;
end;
$$;

revoke all on all functions in schema maintenance from public, anon, authenticated;

-- Run once, after reviewing the dry run, inside a transaction:
--   select * from maintenance.duplicate_media_id_report();
--   select * from maintenance.cleanup_duplicate_media_ids();   -- note the run_id
-- Undo:
--   select * from maintenance.restore_cleanup('<run_id>');
