import * as Haptics from 'expo-haptics';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { RS, Fonts } from '@/constants/theme';
import { useExpandOnPress } from '@/hooks/useExpandOnPress';
import { usePressLift } from '@/hooks/usePressLift';
import type { SeedCardItem, SeedCollectionItem } from '@/data/seedHomeContent';

// Preview card geometry — shared by CollectionsRow (Discover) and Movie Detail's
// "Collections this belongs to" row. Do not fork a second copy of this styling.
export const COLLECTION_PREVIEW_CARD_W = 176;
const CARD_H      = 220;
const POSTER_W    = Math.floor(COLLECTION_PREVIEW_CARD_W * 0.60);  // 105px
const POSTER_H    = Math.floor(POSTER_W * 1.5);  // 158px
const POSTER_TOP  = 10;
const POSTER_LEFT = Math.floor((COLLECTION_PREVIEW_CARD_W - POSTER_W) / 2);

// Static slot configs — mirrored from CollectionCard SLOT_CONFIGS, scaled for smaller card
const STATIC_SLOTS = [
  { rotate: '-1deg', tx:  0,  ty: 0, scale: 1.00, opacity: 1.00, zIndex: 3 },
  { rotate:  '7deg', tx: 10,  ty: 3, scale: 0.91, opacity: 0.72, zIndex: 2 },
  { rotate: '-8deg', tx:-10,  ty: 5, scale: 0.86, opacity: 0.55, zIndex: 1 },
] as const;

function StaticPosterStack({ items }: { items: SeedCardItem[] }) {
  const slots = STATIC_SLOTS.slice(0, Math.min(items.length, STATIC_SLOTS.length));
  return (
    <View style={styles.deckArea} pointerEvents="none">
      {/* Render back slots first (lower zIndex) */}
      {[...slots].reverse().map((cfg, revIdx) => {
        const slotIdx = slots.length - 1 - revIdx;
        const item = items[slotIdx];
        if (!item) return null;
        const initial = item.title[0]?.toUpperCase() ?? '';
        return (
          <View
            key={slotIdx}
            style={[
              styles.posterSlot,
              {
                zIndex:  cfg.zIndex,
                opacity: cfg.opacity,
                transform: [
                  { scale:      cfg.scale      },
                  { rotate:     cfg.rotate     },
                  { translateX: cfg.tx         },
                  { translateY: cfg.ty         },
                ],
              },
            ]}
          >
            <View style={styles.posterClip}>
              {item.posterUrl ? (
                <Image
                  source={{ uri: item.posterUrl }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, styles.posterFallback]}>
                  <Text style={styles.posterFallbackLetter}>{initial}</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function CollectionPreviewCard({ item }: { item: SeedCollectionItem }) {
  const { style: animStyle, onPressIn, onPressOut } = usePressLift('lift');

  // Same expand transition (fade+scale fallback, resolved in Discover Phase 3 —
  // see hooks/useExpandOnPress.ts) used by Featured Collection/Book of the
  // Month, generalized here to every collection preview card — the same
  // component shared by Discover's Additional Collections row AND Movie
  // Detail's "Appears in" section, so this one change covers both surfaces.
  const navigate = () => router.push(`/collection/${item.id}?expand=1`);
  const { style: expandStyle, trigger } = useExpandOnPress(navigate);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    trigger();
  };

  return (
    <Pressable onPress={handlePress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={expandStyle}>
        <Animated.View style={[styles.cardOuter, animStyle]}>
          <View style={styles.cardInner}>
            <StaticPosterStack items={item.items} />
            {/* Bottom text area */}
            <View style={styles.textArea}>
              <Text style={styles.collectionTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.storyCount}>{item.storyCount} stories</Text>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    width:         COLLECTION_PREVIEW_CARD_W,
    height:        CARD_H,
    borderRadius:  RS.card.radius,
    shadowColor:   RS.shadow.color,
    shadowOffset:  { width: 0, height: RS.shadow.offsetY },
    shadowOpacity: RS.shadow.opacity,
    shadowRadius:  RS.shadow.radius,
    elevation:     RS.shadow.android,
  },
  cardInner: {
    width:           COLLECTION_PREVIEW_CARD_W,
    height:          CARD_H,
    borderRadius:    RS.card.radius,
    overflow:        'hidden',
    backgroundColor: '#0b0b14',
    borderWidth:     0.5,
    borderColor:     RS.colors.border,
    justifyContent:  'flex-end',
  },
  deckArea: {
    position: 'absolute',
    top:      0,
    left:     0,
    right:    0,
    // Height covers poster area only; text lives below
    height:   POSTER_H + POSTER_TOP + 12,
  },
  posterSlot: {
    position:     'absolute',
    left:          POSTER_LEFT,
    top:           POSTER_TOP,
    width:         POSTER_W,
    height:        POSTER_H,
    borderRadius:  8,
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius:  8,
    elevation:     6,
  },
  posterClip: {
    flex:            1,
    borderRadius:    8,
    overflow:        'hidden',
    borderWidth:     0.5,
    borderColor:     'rgba(255,255,255,0.10)',
  },
  posterFallback: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  posterFallbackLetter: {
    fontSize:   28,
    fontWeight: '700',
    color:      RS.colors.textMuted,
  },
  textArea: {
    paddingHorizontal: RS.spacing.sm + 2,
    paddingBottom:     RS.spacing.sm + 2,
    paddingTop:        RS.spacing.xs,
    gap:               2,
  },
  collectionTitle: {
    fontSize:      RS.typography.caption + 1,
    fontWeight:    '700',
    fontFamily:    Fonts?.serif,
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.tight,
    lineHeight:    16,
  },
  storyCount: {
    fontSize:      RS.typography.overline,
    fontWeight:    '500',
    color:         RS.colors.textMuted,
    letterSpacing: RS.letterSpacing.wide,
  },
});
