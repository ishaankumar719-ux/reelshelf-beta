# Website Diary Audit — Blueprint for Mobile Rebuild

> Read-only audit. Every claim below is traced to an actual web app file path (repo root,
> sibling to `reelshelf-mobile/`), read on 2026-07-13. No code was changed to produce this
> document.

---

## 0. Where "Diary" lives on the website

- **`/diary`** (`app/diary/page.tsx`, 487 lines, full) — the main timeline/feed, titled
  **"My Diary"** with eyebrow **"Cinematic journal"** and subtitle *"A running timeline of what
  you watched, what you thought, and what stayed with you after the credits rolled."*
- **`/diary/log`** (`app/diary/log/page.tsx`, not read in full this pass — the standalone
  logging flow; the same logging UI is also reachable as a modal via `useDiaryLog()` /
  `DiaryLogModal.tsx` from within the diary page itself, e.g. when tapping "Edit" on an entry).
- This is entirely separate from the Profile page's audited sections (`WEBSITE_PROFILE_AUDIT.md`
  §8 already confirmed: **no "Diary" section exists on the public profile page at all** — that
  finding is reconfirmed here, not contradicted.

---

## 1. Data source — confirmed architecture

**Files read:** `lib/diary.ts` (partial — types + storage key + `getDiaryEntryKey`),
`app/diary/page.tsx` (full).

The Diary page does **not** query Supabase directly. It calls `getDiaryMovies()` /
`subscribeToDiary()` from `lib/diary.ts`, which is a **localStorage-first store**
(`STORAGE_KEY = "reelshelf-diary"`) that synchronizes with Supabase in the background via
`syncDiaryEntriesWithBackend` / `upsertDiaryEntryToBackend` / `deleteDiaryEntryFromBackend`
(`lib/supabase/persistence.ts`, referenced but not read in full this pass). This is the same
**"local cache as the first-class read model, Supabase as the reconciled source of truth"**
pattern mobile already independently arrived at for its own diary/media-persistence layer — a
genuine architectural parallel, not something mobile is behind on.

---

## 2. Grouping logic — confirmed exact, and a correction to the prior assumption

**The website groups Diary entries by relative recency bucket, not by calendar month:**

```
Today | Yesterday | This week | Earlier
```

(`getTimeGroup()`, `app/diary/page.tsx` lines 21–36 — exact boundaries: `Today` = same calendar
day; `Yesterday` = previous calendar day; `This week` = within the last 7 days; everything older
falls into a single `Earlier` bucket — there is **no** further breakdown by month within
"Earlier", and no calendar/heatmap view at all, confirmed below in the Backend Reality Check).

Each group header shows the label plus a live count, e.g. *"Today · 2 entries"*, rendered as a
sticky pill at the top of its section while scrolling.

**This directly corrects mobile's current month-grouping convention** (`ProfileView.tsx`'s
Diary tab groups by `"July 2026"`-style month labels; `app/(tabs)/diary.tsx`, mobile's own
standalone Diary tab, currently applies **no grouping at all** — a flat list). Neither of
mobile's two diary surfaces currently matches the website's real grouping, and the two mobile
surfaces don't even match each other.

---

## 3. Filters — three independent, simultaneous filter rows (not one combined filter)

1. **Media type**: All / Films / Series / Books (`mediaFilter`).
2. **Venue**: All / Cinema / Home (`venueFilter`) — Cinema means `mediaType === "movie" &&
   watchedInCinema === true`; Home means everything else. This directly reuses the same
   `watched_in_cinema` boolean already flagged in `WEBSITE_PROFILE_AUDIT.md` as data mobile's
   own Review Composer already captures but never surfaces anywhere.
3. **Sort/highlight mode**: Recent (default) / Favourites (filters to `favourite === true`,
   still sorted newest-first) / Highest Rated (sorts by `rating` descending, unrated entries
   sort last, ties broken by newest).

All three combine (AND), then the combined result is grouped into the four time buckets from
§2. Filter chips are pill buttons in a horizontally-scrollable row (`overflow-x: auto`, hidden
scrollbar) — three separate rows stacked, one per filter dimension.

---

## 4. Per-entry fields displayed (from `DiaryEntryCard.tsx`)

- Media type badge: **FILM / SERIES / BOOK** (`getMediaBadgeLabel`).
- **TV-specific scope badge** — a real, distinct feature not currently exposed on mobile's
  diary views: `"S{n} review"` (season-level), `"S{n} E{m} review"` (episode-level), or `"Show
  review"` (title-level) depending on the entry's `reviewScope`/`seasonNumber`/`episodeNumber`.
  Confirms episode/season-scoped diary entries are a real, distinguishable feature on the
  website side, not just a schema artifact.
- Rating: numeric decimal (`X/10`), consistent with the numeric convention confirmed elsewhere
  on the website (contra the "Recently watched" stars finding in the Profile audit — Diary
  itself is internally consistent and numeric).
- Collapsible **"Review layers (N)"** disclosure — 2-column grid of `label: value/10` pairs,
  only shown when at least one layer rating is set; closed by default.
- Watched date (formatted `"Mon D"` or `"Mon D, YYYY"` if not the current year).
- Favourite/rewatch/spoiler flags (read from the same underlying fields mobile's diary composer
  already writes — `favourite`, `rewatch`, `containsSpoilers`).
- Edit and Delete actions per entry — Delete requires a two-step confirm (`isConfirmingDelete`
  state per entry, tap once to arm, tap again to confirm — no browser `confirm()` dialog used
  here, unlike the Lists page's `deleteList()` which does use `window.confirm`).

---

## 5. Edit/Delete flow

- **Edit**: `handleEdit()` reopens the same logging UI (`useDiaryLog().openLog()`) pre-filled
  with the entry's full existing state (rating, review, letterboxdRating, watchedDate,
  favourite, rewatch, containsSpoilers, watchedInCinema, reviewLayers) — same
  update-in-place-not-a-new-row philosophy mobile's own Universal Review Composer already
  follows.
- **Delete**: `removeDiaryEntry()` — removes from the local store and (per `lib/diary.ts`'s
  imports) the Supabase-backed delete path, keyed by `(id, mediaType, reviewScope, seasonNumber,
  episodeNumber)` — the same composite identity mobile's own `diary_entries` unique index uses.

---

## 6. Backend Reality Check — Diary

| Brief-requested feature | Real or aspirational? | Evidence |
|---|---|---|
| Calendar/heatmap Diary view | **Not real — purely aspirational if mentioned in a brief** | Exhaustive grep for "heatmap" and "calendar" across `app/`, `components/`, and `lib/` returned zero matches anywhere in the web app. The only view is the relative-time-bucketed feed described in §2. |
| Month-grouped Diary timeline | **Not what the website does** | The website groups by Today/Yesterday/This week/Earlier, never by calendar month — see §2's correction. |
| Season/episode-scoped diary entries | **Real** | `getTvScopeBadge()` renders real season/episode badges sourced from `reviewScope`/`seasonNumber`/`episodeNumber`, fields that already exist in the shared `diary_entries` schema (confirmed in this session's earlier Profile audit work). |
| Cinema vs. Home venue filter | **Real** | Directly reuses the existing `watched_in_cinema` boolean, already known to exist and already captured (but not surfaced) on mobile. |

---

## 7. Mobile's current Diary state (for direct comparison)

**Files read:** `reelshelf-mobile/app/(tabs)/diary.tsx`, `components/ProfileView.tsx`'s Diary
tab and Diary preview section (read fully earlier this session).

- **Two independent diary surfaces exist on mobile, and they don't agree with each other**:
  - `app/(tabs)/diary.tsx` (the standalone Diary tab): flat list, **no time-based grouping at
    all**, no media-type filter, no venue filter, no sort mode — just watched-date-descending.
  - `ProfileView.tsx`'s Diary tab/preview: groups by **calendar month** (`"July 2026"`-style
    labels via `monthLabel()`) — a real grouping mechanism, just not the same one the website
    uses, and not the same one mobile's own other Diary surface uses.
- No Cinema/Home venue filter anywhere on mobile (despite the underlying `watched_in_cinema`
  data already existing).
- No Favourites/Highest-Rated sort modes on mobile's diary surfaces.
- No season/episode scope badges shown on mobile's diary entries.
- Edit/Delete: mobile's standalone Diary tab does have an edit flow (`DiaryRow`,
  `onEdit`/`UniversalReviewComposer`), reusing the same update-in-place philosophy as the
  website — this part is already well-aligned.

---

## OPEN_QUESTIONS_FOR_NEXT_PHASE (Diary)

1. Should mobile standardize on the website's **Today/Yesterday/This week/Earlier** grouping (a
   genuine correction to the current month-grouping), or is month-grouping a deliberate mobile
   choice worth keeping? Either way, mobile's own two diary surfaces should at minimum agree
   with *each other*.
2. Should the Cinema/Home venue filter be added to mobile, now that the audit confirms both the
   underlying data (`watched_in_cinema`) and the website's exact filter semantics to match?
3. Should season/episode-level diary entries get distinct badges on mobile (matching the
   website's `getTvScopeBadge()`), or is title-level-only diary display an acceptable mobile
   simplification given no mobile screen currently produces season/episode-scoped diary rows in
   the first place (worth confirming whether mobile's Review Composer can even create one before
   building display support for it)?
4. No calendar/heatmap exists on either side — confirm this is genuinely out of scope for both
   apps' near-term roadmap rather than something either team is independently about to build.
