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
  loaded:            boolean;
  inShelf:           boolean;
  watched:           boolean;
  rating:            number;
  review:            string;
  containsSpoilers:  boolean;
  /** Set when a write to Supabase failed and was rolled back — surfaced inline, not swallowed. */
  error:             string | null;
  toggleShelf:       () => void;
  toggleWatched:     () => void;
  saveRating:        (value: number) => void;
  saveReview:        (text: string) => void;
  /** Called by UniversalReviewComposer after it saves directly to Supabase —
   *  updates local state/cache to match without a redundant re-fetch. */
  applyComposerSave: (fields: { rating: number | null; review: string; containsSpoilers: boolean }) => void;
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
  const [containsSpoilers, setContainsSpoilers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Latest diary sub-state, kept for writes that need "the other" field
  // (e.g. saving a rating must preserve whatever review is already there).
  const diaryRef = useRef<DiaryEntryState>({ watched: false, rating: 0, review: '', containsSpoilers: false });

  // Per-field monotonic sequence numbers — guard against an out-of-order
  // network response (e.g. a slow first tap's rollback resolving AFTER a
  // second rapid re-tap already moved state forward) clobbering newer
  // optimistic state with stale data. Each toggle/save bumps its field's
  // counter; a resolving call only applies its rollback if it's still the
  // most recent write for that field.
  const shelfSeqRef = useRef(0);
  const watchedSeqRef = useRef(0);
  const ratingSeqRef = useRef(0);
  const reviewSeqRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setError(null);

    (async () => {
      // 1. Paint instantly from the local optimistic cache — namespaced by
      // userId (or the 'guest' bucket), so this can never paint a different
      // account's cached state, even for an instant.
      const [cachedShelf, cachedWatched, cachedRating, cachedReview] = await Promise.all([
        mediaStorage.getShelfState(userId, id),
        mediaStorage.getWatchedState(userId, id),
        mediaStorage.getRating(userId, id),
        mediaStorage.getReview(userId, id),
      ]);
      if (cancelled) return;
      setInShelf(cachedShelf);
      setWatched(cachedWatched);
      setRatingState(cachedRating);
      setReviewState(cachedReview);
      // contains_spoilers isn't part of the local optimistic cache (only
      // Supabase tracks it) — reconciliation below fills in the real value.
      diaryRef.current = { watched: cachedWatched, rating: cachedRating, review: cachedReview, containsSpoilers: false };
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
        setContainsSpoilers(realDiary.containsSpoilers);

        await Promise.all([
          mediaStorage.setShelfState(userId, id, realShelf),
          mediaStorage.setWatchedState(userId, id, realDiary.watched),
          mediaStorage.setRating(userId, id, realDiary.rating),
          mediaStorage.setReview(userId, id, realDiary.review),
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
    const seq = ++shelfSeqRef.current;
    setInShelf(next);
    mediaStorage.setShelfState(userId, id, next).catch(() => {});
    setError(null);

    if (!userId || !meta) return;
    const action = next ? addToShelf(userId, meta) : removeFromShelf(userId, meta);
    action.catch((e) => {
      // Roll back on failure — but only if no newer toggle has since
      // superseded this one (out-of-order network responses must not
      // clobber a more recent optimistic state).
      if (shelfSeqRef.current !== seq) return;
      setInShelf(!next);
      mediaStorage.setShelfState(userId, id, !next).catch(() => {});
      setError(e instanceof Error ? e.message : 'Could not update your shelf.');
    });
  }, [id, inShelf, meta, userId]);

  const toggleWatched = useCallback(() => {
    const next = !watched;
    const prevDiary = diaryRef.current;
    const seq = ++watchedSeqRef.current;
    setWatched(next);
    mediaStorage.setWatchedState(userId, id, next).catch(() => {});
    setError(null);

    if (!userId || !meta) return;
    setWatchedRemote(userId, meta, next, prevDiary).catch((e) => {
      if (watchedSeqRef.current !== seq) return;
      setWatched(!next);
      mediaStorage.setWatchedState(userId, id, !next).catch(() => {});
      setError(e instanceof Error ? e.message : 'Could not update Watched.');
    });
  }, [id, meta, userId, watched]);

  const saveRating = useCallback((value: number) => {
    const prevRating = rating;
    const prevDiary = diaryRef.current;
    const seq = ++ratingSeqRef.current;
    setRatingState(value);
    diaryRef.current = { ...diaryRef.current, watched: true, rating: value };
    mediaStorage.setRating(userId, id, value).catch(() => {});
    setError(null);

    if (!userId || !meta) return;
    saveDiaryRating(userId, meta, value, prevDiary).catch((e) => {
      if (ratingSeqRef.current !== seq) return;
      setRatingState(prevRating);
      diaryRef.current = prevDiary;
      mediaStorage.setRating(userId, id, prevRating).catch(() => {});
      setError(e instanceof Error ? e.message : 'Could not save your rating.');
    });
  }, [id, meta, rating, userId]);

  const saveReview = useCallback((text: string) => {
    const prevReview = review;
    const prevDiary = diaryRef.current;
    const seq = ++reviewSeqRef.current;
    setReviewState(text);
    diaryRef.current = { ...diaryRef.current, watched: true, review: text };
    mediaStorage.setReview(userId, id, text).catch(() => {});
    setError(null);

    if (!userId || !meta) return;
    saveDiaryReview(userId, meta, text, prevDiary).catch((e) => {
      if (reviewSeqRef.current !== seq) return;
      setReviewState(prevReview);
      diaryRef.current = prevDiary;
      mediaStorage.setReview(userId, id, prevReview).catch(() => {});
      setError(e instanceof Error ? e.message : 'Could not save your review.');
    });
  }, [id, meta, review, userId]);

  const applyComposerSave = useCallback((fields: { rating: number | null; review: string; containsSpoilers: boolean }) => {
    const nextRating = fields.rating ?? 0;
    setWatched(true);
    setRatingState(nextRating);
    setReviewState(fields.review);
    setContainsSpoilers(fields.containsSpoilers);
    diaryRef.current = { watched: true, rating: nextRating, review: fields.review, containsSpoilers: fields.containsSpoilers };
    mediaStorage.setWatchedState(userId, id, true).catch(() => {});
    mediaStorage.setRating(userId, id, nextRating).catch(() => {});
    mediaStorage.setReview(userId, id, fields.review).catch(() => {});
  }, [id, userId]);

  return {
    loaded, inShelf, watched, rating, review, containsSpoilers, error,
    toggleShelf, toggleWatched, saveRating, saveReview, applyComposerSave,
  };
}
