import { FlatList, type ListRenderItemInfo, StyleSheet, View } from 'react-native';

import { AnimatedPosterCard } from '@/components/AnimatedPosterCard';
import { RS } from '@/constants/theme';
import { type SeedCardItem, featuredCards } from '@/data/seedHomeContent';

const ITEM_SEP = RS.spacing.md;

export function FeaturedCarousel() {
  return (
    <FlatList<SeedCardItem>
      data={featuredCards}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={() => <View style={{ width: ITEM_SEP }} />}
      contentContainerStyle={styles.list}
      renderItem={({ item }: ListRenderItemInfo<SeedCardItem>) => (
        <AnimatedPosterCard
          title={item.title}
          year={item.year}
          mediaType={item.mediaType}
          posterUrl={item.posterUrl}
          width={RS.card.featWidth}
          height={RS.card.featHeight}
        />
      )}
      getItemLayout={(_, index) => ({
        length: RS.card.featWidth,
        offset: (RS.card.featWidth + ITEM_SEP) * index,
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
