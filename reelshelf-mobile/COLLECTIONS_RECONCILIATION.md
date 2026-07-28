# Collections Reconciliation — 2026-07-28

Data-only reconciliation of mobile's `collections`/`collection_items` tables
against the real, currently-live website. No redesign — reuses the existing
schema and the existing Collection Detail screen (`app/collection/[id].tsx`)
exactly as they were.

## 1. Authenticated-feature check (real source read, not inferred)

Read `app/discover/collection/[slug]/page.tsx` (the real website's actual
Collection Detail component) directly, in full.

**Finding: no Follow/Like/Share/completion-tracking feature exists anywhere
in this file — not gated behind auth, not present at all.** The page is a
plain Next.js server component with no `auth.getUser()` call, no session
check of any kind, and no interactive client component mounted for this
route. It renders: a back link to `/discover`, a title, an italic
description, an item count ("Collection · N titles"), and a static poster
grid (`<Link>` cards, no client-side state). Items are fetched live at
request time — from TMDB via `def.tmdbPath` for TMDB-backed collections, or
from local arrays for the two book-filter collections — not from the
`collections`/`collection_items` Supabase tables at all (those tables are a
mobile/shared-backend addition; the real website's Collection Detail page
predates and doesn't use them).

Conclusion: nothing was hidden behind a logged-out check. The feature set is
exactly as minimal as it looks when logged out, confirmed by reading the
component source itself.

Mobile's existing `app/collection/[id].tsx` was already this minimal (back
button, title, description, count, flat list) with no fabricated
Follow/Like/Share/completion UI — so step 5 (removing any fabricated UI)
required no changes.

## 2. Collection set reconciliation

Source of truth for the real 11: `lib/discoverCollections.ts`'s
`COLLECTION_DEFS` array (13 entries total — 11 confirmed live per the task's
brief, plus `classic-literature`/`books-to-screen` book collections and
`neo-noir`, none of which mobile is asked to add and which are out of scope
here).

| # | Real title | Slug (website) | Mobile slug | Action |
|---|---|---|---|---|
| 1 | Best of A24 | `best-of-a24` | `best-a24-films` | **Renamed** from "Best A24 Films" |
| 2 | Under 90 Minutes | `under-90-min` | `under-90-minutes` | Already correct |
| 3 | Mind-Bending Stories | `mind-benders` | `mind-bending-stories` | Already correct |
| 4 | True Crime Essentials | `true-crime` | `true-crime-essentials` | Already correct |
| 5 | Space Adventures | `space-adventures` | `space-adventures` | Already correct |
| 6 | Perfect Sunday Stories | `perfect-sunday-stories` | `perfect-sunday-stories` | Already correct |
| 7 | Coming of Age | `coming-of-age` | `coming-of-age` | Already correct |
| 8 | One Season Masterpieces | `one-season-wonders` | `one-season-wonders` | **Added** |
| 9 | One Night Thrillers | `one-night-thrillers` | `one-night-thrillers` | **Added** |
| 10 | Mind-Bending Television | `mind-bending-tv` | `mind-bending-tv` | **Added** |
| 11 | Crime Drama Essentials | `crime-drama-tv` | `crime-drama-tv` | **Added** |

Removed from the live set (5, per brief):

- **Greatest Horror**, **Best Mind-Bending Films**, **Perfect Sunday
  Watches**, **Neo-Noir** — hard-deleted (`collections` row + all
  `collection_items`). No flagged/preserve-for-later status attached to any
  of these; nothing of value to keep.
- **Oscar Winners** — `is_archived` set to `true`. Row and its 4
  `collection_items` rows (already marked `verification_status='flagged'`
  with the honest note "No verified awards data source available in this
  project") remain in the database untouched, per the brief's explicit
  instruction, but no longer appear in `fetchLiveCollectionRows()` (used by
  every mobile surface — Home, Discover, Search, Detail's "Appears in").

## 3. New collections — sourcing and verification

All 4 sourced and verified via an extended `scripts/validate-collections.ts`
(the same reusable, individually-verified-per-item tool used for the
original Best of A24 data-integrity fix — real TMDB fetches, id/title sanity
checks, a real checkable field per item, never trusted from a source list).
Every item below is `verified` (0 `flagged`, 0 `unverified` — see
`scripts/reports/collections-validation-report.{json,md}` for the full raw
verification output).

- **One Season Masterpieces** (`one-season-wonders`) — Chernobyl (2019), The
  Queen's Gambit (2020), Band of Brothers (2001), Mare of Easttown (2021).
  **Finding surfaced, not silently fixed**: the real website's own TMDB query
  for this collection (`/discover/tv?vote_average.gte=8.0&vote_count.gte=300`)
  has **no season-count filter at all**, despite the editorial name — a
  name/logic mismatch in the live site, same category of bug as the
  pre-existing neo-noir keyword-id bug already flagged in the validation
  report. Out of scope to fix (data-only task); to honor both the real
  technical gate and the collection's stated intent, every item chosen here
  independently satisfies the real query's actual numeric thresholds *and*
  is a genuine single-season/limited series (`number_of_seasons === 1`),
  rather than picking an arbitrary multi-season show (e.g. Breaking Bad,
  Avatar: The Last Airbender) that the live query's literal logic would
  technically admit.
- **One Night Thrillers** (`one-night-thrillers`) — Nightcrawler (2014),
  Searching (2018), Wind River (2017), 10 Cloverfield Lane (2016). Verified
  against the real query's exact rule: genre Thriller (53), runtime ≤ 120
  min, vote_average ≥ 7.0, vote_count ≥ 200.
- **Mind-Bending Television** (`mind-bending-tv`) — Dark (2017), Severance
  (2022), Westworld (2016), Black Mirror (2011). Verified against: TV genre
  Sci-Fi & Fantasy (10765) or Mystery (9648), vote_average ≥ 7.5, vote_count
  ≥ 200.
- **Crime Drama Essentials** (`crime-drama-tv`) — True Detective (2014),
  Mindhunter (2017), The Wire (2002), Better Call Saul (2015). Verified
  against: TV genre Crime (80) or Drama (18), vote_average ≥ 7.5, vote_count
  ≥ 300.

## 4. Result

`collections` table now has exactly 11 live rows (`is_archived = false`)
matching the real website's 11 titles exactly, plus Oscar Winners preserved
archived. The 4 non-real collections no longer exist in any form.
