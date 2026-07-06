import { FlatList, type ListRenderItemInfo, StyleSheet, View } from 'react-native';

import { PosterCard } from '@/components/poster-card';
import { RS } from '@/constants/theme';
import { type MockCardItem, trendingToday } from '@/data/mockHomeContent';

const ITEM_SEP = RS.spacing.sm;

export function TrendingCarousel() {
  return (
    <FlatList<MockCardItem>
      data={trendingToday}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={() => <View style={{ width: ITEM_SEP }} />}
      contentContainerStyle={styles.list}
      renderItem={({ item }: ListRenderItemInfo<MockCardItem>) => (
        <PosterCard
          title={item.title}
          year={item.year}
          mediaType={item.mediaType}
          colorSeed={item.colorSeed}
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
