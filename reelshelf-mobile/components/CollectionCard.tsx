import { useCallback, useState } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { router } from 'expo-router';

import { RS, Fonts } from '@/constants/theme';
import { Motion } from '@/constants/motion';
import type { SeedCardItem, SeedCollectionItem } from '@/data/seedHomeContent';

// ── Card geometry ─────────────────────────────────────────────────────────────
const SCREEN_W = Dimensions.get('window').width;

// Card is 82% of viewport — next card peeks ~18% in the outer carousel
export const COLLECTION_CARD_W = Math.floor(SCREEN_W * 0.82);
const CARD_H = Math.floor(COLLECTION_CARD_W * 0.75);  // 4:3 ratio

// Inner poster slot: 42% of card width, 2:3 ratio, ~2 posters + 16% right peek visible
const INNER_POSTER_W   = Math.floor(COLLECTION_CARD_W * 0.42);
const INNER_POSTER_H   = Math.floor(INNER_POSTER_W * 1.5);
const INNER_ITEM_SEP   = 6;
const SNAP_INTERVAL    = INNER_POSTER_W + INNER_ITEM_SEP;
// Vertical centering of poster strip within the card bounds
const INNER_V_PAD      = Math.max(0, Math.floor((CARD_H - INNER_POSTER_H) / 2));

// Subtle static rotation per index — gives "physical card stack" quality
const ITEM_ROTATIONS = ['-1deg', '0.5deg', '-0.5deg', '1deg'] as const;

// ── Single poster tile inside the inner carousel ──────────────────────────────

function PosterTile({ cardItem, index }: { cardItem: SeedCardItem; index: number }) {
  const scale = useSharedValue<number>(1);
  const rotation = ITEM_ROTATIONS[index % ITEM_ROTATIONS.length];

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: rotation },
      { scale: scale.value },
    ],
  }));

  const onPressIn  = useCallback(() => {
    scale.value = withSpring(Motion.lift.depressScale, { damping: 18, stiffness: 260, mass: 0.8 });
  }, [scale]);
  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 14, stiffness: 200, mass: 0.8 });
  }, [scale]);
  const onPress    = useCallback(() => {
    router.push(
      `/media/${cardItem.id}?title=${encodeURIComponent(cardItem.title)}&posterUrl=${encodeURIComponent(cardItem.posterUrl ?? '')}&mediaType=${cardItem.mediaType}`
    );
  }, [cardItem]);

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress}>
      <Animated.View style={[styles.posterSlot, animStyle]}>
        {cardItem.posterUrl ? (
          <Image
            source={{ uri: cardItem.posterUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.posterFallback} />
        )}
      </Animated.View>
    </Pressable>
  );
}

// ── Paging dots ───────────────────────────────────────────────────────────────

function PagingDots({ count, active }: { count: number; active: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.dot, i === active && styles.dotActive]} />
      ))}
    </View>
  );
}

// ── Collection card ───────────────────────────────────────────────────────────

export function CollectionCard({ item }: { item: SeedCollectionItem }) {
  const [posterIndex, setPosterIndex] = useState<number>(0);

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x     = e.nativeEvent.contentOffset.x;
      const index = Math.round(x / SNAP_INTERVAL);
      setPosterIndex(Math.max(0, Math.min(index, item.items.length - 1)));
    },
    [item.items.length],
  );

  const navigateToCollection = useCallback(() => {
    router.push(`/collection/${item.id}`);
  }, [item.id]);

  const renderPoster = useCallback(
    ({ item: cardItem, index }: ListRenderItemInfo<SeedCardItem>) => (
      <PosterTile cardItem={cardItem} index={index} />
    ),
    [],
  );

  const keyExtractor = useCallback((c: SeedCardItem) => c.id, []);

  return (
    // Outer: float shadow — no overflow so iOS shadow renders correctly
    <View style={styles.outer}>
      {/* Inner: overflow:hidden clips poster strip + gradient to rounded rect */}
      <View style={styles.inner}>

        {/* ── Inner swipeable poster carousel ────────────────────────── */}
        <FlatList<SeedCardItem>
          data={item.items}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={renderPoster}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={() => <View style={{ width: INNER_ITEM_SEP }} />}
          contentContainerStyle={styles.innerListContent}
          snapToInterval={SNAP_INTERVAL}
          snapToAlignment="start"
          decelerationRate="fast"
          scrollEventThrottle={16}
          // Android: allow nested horizontal scroll inside outer horizontal FlatList
          nestedScrollEnabled
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          getItemLayout={(_, index) => ({
            length: INNER_POSTER_W,
            offset: SNAP_INTERVAL * index,
            index,
          })}
          // Prevent inner scroll from propagating upward on iOS when user is
          // intentionally swiping a poster. UIScrollView handles disambiguation
          // natively on iOS; nestedScrollEnabled covers Android.
          style={styles.innerList}
        />

        {/* ── Gradient scrim — bottom-to-top, over posters ─────────── */}
        <LinearGradient
          colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.22)', 'rgba(0,0,0,0.90)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* ── Text area — tapping navigates to full collection screen ── */}
        <Pressable style={styles.textArea} onPress={navigateToCollection}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          {item.description ? (
            <Text style={styles.description} numberOfLines={1}>{item.description}</Text>
          ) : null}
          <View style={styles.footer}>
            <PagingDots count={item.items.length} active={posterIndex} />
            <Text style={styles.count}>
              {item.storyCount} {item.storyCount === 1 ? 'story' : 'stories'}
            </Text>
          </View>
        </Pressable>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width:         COLLECTION_CARD_W,
    height:        CARD_H,
    borderRadius:  RS.card.radius,
    // Float shadow — same token as other Sprint 4 cards
    shadowColor:   RS.shadow.color,
    shadowOffset:  { width: 0, height: RS.shadow.offsetY },
    shadowOpacity: RS.shadow.opacity,
    shadowRadius:  RS.shadow.radius,
    elevation:     RS.shadow.android,
  },
  inner: {
    width:           COLLECTION_CARD_W,
    height:          CARD_H,
    borderRadius:    RS.card.radius,
    overflow:        'hidden',
    backgroundColor: '#0b0b14',
    borderWidth:     0.5,
    borderColor:     RS.colors.border,
  },
  innerList: {
    width:  COLLECTION_CARD_W,
    height: CARD_H,
  },
  innerListContent: {
    paddingVertical: INNER_V_PAD,
  },
  posterSlot: {
    width:         INNER_POSTER_W,
    height:        INNER_POSTER_H,
    borderRadius:  8,
    overflow:      'hidden',
    borderWidth:   0.5,
    borderColor:   'rgba(255,255,255,0.10)',
    // Per-poster depth shadow — stacked card feel
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius:  8,
    elevation:     5,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  posterFallback: {
    flex:            1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  textArea: {
    position:          'absolute',
    bottom:             0,
    left:               0,
    right:              0,
    paddingHorizontal:  RS.spacing.md,
    paddingBottom:      RS.spacing.md - 2,
    paddingTop:         RS.spacing.sm,
    gap:                4,
  },
  title: {
    fontSize:      RS.typography.body,
    fontWeight:    '700',
    fontFamily:    Fonts?.serif,
    color:         RS.colors.textPrimary,
    lineHeight:    22,
    letterSpacing: RS.letterSpacing.tight,
  },
  description: {
    fontSize:   RS.typography.caption,
    fontWeight: '400',
    color:      'rgba(255,255,255,0.32)',
    lineHeight: 15,
  },
  footer: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginTop:       1,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:            4,
  },
  dot: {
    width:           5,
    height:          4,
    borderRadius:    2,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  dotActive: {
    width:           10,  // active dot is wider — pill shape indicates position
    backgroundColor: RS.colors.textPrimary,
  },
  count: {
    fontSize:      9,
    fontWeight:    '600',
    color:         'rgba(255,255,255,0.42)',
    textTransform: 'uppercase',
    letterSpacing:  0.7,
  },
});
