import { FlatList, type ListRenderItemInfo, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { PosterCard } from '@/components/poster-card';
import { SectionHeader } from '@/components/section-header';
import { RS } from '@/constants/theme';
import { type SeedCardItem } from '@/data/seedHomeContent';
import { getMediaKey } from '@/utils/listKeys';

const ITEM_SEP = RS.spacing.sm;

interface BecauseYouLovedSectionProps {
  /** The title the rec is based on — becomes the section heading (serif) */
  title:    string;
  /** Editorial subtitle below the heading */
  subtitle: string;
  /** Poster cards for this mood group */
  items:    SeedCardItem[];
}

export function BecauseYouLovedSection({ title, subtitle, items }: BecauseYouLovedSectionProps) {
  return (
    <View style={styles.section}>
      <SectionHeader
        eyebrow="BECAUSE YOU LOVED"
        title={title}
        subtitle={subtitle}
        titleSerif
      />
      <FlatList<SeedCardItem>
        data={items}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => getMediaKey(item.mediaType, item.id)}
        ItemSeparatorComponent={() => <View style={{ width: ITEM_SEP }} />}
        contentContainerStyle={styles.list}
        snapToInterval={RS.card.posterWidth + ITEM_SEP}
        decelerationRate="fast"
        renderItem={({ item }: ListRenderItemInfo<SeedCardItem>) => (
          <PosterCard
            title={item.title}
            year={item.year}
            mediaType={item.mediaType}
            posterUrl={item.posterUrl}
            onPress={() =>
              router.push(
                `/media/${item.id}?title=${encodeURIComponent(item.title)}&posterUrl=${encodeURIComponent(item.posterUrl ?? '')}&mediaType=${item.mediaType}`
              )
            }
          />
        )}
        getItemLayout={(_, index) => ({
          length: RS.card.posterWidth,
          offset: (RS.card.posterWidth + ITEM_SEP) * index,
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
