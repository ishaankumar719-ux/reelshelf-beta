import { FlatList, type ListRenderItemInfo, StyleSheet, Text, View } from 'react-native';

import { CollectionCard } from '@/components/CollectionCard';
import { RS } from '@/constants/theme';
import { type SeedCollectionItem, collections } from '@/data/seedHomeContent';

const ITEM_SEP = RS.spacing.sm;

export function CollectionsSection() {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Collections</Text>
      <FlatList<SeedCollectionItem>
        data={collections}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ width: ITEM_SEP }} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }: ListRenderItemInfo<SeedCollectionItem>) => (
          <CollectionCard item={item} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: RS.spacing.sm,
  },
  heading: {
    paddingHorizontal: RS.spacing.md,
    fontSize:          RS.typography.heading,
    fontWeight:        '700',
    color:             RS.colors.textPrimary,
    letterSpacing:     -0.3,
  },
  list: {
    paddingHorizontal: RS.spacing.md,
  },
});
