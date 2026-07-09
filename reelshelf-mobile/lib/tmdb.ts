// Live TMDB client — Movie Detail screen ONLY (see AGENTS.md scope notes).
// Uses EXPO_PUBLIC_TMDB_API_KEY client-side, same key already committed for
// the dev-only seed scripts (scripts/generate-seed-data.ts,
// scripts/generate-media-details.ts) — bundled into the client, visible to
// anyone inspecting the app. Standard for TMDB's free-tier client key model.
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
  rating:         number | null;
  /** TV-only — sourced from created_by, mirrors MediaDetailRecord.creator. */
  creator:        string | null;
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

  return {
    year,
    backdropUrl:    raw.backdrop_path ? `${TMDB_IMG_BACKDROP}${raw.backdrop_path}` : null,
    synopsis:       raw.overview ?? '',
    runtimeMinutes,
    genres:         Array.isArray(raw.genres) ? raw.genres.map((g: any) => g.name) : [],
    rating:         typeof raw.vote_average === 'number' && raw.vote_average > 0
      ? Math.round(raw.vote_average * 10) / 10
      : null,
    creator,
  };
}

// ── Images (fallback backdrop only — details already returns the primary one) ─
export async function fetchTmdbFallbackBackdrop(kind: TmdbKind, tmdbId: string): Promise<string | null> {
  const raw = await tmdbGet<any>(`/${kind}/${tmdbId}/images`);
  const first = Array.isArray(raw.backdrops) && raw.backdrops.length > 0 ? raw.backdrops[0] : null;
  return first?.file_path ? `${TMDB_IMG_BACKDROP}${first.file_path}` : null;
}

// ── Credits ───────────────────────────────────────────────────────────────────
export interface TmdbCastMember {
  name:      string;
  character: string;
  photoUrl:  string | null;
}

export interface TmdbCredits {
  cast:       TmdbCastMember[];
  director:   string | null;
  /** TMDB person id for `director` — needed for the "More from this Director" discover query. Movie-only (TV series don't carry a series-level director credit). */
  directorId: number | null;
  writer:     string | null;
  composer:   string | null;
}

const CAST_CAP = 12;

export async function fetchTmdbCredits(kind: TmdbKind, tmdbId: string): Promise<TmdbCredits> {
  const raw = await tmdbGet<any>(`/${kind}/${tmdbId}/credits`);
  const castRaw = Array.isArray(raw.cast) ? raw.cast.slice(0, CAST_CAP) : [];
  const crew    = Array.isArray(raw.crew) ? raw.crew : [];

  const directorEntry = crew.find((c: any) => c.job === 'Director') ?? null;
  const findJob = (job: string) => crew.find((c: any) => c.job === job)?.name ?? null;
  const writer    = findJob('Screenplay') ?? findJob('Writer');
  const composer  = findJob('Original Music Composer');

  return {
    cast: castRaw.map((c: any) => ({
      name:      c.name,
      character: c.character ?? '',
      photoUrl:  c.profile_path ? `${TMDB_IMG_PROFILE}${c.profile_path}` : null,
    })),
    director:   directorEntry?.name ?? null,
    directorId: directorEntry?.id ?? null,
    writer,
    composer,
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
  };
}
