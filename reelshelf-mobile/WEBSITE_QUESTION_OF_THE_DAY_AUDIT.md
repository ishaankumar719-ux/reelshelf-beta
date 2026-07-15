# Website Question of the Day Audit — Blueprint for Mobile Phase 6

> Read-only audit. Every claim below is traced to an actual web app file path (repo root,
> sibling to `reelshelf-mobile/`) or a live query against the real production database, read on
> 2026-07-15. No code was changed to produce this document. Does not re-cover Daily Pick, Staff
> Picks, or Today's Story — see `WEBSITE_DAILY_REEL_AUDIT.md` for those.

---

## 0. The single most important finding: rotation creation is server-clock, request-triggered — NOT a cron, and NOT client-device-dependent

**Files read:** `app/daily-reel/page.tsx` (`getOrCreateRotation`, already read in full for the prior
Daily Reel audit, re-confirmed here), `app/api/trivia/answer/route.ts` (full, 188 lines),
`components/daily-reel/DailyReelPage.tsx` (targeted: `QotDSection`, `submitAnswer`,
`initCatState`, streak variables — full read across two passes).

**No cron job, no scheduled Supabase Edge Function, no admin seeding script creates
`trivia_daily_rotation` rows.** The mechanism is `getOrCreateRotation()`, a plain function called
synchronously inside the `/daily-reel` page's server component on **every page request**:
1. `SELECT ... FROM trivia_daily_rotation WHERE rotation_date = today` — if found, use it.
2. If not found: pick one question per category (film/tv/book) from `trivia_questions`, avoiding
   anything used in the last 30 days (`trivia_daily_rotation` lookback), falling back to the full
   pool if everything in a category was used within 30 days.
3. `UPSERT ... ON CONFLICT (rotation_date)` — so if two users' requests race to create the same
   day's row simultaneously, they converge on one shared result rather than erroring.

**Confirmed via live RLS policy** that this really can be triggered by any regular user, not just
an admin/service role:
```
trivia_daily_rotation: INSERT/UPDATE — with_check: auth.uid() IS NOT NULL  (any authenticated user)
trivia_daily_rotation: SELECT — qual: true  (world-readable)
```
Literally the first logged-in user to load `/daily-reel` on a new day creates that day's row for
everyone.

**Resolving the timezone question for this feature specifically:** `today` is computed once,
server-side, in `DailyReelPageRoute()` (`const today = new Date().toISOString().split("T")[0]!`
— always UTC, same as the Daily Pick audit found). This value is computed by **the server**, not
by any individual visitor's device — so unlike a client-side `new Date()` call, **no individual
user's device clock or timezone affects which rotation_date gets used.** Every user, in every
timezone, who visits on the same real-world UTC calendar day sees and answers against the *same*
`trivia_daily_rotation` row. There is a request-time dependency (the mechanism is lazy, not
pre-seeded), but it is a dependency on **the server's UTC clock**, never on **the client's**
clock — a meaningfully different, and much lower-risk, kind of dependency than Daily Pick's,
where each user's own `daily_picks` row is genuinely keyed by whatever date their own client
computed.

---

## 1. Single vs. triple question — resolved: all three, shown as switchable category pills

**Not "one representative question."** `QotDSection` renders three category pill buttons
(Film / TV Series / Book — exact labels, `CAT_LABELS`), and the user can answer all three
independently within the same day — there's no single "featured" category chosen for them.
Exact interaction:
- Tapping an unanswered category pill loads that category's question below.
- Before any category is selected: *"Select a category to answer today's question."*
- Each pill shows a small glyph once that category is answered: **✓** (correct, green),
  **✗** (incorrect, red), or **·** (already-answered but result was a conflict/skip case — see §2).
- A pill for a category with no question that day (`!questions[cat]`) is disabled and dimmed
  (`opacity: 0.3`).
- Question text renders in italic serif; four lettered options (A/B/C/D, `OPTION_LETTERS`) as
  buttons, disabled once `revealed` or `submitting`.

---

## 2. One-response-per-user enforcement — resolved: a real database UNIQUE constraint

**Confirmed live** via `pg_constraint`:
```
trivia_answers_user_id_rotation_date_category_key: UNIQUE (user_id, rotation_date, category)
```
This is enforced at the database level, not merely hidden in the UI. `app/api/trivia/answer/
route.ts` inserts the answer row and explicitly checks for the constraint violation:
```ts
if (answerError.code === "23505") return NextResponse.json({ error: "Already answered today" }, { status: 409 })
```
The client (`submitAnswer` in `DailyReelPage.tsx`) handles a `409` by marking that category
`revealed: true` with `isCorrect: null` and no community stats — a distinct "already answered
today" state, separate from a normal correct/incorrect reveal. This is the source of the **·**
glyph mentioned in §1 (a genuine edge case: e.g., answered on one device/tab, then the UI on
another tab/session tries to submit again and gets the 409 rather than a fresh correct/incorrect
result).

---

## 3. Results/reveal logic — resolved: immediate, fully server-computed

`POST /api/trivia/answer` (full, 188 lines) does everything synchronously in one request, and
the client reveals the response immediately (no polling, no delay):
- **Correct-index and scoring never trust the client** — the question's `correct_index` is
  re-fetched server-side from `trivia_questions` by `questionId`, and `isCorrect` is computed
  server-side against the submitted `selectedIndex`.
- **XP**: `BASE_XP[difficulty]` (easy=10, medium=20, hard=30) + a streak bonus
  (`min(newStreak * 3, 21)`), awarded only if correct.
- **Streak logic**: if correct and the user's `last_{category}_date` was exactly the day before
  `rotationDate`, increment; otherwise reset to 1 (correct) or 0 (incorrect) — per-category,
  independent streaks.
- Response includes `isCorrect`, `correctIndex`, `xpEarned`, `explanation`, `communityStats`,
  `updatedProgress`, and `newBadges` — all consumed immediately by the UI to render the reveal
  panel (Correct/Incorrect + XP badge + explanation text + community stats line + "New question
  in {timeLeft}" countdown).
- **Badge grants** (bonus finding, not explicitly asked for but real and evidenced): six trivia
  badges checked server-side on every answer — `trivia_film_scholar`/`trivia_tv_savant`/
  `trivia_page_turner` (10 correct in that category), `trivia_daily_projectionist` (7-day streak
  in any category), `trivia_historian` (50 total correct), `trivia_perfect_screening` (all 3
  categories correct the same day).

---

## 4. Community Responses Reality Check — CONFIRMED REAL, with an important architectural caveat

**The brief's claim is accurate, but not in the "62% chose B" per-option form** — it's a
**correct/incorrect aggregate only**: *"{percentCorrect}% of {totalAnswers} players got this
right."* Computed by directly querying `trivia_answers` for every row matching
`question_id + rotation_date` (all users, not friends-only, no `followers` table involvement
anywhere in this code path) and calculating `correct / total * 100`.

**Critical caveat for mobile, confirmed via live RLS policy — this query requires bypassing RLS:**
```
trivia_answers: SELECT — qual: auth.uid() = user_id   (own rows only)
```
A regular authenticated client **cannot** read other users' `trivia_answers` rows at all. The
website's community-stats query only works because `app/api/trivia/answer/route.ts` runs
server-side and uses `createAdminClient()` — a **service-role key**, never exposed to any
browser or client bundle. **Mobile cannot replicate this aggregate directly from the client** —
doing so would require either (a) a Supabase Edge Function / RPC that mobile calls (the function
holds the service-role privilege, mobile never does), or (b) a `SECURITY DEFINER` Postgres
function exposed via RPC that computes just the aggregate without exposing raw rows. This is a
real, confirmed architectural constraint, not a preference — building this feature on mobile
without one of those two server-side pieces would either be impossible (RLS blocks it) or a real
security regression (shipping a service-role key in the app).

---

## 5. Streak / participation display — resolved: two distinct, separate presentations

1. **Header streak pills** (`DailyReelPage.tsx` lines ~1103–1109, in the hub's top header, not
   inside the QotD section itself): one `StreakPill` per category, **only rendered if that
   category's streak is > 0** (`hasAnyStreak = filmStreak > 0 || tvStreak > 0 || bookStreak > 0`),
   exact copy: *"{Label} · {streak}-day streak"* (e.g. "Film · 4-day streak"), color-coded per
   category (`CAT_COLORS`: film gold, tv blue, book red).
2. **Per-category today's-status glyph**, inside QotD's own category pills (§1): ✓/✗/· next to the
   label — this is *today's* answered-status, not the streak count.

No other trivia/streak display exists elsewhere in the codebase (repo-wide search for
`trivia_user_progress` found only this route and its consuming components).

---

## 6. Logged-out behavior — confirmed: no fallback, same as the rest of the hub

`/daily-reel` hard-redirects unauthenticated visitors to `/auth` (already established in the
Daily Pick audit — this applies to every section on the page, QotD included, since it's all one
server component tree gated by the same auth check). `/trivia` (`app/trivia/page.tsx`) is a bare
redirect to `/daily-reel` — not a separate standalone trivia experience, and not a public/
logged-out-accessible page either.

---

## Timezone Dependency Resolution (dedicated section, as required)

**Does this feature depend on any individual client's device clock? No.** `rotation_date` is
computed once by the server (UTC) at request time and shared by every user via a single
world-readable, any-authenticated-user-writable row. This is a fundamentally different risk
profile from `daily_picks` (per-user rows, each keyed by whatever date that specific user's own
client computed).

**Direct comparison to `daily_picks`:**
| | `daily_picks` | `trivia_daily_rotation` |
|---|---|---|
| Row scope | One per `(user_id, pick_date)` | One per `rotation_date`, shared by all users |
| Date computed by | Whichever client (web=UTC, mobile=local, per the prior audit's accepted divergence) | The web server only, always UTC |
| Cross-platform risk | Real — same account could see a different pick on mobile vs. web for ~8h around midnight | **None for the website's own mechanism** — but see below |

**One real implication for mobile's future build, not a website finding but a direct consequence
of this section's evidence:** if a mobile implementation of Question of the Day computed "today"
using the device's **local** date (mirroring `daily_picks`' accepted divergence) rather than
matching the website's UTC convention, mobile could disagree with the website about which
`rotation_date` row is "today's" near midnight — and since this table is genuinely shared
world-readable/writable, a mobile client could even prematurely create *tomorrow's* (by UTC)
rotation row while the website still considers it "today." This is a new consideration
specifically because the table is shared and globally-scoped, unlike `daily_picks`' per-user
isolation — worth deciding deliberately in a future build phase rather than defaulting to the
same local-date choice made for Daily Pick without re-examining it.

---

## Mobile's current state

No trivia/Question-of-the-Day implementation exists anywhere in `reelshelf-mobile/` today
(confirmed — this feature was explicitly out of scope for the Daily Reel sprint just completed,
per that task's own CONSTRAINTS deferring it).

---

## Open questions for next phase

1. Community stats requires a server-side piece (Edge Function or `SECURITY DEFINER` RPC) that
   doesn't exist yet on the mobile project — this is new backend work, not just a mobile client
   build, and should be scoped as such.
2. Whether mobile's rotation-date computation should match the website's UTC convention exactly
   (recommended, given the shared/global nature of this table — see Timezone Dependency
   Resolution above) or follow `daily_picks`' local-date precedent — a deliberate decision point,
   not obvious from re-applying the prior sprint's choice.
3. The six trivia badges are real and already integrated with the existing `badges`/`user_badges`
   system — worth deciding whether badge-granting logic belongs in the same server-side piece as
   community stats (natural, since both need admin-client access) if this feature is built.
