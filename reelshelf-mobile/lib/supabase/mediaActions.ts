// Real Supabase-backed reads/writes for Movie Detail's Primary Actions.
// Uses ONLY the existing production tables (saved_items, diary_entries) —
// no new tables, no new RLS policies. AsyncStorage (see lib/mediaStorage.ts)
// is an optimistic local cache layered on top of this; these functions are
// the actual source of truth.
import { supabase } from './client';
import { parseMediaRouteId, type TmdbKind } from '../tmdb';
import type { MediaType } from '@/data/seedHomeContent';

/** Route ids are film-<id>/tv-<id>/book-<slug>; the DB's media_type check
 *  constraint is ('movie'|'tv'|'book'|'short_film') — 'film' has no DB
 *  equivalent, it's 'movie' there. */
export type DbMediaType = 'movie' | 'tv' | 'book';

export function toDbMediaType(mediaType: MediaType): DbMediaType {
  return mediaType === 'film' ? 'movie' : mediaType;
}

/** DB media_id convention: the web app's freshest rows use "tmdb-<id>" for
 *  both movies and TV (older rows show drift — bare numeric ids for some
 *  movies — a pre-existing inconsistency in production data, not something
 *  introduced here). Books have no TMDB id, so the slug portion of the route
 *  id is used as-is. See RETURN's DIARY_ENTRY_UPSERT_STRATEGY note. */
export function toDbMediaId(routeId: string): string {
  const parsed = parseMediaRouteId(routeId);
  if (parsed) return `tmdb-${parsed.tmdbId}`;
  // book-<slug> — strip the mobile-only "book-" prefix.
  const dashIdx = routeId.indexOf('-');
  return dashIdx >= 0 ? routeId.slice(dashIdx + 1) : routeId;
}

export interface MediaMeta {
  id:         string;   // route id, e.g. "film-693134"
  title:      string;
  posterUrl:  string | null;
  mediaType:  MediaType;
  year:       number;
  genres:     string[];
  runtime:    number | null;
  voteAverage: number | null;
  director:   string | null;
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

// ── Shelf (saved_items) ───────────────────────────────────────────────────────
function shelfListType(mediaType: MediaType): 'watchlist' | 'reading_shelf' {
  return mediaType === 'book' ? 'reading_shelf' : 'watchlist';
}

export async function fetchShelfState(userId: string, meta: Pick<MediaMeta, 'id' | 'mediaType'>): Promise<boolean> {
  const client = requireClient();
  const { data, error } = await client
    .from('saved_items')
    .select('id')
    .eq('user_id', userId)
    .eq('list_type', shelfListType(meta.mediaType))
    .eq('media_type', toDbMediaType(meta.mediaType))
    .eq('media_id', toDbMediaId(meta.id))
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function addToShelf(userId: string, meta: MediaMeta): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('saved_items').upsert(
    {
      user_id:    userId,
      list_type:  shelfListType(meta.mediaType),
      media_id:   toDbMediaId(meta.id),
      media_type: toDbMediaType(meta.mediaType),
      title:      meta.title,
      poster:     meta.posterUrl,
      year:       meta.year || 0,
      creator:    meta.director,
      genres:     meta.genres,
      runtime:    meta.runtime,
      vote_average: meta.voteAverage,
      added_at:   new Date().toISOString(),
    },
    { onConflict: 'user_id,list_type,media_type,media_id' },
  );
  if (error) throw error;
}

export async function removeFromShelf(userId: string, meta: Pick<MediaMeta, 'id' | 'mediaType'>): Promise<void> {
  const client = requireClient();
  const { error } = await client
    .from('saved_items')
    .delete()
    .eq('user_id', userId)
    .eq('list_type', shelfListType(meta.mediaType))
    .eq('media_type', toDbMediaType(meta.mediaType))
    .eq('media_id', toDbMediaId(meta.id));
  if (error) throw error;
}

// ── Diary (watched + rating + review — one unified row) ──────────────────────
export interface DiaryEntryState {
  watched: boolean;
  rating:  number;   // 0 = unrated
  review:  string;
}

const DIARY_SCOPE_DEFAULTS = { review_scope: 'show' as const, show_id: '', season_number: 0, episode_number: 0 };

export async function fetchDiaryEntry(userId: string, meta: Pick<MediaMeta, 'id' | 'mediaType'>): Promise<DiaryEntryState> {
  const client = requireClient();
  const { data, error } = await client
    .from('diary_entries')
    .select('rating, review')
    .eq('user_id', userId)
    .eq('media_type', toDbMediaType(meta.mediaType))
    .eq('media_id', toDbMediaId(meta.id))
    .eq('review_scope', DIARY_SCOPE_DEFAULTS.review_scope)
    .eq('season_number', DIARY_SCOPE_DEFAULTS.season_number)
    .eq('episode_number', DIARY_SCOPE_DEFAULTS.episode_number)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { watched: false, rating: 0, review: '' };
  return { watched: true, rating: Number(data.rating) || 0, review: data.review ?? '' };
}

/** Upserts the shared diary_entries row. Existing rating/review are preserved
 *  when not explicitly overridden (pass the current values through). */
async function upsertDiaryRow(
  userId: string,
  meta: MediaMeta,
  fields: { watchedDate: string; rating: number | null; review: string },
): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('diary_entries').upsert(
    {
      user_id:     userId,
      media_id:    toDbMediaId(meta.id),
      media_type:  toDbMediaType(meta.mediaType),
      ...DIARY_SCOPE_DEFAULTS,
      title:       meta.title,
      poster:      meta.posterUrl,
      year:        meta.year || 0,
      creator:     meta.director,
      genres:      meta.genres,
      runtime:     meta.runtime,
      vote_average: meta.voteAverage,
      rating:      fields.rating,
      review:      fields.review,
      watched_date: fields.watchedDate,
    },
    { onConflict: 'user_id,media_type,media_id,review_scope,season_number,episode_number' },
  );
  if (error) throw error;
}

/** Marking "Watched" creates/refreshes the diary row (watched_date = today).
 *  Un-marking DELETES the row — watched_date is NOT NULL with no default in
 *  the real schema (confirmed against production: 0 of 946 existing rows
 *  have a null watched_date), so "clear the date" isn't a representable
 *  state. This mirrors the web app's own upsert/delete pattern exactly
 *  (lib/supabase/persistence.ts's deleteDiaryEntryFromBackend). Because
 *  rating/review live on the SAME row, un-marking watched also removes any
 *  saved rating/review for this title — documented in RETURN. */
export async function setWatched(userId: string, meta: MediaMeta, watched: boolean, current: DiaryEntryState): Promise<void> {
  const client = requireClient();
  if (!watched) {
    const { error } = await client
      .from('diary_entries')
      .delete()
      .eq('user_id', userId)
      .eq('media_type', toDbMediaType(meta.mediaType))
      .eq('media_id', toDbMediaId(meta.id))
      .eq('review_scope', DIARY_SCOPE_DEFAULTS.review_scope)
      .eq('season_number', DIARY_SCOPE_DEFAULTS.season_number)
      .eq('episode_number', DIARY_SCOPE_DEFAULTS.episode_number);
    if (error) throw error;
    return;
  }
  await upsertDiaryRow(userId, meta, {
    watchedDate: new Date().toISOString().slice(0, 10),
    rating: current.rating > 0 ? current.rating : null,
    review: current.review,
  });
}

/** Rating (and Review, below) implicitly log the title as watched if it
 *  wasn't already — there's no diary_entries row shape that represents "has
 *  a rating but was never watched" in this schema. */
export async function saveDiaryRating(userId: string, meta: MediaMeta, rating: number, current: DiaryEntryState): Promise<void> {
  await upsertDiaryRow(userId, meta, {
    watchedDate: new Date().toISOString().slice(0, 10),
    rating,
    review: current.review,
  });
}

export async function saveDiaryReview(userId: string, meta: MediaMeta, review: string, current: DiaryEntryState): Promise<void> {
  await upsertDiaryRow(userId, meta, {
    watchedDate: new Date().toISOString().slice(0, 10),
    rating: current.rating > 0 ? current.rating : null,
    review,
  });
}
