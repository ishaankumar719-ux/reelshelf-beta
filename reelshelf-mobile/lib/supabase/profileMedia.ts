// Per-tab data fetchers for the Profile screen's Movies/TV/Books/Reviews tabs.
// Diary/Lists tabs reuse the already-existing fetchDiaryEntries/fetchUserLists
// (both already take an arbitrary userId and already respect RLS correctly
// for viewing another user's profile — no changes needed there).
import { supabase } from './client';

export interface ProfileMediaItem {
  routeId:   string; // mobile route id, e.g. "film-693134"
  title:     string;
  poster:    string | null;
  year:      number;
  mediaType: string;
  /** Only populated for the `watched` list (diary_entries already stores it
   *  on the same row) — used for a small rating badge on watched cards. */
  rating?:   number | null;
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

export interface MediaTypeTabData {
  watched: ProfileMediaItem[];  // from diary_entries
  shelf:   ProfileMediaItem[];  // from saved_items (watchlist / reading_shelf)
}

export async function fetchMediaTypeTab(userId: string, dbMediaType: 'movie' | 'tv' | 'book'): Promise<MediaTypeTabData> {
  const client = requireClient();
  const listType = dbMediaType === 'book' ? 'reading_shelf' : 'watchlist';

  const [diaryRes, savedRes] = await Promise.all([
    client
      .from('diary_entries')
      .select('media_id, media_type, title, poster, year, rating')
      .eq('user_id', userId)
      .eq('media_type', dbMediaType)
      .eq('review_scope', 'show')
      .order('watched_date', { ascending: false }),
    client
      .from('saved_items')
      .select('media_id, media_type, title, poster, year')
      .eq('user_id', userId)
      .eq('media_type', dbMediaType)
      .eq('list_type', listType)
      .order('added_at', { ascending: false }),
  ]);
  if (diaryRes.error) throw diaryRes.error;
  if (savedRes.error) throw savedRes.error;

  const toItem = (row: { media_id: string; media_type: string; title: string; poster: string | null; year: number; rating?: unknown }): ProfileMediaItem => ({
    routeId:   toRouteId(row.media_type, row.media_id),
    title:     row.title,
    poster:    row.poster,
    year:      Number(row.year) || 0,
    mediaType: dbMediaType === 'movie' ? 'film' : dbMediaType,
    rating:    typeof row.rating === 'number' ? row.rating : row.rating ? Number(row.rating) : null,
  });

  return {
    watched: (diaryRes.data ?? []).map(toItem),
    shelf:   (savedRes.data ?? []).map(toItem),
  };
}

export interface ProfileReviewItem extends ProfileMediaItem {
  rating:           number | null;
  review:           string;
  containsSpoilers: boolean;
  watchedDate:      string;
  // Universal Review Composer's stored data — same row, just additional
  // columns surfaced so the Reviews tab can show layer ratings/attachments
  // it already wrote (no new fetch shape, no new table).
  attachmentUrl:    string | null;
  attachmentType:   string | null;
  /** Real column, already written by the Review Composer but never
   *  surfaced anywhere on mobile (WEBSITE_PROFILE_AUDIT.md §Cinema /
   *  WEBSITE_MOBILE_PARITY_CHECKLIST.md #10) — used for a small cinema badge. */
  watchedInCinema:  boolean;
  layerRatings:     { label: string; value: number }[];
}

const REVIEW_LAYER_COLUMNS: { column: string; label: string }[] = [
  { column: 'score_rating',            label: 'Score / Soundtrack' },
  { column: 'cinematography_rating',   label: 'Cinematography' },
  { column: 'writing_rating',          label: 'Writing' },
  { column: 'performances_rating',     label: 'Performances' },
  { column: 'direction_rating',        label: 'Direction' },
  { column: 'rewatchability_rating',   label: 'Rewatchability' },
  { column: 'emotional_impact_rating', label: 'Emotional Impact' },
  { column: 'entertainment_rating',    label: 'Entertainment' },
  { column: 'layer_characters',        label: 'Characters' },
  { column: 'layer_plot',              label: 'Plot' },
  { column: 'layer_pacing',            label: 'Pacing' },
  { column: 'layer_worldbuilding',     label: 'World-building' },
  { column: 'layer_themes',            label: 'Themes' },
  { column: 'layer_rereadability',     label: 'Re-readability' },
];

export async function fetchReviewsTab(userId: string): Promise<ProfileReviewItem[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('diary_entries')
    .select(`media_id, media_type, title, poster, year, rating, review, contains_spoilers, watched_date,
      attachment_url, attachment_type, watched_in_cinema,
      ${REVIEW_LAYER_COLUMNS.map((l) => l.column).join(', ')}`)
    .eq('user_id', userId)
    .eq('review_scope', 'show')
    .not('review', 'is', null)
    .neq('review', '')
    .order('watched_date', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    routeId:          toRouteId(row.media_type, row.media_id),
    title:            row.title,
    poster:           row.poster,
    year:             Number(row.year) || 0,
    mediaType:        row.media_type === 'movie' ? 'film' : row.media_type,
    rating:           typeof row.rating === 'number' ? row.rating : row.rating ? Number(row.rating) : null,
    review:           row.review ?? '',
    containsSpoilers: row.contains_spoilers ?? false,
    watchedDate:      row.watched_date,
    attachmentUrl:    row.attachment_url ?? null,
    attachmentType:   row.attachment_type ?? null,
    watchedInCinema:  row.watched_in_cinema ?? false,
    layerRatings:     REVIEW_LAYER_COLUMNS
      .map((l) => ({ label: l.label, value: row[l.column] }))
      .filter((l): l is { label: string; value: number } => typeof l.value === 'number'),
  }));
}
