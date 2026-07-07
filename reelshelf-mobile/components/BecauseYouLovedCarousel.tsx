import { FlatList, type ListRenderItemInfo, StyleSheet, View } from 'react-native';

import { PosterCard } from '@/components/poster-card';
import { SectionHeader } from '@/components/section-header';
import { RS } from '@/constants/theme';
import { type SeedCardItem, becauseYouLoved } from '@/data/seedHomeContent';

const ITEM_SEP = RS.spacing.sm;

interface BecauseYouLovedSectionProps {
  /** The title the rec is based on — becomes the section heading */
  title:    string;
  /** Editorial subtitle below the heading */
  subtitle: string;
}

export function BecauseYouLovedSection({ title, subtitle }: BecauseYouLovedSectionProps) {
  return (
    <View style={styles.section}>
      {/* "BECAUSE YOU LOVED" eyebrow + title as heading */}
      <SectionHeader
        eyebrow="BECAUSE YOU LOVED"
        title={title}
        subtitle={subtitle}
      />
      <FlatList<SeedCardItem>
        data={becauseYouLoved}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
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
