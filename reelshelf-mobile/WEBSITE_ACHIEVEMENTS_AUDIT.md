# Website Achievements/Badges — Read-Only Audit

Read-only investigation of the real badge/achievement system and every related concept named in the brief. No code was modified — see VERIFICATION at the bottom.

## 0 — A critical structural finding before anything else

**There are two badge catalogs in this codebase, and they have diverged.** `config/badges.ts`'s `REELSHELF_BADGES` (34 entries, a static TS array) is real and live, but only for one narrow purpose: `utils/badgeEvaluator.ts`'s `getBadgeProgress()` uses it to look up a badge's `maxProgress`/`statKey` for "42/100 films logged"-style progress text. Its sibling function `evaluateUserBadges()` — which would use the whole 34-badge array as a catalog — has **zero callers anywhere in the app** (grep-confirmed).

The actual badge catalog that renders on the real, live profile page (`app/u/[username]/page.tsx`, via `lib/supabase/badges.ts`'s `fetchBadgesForProfile()`) comes from the real `badges` database table, queried directly. That table has **45 rows**, not 34 — 11 more than the static config, including an entire `trivia` category (6 badges) and 5 completely different `legacy` badges that don't exist in `config/badges.ts` at all. The two systems are not in sync. Section 1 below documents the real, authoritative 45-badge catalog from the live database, cross-referenced against `config/badges.ts` with every discrepancy called out.

A third, entirely dead parallel system was also found and excluded: `lib/supabase/gamification.ts` (`syncAndLoadGamificationStats`, badge IDs `first_entry`/`ten_entries`/`fifty_entries`/etc. — none of which match any real `badges` row, and the function never writes to any table). It's only imported by `components/GamificationWidgets.tsx`, which is only imported by `components/home/HomeDashboardClient.tsx` — already-confirmed dead code from an earlier audit in this project. Mentioned here only so it isn't mistaken for real evidence if re-discovered later.

---

## 1 — COMPLETE_BADGE_CATALOG (the real 45, from the live `badges` table)

Legend: **Req.** = `requirement_type`/`requirement_value` as stored in the DB. "manual" means no automated check exists anywhere in code — it can only be granted via the admin API. A **✗** in the Auto column means the badge has a numeric requirement defined but no live code path actually evaluates it (see §2).

### Book (4)
| Slug | Name | Rarity | XP | Req. | Auto? |
|---|---|---|---|---|---|
| page_turner | Page Turner | Common | 50 | book_count ≥ 1 | ✅ |
| bookworm | Bookworm | Rare | 150 | book_count ≥ 20 | ✅ |
| literary_taste | Literary Taste | Epic | 350 | book_count ≥ 50 | ✅ |
| sci_fi_scholar | Sci-Fi Scholar | Rare | 150 | manual (hidden) | manual only |

### Cinema (4)
| Slug | Name | Rarity | XP | Req. | Auto? |
|---|---|---|---|---|---|
| cinema_debut | Cinema Debut | Common | 50 | cinema_count ≥ 1 | ✅ |
| cinema_regular | Cinema Regular | Common | 50 | cinema_count ≥ 5 | ✅ |
| imax_enthusiast | IMAX Enthusiast | Rare | 150 | cinema_count ≥ 10 | ✅ |
| silver_screen | Silver Screen | Epic | 350 | cinema_count ≥ 25 | ✅ |

### Film (6)
| Slug | Name | Rarity | XP | Req. | Auto? |
|---|---|---|---|---|---|
| first_screening | First Screening | Common | 50 | film_count ≥ 1 | ✅ |
| film_enthusiast | Film Enthusiast | Common | 50 | film_count ≥ 10 | ✅ |
| criterion_minded | Criterion Minded | Rare | 150 | **high_rated ≥ 25** | ✗ — has a real numeric requirement in the DB but no code anywhere checks it (not in `computeEarnedBadgeSlugs`, not in the trivia route) |
| film_centennial | Film Centennial | Rare | 150 | film_count ≥ 100 | ✅ |
| nolan_archivist | Nolan Archivist | Epic | 350 | manual (hidden) | manual only |
| marathon_viewer | Marathon Viewer | Epic | 350 | film_count ≥ 500 | ✅ |

### Legacy (5) — all Legendary, 750 XP, all hidden+limited
| Slug | Name | Req. | Auto? |
|---|---|---|---|
| founding_critic | Founding Critic | manual | ✅ **auto-granted by a real DB trigger** (see §2) |
| reelshelf_insider | ReelShelf Insider | manual | manual only (admin API `grant_single`) |
| day_one_member | Day One Member | manual | ✅ **auto-granted by the same DB trigger** |
| beta_pioneer | Beta Pioneer | manual | ✅ **auto-granted by the same DB trigger** |
| original_eight | Original Eight | manual | manual only (admin API has a dedicated `auto_original_eight` bulk action — first 8 profiles by `created_at`) |

### Prestige (4)
| Slug | Name | Rarity | XP | Req. | Auto? |
|---|---|---|---|---|---|
| list_maker | List Maker | Common | 50 | manual | manual only |
| completionist | Completionist | Epic | 350 | badge_count ≥ 10 | ✅ |
| founding_member | Founding Member | Legendary | 750 | manual | ✅ **auto-granted by the same DB trigger as the 3 Legacy badges above** |
| reelshelf_scholar | ReelShelf Scholar | Legendary | 750 | badge_count ≥ 20 | ✅ |

### Reviews (4)
| Slug | Name | Rarity | XP | Req. | Auto? |
|---|---|---|---|---|---|
| first_review | First Review | Common | 50 | review_count ≥ 1 | ✅ |
| critic_in_training | Critic in Training | Common | 50 | review_count ≥ 10 | ✅ |
| cultural_commentator | Cultural Commentator | Rare | 150 | review_count ≥ 50 | ✅ |
| master_critic | Master Critic | Epic | 350 | review_count ≥ 100 | ✅ |

### Social (4)
| Slug | Name | Rarity | XP | Req. | Auto? |
|---|---|---|---|---|---|
| conversation_starter | Conversation Starter | Common | 50 | comments ≥ 1 | ✗ — see §2, hardcoded/unreachable in every real code path |
| first_follower | First Follower | Common | 50 | followers ≥ 1 | ⚠️ works from the profile page, broken from `/api/badges/refresh` — see §2 |
| social_butterfly | Social Butterfly | Rare | 150 | followers ≥ 10 | ⚠️ same as above |
| critics_circle | Critic's Circle | Epic | 350 | likes ≥ 50 | ✗ — same as conversation_starter |

### Streaks (4)
| Slug | Name | Rarity | XP | Req. | Auto? |
|---|---|---|---|---|---|
| week_streak | 7-Day Streak | Common | 50 | streak ≥ 7 | ✗ — see §3, wired to the wrong data source everywhere |
| month_streak | 30-Day Streak | Rare | 150 | streak ≥ 30 | ✗ |
| shelf_discipline | Shelf Discipline | Epic | 350 | streak ≥ 100 | ✗ |
| unstoppable | Unstoppable | Legendary | 750 | streak ≥ 365 | ✗ |

### Trivia (6)
| Slug | Name | Rarity | XP | Req. | Auto? |
|---|---|---|---|---|---|
| trivia_page_turner | Page Turner | Rare | 150 | manual (label) | ✅ real check: 10 correct book-category answers, see §2 |
| trivia_film_scholar | Film Scholar | Rare | 150 | manual (label) | ✅ 10 correct film-category answers |
| trivia_tv_savant | TV Savant | Rare | 150 | manual (label) | ✅ 10 correct tv-category answers |
| trivia_daily_projectionist | Daily Projectionist | Epic | 250 | manual (label) | ✅ max(film/tv/book trivia streak) ≥ 7 days |
| trivia_historian | ReelShelf Historian | Epic | 300 | manual (label) | ✅ 50 total correct trivia answers, all-time |
| trivia_perfect_screening | Perfect Screening | Legendary | 400 | manual (label) | ✅ all 3 categories answered correctly on the same day |

### TV (4)
| Slug | Name | Rarity | XP | Req. | Auto? |
|---|---|---|---|---|---|
| pilot_episode | Pilot Episode | Common | 50 | tv_count ≥ 1 | ✅ |
| binge_mode | Binge Mode | Common | 50 | tv_count ≥ 10 | ✅ |
| sitcom_survivor | Sitcom Survivor | Rare | 150 | tv_count ≥ 25 | ✅ |
| prestige_television | Prestige Television | Rare | 150 | tv_count ≥ 50 | ✅ |

**Discrepancies with `config/badges.ts` worth flagging explicitly:** the static config's 2-badge "Legacy" category (`founding_member` + `beta_tester`) doesn't match the DB at all — `beta_tester`/"Beta Legend" has no corresponding DB row anywhere (it isn't a real, earnable badge today), and `founding_member` exists in the DB but under category `prestige`, not `legacy`, and with `hidden: false` (config.ts has it as `Hidden`/`Legacy`). `criterion_minded` is `Hidden`/manual-flavored in config.ts's copy but the DB gives it a real `high_rated ≥ 25` numeric requirement and `hidden: false`.

## 2 — EVALUATION_TIMING

**All three real timing mechanisms confirmed, each with a different reliability story:**

1. **A real, on-write DB trigger** for 4 badges: `trg_grant_beta_badges` (`AFTER INSERT ON profiles`) calls `on_profile_created_grant_beta_badges()`, which — only while `now() < BETA_LAUNCH_CUTOFF` (2026-09-01) — calls `grant_beta_badges_to_user(new.id)`. That function's body is exactly:
   ```sql
   v_slugs text[] := ARRAY['founding_member', 'founding_critic', 'day_one_member', 'beta_pioneer'];
   ```
   Every account created during the beta window gets these 4 badges automatically, at signup, reliably, in the database layer — no JS involved, nothing that can silently fail the way the two paths below can.

2. **On-write, inline within an API request** for the 6 trivia badges: `app/api/trivia/answer/route.ts`'s `POST` handler computes and inserts newly-earned trivia badges synchronously, in the same request as recording the answer, reading real `trivia_answers`/`trivia_user_progress` data it just wrote. This path is correctly wired and works.

3. **On-demand, from two different call sites, both real but both buggy** for the ~28 generic stat-based badges (`computeEarnedBadgeSlugs` + `syncEarnedBadges` in `lib/supabase/badges.ts`):
   - `app/u/[username]/page.tsx` — runs inline on every profile page load (own profile: syncs to DB; someone else's profile: computed for display only, not persisted).
   - `app/api/badges/refresh/route.ts` — a dedicated endpoint, called exactly once in the whole codebase: fire-and-forget from `app/settings/import/ImportWizard.tsx`, after a Letterboxd/Goodreads import finishes.

   **Neither call site correctly supplies every stat it needs** — see §3 for the specifics. Bottom line: film/tv/book/review/cinema counts and the two badge-count prestige badges work correctly from both call sites (they query `diary_entries`/already-synced badge counts directly, with correct table names). Everything else in this tier (streaks, follower counts from the refresh route, comment/like counts) has a real, evidenced bug.

**No batch/cron job exists anywhere** — grep across the whole repo for scheduled-job patterns tied to badges returns nothing; every mechanism above fires as a direct consequence of a specific user action (signup, a trivia answer, a profile page view, or a completed import).

## 3 — ACHIEVEMENT_SCORE_COMPLETION_PERCENTAGE

**A real XP-based achievement score and a real 5-tier level system exist — not a "% of badges earned" completion percentage.** `lib/supabase/badges.ts`:
```ts
export const RARITY_XP = { common: 50, rare: 150, epic: 350, legendary: 750 }
export function computeTotalXP(badges) { return badges.filter(b => b.earned).reduce((sum,b) => sum + RARITY_XP[b.rarity], 0) }
export type LevelTier = "Collector" | "Enthusiast" | "Critic" | "Curator" | "Auteur"
export function getTier(totalXP) {
  if (totalXP >= 2500) return "Auteur"
  if (totalXP >= 1000) return "Curator"
  if (totalXP >= 500)  return "Critic"
  if (totalXP >= 200)  return "Enthusiast"
  return "Collector"
}
```
`app/u/[username]/page.tsx` calls `computeTotalXP(displayBadges)` directly (confirmed live, not dead code). No literal "N% complete" figure (earned-count ÷ total-count) was found anywhere — the real progression concept is XP + tier name, not a percentage.

## 4 — STREAK_SYSTEM_FINDING

**A real diary/watch streak concept exists and is shown to users, but it is disconnected from badge evaluation — both real evaluation call sites read the wrong data source.**

- `lib/streak.ts`'s `computeStreak(watchedDates: string[])` is the real, correct implementation: unique calendar days from `diary_entries`, consecutive-day counting, returns both `currentStreak` and `longestStreak` (no fixed window — it's an open-ended "longest consecutive-day run ever" concept; 7/30/100/365 only appear as the *badge* milestones, not as different streak "types"). It's called from `components/diary/DiaryLogModal.tsx` and `components/stats/StatsClient.tsx` — real, live, user-visible.
- But `app/api/badges/refresh/route.ts` — one of the two badge-evaluation call sites — sources `longestStreak` from **`trivia_user_progress.longest_streak`** (the trivia game's streak, confirmed real and correctly maintained by the trivia-answer trigger), not from any diary-based calculation.
- The other call site, `app/u/[username]/page.tsx`, sources `longestStreak` (and `commentsReceived`/`likesReceived`) from **`user_gamification.longest_streak`** — a table that **does not exist in the production database** (`relation "user_gamification" does not exist`, confirmed via direct query). Supabase-js doesn't throw on this, it returns `{data: null, error}`, so the page doesn't crash — `gamRow` is just always `null`, silently defaulting every one of these three stats to 0.

Net effect: **the four "logging streak" badges (week_streak/month_streak/shelf_discipline/unstoppable) can never be earned through normal diary use on the real live site today**, regardless of how long a user's real watch streak is — one path checks trivia participation instead, the other reads a table that doesn't exist.

## 5 — UNLOCK_UX_FINDING

**Passive-only for the generic badge sync; a minimal inline banner (not a modal, animation, or share action) for trivia badges only.** `app/u/[username]/page.tsx` is a Next.js Server Component — it computes and persists newly-earned badges as part of the page's server-side data-fetch, with no client-side celebration mechanism possible from that code path at all; a new badge simply appears in the badge grid on next render. The one real unlock notification found is in `components/trivia/TriviaHub.tsx`, inside the trivia answer-reveal panel:
```tsx
{activeState.revealData.newBadges.length > 0 && (
  <div style={{ background: "rgba(251,191,36,0.06)", ... }}>
    🏅 <span>Badge unlocked: {names.join(", ")}</span>
  </div>
)}
```
A small gold-tinted inline text banner embedded in the existing reveal card — no modal, no confetti/celebration animation, no share action anywhere in the badge system.

## 6 — FRIENDS_COUNT_ACHIEVEMENTS_FINDING

**Real, but only two tiers (1 and 10), using the real `followers` table — not "Friends," not 25/100.** `first_follower` (followers ≥ 1) and `social_butterfly` (followers ≥ 10) are both real DB rows, both driven by `followersCount`. No `friend_requests`/`friendship` table exists (already-settled ground truth, re-confirmed: only `followers` exists anywhere in the schema). No 25-follower or 100-follower tier badge exists in the real 45-badge catalog. As noted in §1/§2, this stat is correctly computed with the real `followers` table on the profile-page call site, but the dedicated `/api/badges/refresh` endpoint queries a table literally named `"follows"` (singular typo, doesn't exist — confirmed via direct schema query) — meaning that specific endpoint can never award either follower badge, even though the underlying data (`followersCount`) is real.

## 7 — COLLECTION_COMPLETION_ACHIEVEMENTS_FINDING

**Confirmed absent as an automated concept — and no "Nolan" collection exists to check completion against even if it did.** A direct query against the real `collections` table for anything Nolan-related returns zero rows. `nolan_archivist` is a real badge, but its `requirement_type` is `"manual"` and it's `hidden: true` — it can only be granted through the admin API, exactly like `sci_fi_scholar` and `criterion_minded`'s copy suggests curated taste rather than an automated check. No code anywhere computes "has this user logged every title in collection X" for any collection, Nolan-branded or otherwise. The badge's flavor text ("Every frame of every timeline, catalogued") is copy for a manually-curated recognition badge, not a description of working automation.

## 8 — BEST_PICTURE_ACHIEVEMENT_FINDING

**Confirmed absent.** Repo-wide search for `best_picture`/`BestPicture`/`oscar`/`academy_award` returns zero matches anywhere in the codebase. Consistent with the already-settled ground truth that no verified awards/Best-Picture dataset exists in the schema at all — there's nothing for such an achievement to check against even in principle.

## 9 — LEADERBOARD_FINDING

**Confirmed absent from the live site — a real, fully-built leaderboard exists in code but is dead, unreachable code.** `lib/supabase/weekly.ts` has a genuine, working-looking implementation: three ranked categories (`entries_logged`, `reviews_written`, `liked_reviewer`), built from real `diary_entries`/`diary_entry_likes` data scoped to the current week, ranked across **all public profiles** (`.from("profiles").not("username","is",null)` — global, not followed-only). It's rendered by `components/WeeklyChallengesSection.tsx` — which is only ever imported by `components/home/HomeDashboardClient.tsx`, the same component already confirmed dead/unreachable in an earlier audit of this project. Not part of any live route. The only other "leaderboard" mention anywhere in the codebase is a single marketing-copy string in `TriviaHub.tsx` — "Themed question sets, leaderboards, and exclusive badges. Every Monday." — describing a promised future feature, not working functionality.

## 10 — MOBILE_CURRENT_STATE

Mobile already has real Achievements infrastructure from earlier Profile-parity work: `app/achievements/[id].tsx` (a real screen), `components/profile/AchievementsRow.tsx` (a profile preview row), and `lib/supabase/badges.ts` — whose own header comment already correctly anticipated part of this audit's findings: *"reuses the EXISTING badges/user_badges tables (already live, already populated by existing triggers e.g. trg_grant_beta_badges)"* — confirming a prior mobile session had already discovered the real DB trigger this audit re-confirms in §2. Mobile's `fetchEarnedBadges()` reads real `user_badges` joined to `badges` (id/slug/name/description/icon/rarity/unlocked_at) — i.e., it already reads from the correct, real, authoritative 45-badge table, not the stale `config/badges.ts` static array. It currently shows **only earned badges** — no progress tracking toward unearned ones (`getBadgeProgress`-equivalent), no XP/tier display, no leaderboard (correctly, since none is real), no completion-achievement UI (correctly, since none is real).

---

## Verification

Read-only throughout — no files modified, no migrations applied, no writes of any kind executed against the repository or the database (all Supabase calls in this audit were `SELECT`/schema-introspection queries only).
