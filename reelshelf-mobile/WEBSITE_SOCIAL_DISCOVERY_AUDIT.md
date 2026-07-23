# Website Social & Discovery Audit

Read-only audit. No files modified — see VERIFICATION at the bottom.

## 1. Contradiction resolved: Home's 6 requested friends-activity sections

Re-checked directly against `app/page.tsx` (the same real, live Home component
identified and fully read in the prior recommendation-engine audit — not
re-read from a different/older source) and `components/discover/
DiscoverClient.tsx` (the component it actually renders):

```
grep -in "recently watched|recently rated|recently reviewed|finished.*book|created a list|updated.*rushmore|friend" app/page.tsx components/discover/DiscoverClient.tsx
→ zero matches in either file
```

**Definitive answer: NO. None of the 6 requested sections (Recently Watched /
Rated / Reviewed / Finished Books / Created Lists / Updated Mount Rushmore by
friends) exist anywhere on the real, live Home page.** This is fully
consistent with — not a contradiction of — the prior audit's 10-section
enumeration: Trending Today, Because You Loved, New in Cinemas, Trending TV,
Trending Books, Hidden Gems, Award Winners, Browse by Genre, Pick Something
Random, Collections. Nothing friends-activity-shaped is among them.

## 2. "Discover People" / suggested users

Searched for `discover people`, `suggested users`, `find friends`, `find
people`, `people you may know`, `who to follow` across the website source,
and for any `app/people` or `app/discover/people`-shaped route.

- `app/people/[id]/` exists but is a **TMDB actor/director detail page**
  (cast/crew person pages), entirely unrelated to user discovery.
- The only real string match anywhere is inside `components/home/
  HomeDashboardClient.tsx` — **the same dead, unreachable component tree
  already confirmed in the prior audit** (imported by zero files under
  `app/`). Its one match: an `EmptyRail` CTA button labeled "Discover
  people" — and even there, its `href` points to `/discover` (the real
  **media** discovery page), not to any people-discovery destination. It
  isn't a real feature even within the dead code; it's a mislabeled link to
  an unrelated real page.

**Confirmed absent.** No real "Discover People" page, section, or matching
logic (sophisticated or simple) exists anywhere live.

## 3. Mutual / shared followers

```
grep -in "mutual follow|shared follow|followers in common|mutual friend|in common" app/u/ src/components/profile/
→ zero matches
grep -rln "mutual" (whole repo, excluding reelshelf-mobile/)
→ one match: lib/recommendation-engine.ts, "mutually exclusive" (a scoring-signal comment, unrelated to followers)
```

**Confirmed absent**, consistent with the earlier audit's separate finding.
No mutual/shared-follower UI or query exists in real Profile-page code.

## 4. Lists Discovery — real page, real categories, Staff Picks/Friend Lists resolved

`app/lists/page.tsx` (`ListsDiscoveryPage`) is **real and live** — genuinely
distinct from an individual user's own Lists tab (`app/u/[username]/...`).
Server-side query: `user_lists` where `visibility = 'public'`, ordered by
`created_at desc`, limit 100, joined with `user_list_items` (cover posters),
`profiles` (creator identity), and the current viewer's own `list_likes`/
`list_saves` for engagement state. Passed to `components/lists/
ListsDiscoveryClient.tsx`, which owns the actual sort/filter UI:

```ts
type SortMode = "trending" | "liked" | "recent"
const SORT_LABELS: Record<SortMode, string> = {
  trending: "Trending",
  liked:    "Most Liked",
  recent:   "Recent",
}
```

Plus a live text-search filter (`filtered` via `useMemo`, searches title/
creator client-side) that replaces the sort view while active.

**"Staff Picks" and "Friend Lists" as Lists-Discovery categories: confirmed
NOT real.** Zero matches for either string in `ListsDiscoveryClient.tsx` or
`app/lists/page.tsx`. The real sort set is exactly Trending / Most Liked /
Recent — flat, engagement- and recency-based, no category system at all. The
real `staff_picks` table (already confirmed real, used only for Daily Reel)
has **no relationship whatsoever** to this page — it isn't queried here, and
nothing here reads it.

## 5. Shared favourites (Mount Rushmore overlap)

`src/components/profile/ProfileShowcase.tsx` does render Mount Rushmore on
Public Profile (`rushmoreSlots`, "Updated Favourite Four" activity-feed
label) — but this is **only the viewed profile's own four picks**, rendered
in isolation. No code anywhere compares the current viewer's own
`mount_rushmore` rows against the viewed profile's, no "you both love X"
copy, no overlap computation of any kind.

**Confirmed absent.**

## 6. Follow-action refresh mechanism

Found the real handler — `src/components/profile/ProfileShowcase.tsx`,
`handleToggle()` (the follow/unfollow button's `onClick`):

1. **Optimistic local React state update first** — `setIsFollowing(...)`,
   `setFollowerDelta(...)` flip immediately, before any network call.
2. Real Supabase write — `client.from("followers").insert(...)` or
   `.delete()...eq("follower_id", user.id).eq("following_id", profileId)`.
3. **`router.refresh()`** — Next.js App Router's soft-refresh API: re-runs
   the page's Server Components against fresh data (re-executes the real
   server-side follower-count/is-following queries) without a full browser
   navigation or reload.
4. On any error: the optimistic state is rolled back.

**Not Realtime. Not a custom event system. Not a full page reload.**
`router.refresh()` re-invoking Server Components, layered under an
optimistic client update, is the exact real mechanism.

## Mobile's current state, for comparison

- **Home**: has a real, live Friends Activity section (built earlier this
  sprint, explicitly documented as a deliberate mobile-only enhancement with
  no website equivalent — consistent with finding #1 above, not a
  contradiction of it).
- **Public Profile**: renders the viewed user's own Mount Rushmore (matches
  the real website); has no mutual-followers or shared-favourites UI (matches
  the real website's own absence of both).
- **Search**: has a real "Users" category (`searchUsers`) — a query-driven
  lookup, not a browse/suggestion feed. This is mobile's closest existing
  analog to "finding people," and it's search, not discovery.
- **Lists tab**: shows only the current user's own lists (own + saved) —
  **no cross-user public Lists Discovery page exists on mobile at all**,
  unlike the real website's live `/lists` (Trending/Most Liked/Recent).

## Overall verdict

Of this brief's 6 requested feature areas, **one is real and buildable as
described** (Lists Discovery — real page, real Trending/Most Liked/Recent
sort, currently has zero mobile equivalent), and **five are not real
anywhere on the live website**: the 6 friends-activity Home sections, a
"Discover People" page (sophisticated or otherwise), mutual/shared
followers, Staff-Picks/Friend-Lists as Lists categories, and shared-favourites
overlap on Profile. The one real, concrete, missing piece of infrastructure
this audit surfaces is genuinely useful and scoped: a Lists Discovery screen
mirroring the real 3-sort-mode page.

## VERIFICATION_RESULTS

Read-only — no files modified except this new document.
