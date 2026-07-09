import { supabase } from './client';
import type { DbMediaType } from './mediaActions';

export interface DiaryListEntry {
  /** Mobile route id, e.g. "film-693134" — reconstructed from the DB's media_type/media_id for navigation back into Movie Detail. */
  routeId:     string;
  title:       string;
  poster:      string | null;
  year:        number;
  rating:      number | null;
  review:      string;
  watchedDate: string;
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

/** Inverse of mediaActions.toDbMediaId/toDbMediaType — reconstructs the mobile route id from a DB row. */
function toRouteId(dbMediaType: DbMediaType, dbMediaId: string): string {
  const prefix = dbMediaType === 'movie' ? 'film' : dbMediaType;
  const bareId = dbMediaId.startsWith('tmdb-') ? dbMediaId.slice(5) : dbMediaId;
  return `${prefix}-${bareId}`;
}

export async function fetchDiaryEntries(userId: string): Promise<DiaryListEntry[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('diary_entries')
    .select('media_id, media_type, title, poster, year, rating, review, watched_date')
    .eq('user_id', userId)
    .eq('review_scope', 'show')
    .order('watched_date', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    routeId:     toRouteId(row.media_type as DbMediaType, row.media_id as string),
    title:       row.title,
    poster:      row.poster,
    year:        Number(row.year) || 0,
    rating:      typeof row.rating === 'number' ? row.rating : row.rating ? Number(row.rating) : null,
    review:      row.review ?? '',
    watchedDate: row.watched_date as string,
  }));
}
