import type { BadgeEvalStats, UserBadgeState } from '@/types/badges';
import { STAT_PROGRESS_SUFFIX } from '@/types/badges';
import { REELSHELF_BADGES } from '@/config/badges';

// Evaluate the full badge list against current user stats.
// Legacy/Hidden entries bypass all stat checks — their unlock state is determined
// solely by the `unlockedLegacyIds` array loaded from the `user_badges` table.
export function evaluateUserBadges(
  userStats: BadgeEvalStats,
  unlockedLegacyIds: string[]
): UserBadgeState[] {
  return REELSHELF_BADGES.map((badge) => {
    const isManualOnly = badge.category === 'Legacy' || badge.category === 'Hidden';
    if (isManualOnly) {
      const isUnlocked = unlockedLegacyIds.includes(badge.id);
      return {
        badgeId: badge.id,
        isUnlocked,
        currentProgress: isUnlocked ? 1 : 0,
      };
    }

    let currentProgress = 0;
    if (badge.statKey) {
      currentProgress = userStats[badge.statKey] ?? 0;
    }

    const maxProgress = badge.maxProgress ?? 1;
    const isUnlocked = currentProgress >= maxProgress;

    return {
      badgeId: badge.id,
      isUnlocked,
      currentProgress: Math.min(currentProgress, maxProgress),
    };
  });
}

// Progress info for a single badge slug, used to render progress text in the UI.
// Returns null for Legacy, Hidden, or any slug not found in the catalog.
export function getBadgeProgress(
  slug: string,
  stats: BadgeEvalStats
): { current: number; max: number; label: string; suffix: string } | null {
  const badge = REELSHELF_BADGES.find((b) => b.id === slug);
  if (!badge?.maxProgress || !badge.statKey) return null;

  const current = stats[badge.statKey] ?? 0;
  const suffix = STAT_PROGRESS_SUFFIX[badge.statKey] ?? '';

  return {
    current: Math.min(current, badge.maxProgress),
    max: badge.maxProgress,
    label: badge.unlockConditionText,
    suffix,
  };
}
