import { useCallback, useEffect, useState } from 'react';

import * as mediaStorage from '@/lib/mediaStorage';

export interface UseMediaPersistenceResult {
  /** True once the initial AsyncStorage read for this id has resolved. */
  loaded:        boolean;
  inShelf:       boolean;
  watched:       boolean;
  rating:        number;
  review:        string;
  toggleShelf:   () => void;
  toggleWatched: () => void;
  saveRating:    (value: number) => void;
  saveReview:    (text: string) => void;
}

// Single source of truth for every Primary Action's persisted state, shared
// by MediaPrimaryActions (edits it) and MediaReviews (reads "Your Review")
// so both stay in sync within one screen instance instead of each keeping an
// independent, potentially stale copy.
export function useMediaPersistence(id: string): UseMediaPersistenceResult {
  const [loaded, setLoaded]   = useState(false);
  const [inShelf, setInShelf] = useState(false);
  const [watched, setWatched] = useState(false);
  const [rating, setRatingState] = useState(0);
  const [review, setReviewState] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    Promise.all([
      mediaStorage.getShelfState(id),
      mediaStorage.getWatchedState(id),
      mediaStorage.getRating(id),
      mediaStorage.getReview(id),
    ]).then(([shelfVal, watchedVal, ratingVal, reviewVal]) => {
      if (cancelled) return;
      setInShelf(shelfVal);
      setWatched(watchedVal);
      setRatingState(ratingVal);
      setReviewState(reviewVal);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [id]);

  const toggleShelf = useCallback(() => {
    setInShelf(prev => {
      const next = !prev;
      mediaStorage.setShelfState(id, next).catch(() => {});
      return next;
    });
  }, [id]);

  const toggleWatched = useCallback(() => {
    setWatched(prev => {
      const next = !prev;
      mediaStorage.setWatchedState(id, next).catch(() => {});
      return next;
    });
  }, [id]);

  const saveRating = useCallback((value: number) => {
    setRatingState(value);
    mediaStorage.setRating(id, value).catch(() => {});
  }, [id]);

  const saveReview = useCallback((text: string) => {
    setReviewState(text);
    mediaStorage.setReview(id, text).catch(() => {});
  }, [id]);

  return { loaded, inShelf, watched, rating, review, toggleShelf, toggleWatched, saveRating, saveReview };
}
