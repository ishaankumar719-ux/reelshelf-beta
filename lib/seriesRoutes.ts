import {
  getLocalSeriesByRouteId,
  getLocalSeriesByTmdbId,
} from "./localSeries";

export function getSeriesHrefFromRouteId(id: string) {
  return `/series/${id}`;
}

export function getSeriesHrefFromTmdbId(tmdbId: number) {
  const localSeries = getLocalSeriesByTmdbId(tmdbId);

  if (localSeries) {
    return getSeriesHrefFromRouteId(localSeries.id);
  }

  return `/series/tmdb-${tmdbId}`;
}

export function normalizeSeriesRouteId(id: string) {
  const localSeries = getLocalSeriesByRouteId(id);

  if (localSeries) {
    return localSeries.id;
  }

  const rawTmdbId = id.startsWith("tmdb-") ? id.slice(5) : id;

  if (!/^\d+$/.test(rawTmdbId)) {
    return null;
  }

  const tmdbId = Number(rawTmdbId);

  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    return null;
  }

  return getSeriesHrefFromTmdbId(tmdbId).replace("/series/", "");
}
