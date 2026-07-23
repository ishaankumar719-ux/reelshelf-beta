import { FlatList, type ListRenderItemInfo, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { PosterCard } from '@/components/poster-card';
import { SectionHeader } from '@/components/section-header';
import { RS } from '@/constants/theme';
import { type SeedCardItem } from '@/data/seedHomeContent';
import { getMediaKey } from '@/utils/listKeys';

const ITEM_SEP = RS.spacing.sm;

export interface BecauseYouLovedItem extends SeedCardItem {
  /** Real generated "why" text for this specific item (generateReasons()[0])
   *  — matches the website's own per-card reason line (DiscoverClient.tsx's
   *  `.p-card-reason`). Optional so this component still works for any
   *  future non-scored caller. */
  reason?: string;
}

interface BecauseYouLovedSectionProps {
  /** The title the rec is based on — becomes the section heading (serif) */
  title:    string;
  /** Editorial subtitle below the heading */
  subtitle: string;
  /** Poster cards for this mood group */
  items:    BecauseYouLovedItem[];
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
      <FlatList<BecauseYouLovedItem>
        data={items}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => getMediaKey(item.mediaType, item.id)}
        ItemSeparatorComponent={() => <View style={{ width: ITEM_SEP }} />}
        contentContainerStyle={styles.list}
        snapToInterval={RS.card.posterWidth + ITEM_SEP}
        decelerationRate="fast"
        renderItem={({ item }: ListRenderItemInfo<BecauseYouLovedItem>) => (
          <View style={{ width: RS.card.posterWidth }}>
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
            {item.reason ? (
              <Text style={styles.reason} numberOfLines={2}>{item.reason}</Text>
            ) : null}
          </View>
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
  reason: {
    marginTop:  RS.spacing.xs,
    fontSize:   RS.typography.caption,
    color:      RS.colors.textMuted,
    lineHeight: 14,
  },
});
