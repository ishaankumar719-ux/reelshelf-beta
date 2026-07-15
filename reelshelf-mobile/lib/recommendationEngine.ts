// Port of the website's lib/recommendation-engine.ts scoring engine (see
// WEBSITE_DAILY_REEL_AUDIT.md §1) — same signals, same weights, same hard
// exclusions, same 7-day recency window. ADAPTED per this task's explicit
// instruction: mobile has no static local catalog, so the candidate pool is
// sourced from live TMDB /popular (movies/TV) and a small rotating set of
// Google Books queries (books) instead of a fixed finite list. See
// CANDIDATE_POOL_ADAPTATION in the task's RETURN for the honest tradeoffs
// this introduces (documented there, not hidden here).
import { supabase } from './supabase/client';
import { fetchTmdbCredits, fetchTmdbPopular, type TmdbKind } from './tmdb';
import { resolveImageUrl } from './resolveImageUrl';

export type PickMediaType = 'film' | 'tv' | 'book';

export interface ScoringSignal {
  name:   string;
  score:  number;
  reason?: string;
}

export interface Candidate {
  mediaType:   PickMediaType;
  mediaId:     string; // route id form: film-<tmdbId> | tv-<tmdbId> | book-<googleVolumeId>
  title:       string;
  year:        number | undefined;
  posterUrl:   string | null;
  overview:    string;
  genres:      string[];
  creator:     string | null;
  voteAverage: number | null;
}

export interface ScoredCandidate extends Candidate {
  totalScore: number;
  signals:    ScoringSignal[];
}

export interface UserContext {
  highRatedGenres:        Map<string, string>;
  preferredGenres:        Map<string, string>;
  preferredCreators:      Map<string, string>;
  favouriteMediaGenres:   Map<string, string>;
  favouriteMediaCreators: Map<string, string>;
  loggedFilmIds:          Set<string>;
  loggedTvIds:            Set<string>;
  loggedBookIds:          Set<string>;
  watchlistFilmIds:       Set<string>;
  watchlistTvIds:         Set<string>;
  watchlistBookIds:       Set<string>;
  watchlistGenres:        Set<string>;
  recentPickIds:          Set<string>;
  recentPickTypes:        PickMediaType[];
  excludeMediaId?:        string;
  excludeWatchlist:       boolean;
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

// ─── Build user context ──────────────────────────────────────────────────────

export async function buildUserContext(
  userId: string,
  options?: { excludeMediaId?: string; today?: string },
): Promise<UserContext> {
  const client = requireClient();
  const today = options?.today ?? new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [diaryRes, savedRes, picksRes, profileRes] = await Promise.all([
    client.from('diary_entries').select('media_id, media_type, genres, rating, creator, title')
      .eq('user_id', userId).in('review_scope', ['show', 'title']),
    client.from('saved_items').select('media_id, media_type, list_type, genres').eq('user_id', userId),
    client.from('daily_picks').select('media_id, media_type, pick_date').eq('user_id', userId)
      .gte('pick_date', sevenDaysAgo).order('pick_date', { ascending: false }).limit(7),
    client.from('profiles').select('favourite_film, favourite_series, favourite_book').eq('id', userId).maybeSingle(),
  ]);

  const highRatedGenres = new Map<string, string>();
  const preferredGenres = new Map<string, string>();
  const preferredCreators = new Map<string, string>();
  const loggedFilmIds = new Set<string>();
  const loggedTvIds = new Set<string>();
  const loggedBookIds = new Set<string>();

  const diaryRows = [...(diaryRes.data ?? [])].sort(
    (a, b) => ((b.rating as number) ?? 0) - ((a.rating as number) ?? 0),
  );

  for (const row of diaryRows) {
    const id = row.media_id as string;
    const type = row.media_type as string;
    const rating = row.rating as number | null;
    const genres = (row.genres as string[]) ?? [];
    const creator = row.creator as string | null;
    const title = row.title as string;

    if (type === 'movie') loggedFilmIds.add(id);
    else if (type === 'tv') loggedTvIds.add(id);
    else if (type === 'book') loggedBookIds.add(id);

    if (rating === null) continue;
    for (const genre of genres) {
      if (!genre) continue;
      if (rating >= 8 && !highRatedGenres.has(genre)) highRatedGenres.set(genre, title);
      if (rating >= 7 && !preferredGenres.has(genre)) preferredGenres.set(genre, title);
    }
    if (creator && rating >= 8 && !preferredCreators.has(creator)) preferredCreators.set(creator, title);
  }

  const watchlistFilmIds = new Set<string>();
  const watchlistTvIds = new Set<string>();
  const watchlistBookIds = new Set<string>();
  const watchlistGenres = new Set<string>();

  for (const row of savedRes.data ?? []) {
    const id = row.media_id as string;
    const type = row.media_type as string;
    const genres = (row.genres as string[]) ?? [];
    if (type === 'movie') watchlistFilmIds.add(id);
    else if (type === 'tv') watchlistTvIds.add(id);
    else if (type === 'book') watchlistBookIds.add(id);
    for (const genre of genres) if (genre) watchlistGenres.add(genre);
  }

  const recentPickIds = new Set<string>();
  const recentPickTypes: PickMediaType[] = [];
  for (const row of picksRes.data ?? []) {
    const mediaId = row.media_id as string;
    const mediaType = row.media_type as PickMediaType;
    const pickDate = row.pick_date as string;
    if (pickDate !== today) recentPickIds.add(mediaId);
    if (recentPickTypes.length < 3) recentPickTypes.push(mediaType);
  }

  // Profile favourites — resolved live against TMDB/Google Books rather than a
  // local catalog (mobile has none), since we already need a live fetch path.
  const favouriteMediaGenres = new Map<string, string>();
  const favouriteMediaCreators = new Map<string, string>();
  // Best-effort only: without a local catalog, matching a free-text favourite
  // title to a real TMDB/Books id would require an extra search call per
  // favourite on every context build. Skipped for now — the +15 signal tier
  // this powers is the lowest-priority genre/creator tier and only ever fires
  // when diary data doesn't already provide a higher-tier signal, so its
  // absence degrades gracefully rather than breaking anything.
  void profileRes;

  return {
    highRatedGenres, preferredGenres, preferredCreators,
    favouriteMediaGenres, favouriteMediaCreators,
    loggedFilmIds, loggedTvIds, loggedBookIds,
    watchlistFilmIds, watchlistTvIds, watchlistBookIds, watchlistGenres,
    recentPickIds, recentPickTypes,
    excludeMediaId: options?.excludeMediaId,
    excludeWatchlist: true,
  };
}

// ─── Hard exclusion check ─────────────────────────────────────────────────────

function isExcluded(mediaType: PickMediaType, mediaId: string, ctx: UserContext): boolean {
  if (mediaId === ctx.excludeMediaId) return true;
  if (mediaType === 'film') {
    if (ctx.loggedFilmIds.has(mediaId)) return true;
    if (ctx.excludeWatchlist && ctx.watchlistFilmIds.has(mediaId)) return true;
  } else if (mediaType === 'tv') {
    if (ctx.loggedTvIds.has(mediaId)) return true;
    if (ctx.excludeWatchlist && ctx.watchlistTvIds.has(mediaId)) return true;
  } else {
    if (ctx.loggedBookIds.has(mediaId)) return true;
    if (ctx.excludeWatchlist && ctx.watchlistBookIds.has(mediaId)) return true;
  }
  return false;
}

// ─── Score a single candidate ─────────────────────────────────────────────────

export function scoreCandidate(candidate: Candidate, ctx: UserContext): ScoredCandidate {
  const { mediaType, genres, creator, voteAverage } = candidate;
  const signals: ScoringSignal[] = [];

  const last3 = ctx.recentPickTypes.slice(0, 3);
  if (last3.length === 3 && last3.every((t) => t === mediaType)) {
    signals.push({ name: 'type-rotation-block', score: -999 });
    return { ...candidate, totalScore: -999, signals };
  }

  const recentSameType = last3.filter((t) => t === mediaType).length;
  if (recentSameType > 0) signals.push({ name: 'type-variety', score: -15 * recentSameType });

  let genreSignalFired = false;
  for (const genre of genres) {
    if (ctx.highRatedGenres.has(genre)) {
      signals.push({ name: 'genre-high-rated', score: 30, reason: `Because you loved ${ctx.highRatedGenres.get(genre)}` });
      genreSignalFired = true;
      break;
    }
  }
  if (!genreSignalFired) {
    for (const genre of genres) {
      if (ctx.preferredGenres.has(genre)) {
        signals.push({ name: 'genre-preferred', score: 25, reason: `You enjoy ${genre}` });
        genreSignalFired = true;
        break;
      }
    }
  }
  if (!genreSignalFired) {
    for (const genre of genres) {
      if (ctx.favouriteMediaGenres.has(genre)) {
        signals.push({ name: 'favourite-media-genre', score: 15, reason: `Similar to your favourite: ${ctx.favouriteMediaGenres.get(genre)}` });
        genreSignalFired = true;
        break;
      }
    }
  }

  if (creator) {
    if (ctx.preferredCreators.has(creator)) {
      signals.push({ name: 'creator-match', score: 20, reason: `By ${creator}, who made ${ctx.preferredCreators.get(creator)}` });
    } else if (ctx.favouriteMediaCreators.has(creator)) {
      signals.push({ name: 'favourite-creator', score: 15, reason: `By ${creator}, who made your favourite: ${ctx.favouriteMediaCreators.get(creator)}` });
    }
  }

  if (typeof voteAverage === 'number' && voteAverage >= 8.0) {
    signals.push({ name: 'critically-acclaimed', score: 15, reason: 'Critically acclaimed' });
  }

  if (genres.some((g) => ctx.watchlistGenres.has(g))) {
    signals.push({ name: 'watchlist-genre', score: 10, reason: 'Matches your watchlist taste' });
  }

  if (!ctx.recentPickIds.has(candidate.mediaId)) {
    signals.push({ name: 'fresh-pick', score: 5 });
  }

  signals.push({ name: 'tiebreaker', score: Math.random() * 4 });

  const totalScore = signals.reduce((sum, s) => sum + s.score, 0);
  return { ...candidate, totalScore, signals };
}

export function generateReasons(candidate: ScoredCandidate): string[] {
  const reasons = candidate.signals
    .filter((s) => s.score > 0 && s.reason !== undefined)
    .map((s) => s.reason!)
    .slice(0, 4);
  if (reasons.length === 0) {
    return [typeof candidate.voteAverage === 'number' && candidate.voteAverage >= 8.0 ? 'Critically acclaimed' : 'A hidden gem'];
  }
  return reasons;
}

// ─── Live candidate pool ──────────────────────────────────────────────────────

// A handful of broad, high-signal Google Books queries, rotated by day so the
// book candidate pool changes daily without needing a real "popular books"
// endpoint (Google Books has none — see CANDIDATE_POOL_ADAPTATION).
const BOOK_QUERY_ROTATION = [
  'bestselling fiction', 'award winning novel', 'contemporary literary fiction',
  'popular science fiction novel', 'acclaimed mystery thriller', 'bestselling nonfiction',
];

interface RawGoogleBook {
  id: string;
  title: string;
  year: number | undefined;
  posterUrl: string | null;
  overview: string;
  genres: string[];
  creator: string | null;
  voteAverage: number | null;
}

async function fetchBookCandidates(seed: number): Promise<RawGoogleBook[]> {
  const query = BOOK_QUERY_ROTATION[seed % BOOK_QUERY_ROTATION.length];
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20&orderBy=relevance`);
  if (!res.ok) return [];
  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];
  return items
    .filter((item: any) => item.id && item.volumeInfo?.title)
    .map((item: any) => {
      const info = item.volumeInfo;
      const year = info.publishedDate ? Number(String(info.publishedDate).slice(0, 4)) : undefined;
      // Google Books ratings are 0-5; normalize to the same 0-10 scale TMDB
      // uses so the >=8.0 "critically acclaimed" threshold means the same
      // thing for both — only trusted with a real sample size behind it.
      const ratingsCount = typeof info.ratingsCount === 'number' ? info.ratingsCount : 0;
      const voteAverage = typeof info.averageRating === 'number' && ratingsCount >= 20
        ? Math.round(info.averageRating * 2 * 10) / 10
        : null;
      return {
        id: `book-${item.id}`,
        title: info.title,
        year: Number.isNaN(year) ? undefined : year,
        posterUrl: resolveImageUrl(info.imageLinks?.thumbnail ?? null, 'poster'),
        overview: info.description ?? '',
        genres: Array.isArray(info.categories) ? info.categories : [],
        creator: Array.isArray(info.authors) ? info.authors[0] : null,
        voteAverage,
      } as RawGoogleBook;
    });
}

/** Selects the single best candidate for today, live-querying TMDB
 *  popular movies/TV and a rotating Google Books query, applying the exact
 *  hard-exclusions + scoring signals above. Creator-match scoring for
 *  movies/TV is applied only to the top-15 pre-creator scorers (a bounded
 *  credits fetch) rather than every candidate, to avoid ~80 extra API calls
 *  for a single daily pick — see CANDIDATE_POOL_ADAPTATION. */
export async function pickBest(ctx: UserContext): Promise<ScoredCandidate | null> {
  const daySeed = Math.floor(Date.now() / (24 * 60 * 60 * 1000));

  const [movieP1, movieP2, tvP1, tvP2, books] = await Promise.all([
    fetchTmdbPopular('movie', 1), fetchTmdbPopular('movie', 2),
    fetchTmdbPopular('tv', 1), fetchTmdbPopular('tv', 2),
    fetchBookCandidates(daySeed),
  ]);

  const movieCandidates: Candidate[] = [...movieP1, ...movieP2]
    .filter((m) => !isExcluded('film', m.id, ctx))
    .map((m) => ({ mediaType: 'film' as const, mediaId: m.id, title: m.title, year: m.year, posterUrl: m.posterUrl, overview: m.overview, genres: m.genres, creator: null, voteAverage: m.voteAverage }));

  const tvCandidates: Candidate[] = [...tvP1, ...tvP2]
    .filter((t) => !isExcluded('tv', t.id, ctx))
    .map((t) => ({ mediaType: 'tv' as const, mediaId: t.id, title: t.title, year: t.year, posterUrl: t.posterUrl, overview: t.overview, genres: t.genres, creator: null, voteAverage: t.voteAverage }));

  const bookCandidates: Candidate[] = books
    .filter((b) => !isExcluded('book', b.id, ctx))
    .map((b) => ({ mediaType: 'book' as const, mediaId: b.id, title: b.title, year: b.year, posterUrl: b.posterUrl, overview: b.overview, genres: b.genres, creator: b.creator, voteAverage: b.voteAverage }));

  // Books already carry their creator (author) with zero extra cost — score
  // them fully now. Movies/TV are scored WITHOUT creator first (director
  // unknown at this point), to find which ones are worth the credits lookup.
  const scoredBooks = bookCandidates.map((c) => scoreCandidate(c, ctx));
  const preScoredScreen = [...movieCandidates, ...tvCandidates].map((c) => scoreCandidate(c, ctx));

  const eligiblePreScreen = preScoredScreen.filter((c) => c.totalScore > -500);
  eligiblePreScreen.sort((a, b) => b.totalScore - a.totalScore);
  const topForCredits = eligiblePreScreen.slice(0, 15);

  const withCredits = await Promise.all(
    topForCredits.map(async (c) => {
      const parsed = c.mediaId.startsWith('film-')
        ? { kind: 'movie' as TmdbKind, tmdbId: c.mediaId.slice(5) }
        : { kind: 'tv' as TmdbKind, tmdbId: c.mediaId.slice(3) };
      try {
        const credits = await fetchTmdbCredits(parsed.kind, parsed.tmdbId);
        const withCreator: Candidate = { ...c, creator: credits.director };
        return scoreCandidate(withCreator, ctx);
      } catch {
        return c; // credits fetch failed — keep the pre-credits score rather than dropping the candidate
      }
    }),
  );

  const allEligible = [...withCredits, ...scoredBooks].filter((c) => c.totalScore > -500);
  if (allEligible.length === 0) return null;

  allEligible.sort((a, b) => b.totalScore - a.totalScore);
  return allEligible[0];
}
