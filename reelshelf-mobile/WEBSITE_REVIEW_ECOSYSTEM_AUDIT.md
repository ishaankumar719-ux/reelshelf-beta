# Website Review Ecosystem Audit

Read-only audit. No code was modified on either platform. Ground truth
supplied in the task (diary_entry_comments threading/attachments,
review_comments' polymorphic no-threading/no-attachment shape, zero
report/moderation tables, new-follower-only real Realtime) was taken as
given and not re-verified; everything below is newly resolved evidence.

## 1. Standalone Review Detail page

**Finding: confirmed ABSENT — reviews are inline-only, in exactly 4 real places.**

Route inventory (`find app -iname "*review*"`) turns up exactly one
review-related path: `app/u/[username]/reviews` — a profile *tab*, not a
per-review detail page. No `/review/[id]` or equivalent exists anywhere.

Every real place a review actually renders:
1. **Movie/TV/Book/Short-Film Detail's Reviews section** — `MediaReviewsSection`,
   used by `app/films/[id]/FilmDetailClient.tsx`, `app/series/[id]/page.tsx`,
   `app/books/[id]/page.tsx`, `app/short-films/[id]/ShortFilmDetailClient.tsx`.
   Renders the full interactive `components/reviews/ReviewCard.tsx`.
2. **Profile hero/showcase** — `src/components/profile/ProfileShowcase.tsx`,
   via `PublicDiaryEntriesGrid` (same full interactive `ReviewCard`).
3. **Profile's dedicated `/reviews` tab** — `app/u/[username]/reviews/page.tsx`.
   This does **not** reuse the shared `ReviewCard` component at all — it
   defines its own local, read-only card (poster/title/rating/review text
   only, no likes, no comments, no reactions).
4. **Home's Friends Activity strip** — `HomeDashboardClient.tsx`'s
   `FriendActivityCard`, a compact card using only the `review_comments`
   surface (see §2), not the full interactive card.

In every one of these, tapping a review's poster/title links via
`getMediaHref(...)` to the underlying **media's** detail page — never to a
review-specific route. Confirmed directly in `MediaReviewsSection.tsx` and
in the Profile Reviews tab's local card (`href = getMediaHref(...)`).

## 2. The two-comment-table resolution

**Finding: both tables are genuinely live in production, simultaneously,
on the same review card — this is real architectural duplication, not one
system being dead/legacy.** Confirmed by reading `components/reviews/ReviewCard.tsx`
in full:

- **`diary_entry_comments`** (via `lib/supabase/comments.ts`'s
  `createDiaryEntryComment`/`getCommentsForEntry`) powers the card's
  **footer "💬 N comments / Discuss" toggle** → an inline, expandable
  discussion panel with real threading (`CommentThread` renders root
  comments + nested replies via `parentCommentId`) and real attachments
  (`AttachmentPreview`, wired through `AttachmentPicker`).
- **`review_comments`** (via `hooks/useReviewComments.ts`, polymorphic
  `target_type`/`target_id`) powers a **separate icon in `ReactionTray`**
  on the exact same card, which opens `CommentDrawer` — a flat list with
  no `parentCommentId` field on its `ReviewComment` type at all (confirmed:
  no threading, no reply UI) and no attachment fields either (confirmed:
  `CommentDrawer.tsx` has zero references to attachments/replies).

**`target_type`'s real values**: the `ReviewTargetType` union is
`"film_review" | "tv_review" | "episode_review" | "book_review" | "diary_entry"`.
Of these, only three are ever actually constructed and used:
`"film_review"`/`"tv_review"`/`"book_review"` (computed in `ReviewCard.tsx`
from `mediaType`) and `"diary_entry"` (used by Home's `FriendActivityCard`
— a *different* card, reusing the same `review_comments` system with a
generic type instead of a media-specific one). `"episode_review"` is
defined in the type but never constructed anywhere in the codebase — dead,
unused.

**Which one do real users actually interact with on a review?** Both,
depending on which of the two UI surfaces they tap — there is no single
answer. On the full `ReviewCard` (Movie/TV/Book Detail, Profile hero), a
user can open the inline discussion (`diary_entry_comments`, threaded,
attachments) *and* independently tap the `ReactionTray` comment icon to
open a *different* comment list (`review_comments`, flat, no attachments)
for the same review — two parallel, non-synced comment threads on one
piece of content. On Home's Friends Activity, only `review_comments` is
reachable at all (no inline discussion panel exists on that card). Neither
table is legacy — both are actively written to and read from in production
today.

## 3. Report comment / Report review

**Finding: confirmed absent entirely** — no client-only mechanism either.
Text search for "Report Comment"/"Report Review"/`reportReview`/
`reportComment` across the whole website codebase: zero matches. No
`mailto:` link or any other UI affordance resembling a report action was
found anywhere near the comment/review components read for this audit
(`ReviewCard.tsx`, `CommentDrawer.tsx`, the Profile Reviews tab). Consistent
with the given ground truth that no report/moderation table exists in the
schema — there's no UI for it either, not even a stub.

## 4. Live cross-user updates on likes/comments

**Finding: confirmed NOT genuinely real-time — own-action-optimistic only,
same as the given new-follower-is-the-only-real-Realtime fact.**

`lib/supabase/likes.ts` and `lib/supabase/reactions.ts` both use the exact
same same-tab `CustomEvent` pattern already established for follows and
comments elsewhere on the site (`window.dispatchEvent(new
CustomEvent(LIKE_EVENT))` / `REACTION_EVENT`) — not
`supabase.channel(...).on('postgres_changes', ...)`. A full grep for
`postgres_changes`/`.channel(` across `lib/supabase/likes.ts` and
`lib/supabase/reactions.ts` returns zero matches. The like/reaction/comment
count a user sees updates instantly for **themselves** (optimistic local
state update immediately on tap, confirmed in `ReactionBar`'s
`handleToggle` and `ReviewCard`'s `handleLike`), but a **different** user
already viewing the same review page would only see the new count after
their own next fetch (page reload/navigation) — there is no push of any
kind to them.

## 5. "Critics' Picks"

**Finding: confirmed absent.** Text search for "Critics' Picks"/"Critics
Picks"/`critics_pick`/`CriticsPick` across the entire website codebase:
zero matches. No such concept, section, or data source exists anywhere.

## 6. Profile Reviews tab — real sort/filter options

**Finding: none exist.** `app/u/[username]/reviews/page.tsx` is a plain
server component with **zero client-side sort or filter UI of any kind** —
no dropdown, no chips, no buttons. The entire ordering is one fixed,
non-configurable query:

```
.order("saved_at", { ascending: false })
.limit(200)
```

Newest-logged-first, always, with a hard 200-row cap, further filtered
server-side to only rows that actually have review content (`review` text
or any of the 8 layer-rating columns populated). That's the complete real
behavior — there is no "sort by rating," no "most liked," no media-type
filter, nothing configurable by the viewer at all.

## 7. Dedicated review-discovery page/section

**Finding: confirmed absent/overstated** — no such page or section exists.
Text search for "Trending Reviews"/"Friends Reviews"/"Most Liked
Reviews"/"Recent Reviews" (as named, distinct sections) across the whole
website codebase: zero matches. The closest real things that exist are:
Home's "Friends Activity" strip (a general activity feed of friends'
actions, not review-specific — logs/watchlist adds/reviews all mixed
together, confirmed via `activityVerb(entry)` branching in
`HomeDashboardClient.tsx`) and each Profile's own `/reviews` tab (§6, that
user's own reviews only, no cross-user discovery angle at all). Nothing
resembling a curated or trending cross-user review-discovery surface
exists on the real website.

## Mobile's current state (comparison)

Mobile already matches the real website's actual behavior for the one
directly-comparable, confirmable point: tapping into a review always
navigates to the underlying media's detail route
(`/media/${routeId}?title=...&posterUrl=...&mediaType=...`), never to a
review-specific screen — confirmed in both `components/activity/ActivityCard.tsx`
and `components/ProfileView.tsx`'s `openMediaDetail`. No `/review/[id]`-style
route or "ReviewDetail" concept exists on mobile either. Mobile has no
Critics' Picks, no review-discovery section, and no report-comment/review
feature — all correctly absent, matching the real website exactly. Mobile's
own comment system (`lib/supabase/activitySocial.ts`, used by
`components/activity/ActivityCard.tsx`) is built on `diary_entry_comments`
only — mobile has never referenced `review_comments` at all, so it has
naturally avoided replicating the website's own two-table duplication
(worth noting as a genuine, already-existing mobile advantage, not a gap
to close).

## Overall verdict

Of the 7 questions, **all 7 resolve to "narrower than assumed" or fully
absent** — nothing here should be built as new mobile scope:

- No standalone Review Detail page exists to port (§1) — mobile's existing
  media-detail-only navigation already matches reality.
- The two-comment-table situation (§2) is a real but *messy, duplicated*
  piece of website architecture, not a clean feature worth porting as
  designed — mobile's single-table (`diary_entry_comments`) approach is
  already simpler and arguably better than what the website actually does.
- Report/moderation (§3), Critics' Picks (§5), sort/filter on Profile
  Reviews (§6), and any review-discovery section (§7) are all confirmed
  absent — nothing to build.
- Cross-user "live" updates on likes/comments (§4) don't exist on the real
  website either — matching that (i.e., NOT building genuine Realtime for
  these) is the correct parity target, distinct from the deliberate,
  already-decided mobile-only Realtime enhancement for follows.
