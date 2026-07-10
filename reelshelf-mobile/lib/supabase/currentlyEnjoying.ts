// "Currently Enjoying" — reuses the EXISTING saved_items/diary_entries tables
// exactly as every other Profile query does. No new table, no new column.
//
// HONEST DATA GAP (see AGENTS-provided CONSTRAINTS): this schema has no
// per-title "in progress" signal anywhere — saved_items only marks shelf
// membership, diary_entries only has a watched_date for a COMPLETED entry.
// There is no episode/page-progress column for TV or books. So "Continue
// Watching" / "On Your Shelf" below are an honest proxy — "on your shelf,
// not yet logged as finished" — not real progress tracking. Labeled as such
// in the UI (components/profile/CurrentlyEnjoyingShelf.tsx), not disguised
// as a percentage or status field that doesn't exist in the data.
import { supabase } from './client';

export interface EnjoyingItem {
  routeId:   string;
  title:     string;
  poster:    string | null;
  year:      number;
  mediaType: string; // 'film' | 'tv' | 'book'
  addedAt:   string;
}

export interface CurrentlyEnjoyingData {
  /** TV titles on the watchlist with no completed diary_entries watched_date yet. */
  continueWatchingTv: EnjoyingItem[];
  /** Books on the reading shelf with no completed diary_entries watched_date yet. */
  onYourShelfBooks:   EnjoyingItem[];
  /** Most recently saved_items entries across every media type/list_type — a
   *  simple recency feed, not an in-progress claim. */
  recentlyAdded:      EnjoyingItem[];
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

function toRouteId(dbMediaType: string, dbMediaId: string): string {
  const prefix = dbMediaType === 'movie' ? 'film' : dbMediaType;
  const bareId = dbMediaId.startsWith('tmdb-') ? dbMediaId.slice(5) : dbMediaId;
  return `${prefix}-${bareId}`;
}

interface SavedRow {
  media_id:   string;
  media_type: string;
  list_type:  string;
  title:      string;
  poster:     string | null;
  year:       number;
  added_at:   string;
}

export async function fetchCurrentlyEnjoying(userId: string): Promise<CurrentlyEnjoyingData> {
  const client = requireClient();

  const [savedRes, diaryRes] = await Promise.all([
    client
      .from('saved_items')
      .select('media_id, media_type, list_type, title, poster, year, added_at')
      .eq('user_id', userId)
      .order('added_at', { ascending: false }),
    client
      .from('diary_entries')
      .select('media_id, media_type')
      .eq('user_id', userId)
      .not('watched_date', 'is', null),
  ]);
  if (savedRes.error) throw savedRes.error;
  if (diaryRes.error) throw diaryRes.error;

  const finishedKeys = new Set(
    (diaryRes.data ?? []).map((r) => `${r.media_type}:${r.media_id}`),
  );

  const saved = (savedRes.data ?? []) as SavedRow[];
  const toItem = (row: SavedRow): EnjoyingItem => ({
    routeId:   toRouteId(row.media_type, row.media_id),
    title:     row.title,
    poster:    row.poster,
    year:      Number(row.year) || 0,
    mediaType: row.media_type === 'movie' ? 'film' : row.media_type,
    addedAt:   row.added_at,
  });

  const continueWatchingTv = saved
    .filter((r) => r.media_type === 'tv' && r.list_type === 'watchlist' && !finishedKeys.has(`tv:${r.media_id}`))
    .map(toItem);

  const onYourShelfBooks = saved
    .filter((r) => r.media_type === 'book' && r.list_type === 'reading_shelf' && !finishedKeys.has(`book:${r.media_id}`))
    .map(toItem);

  const recentlyAdded = saved.slice(0, 10).map(toItem);

  return { continueWatchingTv, onYourShelfBooks, recentlyAdded };
}
