import {
  getLocalMovieByRouteId,
  getLocalMovieByTmdbId,
} from "./localMovies";

export function getMovieHrefFromRouteId(id: string) {
  return `/movies/${id}`;
}

export function getMovieHrefFromTmdbId(tmdbId: number) {
  const localMovie = getLocalMovieByTmdbId(tmdbId);

  if (localMovie) {
    return getMovieHrefFromRouteId(localMovie.id);
  }

  return `/movies/tmdb-${tmdbId}`;
}

export function normalizeMovieRouteId(id: string) {
  const localMovie = getLocalMovieByRouteId(id);

  if (localMovie) {
    return localMovie.id;
  }

  const rawTmdbId = id.startsWith("tmdb-") ? id.slice(5) : id;

  if (!/^\d+$/.test(rawTmdbId)) {
    return null;
  }

  const tmdbId = Number(rawTmdbId);

  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    return null;
  }

  return getMovieHrefFromTmdbId(tmdbId).replace("/movies/", "");
}
