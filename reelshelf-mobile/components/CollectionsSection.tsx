import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

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
export function CollectionsSection() {
  const { setOverrideColor } = useAtmosphere();
  const [collection, setCollection] = useState<CollectionCardData | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchFeaturedCollection()
      .then((data) => { if (!cancelled) setCollection(data); })
      .catch(() => { if (!cancelled) setCollection(null); });
    return () => { cancelled = true; };
  }, []);

  if (collection === null) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="Collection of the Week" subtitle="Hand-picked by ReelShelf." />
      <View style={styles.cardWrapper}>
        {collection === undefined ? (
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
});
