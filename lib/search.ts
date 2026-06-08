import { resolveBookCover } from "./bookCovers";
import { getBookHrefFromRouteId } from "./bookRoutes";
import { localBooks } from "./localBooks";
import { getLocalMovieByTmdbId, localMovies } from "./localMovies";
import { getMovieHrefFromRouteId, getMovieHrefFromTmdbId } from "./movieRoutes";
import { getFirstPosterUrl, getTMDBPosterUrl } from "./posters";
import { getLocalSeriesByTmdbId, localSeries } from "./localSeries";
import {
  getSeriesHrefFromRouteId,
  getSeriesHrefFromTmdbId,
} from "./seriesRoutes";

// TMDB calls now go through /api/search (server-side TMDB_API_KEY) so the
// header search no longer depends on NEXT_PUBLIC_TMDB_API_KEY being present
// in the browser bundle — hot-reloads were clearing it and silently breaking search.

export type SearchMediaType = "movie" | "tv" | "book" | "user" | "short_film";

export type UniversalSearchResult = {
  id: string;
  title: string;
  year: string;
  poster: string | null;
  posterPath?: string | null;
  tmdbId?: number | null;
  mediaType: SearchMediaType;
  href: string;
  subtitle?: string;
};

function toPosterPath(value: string | null | undefined) {
  if (!value) return null;
  if (value.startsWith("http")) {
    const match = value.match(/\/t\/p\/(?:w\d+|original)(\/.+)$/);
    return match?.[1] ?? null;
  }

  return value;
}

function normalizeText(value: string) {
  return value.toLowerCase().trim();
}

function matchesQuery(values: Array<string | undefined | null>, query: string) {
  const normalizedQuery = normalizeText(query);
  return values.some((value) => normalizeText(value || "").includes(normalizedQuery));
}

async function searchLocalBooks(query: string): Promise<UniversalSearchResult[]> {
  const matches = localBooks.filter((book) =>
    matchesQuery([book.title, book.author, book.genre], query)
  );

  return Promise.all(
    matches.slice(0, 6).map(async (book) => ({
      id: `book-${book.id}`,
      title: book.title,
      year: book.year,
      poster: await resolveBookCover(book),
      mediaType: "book" as const,
      href: getBookHrefFromRouteId(book.id),
      subtitle: book.author,
    }))
  );
}

function searchLocalMovies(query: string): UniversalSearchResult[] {
  return localMovies
    .filter((movie) => matchesQuery([movie.title, movie.director], query))
    .slice(0, 6)
    .map((movie) => ({
      id: `movie-local-${movie.id}`,
      title: movie.title,
      year: movie.year,
      poster: getFirstPosterUrl(movie.poster),
      posterPath: toPosterPath(movie.poster),
      tmdbId: typeof movie.tmdbId === "number" ? movie.tmdbId : null,
      mediaType: "movie" as const,
      href: getMovieHrefFromRouteId(movie.id),
      subtitle: movie.director,
    }));
}

function searchLocalSeries(query: string): UniversalSearchResult[] {
  return localSeries
    .filter((series) => matchesQuery([series.title, series.creator], query))
    .slice(0, 6)
    .map((series) => ({
      id: `tv-local-${series.id}`,
      title: series.title,
      year: series.year,
      poster: getTMDBPosterUrl(series.posterPath ?? series.poster),
      posterPath: toPosterPath(series.posterPath ?? series.poster),
      tmdbId: typeof series.tmdbId === "number" ? series.tmdbId : null,
      mediaType: "tv" as const,
      href: getSeriesHrefFromRouteId(series.id),
      subtitle: series.creator,
    }));
}

type ApiSearchResult = {
  id: number | string;
  media_type?: string;
  title: string;
  year: string | null;
  poster_path: string | null;
  director?: string | null;
  author?: string | null;
  href?: string;
};

// Films and series via /api/search (server-side TMDB_API_KEY, no browser dependency).
async function searchViaApi(query: string): Promise<{
  films: UniversalSearchResult[];
  series: UniversalSearchResult[];
}> {
  const empty = { films: [], series: [] };
  const q = query.trim();
  if (!q) return empty;

  try {
    const res = await fetch(
      `/api/search?q=${encodeURIComponent(q)}&types=film,series&limit=8`,
      { cache: "no-store" }
    );
    if (!res.ok) return empty;

    const data = (await res.json()) as {
      films?: ApiSearchResult[];
      series?: ApiSearchResult[];
    };

    const films: UniversalSearchResult[] = (data.films ?? []).map((r) => {
      const localMovie = typeof r.id === "number" ? getLocalMovieByTmdbId(r.id) : null;
      return {
        id: `movie-${r.id}`,
        title: r.title,
        year: r.year ?? "—",
        poster: getFirstPosterUrl(r.poster_path, localMovie?.poster),
        posterPath: r.poster_path || toPosterPath(localMovie?.poster),
        tmdbId: typeof r.id === "number" ? r.id : null,
        mediaType: "movie" as const,
        href: r.href ?? (localMovie ? getMovieHrefFromRouteId(localMovie.id) : getMovieHrefFromTmdbId(Number(r.id))),
        subtitle: r.director ?? localMovie?.director,
      };
    });

    const series: UniversalSearchResult[] = (data.series ?? []).map((r) => {
      const localTV = typeof r.id === "number" ? getLocalSeriesByTmdbId(r.id) : null;
      return {
        id: `tv-${r.id}`,
        title: r.title,
        year: r.year ?? "—",
        poster: getFirstPosterUrl(r.poster_path, localTV?.posterPath, localTV?.poster),
        posterPath: r.poster_path || toPosterPath(localTV?.posterPath ?? localTV?.poster),
        tmdbId: typeof r.id === "number" ? r.id : null,
        mediaType: "tv" as const,
        href: r.href ?? (localTV ? getSeriesHrefFromRouteId(localTV.id) : getSeriesHrefFromTmdbId(Number(r.id))),
        subtitle: r.director ?? localTV?.creator,
      };
    });

    return { films, series };
  } catch {
    return empty;
  }
}

type OpenLibraryDoc = {
  key?: string;
  title?: string;
  first_publish_year?: number;
  cover_i?: number;
  author_name?: string[];
};

// Same source as Mount Rushmore book search — Open Library, no API key required.
async function searchOpenLibraryBooks(query: string): Promise<UniversalSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=5`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];

    const data = (await res.json()) as { docs?: OpenLibraryDoc[] };

    return (data.docs ?? [])
      .filter((doc) => doc.key && doc.title)
      .slice(0, 5)
      .map((doc) => {
        // doc.key is "/works/OL123W" — strip prefix for a clean route id
        const routeId = (doc.key ?? "").replace(/^\/works\//, "ol-");
        return {
          id: `olbook-${routeId}`,
          title: doc.title ?? "",
          year: doc.first_publish_year ? String(doc.first_publish_year) : "—",
          poster: doc.cover_i
            ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
            : null,
          mediaType: "book" as const,
          href: getBookHrefFromRouteId(routeId),
          subtitle: doc.author_name?.[0] ?? undefined,
        };
      });
  } catch {
    return [];
  }
}

type ShortFilmApiResult = {
  id: string;
  title: string;
  year: string | null;
  poster_path: string | null;
  director?: string | null;
};

// Delegates to /api/search which already runs the Supabase short_films query
// server-side. Avoids importing the browser Supabase client in a module that
// is also executed during SSR.
async function searchShortFilms(query: string): Promise<UniversalSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  try {
    const res = await fetch(
      `/api/search?q=${encodeURIComponent(q)}&limit=5`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { short_films?: ShortFilmApiResult[] };
    return (data.short_films ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      year: r.year ?? "—",
      poster: r.poster_path,
      mediaType: "short_film" as const,
      href: `/short-films/${r.id}`,
      subtitle: r.director ?? undefined,
    }));
  } catch {
    return [];
  }
}

export async function searchAllMedia(
  query: string
): Promise<UniversalSearchResult[]> {
  if (!query.trim()) return [];

  const [localBooksSettled, apiSettled, openLibrarySettled, shortFilmsSettled] =
    await Promise.allSettled([
      searchLocalBooks(query),
      searchViaApi(query),
      searchOpenLibraryBooks(query),
      searchShortFilms(query),
    ]);

  const localBookResults =
    localBooksSettled.status === "fulfilled" ? localBooksSettled.value : [];
  const apiResults =
    apiSettled.status === "fulfilled"
      ? apiSettled.value
      : { films: [], series: [] };
  const openLibraryResults =
    openLibrarySettled.status === "fulfilled" ? openLibrarySettled.value : [];
  const shortFilmResults =
    shortFilmsSettled.status === "fulfilled" ? shortFilmsSettled.value : [];

  const combined = [
    ...searchLocalMovies(query),
    ...searchLocalSeries(query),
    ...localBookResults,     // hardcoded local books first
    ...openLibraryResults,   // Open Library books (same source as Mount Rushmore)
    ...apiResults.films,
    ...apiResults.series,
    ...shortFilmResults,
  ];

  const deduped = combined.filter(
    (item, index, array) =>
      array.findIndex(
        (candidate) =>
          candidate.href === item.href ||
          (candidate.title.toLowerCase() === item.title.toLowerCase() &&
            candidate.year === item.year &&
            candidate.mediaType === item.mediaType)
      ) === index
  );

  return deduped.slice(0, 18);
}
