# Website Diary — Calendar / TV Episode Logging / Reading Format Audit

**Read-only audit. No code was modified — see VERIFICATION_RESULTS at the bottom.**

Scoped to exactly 3 open questions per CONSTRAINTS. Everything already confirmed working
(timeline fields, edit-via-Composer, delete, spoiler-blur, X.X/10 rating, filters, and the
settled Activity Creation question) is deliberately not re-investigated here.

---

## 1. Calendar view — confirmed NOT real

**Files read in full:** `app/diary/page.tsx` (487 lines, the entire real `/diary` route).

The website's Diary page is a **grouped timeline**, not a calendar:
- Entries are bucketed into exactly four time groups — `Today` / `Yesterday` / `This week` /
  `Earlier` (`getTimeGroup()`) — each rendered as a labeled section with a sticky pill header
  ("Today · 3 entries"), not a month grid.
- Three independent filter rows: media type (All/Films/Series/Books), venue (All/Cinema/Home),
  and sort (Recent/Favourites/Highest Rated) — no date-range or month-navigation control anywhere.
- Data source: `getDiaryMovies()` / `subscribeToDiary()` from `lib/diary.ts` — a local,
  event-subscribed cache reconciled with the real `diary_entries` table (same underlying data the
  timeline always reads; there is no second, calendar-specific data source to diverge from).

**Confirmed by exhaustive search, not just this one file**: a case-insensitive repo-wide grep for
`calendar` and `heatmap` across `app/`, `components/`, and `lib/` returns **zero matches**. No
calendar/heatmap component, route, or even a stray reference exists anywhere in the website
codebase.

**Verdict: no calendar view exists on the real website, in any form.**

---

## 2. TV episode-level diary logging — confirmed REAL and substantial

**This is the opposite of "unused schema headroom."** The website has a fully-built, live,
three-tier logging system for TV: whole-show, per-season, and per-episode — all real UI, all
writing real `review_scope`/`season_number`/`episode_number` values.

**Files read:** `components/tv/SeasonBrowser.tsx` (576 lines), `components/SeriesReviewPanel.tsx`
(366 lines, read through line 90 plus targeted scope-handling sections), `src/lib/reviews.ts`
(`upsertReview()`, the real write path), `app/series/[id]/page.tsx` (import/render sites).

- **Confirmed live, not dead code**: `app/series/[id]/page.tsx` — the real `/series/[id]` route —
  imports and renders both `SeasonBrowser` (line 757) and `SeriesReviewPanel` (line 771). Neither
  carries any "unused"/deprecated marker (the pattern that flagged `HomeDashboardClient.tsx` as
  dead in the prior audit is absent here).
- **`SeasonBrowser`**: each episode row shows a real `"+ Log"` / `"Edit"` affordance (`"Edit"` when
  a review already exists) and a rating badge (`"{rating.toFixed(1)} / 10"` or `"Logged"`).
  Tapping expands the row to reveal a real `<ReviewForm scope="episode" seasonNumber={...}
  episodeNumber={episode.episodeNumber} .../>` (line 296-309) — a genuine per-episode rating/review
  composer, not a placeholder.
- **`SeriesReviewPanel`**: a tabbed panel (`ActiveTab = "show" | "seasons"`) rendering
  `<ReviewForm scope="show" .../>` (line 248) for whole-series reviews and
  `<ReviewForm scope="season" .../>` (line 343) for per-season reviews, plus `getScopeBadge()`
  (line 59-68) which renders `"Season {n}"` or `"S{n} E{n}"` badges on existing reviews — real
  display logic for all three non-title scopes.
- **Real write path**: `src/lib/reviews.ts`'s `upsertReview()` builds a payload with
  `review_scope`, `season_number`, `episode_number` and upserts to `diary_entries` using
  `onConflict: "user_id,media_type,media_id,review_scope,season_number,episode_number"` — the
  exact same composite-unique conflict target already documented for mobile's own
  `diaryComposer.ts`. Season/episode numbers are conditionally zeroed based on scope
  (`isSeason`/`isEpisode` checks), matching the schema's intent precisely.

**Verdict: TV episode/season-level logging is a real, comprehensive, currently-live website
feature — not unused schema capacity.**

---

## 3. Reading format (physical/ebook/audiobook) — confirmed NOT real on website

**Files read/searched:** `src/components/reviews/ReviewForm.tsx` (the actual composer component —
full-text grep for "book" and "format" inside it), `src/lib/reviews.ts` (`upsertReview()`'s
complete real payload, read in full), plus a repo-wide grep for `physical_book`, `physicalBook`,
`audiobook`, `reading_format`/`readingFormat`, and `ebook` as a whole word (excluding "Facebook"
false positives) across `app/`, `components/`, `lib/`, and `src/`.

- **`ReviewForm.tsx` contains zero references to "book" or "format" anywhere in its own source** —
  it has no book-specific UI branch at all, let alone a reading-format selector.
- **The real `diary_entries` write payload** (`src/lib/reviews.ts` lines 92-108) is exactly:
  `user_id, media_id, show_id, media_type, review_scope, season_number, episode_number, rating,
  review, contains_spoilers, watched_date, title, poster, year, creator, updated_at`. No
  `physical_book`/`ebook`/`audiobook` field appears anywhere in it.
- **Repo-wide search for every plausible name/casing returns zero matches** in any website file.

Meanwhile, `diary_entries.physical_book` / `.ebook` / `.audiobook` (boolean columns) genuinely
exist in the live shared schema (same database the website uses), and mobile's
`UniversalReviewComposer.tsx` has three real, working toggles writing to them
(`"Physical Book"`, `"Kindle / eBook"`, `"Audiobook"` — lines 272-274).

**Verdict: reading format was never implemented on the website, in the schema or the UI. The
columns exist (real, live, shared schema) but only mobile's app code ever reads or writes them —
this is a mobile-only capability with no website counterpart, not a mistaken assumption about
something the website does.**

---

## Mobile's current state (for comparison)

- **Calendar**: mobile's Diary tab (`app/(tabs)/diary.tsx`) is a flat, ungrouped list (no
  Today/Yesterday/This week grouping the website has, and no calendar) — simpler than the
  website's timeline, not something in need of a calendar addition either.
- **TV episode logging**: mobile's `fetchDiaryEntries()` (`lib/supabase/diary.ts:47`) filters
  strictly to `.eq('review_scope', 'show')` — any season/episode-scoped entry (if one existed)
  would be silently excluded from the Diary tab entirely. Mobile's Universal Review Composer has
  no season/episode picker UI at all today — episode-level logging is schema-ready
  (`diaryComposer.ts` already supports `seasonNumber`/`episodeNumber` params per its own header
  comment) but has no entry point in the UI.
  

- **Reading format**: mobile's `UniversalReviewComposer.tsx` already has the three real toggles
  (Physical Book / Kindle-eBook / Audiobook) wired to real `diary_entries` columns — ahead of the
  website here, not behind it.

---

## AUDIT_DOCUMENT_LOCATION

`reelshelf-mobile/WEBSITE_DIARY_CALENDAR_TV_BOOK_AUDIT.md` (this file).
