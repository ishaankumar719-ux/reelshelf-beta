// Live TMDB client — Movie Detail and (as of the Universal Search task)
// Search/Person Detail screens. Uses EXPO_PUBLIC_TMDB_API_KEY client-side,
// same key already committed for the dev-only seed scripts
// (scripts/generate-seed-data.ts, scripts/generate-media-details.ts) —
// bundled into the client, visible to anyone inspecting the app. Standard
// for TMDB's free-tier client key model.
//
// Route ids throughout the app are `film-<tmdbId>`, `tv-<tmdbId>`, or
// `book-<slug>`. Books have no TMDB equivalent — parseMediaRouteId returns
// null for them, and callers must fall back to local seed data.

const TMDB_KEY  = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

export const TMDB_IMG_BACKDROP = 'https://image.tmdb.org/t/p/w780';
export const TMDB_IMG_POSTER   = 'https://image.tmdb.org/t/p/w342';
export const TMDB_IMG_PROFILE  = 'https://image.tmdb.org/t/p/w185';
export const TMDB_IMG_LOGO     = 'https://image.tmdb.org/t/p/w92';

/** Hardcoded per CONSTRAINTS — no user-region system exists yet. */
export const WATCH_PROVIDERS_REGION = 'US';

export type TmdbKind = 'movie' | 'tv';

export interface ParsedMediaId {
  kind:    TmdbKind;
  tmdbId:  string;
}

/** Splits a route id like "film-693134" into its TMDB kind + numeric id. Returns null for books (not on TMDB). */
export function parseMediaRouteId(routeId: string): ParsedMediaId | null {
  const dashIdx = routeId.indexOf('-');
  if (dashIdx < 0) return null;
  const prefix = routeId.slice(0, dashIdx);
  const rest   = routeId.slice(dashIdx + 1);
  if (prefix === 'film') return { kind: 'movie', tmdbId: rest };
  if (prefix === 'tv')   return { kind: 'tv',    tmdbId: rest };
  return null;
}

async function tmdbGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  if (!TMDB_KEY) {
    throw new Error('EXPO_PUBLIC_TMDB_API_KEY is not set');
  }
  const query = new URLSearchParams({ api_key: TMDB_KEY, ...params }).toString();
  const res = await fetch(`${TMDB_BASE}${path}?${query}`);
  if (!res.ok) {
    throw new Error(`TMDB ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Details ───────────────────────────────────────────────────────────────────
export interface TmdbDetails {
  year:           number | undefined;
  backdropUrl:    string | null;
  synopsis:       string;
  runtimeMinutes: number | null;
  genres:         string[];
  /** Raw TMDB genre ids (not names) — needed for the collection-membership
   *  heuristic in lib/discoverCollections.ts, which matches by id exactly
   *  like the website's getFilmCollections()/getTVCollections(). */
  genreIds:       number[];
  /** Raw TMDB production_company ids — movie-only field, needed for the
   *  "best-of-a24" collection check (with_companies=41077). */
  companyIds:     number[];
  rating:         number | null;
  /** TV-only — sourced from created_by, mirrors MediaDetailRecord.creator. */
  creator:        string | null;
  /** TV-only — real seasons list (season 0/"Specials" excluded), powers the
   *  episode-level logging Season Browser. Empty for movies/books. */
  seasons:        { seasonNumber: number; name: string; episodeCount: number }[];
}

export async function fetchTmdbDetails(kind: TmdbKind, tmdbId: string): Promise<TmdbDetails> {
  const raw = await tmdbGet<any>(`/${kind}/${tmdbId}`);
  const runtimeMinutes = kind === 'movie'
    ? (raw.runtime ?? null)
    : (Array.isArray(raw.episode_run_time) && raw.episode_run_time.length > 0 ? raw.episode_run_time[0] : null);
  const creator = kind === 'tv' && Array.isArray(raw.created_by) && raw.created_by.length > 0
    ? raw.created_by.map((c: any) => c.name).join(', ')
    : null;
  const dateStr = kind === 'movie' ? raw.release_date : raw.first_air_date;
  const year = dateStr ? Number(String(dateStr).slice(0, 4)) : undefined;
  // Season 0 ("Specials") excluded — matches the real website's SeasonBrowser
  // (`realSeasons = basicSeasons.filter(s => s.seasonNumber >= 1)`).
  const seasons = kind === 'tv' && Array.isArray(raw.seasons)
    ? raw.seasons
        .filter((s: any) => typeof s.season_number === 'number' && s.season_number >= 1)
        .map((s: any) => ({ seasonNumber: s.season_number, name: s.name, episodeCount: s.episode_count ?? 0 }))
    : [];

  return {
    year,
    backdropUrl:    raw.backdrop_path ? `${TMDB_IMG_BACKDROP}${raw.backdrop_path}` : null,
    synopsis:       raw.overview ?? '',
    runtimeMinutes,
    genres:         Array.isArray(raw.genres) ? raw.genres.map((g: any) => g.name) : [],
    genreIds:       Array.isArray(raw.genres) ? raw.genres.map((g: any) => g.id).filter((id: any) => typeof id === 'number') : [],
    companyIds:     Array.isArray(raw.production_companies) ? raw.production_companies.map((c: any) => c.id).filter((id: any) => typeof id === 'number') : [],
    rating:         typeof raw.vote_average === 'number' && raw.vote_average > 0
      ? Math.round(raw.vote_average * 10) / 10
      : null,
    creator,
    seasons,
  };
}

// ── TV Season / Episode browsing (episode-level diary logging) ──────────────
export interface TmdbSeasonSummary {
  seasonNumber: number;
  name:         string;
  episodeCount: number;
}

export interface TmdbEpisodeSummary {
  episodeNumber: number;
  name:          string;
  airDate:       string | null;
}

/** Real TMDB /tv/{id}/season/{n} episode list — episode number, name, air
 *  date only (kept intentionally minimal: no synopses/stills/runtime — this
 *  is scoped to enabling real logging, not a full season-browsing redesign). */
export async function fetchTmdbSeasonEpisodes(tvId: string, seasonNumber: number): Promise<TmdbEpisodeSummary[]> {
  const raw = await tmdbGet<any>(`/tv/${tvId}/season/${seasonNumber}`);
  const episodes = Array.isArray(raw.episodes) ? raw.episodes : [];
  return episodes.map((e: any) => ({
    episodeNumber: e.episode_number,
    name:          e.name || `Episode ${e.episode_number}`,
    airDate:       e.air_date ?? null,
  }));
}

// ── Images (fallback backdrop only — details already returns the primary one) ─
export async function fetchTmdbFallbackBackdrop(kind: TmdbKind, tmdbId: string): Promise<string | null> {
  const raw = await tmdbGet<any>(`/${kind}/${tmdbId}/images`);
  const first = Array.isArray(raw.backdrops) && raw.backdrops.length > 0 ? raw.backdrops[0] : null;
  return first?.file_path ? `${TMDB_IMG_BACKDROP}${first.file_path}` : null;
}

// ── Credits ───────────────────────────────────────────────────────────────────
export interface TmdbCastMember {
  personId:  number | null;
  name:      string;
  character: string;
  photoUrl:  string | null;
}

export interface TmdbCredits {
  /** Top CAST_CAP entries — what the on-screen carousel renders. */
  cast:       TmdbCastMember[];
  /** TMDB's complete, uncapped cast list — powers "View Full Cast" (see
   *  FullCastModal.tsx). Same single /credits call as `cast`, just unsliced,
   *  so extending to a full-cast view costs no extra network request. */
  fullCast:   TmdbCastMember[];
  director:   string | null;
  /** TMDB person id for `director` — needed for the "More from this Director" discover query. Movie-only (TV series don't carry a series-level director credit). */
  directorId: number | null;
  writer:     string | null;
  composer:   string | null;
  /** job === 'Director of Photography' — TMDB's standard single-credit job title for cinematographer. */
  cinematographer: string | null;
  /** All crew entries with job exactly 'Producer' (not Executive/Co/Associate
   *  Producer — those are frequently a long tail and would read as noise next
   *  to the single-name director/writer/composer/cinematographer lines). */
  producers:  string[];
}

const CAST_CAP = 12;

export async function fetchTmdbCredits(kind: TmdbKind, tmdbId: string): Promise<TmdbCredits> {
  const raw = await tmdbGet<any>(`/${kind}/${tmdbId}/credits`);
  const castRaw = Array.isArray(raw.cast) ? raw.cast : [];
  const crew    = Array.isArray(raw.crew) ? raw.crew : [];

  const mapCast = (c: any): TmdbCastMember => ({
    personId:  typeof c.id === 'number' ? c.id : null,
    name:      c.name,
    character: c.character ?? '',
    photoUrl:  c.profile_path ? `${TMDB_IMG_PROFILE}${c.profile_path}` : null,
  });

  const directorEntry = crew.find((c: any) => c.job === 'Director') ?? null;
  const findJob = (job: string) => crew.find((c: any) => c.job === job)?.name ?? null;
  const writer    = findJob('Screenplay') ?? findJob('Writer');
  const composer  = findJob('Original Music Composer');
  const cinematographer = findJob('Director of Photography');
  const producers = crew.filter((c: any) => c.job === 'Producer').map((c: any) => c.name as string);

  return {
    cast:       castRaw.slice(0, CAST_CAP).map(mapCast),
    fullCast:   castRaw.map(mapCast),
    director:   directorEntry?.name ?? null,
    directorId: directorEntry?.id ?? null,
    writer,
    composer,
    cinematographer,
    producers,
  };
}

// ── More from this Director ──────────────────────────────────────────────────
// TMDB's /discover/movie supports with_crew filtering; /discover/tv does not,
// so this row is movie-only (TV's `directorId` is always null already, since
// series don't carry a series-level director credit — see fetchTmdbCredits).
export async function fetchTmdbMoreFromDirector(
  directorId: number,
  excludeTmdbId: string,
): Promise<TmdbRecommendation[]> {
  const raw = await tmdbGet<any>('/discover/movie', {
    with_crew:  String(directorId),
    sort_by:    'popularity.desc',
  });
  const results = Array.isArray(raw.results) ? raw.results : [];
  return results
    .filter((r: any) => String(r.id) !== excludeTmdbId)
    .map((r: any) => ({
      id:        `film-${r.id}`,
      title:     r.title,
      year:      r.release_date ? Number(String(r.release_date).slice(0, 4)) : undefined,
      posterUrl: r.poster_path ? `${TMDB_IMG_POSTER}${r.poster_path}` : null,
      mediaType: 'film' as const,
    }));
}

// ── Genre id → name maps (TMDB's stable, well-known genre lists) ────────────
// Needed for Daily Pick's live candidate scoring: /movie/popular and /tv/popular
// return `genre_ids` (numbers), not names, so genre-taste matching against
// diary_entries.genres (real names) needs this translation.
export const TMDB_MOVIE_GENRE_NAMES: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance',
  878: 'Science Fiction', 10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
};

export const TMDB_TV_GENRE_NAMES: Record<number, string> = {
  10759: 'Action & Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 10762: 'Kids', 9648: 'Mystery',
  10763: 'News', 10764: 'Reality', 10765: 'Sci-Fi & Fantasy', 10766: 'Soap',
  10767: 'Talk', 10768: 'War & Politics', 37: 'Western',
};

// ── Popular (Daily Pick's live candidate pool) ───────────────────────────────
export interface TmdbPopularItem {
  id:          string; // route id, e.g. "film-693134"
  tmdbId:      string;
  title:       string;
  year:        number | undefined;
  posterUrl:   string | null;
  overview:    string;
  mediaType:   'film' | 'tv';
  genres:      string[];
  voteAverage: number | null;
}

export async function fetchTmdbPopular(kind: TmdbKind, page: number): Promise<TmdbPopularItem[]> {
  const raw = await tmdbGet<any>(`/${kind === 'movie' ? 'movie' : 'tv'}/popular`, { page: String(page) });
  const results = Array.isArray(raw.results) ? raw.results : [];
  const genreNames = kind === 'movie' ? TMDB_MOVIE_GENRE_NAMES : TMDB_TV_GENRE_NAMES;
  return results.map((r: any) => {
    const title = kind === 'movie' ? r.title : r.name;
    const dateStr = kind === 'movie' ? r.release_date : r.first_air_date;
    const genreIds: number[] = Array.isArray(r.genre_ids) ? r.genre_ids : [];
    return {
      id:          `${kind === 'movie' ? 'film' : 'tv'}-${r.id}`,
      tmdbId:      String(r.id),
      title,
      year:        dateStr ? Number(String(dateStr).slice(0, 4)) : undefined,
      posterUrl:   r.poster_path ? `${TMDB_IMG_POSTER}${r.poster_path}` : null,
      overview:    r.overview ?? '',
      mediaType:   kind === 'movie' ? 'film' : 'tv',
      genres:      genreIds.map((id) => genreNames[id]).filter(Boolean) as string[],
      voteAverage: typeof r.vote_average === 'number' && r.vote_average > 0 ? Math.round(r.vote_average * 10) / 10 : null,
    } as TmdbPopularItem;
  });
}

/** Fetches a single movie/TV item directly by its known TMDB id — used to
 *  re-resolve an already-picked Daily Pick's display data without having to
 *  re-search the (potentially-shifted) /popular list for it. */
export async function fetchTmdbItemById(kind: TmdbKind, tmdbId: string): Promise<TmdbPopularItem | null> {
  try {
    const r = await tmdbGet<any>(`/${kind}/${tmdbId}`);
    const genreNames: string[] = Array.isArray(r.genres) ? r.genres.map((g: any) => g.name).filter(Boolean) : [];
    const dateStr = kind === 'movie' ? r.release_date : r.first_air_date;
    return {
      id:          `${kind === 'movie' ? 'film' : 'tv'}-${r.id}`,
      tmdbId:      String(r.id),
      title:       kind === 'movie' ? r.title : r.name,
      year:        dateStr ? Number(String(dateStr).slice(0, 4)) : undefined,
      posterUrl:   r.poster_path ? `${TMDB_IMG_POSTER}${r.poster_path}` : null,
      overview:    r.overview ?? '',
      mediaType:   kind === 'movie' ? 'film' : 'tv',
      genres:      genreNames,
      voteAverage: typeof r.vote_average === 'number' && r.vote_average > 0 ? Math.round(r.vote_average * 10) / 10 : null,
    };
  } catch {
    return null;
  }
}

// ── Discover by genre (Genre Detail screen) ──────────────────────────────────
// Exact same query shape as the website's app/discover/genre/[genre]/page.tsx
// `tmdbGenre()`: with_genres + popularity sort + vote_count floor + no adult.
export interface GenreDiscoverItem {
  id:        string; // route id, e.g. "film-693134"
  title:     string;
  year:      number | undefined;
  posterUrl: string | null;
  mediaType: 'film' | 'tv';
}

export async function fetchTmdbDiscoverByGenre(kind: TmdbKind, genreId: number): Promise<GenreDiscoverItem[]> {
  const raw = await tmdbGet<any>(`/discover/${kind}`, {
    with_genres:       String(genreId),
    sort_by:           'popularity.desc',
    'vote_count.gte':  '50',
    include_adult:     'false',
  });
  const results = Array.isArray(raw.results) ? raw.results : [];
  return results.map((r: any) => {
    const title = kind === 'movie' ? r.title : r.name;
    const dateStr = kind === 'movie' ? r.release_date : r.first_air_date;
    return {
      id:        `${kind === 'movie' ? 'film' : 'tv'}-${r.id}`,
      title,
      year:      dateStr ? Number(String(dateStr).slice(0, 4)) : undefined,
      posterUrl: r.poster_path ? `${TMDB_IMG_POSTER}${r.poster_path}` : null,
      mediaType: kind === 'movie' ? 'film' : 'tv',
    } as GenreDiscoverItem;
  });
}

// ── Collections (real TMDB-backed discover queries) ──────────────────────────
// Exact port of the website's fetchTmdb()/CollectionPage mapping
// (app/discover/collection/[slug]/page.tsx) — takes a CollectionDef's full
// tmdbPath (e.g. "/discover/movie?with_companies=41077&vote_average.gte=7.0
// &...") verbatim and appends api_key, rather than going through tmdbGet's
// narrower params-object shape (some collection queries use dotted keys like
// "vote_average.gte" which read cleanly as a raw query string but awkwardly
// as a typed params object).
export interface CollectionDiscoverItem {
  id:        string; // route id, e.g. "film-693134"
  title:     string;
  year:      number | undefined;
  posterUrl: string | null;
  mediaType: 'film' | 'tv';
}

export async function fetchTmdbCollectionByPath(tmdbPath: string, tmdbMediaType: 'movie' | 'tv'): Promise<CollectionDiscoverItem[]> {
  if (!TMDB_KEY) throw new Error('EXPO_PUBLIC_TMDB_API_KEY is not set');
  const sep = tmdbPath.includes('?') ? '&' : '?';
  const res = await fetch(`${TMDB_BASE}${tmdbPath}${sep}api_key=${TMDB_KEY}`);
  if (!res.ok) throw new Error(`TMDB ${tmdbPath} failed: ${res.status}`);
  const data = await res.json();
  const results = Array.isArray(data.results) ? data.results : [];
  const isMovie = tmdbMediaType === 'movie';
  return results.map((r: any) => {
    const title = isMovie ? r.title : r.name;
    const dateStr = isMovie ? r.release_date : r.first_air_date;
    return {
      id:        `${isMovie ? 'film' : 'tv'}-${r.id}`,
      title:     title ?? 'Untitled',
      year:      dateStr ? Number(String(dateStr).slice(0, 4)) : undefined,
      posterUrl: r.poster_path ? `${TMDB_IMG_POSTER}${r.poster_path}` : null,
      mediaType: isMovie ? 'film' : 'tv',
    } as CollectionDiscoverItem;
  });
}

// ── Videos — fetched per spec, held but not yet rendered anywhere: the
// approved section list (Hero/Metadata/Synopsis/Cast/Crew/Collections/
// Recommendations/Watch Providers) has no trailer UI, and CONSTRAINTS forbids
// adding new sections in this pass. See OPEN_QUESTIONS in the task RETURN. ──
export interface TmdbVideo {
  key:  string;
  name: string;
  site: string;
  type: string;
}

export async function fetchTmdbVideos(kind: TmdbKind, tmdbId: string): Promise<TmdbVideo[]> {
  const raw = await tmdbGet<any>(`/${kind}/${tmdbId}/videos`);
  return Array.isArray(raw.results) ? raw.results : [];
}

// ── Recommendations ──────────────────────────────────────────────────────────
export interface TmdbRecommendation {
  id:        string;   // route-id form, e.g. "film-693134"
  title:     string;
  year:      number | undefined;
  posterUrl: string | null;
  mediaType: 'film' | 'tv';
}

export async function fetchTmdbRecommendations(kind: TmdbKind, tmdbId: string): Promise<TmdbRecommendation[]> {
  const raw = await tmdbGet<any>(`/${kind}/${tmdbId}/recommendations`);
  const results = Array.isArray(raw.results) ? raw.results : [];
  return results.map((r: any) => {
    const title = kind === 'movie' ? r.title : r.name;
    const dateStr = kind === 'movie' ? r.release_date : r.first_air_date;
    const year = dateStr ? Number(String(dateStr).slice(0, 4)) : undefined;
    return {
      id:        `${kind === 'movie' ? 'film' : 'tv'}-${r.id}`,
      title,
      year,
      posterUrl: r.poster_path ? `${TMDB_IMG_POSTER}${r.poster_path}` : null,
      mediaType: kind === 'movie' ? 'film' : 'tv',
    } as TmdbRecommendation;
  });
}

// ── Watch Providers ───────────────────────────────────────────────────────────
export interface TmdbProvider {
  id:      number;
  name:    string;
  logoUrl: string | null;
}

export interface TmdbWatchProviders {
  stream: TmdbProvider[];
  rent:   TmdbProvider[];
  buy:    TmdbProvider[];
  /** TMDB's `link` field for this region — a real "powered by JustWatch"
   *  attribution page listing all providers for this title. This is the ONLY
   *  external destination TMDB's watch/providers response actually supplies:
   *  there is no per-provider deep link in this endpoint. Never fabricate
   *  one — a provider pill with no real destination stays non-interactive. */
  attributionLink: string | null;
}

function mapProviderList(list: any[] | undefined): TmdbProvider[] {
  if (!Array.isArray(list)) return [];
  return list.map((p: any) => ({
    id:      p.provider_id,
    name:    p.provider_name,
    logoUrl: p.logo_path ? `${TMDB_IMG_LOGO}${p.logo_path}` : null,
  }));
}

export async function fetchTmdbWatchProviders(kind: TmdbKind, tmdbId: string): Promise<TmdbWatchProviders> {
  const raw = await tmdbGet<any>(`/${kind}/${tmdbId}/watch/providers`);
  const region = raw.results?.[WATCH_PROVIDERS_REGION];
  return {
    stream: mapProviderList(region?.flatrate),
    rent:   mapProviderList(region?.rent),
    buy:    mapProviderList(region?.buy),
    attributionLink: typeof region?.link === 'string' ? region.link : null,
  };
}

// ── Search (Universal Search screen) ─────────────────────────────────────────
export interface TmdbSearchResult {
  id:        string;   // route id, e.g. "film-693134"
  title:     string;
  year:      number | undefined;
  posterUrl: string | null;
  mediaType: 'film' | 'tv';
  rating:    number | null;
}

async function searchByKind(kind: TmdbKind, query: string): Promise<TmdbSearchResult[]> {
  const raw = await tmdbGet<any>(`/search/${kind}`, { query });
  const results = Array.isArray(raw.results) ? raw.results : [];
  return results
    .filter((r: any) => r.poster_path || r.title || r.name)
    .slice(0, 20)
    .map((r: any) => {
      const title = kind === 'movie' ? r.title : r.name;
      const dateStr = kind === 'movie' ? r.release_date : r.first_air_date;
      return {
        id:        `${kind === 'movie' ? 'film' : 'tv'}-${r.id}`,
        title,
        year:      dateStr ? Number(String(dateStr).slice(0, 4)) : undefined,
        posterUrl: r.poster_path ? `${TMDB_IMG_POSTER}${r.poster_path}` : null,
        mediaType: kind === 'movie' ? 'film' : 'tv',
        rating:    typeof r.vote_average === 'number' && r.vote_average > 0 ? Math.round(r.vote_average * 10) / 10 : null,
      } as TmdbSearchResult;
    });
}

export function searchMovies(query: string): Promise<TmdbSearchResult[]> {
  return searchByKind('movie', query);
}

export function searchTv(query: string): Promise<TmdbSearchResult[]> {
  return searchByKind('tv', query);
}

export interface TmdbPersonSearchResult {
  id:        number;
  name:      string;
  photoUrl:  string | null;
  knownFor:  string[];
}

/** TMDB's /search/person returns a lot of non-entries alongside real actors/
 *  directors — crew stub records, fan-uploaded joke names, etc. — almost
 *  always with no profile photo AND no real known-for credits. Confirmed
 *  directly against the live API for query "spiderman": 7 of 8 results were
 *  entries like "Spiderman Dato", "Lego Spiderman 200", "spiderman shirt",
 *  all with profile_path=null; only 1 (Alain Robert, profile_path set, 3
 *  known-for credits) was a real person. Requiring BOTH a real photo and at
 *  least one known-for credit filters out every placeholder in that sample
 *  without removing the one legitimate result. */
export async function searchPeople(query: string): Promise<TmdbPersonSearchResult[]> {
  const raw = await tmdbGet<any>('/search/person', { query });
  const results = Array.isArray(raw.results) ? raw.results : [];
  return results
    .filter((r: any) => !!r.profile_path && Array.isArray(r.known_for) && r.known_for.length > 0)
    .slice(0, 20)
    .map((r: any) => ({
      id:       r.id,
      name:     r.name,
      photoUrl: `${TMDB_IMG_PROFILE}${r.profile_path}`,
      knownFor: r.known_for.map((k: any) => k.title || k.name).filter(Boolean),
    }));
}

// ── Person Detail (new minimal screen) ───────────────────────────────────────
export interface TmdbPersonDetail {
  id:          number;
  name:        string;
  photoUrl:    string | null;
  biography:   string;
  birthday:    string | null;
  knownFor:    { id: string; title: string; posterUrl: string | null; mediaType: 'film' | 'tv' }[];
}

export async function fetchPersonDetail(personId: string): Promise<TmdbPersonDetail> {
  const [person, credits] = await Promise.all([
    tmdbGet<any>(`/person/${personId}`),
    tmdbGet<any>(`/person/${personId}/combined_credits`),
  ]);
  const cast = Array.isArray(credits.cast) ? credits.cast : [];

  // Root cause (verified against real TMDB data for Cillian Murphy/Bryan
  // Cranston/Steve Carell): combined_credits.cast's own `media_type` field is
  // read correctly (it's an accurate movie/tv tag straight from TMDB) — the
  // bug was never a wrong bucket. It's that every cast credit was weighted
  // equally by the PARENT TITLE's popularity, with no filtering or dedup.
  // That systematically buries an actor's real, substantial work under:
  //  - talk/awards/news-show guest appearances (character starts with "Self"),
  //    which have huge popularity as titles despite being a one-off cameo;
  //  - the same show appearing many times over (one row per guest episode/
  //    character variant — e.g. 6 separate "Family Guy" rows for one actor);
  //  - single-episode animated-cameo voice roles on juggernaut shows, which
  //    outrank genuine lead roles on smaller shows purely on title fame.
  // Fix: drop self-appearances, dedupe by id (keep the most substantial
  // version via episode_count), and require TV credits to have episode_count
  // >= 2 — a real per-actor substance signal TMDB provides, instead of only
  // the title's own popularity. Verified this produces the real, correct
  // filmography for all three test actors (e.g. Peaky Blinders/Oppenheimer
  // for Cillian Murphy, Breaking Bad/Malcolm in the Middle for Bryan
  // Cranston, The Office/Despicable Me for Steve Carell — none of which
  // surfaced at all before this fix).
  const isSelfAppearance = (character: string | undefined) => /^self/i.test(character ?? '');
  const substantial = cast.filter((c: any) =>
    !isSelfAppearance(c.character) &&
    (c.media_type !== 'tv' || (c.episode_count ?? 0) >= 2),
  );
  const byId = new Map<number, any>();
  for (const c of substantial) {
    const existing = byId.get(c.id);
    if (!existing || (c.episode_count ?? 0) > (existing.episode_count ?? 0)) byId.set(c.id, c);
  }
  const knownFor = Array.from(byId.values())
    .filter((c: any) => c.poster_path)
    .sort((a: any, b: any) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, 12)
    .map((c: any) => ({
      id:        `${c.media_type === 'tv' ? 'tv' : 'film'}-${c.id}`,
      title:     c.title || c.name,
      posterUrl: c.poster_path ? `${TMDB_IMG_POSTER}${c.poster_path}` : null,
      mediaType: (c.media_type === 'tv' ? 'tv' : 'film') as 'film' | 'tv',
    }));

  return {
    id:        person.id,
    name:      person.name,
    photoUrl:  person.profile_path ? `${TMDB_IMG_PROFILE}${person.profile_path}` : null,
    biography: person.biography ?? '',
    birthday:  person.birthday ?? null,
    knownFor,
  };
}
