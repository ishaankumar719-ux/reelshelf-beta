// Daily Pick — real, personalized recommendation persisted in the existing
// `daily_picks` table (UNIQUE on user_id+pick_date). Single source of truth
// for both Home's preview card and the Daily Reel tab (WEBSITE_DAILY_REEL_AUDIT.md
// §0/§5 — the website reuses one component in both places; this is mobile's
// equivalent: one shared data layer + hook).
//
// TIMEZONE: deliberately uses the DEVICE'S LOCAL calendar date, not UTC —
// a confirmed, accepted divergence from the website (which uses
// `new Date().toISOString()`, always UTC). Both platforms write to the same
// daily_picks row keyed by pick_date, so for several hours around midnight
// (the gap between local midnight and UTC midnight, which varies by the
// user's timezone) mobile and web may show different "today's picks" for the
// same account. This is accepted, not treated as a bug — see the task RETURN.
import { supabase } from './client';
import { resolveImageUrl } from '../resolveImageUrl';
import {
  buildUserContext, generateReasons, pickBest, scoreCandidate,
  type Candidate, type PickMediaType,
} from '../recommendationEngine';

export type { PickMediaType };

export interface DailyPick {
  id:          string;
  pickDate:    string;
  mediaType:   PickMediaType;
  mediaId:     string; // route id: film-<id> | tv-<id> | book-<googleVolumeId>
  title:       string;
  year:        number | undefined;
  posterUrl:   string | null;
  overview:    string;
  genres:      string[];
  creator:     string | null;
  voteAverage: number | null;
  rerollCount: number;
  reasons:     string[];
}

/** Device-local calendar date as YYYY-MM-DD — NOT UTC. `toISOString()` is
 *  always UTC regardless of device locale, so it's deliberately not used here. */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

interface DailyPickRow {
  id: string;
  pick_date: string;
  media_type: PickMediaType;
  media_id: string;
  reroll_count: number;
}

async function resolveCandidateDetail(mediaType: PickMediaType, mediaId: string): Promise<Candidate | null> {
  // Re-resolves an already-persisted pick's display data by its known TMDB
  // id directly (not by re-searching /popular, which can shift day to day
  // and would make a perfectly valid existing pick look "unresolvable").
  if (mediaType === 'film' || mediaType === 'tv') {
    const { fetchTmdbItemById } = await import('../tmdb');
    const tmdbId = mediaId.replace(/^(film|tv)-/, '');
    const found = await fetchTmdbItemById(mediaType === 'film' ? 'movie' : 'tv', tmdbId);
    if (!found) return null;
    return {
      mediaType, mediaId, title: found.title, year: found.year,
      posterUrl: resolveImageUrl(found.posterUrl), overview: found.overview,
      genres: found.genres, creator: null, voteAverage: found.voteAverage,
    };
  }
  // Books: fetch directly by Google Books volume id (cheap, single lookup).
  const volumeId = mediaId.startsWith('book-') ? mediaId.slice(5) : mediaId;
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes/${volumeId}`);
  if (!res.ok) return null;
  const item = await res.json();
  const info = item.volumeInfo;
  if (!info?.title) return null;
  const year = info.publishedDate ? Number(String(info.publishedDate).slice(0, 4)) : undefined;
  return {
    mediaType: 'book', mediaId, title: info.title, year: Number.isNaN(year) ? undefined : year,
    posterUrl: resolveImageUrl(info.imageLinks?.thumbnail ?? null, 'poster'),
    overview: info.description ?? '', genres: Array.isArray(info.categories) ? info.categories : [],
    creator: Array.isArray(info.authors) ? info.authors[0] : null, voteAverage: null,
  };
}

async function toDailyPick(row: DailyPickRow, ctx: Awaited<ReturnType<typeof buildUserContext>>): Promise<DailyPick | null> {
  const detail = await resolveCandidateDetail(row.media_type, row.media_id);
  if (!detail) return null;
  const scored = scoreCandidate(detail, ctx);
  return {
    id: row.id, pickDate: row.pick_date, mediaType: row.media_type, mediaId: row.media_id,
    title: detail.title, year: detail.year, posterUrl: detail.posterUrl, overview: detail.overview,
    genres: detail.genres, creator: detail.creator, voteAverage: detail.voteAverage,
    rerollCount: row.reroll_count, reasons: generateReasons(scored),
  };
}

export async function fetchOrCreateDailyPick(userId: string): Promise<DailyPick> {
  const client = requireClient();
  const today = getLocalDateString();

  const { data: existing, error: existingErr } = await client
    .from('daily_picks').select('id, pick_date, media_type, media_id, reroll_count')
    .eq('user_id', userId).eq('pick_date', today).maybeSingle();
  if (existingErr) throw existingErr;

  if (existing) {
    const ctx = await buildUserContext(userId, { today });
    const pick = await toDailyPick(existing as DailyPickRow, ctx);
    if (pick) return pick;
    // Picked media no longer resolvable (e.g. removed upstream) — fall through
    // and pick a fresh one, overwriting the stale row rather than erroring.
  }

  const ctx = await buildUserContext(userId, { today });
  const best = await pickBest(ctx);
  if (!best) throw new Error('No candidates available for a Daily Pick right now.');

  const { data: inserted, error: insertErr } = await client
    .from('daily_picks')
    .upsert(
      { user_id: userId, pick_date: today, media_type: best.mediaType, media_id: best.mediaId, reroll_count: 0 },
      { onConflict: 'user_id,pick_date' },
    )
    .select('id, pick_date, media_type, media_id, reroll_count')
    .single();
  if (insertErr) throw insertErr;

  return {
    id: inserted.id as string, pickDate: inserted.pick_date as string,
    mediaType: best.mediaType, mediaId: best.mediaId, title: best.title, year: best.year,
    posterUrl: best.posterUrl, overview: best.overview, genres: best.genres,
    creator: best.creator, voteAverage: best.voteAverage,
    rerollCount: 0, reasons: generateReasons(best),
  };
}

export async function rerollDailyPick(userId: string): Promise<DailyPick> {
  const client = requireClient();
  const today = getLocalDateString();

  const { data: existing, error: existingErr } = await client
    .from('daily_picks').select('id, pick_date, media_type, media_id, reroll_count')
    .eq('user_id', userId).eq('pick_date', today).maybeSingle();
  if (existingErr) throw existingErr;
  if (!existing) throw new Error('No pick exists for today.');
  if ((existing.reroll_count as number) >= 1) throw new Error('No more rerolls today.');

  const ctx = await buildUserContext(userId, { today, excludeMediaId: existing.media_id as string });
  const best = await pickBest(ctx);
  if (!best) throw new Error('No candidates available for a reroll right now.');

  const { data: updated, error: updateErr } = await client
    .from('daily_picks')
    .update({ media_type: best.mediaType, media_id: best.mediaId, reroll_count: 1 })
    .eq('id', existing.id as string)
    .select('id, pick_date, media_type, media_id, reroll_count')
    .single();
  if (updateErr) throw updateErr;

  return {
    id: updated.id as string, pickDate: updated.pick_date as string,
    mediaType: best.mediaType, mediaId: best.mediaId, title: best.title, year: best.year,
    posterUrl: best.posterUrl, overview: best.overview, genres: best.genres,
    creator: best.creator, voteAverage: best.voteAverage,
    rerollCount: 1, reasons: generateReasons(best),
  };
}
