import { FlatList, type ListRenderItemInfo, StyleSheet, View } from 'react-native';

import { CollectionPreviewCard, COLLECTION_PREVIEW_CARD_W } from '@/components/CollectionPreviewCard';
import { RS } from '@/constants/theme';
import { discoverCollections, type SeedCollectionItem } from '@/data/seedHomeContent';

const ITEM_SEP = 12;

export function CollectionsRow() {
  return (
    <FlatList<SeedCollectionItem>
      data={discoverCollections}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={() => <View style={{ width: ITEM_SEP }} />}
      contentContainerStyle={styles.list}
      snapToInterval={COLLECTION_PREVIEW_CARD_W + ITEM_SEP}
      decelerationRate="fast"
      renderItem={({ item }: ListRenderItemInfo<SeedCollectionItem>) => (
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
});
