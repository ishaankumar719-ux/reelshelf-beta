import { supabase } from './client';
import type { DbMediaType } from './mediaActions';
import type { MediaType } from '@/data/seedHomeContent';

export type DiaryReviewScope = 'title' | 'show' | 'season' | 'episode';

export interface DiaryListEntry {
  /** Mobile route id, e.g. "film-693134" — reconstructed from the DB's media_type/media_id for navigation back into Movie Detail. */
  routeId:          string;
  mediaType:        MediaType;
  title:            string;
  poster:           string | null;
  year:             number;
  rating:           number | null;
  review:           string;
  watchedDate:      string;
  containsSpoilers: boolean;
  favourite:        boolean;
  watchedInCinema:  boolean;
  /** 'show'/'title' = the whole film/series/book; 'season'/'episode' = a
   *  specific TV season or episode — see reviewScope-dependent display in
   *  app/(tabs)/diary.tsx (e.g. "S2E4"), matching the real website's own
   *  per-episode/per-season logging (WEBSITE_DIARY_CALENDAR_TV_BOOK_AUDIT.md). */
  reviewScope:      DiaryReviewScope;
  seasonNumber:     number | null;
  episodeNumber:    number | null;
  // Carried through so re-saving from the Diary edit entry point doesn't
  // blank out metadata columns that were already set (e.g. from a live TMDB
  // fetch on Movie Detail).
  genres:           string[];
  runtime:          number | null;
  voteAverage:      number | null;
  director:         string | null;
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

function toMobileMediaType(dbMediaType: DbMediaType): MediaType {
  return dbMediaType === 'movie' ? 'film' : dbMediaType;
}

/** Every one of the signed-in user's own diary entries, any scope — title/
 *  show-level AND season/episode-level TV logs alike. Previously filtered to
 *  `review_scope = 'show'` only, which silently excluded episode-scoped rows
 *  entirely (a real bug: those entries existed and were saveable via the
 *  composer's season/episode params, just never shown back). Removed — see
 *  WEBSITE_DIARY_CALENDAR_TV_BOOK_AUDIT.md §2 for the real website's own
 *  equivalent per-episode logging this now matches in spirit (all scopes
 *  visible), without needing the website's separate season/show UI. */
export async function fetchDiaryEntries(userId: string): Promise<DiaryListEntry[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('diary_entries')
    .select('media_id, media_type, title, poster, year, rating, review, watched_date, contains_spoilers, favourite, watched_in_cinema, review_scope, season_number, episode_number, genres, runtime, vote_average, creator')
    .eq('user_id', userId)
    .order('watched_date', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    routeId:          toRouteId(row.media_type as DbMediaType, row.media_id as string),
    mediaType:        toMobileMediaType(row.media_type as DbMediaType),
    title:            row.title,
    poster:           row.poster,
    year:             Number(row.year) || 0,
    rating:           typeof row.rating === 'number' ? row.rating : row.rating ? Number(row.rating) : null,
    review:           row.review ?? '',
    watchedDate:      row.watched_date as string,
    containsSpoilers: row.contains_spoilers ?? false,
    favourite:        row.favourite ?? false,
    watchedInCinema:  row.watched_in_cinema ?? false,
    reviewScope:      (row.review_scope as DiaryReviewScope) ?? 'show',
    seasonNumber:     typeof row.season_number === 'number' ? row.season_number : null,
    episodeNumber:    typeof row.episode_number === 'number' ? row.episode_number : null,
    genres:           row.genres ?? [],
    runtime:          typeof row.runtime === 'number' ? row.runtime : null,
    voteAverage:      typeof row.vote_average === 'number' ? row.vote_average : row.vote_average ? Number(row.vote_average) : null,
    director:         row.creator ?? null,
  }));
}
