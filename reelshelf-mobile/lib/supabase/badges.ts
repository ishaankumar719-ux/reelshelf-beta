// Achievements — reuses the EXISTING badges/user_badges tables (already live,
// already populated by existing triggers e.g. trg_grant_beta_badges). This
// file only adds a read query; no new table, no new trigger. RLS on both
// tables is already public-read, so this works identically for the owner's
// own profile and for viewing another user's profile.
import { supabase } from './client';

export interface EarnedBadge {
  id:          string;
  slug:        string;
  name:        string;
  description: string | null;
  icon:        string | null;
  rarity:      string | null;
  unlockedAt:  string;
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
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
