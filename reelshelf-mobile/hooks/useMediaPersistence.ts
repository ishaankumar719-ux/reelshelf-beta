import { useCallback, useEffect, useRef, useState } from 'react';

import * as mediaStorage from '@/lib/mediaStorage';
import {
  addToShelf,
  fetchDiaryEntry,
  fetchShelfState,
  removeFromShelf,
  saveDiaryRating,
  saveDiaryReview,
  setWatched as setWatchedRemote,
  type DiaryEntryState,
  type MediaMeta,
} from '@/lib/supabase/mediaActions';

export interface UseMediaPersistenceResult {
  /** True once the initial AsyncStorage read for this id has resolved. */
  loaded:        boolean;
  inShelf:       boolean;
  watched:       boolean;
  rating:        number;
  review:        string;
  /** Set when a write to Supabase failed and was rolled back — surfaced inline, not swallowed. */
  error:         string | null;
  toggleShelf:   () => void;
  toggleWatched: () => void;
  saveRating:    (value: number) => void;
  saveReview:    (text: string) => void;
}

// Single source of truth for every Primary Action's persisted state, shared
// by MediaPrimaryActions (edits it) and MediaReviews (reads "Your Review")
// so both stay in sync within one screen instance instead of each keeping an
// independent, potentially stale copy.
//
// AsyncStorage here is EXPLICITLY an optimistic local cache, not the source
// of truth: on mount, cached values paint instantly, then real Supabase
// state is fetched and reconciled (correcting both React state and the
// cache if they'd drifted). Every write updates local state + cache first
// (instant feedback), then writes to Supabase; on failure, both are rolled
// back and `error` is set.
//
// When `userId` is null (logged out) or `meta` is null (TMDB data not
// resolved yet for a live movie/tv id), this only ever serves the local
// cache — no Supabase calls are attempted. The screen is expected to route
// logged-out taps to the sign-in prompt instead of calling these toggles.
export function useMediaPersistence(id: string, meta: MediaMeta | null, userId: string | null): UseMediaPersistenceResult {
  const [loaded, setLoaded]   = useState(false);
  const [inShelf, setInShelf] = useState(false);
  const [watched, setWatched] = useState(false);
  const [rating, setRatingState] = useState(0);
  const [review, setReviewState] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Latest diary sub-state, kept for writes that need "the other" field
  // (e.g. saving a rating must preserve whatever review is already there).
  const diaryRef = useRef<DiaryEntryState>({ watched: false, rating: 0, review: '' });

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setError(null);

    (async () => {
      // 1. Paint instantly from the local optimistic cache.
      const [cachedShelf, cachedWatched, cachedRating, cachedReview] = await Promise.all([
        mediaStorage.getShelfState(id),
        mediaStorage.getWatchedState(id),
        mediaStorage.getRating(id),
        mediaStorage.getReview(id),
      ]);
      if (cancelled) return;
      setInShelf(cachedShelf);
      setWatched(cachedWatched);
      setRatingState(cachedRating);
      setReviewState(cachedReview);
      diaryRef.current = { watched: cachedWatched, rating: cachedRating, review: cachedReview };
      setLoaded(true);

      // 2. Reconcile with real Supabase state, if authenticated.
      if (!userId) return;
      try {
        const [realShelf, realDiary] = await Promise.all([
          fetchShelfState(userId, { id, mediaType: meta?.mediaType ?? 'film' }),
          fetchDiaryEntry(userId, { id, mediaType: meta?.mediaType ?? 'film' }),
        ]);
        if (cancelled) return;

        diaryRef.current = realDiary;
        setInShelf(realShelf);
        setWatched(realDiary.watched);
        setRatingState(realDiary.rating);
        setReviewState(realDiary.review);

        await Promise.all([
          mediaStorage.setShelfState(id, realShelf),
          mediaStorage.setWatchedState(id, realDiary.watched),
          mediaStorage.setRating(id, realDiary.rating),
          mediaStorage.setReview(id, realDiary.review),
        ]);
      } catch {
        // Reconciliation failure — keep showing the optimistic cache rather
        // than blocking the UI; the next successful write will re-sync.
      }
    })();

    return () => { cancelled = true; };
  }, [id, userId, meta?.mediaType]);

  const toggleShelf = useCallback(() => {
    const next = !inShelf;
    setInShelf(next);
    mediaStorage.setShelfState(id, next).catch(() => {});
    setError(null);

    if (!userId || !meta) return;
    const action = next ? addToShelf(userId, meta) : removeFromShelf(userId, meta);
    action.catch((e) => {
      // Roll back on failure.
      setInShelf(!next);
      mediaStorage.setShelfState(id, !next).catch(() => {});
      setError(e instanceof Error ? e.message : 'Could not update your shelf.');
    });
  }, [id, inShelf, meta, userId]);

  const toggleWatched = useCallback(() => {
    const next = !watched;
    const prevDiary = diaryRef.current;
    setWatched(next);
    mediaStorage.setWatchedState(id, next).catch(() => {});
    setError(null);

    if (!userId || !meta) return;
    setWatchedRemote(userId, meta, next, prevDiary).catch((e) => {
      setWatched(!next);
      mediaStorage.setWatchedState(id, !next).catch(() => {});
      setError(e instanceof Error ? e.message : 'Could not update Watched.');
    });
  }, [id, meta, userId, watched]);

  const saveRating = useCallback((value: number) => {
    const prevRating = rating;
    const prevDiary = diaryRef.current;
    setRatingState(value);
    diaryRef.current = { ...diaryRef.current, watched: true, rating: value };
    mediaStorage.setRating(id, value).catch(() => {});
    setError(null);

    if (!userId || !meta) return;
    saveDiaryRating(userId, meta, value, prevDiary).catch((e) => {
      setRatingState(prevRating);
      diaryRef.current = prevDiary;
      mediaStorage.setRating(id, prevRating).catch(() => {});
      setError(e instanceof Error ? e.message : 'Could not save your rating.');
    });
  }, [id, meta, rating, userId]);

  const saveReview = useCallback((text: string) => {
    const prevReview = review;
    const prevDiary = diaryRef.current;
    setReviewState(text);
    diaryRef.current = { ...diaryRef.current, watched: true, review: text };
    mediaStorage.setReview(id, text).catch(() => {});
    setError(null);

    if (!userId || !meta) return;
    saveDiaryReview(userId, meta, text, prevDiary).catch((e) => {
      setReviewState(prevReview);
      diaryRef.current = prevDiary;
      mediaStorage.setReview(id, prevReview).catch(() => {});
      setError(e instanceof Error ? e.message : 'Could not save your review.');
    });
  }, [id, meta, review, userId]);

  return { loaded, inShelf, watched, rating, review, error, toggleShelf, toggleWatched, saveRating, saveReview };
}
