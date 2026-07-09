import { FlatList, type ListRenderItemInfo, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { PosterCard } from '@/components/poster-card';
import { RS } from '@/constants/theme';
import type { TmdbRecommendation } from '@/lib/tmdb';

const ITEM_SEP = RS.spacing.sm;

interface MediaRecommendationsProps {
  items: TmdbRecommendation[];
}

// TMDB's native /recommendations endpoint only ever returns same-media-type
// results (a movie recommends other movies) — this is deliberately labeled
// "Recommendations", not "Related Stories": the fuller cross-media editorial
// version (books/TV crossover, editorial framing) remains backlogged.
export function MediaRecommendations({ items }: MediaRecommendationsProps) {
  if (items.length === 0) return null;

  return (
    <FlatList<TmdbRecommendation>
      data={items}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={() => <View style={{ width: ITEM_SEP }} />}
      contentContainerStyle={styles.list}
      renderItem={({ item }: ListRenderItemInfo<TmdbRecommendation>) => (
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
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: RS.spacing.md,
  },
});
