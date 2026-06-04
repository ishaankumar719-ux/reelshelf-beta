export type BadgeCategory =
  | 'Legacy'
  | 'Logging'   // films + cinema + streaks + prestige achievements
  | 'Reviews'
  | 'Social'
  | 'TV'
  | 'Books'
  | 'Hidden';   // manually-awarded / secret badges

export type BadgeRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

export interface BadgeEvalStats {
  filmCount: number;
  tvCount: number;
  bookCount: number;
  reviewCount: number;
  longestStreak: number;
  cinemaCount: number;
  followersCount: number;
  commentsReceived: number;
  likesReceived: number;
}

// Human-readable suffix for each stat key — used to build "3 / 10 films logged" strings.
export const STAT_PROGRESS_SUFFIX: Partial<Record<keyof BadgeEvalStats, string>> = {
  filmCount:        'films logged',
  tvCount:          'shows logged',
  bookCount:        'books logged',
  reviewCount:      'reviews written',
  longestStreak:    'day streak',
  cinemaCount:      'cinema visits',
  followersCount:   'followers',
  commentsReceived: 'comments received',
  likesReceived:    'likes received',
};

export interface BadgeDefinition {
  id: string;           // matches `slug` in the DB
  name: string;
  description: string;
  unlockConditionText: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  maxProgress?: number; // absent for Legacy/Hidden — unlock via explicit DB record only
  statKey?: keyof BadgeEvalStats;
}

export interface UserBadgeState {
  badgeId: string;
  isUnlocked: boolean;
  currentProgress: number;
  unlockedAt?: string; // ISO timestamp if unlocked
}
