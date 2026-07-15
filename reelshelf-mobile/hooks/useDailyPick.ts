import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '@/contexts/AuthContext';
import {
  fetchOrCreateDailyPick, getLocalDateString, rerollDailyPick, type DailyPick,
} from '@/lib/supabase/dailyPick';

type Status = 'idle' | 'loading' | 'success' | 'error';

const CACHE_KEY = 'reelshelf:dailyPickCache';

interface CachedPick { pick: DailyPick; cachedAt: string }

/** Instant-paint-only cache — never primary storage. daily_picks (Supabase)
 *  is the real source of truth; this only avoids a blank flash before the
 *  real fetch resolves, and is discarded the moment it doesn't match today's
 *  local date. */
async function readCache(userId: string): Promise<DailyPick | null> {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_KEY}:${userId}`);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedPick;
    if (cached.cachedAt !== getLocalDateString()) return null;
    return cached.pick;
  } catch {
    return null;
  }
}

function writeCache(userId: string, pick: DailyPick) {
  AsyncStorage.setItem(
    `${CACHE_KEY}:${userId}`,
    JSON.stringify({ pick, cachedAt: getLocalDateString() } satisfies CachedPick),
  ).catch(() => {});
}

// Shared by Home's preview card and the Daily Reel tab — one hook, one
// daily_picks query, so the two surfaces can never show different items
// (WEBSITE_DAILY_REEL_AUDIT.md §0/§5: the website achieves this by reusing
// one component instance in both places; this is mobile's equivalent).
export function useDailyPick() {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>('idle');
  const [pick, setPick] = useState<DailyPick | null>(null);
  const [rerolling, setRerolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const load = useCallback(async () => {
    if (!user) { setStatus('idle'); setPick(null); return; }
    setStatus('loading');
    setError(null);

    const cached = await readCache(user.id);
    if (cached && isMounted.current) setPick(cached);

    try {
      const real = await fetchOrCreateDailyPick(user.id);
      if (!isMounted.current) return;
      setPick(real);
      writeCache(user.id, real);
      setStatus('success');
    } catch (e) {
      if (!isMounted.current) return;
      if (!cached) setStatus('error');
      else setStatus('success'); // keep showing the cached pick if the real fetch failed
      setError(e instanceof Error ? e.message : 'Could not load your Daily Pick.');
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const reroll = useCallback(async () => {
    if (!user || !pick || rerolling || pick.rerollCount >= 1) return;
    setRerolling(true);
    setError(null);
    try {
      const next = await rerollDailyPick(user.id);
      if (!isMounted.current) return;
      setPick(next);
      writeCache(user.id, next);
    } catch (e) {
      if (!isMounted.current) return;
      setError(e instanceof Error ? e.message : 'Could not reroll right now.');
    } finally {
      if (isMounted.current) setRerolling(false);
    }
  }, [user, pick, rerolling]);

  return { status, pick, rerolling, error, reroll, refetch: load, isLoggedIn: !!user };
}
