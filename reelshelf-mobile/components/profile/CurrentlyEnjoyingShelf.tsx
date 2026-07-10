import { FlatList, StyleSheet, Text, View } from 'react-native';

import { PosterCard } from '@/components/poster-card';
import { RS } from '@/constants/theme';
import type { CurrentlyEnjoyingData, EnjoyingItem } from '@/lib/supabase/currentlyEnjoying';
import { getMediaKey } from '@/utils/listKeys';

interface RowProps {
  label:        string;
  items:        EnjoyingItem[];
  onOpenDetail: (routeId: string, title: string, poster: string | null, mediaType: string) => void;
}

function Row({ label, items, onOpenDetail }: RowProps) {
  if (items.length === 0) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={items}
        keyExtractor={(item) => getMediaKey(item.mediaType, item.routeId)}
        contentContainerStyle={styles.posterRow}
        renderItem={({ item }) => (
          <PosterCard
            title={item.title}
            year={item.year}
            mediaType={item.mediaType as any}
            posterUrl={item.poster}
            onPress={() => onOpenDetail(item.routeId, item.title, item.poster, item.mediaType)}
          />
        )}
      />
    </View>
  );
}

interface CurrentlyEnjoyingShelfProps {
  data:         CurrentlyEnjoyingData;
  onOpenDetail: (routeId: string, title: string, poster: string | null, mediaType: string) => void;
}

// No real per-title progress data exists anywhere in the schema (see
// lib/supabase/currentlyEnjoying.ts) — every row here is an honest proxy
// ("on your shelf, not yet logged as finished" / "recently saved"), never a
// fabricated percentage or status. Renders nothing when every row is empty,
// same empty-section-omission convention used by Favourite Genres above it.
export function CurrentlyEnjoyingShelf({ data, onOpenDetail }: CurrentlyEnjoyingShelfProps) {
  const isEmpty =
    data.continueWatchingTv.length === 0 &&
    data.onYourShelfBooks.length === 0 &&
    data.recentlyAdded.length === 0;
  if (isEmpty) return null;

  return (
    <View style={styles.wrap}>
      <Row label="Continue Watching" items={data.continueWatchingTv} onOpenDetail={onOpenDetail} />
      <Row label="On Your Shelf" items={data.onYourShelfBooks} onOpenDetail={onOpenDetail} />
      <Row label="Recently Added" items={data.recentlyAdded} onOpenDetail={onOpenDetail} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: RS.spacing.md,
  },
  row: {
    gap: RS.spacing.xs,
  },
  rowLabel: {
    fontSize:      RS.typography.overline,
    fontWeight:    '700',
    color:         RS.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: RS.letterSpacing.wide,
  },
  posterRow: {
    gap:             RS.spacing.sm,
    paddingVertical: RS.spacing.xs,
  },
});
