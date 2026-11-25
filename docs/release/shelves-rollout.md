# Shelves rollout (web + build 28)

Status: **reviewed on staging only. Nothing below has been run on production.**

Out of scope (separate release): Daily Pick, Discover.
Outstanding (not in this release): **owned collections and editions.**

## Order

| # | Step | Reversible by |
|---|------|---------------|
| 1 | Apply `20261124_shelves.sql` (shelf_settings, `saved_items.shelf_position`, shelf RPCs, public-shelf read policy). All shelves default to private. | Drop new objects; build 27 never reads them |
| 2 | Apply `20261125_saved_items_canonical_ids.sql` (canonical-ID triggers, `maintenance` schema, report + cleanup functions). Does **not** run the cleanup. | Drop the two triggers |
| 3 | Apply `20261125_list_access.sql` (get_list / get_list_items / get_saved_lists RPCs, other people can only table-read public lists). | `alter policy … using (visibility in ('public','unlisted'))` on the 3 policies |
| 4 | Deploy web `claude/shelves-web` immediately after step 3. Until it's live, production web can't open someone else's unlisted list. | Vercel rollback (the RPCs stay) |
| 5 | Re-run the dry-run report, compare with the numbers below, then run `maintenance.cleanup_duplicate_media_ids()`. | Recovery SQL below |
| 6 | Submit build 28 to TestFlight from `claude/shelves-mobile`. | — |

Steps 1–3 must precede step 5: the cleanup reads `shelf_position`.

## Build 27 against these changes (tested 25 Nov on staging, build-27 code from 8bd0f3e in the Simulator)

| Behaviour | Result |
|---|---|
| Own lists, own watchlist, add/remove, list item add | Unchanged |
| Others' public lists: open, Saved Lists, like/unlike | Works; like count stored correctly (1 → 0) |
| Others' **unlisted** list in Saved Lists | **Disappears** (the saved public list still shows) |
| Others' **unlisted** list by direct link | **"Not found"** (build-27 query replayed as other user and signed out: 0 rows; owner: 1 row) |
| Others' private lists | Hidden, as before |
| Watchlists/TV shelf/reading list of others | Still hidden (were owner-only already; shelves default private) |
| Saves with bare IDs | Stored as `tmdb-<id>`, no duplicate |

**Unavoidable limitation:** build 27 opens lists with a plain table read by id. The database can't tell that read apart from listing every unlisted list, so keeping unlisted lists un-discoverable means build 27 can't open other people's unlisted lists. The alternative is to leave production's current leak open (today anyone can enumerate unlisted lists and their items). Fix for users: update to build 28.

Production impact today: 1 unlisted list, 0 saves of it by other people, 0 likes on non-public lists.

## Production dry-run (read-only, 25 Nov)

`saved_items`: 46 rows, 8 users. 4 duplicate groups, all one user's film watchlist (Birdman, Heart of the Beast, Taxi Driver, The Odyssey). Each keeps the `tmdb-` row and removes the bare-ID copy. Both copies have the same `added_at`, so order is unchanged. No groups of 3+. 23 bare IDs rewritten to `tmdb-` after the merge.

`user_list_items`: 31 rows, **0 duplicates**, 0 items with notes, 11 bare IDs rewritten. No rank renumbering needed.

Staging cleanup for comparison: 31 watchlist rows + 1 list item removed, order and notes preserved.

## Recovery

Every removed row is copied to `maintenance.*_duplicate_backup` (with `kept_id`) before deletion.

```sql
begin;
-- Restore rows exactly as stored (no id rewrite, no re-positioning).
alter table public.saved_items     disable trigger user;
alter table public.user_list_items disable trigger user;

insert into public.saved_items
  (id, user_id, list_type, media_id, media_type, title, poster, year, creator, genres,
   runtime, vote_average, added_at, created_at, updated_at, shelf_position)
select id, user_id, list_type, media_id, media_type, title, poster, year, creator, genres,
       runtime, vote_average, added_at, created_at, updated_at, shelf_position
  from maintenance.saved_items_duplicate_backup;

-- Kept list items: drop notes merged in from copies, then restore the copies and their ranks.
update public.user_list_items i
   set notes = nullif(btrim(replace(i.notes, coalesce(b.notes, ''), '')), '')
  from maintenance.user_list_items_duplicate_backup b
 where i.id = b.kept_id and b.notes is not null;
insert into public.user_list_items
  (id, list_id, media_type, media_id, title, poster_url, year, rank_order, notes, created_at, author)
select id, list_id, media_type, media_id, title, poster_url, year, rank_order, notes, created_at, author
  from maintenance.user_list_items_duplicate_backup;

alter table public.saved_items     enable trigger user;
alter table public.user_list_items enable trigger user;
commit;
```

Production has 0 list duplicates, so only the saved_items insert applies there. The 34 bare-ID rewrites aren't reverted: build 27 and the new clients already use the `tmdb-` form.
If the whole release has to come out: Vercel rollback, revert the three list policies (step 3), drop the two canonical-ID triggers. Shelf tables can stay; build 27 ignores them.

Run the cleanup inside a transaction and check its returned counts (expected: 4, 0, 34) before `commit`.

## Release checklist

- [ ] Review recordings and this doc
- [ ] Back up production (Supabase PITR or `pg_dump` of saved_items, user_lists, user_list_items, list_likes, list_saves)
- [ ] Steps 1–3 (migrations)
- [ ] Step 4 web deploy; smoke test: own shelves, friend shelves, unlisted link signed out, book cover
- [ ] Re-run `maintenance.duplicate_media_id_report()`; expect 4 saved_items groups, 0 list groups
- [ ] Step 5 cleanup in a transaction; counts 4 / 0 / 34
- [ ] Step 6 build 28 to TestFlight
- [ ] Tell testers on build 27 to update (unlisted lists of others won't open there)
- [ ] Owned collections and editions: still outstanding
