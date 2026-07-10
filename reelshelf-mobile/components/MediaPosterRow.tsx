import { FlatList, type ListRenderItemInfo, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { PosterCard } from '@/components/poster-card';
import { RS } from '@/constants/theme';
import type { MediaType } from '@/data/seedHomeContent';
import { getMediaKey } from '@/utils/listKeys';

const ITEM_SEP = RS.spacing.sm;

/** Minimal shared shape every poster-row data source (TMDB recommendations,
 *  TMDB discover-by-director, local collection siblings, future curated
 *  cross-media picks) already satisfies — one row renderer for all of them. */
export interface PosterRowItem {
  id:        string;
  title:     string;
  year:      number | undefined;
  posterUrl: string | null;
  mediaType: MediaType;
}

interface MediaPosterRowProps {
  items: PosterRowItem[];
}

// Single horizontal, virtualized (FlatList) poster row reused by every
// "more like this" style section on the Movie Detail screen — Because You
// Liked This, More from this Director, collection-sibling rows, and the
// (currently empty) editorially-curated cross-media row.
export function MediaPosterRow({ items }: MediaPosterRowProps) {
  if (items.length === 0) return null;

  return (
    <FlatList<PosterRowItem>
      data={items}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => getMediaKey(item.mediaType, item.id)}
      ItemSeparatorComponent={() => <View style={{ width: ITEM_SEP }} />}
      contentContainerStyle={styles.list}
      renderItem={({ item }: ListRenderItemInfo<PosterRowItem>) => (
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
