import { useEffect, useState } from 'react';
import { FlatList, type ListRenderItemInfo, StyleSheet, View } from 'react-native';

import { CollectionPreviewCard, COLLECTION_PREVIEW_CARD_W } from '@/components/CollectionPreviewCard';
import { SkeletonBlock } from '@/components/Skeleton';
import { RS } from '@/constants/theme';
import { fetchAdditionalCollections, type CollectionCardData } from '@/lib/supabase/collections';
import { getMediaKey } from '@/utils/listKeys';

const ITEM_SEP = 12;
const CARD_H = 220;

// Real Supabase-backed — every currently-live collection besides whichever
// one is the featured spotlight (see lib/supabase/collections.ts's
// fetchAdditionalCollections). Replaces the old hardcoded 6-collection
// static subset.
export function CollectionsRow() {
  const [collections, setCollections] = useState<CollectionCardData[] | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchAdditionalCollections()
      .then((data) => { if (!cancelled) setCollections(data); })
      .catch(() => { if (!cancelled) setCollections([]); });
    return () => { cancelled = true; };
  }, []);

  if (collections === undefined) {
    return (
      <View style={[styles.list, styles.skeletonRow]}>
        {[0, 1, 2].map((i) => (
          <SkeletonBlock key={i} width={COLLECTION_PREVIEW_CARD_W} height={CARD_H} radius={RS.card.radius} />
        ))}
      </View>
    );
  }

  if (collections.length === 0) return null;

  return (
    <FlatList<CollectionCardData>
      data={collections}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => getMediaKey('collection', item.id)}
      ItemSeparatorComponent={() => <View style={{ width: ITEM_SEP }} />}
      contentContainerStyle={styles.list}
      snapToInterval={COLLECTION_PREVIEW_CARD_W + ITEM_SEP}
      decelerationRate="fast"
      renderItem={({ item }: ListRenderItemInfo<CollectionCardData>) => (
        <CollectionPreviewCard item={item} />
      )}
      getItemLayout={(_, index) => ({
        length: COLLECTION_PREVIEW_CARD_W,
        offset: (COLLECTION_PREVIEW_CARD_W + ITEM_SEP) * index,
        index,
      })}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: RS.spacing.md,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: ITEM_SEP,
  },
});
