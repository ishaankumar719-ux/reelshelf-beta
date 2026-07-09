import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { FlatList, type ListRenderItemInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { RS } from '@/constants/theme';
import { awardWinners, type SeedAwardItem } from '@/data/seedHomeContent';

// Landscape card geometry
const CARD_W  = 280;
const CARD_H  = 148;
const THUMB_W = 88;   // portrait poster occupies left column
const ITEM_SEP = 12;

function AwardCard({ item }: { item: SeedAwardItem }) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push(
      `/media/${item.id}?title=${encodeURIComponent(item.title)}&posterUrl=${encodeURIComponent(item.posterUrl ?? '')}&mediaType=${item.mediaType}`
    );
  };

  const initial = item.title[0]?.toUpperCase() ?? '';

  return (
    <Pressable onPress={handlePress}>
      <View style={styles.outer}>
        {/* Inner: overflow:hidden clips everything to card shape */}
        <View style={styles.inner}>

          {/* Left: portrait poster thumbnail */}
          <View style={styles.thumb}>
            {item.posterUrl ? (
              <Image
                source={{ uri: item.posterUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <LinearGradient
                colors={['#1a1a2a', '#0c0c14']}
                style={[StyleSheet.absoluteFill, styles.fallbackCenter]}
              >
                <Text style={styles.fallbackLetter}>{initial}</Text>
              </LinearGradient>
            )}
            {/* Edge fade to blend into dark card body */}
            <LinearGradient
              colors={['transparent', 'rgba(10,10,16,0.95)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          </View>

          {/* Right: text content */}
          <View style={styles.textArea}>
            <Text style={styles.award} numberOfLines={1}>{item.award}</Text>
            <Text style={styles.title} numberOfLines={3}>{item.title}</Text>
            <Text style={styles.year}>{item.year}</Text>
          </View>

        </View>
      </View>
    </Pressable>
  );
}

export function AwardWinnersCarousel() {
  return (
    <FlatList<SeedAwardItem>
      data={awardWinners}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={() => <View style={{ width: ITEM_SEP }} />}
      contentContainerStyle={styles.list}
      snapToInterval={CARD_W + ITEM_SEP}
      decelerationRate="fast"
      renderItem={({ item }: ListRenderItemInfo<SeedAwardItem>) => (
        <AwardCard item={item} />
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
    backgroundColor: '#0a0a10',
    flexDirection:   'row',
  },
  thumb: {
    width:           THUMB_W,
    height:          CARD_H,
  },
  fallbackCenter: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  fallbackLetter: {
    fontSize:   28,
    fontWeight: '700',
    color:      RS.colors.textMuted,
  },
  textArea: {
    flex:              1,
    paddingHorizontal: RS.spacing.sm + 4,
    paddingVertical:   RS.spacing.md,
    justifyContent:    'center',
    gap:               RS.spacing.xs,
  },
  award: {
    fontSize:      RS.typography.overline,
    fontWeight:    '700',
    color:         RS.colors.accent,
    letterSpacing: RS.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  title: {
    fontSize:      RS.typography.subheading,
    fontWeight:    '700',
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.tight,
    lineHeight:    20,
  },
  year: {
    fontSize: RS.typography.caption,
    color:    RS.colors.textMuted,
  },
});
