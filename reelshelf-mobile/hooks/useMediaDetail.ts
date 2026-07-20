import { useEffect, useState } from 'react';

import {
  getFilmCollections,
  getTVCollections,
  type CollectionDef,
} from '@/lib/discoverCollections';
import {
  fetchTmdbCollectionByPath,
  fetchTmdbCredits,
  fetchTmdbDetails,
  fetchTmdbFallbackBackdrop,
  fetchTmdbMoreFromDirector,
  fetchTmdbRecommendations,
  fetchTmdbVideos,
  fetchTmdbWatchProviders,
  parseMediaRouteId,
  type CollectionDiscoverItem,
  type TmdbCredits,
  type TmdbDetails,
  type TmdbRecommendation,
  type TmdbVideo,
  type TmdbWatchProviders,
} from '@/lib/tmdb';

export type ResourceStatus = 'loading' | 'success' | 'error' | 'empty';

export interface Resource<T> {
  status: ResourceStatus;
  data:   T | null;
}

// Generic single-endpoint resource loader. `fetchFn === null` means "there is
// nothing to fetch for this id" (e.g. a book — TMDB has no book endpoint) and
// resolves straight to 'empty' without ever calling fetch. All state writes
// happen inside this effect (mount + dep-change) or its cleanup guard — never
// during render — which is exactly the pattern the CollectionCard fix above
// restores elsewhere in the app.
function useTmdbResource<T>(fetchFn: (() => Promise<T>) | null, deps: unknown[]): Resource<T> {
  const [state, setState] = useState<Resource<T>>({ status: 'loading', data: null });

  useEffect(() => {
    let cancelled = false;

    if (!fetchFn) {
      setState({ status: 'empty', data: null });
      return;
    }

    setState({ status: 'loading', data: null });
    fetchFn()
      .then(data => {
        if (cancelled) return;
        setState({ status: 'success', data });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ status: 'error', data: null });
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

export interface CollectionMatch {
  def:          CollectionDef;
  previewItems: CollectionDiscoverItem[];
}

export interface UseMediaDetailResult {
  /** null for books — TMDB has no book endpoint, callers fall back to local seed data entirely. */
  kind:            'movie' | 'tv' | null;
  details:         Resource<TmdbDetails>;
  credits:         Resource<TmdbCredits>;
  recommendations: Resource<TmdbRecommendation[]>;
  watchProviders:  Resource<TmdbWatchProviders>;
  /** Fetched per spec but not yet surfaced in any UI section — see lib/tmdb.ts comment. */
  videos:          Resource<TmdbVideo[]>;
  /** Only populated when the primary details backdrop is missing. */
  fallbackBackdrop: Resource<string | null>;
  /** "More from this Director" — movie-only, only fires once credits resolve with a director id. */
  moreFromDirector: Resource<TmdbRecommendation[]>;
  /** Real collection membership — exact port of the website's getFilmCollections()/
   *  getTVCollections() heuristics, each matched def's preview posters fetched
   *  live from the same TMDB discover query the real collection page uses. */
  collections:     Resource<CollectionMatch[]>;
}

/** Orchestrates every live TMDB call the Movie Detail screen needs, one independent
 *  Resource per endpoint so each section can show/hide its own skeleton on its own schedule. */
export function useMediaDetail(routeId: string): UseMediaDetailResult {
  const parsed  = parseMediaRouteId(routeId);
  const kind    = parsed?.kind ?? null;
  const tmdbId  = parsed?.tmdbId ?? null;

  const details = useTmdbResource<TmdbDetails>(
    kind && tmdbId ? () => fetchTmdbDetails(kind, tmdbId) : null,
    [kind, tmdbId],
  );

  const needsFallbackBackdrop = kind && tmdbId && details.status === 'success' && !details.data?.backdropUrl;
  const fallbackBackdrop = useTmdbResource<string | null>(
    needsFallbackBackdrop ? () => fetchTmdbFallbackBackdrop(kind, tmdbId) : null,
    [kind, tmdbId, needsFallbackBackdrop],
  );

  const credits = useTmdbResource<TmdbCredits>(
    kind && tmdbId ? () => fetchTmdbCredits(kind, tmdbId) : null,
    [kind, tmdbId],
  );

  const recommendations = useTmdbResource<TmdbRecommendation[]>(
    kind && tmdbId ? () => fetchTmdbRecommendations(kind, tmdbId) : null,
    [kind, tmdbId],
  );

  const watchProviders = useTmdbResource<TmdbWatchProviders>(
    kind && tmdbId ? () => fetchTmdbWatchProviders(kind, tmdbId) : null,
    [kind, tmdbId],
  );

  const videos = useTmdbResource<TmdbVideo[]>(
    kind && tmdbId ? () => fetchTmdbVideos(kind, tmdbId) : null,
    [kind, tmdbId],
  );

  const directorId = kind === 'movie' && credits.status === 'success' ? credits.data?.directorId ?? null : null;
  const moreFromDirector = useTmdbResource<TmdbRecommendation[]>(
    directorId && tmdbId ? () => fetchTmdbMoreFromDirector(directorId, tmdbId) : null,
    [directorId, tmdbId],
  );

  // Matched defs are derived synchronously from `details` (pure, no network) —
  // only the preview-poster fetch per matched collection is async.
  const matchedDefs: CollectionDef[] = details.status === 'success' && details.data
    ? kind === 'movie'
      ? getFilmCollections(details.data.genreIds, details.data.companyIds, details.data.rating ?? 0, details.data.runtimeMinutes)
      : kind === 'tv'
        ? getTVCollections(details.data.genreIds, details.data.rating ?? 0)
        : []
    : [];
  const matchedSlugs = matchedDefs.map((d) => d.slug).join(',');

  const collections = useTmdbResource<CollectionMatch[]>(
    kind && tmdbId && details.status === 'success'
      ? async () => Promise.all(
          matchedDefs
            .filter((def) => def.tmdbPath && def.tmdbMediaType)
            .map(async (def) => ({
              def,
              previewItems: await fetchTmdbCollectionByPath(def.tmdbPath!, def.tmdbMediaType!).catch(() => []),
            })),
        )
      : null,
    [kind, tmdbId, details.status, matchedSlugs],
  );

  return { kind, details, credits, recommendations, watchProviders, videos, fallbackBackdrop, moreFromDirector, collections };
}
