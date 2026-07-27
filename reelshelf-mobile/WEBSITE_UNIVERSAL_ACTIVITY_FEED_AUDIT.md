# Website /activity Feed — Read-Only Audit

Read-only investigation of the real Next.js website's `/activity` page and every related concept named in the brief. No code was modified — see VERIFICATION at the bottom.

## 0 — A note on the codebase before the findings

This repo has accumulated multiple stray/duplicate files that are easy to mistake for live code if you don't check routing/import reachability first. Three were hit directly by this audit and are called out per-question below, but worth stating once up front:

- `app/activity/page 2.tsx` (note the space in the filename) is **not a valid Next.js route file** — the App Router only recognizes the exact filename `page.tsx`. This file, and the `ActivityFeedClient.tsx` component it alone imports, are both dead — confirmed via `grep` that nothing else in the live tree imports `ActivityFeedClient`. The real route is `app/activity/page.tsx`.
- `lib/supabase/followingFeed 2.ts` (again, space in the filename) is a stale, simpler earlier version of `followingFeed.ts` missing the scoring/anti-clustering logic entirely. `components/activity/ActivityFeed.tsx` imports from `@/lib/supabase/followingFeed` (no space) — the real file is `followingFeed.ts`.
- The entire `src/` directory (`src/components/`, `src/hooks/`, `src/lib/`, `src/types/`) is an orphaned parallel tree. `tsconfig.json`'s `@/*` path alias resolves to the repo root, not `src/`, and the live Next.js app uses the root-level `app/` directory (not `src/app/`, which doesn't exist) — so nothing under `src/` is reachable from any real route. `src/components/profile/ProfileShowcase.tsx` (which references `challenge_completed`/`finished_series`) is part of this dead tree, not live evidence for anything.

All findings below are drawn exclusively from files confirmed reachable from `app/activity/page.tsx`'s actual import graph, or from direct repo-wide search where the question required it.

---

## 1 — ALL_COMMUNITY_VIEW_FINDING

**Confirmed absent.** `components/activity/ActivityFeed.tsx` (the component the real `app/activity/page.tsx` renders) defines exactly:

```ts
type FeedTab = "mine" | "following"
```

and renders a two-button tab bar with the literal labels **"My Activity"** and **"Following"** (lines 350–354). There is no third tab, no "All"/"Community"/public view anywhere in this component or in `lib/activity.ts`. The `lib/activity.ts` file even contains an explicit trailing comment block describing a future "Phase 2" migration to a dedicated `activity_events` table, which includes the line:

```sql
CREATE INDEX ON activity_events (created_at DESC);  -- for global feed
```

This is a forward-looking design note for a table that doesn't exist yet — itself confirmation that no global/public feed exists today, only an aspiration for one in a documented future phase.

## 2 — FRIENDS_VS_FOLLOWING_FINDING

**Invented — not a distinct real concept.** No `friend_requests` or `friendship` table exists anywhere in `supabase/migrations/` (repo-wide grep for `friend_request|friendship|CREATE TABLE.*friend` returns nothing). The only relationship table anywhere is `followers` (`follower_id`, `following_id`), a single one-directional follow — this is what both the "Following" tab (`ActivityFeed.tsx` → `fetchFollowingFeed`) and a separate widget both actually query.

That separate widget is real, live evidence of the *label* "Friends" being used loosely: `components/tv/TVFriendsLayer.tsx`, rendered on the real Series Detail page (`app/series/[id]/page.tsx`), shows a panel with the section eyebrow **"Friends"** and a heading "`{title}` on your shelf". Its data comes from `lib/supabase/mediaReviews.ts`'s `fetchFriendsForShow()`, which builds its "friend" list with:

```ts
const { data: followData } = await client
  .from("followers")
  .select("following_id")
  .eq("follower_id", session.user.id)
```

— the identical `followers` table query as the Following tab. "Friends" here is UI copy layered over the same one-directional follow relationship, not a mechanically distinct (e.g. mutual-follow) concept. The real app uses "Friends" and "Following" as interchangeable labels for the same underlying relationship in different parts of the UI, not two different systems.

## 3 — MILESTONES_AS_ACTIVITY_FINDING

**Real badges exist; never surfaced as a feed activity item — profile-only.** `config/badges.ts` (`REELSHELF_BADGES`) contains genuine count-based milestones with real `maxProgress`/`statKey` thresholds, matching the exact pattern the question describes:

- `film_centennial` — "Log 100 films" (`maxProgress: 100, statKey: 'filmCount'`)
- `marathon_viewer` — "Log 500 films"
- `bookworm` — "Log 20 books"; `literary_taste` — "Log 50 books"
- `master_critic` — "Write 100 reviews"
- plus streak-based (`unstoppable` — 365-day streak) and social (`social_butterfly` — 10 followers) milestones.

However, neither of the two real event-builders that feed the actual `/activity` page — `lib/activity.ts`'s `buildActivityEventsFromSources` ("My Activity") or `lib/supabase/followingFeed.ts`'s row mapper ("Following") — ever construct a badge- or milestone-related event. The `ActivityType` union itself has no such member:

```ts
export type ActivityType = "logged" | "reviewed" | "watchlisted" | "rushmore" | "finished_series" | "watched_episode" | "added_favourite" | "challenge_completed" | "list_created"
```

`utils/badgeEvaluator.ts` and `lib/supabase/badges.ts` (the real badge-awarding logic) were also grepped directly for any reference to "activity" or "feed" — zero matches. Badge awarding has no code path that touches the activity feed in any way. Badges are unlocked and surfaced exclusively on the profile (`components/profile/UserBadges.tsx`, `BadgeLibrary.tsx`, `BadgeDetailsModal.tsx`) — never as a feed card.

## 4 — STARTED_WATCHING_READING_FINDING

**Confirmed absent as an activity type — with one adjacent, non-feed nuance worth flagging.** A repo-wide grep for `started_watching|started watching|started_reading|started reading|in_progress` (excluding node_modules/.next/reelshelf-mobile) returns zero hits anywhere in the real website codebase. `ActivityType` has no such member.

The one adjacent thing that exists — and is worth being precise about rather than silently omitting — is `TVFriendsLayer.tsx`'s per-friend status label, which can literally read "Watching" next to a name. This is **not** a tracked activity type or event: it's a status *derived on every render* by `fetchFriendsForShow()` purely from whether a followed user has a show-level diary entry for that title:

```ts
status: showRow ? "finished" : "watching",
```

If they only have episode-scoped diary entries (no show-level wrap-up entry yet), they're inferred as still "watching." This is a one-off computed label for a single Series Detail widget — it is not part of the `ActivityType` union, is never written anywhere, and never appears on `/activity`. The question's expected absence is correct for the activity feed system specifically; this nuance is the only "watching"-adjacent concept anywhere in the real codebase.

## 5 — COLLECTION_DAILY_REEL_COMPLETION_FINDING

**Confirmed absent.** Repo-wide grep for `collection_completed|collection completed|CollectionCompleted` and `daily_reel_completed|dailyReelCompleted|DailyReelCompleted|reel completed` (same exclusions as above) returns zero hits anywhere in the real website codebase. Neither concept exists in `ActivityType`, in any Supabase migration, or in any component.

(Note: `challenge_completed` *does* exist in the `ActivityType` union and has full `TYPE_CONFIG` styling in `ActivityCard.tsx` — "completed a weekly challenge 🏆" — but like `finished_series`, it is never actually constructed by either real event-builder. It's a vestigial/unwired type, not a real, reachable activity concept today, and it refers to a "weekly challenge" system, not collections or Daily Reel.)

## 6 — ACTIVITY_CARD_INTERACTION_SURFACE

**Confirmed: acts directly on the underlying `diary_entries` row via `diary_entry_id`, not on any activity-card abstraction — and only renders at all when the event has one.** In `components/activity/ActivityCard.tsx`:

```ts
const isDiaryEvent = Boolean(event.diary_entry_id)
...
async function handleLike() {
  if (!event.diary_entry_id) return
  ...
  const result = await toggleDiaryEntryLike(event.diary_entry_id, !next)
```

and the comment panel is opened with `<CommentPanel diaryEntryId={event.diary_entry_id} .../>`, calling `getCommentsForEntry(diaryEntryId)` / `createDiaryEntryComment({ diaryEntryId, ... })`. Both like and comment write straight through to `diary_entry_id` — i.e. the real `diary_entry_likes`/`diary_entry_comments` tables (per settled ground truth) — there is no separate "activity_events" or "activity card" identity to interact with; none exists.

The like/comment buttons are gated by `isDiaryEvent` and simply don't render for event types without a `diary_entry_id` — `watchlisted`, `rushmore`, `list_created` events have **no** like/comment UI at all, only a name/title/timestamp and (where applicable) an "Open ↗" link to the underlying title.

## 7 — SHARE_ACTIVITY_FINDING

**Confirmed absent — no distinct "share this activity" feature exists.** A full read of `ActivityCard.tsx`'s interaction bar shows exactly three possible controls: Like, Comment, and an "Open ↗" link that navigates to the underlying title's page (`resolveMediaHref` → `/films/[id]` or `/series/[id]`). There is no share icon, no `navigator.share` call, no "Share" button, and no share-specific copy anywhere in this component. "Open ↗" is navigation, not sharing. This matches the brief's premise: whatever per-item Share action exists lives on the underlying title/review page itself, not on the activity card.

## 8 — REAL_PAGINATION_APPROACH

**No pagination or infinite scroll — a single bounded fetch, scored, and redistributed.** `fetchFollowingFeed(userId, limit = 30)` in `lib/supabase/followingFeed.ts`:

1. Fetches every `following_id` the user follows (no limit).
2. If they follow no one, returns `[]` immediately (this is what drives the "You're not following anyone yet" empty state).
3. Fetches diary entries from those followed users in **one query**, capped at `fetchLimit = Math.min(limit * 2, 60)` — i.e. at most 60 rows, ever, in one shot. No offset, no cursor, no page number.
4. Scores every row via `scoreFeedRow()` — points for having review content (+10), being a favourite (+5), a high rating (+8/+4), and recency (+8 for <6h old down to +2 for <168h old) — then sorts descending by score.
5. Runs `distributeEntries()` — a redistribution pass that defers entries that would put the same user back-to-back or cluster the same media type three-in-a-row, refilling from the deferred pool afterward — then truncates to the final `limit` (30).

`ActivityFeed.tsx`'s `useEffect` that calls this only fires **once**, guarded by `fetchedRef.current`, on the first switch to the "Following" tab — there is no scroll listener, no "Load more" button, and no re-fetch on scroll anywhere in the component. If a user follows people with more than ~60 recent diary entries combined, older entries are simply never seen on this tab; there is no mechanism to reach them.

## 9 — MOBILE_CURRENT_STATE

No `/activity`-equivalent screen or route exists in `reelshelf-mobile/app/` at all (confirmed: no file/directory anywhere under `app/` matches "activity"). The closest analog is `components/HomeFriendsActivity.tsx`, rendered inline on the Home tab — its own header comment is explicit that this is a deliberate mobile-only enhancement, not a port of anything on the real website:

> "Mobile-only enhancement: no equivalent exists on the live website... This mobile section is intentionally built as a genuine enhancement over the real website, not a parity port."

Its data layer, `lib/supabase/homeFriendsActivity.ts`, merges `diary_entries` + `user_lists` + `mount_rushmore` (deliberately excluding `saved_items`, documented as an RLS-driven decision, not an oversight) from followed users into one newest-first list, then does a flat `entries.slice(0, RESULT_LIMIT)` with `RESULT_LIMIT = 20` — no scoring, no anti-clustering redistribution, nothing resembling `followingFeed.ts`'s ranking. There is no "My Activity" personal-timeline equivalent on mobile at all — mobile has only a Following-shaped feed, merged directly into Home rather than living on its own screen. The mobile `ActivityCard` (in this same file) is tap-to-navigate only — no like, no comment, no share, matching everything else found in this audit about the real website's own card.

---

## Overall verdict

A legitimate mobile build of "the real /activity feature" would consist of:

1. **A new, dedicated Activity screen** (mobile currently has none) with exactly two tabs — **"My Activity"** and **"Following"** — matching the real website precisely. No "All"/"Community" tab, because none exists to port.
2. **"My Activity"**: port `buildActivityEventsFromSources`'s exact merge-and-collapse logic (`diary_entries` + `saved_items` (watchlist) + `mount_rushmore`, with the 60-second same-type batching-into-"N films" behavior) — something mobile's Home rail does not currently do at all (no personal-timeline view exists on mobile in any form today).
3. **"Following"**: port `fetchFollowingFeed`'s exact scoring formula and `distributeEntries` anti-clustering logic — mobile's current Home rail is a naive slice with no ranking, a real, measurable behavioral gap from the live website if this were ever promoted to a real Activity screen.
4. **Card interactions**: like and comment acting directly on `diary_entry_id` (real `diary_entry_likes`/`diary_entry_comments` tables, both confirmed real per settled ground truth), gated to diary-backed events only — exactly matching mobile's own existing `MediaReviewCard`/diary-entry like-comment pattern already built elsewhere in the app, just not yet wired to a feed context.
5. **No** milestone/badge feed items, **no** "started watching/reading" states, **no** collection/Daily Reel completion events, **no** distinct "share this activity" action, and **no** pagination/infinite-scroll to build — none of these exist on the real website, so building any of them would be inventing scope beyond parity, not achieving it.
6. Pagination-wise: a straightforward one-shot bounded fetch (≤60 rows) is sufficient to match reality — no infinite-scroll/cursor system needs to be designed or built for parity.

The real gap for mobile isn't a missing feature so much as a **misplaced and under-powered one**: `HomeFriendsActivity.tsx` already does roughly the "Following" half of this job, embedded in Home instead of on its own screen, without the real scoring/anti-clustering algorithm, and with no "My Activity" counterpart at all.

## Open questions for next phase

- Whether a real mobile Activity screen should keep `HomeFriendsActivity`'s Home-rail presence in addition to a dedicated screen, replace it, or fold it into the new screen's "Following" tab — a product decision, not something resolvable from code alone.
- The vestigial `finished_series` and `challenge_completed` `ActivityType` members (never constructed by live code) suggest an incomplete or abandoned feature (a weekly-challenge system) — worth asking whether that's genuinely coming back before deciding whether mobile should carry those types at all if this feature is ever built.
- `TVFriendsLayer`'s derived "watching"/"finished" status label (Q4) is a real, live UI concept, just not an activity-feed one — worth flagging to product in case "Friends watching this" was meant to be part of the activity-feed conversation and simply wasn't named that way in the original brief.

## Verification

Read-only throughout — no files modified, no migrations applied, no commands beyond `grep`/`find`/`Read` executed against the repository.
