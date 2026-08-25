import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ContinueWatchingCard } from '@/components/continue-watching-card';
import { SectionHeader } from '@/components/section-header';
import { SkeletonBlock } from '@/components/Skeleton';
import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCurrentlyEnjoying, type EnjoyingItem } from '@/lib/supabase/currentlyEnjoying';

// Real, per-user Continue Watching — replaces what was previously a
// hardcoded static item (data/seedHomeContent.ts's `continueWatching`
// export: "The Bear", fixed 55% progress) rendered unconditionally for
// every signed-in user regardless of who they were or whether they had any
// watch history at all. Rather than inventing a second, separate notion of
// "continue watching," this reuses fetchCurrentlyEnjoying() — the same
// real, already-scoped, already-reviewed query the Profile screen's
// "Currently Enjoying" shelf already uses (lib/supabase/currentlyEnjoying.ts:
// TV titles on the watchlist with no completed diary_entries watched_date
// yet). Its own header comment is explicit that this is an honest proxy,
// not fabricated progress tracking — no percentage is invented here either;
// ContinueWatchingCard's progress prop is left at its existing decorative
// default rather than backing it with a number nothing in the schema tracks.
//
// The query is gated on a real authenticated user id and keyed on it, so
// switching accounts on the same device re-fetches for the new user rather
// than showing whatever the previous account's effect last resolved.
export function ContinueWatchingSection({ refreshSignal }: { refreshSignal?: number } = {}) {
  const { user, initializing } = useAuth();
  const isAuthenticated = !!user;
  const [item, setItem] = useState<EnjoyingItem | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    if (initializing || !isAuthenticated || !user?.id) {
      setItem(null);
      return () => {};
    }
    let cancelled = false;
    setFailed(false);
    const userId = user.id;
    fetchCurrentlyEnjoying(userId)
      .then((data) => {
        if (cancelled) return;
        const first = data.continueWatchingTv[0] ?? null;
        if (__DEV__) {
          console.log('[continue-watching] fetch result', {
            authUserId: userId,
            queryUserId: userId,
            rowCount: data.continueWatchingTv.length,
          });
        }
        setItem(first);
      })
      .catch((e) => {
        if (cancelled) return;
        if (__DEV__) console.log('[continue-watching] fetch failed', { authUserId: userId, error: e instanceof Error ? e.message : String(e) });
        setFailed(true);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initializing, isAuthenticated, user?.id, refreshSignal]);

  useEffect(() => load(), [load]);

  // Not signed in, or genuinely no qualifying title — render nothing. This
  // is the real, natural empty result of a real query, not a hardcoded
  // blank state: a user WITH a real in-progress show gets a real card, one
  // WITHOUT gets nothing, exactly as their data does or doesn't exist.
  if (!isAuthenticated || (!failed && item === null)) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="Continue Watching" subtitle="Pick up where you left off." />
      {failed ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>Couldn&apos;t load Continue Watching.</Text>
          <Pressable onPress={load} hitSlop={6}>
            <Text style={styles.retryLabel}>Retry</Text>
          </Pressable>
        </View>
      ) : !item ? (
        <View style={styles.cardWrapper}>
          <SkeletonBlock width="100%" height={148} radius={18} />
        </View>
      ) : (
        <ContinueWatchingCard
          id={item.routeId}
          title={item.title}
          mediaType="tv"
          posterUrl={item.poster}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section:     { gap: RS.spacing.sm },
  cardWrapper: { paddingHorizontal: RS.spacing.md },
  errorWrap: {
    height:          148,
    marginHorizontal: RS.spacing.md,
    borderRadius:    18,
    borderWidth:     0.5,
    borderColor:     RS.colors.border,
    backgroundColor: RS.colors.card,
    alignItems:      'center',
    justifyContent:  'center',
    gap:             RS.spacing.xs,
  },
  errorText: {
    fontSize: RS.typography.body,
    color:    RS.colors.textMuted,
  },
  retryLabel: {
    fontSize:   RS.typography.body,
    fontWeight: '600',
    color:      RS.colors.accent,
  },
});
