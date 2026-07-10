import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { RS } from '@/constants/theme';
import { useExpandOnPress } from '@/hooks/useExpandOnPress';
import type { Top4Item } from '@/lib/supabase/mountRushmore';

function toRouteId(dbMediaType: string, dbMediaId: string): string {
  const prefix = dbMediaType === 'movie' ? 'film' : dbMediaType;
  const bareId = dbMediaId.startsWith('tmdb-') ? dbMediaId.slice(5) : dbMediaId;
  return `${prefix}-${bareId}`;
}

interface TopStoriesGridProps {
  items:        Top4Item[];
  onOpenDetail: (routeId: string, title: string, poster: string | null, mediaType: string) => void;
}

function TopStoryCell({ item, onOpenDetail }: { item: Top4Item; onOpenDetail: TopStoriesGridProps['onOpenDetail'] }) {
  const routeId = toRouteId(item.mediaType, item.mediaId);
  const mobileMediaType = item.mediaType === 'movie' ? 'film' : item.mediaType;
  // Reuses the same source-side fade+scale transition as Discover's
  // hero-weight cards (Featured Collection/Book of the Month) — the
  // destination screen (app/media/[id].tsx) already mounts with a matching
  // entrance for every navigation into it, so no destination-side change
  // is needed here.
  const { style, trigger } = useExpandOnPress(() =>
    onOpenDetail(routeId, item.title, item.posterPath, mobileMediaType),
  );

  return (
    <Pressable style={styles.cell} onPress={trigger}>
      <Animated.View style={[styles.cellInner, style]}>
        {item.posterPath ? (
          <Image source={{ uri: item.posterPath }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.fallback]} />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          locations={[0.4, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.cellFooter}>
          <Text style={styles.cellTitle} numberOfLines={2}>{item.title}</Text>
          {item.year ? <Text style={styles.cellYear}>{item.year}</Text> : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

// "My Top Stories" (renamed from Top 4) — same mount_rushmore data/4 fixed
// positions, same tap-to-edit picker flow, now rendered as a large 2x2 grid
// instead of a small deck. Tapping a populated cell opens Movie Detail;
// editing the set is still a separate explicit "Edit" affordance (unchanged
// entry point, just relabeled/restyled by the caller).
export function TopStoriesGrid({ items, onOpenDetail }: TopStoriesGridProps) {
  const slots = [1, 2, 3, 4].map((pos) => items.find((i) => i.position === pos) ?? null);

  return (
    <View style={styles.grid}>
      {slots.map((item, i) =>
        item ? (
          <TopStoryCell key={item.position} item={item} onOpenDetail={onOpenDetail} />
        ) : (
          <View key={`empty-${i}`} style={[styles.cell, styles.cellEmptySlot]} />
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           RS.spacing.sm,
  },
  cell: {
    width:      '48%',
    aspectRatio: 2 / 3,
    shadowColor:   RS.shadow.color,
    shadowOffset:  { width: 0, height: RS.shadow.offsetY },
    shadowOpacity: RS.shadow.opacity,
    shadowRadius:  RS.shadow.radius,
    elevation:     RS.shadow.android,
  },
  cellInner: {
    flex:            1,
    borderRadius:    RS.card.radius,
    overflow:        'hidden',
    borderWidth:     0.5,
    borderColor:     RS.colors.border,
    justifyContent:  'flex-end',
    backgroundColor: RS.colors.card,
  },
  cellEmptySlot: {
    borderRadius:    RS.card.radius,
    borderWidth:     1,
    borderColor:     RS.colors.border,
    borderStyle:     'dashed',
    backgroundColor: 'transparent',
  },
  fallback: {
    backgroundColor: RS.colors.elevated,
  },
  cellFooter: {
    padding: RS.spacing.sm,
    gap:     2,
  },
  cellTitle: {
    fontSize:   RS.typography.body,
    fontWeight: '700',
    color:      RS.colors.textPrimary,
    lineHeight: 18,
  },
  cellYear: {
    fontSize: RS.typography.caption,
    color:    RS.colors.textMuted,
  },
});
