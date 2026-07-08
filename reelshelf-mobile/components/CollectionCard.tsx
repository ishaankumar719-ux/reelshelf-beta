import { useCallback, useEffect, useState } from 'react';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { RS, Fonts } from '@/constants/theme';
import type { SeedCardItem, SeedCollectionItem } from '@/data/seedHomeContent';

// ── Card geometry ──────────────────────────────────────────────────────────────
const SCREEN_W = Dimensions.get('window').width;

// Full content-column width (standard horizontal padding on both sides).
export const COLLECTION_CARD_W = SCREEN_W - 2 * RS.spacing.md;
const CARD_H = Math.floor(COLLECTION_CARD_W * 0.85);

// Front poster: 54% of card width, 2:3 ratio — large/dominant, fits within card height.
const FRONT_W     = Math.floor(COLLECTION_CARD_W * 0.54);
const FRONT_H     = Math.floor(FRONT_W * 1.5);
const POSTER_LEFT = Math.floor((COLLECTION_CARD_W - FRONT_W) / 2);
const POSTER_TOP  = 8;

const SWIPE_THRESHOLD = COLLECTION_CARD_W * 0.25;
const SWIPE_VELOCITY  = 700;    // px/s flick threshold (commits even below distance threshold)
const EXIT_MS         = 260;    // card exit animation duration

// ── Fan slot configs ───────────────────────────────────────────────────────────
// Slot 0 = front card. Higher slot = further back in the deck.
// Transforms applied in order: scale → rotate → translateX/Y (each around view center).
// tx/ty shift each card so its edge peeks out from behind the front card.
const SLOT_CONFIGS = [
  { rotate: '-1deg',  tx:  0,  ty:  0,  scale: 1.00, opacity: 1.00, zIndex: 4 },
  { rotate:  '6deg',  tx: 22,  ty:  4,  scale: 0.92, opacity: 0.78, zIndex: 3 },
  { rotate: '-9deg',  tx:-22,  ty:  6,  scale: 0.87, opacity: 0.63, zIndex: 2 },
  { rotate: '12deg',  tx: 30,  ty:  2,  scale: 0.83, opacity: 0.48, zIndex: 1 },
] as const;

// ── Paging dots ────────────────────────────────────────────────────────────────
function PagingDots({ count, active }: { count: number; active: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.dot, i === active && styles.dotActive]} />
      ))}
    </View>
  );
}

// ── Single poster visual ───────────────────────────────────────────────────────
function PosterImage({ item }: { item: SeedCardItem }) {
  return (
    // posterClip clips image to rounded rect (overflow:hidden).
    // Shadow lives on the PARENT Animated.View (no overflow, so shadow renders on iOS).
    <View style={styles.posterClip}>
      {item.posterUrl ? (
        <Image
          source={{ uri: item.posterUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={styles.posterFallback} />
      )}
    </View>
  );
}

// ── Fanned deck ───────────────────────────────────────────────────────────────
// Renders up to 4 poster cards in an absolute-positioned stack with organic rotation/offset.
// Slot 0 (front card) is interactive via PanGesture.
// Swipe left → advance to next poster. Swipe right → go back. Tap → navigate to detail.
// After a swipe commits, the exited card's slot immediately gets the next item (circular).

interface DeckProps {
  items:       SeedCardItem[];
  activeIndex: number;
  onAdvance:   (dir: 1 | -1) => void;
}

function FannedDeck({ items, activeIndex, onAdvance }: DeckProps) {
  const n        = Math.min(Math.max(items.length, 0), SLOT_CONFIGS.length);
  const dragX    = useSharedValue(0);
  const dragY    = useSharedValue(0);
  const entryScale = useSharedValue(1);   // springs 0.92→1 on each new front-card entrance

  const navigateFront = useCallback(() => {
    const front = items[activeIndex];
    if (!front) return;
    router.push(
      `/media/${front.id}?title=${encodeURIComponent(front.title)}&posterUrl=${encodeURIComponent(front.posterUrl ?? '')}&mediaType=${front.mediaType}`
    );
  }, [items, activeIndex]);

  const commitSwipe = useCallback((dir: 1 | -1) => {
    onAdvance(dir);
    entryScale.value = 0.92;
    entryScale.value = withSpring(1, { damping: 14, stiffness: 180 });
  }, [onAdvance, entryScale]);

  const gesture = Gesture.Pan()
    .minDistance(4)
    .onUpdate(e => {
      dragX.value = e.translationX;
      dragY.value = e.translationY * 0.2;   // resist vertical movement
    })
    .onEnd(e => {
      const dx       = e.translationX;
      const absVelX  = Math.abs(e.velocityX);
      const isTap    = Math.abs(dx) < 8 && Math.abs(e.translationY) < 8 && absVelX < 200;
      const isSwipe  = Math.abs(dx) > SWIPE_THRESHOLD || absVelX > SWIPE_VELOCITY;

      if (isTap) {
        // Short non-drag → treat as tap, navigate to front poster's detail screen
        dragX.value = withSpring(0, { damping: 20, stiffness: 260 });
        dragY.value = withSpring(0, { damping: 20, stiffness: 260 });
        runOnJS(navigateFront)();
      } else if (isSwipe) {
        // Committed swipe: fly the card off-screen, then advance index
        const dir: 1 | -1 = dx < 0 ? 1 : -1;    // left drag = advance (1), right drag = back (-1)
        const exitX = dir > 0 ? -SCREEN_W * 1.4 : SCREEN_W * 1.4;
        dragX.value = withTiming(exitX, { duration: EXIT_MS }, () => {
          dragX.value = 0;
          dragY.value = 0;
          runOnJS(commitSwipe)(dir);
        });
      } else {
        // Didn't reach threshold → spring back to resting position
        dragX.value = withSpring(0, { damping: 18, stiffness: 220 });
        dragY.value = withSpring(0, { damping: 18, stiffness: 220 });
      }
    });

  // Animated style for the front card: drag tracking + entrance spring + drag rotation.
  // Incorporates slot-0 config values (-1° base rotation, 0 offset) as baseline.
  const frontAnimStyle = useAnimatedStyle(() => {
    const rotDeg = -1 + dragX.value * 0.025;   // tilt slightly while dragging
    return {
      transform: [
        { scale:      entryScale.value },
        { rotate:     `${rotDeg}deg` },
        { translateX: dragX.value },
        { translateY: dragY.value },
      ],
    };
  });

  if (n === 0) return null;

  // Build [slot → item] pairs, then REVERSE so back cards render first (front card on top via z-order).
  const slots = Array.from({ length: n }, (_, slot) => ({
    slot,
    item: items[(activeIndex + slot) % items.length],
  })).reverse();

  return (
    <View style={styles.deckArea} pointerEvents="box-none">
      {slots.map(({ slot, item }) => {
        const cfg     = SLOT_CONFIGS[slot];
        const isFront = slot === 0;
        // Static props shared by all slots (no transform here to avoid override conflict)
        const slotStyle = {
          opacity: cfg.opacity,
          zIndex:  cfg.zIndex,
        };
        // Background-card transform — static, JS thread is fine
        const bgTransform = {
          transform: [
            { scale:      cfg.scale      },
            { rotate:     cfg.rotate     },
            { translateX: cfg.tx         },
            { translateY: cfg.ty         },
          ] as const,
        };

        if (isFront) {
          return (
            <GestureDetector key="slot-0" gesture={gesture}>
              <Animated.View style={[styles.posterWrapper, slotStyle, frontAnimStyle]}>
                <PosterImage item={item} />
              </Animated.View>
            </GestureDetector>
          );
        }

        return (
          <View key={`slot-${slot}`} style={[styles.posterWrapper, slotStyle, bgTransform]}>
            <PosterImage item={item} />
          </View>
        );
      })}
    </View>
  );
}

// ── Collection card ────────────────────────────────────────────────────────────
interface CollectionCardProps {
  item:                 SeedCollectionItem;
  onActiveColorChange?: (color: string | null) => void;
}

export function CollectionCard({ item, onActiveColorChange }: CollectionCardProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Notify atmosphere of the initial front poster's color on mount, clear on unmount
  useEffect(() => {
    const firstColor = item.items[0]?.dominantColors?.[0] ?? null;
    onActiveColorChange?.(firstColor);
    return () => { onActiveColorChange?.(null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateToCollection = useCallback(() => {
    router.push(`/collection/${item.id}`);
  }, [item.id]);

  const handleAdvance = useCallback((dir: 1 | -1) => {
    setActiveIndex(prev => {
      const next = (prev + dir + item.items.length) % item.items.length;
      const nextColor = item.items[next]?.dominantColors?.[0] ?? null;
      onActiveColorChange?.(nextColor);
      return next;
    });
  }, [item.items, onActiveColorChange]);

  return (
    // Outer: carries shadow — no overflow:hidden so iOS shadow renders correctly.
    <View style={styles.outer}>
      {/* Inner: overflow:hidden clips everything (deck, gradient, text) to card shape. */}
      <View style={styles.inner}>

        {/* ── Fanned poster deck ──────────────────────────────────────── */}
        <FannedDeck
          items={item.items}
          activeIndex={activeIndex}
          onAdvance={handleAdvance}
        />

        {/* ── Gradient scrim — transparent at top, dark at bottom for text legibility ── */}
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.32)', 'rgba(0,0,0,0.93)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* ── Text area — tapping navigates to full collection page ─── */}
        <Pressable style={styles.textArea} onPress={navigateToCollection}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          {item.description ? (
            <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
          ) : null}
          <View style={styles.footer}>
            <PagingDots count={item.items.length} active={activeIndex} />
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
  // Deck area fills the entire inner card — text overlays the bottom via gradient.
  deckArea: {
    position: 'absolute',
    top:      0,
    left:     0,
    right:    0,
    bottom:   0,
  },
  // Base position for every card in the stack. Transforms (from SLOT_CONFIGS) move from here.
  posterWrapper: {
    position:     'absolute',
    left:          POSTER_LEFT,
    top:           POSTER_TOP,
    width:         FRONT_W,
    height:        FRONT_H,
    borderRadius:  10,
    // Shadow on this wrapper (no overflow:hidden here) → renders on iOS.
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 6 },
    shadowOpacity: 0.65,
    shadowRadius:  12,
    elevation:     8,
  },
  // Inner clip: rounds corners and clips the image. Separate from wrapper so shadow isn't killed.
  posterClip: {
    flex:            1,
    borderRadius:    10,
    overflow:        'hidden',
    borderWidth:     0.5,
    borderColor:     'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  posterFallback: {
    flex:            1,
    backgroundColor: 'rgba(255,255,255,0.06)',
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
    fontSize:      RS.typography.subheading,
    fontWeight:    '700',
    fontFamily:    Fonts?.serif,
    color:         RS.colors.textPrimary,
    lineHeight:    24,
    letterSpacing: RS.letterSpacing.tight,
  },
  description: {
    fontSize:   RS.typography.caption + 1,
    fontWeight: '400',
    color:      'rgba(255,255,255,0.48)',
    lineHeight: 17,
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
    width:           10,
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
