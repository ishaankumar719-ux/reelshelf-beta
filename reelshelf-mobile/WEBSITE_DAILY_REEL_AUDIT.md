# Website Daily Reel Audit — Blueprint for Mobile Phase 5

> Read-only audit. Every claim below is traced to an actual web app file path (repo root,
> sibling to `reelshelf-mobile/`) or the pre-confirmed live schema facts supplied with this
> task, read on 2026-07-15. No code was changed to produce this document.

---

## 0. The single most important finding: "Daily Pick" and "/daily-reel" are two different things

The mobile brief's premise — that "Daily Reel" is one feature with a Home preview card linking
to a full tab — is **not how the website is actually built.** There are two distinct things that
share the word "daily":

1. **`DailyPickCard`** (`components/home/DailyPickCard.tsx`) — a self-contained card that fetches
   from `/api/daily-pick`, shown **standalone on the Home page**.
2. **`/daily-reel`** (`app/daily-reel/page.tsx` → `components/daily-reel/DailyReelPage.tsx`) — a
   much bigger **daily-engagement hub** with 6 sections, of which the Daily Pick is only one —
   and that one section **reuses the exact same `<DailyPickCard />` component**, not a
   re-implementation. Confirmed by direct import at `DailyReelPage.tsx` line ~1116.

There is **no click-through from the Home card to `/daily-reel`.** They're the same component
rendered in two places, not a preview-linking-to-full-screen relationship. See §5.

---

## 1. Daily Pick — the personalized recommendation

**Files read (full):** `app/api/daily-pick/route.ts` (190 lines), `lib/recommendation-engine.ts`
(440 lines), `components/home/DailyPickCard.tsx` (470 lines).

### Selection algorithm (exact, not inferred)

`pickBest()` in `lib/recommendation-engine.ts` scores **every** item in the local catalogs
(`localMovies`, `localSeries`, `localBooks` — there is no TMDB-live candidate pool for this
feature, it's the curated local seed only) and returns the single highest scorer:

**Hard exclusions** (`isExcluded()`) — a candidate is thrown out entirely, not just penalized, if:
- it's the current pick being rerolled away from (`excludeMediaId`)
- it's already logged in `diary_entries` for that media type
- it's already on the user's watchlist/reading-shelf in `saved_items` (`excludeWatchlist`
  defaults to `true` and is never overridden to `false` anywhere in the codebase, including the
  reroll path)
- **Type-rotation hard block**: if the user's last 3 daily picks (from `daily_picks`, most recent
  first) were **all the same media type**, that type is completely blocked for today (score
  `-999`, filtered out before ranking).

**Scoring signals** (all additive, all pure — no DB calls inside scoring):
| Signal | Score | "Why this pick?" text shown |
|---|---|---|
| Genre matches a diary entry rated ≥8 (highest-priority genre tier, others skipped if this fires) | +30 | *"Because you loved {title}"* |
| Genre matches a diary entry rated ≥7 (only if above didn't fire) | +25 | *"You enjoy {genre}"* |
| Genre matches a profile-favourite's genre (only if neither above fired) | +15 | *"Similar to your favourite: {title}"* |
| Creator matches a diary entry rated ≥8 | +20 | *"By {creator}, who made {title}"* |
| Creator matches a profile-favourite's creator (only if above didn't fire) | +15 | *"By {creator}, who made your favourite: {title}"* |
| Critically acclaimed (curated `voteAverage` ≥ 8.0) | +15 | *"Critically acclaimed"* |
| Genre matches something on the watchlist | +10 | *"Matches your watchlist taste"* |
| Not picked for anyone in the last 7 days (`recentPickIds`, from `daily_picks` where `pick_date >= today-7d`) | +5 | *(no reason text — silent signal)* |
| Same-type variety penalty (recent picks of the same type, before the hard 3-block above) | −15 each | *(penalty, no reason)* |
| Random tiebreaker | 0–4 | *(no reason — exists purely so equal-scored items rotate day to day)* |

**Recency-avoidance window is exactly 7 days**, sourced from `daily_picks` history, and it's a
soft nudge (+5 freshness bonus for NOT being in that window), not a hard exclusion — a title
genuinely can repeat within 7 days if nothing else scores higher.

### Editorial reason generation ("Why this pick?") — mostly personalized, evidenced

`generateReasons()`: takes every signal that fired with `score > 0 AND reason !== undefined`,
caps at 4, done. **This means reasons are genuinely personalized by default** whenever the user
has *any* diary ratings, profile favourites, or watchlist data that match the picked item.

**The ONLY generic fallback exists when literally zero positive-reasoned signals fired** (a true
cold-start user, or an item that matches nothing about them) — in that single case, exactly one
of these two hardcoded strings is shown:
- `"Critically acclaimed"` (if the item's curated `voteAverage >= 8.0`)
- `"A hidden gem"` (otherwise)

No other generic/templated strings exist anywhere in this path.

### Reroll — confirmed real, exactly 1/day, with exact UI copy

`POST /api/daily-pick`: rejects with `409 "No more rerolls today"` once `reroll_count >= 1` —
**exactly one reroll per day**, not a decrementing counter (`reroll_count` is set to the literal
value `1` on use, never incremented further). Rerolling calls `pickBest()` again with
`excludeMediaId` set to the current pick, so it can't reroll into the same item, but everything
else about scoring (including the 7-day-recency and hard exclusions) applies identically.

UI (`DailyPickCard.tsx`): the button is **not labeled "Reroll"** — exact copy is:
- `"✨ Surprise Me"` (available state)
- `"Choosing…"` (in flight)
- `"No more rerolls today"` (disabled, used)

### Exact UI/terminology (`DailyPickCard.tsx`)

- Eyebrow: **"✨ Your Daily Pick"** (not "Daily Reel")
- Media badge: **"Film" / "TV Series" / "Book"** (note: "TV Series," not "TV")
- Subtitle line: **"One story. Every day."**
- Meta row: `{year} · {genre} · {creator}` (genre only populated for books in this data shape —
  `enrichPick()` sets `genre: null` for films/TV, `genre: item.genre` for books)
- "Why this pick?" section: small uppercase eyebrow + wrapped pill chips, one per reason
- **Three action buttons, all reusing existing mechanisms — no daily-reel-specific logic:**
  1. **"Log It"** → opens the existing `DiaryLogModal`, pre-filled with the pick's media info
  2. **"Add to Watchlist"** → calls the existing `addToWatchlist()` + `upsertSavedItemToBackend()`
     (same functions the rest of the site uses); becomes disabled, label changes to **"Added ✓"**,
     no un-toggle
  3. **"✨ Surprise Me"** (reroll, described above)
- **No click-through anywhere on the card to a detail page.** The poster, title, and body text
  have no `onClick`/`Link`. The only ways to interact are the three buttons above.
- Logged out: `if (!user && !authLoading) return null` — renders **nothing at all**, not a
  fallback state.
- Fetches once on mount when authenticated; **no client-side day-boundary refresh** — if the SPA
  stays open across midnight without a navigation/reload, the card will not refresh to the new
  day's pick on its own (server route computes "today" fresh only on each new request).

---

## 2. `/daily-reel` — the full daily-engagement hub (confirms the brief's Open Question 2 hypothesis)

**Files read:** `app/daily-reel/page.tsx` (full, 334 lines), `components/daily-reel/DailyReelPage.tsx`
(read in full/targeted, 1174 lines), `components/daily-reel/DailyReelEditorial.tsx` (targeted,
579 lines).

**Confirmed: this is real, and much bigger than "the pick."** Logged-in only
(`if (!user) redirect("/auth")` — hard redirect, zero logged-out rendering). Exact section order,
top to bottom:

| # | Section | Eyebrow copy | Source |
|---|---|---|---|
| — | Header | *"Today's Edition"* + `formatDate(today)` in italic serif (e.g. "Wednesday, July 15, 2026") + streak pills (Film/TV/Book, only shown if >0) | `trivia_user_progress` |
| 1 | Daily Pick | *"Daily Pick"* | Reuses `<DailyPickCard />` verbatim |
| 2 | Question of the Day | *"Question of the Day"* | `trivia_daily_rotation` + `trivia_questions`, per-category (film/tv/book) tabs |
| 3 | Today's Story | *"Today's Story"* | `articles` table, most recent published, "Read more" expand |
| 4 | Today's Staff Picks | *"Today's Staff Picks"* | `staff_picks` table, up to 6, `display_order` |
| 5 | Hidden Gem | *"Hidden Gem"* (also shown as "Hidden Gem 💎" in one spot) | **NOT `daily_picks`** — a completely separate, simpler mechanism (§3) |
| 6 | Today's Progress | *"Today's Progress"* | `daily_progress` (§4) |

### Trivia rotation (`getOrCreateRotation`, `app/daily-reel/page.tsx`)

One question per category (film/tv/book) per day, chosen to avoid repeating anything used in the
last **30 days** (`trivia_daily_rotation`, `cutoff.setDate(cutoff.getDate() - 30)`), falling back
to the full pool if every question in that category was already used within 30 days. Persisted
via `upsert(..., { onConflict: "rotation_date" })` so concurrent requests converge on one shared
rotation for the day, not per-user.

---

## 3. Hidden Gem — resolved: distinct from Daily Pick, much simpler algorithm

`getHiddenGem()` (`app/daily-reel/page.tsx`): **films only**, drawn from a fixed hardcoded list of
9 titles (`HIDDEN_GEM_IDS` — Blade Runner 2049, Arrival, Midsommar, Heat, Nightcrawler, Drive,
Sicario, No Country for Old Men, Se7en), excluding ones the user has already logged, then picked
**deterministically** via a date-seeded hash (`dateSeed()` — sums char codes of the date string)
modulo the eligible pool size. **Not randomized, not scored, not personalized beyond the simple
"already watched" exclusion** — every user sees the same Hidden Gem on the same day (unless their
exclusion set differs). This is a genuinely different, much simpler mechanism from the
recommendation-engine-scored Daily Pick — confirms they are two distinct features that happen to
sit next to each other on the same hub page.

---

## 4. Today's Progress — the `daily_progress` flags, exact triggers

`markProgress()` (`DailyReelPage.tsx`) upserts `daily_progress` (`onConflict:
"user_id,progress_date"`) the moment each flag first becomes true (idempotent — already-true
flags are never re-written):

- **`picked`** — fires on `onClickCapture` anywhere inside the Daily Pick section's wrapper div.
  This means it fires on **any click within that area at all** (including clicking Log It / Add
  to Watchlist / Surprise Me, or just clicking the poster) — it does not specifically mean "you
  added it to your diary."
- **`question_answered`** — fires when a trivia answer is submitted.
- **`story_read`** — fires when "Read More" is expanded on the featured article (not when
  collapsed again).
- **`staff_picks_explored`** — fires when a staff pick card is clicked.

The pre-confirmed schema fact that `daily_progress` currently has 0 rows in production simply
means no real user has completed any of this hub yet — the mechanism itself is fully real and
wired, just unused so far.

---

## 5. Home → Daily Reel navigation — resolved (contradicts the brief's assumption)

**There is no "tap the Home preview to open the full Daily Reel screen" relationship on the
website.** `DailyPickCard` is the exact same component instance-type rendered in two unrelated
places (Home page standalone; embedded as section 1 of `/daily-reel`). Neither rendering links to
the other. The only way a user reaches `/daily-reel` is by navigating there directly (nav
link/URL) — not by tapping anything on the Home card. Mobile should not build a "tap Home Daily
Reel card → opens Daily Reel tab" interaction expecting it to mirror something real, because nothing
like that exists on the website to mirror.

---

## 6. Staff Picks — resolved relationship to `daily_picks`

**Not a logged-out fallback, not related to `daily_picks` in any way.** `staff_picks` is queried
in exactly one place (`fetchEditorialData()` in `app/daily-reel/page.tsx`) and rendered in exactly
one component (`StaffPicksSection` in `DailyReelPage.tsx`) — both gated behind the same
`redirect("/auth")` as everything else on that page. A repo-wide search found zero other
references to `staff_picks` anywhere (no public/marketing page, no other fallback path). It is
simply a 6-item editorial row (`display_order`, `is_active`) sitting alongside Trivia/Story/Hidden
Gem/Progress in the hub — its only "relationship" to Daily Pick is being a sibling section on the
same page.

---

## 7. Media-type naming resolution ('film' vs 'movie') — resolved

- **`'film'`** is the vocabulary of the *daily/editorial* subsystem: `daily_picks.media_type`,
  `staff_picks.media_type`, `trivia_questions.category`, and every local seed catalog
  (`localMovies`/`localSeries`/`localBooks`).
- **`'movie'`** is the vocabulary of the *core content* subsystem: `diary_entries`,
  `saved_items`, `mount_rushmore` — everything the mobile app's own `mediaActions.ts` already
  matches (`toDbMediaType`).
- **The translation happens at exactly one small, explicit boundary function**,
  `mediaTypeToLogType()` in `DailyPickCard.tsx`:
  ```
  film → movie,  tv → tv,  book → book
  ```
  used only when handing a daily-pick item off to `DiaryLogModal` or `addToWatchlist`/
  `upsertSavedItemToBackend`. It is not automatic or implicit anywhere else — every consumer of
  `daily_picks`/`staff_picks` data must apply this mapping itself before touching diary/saved_items.
  Mobile already has an equivalent, differently-named pattern (`toDbMediaType` mapping `'film'
  → 'movie'`) in `lib/supabase/mediaActions.ts` — same shape, just built independently.

---

## 8. Timezone / day-boundary handling — the riskiest part, documented explicitly

**The website uses the server's UTC clock, not the user's local calendar date, anywhere `today`
is computed.** Confirmed identically in three independent places:
- `app/daily-reel/page.tsx`: `const today = new Date().toISOString().split("T")[0]!`
- `app/api/daily-pick/route.ts` (both GET and POST): `const today = new Date().toISOString().slice(0, 10)`
- `lib/recommendation-engine.ts`'s `buildUserContext`: defaults to the same
  `new Date().toISOString().slice(0, 10)` when no `today` override is passed.

`new Date().toISOString()` is **always UTC**, regardless of server or client locale. This means:
- A user well west of UTC (e.g., US Pacific, UTC−8) will see "today's" pick/hub roll over at
  **4pm the previous day** in their own local time, not at their own midnight.
- A user east of UTC will see it roll over **later in their morning**, not at their own midnight
  either.
- `formatDate()` (`DailyReelPage.tsx`) does apply `toLocaleDateString("en-US", {...})` for
  *display* formatting, but this only formats the already-UTC-derived date string nicely — it
  does not change *which* calendar day is being shown.

**This is a real, confirmed discrepancy from the mobile brief's "local calendar date" demand.**
The website does not do what the brief assumes. This needs an explicit decision from the user
before implementation: match the website's UTC-day behavior exactly (for consistency with the
real backend, since `daily_picks` rows are keyed by this same UTC `pick_date` and any mismatch
would cause mobile and web to disagree about "today's" pick for the same account), or diverge
deliberately to use true local-calendar-date on mobile (which the brief wanted, but would then
show a *different* pick than the website for the same user near a day boundary, and — trickier —
mobile would need its own client-computed local date rather than trusting a server-provided
`today`, changing how `daily_picks`'s `UNIQUE(user_id, pick_date)` constraint gets used).

---

## 9. Mobile's current state (for direct comparison)

- **Home preview** (`reelshelf-mobile/components/DailyReel.tsx`): fully static. Reads
  `dailyReelPick` from `data/seedHomeContent.ts` (a hardcoded seed object) — no backend call, no
  personalization, no day-awareness, no reroll, no Log/Watchlist actions. Single button **"View
  Today's Pick"** navigates directly to the item's Movie Detail (`/media/{id}`) — notably,
  mobile's version *does* have a click-through the website's `DailyPickCard` does not have.
- **Daily Reel tab** (`reelshelf-mobile/app/(tabs)/daily-reel.tsx`): a bare placeholder —
  literally just the text "Daily Reel" / "Phase 1 placeholder," no data, no sub-sections, does not
  reuse the Home component.
- `daily_picks`, `daily_progress`, `staff_picks`, `trivia_daily_rotation`, `articles` are not
  touched by mobile anywhere today.

---

## Open questions for next phase (explicitly resolved above, restated as scoping decisions)

1. **Scope decision**: build just the Daily Pick (personalized rec, reroll, Log/Watchlist
   actions — a self-contained, moderate-size feature closely matching what mobile's Home card
   already gestures at), or the full 6-section hub (Trivia rotation + Staff Picks + Hidden Gem +
   Today's Story + Progress tracker — substantially larger, touches 5 more tables/RPCs)? This
   audit deliberately does not recommend one over the other — it's a real scope call for the user.
2. **Timezone decision** (§8): match the website's UTC-day behavior for backend consistency, or
   deliberately diverge to true local-calendar-date on mobile, accepting that mobile and web may
   disagree on "today's pick" near a day boundary for the same account.
3. If only the Daily Pick is built: should mobile's existing "tap card → Movie Detail" navigation
   (which the website doesn't have) be kept as a mobile-specific improvement, or removed to match
   the website's "no click-through, actions only" pattern exactly? Worth a deliberate call since
   it's a real, existing behavioral difference already present in mobile's code, not something
   this audit is proposing to add.
4. There is no "Related Discovery"/"More Like This" row anywhere in this feature on the website —
   confirmed absent, not simply unread. If mobile wants such a row, it would be a net-new addition
   with no website behavior to port, not a parity item.

---

## Addendum (read-only, 2026-07-15): Friend Activity, New Reviews, New Lists, Trending
## Collections, Recently Added — do any of these appear on `/daily-reel`?

> Re-read fresh for this specific question, not pulled from memory of the passes above. Covers
> `app/daily-reel/page.tsx`, `components/daily-reel/DailyReelPage.tsx` (full, all 1174 lines —
> the file was previously read in two passes; this addendum confirms full coverage), and
> `components/daily-reel/DailyReelEditorial.tsx` (full, 579 lines — not previously read in
> either prior audit pass). No code was changed to produce this addendum.

**New finding this pass:** `components/daily-reel/DailyReelEditorial.tsx` defines a full
alternate component tree — `FeaturedArticleSection`, its own separate `StaffPicksSection`,
`UpcomingSection` ("Upcoming releases"), and `FanPicksSection` (eyebrow "Community", title
"Trending this week", ranked by `log_count`) — but its default-exported `DailyReelEditorial`
component is **never imported as a value anywhere in the codebase** (confirmed via repo-wide
grep: only its *types* — `ArticleData`, `StaffPickData`, `UpcomingRelease`, `FanPickData` — are
imported, by `app/daily-reel/page.tsx` and `DailyReelPage.tsx`, purely for type annotations).
This file is dead code with respect to the real page — the actual `/daily-reel` route renders
`DailyReelPage.tsx`'s own inline section components instead (confirmed exact section list below).
None of the five concepts below live in this orphaned file either, so this doesn't change any of
the five outcomes — but it's worth flagging so no future pass mistakes this file for something
live.

**The real, definitive `/daily-reel` render tree** (`DailyReelPage.tsx` lines 1078–1172) is
exactly 7 sections, in order: Header, Daily Pick, Question of the Day, Today's Story, Today's
Staff Picks, Hidden Gem, Today's Progress. Nothing else is rendered.

| Concept | Outcome | Evidence |
|---|---|---|
| **Friend Activity** | Exists on the website, but on a different page | Home page, not `/daily-reel`: `components/home/HomeDashboardClient.tsx` section 3 "FRIENDS ACTIVITY" (line 1418), a `FriendActivityCard` component (line 222), fed by `friendsActivity` state (line 1003) populated via `getFriendsActivity()` (line 1076). Also a dedicated route, `app/activity/page.tsx`, rendering `ActivityFeed` (`components/activity/ActivityFeed.tsx`). Zero occurrences of "friend" in any of the three `daily-reel/*` files. |
| **New Reviews** | Does not exist anywhere under this name; closest analog lives elsewhere, not on `/daily-reel` | No file/component/section titled "New Reviews" exists anywhere in `app/` or `components/` (exact-phrase grep: zero hits). The closest conceptual match is Home's "Recently logged" section (`HomeDashboardClient.tsx` line 1486, `recentlyLogged` derived from the user's own `diaryEntries`, line 1111) and `recentReviews` passed into `ProfileShowcase` on `app/u/[username]/page.tsx` (line 514) — different name, different page, and neither appears in any `daily-reel/*` file (zero occurrences of "review" beyond the unrelated word "preview"). |
| **New Lists** | Exists on the website, but under a different name and a different page | Home page: `components/home/HomeDashboardClient.tsx` section 4 "RECENT LISTS" (line 1459), title copy "Recent lists" (line 1463), fed by a `recentLists` prop (`DiscoveryList[]`, line 992). Not literally "New Lists," and not on `/daily-reel` — zero occurrences of "list" in any `daily-reel/*` file (the one match, "Add to **Watchlist**," is unrelated). |
| **Trending Collections** | Does not appear to exist anywhere on the website | Exact-phrase grep for "Trending Collections" across `app/` and `components/`: zero hits. The two halves exist *separately* and never combine: "Trending" appears extensively as per-media-type rows (Trending Films/Series/Books/Today/This Week/Now) across Home, Discover, Movies, Series, Books, and Search pages; "Collection" appears separately as a static curated-franchise detail page (`app/discover/collection/[slug]/page.tsx`, backed by `COLLECTION_DEFS` in `lib/discoverCollections`) — not a trending row, not a Home/daily-reel section. No component, route, or copy anywhere merges these into a "Trending Collections" concept. Zero occurrences of "collection" in any `daily-reel/*` file. |
| **Recently Added** | Does not appear to exist anywhere on the website | Exact-phrase grep for "Recently Added" (and near variants "newly added," "new arrivals," "just added") across `app/` and `components/`: zero hits. The closest adjacent concepts are Home's "Recently logged" (user's own diary activity, not catalog-wide "recently added" content) and "Recent lists" — neither titled "Recently Added," neither catalog-scoped, neither on `/daily-reel`. Zero occurrences of "recently" or "added" in any `daily-reel/*` file. |

**Conclusion:** None of the five — Friend Activity, New Reviews, New Lists, Trending
Collections, Recently Added — appear anywhere in the real `/daily-reel` render tree. Two
(Friend Activity, as "Recent lists"-style New Lists) exist on the website under different names,
on the Home page. One ("New Reviews") has a loosely related but differently-named and
differently-scoped analog on Home/profile pages. Two (Trending Collections, Recently Added) do
not appear to exist anywhere on the website in any form, under any name.
