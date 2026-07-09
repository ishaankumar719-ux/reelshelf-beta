import { FlatList, type ListRenderItemInfo, View } from 'react-native';
import { router } from 'expo-router';

import { PosterCard } from '@/components/poster-card';
import { RS } from '@/constants/theme';
import { hiddenGems, type SeedCardItem } from '@/data/seedHomeContent';

const GEM_W   = 160;
const GEM_H   = 240;
const ITEM_SEP = 12;

export function HiddenGemsCarousel() {
  return (
    <FlatList<SeedCardItem>
      data={hiddenGems}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={() => <View style={{ width: ITEM_SEP }} />}
      contentContainerStyle={{ paddingHorizontal: RS.spacing.md }}
      snapToInterval={GEM_W + ITEM_SEP}
      decelerationRate="fast"
      renderItem={({ item }: ListRenderItemInfo<SeedCardItem>) => (
        <PosterCard
          title={item.title}
          year={item.year}
          mediaType={item.mediaType}
          posterUrl={item.posterUrl}
          width={GEM_W}
          height={GEM_H}
          size="lg"
          onPress={() =>
            router.push(
              `/media/${item.id}?title=${encodeURIComponent(item.title)}&posterUrl=${encodeURIComponent(item.posterUrl ?? '')}&mediaType=${item.mediaType}`
            )
          }
        />
      )}
      getItemLayout={(_, index) => ({
        length: GEM_W,
        offset: (GEM_W + ITEM_SEP) * index,
        index,
      })}
    />
  );
}
