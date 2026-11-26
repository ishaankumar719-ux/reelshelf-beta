# Shelves release: web + iPhone build 28

Status: **Phase 1 for the iPhone applied to production 26 Nov 09:34** (`shelves`,
`list_access_rpcs`). Website deploy, canonical-ID migration, cleanup and tightening not done.
Prepared iPhone build: **1.0.0 (28)**, EAS build `4881b279-8824-4aad-ab37-6583dd4f4860`, production profile, store distribution, from `claude/shelves-mobile` 6a77db0, built 25 Nov 13:00. Not submitted.
Not in this release: Daily Pick / Discover (separate), **owned collections and editions (outstanding)**.

## Why two database phases

Build 27 opens other people's lists with a plain table read. Removing table reads of unlisted
lists (the fix for the enumeration leak) therefore breaks unlisted links in build 27. So:

- **Phase 1 – additive.** Everything build 27 needs keeps working; the new web and the new
  iPhone build get the RPCs they need.
- **Phase 2 – tighten.** Only after the new build is "Ready to Test" in every TestFlight group.

The new iPhone build needs Phase 1 (shelf + list RPCs), so it is uploaded right after Phase 1, and
Phase 2 waits on TestFlight processing and Beta App Review.

## Production log, 26 Nov

- Backup: WAL archiving healthy (last archive 09:28, 0 failures since March). The daily-backup
  list is only visible on the dashboard's Backups page.
- Fingerprints before/after (row count + md5 of every row): saved_items 46 (original columns),
  user_lists 6, user_list_items 31, list_saves 3, list_likes 1, messages 22, 86 existing
  policies: all identical. shelf_settings 0 rows → every shelf private.
- Access as owner / other user / signed out (build 27 queries and build 28 RPCs) as expected;
  build 27 add + remove ran in a rolled-back transaction (new row gets shelf_position null).
- Security advisor: no new errors; new RPCs appear only in the generic "callable" warnings.

## Next step: build 28 on a physical iPhone

Build 28 (store build) installs through TestFlight, so production must first have what it
calls. Checked read-only against production on 26 Nov:

| Build 28 calls | In production | Provided by |
|---|---|---|
| `shelf_settings`, `saved_items.shelf_position` | no | `20261124_shelves.sql` |
| `get_shelf_items`, `profile_shelves`, `reorder_shelf` (+ helpers `shelf_visibility`, `saved_item_shelf`) | no | `20261124_shelves.sql` |
| `get_list`, `get_list_items`, `get_saved_lists` | no | `20261125_list_access_rpcs.sql` |
| `public_profiles`, `update_list_items_order`, `update_list_engagement_counts`, messaging tables | yes | already there |

**Required: exactly those two migrations.** `20261125_saved_items_canonical_ids.sql` isn't
needed by build 28 (it already writes `tmdb-` IDs); it goes with the web deploy, before the
cleanup. `20261126_list_access_tighten.sql` stays last.

Why these two keep build 27 exactly as it is (both tested with build-27 code on staging):
- Only new tables, columns, functions, one index, one extra SELECT policy and one insert
  trigger. No existing policy, column, function or row is changed; the two `drop … if exists`
  lines only guard re-runs and match nothing in production.
- The new `saved_items` read policy only opens shelves whose owner set them public. Nobody has
  a `shelf_settings` row, so every shelf is private: same reads as today.
- The insert trigger only fills `shelf_position` once someone has arranged a shelf in build 28;
  build 27 never reads that column. Build 27 add/remove worked with it on staging.
- List RPCs are new entry points; list tables and their policies are untouched, so build 27's
  direct reads (including unlisted links) behave as today.

Proposed sequence (for review):
1. Read-only pre-check: the eight objects above still absent; note backup time.
2. Apply `20261124_shelves.sql`, then `20261125_list_access_rpcs.sql` (apply_migration, names
   `shelves`, `list_access_rpcs`).
3. Read-only verify: objects exist; `select count(*) from shelf_settings` = 0; as another user,
   a watchlist read of someone else still returns 0 rows; `get_list` returns a public and an
   unlisted list, not a private one.
4. On your iPhone still on build 27: watchlist add/remove, open a public and an unlisted list,
   send a message. Nothing should differ.
5. `eas submit -p ios --id 4881b279-8824-4aad-ab37-6583dd4f4860`; wait for processing
   (10–30 min, sometimes longer). As an internal tester you get it without Beta App Review.
6. Install build 28 from TestFlight; run the checklist below.

Rollback if needed: drop the new functions, the `saved_items_place_new` trigger and the
"Public shelves are readable" policy; the new table and column can stay (build 27 ignores them).

### Physical iPhone checklist (build 28, production data)

- **Browsing:** Shelves tab opens with film watchlist, TV, reading list and lists in the same
  order as before; swipe sideways along a shelf and scroll down between shelves without
  anything being picked up or moved.
- **Selection:** tap a title: it lifts, preview appears below with "Open title"; swipe the
  preview to neighbours; tap another title; tap outside to dismiss.
- **Rearranging:** only in Arrange mode: long-press drag and the Move buttons; leave and
  reopen, then check the same order on the web.
- **Title page return:** Open title → back: same shelf, same scroll position, preview state sensible.
- **Book covers:** open a book from the reading shelf; cover shows on the book page.
- **Privacy:** a friend's shelves show only public shelves/lists; your unlisted list opens by
  link from another account; list search doesn't return unlisted lists; private stays hidden.
- **Accessibility:** VoiceOver reads titles and offers move actions in Arrange mode; Reduce
  Motion removes the lift/slide.
- **Messaging (unchanged from 27):** open a conversation, send text, a GIF and a photo,
  share a title; realtime receive from another account.

## Timeline

| When | Step | Gate to continue |
|---|---|---|
| Day 0 | 0. Confirm Supabase PITR/daily backup is current | Backup timestamp noted |
| Day 0 | 1. Phase 1 migrations: `20261124_shelves.sql`, `20261125_saved_items_canonical_ids.sql`, `20261125_list_access_rpcs.sql` | Smoke tests A pass |
| Day 0 | 2. Deploy web `claude/shelves-web` | Smoke tests B pass |
| Day 0 | 3. Submit the prepared iPhone build: `eas submit -p ios --id 4881b279-8824-4aad-ab37-6583dd4f4860` | App Store Connect: processing done (usually 10–30 min, can take a few hours) |
| Day 0 | 4. Internal testers get it after processing; add it to the external group → Beta App Review (typically hours, allow up to 48 h) | Smoke tests C on the TestFlight build |
| Day 0 | 5. Cleanup: report → `cleanup_duplicate_media_ids()` in a transaction | Counts 4 / 0 / 34, snapshot 31 + 11 rows |
| Day 1–2 | 6. Build "Ready to Test" for every group; nudge testers to update | — |
| Day 1–2 | 7. Phase 2: `20261126_list_access_tighten.sql` | Smoke tests D pass |

Nothing in steps 1–5 changes what build 27 users see. Step 7 is the only step that does.

## Build 27 limitation (from step 7 onward)

Tested on staging with build 27's code (8bd0f3e) in the Simulator plus its exact query replayed
as owner, other user and signed out:

- Someone else's **unlisted** list: direct link shows "not found"; it disappears from Saved Lists.
- Unchanged: own lists and watchlist, adding/removing, other people's public lists (open, save,
  like/unlike with correct counts), private lists stay hidden, other people's watchlists stay hidden.

Unavoidable while keeping unlisted lists un-discoverable: the database can't tell build 27's
by-id table read apart from listing all unlisted lists. Production today: 1 unlisted list,
0 saves of it by others, 0 likes on non-public lists. Remedy: update to the new build.

Also closed in the new build/web (they leaked unlisted lists before Phase 2): iPhone list
search returned unlisted lists; iPhone activity and the web profile's list count/activity
showed other people's unlisted list titles.

## Production dry run (read-only, 25 Nov)

- `saved_items`: 46 rows. 4 duplicate pairs, one user's film watchlist (Birdman, Heart of the
  Beast, Taxi Driver, The Odyssey); bare-ID copy removed, `tmdb-` copy kept, same save date so
  order unchanged. 23 more bare IDs rewritten.
- `user_list_items`: 31 rows, 0 duplicates, 0 notes, 11 bare IDs rewritten, no renumbering.
- Expected: removed 4 / 0, rewritten 34. Snapshot: 31 saved_items rows (8 pair rows + 23
  rewritten) and 11 list items.

## Backup and recovery

`cleanup_duplicate_media_ids()` returns a `run_id` and, before changing anything, copies the
full original row of every row it will touch into `maintenance.*_snapshot`:
removed copies, kept copies it merges into (save date, position, notes), every row whose ID it
rewrites, and every item in a list it renumbers.

Undo: `select * from maintenance.restore_cleanup('<run_id>');` deletes the touched rows and
re-inserts the snapshot exactly (IDs, media IDs, added/created/updated dates, shelf position,
notes, rank) with triggers off. A title someone re-added since the run keeps the new row and is
reported as skipped.

### Staging rehearsal (26 Nov, test user C)

Seeded once in a single transaction with triggers skipped via `session_replication_role`
(triggers themselves never altered; all four confirmed enabled before and after): 4 watchlist
pairs (bare + `tmdb-`, same save date, mixed shelf positions), 23 more old-style IDs, a list
of 11 old-style IDs, and a ranked list with two duplicate pairs carrying notes on both copies.
Full copies of both tables taken before the run.

| Step | Result |
|---|---|
| Cleanup | removed 4 + 2, rewritten 36 (as predicted); snapshot 31 + 17 rows covering every touched row (removed 4+2, merged 4+2, rewritten 23+11, renumbered 2) |
| After cleanup | each pair kept its better shelf position (Fight Club kept 0.5 from the bare copy); notes merged ("Diner scene / Royale with cheese"); list renumbered 1–4; 0 old-style IDs, 0 duplicate groups |
| Restore | 31 + 17 restored, 0 skipped |
| Compare with pre-run copies | saved_items 199 = 199, list items 45 = 45, 0 rows missing, 0 extra (whole-row EXCEPT both ways); all 48 of C's rows identical in every column incl. bare IDs, added/created/updated dates, shelf positions, notes, ranks |
| Other users | whole-row hash of every other user's rows identical before and after |
| Triggers | all four enabled after the restore |

Rehearsal rows then deleted; staging back to 168 / 28 rows, 0 duplicate groups.

Full rollback of the release: Vercel rollback; Phase 2 rollback SQL is at the bottom of
`20261126_list_access_tighten.sql`; drop the two `*_canonical_id` triggers. Shelf tables and
RPCs can stay (build 27 ignores them).

## Smoke tests

A. After Phase 1 (with build 27 on a phone): own watchlist and lists load; add and remove a
film; open someone's public list, like/unlike; open an unlisted list by link (still works);
`select count(*) from maintenance.duplicate_media_id_report()` = 4.

B. After web deploy, signed in as two real accounts and signed out:
- /shelves: own film watchlist, TV, reading list in the same order as before; arrange persists.
- /u/<other>/shelves: only public shelves and public lists; private/unlisted absent.
- Unlisted list: opens by link signed out and as another user; not in profile, search or
  /lists; private list → "doesn't exist or is private".
- Book detail from a shelf shows its cover. Daily Pick and Discover unchanged.

C. New build from TestFlight (production data): Shelves tab loads own shelves; friend shelves
screen; tap-to-preview and Open title; Arrange mode drag + Move buttons; unlisted link opens;
list search excludes unlisted lists.

D. After Phase 2: signed-out REST `user_lists?visibility=eq.unlisted` returns `[]`;
`list_likes` shows nothing for non-public lists; unlisted link still opens on web and new
build; build 27 shows the documented limitation and nothing else changes.

## Release checklist

- [ ] Review recordings, staging rehearsal and this doc
- [ ] Backup confirmed
- [ ] Phase 1 migrations → smoke tests A
- [ ] Web deploy → smoke tests B
- [ ] `eas submit` the prepared build → processing → internal testers → smoke tests C
- [ ] Add build to external group; Beta App Review approved
- [ ] Cleanup in a transaction: counts 4 / 0 / 34, snapshot 31 + 11; record run_id
- [ ] Build "Ready to Test" in all groups; tell testers to update (unlisted links stop working on build 27)
- [ ] Phase 2 → smoke tests D
- [ ] Owned collections and editions: outstanding
