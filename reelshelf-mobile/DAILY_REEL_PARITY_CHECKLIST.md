# Daily Reel — Website ↔ Mobile Parity Checklist

> Covers every section of the website's `/daily-reel` hub that mobile has built toward:
> Daily Pick, Question of the Day, Today's Story, Today's Staff Picks. Sourced from
> `WEBSITE_DAILY_REEL_AUDIT.md` and `WEBSITE_QUESTION_OF_THE_DAY_AUDIT.md`, both read-only
> audits of the actual website source (repo root, sibling to `reelshelf-mobile/`).
>
> Not covered here (confirmed out of scope by the audits, not built on mobile): **Hidden Gem**
> (§3 of the Daily Reel audit — deterministic date-seeded pick from a hardcoded film list) and
> **Today's Progress** (§4 — `daily_progress` flag tracker). Neither was requested for mobile.

| Website section | Website file(s) | Mobile equivalent | Status | Required change, if any |
|---|---|---|---|---|
| **Daily Pick** (personalized rec) | `components/home/DailyPickCard.tsx`, `app/api/daily-pick/route.ts`, `lib/recommendation-engine.ts` | `components/DailyReel.tsx` (Home card), `app/(tabs)/daily-reel.tsx` (tab hero), `hooks/useDailyPick.ts`, `lib/supabase/dailyPick.ts`, `lib/recommendationEngine.ts` | ✅ Live, verified against real `daily_picks` data | None. Candidate pool is a deliberate, documented adaptation (live TMDB/Google Books instead of the website's fixed local catalog — mobile has no local catalog) — see `CANDIDATE_POOL_ADAPTATION` comments in `lib/recommendationEngine.ts`. |
| — Reroll (1/day, exact copy) | `app/api/daily-pick/route.ts` | `hooks/useDailyPick.ts` → `rerollDailyPick()` | ✅ | Copy matches exactly: "✨ Surprise Me" / "Choosing…" / "No more rerolls today". |
| — Timezone | `new Date().toISOString()` — UTC, server-computed | `getLocalDateString()` — device-local date | ⚠️ Accepted divergence | Deliberate, documented choice from the prior sprint (per-user table, low cross-platform risk — see `lib/supabase/dailyPick.ts` header comment). Not revisited this pass. |
| — Home/tab identical pick | Single `<DailyPickCard/>` instance reused in both places | Two call sites, same `useDailyPick()` hook → same idempotent `daily_picks` row | ✅ | Different mechanism (shared hook + idempotent get-or-create vs. shared component instance) but same guarantee. Confirmed tabs are lazy-mounted (no eager-mount race). |
| **Question of the Day** | `app/daily-reel/page.tsx` (`getOrCreateRotation`), `app/api/trivia/answer/route.ts`, `components/daily-reel/DailyReelPage.tsx` (`QotDSection`, `StreakPill`) | `lib/supabase/trivia.ts`, `hooks/useQuestionOfTheDay.ts`, `QuestionOfTheDaySection`/`StreakPill` in `app/(tabs)/daily-reel.tsx` | ✅ Built this sprint, verified against real production data | None outstanding — see notes below. |
| — Rotation get-or-create | `getOrCreateRotation()` | `getOrCreateRotation()` in `lib/supabase/trivia.ts` | ✅ | Exact same algorithm: 30-day recency exclusion per category, uniform-random pick from the eligible pool (fallback to full active pool if every question was used within 30 days), `upsert(onConflict: rotation_date)`. Live-tested: created today's (2026-07-15) real shared row; re-read confirmed idempotent. |
| — Rotation timezone | `new Date().toISOString().split("T")[0]` (server UTC) | `getUtcDateString()` (device UTC via `toISOString()`) | ✅ | Always UTC regardless of device locale — required because this table is a single **global** shared row, unlike per-user `daily_picks`. Internal cutoff/yesterday arithmetic uses pure `Date.UTC()` math rather than the website's local-`Date` methods (which only equal UTC because the website runs in a UTC-clocked server process) — same logical result, safe on an arbitrary-timezone device. |
| — Three independent category pills | `QotDSection` | `QuestionOfTheDaySection` | ✅ | Film / TV Series / Book, each answerable independently, same disabled/dimmed treatment when no question exists for a category. |
| — One-per-category enforcement | DB `UNIQUE(user_id, rotation_date, category)` + `23505` handling in the API route | Same real constraint; `submitTriviaAnswer()` catches `error.code === '23505'` → `{alreadyAnswered: true}` | ✅ | Live-tested against the dedicated test account: duplicate insert for `film` and for `book` both rejected with `23505`. |
| — Correct-index / scoring trust boundary | Server route re-fetches `correct_index` from `trivia_questions`, never trusts the client | Mobile client reads `correct_index` directly from `trivia_questions` (RLS-confirmed world-readable: `trivia_q_read`, qual `true`) and computes `is_correct` itself | ⚠️ Necessary adaptation | No Next.js-equivalent API route exists on mobile to hold this boundary server-side. This is the same trust level the question UI itself already requires (must read `correct_index` to render/reveal). Documented as an open question below re: a future server-authoritative RPC. |
| — Streak/XP algorithm | `app/api/trivia/answer/route.ts` | `submitTriviaAnswer()` in `lib/supabase/trivia.ts` | ✅ Exact port, live-verified | `BASE_XP` (easy=10/medium=20/hard=30) + `min(newStreak*3, 21)` bonus if correct; streak increments only if `last_{cat}_date === rotationDate - 1 day`, else resets to 1 (correct) or 0 (incorrect); `last_{cat}_date` always updates to `rotationDate` regardless of correctness; `longest_streak = max(prev, newStreak)`. Verified against the real dedicated test account (see below). |
| — Header streak pills | `StreakPill`, hub header, only rendered if streak > 0 | `StreakPill` in header of `app/(tabs)/daily-reel.tsx`, same `>0` gate | ✅ | Copy: "{Label} · {N}-day streak". Same `CAT_COLORS` hex values (film gold / tv blue / book red) ported verbatim for cross-platform color parity. |
| — Per-category result glyph | ✓ / ✗ / · next to each pill | Same three glyphs, same color logic | ✅ | `·` = "already answered" conflict case (23505), matching the website's distinct third state. |
| — Community response aggregate ("X% got this right") | `getCommunityStats()` / per-answer community stats, both via `createAdminClient()` (service-role) | **Not built** | ❌ Explicitly omitted | RLS-confirmed hard blocker: `trivia_answers` SELECT policy is `auth.uid() = user_id` (own rows only) — a regular client cannot read other users' rows, and shipping a service-role key to the app would be a real security regression. Requires a Supabase Edge Function or `SECURITY DEFINER` RPC — new backend work, not in this sprint's scope. No fake/placeholder percentage was rendered anywhere. |
| — Badge grants (6 trivia badges) | `app/api/trivia/answer/route.ts`, admin-client badge checks | **Not built** | ❌ Not in scope | Not requested for this sprint (the task's CONSTRAINTS did not ask for badge-granting logic). Flagged as an open question below — mobile's existing `badges`/`user_badges` system could plausibly support this client-side without an admin client, unlike community stats. |
| **Today's Story** | `fetchEditorialData()` (`articles` query) | `lib/supabase/articles.ts` → `fetchTodaysStory()` | ✅ | Exact same query shape: `is_published=true`, `published_at desc`, limit 1. Confirmed live: 1 published article in production. |
| **Today's Staff Picks** | `fetchEditorialData()` (`staff_picks` query) | `lib/supabase/staffPicks.ts` → `fetchStaffPicks()` | ✅ | Exact same query shape: `is_active=true`, `display_order asc`, limit 6. Confirmed live: 3 active staff picks in production. Independent of `daily_picks` on both platforms. |
| **Logged-out state** | Hard redirect to `/auth` for the whole hub | Existing `<SignInPrompt/>` gate at the top of `app/(tabs)/daily-reel.tsx`, covers the entire screen including QotD | ✅ | No new logged-out branch needed — QotD renders inside the same early-return guard as everything else on the tab. |

---

## Live verification performed (2026-07-15, dedicated test account `da816c20-…`)

No physical device/simulator was available in this session, and no login credentials for the
dedicated test account were available to drive an actual authenticated client session. In place
of that, every write below was executed directly against the real production database
(`gefxnqagnwcsepbksfip`), scoped **only** to the dedicated test account's `user_id`, replicating
byte-for-byte the exact sequence of operations `lib/supabase/trivia.ts` performs — this is not a
literal on-device run, but it exercises the real schema, the real `UNIQUE` constraint, and the
real starting data, and the RLS policies that would govern a real client session were separately
confirmed by direct inspection (see below), not assumed.

1. **Rotation creation**: confirmed no `trivia_daily_rotation` row existed for `2026-07-15`.
   Ran the exact get-or-create algorithm (30-day recency exclusion, uniform random pick,
   `upsert(onConflict: rotation_date)`) — created a real row. Re-queried by date — same row
   returned, confirming idempotency (a second app open today will not re-pick).
2. **One-per-category enforcement**: inserted one real answer for `film` (correct) and one for
   `book` (incorrect) for the test account, then attempted a duplicate insert for each — both
   rejected with Postgres `23505`, exactly the code `submitTriviaAnswer()` checks for.
3. **Streak/XP arithmetic** — test account's baseline going in: `film_streak=1, tv_streak=1,
   book_streak=0, film_correct=5, tv_correct=3, book_correct=2, total_correct=10,
   longest_streak=3`, all `last_*_date=2026-06-29` (a 16-day gap from today, so every category's
   streak was expected to reset rather than increment):
   - **Film** (correct, difficulty=hard): predicted `newStreak=1` (reset — 2026-06-29 ≠
     2026-07-14), `xp = 30 + min(1×3,21) = 33`. Actual result: `film_streak=1, film_correct=6,
     total_correct=11, xp_earned=33`. **Matches exactly.**
   - **TV** (correct, difficulty=medium): predicted `newStreak=1`, `xp = 20 + 3 = 23`. Actual:
     `tv_streak=1, tv_correct=4, total_correct=12, xp_earned=23`. **Matches exactly.**
   - **Book** (deliberately answered incorrectly): predicted `newStreak=0`, `xp=0`,
     `book_correct` unchanged, `last_book_date` still updated to today. Actual: `book_streak=0,
     book_correct=2` (unchanged), `xp_earned=0`, `last_book_date=2026-07-15`. **Matches
     exactly**, including the "last-answered date updates even on a wrong answer" subtlety.
   - `longest_streak` stayed `3` throughout (both new streaks of 1 are less than the existing
     3) — matches `Math.max(prev, newStreak)`.
4. **RLS compatibility** (structural, via `pg_policies` on the live project, not runtime-tested
   through an authenticated session): `trivia_questions` SELECT is `qual: true` (world-readable,
   permits reading `correct_index` client-side); `trivia_daily_rotation` INSERT/UPDATE is
   `auth.uid() IS NOT NULL` and SELECT is `qual: true` (any authenticated user may create/reuse
   the shared row); `trivia_answers` INSERT is `auth.uid() = user_id`, SELECT is `auth.uid() =
   user_id` (own rows only — confirms the community-stats omission is a real, not assumed,
   constraint); `trivia_user_progress` is `auth.uid() = user_id` for all operations. Every
   operation `lib/supabase/trivia.ts` performs is covered by one of these permissive policies.

**Not tested this session, and recommended before calling this fully closed:** an actual on-device
run (iOS + Android, two iPhone sizes) tapping through the UI with the real dedicated test
account's login — confirming visual layout, haptics, the reveal panel's tap-through states, and
"results persist after restart" via an actual cold app restart rather than a database re-read.
