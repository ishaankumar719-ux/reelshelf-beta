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

const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";

export type SearchMediaType = "movie" | "tv" | "book" | "user";

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

async function searchTMDB(query: string): Promise<UniversalSearchResult[]> {
  if (!API_KEY || !query.trim()) return [];

  const [movieRes, tvRes] = await Promise.all([
    fetch(
      `${TMDB_BASE}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(
        query
      )}`,
      { cache: "no-store" }
    ),
    fetch(
      `${TMDB_BASE}/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(
        query
      )}`,
      { cache: "no-store" }
    ),
  ]);

  const movieData = movieRes.ok ? await movieRes.json() : { results: [] };
  const tvData = tvRes.ok ? await tvRes.json() : { results: [] };

  const movieResults: UniversalSearchResult[] = (movieData.results || [])
    .slice(0, 8)
    .map((item: any) => {
      const localMovie = getLocalMovieByTmdbId(item.id);

      return {
        id: `movie-${item.id}`,
        title: item.title,
        year: item.release_date ? item.release_date.slice(0, 4) : "—",
        poster: getFirstPosterUrl(item.poster_path, localMovie?.poster),
        posterPath: item.poster_path || toPosterPath(localMovie?.poster),
        tmdbId: item.id,
        mediaType: "movie" as const,
        href: localMovie
          ? getMovieHrefFromRouteId(localMovie.id)
          : getMovieHrefFromTmdbId(item.id),
        subtitle: localMovie?.director,
      };
    });

  const tvResults: UniversalSearchResult[] = (tvData.results || [])
    .slice(0, 8)
    .map((item: any) => {
      const localTV = getLocalSeriesByTmdbId(item.id);

      return {
        id: `tv-${item.id}`,
        title: item.name,
        year: item.first_air_date ? item.first_air_date.slice(0, 4) : "—",
        poster: getFirstPosterUrl(item.poster_path, localTV?.posterPath, localTV?.poster),
        posterPath: item.poster_path || toPosterPath(localTV?.posterPath ?? localTV?.poster),
        tmdbId: item.id,
        mediaType: "tv" as const,
        href: localTV
          ? getSeriesHrefFromRouteId(localTV.id)
          : getSeriesHrefFromTmdbId(item.id),
        subtitle: localTV?.creator,
      };
    });

  return [...movieResults, ...tvResults];
}

export async function searchAllMedia(
  query: string
): Promise<UniversalSearchResult[]> {
  if (!query.trim()) return [];

  const [localBookResults, tmdbResults] = await Promise.all([
    searchLocalBooks(query),
    searchTMDB(query),
  ]);

  const combined = [
    ...searchLocalMovies(query),
    ...searchLocalSeries(query),
    ...localBookResults,
    ...tmdbResults,
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
