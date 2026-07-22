// Which of a TV show's episodes has the current user already logged —
// powers the "+ Log" vs "Edit" affordance per episode in the Season Browser
// (components/SeasonEpisodeBrowser.tsx). Reads the same diary_entries table
// every other diary query uses, filtered to review_scope='episode' for this
// one show.
import { supabase } from './client';

export interface EpisodeLogEntry {
  seasonNumber:  number;
  episodeNumber: number;
  rating:        number | null;
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

/** `showMediaId` must be the BARE TMDB numeric id (no "tmdb-" prefix) — see
 *  components/SeasonEpisodeBrowser.tsx's header comment for why episode-scoped
 *  rows deliberately use this convention (matches the real website's own
 *  src/lib/reviews.ts payload exactly, confirmed against real production
 *  episode-review rows). */
export async function fetchUserEpisodeEntries(userId: string, showMediaId: string): Promise<Map<string, EpisodeLogEntry>> {
  const client = requireClient();
  const { data, error } = await client
    .from('diary_entries')
    .select('season_number, episode_number, rating')
    .eq('user_id', userId)
    .eq('media_type', 'tv')
    .eq('media_id', showMediaId)
    .eq('review_scope', 'episode');
  if (error) throw error;

  const map = new Map<string, EpisodeLogEntry>();
  for (const row of data ?? []) {
    if (row.season_number == null || row.episode_number == null) continue;
    map.set(`${row.season_number}:${row.episode_number}`, {
      seasonNumber:  row.season_number as number,
      episodeNumber: row.episode_number as number,
      rating:        typeof row.rating === 'number' ? row.rating : row.rating ? Number(row.rating) : null,
    });
  }
  return map;
}
