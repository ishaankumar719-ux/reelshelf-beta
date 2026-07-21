# Website Home "Friends Activity" Audit

**Read-only audit. No code was modified — see VERIFICATION_RESULTS at the bottom.**

## Headline finding

**The real, live website Home page has no Friends Activity section at all.** A fully-built
"Friends activity" feature exists in the codebase — but in a component that is explicitly marked
dead by its own author and is never rendered by any route. This is the single most important fact
in this audit and shapes every section below.

---

## 1. Which file is actually "Home"?

- `app/page.tsx` (the live `/` route) renders `<DiscoverClient />` (`components/discover/DiscoverClient.tsx`,
  1542 lines). Full-text grep of that file for `Friend`, `Activity`, `following`, `Following`
  returns **zero matches**. The real, live homepage has no friends/social activity rail anywhere
  on it today.
- `components/home/HomeDashboardClient.tsx` (978+ lines) *does* contain a complete "Friends
  activity" section — but line 1 of the file reads, verbatim:

  ```
  // UNUSED - replaced by Sprint 20 homepage (app/page.tsx now renders DiscoverClient)
  ```

  This is a first-party, unambiguous developer statement that this component was superseded and
  is dead. Confirmed independently: repo-wide grep for `HomeDashboardClient` finds no route file
  importing it — its only other appearances are a stray permission-history entry in
  `.claude/settings.local.json` (from an earlier session's own investigation) and a comment in
  `MoodRecommendations.tsx` referencing it only for *visual* parity ("matching HomeDashboardClient"),
  not usage.
- `components/home/CircleDiscovery.tsx` (also references `getFriendsActivity`) is likewise dead —
  its only importer is `HomeDashboardClient.tsx` itself.

**Conclusion:** the "Friends Activity" feature described in this task's brief is real *code*, but
not a real, live *feature*. It shipped, then was replaced by Sprint 20's Discover-based homepage,
and the replacement never re-added a friends-activity rail.

---

## 2. Relationship to the already-audited `/activity` Following Feed

**Genuinely separate implementation — not the same logic, not even close in sophistication —
and the question is moot in practice since the Home version never runs.**

| | Home's `getFriendsActivity` (dead) | `/activity`'s `fetchFollowingFeed` (live, prior audit) |
|---|---|---|
| File | `lib/supabase/social.ts` | `lib/supabase/followingFeed.ts` |
| Time window | last 7 days only (`gte("saved_at", sevenDaysAgo)`) | no time window found in prior audit |
| Fetch cap | `.limit(24)`, sliced to top 8 for display | none noted (prior audit describes a full ranked pass) |
| Sorting | plain `order("saved_at", { ascending: false })` — no scoring | real algorithm: `scoreFeedRow()` (+10 review, +5 favourite, +8/+4 rating≥8/≥6, recency decay) plus `distributeEntries()` anti-clustering redistribution |
| Batching | none | prior audit's "Mine" tab batches same-type events within 60s; "Following" tab behavior for batching not re-verified here (out of this task's file set) |

These are two independently-written pieces of code that happen to solve an adjacent problem
(both ultimately `SELECT ... FROM diary_entries WHERE user_id IN (followed ids)`), not a shared
component or a "compact variant" of one shared function. Per CONSTRAINTS, this is stated as
**evidence-backed, not inferred**: both files were read in full and their query/sort logic is
visibly different code, not a shared import.

---

## 3. Activity Creation Reality Check (definitive)

**Fully live-derived. No activity/event/feed table exists anywhere, and none of the "activity
creation" write paths write to anything but the real underlying content tables.**

Evidence:
- `lib/supabase/persistence.ts` — every diary write is `client.from("diary_entries").upsert(...,
  { onConflict: "..." })` (three separate call sites: `upsertDiaryEntryToBackend`,
  `upsertDiaryEntriesToBackend`, `syncDiaryEntriesWithBackend`) or a direct
  `client.from("diary_entries").delete()...` (`deleteDiaryEntryFromBackend`,
  `deleteEntryByDbId`). Same pattern for `saved_items` (`upsertSavedItemToBackend`,
  `deleteSavedItemFromBackend`).
- Repo-wide grep for `.from("activit`, `.from('activit`, `.from("event`, `.from("feed` across
  `lib/` and `components/` returns **zero matches**. No such table is ever written to (matches
  this task's pre-confirmed fact that no activity-log table exists in the schema at all).
- `getFriendsActivity()` (Home, dead) and `fetchFollowingFeed()` (`/activity`, live) both directly
  `SELECT` from `diary_entries` at request time — neither reads from anything resembling a
  materialized or cached event log.

**What this means for the brief's "Activity Creation" language:** "editing a rating should
update/supersede the previous activity" and "deleting a review should remove/hide the linked
activity" are not features that were built — they are the *automatic, structural consequence* of
there being no separate activity record. An edit is an `upsert` onto the same
`diary_entries` row (same `onConflict` key: `user_id, media_type, media_id, review_scope,
season_number, episode_number` per the composite-unique constraint already documented elsewhere in
this project), so the next time any feed re-queries `diary_entries`, it sees the new values — there
is nothing to "supersede" because there was only ever one row. A delete removes that row, so the
next re-query simply doesn't return it — there is nothing to "hide" because there is no second
copy anywhere to hide. **No explicit activity-record management code exists, is needed, or should
be built.**

---

## 4. Activity types — confirmed real vs. not implemented

Evaluated against the dead Home component (closest available reference for what a friends-activity
card would show) and the live `/activity` Following Feed / `getFriendsActivity` query shape:

| Listed in brief | Real? | Evidence |
|---|---|---|
| Watched movie/TV (logged, no rating/review) | ✅ Real | `activityVerb()`: falls back to `"logged"` when no review/rating |
| Rated | ✅ Real | `activityVerb()`: `"rated"` when `typeof entry.rating === "number"` |
| Reviewed | ✅ Real | `activityVerb()`: `"reviewed"` when `entry.review.trim()` is non-empty |
| Watched-in-cinema | ⚠️ Data only, not surfaced | `watchedInCinema` is a real field on `FriendsActivityEntry` (from `diary_entries.watched_in_cinema`) but the dead Home card never renders it — no badge, no verb variant |
| Season/episode/show-level TV scope | ✅ Real | `getSeriesScopeBadge()` renders `S{n}`, `S{n}E{n}`, or `"Show"` from `review_scope`/`season_number`/`episode_number` |
| Finished TV/book | ❌ Not implemented | No distinct "finished" state anywhere — a completed season/series still just shows as "logged"/"rated"/"reviewed" with a scope badge, not a dedicated verb |
| Rewatch/reread | ❌ Not implemented | `FriendsActivityEntry` type doesn't even carry a `rewatch`/`reread` field — never selected from `diary_entries` in this query at all |
| Added to shelf | ❌ Not implemented | Both `getFriendsActivity` and `fetchFollowingFeed` query `diary_entries` only — `saved_items` (the shelf table) is never touched by either activity feed |
| Created public list | ❌ Not implemented | No `user_lists` query anywhere in `getFriendsActivity`; list activity is a wholly separate "Recent lists" section in the dead Home component (`recentLists`, sourced elsewhere — site-wide recent public lists, not per-friend) |
| Updated Mount Rushmore | ❌ Not implemented | No `mount_rushmore` query anywhere in `getFriendsActivity` |

Matches this task's own cautionary precedent (Related Discovery / mutual friends): about half of
the brief's activity-type list is aspirational, not implemented, even in the dead reference
component.

---

## 5. Sorting / prioritization

The dead Home version has **no scoring algorithm** — plain reverse-chronological
`order("saved_at", { ascending: false })`, windowed to the last 7 days, capped at 24 rows fetched
/ 8 rows displayed (`.slice(0, 8)`). This is a materially simpler rule than the live `/activity`
Following Feed's real `scoreFeedRow()`/`distributeEntries()` algorithm (documented in the prior
audit). Since the Home version never shipped, there is no real "Home sorting algorithm" to match —
only the `/activity` page's algorithm is real and live today.

---

## 6. Privacy filtering

RLS-only, same mechanism as every other diary-entries read path in this project — no
application-level visibility filter exists in `getFriendsActivity()`'s own code. The function
selects directly from `diary_entries` and `profiles` for the followed-id set with no `is_public`/
`username`-not-null check written in JS; visibility is enforced entirely by the pre-existing
"Public can view shared diary entries" RLS policy (gated on `profiles.username IS NOT NULL`),
identical to the pattern already confirmed for the `/activity` Following Feed and mobile's own
per-title Friend Activity.

---

## 7. Pagination / refresh / Realtime

- **Pagination:** none — fixed fetch cap (24 rows, 7-day window) client-sliced to a fixed display
  cap (8 cards in a horizontal scroll row). No "load more," no cursor, no infinite scroll.
- **"See All" equivalent:** a `Link` labeled **"Find people"** (not "See All") pointing to
  **`/discover`** — notably *not* to `/activity`. There is no deep link from Home's Friends
  Activity concept into the real Following Feed anywhere in this dead component.
- **Refresh:** `useEffect` re-fetches once on mount (keyed on `user`), plus once more whenever
  `subscribeToFollows()` fires. That subscription is **not Supabase Realtime** — it's a plain
  browser `window.dispatchEvent(new CustomEvent("reelshelf:follows-updated"))` /
  `addEventListener` pair, fired locally by `followProfile()`/`unfollowProfile()` in the same
  tab. It does not react to a *followed* user's new activity, only to the current user's own
  follow/unfollow actions. No polling, no pull-to-refresh (not applicable to a web app), no
  Supabase Realtime channel anywhere in this section — consistent with the prior audit's finding
  that Realtime is scoped only to new-follow notifications elsewhere in the app.

---

## 8. Empty states

Two distinct states, exact copy, both confirmed in the dead component's JSX:

- **Follows nobody** (`friendsHasFollows === false`): *"Follow people to see their activity
  here."* — CTA button **"Discover people"** → `/discover`.
- **Follows people, zero activity** (`friendsHasFollows === true`, empty entries): *"No activity
  from your circle in the last 7 days."* — CTA button **"Explore"** → `/discover`.

**"Invite Friends" is confirmed NOT real** — repo-wide grep for `Invite Friends` / `InviteFriend`
/ `inviteFriend` across `app/`, `components/`, and `lib/` returns zero matches anywhere in the
codebase, dead or live. This fully resolves the "still-unresolved" flag from the prior sprint:
there is no invite feature, in any form, on the website today.

---

## 9. Navigation destinations

From `FriendActivityCard` (dead component, only reference available):

- **Avatar / display name** → `/u/{username}` (falls back to `#` no-op if the entry has no
  username, which per RLS shouldn't occur since only username-bearing profiles are visible).
- **Poster / title** → `entry.href`, built by `getMediaHref({ id: media_id, mediaType })` — a
  real media-detail route.
- No review-preview-specific destination, no list-activity destination, no Mount-Rushmore-activity
  destination — because none of those activity types are part of this feed (see §4).

---

## 10. Mobile's current state — direct comparison

`reelshelf-mobile` has **no Home-level Friends Activity section at all** — confirmed by reading
`app/(tabs)/index.tsx`'s full import list (`BecauseYouLovedSection`, `BookOfTheWeek`,
`CollectionsSection`, `ContinueWatchingCard`, `DailyReel`, `TrendingCarousel`, `WelcomeBlock`, …):
no `FriendActivity` import anywhere.

What mobile *does* have, and what "mobile's just-built Friends Activity implementation" in this
task's brief must actually refer to, is the **per-title** Friend Activity on Movie/TV/Book Detail
(`components/FriendActivity.tsx` + `lib/supabase/friendActivity.ts`):

- Queries `followers` → `diary_entries` filtered to **one specific title** (`media_id`+`media_type`
  match), `review_scope='show'`, ordered by `watched_date` descending, **no limit/cap, no
  pagination**.
- Renders name, rating, review text only — no poster, no avatar image, no season/episode scope
  badge, no comment count, no rewatch/cinema badge.
- Empty state: `"No friends have interacted with this yet."` Sign-out state routes to a generic
  `SignInPrompt`.

This is architecturally a **different feature entirely** from either website implementation
discussed here — it's scoped to "who logged this one title," matching the pattern the website
also has on its own Film/TV Detail pages (out of this task's scope to re-verify), not a
cross-title Home feed. Mobile has no equivalent of the website's `/activity` Following Feed (the
one real, live, cross-title timeline) — this gap was already flagged in the prior
Notifications/Settings/Social audit and remains unaddressed as of this pass.

---

## Summary table

| Feature | Website reality | Current mobile equivalent | Gap | Recommended adaptation |
|---|---|---|---|---|
| Home Friends Activity rail | **Not live.** Fully built in `HomeDashboardClient.tsx`, explicitly marked dead ("UNUSED — replaced by Sprint 20"), never rendered by any route | None | N/A — nothing live to match | Do not build a Home-level Friends Activity rail as a "parity" item; there is no live target to match. If desired, treat as a genuinely new mobile feature and design it fresh (or reuse the per-item pattern already on mobile Detail pages) |
| Cross-title following timeline | **Live**, at `/activity` (Following tab) — real ranked algorithm, real batching | None | Confirmed gap (carried over from prior audit) | If this is prioritized, port `fetchFollowingFeed`'s scoring/distribution logic, not the dead Home version's plain chronological one |
| Per-title Friend Activity | Out of this task's re-verification scope (assumed still real per CONSTRAINTS' pre-confirmed facts) | Real, built (`FriendActivity.tsx`) | None identified here | No change needed |
| Activity Creation (edit/delete semantics) | Fully automatic — live query over `diary_entries`, no event table, no superseding/cleanup code anywhere | Mobile's diary composer already upserts on the same conflict key (per this project's own diaryComposer.ts) | None — same architecture already | No change needed; do not build any "supersede old activity" or "remove linked activity" logic on mobile — it would be solving a problem that doesn't exist |
| Activity type breadth | Only 3 real verbs (logged/rated/reviewed) + TV scope badge, even in the dead reference. Cinema/rewatch/shelf/list/Rushmore activity types are NOT implemented on the website in any friends-activity context | N/A | N/A | Do not treat the brief's full activity-type list as a real target — most of it was never built on the website either |
| "Invite Friends" | Confirmed not real anywhere in the codebase | N/A | N/A | Stop treating this as an open question — it's resolved: doesn't exist |
| Realtime | Not used for this section (client-side CustomEvent only, same-tab) | N/A | N/A | No Realtime needed if this feature is ever built |

---

## AUDIT_DOCUMENT_LOCATION

`reelshelf-mobile/WEBSITE_HOME_FRIENDS_ACTIVITY_AUDIT.md` (this file).
