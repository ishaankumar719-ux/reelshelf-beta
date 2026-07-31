import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CollectionCard } from '@/components/CollectionCard';
import { SectionHeader } from '@/components/section-header';
import { SkeletonBlock } from '@/components/Skeleton';
import { RS } from '@/constants/theme';
import { useAtmosphere } from '@/contexts/AtmosphereContext';
import { fetchFeaturedCollection } from '@/lib/supabase/collections';
import type { CollectionCardData } from '@/lib/supabase/collections';

// Real Supabase-backed: the first currently-live collection by sort_order
// (see lib/supabase/collections.ts's "what's currently live" query) — same
// single-featured-collection concept the old COLLECTION_OF_THE_WEEK_ID
// constant pointed at, now driven by real, verified data instead of a static
// seed array. No outer carousel, no card-to-card swipe — the inner poster
// strip inside CollectionCard remains swipeable for browsing that
// collection's items.
export function CollectionsSection({ refreshSignal }: { refreshSignal?: number } = {}) {
  const { setOverrideColor } = useAtmosphere();
  const [collection, setCollection] = useState<CollectionCardData | null | undefined>(undefined);
  // Distinct from "resolved to null" (no live collection this week — a real,
  // silently-hideable outcome) — the fetch itself rejecting (network drop,
  // Supabase error) is never conflated with that, since only this state
  // offers a retry.
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    setFailed(false);
    fetchFeaturedCollection()
      .then((data) => { if (!cancelled) setCollection(data); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
    // refreshSignal is deliberately in deps though unused in the body — its
    // only job is to force a new `load` identity so the effect below
    // refires on Home's pull-to-refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  useEffect(() => load(), [load]);

  if (collection === null) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="Collection of the Week" subtitle="Hand-picked by ReelShelf." />
      <View style={styles.cardWrapper}>
        {failed ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>Couldn&apos;t load this week&apos;s collection.</Text>
            <Pressable onPress={load} hitSlop={6}>
              <Text style={styles.retryLabel}>Retry</Text>
            </Pressable>
          </View>
        ) : collection === undefined ? (
          <SkeletonBlock width="100%" height={230} radius={RS.card.radius} />
        ) : (
          <CollectionCard item={collection} onActiveColorChange={setOverrideColor} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section:     { gap: RS.spacing.xs },
  cardWrapper: { paddingHorizontal: RS.spacing.md },
  errorWrap: {
    height:          230,
    borderRadius:    RS.card.radius,
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
