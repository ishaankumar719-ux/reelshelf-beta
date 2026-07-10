import { FlatList, type ListRenderItemInfo, StyleSheet, View } from 'react-native';

import { PosterCard } from '@/components/poster-card';
import { RS } from '@/constants/theme';
import { type SeedCardItem, featuredCards } from '@/data/seedHomeContent';
import { getMediaKey } from '@/utils/listKeys';

const ITEM_SEP = RS.spacing.md;

export function FeaturedCarousel() {
  return (
    <FlatList<SeedCardItem>
      data={featuredCards}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => getMediaKey(item.mediaType, item.id)}
      ItemSeparatorComponent={() => <View style={{ width: ITEM_SEP }} />}
      contentContainerStyle={styles.list}
      snapToInterval={RS.card.featWidth + ITEM_SEP}
      decelerationRate="fast"
      renderItem={({ item }: ListRenderItemInfo<SeedCardItem>) => (
        <PosterCard
          title={item.title}
          year={item.year}
          mediaType={item.mediaType}
          posterUrl={item.posterUrl}
          width={RS.card.featWidth}
          height={RS.card.featHeight}
          size="lg"
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
