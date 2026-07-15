# Website Notifications / Settings / Social Audit — Blueprint for Mobile Phase 4

> Read-only audit. Every claim below is traced to an actual web app file path (repo root,
> sibling to `reelshelf-mobile/`) or a live query against the real production database, read on
> 2026-07-15. No code was changed to produce this document. Does not re-cover Diary, Lists,
> Reviews, Collections, or Profile/Mount Rushmore — see `WEBSITE_PROFILE_AUDIT.md`,
> `WEBSITE_LISTS_AUDIT.md`, `WEBSITE_DIARY_AUDIT.md` for those.

---

## 1. Notifications

**Files read:** `components/NotificationsBell.tsx` (full, 384 lines), `components/
NotificationsFeed.tsx` (full, 275 lines), `lib/supabase/notifications.ts` (full, 488 lines),
`app/activity/page.tsx`, `components/activity/ActivityFeed.tsx` (partial).

**There is no dedicated `/notifications` page.** Notifications live entirely inside
`NotificationsBell.tsx` — a bell icon in the site header that opens a **380px-wide dropdown
panel** (not a route), titled "Notifications · Social updates". The panel's only "see more" exit
is a **"View all activity" link to `/activity`** — which is the Activity/Following feed (see
§3), not a notifications-specific page. There is no infinite-scroll or paginated notifications
list anywhere; the dropdown is a fixed top-30-rows query, deduped/filtered down to 24.

### Data source (matches CONSTRAINTS' pre-confirmed facts)

`notifications` table, queried as:
```
.from("notifications")
.select("id, type, actor_id, reference_id, reference_type, read, created_at")
.eq("recipient_id", currentUserId)
.order("created_at", { ascending: false })
.limit(30)
```
Then joined client-side against `profiles` (actor display info) and `diary_entries` (media
context), never a server-side join.

### Real notification types actually surfaced (evidence: the `for (const notif of notifRows)`
loop in `getNotifications()`)

Only **5 of the 7** `ReelShelfNotificationType` union members are ever actually emitted by the
current query loop:
- `new_follower` — "started following you"
- `followed_user_logged` — "logged {title}"
- `followed_user_reviewed` — "reviewed {title}" (shows a review-text preview)
- `review_liked` — "liked your review of {title}" / "liked your log of {title}"
- `entry_commented` — "commented on your entry for {title}" (preview = comment body)

**`followed_user_mount_rushmore` and `comment_replied` are dead code** — both have full type
definitions and builder functions (`createRushmoreNotification`, `createReplyNotification`) but
**no branch in the actual `getNotifications()` loop ever calls them.** A Mount-Rushmore-update
notification or a comment-reply notification can never appear in the live feed today, despite
the trigger infrastructure existing for `on_diary_entry_commented` per CONSTRAINTS' pre-confirmed
facts. This is a genuine, specific website gap, not a mobile gap — worth noting so mobile isn't
asked to build parity for something the website itself doesn't fully deliver.

### Interaction pattern

- Tap a `NotificationCard` → navigates via the notification's own `href` (media detail page for
  content notifications, profile page for follows) and closes the dropdown.
- **"Mark as read" is NOT a database write.** Opening the bell calls `markAsRead()`, which writes
  only a **localStorage timestamp** (`reelshelf-notifications-last-read:{userId}`) — the `read`
  boolean column on the `notifications` table is selected but never updated by any client code
  found. Unread state is entirely a client-side "is this newer than my last-viewed timestamp"
  computation (`isNotificationUnread`/`getUnreadNotificationCount`), not server state. A second
  device or a cleared browser storage will show every notification as unread again.
- Live-ish updates: 90-second poll (`NOTIFICATION_POLL_INTERVAL_MS`) + a realtime subscription
  scoped only to new follows (`subscribeToFollows`) + a `visibilitychange` refresh-on-tab-return.

**Mobile current state:** the header bell (`reelshelf-mobile/components/Header.tsx` lines 21–26)
is `<MaterialIcons name="notifications-none">` wired to `onPress={() => console.log('[Sprint 3]
Notifications pressed — no-op')}` — purely decorative, no badge, no navigation, exactly as
CONSTRAINTS anticipated.

---

## 2. Settings

**Files read:** `app/settings/profile/page.tsx`, `app/settings/appearance/page.tsx` (full, 261
lines), `app/settings/import/page.tsx`, `components/layout/AccountDropdown.tsx` (full),
`src/components/profile/ProfileEditor.tsx` (grep-targeted), plus a repo-wide grep for any link to
`/settings*` and for logout/privacy/data-export/theme-toggle UI.

**Settings is almost entirely a redirect shell, and it is completely unlinked from the rest of
the site.** A grep across every `app/` and `components/` file for the literal string `/settings`
found exactly **one** reference in the whole codebase: an internal cross-link from the Letterboxd
import wizard back to `/settings/profile`. **No header, nav, or account menu links to `/settings`
at all** — it is only reachable by typing the URL directly.

Concretely, of the three routes under `app/settings/`:
- **`/settings/profile`** → `redirect("/profile")`. Not a real page — an alias. Actual profile
  editing (display name, username, bio, website, avatar, favourite film/series/book, **and the
  Public/Private visibility toggle**) lives in `src/components/profile/ProfileEditor.tsx`,
  rendered directly on `/profile`, not under Settings at all.
- **`/settings/import`** → `redirect("/import/letterboxd")`. Also just an alias.
- **`/settings/appearance`** → the only genuinely unique content. Titled **"Settings ·
  Personalisation" / "Easter Eggs"** — this is NOT a light/dark theme switch (the whole site is
  permanently dark-themed; no theme-mode toggle or `prefers-color-scheme` handling was found
  anywhere). It's a toggle for the ambient cinematic atmosphere effects that fire on ~32
  specific film/TV/book detail pages (Dune, Interstellar, Breaking Bad, Harry Potter, etc. —
  full curated list in the file), with an on/off switch and a Full/Subtle intensity choice, plus
  a static list of which titles currently support it.

**Account menu reality:** the actual account dropdown (`AccountDropdown.tsx`, opened from the
header avatar) has exactly three items — **"View profile"**, **"Edit profile"** (→ `/profile`),
**"Sign out"**. No Settings link, no notification-preferences toggle, no data-export, no
account-deletion option anywhere in the codebase (grepped for delete-account/export-data/GDPR
patterns — no real feature, only unrelated `export default function` false-positive matches).

**Privacy control found, but not under Settings:** `ProfileEditor.tsx` (lines ~760–772) has a
working Public/Private profile toggle writing `profiles.is_public`, with copy: *"Private profiles
stay out of discovery and username search."* This is real and functional — it's just physically
part of Edit Profile, not a distinct Settings/Privacy section.

**Mobile current state:** no Settings screen, tab, or route exists anywhere in
`reelshelf-mobile/` (confirmed by file search — zero matches beyond incidental
`Haptics.notificationAsync` string collisions). Sign-out currently lives wherever `AuthContext`
exposes it (not re-audited here, out of scope per CONSTRAINTS).

---

## 3. Following Feed — confirmed real and distinct from Friend Activity

**Files read:** `components/activity/ActivityFeed.tsx` (full, 320+ lines read across two passes),
`lib/supabase/followingFeed.ts` (full, 205 lines), `lib/activity.ts` (full, 335 lines).

**This is a real, fully-implemented, non-trivial feature — not merely "Friend Activity already
covers this."** `/activity` (`app/activity/page.tsx`) renders `<ActivityFeed showTabs>`, which
has two real tabs:

- **"Mine"** — the signed-in user's own activity, derived (not a dedicated events table) from
  `diary_entries` + `saved_items` + `mount_rushmore`, batched (4+ same-type events within 60s
  collapse into "{n} films") via `buildActivityEventsFromSources()` / `fetchActivityEvents()`.
- **"Following"** — `fetchFollowingFeed()` in `lib/supabase/followingFeed.ts`: reads the real
  `followers` table (`follower_id`/`following_id` columns) for who the user follows, then pulls
  **every followed user's `diary_entries`** (not just one media item's worth — a true aggregated
  cross-user feed), and runs a genuine ranking algorithm:
  - `scoreFeedRow()`: +10 for review content, +5 for favourite, +8/+4 for rating ≥8/≥6, and a
    recency decay bonus (+8 <6h, +6 <24h, +4 <72h, +2 <7d).
  - `distributeEntries()`: a redistribution pass that prevents the same user or the same media
    type from appearing back-to-back/clustered, deferring and re-inserting those entries later
    rather than dropping them.
  - Empty states are distinct per cause: *"You're not following anyone yet"* (with a "Find people
    to follow →" link to `/search`) vs. *"Nothing from your follows yet"* (already following
    people, just no activity logged).

This is architecturally distinct from Movie/TV/Book Detail's per-item Friend Activity (which
only shows who logged *that one title*) — the Following feed is a cross-title, ranked, batched
timeline of everyone you follow. **Mobile has no equivalent of this at all today** — only the
per-item Friend Activity (on Detail pages, out of scope here) and each user's own Recent Activity
(on Profile, already built).

Stray file noted, not acted on (read-only task): `lib/supabase/followingFeed 2.ts` and
`app/activity/page 2.tsx` exist alongside the real files — Next.js only serves `page.tsx`, so
these `" 2"`-suffixed files are inert duplicates (likely an editor "keep both" artifact), not
live code. Flagging so a future pass doesn't mistake them for a second real implementation.

---

## 4. Collaborative Lists / Saved Lists — confirmed NOT real

**Evidence:** live query against `information_schema.tables` for every table matching
`%list%`/`%collab%`/`%saved%` returned only: `list_likes`, `list_saves`, `saved_items`,
`user_list_items`, `user_lists` (plus two unrelated progress tables, see §6). No
`list_collaborators`, `list_members`, `list_shares`, or `saved_lists` table exists. `user_lists`
itself has a single `user_id` owner column and no array/join-table for shared ownership.

- **Collaborative Lists (shared editing):** not real. No schema support, no UI reference found in
  `WEBSITE_LISTS_AUDIT.md`, no new evidence found here either.
- **Saved Lists (following/bookmarking another user's list):** not real as a distinct concept.
  `list_saves` exists but — per `WEBSITE_LISTS_AUDIT.md`'s already-confirmed schema — it's a
  simple per-user "save" flag/counter on a list (same shape as a like), not a "my saved lists"
  collection page anywhere. No `/lists/saved` or equivalent route exists.

---

## 5. Mutual Friends — confirmed NOT real

Repo-wide case-insensitive grep for "mutual" across `app/` and `components/` returned zero hits.
The only "mutual" hit anywhere in the web app is an unrelated code comment in
`lib/recommendation-engine.ts` ("Genre signals (mutually exclusive...)") — a recommendation-logic
comment, not a social feature. `app/u/[username]/followers/page.tsx` (read in full) renders a
plain list of followers with per-row follow/unfollow buttons and **no mutual-connections
indicator of any kind**.

---

## 6. List-level likes/comments — likes real, comments NOT real (distinct from review-level)

Confirmed via the same `information_schema` query as §4: `list_likes` and `list_saves` are real
tables (already documented in full in `WEBSITE_LISTS_AUDIT.md` §1 — unique `(list_id, user_id)`
constraint, `23505`-conflict handling, `like_count`/`save_count`/`trending_score` denormalized on
`user_lists`). **No `list_comments` table exists.** Review/diary-entry-level comments
(`diary_entry_comments`, `review_comments`) are confirmed real per this task's own pre-confirmed
facts and are a completely separate feature from list engagement — lists get likes and saves
only, never comments, on the website today.

---

## 7. Studio / Genre browsing

**Files read:** `app/discover/genre/[genre]/page.tsx` (partial, config + fetch logic),
`app/films/[id]/FilmDetailClient.tsx`, `app/films/[id]/page.tsx`, `lib/discoverCollections.ts`,
`app/movies/MoviesClient.tsx` (grep-targeted).

**Genre browsing is real.** `/discover/genre/[genre]` is a live route with a hardcoded
`GENRE_CONFIG` covering 12 genres (Sci-Fi, Thriller, Comedy, Fantasy, Mystery, Drama, Animation,
Romance, Horror, Crime, Documentary, Adventure), each mapped to a TMDB genre id for movies and TV
plus a set of book-seed keyword tags. Implementation: TMDB's `/discover/movie` and `/discover/tv`
with `with_genres=<id>&sort_by=popularity.desc&vote_count.gte=50` (same TMDB discover pattern
mobile already uses elsewhere), and books filtered from `localBooks` by keyword match — not a
live book-genre API call.

**Studio browsing as a general feature does NOT exist.** "Studio" appears in exactly two places,
neither of which is a browse/detail page:
1. Film Detail's metadata row shows the studio name as **plain text** (`{label: "Studio", value:
   film.production_companies[0].name}` in `FilmDetailClient.tsx`) — not a link.
2. `lib/discoverCollections.ts` has **one** editorially curated Discover collection built via
   `with_companies=41077` (A24's TMDB company id) — a single hard-coded "studio-flavored"
   collection, not a general "browse films from any studio" capability. There is no
   `/discover/studio/[id]` route or equivalent.

---

## 8. Progress-tracking — reconfirmed still absent

Live query against `information_schema.columns` for `daily_progress`, `trivia_user_progress`,
`user_lists`, `user_list_items`, `saved_items` (the tables a "Continue Watching %" or
in-progress book/TV state would most plausibly live on) found:
- `daily_progress`: `picked`, `question_answered`, `story_read`, `staff_picks_explored` booleans
  per `progress_date` — this is the **Daily Reel/trivia daily-engagement tracker**, not media
  watch progress.
- `trivia_user_progress`: streak/correct-answer counters for the trivia game — also unrelated.
- `saved_items`/`user_lists`/`user_list_items`: no percent/current-episode/current-page/status
  column of any kind.

**No per-title progress-tracking data model exists anywhere in the schema.** This matches every
prior audit's finding — still true, nothing has changed.

---

## Summary table

| Feature | Website reality | Terminology | Data source | Mobile current state | Gap |
|---|---|---|---|---|---|
| Notifications | Bell dropdown only, no full page | "Notifications · Social updates" | `notifications` table, 5 of 7 types actually wired | Bell icon, no-op | Full: real backend, zero mobile UI |
| Settings — Profile | Redirect to `/profile` | — | — | None | Not a real gap — nothing to port |
| Settings — Import | Redirect to `/import/letterboxd` | — | — | None (mobile has no import flow) | Out of scope (import not covered here) |
| Settings — Appearance | Real, but unlinked from nav | "Easter Eggs" | Client-side `useEasterEgg` context | None | Low priority — niche, orphaned even on web |
| Privacy toggle | Real, lives in Edit Profile | "Public profile / Private profile" | `profiles.is_public` | Not surfaced in mobile's Edit Profile | Real, addressable gap |
| Following Feed | Real, ranked + batched cross-user timeline | "Following" tab on Activity | `followers` + `diary_entries` (all followed users) | Not built (only per-item Friend Activity + own Recent Activity) | Real, substantial gap |
| Collaborative Lists | Not real | — | — | — | N/A |
| Saved Lists | Not real (only per-list like/save flags) | — | `list_saves` | Already correct (mobile has like/save per Lists sprint) | N/A |
| Mutual Friends | Not real | — | — | — | N/A |
| List-level comments | Not real (list likes/saves only) | — | — | Already correct (mobile has no list comments either) | N/A |
| Studio browsing | Not real (text label + 1 curated collection only) | "Studio" (metadata label) | `production_companies` (display only) | N/A | N/A |
| Genre browsing | Real, 12 genres, TMDB discover + book keywords | Genre names (Sci-Fi, etc.) | TMDB `/discover` + `localBooks` keywords | Not built | Real, moderate gap |
| Progress-tracking | Confirmed still absent | — | — | Already honestly absent on mobile (Currently Enjoying shelf proxy) | N/A — reconfirmed, no change needed |

---

## Open questions for next phase

1. Notifications: should mobile build its own "mark as read" as a real *local* (AsyncStorage)
   last-viewed timestamp, matching the website's own client-only approach exactly, or would a
   future phase want to propose a real `read`-column write (a website-side change, out of scope
   for mobile alone)?
2. Following Feed's ranking/redistribution algorithm is nontrivial — worth deciding whether
   mobile should replicate the exact scoring formula or a simplified chronological version first.
3. Genre browsing's `GENRE_CONFIG` is hardcoded on the website with specific TMDB genre ids per
   genre — mobile would need its own copy of this mapping (or a shared constant) if building this.
4. Settings/Appearance ("Easter Eggs") is real but orphaned even on the website (unlinked from
   nav) — worth confirming with product intent before treating it as a mobile-parity target at
   all, versus leaving it as a known, deliberately-unsurfaced feature.
