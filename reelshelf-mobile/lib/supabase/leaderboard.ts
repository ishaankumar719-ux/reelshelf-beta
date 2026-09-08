import { getTier, type LevelTier } from './badges';
import { supabase } from './client';

export interface LeaderboardEntry {
  userId:      string;
  username:    string | null;
  displayName: string | null;
  avatarUrl:   string | null;
  totalXP:     number;
  badgeCount:  number;
  tier:        LevelTier;
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

// A lightweight, public-facing leaderboard built solely from real badge
// unlocks. This keeps the ranking meaningful without rewarding spammy logs
// or exposing profiles that are not already visible in public_profiles.
export async function fetchLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('user_badges')
    .select('user_id, badges(xp)')
    .limit(1000);
  if (error) throw error;

  const scores = new Map<string, { totalXP: number; badgeCount: number }>();
  for (const row of data ?? []) {
    const badge = Array.isArray(row.badges) ? row.badges[0] : row.badges;
    const xp = Number((badge as { xp?: unknown } | null)?.xp);
    if (!row.user_id || !Number.isFinite(xp) || xp <= 0) continue;
    const current = scores.get(row.user_id as string) ?? { totalXP: 0, badgeCount: 0 };
    scores.set(row.user_id as string, {
      totalXP: current.totalXP + xp,
      badgeCount: current.badgeCount + 1,
    });
  }

  const userIds = [...scores.keys()];
  if (userIds.length === 0) return [];
  const { data: profiles, error: profilesError } = await client
    .from('public_profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', userIds);
  if (profilesError) throw profilesError;

  return (profiles ?? [])
    .map((profile) => {
      const score = scores.get(profile.id as string);
      if (!score) return null;
      return {
        userId:      profile.id as string,
        username:    profile.username as string | null,
        displayName: profile.display_name as string | null,
        avatarUrl:   profile.avatar_url as string | null,
        totalXP:     score.totalXP,
        badgeCount:  score.badgeCount,
        tier:        getTier(score.totalXP),
      } satisfies LeaderboardEntry;
    })
    .filter((entry): entry is LeaderboardEntry => entry !== null)
    .sort((a, b) => b.totalXP - a.totalXP || b.badgeCount - a.badgeCount)
    .slice(0, limit);
}
