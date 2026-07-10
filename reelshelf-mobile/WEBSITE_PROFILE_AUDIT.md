# Website Profile Audit — Blueprint for Mobile Rebuild

> Read-only audit. No code was changed to produce this document — every claim below is traced to an
> actual file path and line range in the Next.js web app (repo root, sibling to `reelshelf-mobile/`),
> read on 2026-07-10. Where mobile's current behavior differs, both sides are stated explicitly so a
> future rebuild task can decide (not silently assume) which convention wins.

---

## 0. Architecture overview — read this first

The website's "Profile" is **not one screen**. It is:

1. **`/profile`** (`app/profile/page.tsx`) — the **owner-only edit page** (a full page, not a modal/sheet).
   Renders `ProfileEditor` (form) + `ProfileHighlights` + `UserListsSection`.
2. **`/u/[username]`** (`app/u/[username]/page.tsx`) — the **public showcase**, viewable by anyone,
   viewed differently if owner/follower/stranger/private. Renders `ProfileShowcase` + `ProfileHighlights`
   + `UserListsSection`.
3. **Six dedicated deep-dive pages**, each its own route (real navigation, not client-side tab state):
   `/u/[username]/films`, `/series`, `/reviews`, `/watchlist`, `/followers`, `/following`
   (`app/u/[username]/_components/ProfileTabStrip.tsx` renders the nav strip linking between them).

Mobile currently models all of this as **one screen with 7 in-page tabs** (Overview/Movies/TV/Books/
Reviews/Lists/Diary) inside `components/ProfileView.tsx`. This is a fundamentally different information
architecture, not just a styling difference — flagged throughout below and again in
`OPEN_QUESTIONS_FOR_NEXT_PHASE`.

---

## 1. Mount Rushmore (highest priority — full spec)

**Files read:**
- `src/components/profile/MountRushmoreEditor.tsx` (edit UI, 536 lines)
- `src/components/profile/ProfileShowcase.tsx` lines 284–471, 1256–1272, 1586–1650 (display UI)
- `src/components/profile/ProfileEditor.tsx` lines 148–242 (load), 400–478 (save), 742–754 (embed)
- `src/types/profile.ts` lines 38–45 (`MountRushmoreSlot` type)
- Live production `mount_rushmore` table query (13 real rows inspected directly)

### 1a. Confirming/correcting the prior assumption

**Corrected, not confirmed as originally assumed.** `mount_rushmore` is the real, correct table — that
part of the prior assumption holds. But the prior assumption implicitly modeled it as **one combined
4-slot set mixing all media types** (as mobile's `lib/supabase/mountRushmore.ts` / `Top4Picker.tsx` /
`TopStoriesGrid.tsx` currently do). **That is wrong.** The real schema and every real query
(`ProfileEditor.tsx:167-171`, `app/u/[username]/page.tsx:311-316`) order by
`.order("media_type").order("position")` and the editor/display code both group slots **by
`media_type`**. The real feature is:

> **Three independent 4-slot sets — one for Films, one for Series, one for Books — selectable via a
> tab strip, each with its own 4 positions (1-4), each saved/deleted independently of the other two.**

Confirmed directly against live production data: real rows exist with `media_type IN ('movie','tv','book')`
and `position` values that **repeat across types** (e.g. `position=1` exists three times for one user —
once per media type) — impossible under a single global 4-slot model. Up to **12 real slots** per user,
not 4.

### 1b. Exact selection/edit flow

- Editor lives inline inside `/profile` (the edit page), inside a card titled **"Mount Rushmore"**, with
  copy: *"Pick four defining films, series, or books. Each tab saves independently, so your top 4 in one
  category never overwrites another."* (`ProfileEditor.tsx:745-748`)
- Above the 2×2-on-mobile / 4-col-on-desktop grid: a 3-way pill tab strip — **Films / Series / Books**
  (`MountRushmoreEditor.tsx:368-401`), each tab fully independent state.
- Tapping an **empty slot** opens an inline search panel directly below the grid (not a modal), captioned
  *"Picking for slot {n}"*, with a debounced (300ms) search input, placeholder text changes per tab
  (`"Search films…"` / `"Search series…"` / same generic text for books).
- **Search sources differ by tab:**
  - Films/Series → `searchMedia()` (`@/src/lib/searchMedia`) with `types: "film"` or `"series"` — this is
    the site's own TMDB-backed search endpoint (not raw TMDB fetch from the client).
  - Books → **direct client-side fetch to `https://openlibrary.org/search.json?q=...&limit=10`** — real
    OpenLibrary API, not Google Books, not TMDB. Poster built as
    `https://covers.openlibrary.org/b/id/{cover_i}-M.jpg` when `cover_i` present, else `null`.
- Search results render as a 3-column grid of poster cards with a colored media-type badge
  (Film=blue, Series=emerald, Book=violet) in the corner (`SearchTypeBadge`, lines 76-92).
- Tapping a result fills that slot immediately (no separate "confirm" step) and closes the search panel.
- Filled slots show a small **"×" remove button** (top-right, opacity 0→1 on hover/group-hover) and the
  title/year burned into a bottom gradient caption inside the poster tile.
- **Save is per-tab, not global**: on the parent Save action, the code loops over `["movie","tv","book"]`
  and for **each** media type independently: `DELETE FROM mount_rushmore WHERE user_id=? AND
  media_type=?` then `INSERT` only that type's non-empty slots (`ProfileEditor.tsx:420-471`). A user
  editing only their Films tab does not touch Series/Books rows at all.
- Clicking outside the editor (mousedown outside `rootRef`) or pressing **Escape** cancels the active
  slot-picker without saving.
- **Poster URL resolution already implemented correctly on web**, in two places, both handling the exact
  same 3 real formats mobile had a bug with:
  ```ts
  // MountRushmoreEditor.tsx:45-49 (search results / editor grid)
  function getPosterSrc(slot) {
    if (!slot.poster_path) return null
    if (slot.poster_path.startsWith("http")) return slot.poster_path
    return getPosterUrl(slot.poster_path, "w154")
  }
  // ProfileShowcase.tsx:284-288 (public display grid)
  function getRushmorePosterSrc(slot) {
    if (!slot.poster_path) return null
    if (slot.poster_path.startsWith("http")) return slot.poster_path
    return `https://image.tmdb.org/t/p/w342${slot.poster_path}`
  }
  ```
  This corroborates the earlier mobile-side finding (previous task's audit) that bare TMDB paths and
  full OpenLibrary URLs are the two real stored shapes — the website already special-cases both, exactly
  matching what `reelshelf-mobile/lib/resolveImageUrl.ts` now also does. Note the two web call sites use
  **different poster sizes** (`w154` in the editor's own grid/search results vs. `w342` on the public
  display grid) — intentional (smaller editing thumbnails, larger showcase art).

### 1c. Exact display treatment (public showcase, `/u/[username]`)

- Section label: **"Mount Rushmore"** (`sectionLabelStyle()`, uppercase, 10px, letter-spacing 0.06em,
  `rgba(255,255,255,0.34)`).
- Same 3-way **Films / Series / Books** tab strip as the editor (client-state, no navigation).
- Grid: `grid-template-columns: repeat(auto-fit, minmax(100px, 1fr))` on desktop, **forced to exactly 2
  columns on mobile** (`.pf-rushmore-grid { grid-template-columns: repeat(2, 1fr) !important }`,
  explicitly commented *"eliminates orphan tile at 3-col"*) — confirms the intended mobile treatment is a
  clean **2×2 grid**, matching what mobile's `TopStoriesGrid.tsx` already builds, just tripled per media
  type instead of a single set.
- Poster aspect ratio: **2/3**, `border-radius: 10px`, `object-fit: cover`.
- Each filled card: poster + title (11px, truncated) + year (10px, muted) below, `hover:scale(1.04)` on
  the poster (desktop-only affordance — the mobile adaptation rule here is the existing `usePressLift`
  scale-on-press pattern already used everywhere else in the mobile app).
- Empty slot: dashed border tile (`1.5px dashed rgba(255,255,255,0.1)`), no icon, no label — quieter than
  mobile's current empty-slot treatment (which uses a `+` icon via `PlusIcon` only in the **editor**, not
  in the read-only display grid).
- Whole-tab empty state: italic centered caption, *"Build your top 4 films"* / *"…series"* / *"…books"*.
- Tapping a filled card navigates via `getRouteForMedia(mediaType, mediaId)` →
  `/films/{id}` | `/series/{id}` | `/books/{id}` (web's own route scheme, not directly reusable, but the
  **mobile equivalent is already correct**: mobile's `/media/{routeId}` with `film-`/`tv-`/`book-`
  prefixes serves the identical purpose).

### 1d. Media types supported — confirmed precisely

**Movies, TV series, AND books** — all three, each with their own independent 4-slot set (12 slots total
per user, not 4). This is the single most important correction to the prior mobile-rebuild assumption.

### 1e. Recommended mobile adaptation

- Rebuild `lib/supabase/mountRushmore.ts` to fetch/save **per media_type**, mirroring the website's
  three-independent-sets model exactly (delete+insert scoped to one `media_type` per save operation, not
  the whole table).
- Rebuild the picker (`Top4Picker.tsx`) with a 3-tab strip (Films/Series/Books) — desktop hover states
  become the app's existing `usePressLift` + haptic-on-press convention (per the desktop→mobile rule).
  Reuse mobile's own live search infra already built for the Universal Search screen (TMDB movie/tv +
  OpenLibrary or Google Books for book search) rather than re-inventing the web's `searchMedia`/OpenLibrary
  calls verbatim — but note the website uses **OpenLibrary**, not Google Books, for this specific feature;
  decide whether mobile's Mount Rushmore book search should match OpenLibrary for data consistency with
  real existing rows (all 13 inspected book rows in production use OpenLibrary cover URLs).
- `TopStoriesGrid.tsx` already renders the correct 2×2 shape and already fixed the poster-URL bug — it
  just needs to be parameterized by `activeMediaType` and rendered inside a 3-tab strip instead of a
  single un-typed 4-slot list.

---

## 2. Header (identity block)

**Files:** `ProfileShowcase.tsx` lines 1421-1536 (public), `ProfileEditor.tsx` (edit form fields).

| Element | Website | Mobile currently |
|---|---|---|
| Avatar | 88×88 circle, colored ambient ring (`INITIAL_COLORS` picked per-user via `getAvatarColor(username)`), gradient fallback with initials | 104×104 circle, plain border, initials fallback — **no per-user ambient color ring** |
| Name | `display_name \|\| username`, 22px/700 | matches (heading style) |
| Username | `@username`, 13px muted | matches |
| Member since | `"Member since {Month Year}"` — exact copy, formatted `en-US` | mobile: `"Joined {Month Year}"` — different copy, same data |
| Bio | plain paragraph, 3-line clamp, 680px max-width | matches (no clamp currently on mobile) |
| Website URL | rendered as a clickable link below bio, teal (`#67d7b2`), text = raw URL | **entirely absent on mobile** — `profiles.website_url` is never read/shown |
| Edit button (owner) | `Link` to `/profile` (full page navigation), label **"Edit profile"** | opens `EditProfileModal` (bottom sheet) — reasonable mobile adaptation of a full-page-nav→sheet pattern |
| Follow button (non-owner) | `FollowButton` — pill, states Follow/Following/loading `"…"` | matches conceptually |
| Taste-match badge | non-owner only, `"◈ {n}% taste match"` pill, tooltip *"Taste match score based on shared logged titles"* | **entirely absent on mobile** — no taste-match System 1 exists |

---

## 3. Stats

**Files:** `app/u/[username]/page.tsx` lines 296-380, 514-618 (query + computation);
`ProfileShowcase.tsx` lines 1318-1333, 1538-1578 (render).

### Exact metrics, exact labels, exact order (website)

| Label | Value computed from | Href |
|---|---|---|
| Logged | `films + series + books` (see below) | none |
| Films | `allRows.filter(media_type==='movie').length` | `/u/{username}/films` |
| TV | `allRows.filter(media_type==='tv').length` | `/u/{username}/series` |
| Books | `allRows.filter(media_type==='book').length` | none |
| Lists | `count` of `user_lists` rows | none |
| Watchlist | `count` of `saved_items` where `list_type='watchlist'` **only** | `/u/{username}/watchlist` |
| Reviews | `allRows.filter(row => parseRating(row.rating) !== null).length` | `/u/{username}/reviews` |
| Followers | `count` of `followers` where `following_id = profile.id` | `/u/{username}/followers` |
| Following | `count` of `followers` where `follower_id = profile.id` | `/u/{username}/following` |
| Cinema | conditionally shown only if `cinemaVisits > 0` — count of movie rows with `watched_in_cinema=true` | none |

`allRows` = **every** `diary_entries` row for the user where `review_scope IN ('show','title')`, no other
filter, no limit (`app/u/[username]/page.tsx:325-330`).

### Two critical, non-obvious discrepancies vs. mobile

1. **Films/TV/Books counts are ROW counts, not distinct-media-id counts.** The website does
   `allRows.filter(...).length` with zero deduping — a rewatched title counted twice in `diary_entries`
   is counted twice in "Films". **Mobile deliberately does the opposite** — `lib/supabase/profile.ts`'s
   `countDistinctMediaIds()` was built specifically to be "rewatch-safe" (verified empirically in a prior
   mobile task with 2 TV episode rows sharing one media_id). These will show **different numbers for the
   same user** if a rebuild just copies mobile's existing logic assuming it matches the website. This is
   a genuine product decision, not a bug either fixes — flagged in `OPEN_QUESTIONS_FOR_NEXT_PHASE`.
2. **"Reviews" counts RATED entries, not entries with review text.** `parseRating(row.rating) !== null`
   — a title rated 8/10 with zero written review text counts toward "Reviews" on the website. Mobile's
   `fetchStats()` counts `review IS NOT NULL AND review <> ''` — i.e. actual written text. A genuinely
   different metric hiding behind the identical label. (The website *does* separately compute a true
   review-text count — `reviewTextCount`, `app/u/[username]/page.tsx:352-356` — but that number is only
   used internally for badge-unlock thresholds, **never shown** as the "Reviews" stat.)
3. **"Watchlist" excludes books entirely.** Only `list_type='watchlist'` is counted; `reading_shelf` rows
   are never included in this number or in Recent Activity's `"watchlisted"` event type
   (`lib/activity.ts:285-291` explicitly filters `.eq("list_type","watchlist")`). Mobile's own
   `saved_items` schema already has both `list_type` values (confirmed identical convention on both
   sides via `app/watchlist/page.tsx` and `app/reading-shelf/page.tsx`), but a rebuild must decide
   whether mobile's "Watchlist"-equivalent stat should follow the website's movies/TV-only convention.

### Additional stats modules absent from the single stats grid but present elsewhere on the page

- **CinemaStatsModule** (`ProfileShowcase.tsx:790-1011`) — only rendered if `cinemaVisits > 0`. A whole
  rich card: total visits, most-active month (grouped by `watched_date.slice(0,7)`), last visit
  (poster+title+rating), highest-rated cinema visit (poster+title+rating), up to 6 recent posters.
  Entirely absent from mobile. The underlying `watched_in_cinema` boolean **does already exist** in
  mobile's diary composer as the "Watched in Cinema" toggle — the data is being captured on mobile
  already, just never surfaced.
- **TasteSnapshot** (`components/profile/TasteSnapshot.tsx`, part of `ProfileHighlights`) — "Taste
  Snapshot" card: Films/TV/Books/Avg-rating 4-cell grid, plus a "Current Obsession" sub-row (most
  frequently-logged title in the last 30 days, tie-broken by highest rating).
- **SocialProof** (`components/profile/SocialProof.tsx`) — "Social" card: Followers / Following /
  **Reactions** (`diary_entry_reactions` table count — a social feature with zero mobile equivalent).
- **TopRatedThisYear** (`components/profile/TopRatedThisYear.tsx`) — "Top Rated · {year}" card, top 4
  perfect/near-perfect-rated titles **from the current calendar year's `created_at`** — note the year in
  the label and the `yearStart` cutoff (`utils/profileStats.ts:96`, `"2026-01-01"`) are **hardcoded
  literal strings**, not computed from `new Date()` — worth flagging as a likely latent bug on the
  website itself (will silently stop updating/show a stale year once real 2027 data exists), not
  something to faithfully replicate.
- **MostReactedReview** (`components/profile/MostReactedReview.tsx`) — single card, the diary entry with
  the most rows in `diary_entry_reactions`, showing poster/title/review-snippet/reaction count.

---

## 4. Recent Activity

**Files:** `lib/activity.ts` (full event-assembly logic, 335 lines), `ProfileShowcase.tsx` lines 66-249
(timeline render).

### Confirmed data source

**Derived client/server-side from existing tables at request time — no dedicated activity table exists
yet**, exactly matching mobile's own approach (`lib/supabase/recentActivity.ts`). Sources merged:
`diary_entries`, `saved_items` (watchlist only), `mount_rushmore`, `user_lists`. The file's own trailing
comment block (`lib/activity.ts:310-334`) documents a **planned but unbuilt** `activity_events` table for
"Phase 2" — confirming this is intentionally a derived-feed-for-now feature on the website too, not
something mobile is behind on.

### Exact event types & exact copy templates (`getTimelineActionLabel`, lines 66-78)

| `type` | Label shown | Derivation |
|---|---|---|
| `reviewed` | "Reviewed" | diary row has review text OR any non-null layer-rating column |
| `finished_series` | "Finished" | **defined in the type union and label map, but never actually emitted anywhere in `buildActivityEventsFromSources`** — dead/reserved, not a real current event |
| `watched_episode` | "Started reading" (books) / "Started watching" (else) | **every TV diary row** is unconditionally typed `watched_episode` (not `reviewed`/`logged`) unless it's marked `favourite` — TV never gets a "Reviewed" event even with a full review, unlike movies/books |
| `watchlisted` | "Watchlisted" | `saved_items` rows, `list_type='watchlist'` only |
| `added_favourite` | "Marked favourite" | any diary row with `favourite=true`, regardless of media type (takes priority over `reviewed`/`watched_episode`) |
| `list_created` | "Created a list" | `user_lists` rows; `media_type` hardcoded `"movie"` (unused), poster always `null` |
| `rushmore` | "Updated Favourite Four" | **one single synthetic event** per profile load if any `mount_rushmore` row exists, using the most-recent row's `created_at`, `isBatch: true`, `batchCount = mount_rushmore row count` — i.e. it reports "you touched Rushmore" with a count, not which items changed. Note the internal copy **"Favourite Four"** as an alternate/colloquial name for the same feature. |
| `challenge_completed` | "Completed a challenge" | defined but no emission path found in the read files — likely tied to an unread challenges system, not confirmed further in this audit |
| `logged` (fallback) | "Logged" | movie diary row, no review content, not favourited |

### Batching behavior (not present on mobile at all)

Events of type `logged`/`reviewed`/`finished_series` occurring within a **60-second window**
(`BATCH_MS = 60000`) of each other are collapsed into one synthetic entry reading **"{n} films"** when
the batch has **4 or more** items (`collapseActivityEvents`, lines 102-156) — designed for bulk-import
scenarios. Mobile's activity feed shows every entry individually with no batching.

### Timeline visual (mobile adaptation target)

Vertical dot-timeline, not cards: 8px colored dot per event (`getTimelineDotColor`, color coded by type —
gold for reviewed, green for finished_series, pink for favourite, purple for watchlisted/list_created,
orange for rushmore), connecting 1px vertical line, 32px poster thumbnail, label+title one line, relative
time below (`relativeTime()` — custom formatter: "just now" / "{n}m ago" / "{n}h ago" / "yesterday" /
"{n}d ago" / "1 week ago" / "{n} weeks ago" / "{n} months ago" / "{n}y ago"). Shows first 10, "Show more"
button reveals the rest (up to `limit=20` fetched). Empty state: italic "No activity yet".

Mobile's `components/profile/ActivityCard.tsx` (built in a prior task) uses card-style rows with an
icon-badge, not a connected dot-timeline — a legitimate mobile simplification, but the color-coding,
batching, and exact copy templates above are not currently replicated.

---

## 5. "Recently watched" (separate from Recent Activity — easy to conflate, confirm distinct)

**Files:** `app/u/[username]/page.tsx` lines 317-324 (query), `ProfileShowcase.tsx` lines 513-606,
486-511 (render).

A **horizontal poster-scroll row**, section label **"Recently watched"**, distinct from the "Recent
activity" timeline directly below it. Query: `diary_entries` where `review_scope IN ('show','title')`
AND `poster IS NOT NULL`, ordered by `watched_date DESC`, limit 20. Each card: 120px-wide poster (2/3
aspect), title, **5-star rating display** (`RecentItemStars`, lines 486-511 — `full = floor(rating/2)`,
`half = rating % 2 >= 1`, gold stars `★` at 0.9/0.55/0.12 opacity for full/half/empty), review snippet
(2-line clamp) if present, formatted watched-date (`"MMM YYYY"`).

**Important rating-display discrepancy:** this is a real, live 5-star treatment on the website, directly
contradicting the "numeric decimal convention, never stars" assumption a prior mobile task explicitly
built against. The website is **inconsistent with itself**: `RecentItemStars` shows stars here, while
`CinemaStatsModule` and `YouMayLikeCard` show plain `{rating.toFixed(1)}/10` or `{rating.toFixed(1)}`
numeric badges elsewhere on the *same page*. This needs a human decision, not a silent pick — see
`OPEN_QUESTIONS_FOR_NEXT_PHASE`.

---

## 6. Highest Rated

**Files:** `app/u/[username]/page.tsx` lines 524-533, `ProfileShowcase.tsx` lines 608-650.

Section label **"Highest rated"**. Only entries with `rating >= 10` (perfect scores only, not merely
"high") **and** a poster, deduplicated by exact title string match, capped at 5. Small
`repeat(auto-fill, minmax(64px,1fr))` grid, 64px poster tiles, no title/rating text shown at all — pure
poster wall. No mobile equivalent exists.

---

## 7. Reviews

**Files:** `app/u/[username]/page.tsx` lines 331-338, 514-516 (query+filter), `PublicDiaryEntriesGrid.tsx`
(grid wrapper), `components/reviews/ReviewCard.tsx` (not fully read — referenced, handles likes/comments).

- Section label: **"Reviews"**.
- Query: `diary_entries` where `review_scope IN ('show','title')` **AND** (`review != ''` **OR** any of 8
  layer-rating columns is non-null) — i.e. a "review" here can be layer-ratings-only with zero text,
  ordered by `saved_at DESC`, limit 8.
- Rendered via `ReviewCard` — a rich card supporting: rating (`reelshelf_score`), review text, layer
  ratings object (`reviewLayers` — same 8 columns mobile's own Reviews tab already surfaces per the prior
  mobile redesign task), attachment (`attachment_url`/`attachment_type`), `review_cover_url` +
  `review_cover_source` (`'default'|'tmdb_poster'|'tmdb_backdrop'|'upload'` — **a review-cover-image
  concept with zero mobile equivalent** — mobile only has a single generic `attachment_url`), spoiler
  flag, favourite/rewatch flags, and a full **like + comment system** (`getLikedDiaryEntryIds`,
  `getCommentsForDiaryEntries` — real per-entry social interaction, entirely absent on mobile).
- Empty state: *"Nothing logged yet."*

---

## 8. Diary

No profile-page section named "Diary" was found anywhere in `ProfileShowcase.tsx`, `ProfileHighlights`,
or `UserListsSection`. The website's diary experience lives at the top-level **`/diary`** route (the
signed-in user's own private diary management screen — outside the scope of the public/owner profile
page audited here) — it is **not** one of the profile's showcase sections. Mobile's Profile screen having
a "Diary" tab showing month-grouped entries is therefore a **mobile-only profile concept**, not a gap
against the website — there is nothing on the public profile page to match it against. Recommend leaving
mobile's Diary tab as-is (an intentional mobile convenience), not attempting to mirror a "Diary" section
that doesn't exist on the website's profile page.

---

## 9. Lists

**Files:** `components/profile/UserListsSection.tsx`, `components/lists/ListPreviewCard.tsx` (partial
read), `components/lists/ListCoverCollage.tsx` (referenced, not read in full — mobile already has its own
equivalent per a prior mobile task's memory).

- Rendered as its own top-level page section (**not** inside `ProfileShowcase`), header **"Lists"** + a
  **"+ New List"** pill button (owner only) linking to `/lists/create`.
- Owner empty state: dashed-border card, *"You haven't created any lists yet."* / *"Create your first
  list to rank your favourite media."* + a **"Create your first list"** CTA button. **Non-owner empty
  state: section is hidden entirely** (`if (lists.length === 0 && !isOwner) return null`).
- Grid: `repeat(auto-fill, minmax(260px,1fr))`, each card = `ListCoverCollage` (128px-tall cover collage)
  + title (2-line clamp) + a gold **"Ranked"** badge chip when `list.is_ranked` is true + item count.
- Mobile's own Lists tab already has a comparable cover-collage treatment from a prior mobile-only task
  memory (`ListCoverCollage replaces ListCoverGrid`) — this is one of the better-aligned sections already.
  Missing on mobile: the **"Ranked"** badge concept (`user_lists.is_ranked` — confirm this column exists
  in the shared schema before assuming it's new) and the create-list flow (mobile's Lists tab still has a
  documented no-op "Create List" button per a prior task).

---

## 10. Shelves / Watchlist

**Files:** `app/watchlist/page.tsx`, `app/reading-shelf/page.tsx` (top-level, not profile-scoped),
`app/u/[username]/watchlist/page.tsx` (profile-scoped, not fully read in this pass — same `list_type`
convention expected by symmetry with the confirmed stats query).

- **`list_type` values confirmed identical between web and mobile**: `'watchlist'` (movies/TV) and
  `'reading_shelf'` (books) — both apps already agree on this schema convention exactly, verified via
  `app/watchlist/page.tsx:11,105` and `app/reading-shelf/page.tsx` filename/route existing as a distinct
  top-level nav item from `/watchlist`.
- The **profile page's "Watchlist" stat and its `/u/{username}/watchlist` link only ever query
  `list_type='watchlist'`** — there is no profile-level "Reading Shelf" stat, link, or tab found anywhere
  in the audited files. Books-on-shelf have no profile-surfaced equivalent to "Watchlist" on the website
  at all (only Mount Rushmore's Books tab and the raw "Books" logged-count touch books directly on the
  profile page).

---

## 11. Badges

**Files:** `src/components/profile/BadgeShelf.tsx` (776 lines), `lib/supabase/badges.ts` (referenced,
not fully read this pass — mobile's own `lib/supabase/badges.ts` built in a prior task already reuses the
same `badges`/`user_badges` tables).

Far richer than mobile's current simple badge-chip row:
- **Legacy badges** section (gold conic-gradient rings, "Founding Era" sub-label) shown separately above
  normal badges when any exist.
- Normal badges: circular tokens, filled/glowing when earned (rarity-colored ring + glow,
  `RARITY_COLOR`/`RARITY_GLOW` per-rarity), grayscale+dimmed+"???" label when locked (locked badges are
  still shown, just obscured — mobile's current empty-state-only-when-zero-earned approach is different:
  mobile doesn't show *locked* badges at all, only an all-or-nothing "No achievements yet" message).
- **XP + Tier system**: `computeTotalXP`, `getTier()` mapping total XP to a named tier (Collector /
  Enthusiast / Critic / Curator / Auteur), shown as a pill next to the total XP count.
- **"View all" → BadgeLibrary** full-screen overlay (not read in this pass) showing every badge
  including unearned ones.
- Tapping any badge opens a **portal-rendered detail modal** (escapes stacking context via
  `createPortal(..., document.body)`) showing icon, name (or "???" if hidden+locked), rarity/Legacy
  label, XP reward, description (or *"Keep exploring ReelShelf to discover this badge."* if hidden),
  earned date if unlocked, or *"Keep going — you'll unlock this one."* if locked-but-visible.

Mobile's `AchievementsRow.tsx` (prior task) shows only earned badges, no tiers, no XP total, no locked
badges, no legacy distinction, no detail modal — a much simpler v1 that would need significant expansion
to match, not just restyling.

---

## 12. Followers / Following

**Files:** `ProfileShowcase.tsx` `FollowButton` (lines 652-754), stats grid hrefs to
`/u/{username}/followers` / `/following` (dedicated pages, not read in full this pass — same pattern as
films/series/reviews/watchlist: real navigation, not a modal).

Mobile currently uses a `FollowListModal` bottom sheet (prior task) triggered by tapping the Followers/
Following stat tiles — a reasonable modal-vs-page adaptation already in place. Follow/unfollow write
logic (`followers` table insert/delete keyed on `follower_id`/`following_id`) matches mobile's existing
`followUser`/`unfollowUser` exactly.

---

## 13. Mobile current-state summary (section by section, from `components/ProfileView.tsx` and its
sub-components, all read fresh in earlier tasks this session)

| Section | Mobile has | Notes |
|---|---|---|
| Header | Avatar, name, username, bio, "Joined {date}", Edit/Follow button | No website_url, no ambient color ring, no taste-match badge |
| Tabs | Overview / Movies / TV / Books / Reviews / Lists / Diary, one screen, `GlassTabStrip` segmented control | Website has no single equivalent — closest is Films/Series/Reviews/Watchlist/Followers/Following as separate *pages*, plus Lists/Diary having no page-level tab equivalent at all |
| Top Stories | Single global 4-slot grid (`TopStoriesGrid.tsx`), all media types mixed, `resolveImageUrl` fix already applied | **Structurally wrong per §1** — needs to become 3 independent 4-slot sets |
| Currently Enjoying | Honest shelf-based proxy (Continue Watching / On Your Shelf / Recently Added) | No direct website equivalent found — website has no "in progress" concept surfaced anywhere audited |
| Recent Reviews (Overview) + Reviews tab | Cards with rating, review text, layer-rating chips, attachment image, spoiler blur | Missing: likes, comments, review_cover_url/source |
| Recent Activity | Card-per-event, own copy templates, no batching, no color-coding | Website: dot-timeline, 60s batching, per-type color, some different copy ("Marked favourite" vs mobile's own wording — verify against `ACTIVITY_VERB` in ProfileView.tsx) |
| Achievements | Earned-only chips, no tiers/XP/locked state | Website: full tier/XP/legacy/locked/detail-modal system |
| Genres | `profiles.favourite_genres` chip row | **Website has no equivalent at all** — column is mobile-only, never referenced on web |
| Stats | Distinct-media-id counts, review-text count, no Cinema stat, no href navigation | Website: row counts, rated-count-as-"Reviews", conditional Cinema stat, stat cards link to dedicated pages |
| Lists preview | 2-poster collage preview + "See All" | Missing "Ranked" badge, missing real create-list flow |
| Diary preview | Month-grouped, poster thumbnails | No website equivalent exists to compare against (§8) |
| Followers/Following | `FollowListModal` bottom sheet | Reasonable adaptation of website's dedicated pages |

---

## KEY GAPS IDENTIFIED (ranked by impact)

1. **Mount Rushmore is structurally wrong** — single global 4-slot set instead of 3 independent
   per-media-type 4-slot sets. Highest priority per the task brief; full spec above.
2. **Stats "Films/TV/Books" and "Reviews" numbers will not match the website for the same account** —
   row-count vs. distinct-count, and rated-count vs. review-text-count. Silent, hard-to-notice
   discrepancy if not decided explicitly before rebuilding.
3. **No Cinema tracking surfaced** despite the underlying `watched_in_cinema` data already being written
   by mobile's own Review Composer — a whole module's worth of already-available data currently unused.
4. **No social layer** (likes, comments, `diary_entry_reactions`) — a large, cross-cutting feature absent
   from mobile entirely, touching Reviews, Recent Activity, and the Highlights row.
5. **Badges are a simplified v1** vs. the website's tier/XP/legacy/locked/modal system.
6. **Rating display is inconsistent on the website itself** (stars in "Recently watched", numeric
   decimals everywhere else) — mobile cannot "match the website" here without the website first
   resolving its own inconsistency; needs a human product decision.
7. **`favourite_genres` and the "Currently Enjoying" honest-proxy shelf are mobile-only concepts** with no
   website equivalent — not gaps to close, just noted so they aren't mistakenly torn out during a
   "faithful to web" rebuild.
8. **No "You may also like" / "Similar shelves" / taste-match recommendation systems** on mobile at all
   (Systems 1 and 6 on the website, both require a viewer's own diary data compared against the profile
   owner's — non-trivial to port).
9. **ProfileHighlights (TasteSnapshot/SocialProof/TopRatedThisYear/MostReactedReview)** is an entire
   4-widget row with zero mobile equivalent.
10. **Architectural mismatch**: website = 1 showcase page + 6 dedicated sub-pages; mobile = 1 screen + 7
    in-page tabs. A "faithful" rebuild needs an explicit decision on which model mobile should follow
    (see below) rather than assuming today's tab structure is correct just because it already exists.

---

## OPEN_QUESTIONS_FOR_NEXT_PHASE (needs a human decision before implementation)

1. **Stats semantics**: should mobile's rebuild match the website's row-counting (Films/TV/Books) and
   rated-count ("Reviews"), or keep mobile's deliberately-chosen rewatch-safe distinct-counting and
   review-text-counting? These produce different numbers for the same real user today. Neither is
   "wrong" — they're different product decisions already made independently on each side.
2. **Rating display — stars vs. numeric**: the website itself is inconsistent (stars in "Recently
   watched", numeric elsewhere). Which should mobile standardize on, and should this be raised as a
   website bug rather than something to faithfully replicate?
3. **Should mobile mirror the website's 6-separate-pages architecture** (Films/Series/Reviews/Watchlist/
   Followers/Following as full navigable screens) instead of the current in-page-tabs model, or is the
   current tabbed single-screen a deliberate, acceptable mobile simplification?
4. **Social layer scope**: likes + comments + `diary_entry_reactions` is a large feature. Is porting this
   to mobile in scope for "Profile rebuild," or a separate future initiative?
5. **Book search source for Mount Rushmore**: website uses live OpenLibrary; mobile's existing Universal
   Search screen (built in a prior task) uses Google Books for its own Books category. Should mobile's
   rebuilt Mount Rushmore book-picker match the website (OpenLibrary) for data/URL-format consistency
   with real existing rows, or reuse mobile's already-built Google Books integration for one fewer
   dependency?
6. **`is_ranked` column**: `ListPreviewCard.tsx` reads `list.is_ranked` for the "Ranked" badge — confirm
   this column actually exists in the shared production `user_lists` table (not verified against live
   schema in this pass) before assuming it's available to mobile with no migration.
7. **"Favourite picks" fallback claim**: `ProfileEditor.tsx:709` tells the user their favourite film/
   series/book text fields "help shape your public profile whenever your Mount Rushmore is still empty,"
   but no such fallback logic was found in `ProfileShowcase.tsx`'s actual Rushmore-rendering code (empty
   slots just show a dashed tile, never falling back to the favourite_* text fields). This may be a
   stale/aspirational UI copy on the website itself — worth confirming with whoever owns the web app
   before mobile either replicates the (seemingly unimplemented) promise or the (actual) empty-tile
   behavior.
8. **`TopRatedThisYear`'s hardcoded `"2026-01-01"` cutoff and `"Top Rated · 2026"` label** appear to be a
   latent website bug (will go stale), not a spec to replicate literally in a rebuild — flagging rather
   than silently fixing (out of scope, read-only task) or silently copying the bug into mobile.
