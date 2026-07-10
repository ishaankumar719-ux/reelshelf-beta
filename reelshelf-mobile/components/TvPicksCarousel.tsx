import * as Haptics from 'expo-haptics';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { FlatList, type ListRenderItemInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { RS } from '@/constants/theme';
import { usePressLift } from '@/hooks/usePressLift';
import { tvPicks, type SeedCardItem } from '@/data/seedHomeContent';
import { getMediaKey } from '@/utils/listKeys';

// Landscape card — portrait poster fills the frame via contentFit="cover"
const CARD_W  = 264;
const CARD_H  = 160;
const ITEM_SEP = 12;

function TvPickCard({ item }: { item: SeedCardItem }) {
  const initial = item.title[0]?.toUpperCase() ?? '';
  const { style: animStyle, onPressIn, onPressOut } = usePressLift('lift');

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push(
      `/media/${item.id}?title=${encodeURIComponent(item.title)}&posterUrl=${encodeURIComponent(item.posterUrl ?? '')}&mediaType=${item.mediaType}`
    );
  };

  return (
    <Pressable onPress={handlePress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[styles.outer, animStyle]}>
        <View style={styles.inner}>

          {/* Full-bleed artwork — portrait poster zoomed/cropped to fill landscape card */}
          {item.posterUrl ? (
            <Image
              source={{ uri: item.posterUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <LinearGradient
              colors={['#111118', '#0a0a12']}
              style={[StyleSheet.absoluteFill, styles.fallback]}
            >
              <Text style={styles.fallbackLetter}>{initial}</Text>
            </LinearGradient>
          )}

          {/* Heavy gradient scrim — title needs to be legible over any artwork */}
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.92)']}
            start={{ x: 0, y: 0.2 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          {/* TV badge — top-left */}
          <View style={[styles.badge, { backgroundColor: RS.badge.tv.bg }]}>
            <Text style={[styles.badgeLabel, { color: RS.badge.tv.text }]}>TV</Text>
          </View>

          {/* Bold title — bottom-left, confident scale */}
          <View style={styles.titleArea}>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.year}>{item.year}</Text>
          </View>

        </View>
      </Animated.View>
    </Pressable>
  );
}

export function TvPicksCarousel() {
  return (
    <FlatList<SeedCardItem>
      data={tvPicks}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => getMediaKey(item.mediaType, item.id)}
      ItemSeparatorComponent={() => <View style={{ width: ITEM_SEP }} />}
      contentContainerStyle={styles.list}
      snapToInterval={CARD_W + ITEM_SEP}
      decelerationRate="fast"
      renderItem={({ item }: ListRenderItemInfo<SeedCardItem>) => (
        <TvPickCard item={item} />
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
  outer: {
    width:         CARD_W,
    height:        CARD_H,
    borderRadius:  RS.card.radius,
    shadowColor:   RS.shadow.color,
    shadowOffset:  { width: 0, height: RS.shadow.offsetY },
    shadowOpacity: RS.shadow.opacity,
    shadowRadius:  RS.shadow.radius,
    elevation:     RS.shadow.android,
  },
  inner: {
    flex:            1,
    borderRadius:    RS.card.radius,
    overflow:        'hidden',
    borderWidth:     0.5,
    borderColor:     RS.colors.border,
    backgroundColor: '#0a0a12',
    justifyContent:  'flex-end',
  },
  fallback: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  fallbackLetter: {
    fontSize:   44,
    fontWeight: '700',
    color:      RS.colors.textMuted,
  },
  badge: {
    position:          'absolute',
    top:               RS.spacing.sm,
    left:              RS.spacing.sm,
    borderRadius:      RS.badge.pillRadius,
    paddingHorizontal: 6,
    paddingVertical:   2,
  },
  badgeLabel: {
    fontSize:      8,
    fontWeight:    '700',
    letterSpacing: 0.5,
  },
  titleArea: {
    paddingHorizontal: RS.spacing.md,
    paddingBottom:     RS.spacing.md,
    gap:               3,
  },
  title: {
    fontSize:      RS.typography.heading - 1,   // 19px — prominent but not oversized
    fontWeight:    '800',
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.tight,
    lineHeight:    24,
  },
  year: {
    fontSize: RS.typography.caption,
    color:    'rgba(255,255,255,0.55)',
  },
});
