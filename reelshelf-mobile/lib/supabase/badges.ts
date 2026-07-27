// Achievements — reuses the EXISTING badges/user_badges tables (already live,
// already populated by existing triggers e.g. trg_grant_beta_badges). All 45
// real badges are sourced from these two tables directly — never a hardcoded
// duplicate list — matching the real website's own architecture (see
// WEBSITE_ACHIEVEMENTS_AUDIT.md).
//
// Three real bugs confirmed in the website's own evaluation code are FIXED
// here (mobile-only — the website itself is untouched, its bugs stay as-is):
//
//  1. Streak badges (week_streak/month_streak/shelf_discipline/unstoppable):
//     the website reads longestStreak from either the trivia game's streak
//     table or a table that doesn't exist in production at all — meaning
//     these 4 badges can never be earned through normal diary use on the
//     real site today. Fixed here using the real diary/watch streak
//     calculation (lib/streak.ts, an exact port of the website's own
//     lib/streak.ts, just never actually wired to badge evaluation there).
//  2. Follow-count badges (first_follower/social_butterfly): the website's
//     dedicated refresh endpoint queries a table literally named "follows"
//     (singular, doesn't exist — a typo of "followers"). Fixed here by
//     querying the real `followers` table correctly (this app's own
//     lib/supabase/profile.ts already does this correctly elsewhere).
//  3. criterion_minded (real DB requirement: high_rated ≥ 25) has NO
//     evaluation code anywhere on the website at all — not a bug so much as
//     a gap. Built fresh here: counts the user's own film diary entries
//     rated ≥ 8/10, using the same "high rating" threshold already
//     established elsewhere in this codebase's own scoring logic
//     (lib/supabase/activityFeed.ts's scoreFeedRow, a port of the website's
//     followingFeed.ts, treats rating ≥ 8 as the "high" tier) — the DB
//     itself doesn't define what "high_rated" numerically means beyond the
//     count threshold, so this is the most consistent choice available.
//
// Left deliberately unfixed, matching CONSTRAINTS: conversation_starter and
// critics_circle (comments/likes-received badges) — not in the 3 confirmed-
// buggy categories this task scopes to touching.
import { supabase } from './client';
import { computeStreak } from '../streak';

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

// ─── catalog (real, DB-sourced — never hardcoded) ──────────────────────────

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface BadgeCatalogEntry {
  id:                string;
  slug:              string;
  name:              string;
  description:       string | null;
  category:          string;
  rarity:            BadgeRarity;
  icon:              string | null;
  hidden:            boolean;
  requirement_type:  string;
  requirement_value: number;
  xp:                number;
}

export interface EarnedBadge {
  id:          string;
  slug:        string;
  name:        string;
  description: string | null;
  icon:        string | null;
  rarity:      string | null;
  unlockedAt:  string;
}

export async function fetchBadgeCatalog(): Promise<BadgeCatalogEntry[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('badges')
    .select('id, slug, name, description, category, rarity, icon, hidden, requirement_type, requirement_value, xp')
    .order('category', { ascending: true })
    .order('xp', { ascending: true });
  if (error) throw error;
  return (data ?? []) as BadgeCatalogEntry[];
}

export async function fetchEarnedBadges(userId: string): Promise<EarnedBadge[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('user_badges')
    .select('unlocked_at, badges(id, slug, name, description, icon, rarity)')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false });
  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const badge = Array.isArray(row.badges) ? row.badges[0] : (row.badges as any);
      if (!badge) return null;
      return {
        id:          badge.id as string,
        slug:        badge.slug as string,
        name:        badge.name as string,
        description: badge.description ?? null,
        icon:        badge.icon ?? null,
        rarity:      badge.rarity ?? null,
        unlockedAt:  row.unlocked_at as string,
      };
    })
    .filter((b): b is EarnedBadge => b !== null);
}

// ─── XP + tier — exact port of the real website's lib/supabase/badges.ts ──

export const RARITY_XP: Record<BadgeRarity, number> = {
  common:    50,
  rare:      150,
  epic:      350,
  legendary: 750,
};

export type LevelTier = 'Collector' | 'Enthusiast' | 'Critic' | 'Curator' | 'Auteur';

export function getTier(totalXP: number): LevelTier {
  if (totalXP >= 2500) return 'Auteur';
  if (totalXP >= 1000) return 'Curator';
  if (totalXP >= 500)  return 'Critic';
  if (totalXP >= 200)  return 'Enthusiast';
  return 'Collector';
}

export function computeTotalXP(earned: EarnedBadge[]): number {
  return earned.reduce((sum, b) => sum + (RARITY_XP[(b.rarity as BadgeRarity) ?? 'common'] ?? 0), 0);
}

// ─── real, correctly-sourced user stats ────────────────────────────────────

export interface BadgeSyncStats {
  filmCount:         number;
  tvCount:            number;
  bookCount:          number;
  reviewCount:        number;
  cinemaCount:        number;
  longestStreak:      number; // FIXED — real diary watch streak, see header comment
  followersCount:     number; // FIXED — real `followers` table, see header comment
  highRatedFilmCount: number; // NEW — powers criterion_minded, see header comment
}

const HIGH_RATING_THRESHOLD = 8;

/** Real, correct stats for badge evaluation — the mobile-side fix for the 3
 *  confirmed-buggy categories in WEBSITE_ACHIEVEMENTS_AUDIT.md. Comments/
 *  likes-received are deliberately not included: those 2 badges are out of
 *  this fix's scope (see header comment). */
export async function computeUserBadgeStats(userId: string): Promise<BadgeSyncStats> {
  const client = requireClient();

  const [diaryRes, followersRes] = await Promise.all([
    client
      .from('diary_entries')
      .select('media_type, rating, review, watched_date, watched_in_cinema, review_scope, score_rating, cinematography_rating, writing_rating, performances_rating, direction_rating, rewatchability_rating, emotional_impact_rating, entertainment_rating')
      .eq('user_id', userId),
    client
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId),
  ]);

  if (diaryRes.error) throw diaryRes.error;
  if (followersRes.error) throw followersRes.error;

  type Row = {
    media_type: string;
    rating: number | string | null;
    review: string | null;
    watched_date: string;
    watched_in_cinema: boolean | null;
    review_scope: string;
    score_rating: number | null;
    cinematography_rating: number | null;
    writing_rating: number | null;
    performances_rating: number | null;
    direction_rating: number | null;
    rewatchability_rating: number | null;
    emotional_impact_rating: number | null;
    entertainment_rating: number | null;
  };
  const rows = (diaryRes.data ?? []) as Row[];

  // film/tv/book/cinema counts — show/title scope only, matching the real
  // website's own profile-page counting rule (excludes season/episode-level
  // TV logs from inflating the count).
  const titleScoped = rows.filter((r) => r.review_scope === 'show' || r.review_scope === 'title');
  const filmCount = titleScoped.filter((r) => r.media_type === 'movie').length;
  const tvCount = titleScoped.filter((r) => r.media_type === 'tv').length;
  const bookCount = titleScoped.filter((r) => r.media_type === 'book').length;
  const cinemaCount = titleScoped.filter((r) => r.media_type === 'movie' && r.watched_in_cinema === true).length;

  // review count — any scope, has review text OR any review-layer rating,
  // matching the real website's own (unscoped) reviewCount query exactly.
  const hasReviewContent = (r: Row) =>
    Boolean(r.review?.trim()) ||
    r.score_rating != null || r.cinematography_rating != null || r.writing_rating != null ||
    r.performances_rating != null || r.direction_rating != null || r.rewatchability_rating != null ||
    r.emotional_impact_rating != null || r.entertainment_rating != null;
  const reviewCount = rows.filter(hasReviewContent).length;

  // FIX 1 — real diary watch streak (lib/streak.ts), title-scoped watched_date values.
  const watchedDates = titleScoped.map((r) => r.watched_date).filter(Boolean);
  const { longestStreak } = computeStreak(watchedDates);

  // FIX 2 — real `followers` table, correct column names.
  const followersCount = followersRes.count ?? 0;

  // NEW — criterion_minded: film-category entries rated ≥ 8/10.
  const highRatedFilmCount = titleScoped.filter((r) => {
    if (r.media_type !== 'movie') return false;
    const rating = typeof r.rating === 'number' ? r.rating : r.rating ? Number(r.rating) : null;
    return rating != null && rating >= HIGH_RATING_THRESHOLD;
  }).length;

  return { filmCount, tvCount, bookCount, reviewCount, cinemaCount, longestStreak, followersCount, highRatedFilmCount };
}

// ─── earned-slug computation — exact port of computeEarnedBadgeSlugs, plus criterion_minded ──

export function computeEarnedBadgeSlugs(stats: BadgeSyncStats, existingBadgeCount: number): string[] {
  const earned: string[] = [];

  // Film
  if (stats.filmCount >= 1)   earned.push('first_screening');
  if (stats.filmCount >= 10)  earned.push('film_enthusiast');
  if (stats.filmCount >= 100) earned.push('film_centennial');
  if (stats.filmCount >= 500) earned.push('marathon_viewer');

  // NEW — criterion_minded (real DB requirement: high_rated >= 25).
  if (stats.highRatedFilmCount >= 25) earned.push('criterion_minded');

  // TV
  if (stats.tvCount >= 1)  earned.push('pilot_episode');
  if (stats.tvCount >= 10) earned.push('binge_mode');
  if (stats.tvCount >= 25) earned.push('sitcom_survivor');
  if (stats.tvCount >= 50) earned.push('prestige_television');

  // Books
  if (stats.bookCount >= 1)  earned.push('page_turner');
  if (stats.bookCount >= 20) earned.push('bookworm');
  if (stats.bookCount >= 50) earned.push('literary_taste');

  // Reviews
  if (stats.reviewCount >= 1)   earned.push('first_review');
  if (stats.reviewCount >= 10)  earned.push('critic_in_training');
  if (stats.reviewCount >= 50)  earned.push('cultural_commentator');
  if (stats.reviewCount >= 100) earned.push('master_critic');

  // Streaks (longest ever, not just current) — FIXED source, real thresholds unchanged.
  if (stats.longestStreak >= 7)   earned.push('week_streak');
  if (stats.longestStreak >= 30)  earned.push('month_streak');
  if (stats.longestStreak >= 100) earned.push('shelf_discipline');
  if (stats.longestStreak >= 365) earned.push('unstoppable');

  // Cinema
  if (stats.cinemaCount >= 1)  earned.push('cinema_debut');
  if (stats.cinemaCount >= 5)  earned.push('cinema_regular');
  if (stats.cinemaCount >= 10) earned.push('imax_enthusiast');
  if (stats.cinemaCount >= 25) earned.push('silver_screen');

  // Social — FIXED source (real followers table); comments/likes-received
  // deliberately excluded, out of this fix's scope.
  if (stats.followersCount >= 1)  earned.push('first_follower');
  if (stats.followersCount >= 10) earned.push('social_butterfly');

  // Prestige — based on total earned count (auto-computed + existing manual badges).
  const projectedTotal = earned.length + existingBadgeCount;
  if (projectedTotal >= 10) earned.push('completionist');
  if (projectedTotal >= 20) earned.push('reelshelf_scholar');

  return earned;
}

// ─── sync — exact port of syncEarnedBadges ─────────────────────────────────

export async function syncEarnedBadges(
  userId: string,
  earnedSlugs: string[],
  existingEarnedSlugs: Set<string>,
  catalog: BadgeCatalogEntry[],
): Promise<void> {
  const client = requireClient();
  const slugToId = new Map(catalog.map((d) => [d.slug, d.id]));
  const toInsert: { user_id: string; badge_id: string; unlocked_at: string; showcased: boolean }[] = [];

  for (const slug of earnedSlugs) {
    if (existingEarnedSlugs.has(slug)) continue;
    const id = slugToId.get(slug);
    if (!id) continue;
    toInsert.push({ user_id: userId, badge_id: id, unlocked_at: new Date().toISOString(), showcased: false });
  }

  if (toInsert.length === 0) return;
  const { error } = await client.from('user_badges').insert(toInsert);
  if (error) throw error;
}

// ─── orchestrator ───────────────────────────────────────────────────────────

export interface BadgeEvaluationResult {
  allEarned:     EarnedBadge[];
  newlyUnlocked: EarnedBadge[];
  totalXP:       number;
  tier:          LevelTier;
}

/** Evaluate + sync in one call — the single entry point every trigger site
 *  (diary save, follow action, app open) calls. Diffs the earned-badge set
 *  before/after so callers can tell a genuine new unlock from a badge the
 *  user already had, which is what the mobile-only celebration UI (see
 *  contexts/BadgeCelebrationContext.tsx) keys off of. */
export async function evaluateAndSyncBadges(userId: string): Promise<BadgeEvaluationResult> {
  const [catalog, earnedBefore] = await Promise.all([
    fetchBadgeCatalog(),
    fetchEarnedBadges(userId),
  ]);

  const earnedSlugsBefore = new Set(earnedBefore.map((b) => b.slug));
  const stats = await computeUserBadgeStats(userId);
  const earnedSlugs = computeEarnedBadgeSlugs(stats, earnedBefore.length);

  const newSlugs = earnedSlugs.filter((slug) => !earnedSlugsBefore.has(slug));
  if (newSlugs.length > 0) {
    await syncEarnedBadges(userId, earnedSlugs, earnedSlugsBefore, catalog);
  }

  const allEarned = newSlugs.length > 0 ? await fetchEarnedBadges(userId) : earnedBefore;
  const newlyUnlocked = allEarned.filter((b) => newSlugs.includes(b.slug));
  const totalXP = computeTotalXP(allEarned);

  return { allEarned, newlyUnlocked, totalXP, tier: getTier(totalXP) };
}

// ─── progress-toward-next-badge ────────────────────────────────────────────

export interface BadgeProgress {
  badge:      BadgeCatalogEntry;
  current:    number;
  max:        number;
  percentage: number; // 0-100, clamped
}

const STAT_KEY_BY_REQUIREMENT_TYPE: Partial<Record<string, keyof BadgeSyncStats>> = {
  film_count:   'filmCount',
  tv_count:     'tvCount',
  book_count:   'bookCount',
  review_count: 'reviewCount',
  cinema_count: 'cinemaCount',
  streak:       'longestStreak',
  followers:    'followersCount',
  high_rated:   'highRatedFilmCount',
};

/** For every not-yet-earned, non-manual badge, how close the user is —
 *  current/max/percentage. Manual-only badges (requirement_type "manual",
 *  e.g. the Legacy tier, list_maker, nolan_archivist) have no meaningful
 *  progress and are excluded; badge_count-based prestige badges (completionist/
 *  reelshelf_scholar) use the earned-badge count itself as current. */
export function computeBadgeProgress(
  catalog: BadgeCatalogEntry[],
  earnedSlugs: Set<string>,
  stats: BadgeSyncStats,
): BadgeProgress[] {
  const progress: BadgeProgress[] = [];

  for (const badge of catalog) {
    if (earnedSlugs.has(badge.slug)) continue;
    if (badge.requirement_type === 'manual') continue;

    let current: number;
    if (badge.requirement_type === 'badge_count') {
      current = earnedSlugs.size;
    } else {
      const statKey = STAT_KEY_BY_REQUIREMENT_TYPE[badge.requirement_type];
      current = statKey ? stats[statKey] : 0;
    }

    const max = badge.requirement_value;
    progress.push({
      badge,
      current: Math.min(current, max),
      max,
      percentage: max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0,
    });
  }

  return progress;
}
