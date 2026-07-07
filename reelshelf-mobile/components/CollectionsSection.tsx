import { FlatList, type ListRenderItemInfo, StyleSheet, View } from 'react-native';

import { CollectionCard } from '@/components/CollectionCard';
import { SectionHeader } from '@/components/section-header';
import { RS } from '@/constants/theme';
import { type SeedCollectionItem, collections } from '@/data/seedHomeContent';

const CARD_W   = 160;
const ITEM_SEP = RS.spacing.sm;

export function CollectionsSection() {
  return (
    <View style={styles.section}>
      <SectionHeader title="Collections" />
      <FlatList<SeedCollectionItem>
        data={collections}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ width: ITEM_SEP }} />}
        contentContainerStyle={styles.list}
        snapToInterval={CARD_W + ITEM_SEP}
        decelerationRate="fast"
        renderItem={({ item }: ListRenderItemInfo<SeedCollectionItem>) => (
          <CollectionCard item={item} />
        )}
        getItemLayout={(_, index) => ({
          length: CARD_W,
          offset: (CARD_W + ITEM_SEP) * index,
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
