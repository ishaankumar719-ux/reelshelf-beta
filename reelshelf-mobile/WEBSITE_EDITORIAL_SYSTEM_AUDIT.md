# Website Editorial System Audit

Read-only audit. No code was modified on either platform. Daily Reel's
6-section hub structure, Question of the Day's real multiple-choice/UTC-
rotation/percentage system, and Collection of the Week's just-rebuilt
single-item rotation were taken as given ground truth and not re-verified;
everything below is newly resolved evidence.

## 1. Editorial CMS / admin interface

**Finding: confirmed absent — content is exclusively server/script-populated,
no admin UI for any editorial content type.** Full inventory of the real
website's entire admin surface (`find app/admin`, `app/api/admin`):
exactly `legacy-badges`, `beta-invites`, and one `grant-badge` API route.
Nothing for Daily Reel, Question of the Day, Collections, articles, staff
picks, or hidden gems — no scheduling form, no editor role check, no CMS of
any kind for any of them. Same pattern already confirmed for Settings and
Collections' social features earlier — editorial content here is populated
by direct database writes (migrations/scripts), never a UI.

## 2. Trailer/video field on the Daily Pick

**Finding: confirmed absent.** The complete real `DailyPickData` type
(`app/api/daily-pick/route.ts`): `id, pick_date, media_type, media_id,
reroll_count, title, year, poster, overview, genre, creator, reasons[]`.
No trailer, video, or YouTube-key field anywhere in the type, the API
route, or `components/home/DailyPickCard.tsx` (read in full — poster image
only, no video embed of any kind).

## 3. Daily Reel-specific comment/discussion feature

**Finding: confirmed absent.** Read `DailyPickCard.tsx` and
`DailyReelPage.tsx` in full — the Daily Pick section is the card itself
(poster, title, meta, reason chips, Log It / Add to Watchlist / Surprise Me
buttons) with zero comment/discussion UI attached. Nothing resembling
`CommentDrawer` or any discussion thread appears anywhere in either file.
(A comment thread on the underlying *media* still exists via the normal
Movie/TV/Book Detail page reviews section once the user taps through — but
that's the already-audited review-comment system, not something distinct
tied to "today's pick" itself.)

## 4. Friend activity on Daily Reel

**Finding: confirmed absent from Daily Reel specifically, AND the premise
needs a real correction — the "existing per-title Friend Activity
component" is not universal.** Neither `DailyPickCard.tsx` nor
`DailyReelPage.tsx` references any friend-activity component or data. More
importantly: the real per-title friend feature (`components/tv/
TVFriendsLayer.tsx` — "Currently watching," "Finished," friends' average
rating, top-rated episode) is used **exclusively** on `app/series/[id]/
page.tsx` (TV Detail). A repo-wide search for any Film or Book equivalent
(`FilmFriendsLayer`, `BookFriendsLayer`, etc.) returns nothing — no such
component exists for films or books at all. So "reuse the existing
per-title component" is only literally possible on days the pick is a TV
show; on a film or book day, there is no existing real component to reuse,
since none exists for those media types on the website today.

## 5. Header/streaks section

**Finding: it IS Question of the Day's own trivia streaks, not a
distinct system — confirmed directly in code.** `DailyReelPage.tsx`'s
Header section (`formatDate(today)` + `StreakPill` row) renders
`filmStreak`/`tvStreak`/`bookStreak` sourced from the exact same
`TriviaProgress` object Question of the Day's own answer-submission flow
updates (`setProgress` inside `submitAnswer`, using the
`data.updatedProgress` returned by `/api/trivia/answer`). There is no
separate "Daily Reel streak" concept anywhere — the Header is simply
surfacing QotD's streaks prominently at the top of the page, sourced from
the identical state.

## 6. Question of the Day — remaining sub-questions

- **Free-text question type**: confirmed absent, at the schema level.
  `trivia_questions`' real columns: `id, category, difficulty, question,
  answers (jsonb), correct_index, explanation, media_ref, active,
  created_at` — no `question_type`/`answer_type` column exists at all, so
  the schema structurally cannot represent anything but multiple-choice.
- **Friend-specific responses** ("which friend answered what"): confirmed
  absent — zero matches for any such feature anywhere in the codebase; only
  the aggregate `percentCorrect`/`totalAnswers` community stat exists
  (already-confirmed ground truth).
- **Comment thread on trivia questions**: confirmed absent — zero matches.
- **Browsable past-questions archive**: confirmed absent. `/trivia` (the
  only plausible route) is a one-line redirect to `/daily-reel` — not an
  archive page, not a distinct hub of any kind.

## 7. Collection countdown / archive UI

**Finding: confirmed absent, both parts.** No "countdown" text or concept
anywhere in the codebase. The entire real Collections route surface is
exactly one page: `app/discover/collection/[slug]/page.tsx` (the single
collection detail view) — no listing/browsing page for past or archived
collections exists anywhere. `is_archived` remains a pure data-layer flag
with no UI built on top of it at all (matching the constraint's framing —
confirmed, not something requiring further investigation here).

## 8. Featured reviews / Featured lists / Seasonal banners

**Finding: confirmed absent, all three.** Zero matches anywhere in the
codebase for any of "Featured Review"/`featured_review`, "Featured
List"/`featured_list`, or "Seasonal Banner"/`seasonal_banner`/
`SeasonalBanner` — no UI, no schema column, no concept of any kind.

## Mobile's current state (comparison)

Mobile has none of the above either — cleanly matching the real website in
every case, no gaps to close: no admin/CMS UI (confirmed via a full
`find . -iname "*admin*"` — nothing), no trailer/discussion/friend-activity
in mobile's Daily Reel screen, no free-text/archive concept in mobile's
trivia data layer, and zero matches for Featured Reviews/Lists/Seasonal
Banners anywhere in mobile's codebase either.

## Overall verdict

All 8 questions resolve to "absent" or "narrower/different than the brief's
framing assumed" — nothing here is missing mobile scope worth building:

- No editorial CMS exists to port (§1) — every piece of this content is
  script/migration-populated on the real website too.
- No trailer field, no Daily-Reel-specific discussion, no countdown, no
  archive UI, no free-text questions, no friend-specific trivia responses,
  no trivia comment thread, and no Featured Reviews/Lists/Seasonal Banners
  exist anywhere real (§2, §3, §6, §7, §8) — nothing to build for any of
  these.
- The Header/streaks section (§5) is not a separate feature at all — it's
  literally QotD's own streak state, already fully built.
- The one genuinely nuanced finding is friend activity (§4): the real
  per-title friend component is TV-only, not a general "Detail pages"
  feature as the brief assumed. If Daily Reel friend-activity is ever
  built, the honest options are: reuse `TVFriendsLayer`'s data pattern only
  on TV-pick days (true parity, narrower than the original framing), or
  treat film/book days as a deliberate mobile-only gap/extension beyond
  what the website itself has — not a straightforward "reuse the existing
  component" as originally framed.
