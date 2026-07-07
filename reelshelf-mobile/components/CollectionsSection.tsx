import { FlatList, type ListRenderItemInfo, StyleSheet, View } from 'react-native';

import { CollectionCard, COLLECTION_CARD_W } from '@/components/CollectionCard';
import { SectionHeader } from '@/components/section-header';
import { RS } from '@/constants/theme';
import { type SeedCollectionItem, collections } from '@/data/seedHomeContent';

const ITEM_SEP = RS.spacing.md;  // 16px between cards for editorial breathing room

export function CollectionsSection() {
  return (
    <View style={styles.section}>
      <SectionHeader
        title="Collection of the Week"
        subtitle="Hand-picked by ReelShelf."
      />
      <FlatList<SeedCollectionItem>
        data={collections}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ width: ITEM_SEP }} />}
        contentContainerStyle={styles.list}
        snapToInterval={COLLECTION_CARD_W + ITEM_SEP}
        snapToAlignment="start"
        decelerationRate="fast"
        renderItem={({ item }: ListRenderItemInfo<SeedCollectionItem>) => (
          <CollectionCard item={item} />
        )}
        getItemLayout={(_, index) => ({
          length: COLLECTION_CARD_W,
          offset: (COLLECTION_CARD_W + ITEM_SEP) * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: RS.spacing.xs,
  },
  list: {
    paddingHorizontal: RS.spacing.md,
  },
});
