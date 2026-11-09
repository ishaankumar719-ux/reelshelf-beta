import { FlatList, type ListRenderItemInfo, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated from 'react-native-reanimated';

import { PosterCard } from '@/components/poster-card';
import { RS } from '@/constants/theme';
import type { MediaType } from '@/data/seedHomeContent';
import { useExpandOnPress } from '@/hooks/useExpandOnPress';
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
  /** Route prefix for the detail screen, e.g. "/discover" to open titles
   *  inside the Discover tab's stack. Defaults to the root /media route. */
  hrefBase?: string;
}

function Item({ item, hrefBase = '' }: { item: PosterRowItem; hrefBase?: string }) {
  // Same source-side fade+scale press feedback as the two original
  // hero-weight cards (Featured Collection, Book of the Month) and
  // Mount Rushmore's grid — the destination screen already mounts with a
  // matching fade+scale-in (ExpandEntrance) regardless of entry point, so
  // this just makes the press itself feel consistent everywhere too.
  const { style, trigger } = useExpandOnPress(() =>
    router.push(
      `${hrefBase}/media/${item.id}?title=${encodeURIComponent(item.title)}&posterUrl=${encodeURIComponent(item.posterUrl ?? '')}&mediaType=${item.mediaType}`
    ),
  );
  return (
    <Animated.View style={style}>
      <PosterCard
        title={item.title}
        year={item.year}
        mediaType={item.mediaType}
        posterUrl={item.posterUrl}
        onPress={trigger}
      />
    </Animated.View>
  );
}

// Single horizontal, virtualized (FlatList) poster row reused by every
// "more like this" style section on the Movie Detail screen — Because You
// Liked This, More from this Director, collection-sibling rows, Related
// Books, and the (currently empty) editorially-curated cross-media row.
export function MediaPosterRow({ items, hrefBase }: MediaPosterRowProps) {
  if (items.length === 0) return null;

  return (
    <FlatList<PosterRowItem>
      data={items}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => getMediaKey(item.mediaType, item.id)}
      ItemSeparatorComponent={() => <View style={{ width: ITEM_SEP }} />}
      contentContainerStyle={styles.list}
      renderItem={({ item }: ListRenderItemInfo<PosterRowItem>) => <Item item={item} hrefBase={hrefBase} />}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: RS.spacing.md,
  },
});
