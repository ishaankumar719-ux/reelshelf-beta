import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { FlatList, type ListRenderItemInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { RS, Fonts } from '@/constants/theme';
import { discoverCollections, type SeedCollectionItem, type SeedCardItem } from '@/data/seedHomeContent';

// Preview card geometry
const CARD_W      = 176;
const CARD_H      = 220;
const POSTER_W    = Math.floor(CARD_W * 0.60);  // 105px
const POSTER_H    = Math.floor(POSTER_W * 1.5);  // 158px
const POSTER_TOP  = 10;
const POSTER_LEFT = Math.floor((CARD_W - POSTER_W) / 2);
const ITEM_SEP    = 12;

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

function CollectionPreviewCard({ item }: { item: SeedCollectionItem }) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push(`/collection/${item.id}`);
  };

  return (
    <Pressable onPress={handlePress}>
      <View style={styles.cardOuter}>
        <View style={styles.cardInner}>
          <StaticPosterStack items={item.items} />
          {/* Bottom text area */}
          <View style={styles.textArea}>
            <Text style={styles.collectionTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.storyCount}>{item.storyCount} stories</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export function CollectionsRow() {
  return (
    <FlatList<SeedCollectionItem>
      data={discoverCollections}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={() => <View style={{ width: ITEM_SEP }} />}
      contentContainerStyle={styles.list}
      snapToInterval={CARD_W + ITEM_SEP}
      decelerationRate="fast"
      renderItem={({ item }: ListRenderItemInfo<SeedCollectionItem>) => (
        <CollectionPreviewCard item={item} />
      )}
      getItemLayout={(_, index) => ({
        length: CARD_W,
        offset: (CARD_W + ITEM_SEP) * index,
        index,
      })}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: RS.spacing.md,
  },
  cardOuter: {
    width:         CARD_W,
    height:        CARD_H,
    borderRadius:  RS.card.radius,
    shadowColor:   RS.shadow.color,
    shadowOffset:  { width: 0, height: RS.shadow.offsetY },
    shadowOpacity: RS.shadow.opacity,
    shadowRadius:  RS.shadow.radius,
    elevation:     RS.shadow.android,
  },
  cardInner: {
    width:           CARD_W,
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
