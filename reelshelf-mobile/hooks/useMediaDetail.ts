import { useCallback, useEffect, useState } from 'react';

import { fetchCollectionMembershipForMedia, type MediaCollectionMembership } from '@/lib/supabase/collections';
import type { MediaType } from '@/data/seedHomeContent';
import {
  fetchTmdbCredits,
  fetchTmdbDetails,
  fetchTmdbFallbackBackdrop,
  fetchTmdbMoreFromDirector,
  fetchTmdbRecommendations,
  fetchTmdbVideos,
  fetchTmdbWatchProviders,
  parseMediaRouteId,
  type TmdbCredits,
  type TmdbDetails,
  type TmdbRecommendation,
  type TmdbVideo,
  type TmdbWatchProviders,
} from '@/lib/tmdb';

/** Route ids are film-<tmdbId>/tv-<tmdbId>/book-<slug> — collection_items'
 *  media_id convention mirrors this exactly (bare TMDB id for movie/tv, bare
 *  slug for books; see lib/supabase/collections.ts), so this only needs to
 *  strip the routing prefix, not translate to a different id scheme. */
function deriveMediaIdentity(routeId: string): { mediaType: MediaType; rawId: string } | null {
  const parsed = parseMediaRouteId(routeId);
  if (parsed) return { mediaType: parsed.kind === 'movie' ? 'film' : 'tv', rawId: parsed.tmdbId };
  const dashIdx = routeId.indexOf('-');
  if (dashIdx < 0) return null;
  return { mediaType: 'book', rawId: routeId.slice(dashIdx + 1) };
}

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
  /** Real collection membership — is this exact title a verified item in any
   *  currently-live collection (collections/collection_items tables)? See
   *  lib/supabase/collections.ts. Applies to movie/TV/book alike, unlike the
   *  old TMDB-rule-based version this replaced (movie/TV only). */
  collections:     Resource<MediaCollectionMembership[]>;
  /** Re-runs every resource fetch below — the Retry action behind the
   *  screen-level NetworkErrorState when details.status === 'error'. */
  retry: () => void;
}

/** Orchestrates every live TMDB call the Movie Detail screen needs, one independent
 *  Resource per endpoint so each section can show/hide its own skeleton on its own schedule. */
export function useMediaDetail(routeId: string): UseMediaDetailResult {
  const parsed  = parseMediaRouteId(routeId);
  const kind    = parsed?.kind ?? null;
  const tmdbId  = parsed?.tmdbId ?? null;

  // Bumped by retry() — included in every resource's deps below so one
  // Retry tap re-fires every in-flight/failed fetch together.
  const [retryToken, setRetryToken] = useState(0);
  const retry = useCallback(() => setRetryToken((t) => t + 1), []);

  const details = useTmdbResource<TmdbDetails>(
    kind && tmdbId ? () => fetchTmdbDetails(kind, tmdbId) : null,
    [kind, tmdbId, retryToken],
  );

  const needsFallbackBackdrop = kind && tmdbId && details.status === 'success' && !details.data?.backdropUrl;
  const fallbackBackdrop = useTmdbResource<string | null>(
    needsFallbackBackdrop ? () => fetchTmdbFallbackBackdrop(kind, tmdbId) : null,
    [kind, tmdbId, needsFallbackBackdrop, retryToken],
  );

  const credits = useTmdbResource<TmdbCredits>(
    kind && tmdbId ? () => fetchTmdbCredits(kind, tmdbId) : null,
    [kind, tmdbId, retryToken],
  );

  const recommendations = useTmdbResource<TmdbRecommendation[]>(
    kind && tmdbId ? () => fetchTmdbRecommendations(kind, tmdbId) : null,
    [kind, tmdbId, retryToken],
  );

  const watchProviders = useTmdbResource<TmdbWatchProviders>(
    kind && tmdbId ? () => fetchTmdbWatchProviders(kind, tmdbId) : null,
    [kind, tmdbId, retryToken],
  );

  const videos = useTmdbResource<TmdbVideo[]>(
    kind && tmdbId ? () => fetchTmdbVideos(kind, tmdbId) : null,
    [kind, tmdbId, retryToken],
  );

  const directorId = kind === 'movie' && credits.status === 'success' ? credits.data?.directorId ?? null : null;
  const moreFromDirector = useTmdbResource<TmdbRecommendation[]>(
    directorId && tmdbId ? () => fetchTmdbMoreFromDirector(directorId, tmdbId) : null,
    [directorId, tmdbId, retryToken],
  );

  const identity = deriveMediaIdentity(routeId);
  const collections = useTmdbResource<MediaCollectionMembership[]>(
    identity ? () => fetchCollectionMembershipForMedia(identity.mediaType, identity.rawId) : null,
    [identity?.mediaType, identity?.rawId, retryToken],
  );

  return { kind, details, credits, recommendations, watchProviders, videos, fallbackBackdrop, moreFromDirector, collections, retry };
}
