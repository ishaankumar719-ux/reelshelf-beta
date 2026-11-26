-- Staging only: production-shaped duplicates for rehearsing cleanup + restore.
-- Test user C. Triggers are skipped for this transaction only (session_replication_role),
-- so old-style ids are stored as-is and the triggers themselves are never altered.
-- Run once: it is not idempotent for the watchlist rows.
-- Shape: 4 watchlist pairs (bare + tmdb-, same save date, like production), 23 more
-- bare ids, a list with 11 bare ids (like production), and a ranked list with two
-- duplicate pairs carrying notes on both copies (not in production; exercises notes
-- and renumbering).
begin;
set local session_replication_role = replica;

with c as (select 'c0000000-0000-4000-8000-0000000000c1'::uuid as u)
insert into public.saved_items (id, user_id, list_type, media_id, media_type, title, year, added_at, created_at, updated_at, shelf_position)
select gen_random_uuid(), c.u, 'watchlist', v.mid, 'movie', v.title, v.yr,
       timestamptz '2026-10-01 10:00+00' + (v.n || ' hours')::interval,
       timestamptz '2026-10-01 10:00+00' + (v.n || ' hours')::interval + v.lag,
       timestamptz '2026-10-02 09:00+00' + v.lag,
       v.pos
  from c, (values
    (1,'194662','Birdman',2014, interval '0', 3.0::float8),
    (1,'tmdb-194662','Birdman',2014, interval '5 min', 1.0),
    (2,'103','Taxi Driver',1976, interval '0', null),
    (2,'tmdb-103','Taxi Driver',1976, interval '5 min', 2.0),
    (3,'550','Fight Club',1999, interval '0', 0.5),
    (3,'tmdb-550','Fight Club',1999, interval '5 min', 4.0),
    (4,'27205','Inception',2010, interval '0', null),
    (4,'tmdb-27205','Inception',2010, interval '5 min', null)
  ) v(n, mid, title, yr, lag, pos);

with c as (select 'c0000000-0000-4000-8000-0000000000c1'::uuid as u)
insert into public.saved_items (id, user_id, list_type, media_id, media_type, title, year, added_at, created_at, updated_at, shelf_position)
select gen_random_uuid(), c.u, 'watchlist', (1000 + g)::text, case when g > 20 then 'tv' else 'movie' end,
       'Rehearsal title ' || g, 2000 + g,
       timestamptz '2026-09-01 12:00+00' + (g || ' days')::interval,
       timestamptz '2026-09-01 12:00+00' + (g || ' days')::interval,
       timestamptz '2026-09-01 12:00+00' + (g || ' days')::interval,
       case when g % 3 = 0 then null else 10 + g end
  from c, generate_series(1, 23) g;

insert into public.user_lists (id, user_id, title, visibility, is_ranked)
values ('5e1f0000-0000-4000-8000-0000000000c1', 'c0000000-0000-4000-8000-0000000000c1', 'Rehearsal: old ids', 'private', true),
       ('5e1f0000-0000-4000-8000-0000000000c2', 'c0000000-0000-4000-8000-0000000000c1', 'Rehearsal: duplicates with notes', 'public', true)
on conflict (id) do nothing;

insert into public.user_list_items (id, list_id, media_type, media_id, title, poster_url, year, rank_order, notes, created_at)
select gen_random_uuid(), '5e1f0000-0000-4000-8000-0000000000c1', 'movie', (2000 + g)::text, 'List title ' || g, '', 1990 + g, g, null,
       timestamptz '2026-08-01 08:00+00' + (g || ' hours')::interval
  from generate_series(1, 11) g;

insert into public.user_list_items (id, list_id, media_type, media_id, title, poster_url, year, rank_order, notes, created_at)
values
  (gen_random_uuid(), '5e1f0000-0000-4000-8000-0000000000c2', 'movie', 'tmdb-680',  'Pulp Fiction', '', 1994, 1, 'Diner scene', timestamptz '2026-08-02 08:00+00'),
  (gen_random_uuid(), '5e1f0000-0000-4000-8000-0000000000c2', 'movie', '238',       'The Godfather', '', 1972, 2, 'Watch the 4K', timestamptz '2026-08-02 08:01+00'),
  (gen_random_uuid(), '5e1f0000-0000-4000-8000-0000000000c2', 'movie', 'tmdb-155',  'The Dark Knight', '', 2008, 3, null, timestamptz '2026-08-02 08:02+00'),
  (gen_random_uuid(), '5e1f0000-0000-4000-8000-0000000000c2', 'movie', 'tmdb-238',  'The Godfather', '', 1972, 4, 'Best of the trilogy', timestamptz '2026-08-02 08:03+00'),
  (gen_random_uuid(), '5e1f0000-0000-4000-8000-0000000000c2', 'movie', '680',       'Pulp Fiction', '', 1994, 5, 'Royale with cheese', timestamptz '2026-08-02 08:04+00'),
  (gen_random_uuid(), '5e1f0000-0000-4000-8000-0000000000c2', 'tv',    'tmdb-1396', 'Breaking Bad', '', 2008, 6, null, timestamptz '2026-08-02 08:05+00');

commit;
