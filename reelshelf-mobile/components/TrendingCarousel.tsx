import { FlatList, type ListRenderItemInfo, StyleSheet, View } from 'react-native';

import { AnimatedPosterCard } from '@/components/AnimatedPosterCard';
import { RS } from '@/constants/theme';
import { type SeedCardItem, trendingToday } from '@/data/seedHomeContent';

const ITEM_SEP = RS.spacing.sm;

export function TrendingCarousel() {
  return (
    <FlatList<SeedCardItem>
      data={trendingToday}
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
        />
      )}
      getItemLayout={(_, index) => ({
        length: RS.card.posterWidth,
        offset: (RS.card.posterWidth + ITEM_SEP) * index,
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
