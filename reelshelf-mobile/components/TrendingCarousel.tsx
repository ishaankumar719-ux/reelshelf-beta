import { FlatList, type ListRenderItemInfo, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { PosterCard } from '@/components/poster-card';
import { RS } from '@/constants/theme';
import { type SeedCardItem, trendingToday } from '@/data/seedHomeContent';

const POSTER_W = RS.card.trendingWidth;   // 120 — larger than standard 100
const POSTER_H = RS.card.trendingHeight;  // 178 — maintains 2:3 ratio
const ITEM_SEP = 12;                      // wider gap for breathing room between posters
const REFLECT_H = 18;                     // subtle floor-reflection height

export function TrendingCarousel() {
  return (
    <FlatList<SeedCardItem>
      data={trendingToday}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={() => <View style={{ width: ITEM_SEP }} />}
      contentContainerStyle={styles.list}
      snapToInterval={POSTER_W + ITEM_SEP}
      decelerationRate="fast"
      renderItem={({ item }: ListRenderItemInfo<SeedCardItem>) => (
        // Wrapper includes the poster card + subtle reflection below
        <View style={styles.itemWrap}>
          <PosterCard
            title={item.title}
            year={item.year}
            mediaType={item.mediaType}
            posterUrl={item.posterUrl}
            width={POSTER_W}
            height={POSTER_H}
          />
          {/* Floor reflection: faint upward-fading sheen beneath each card */}
          <LinearGradient
            colors={['rgba(255,255,255,0.055)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.reflection, { width: POSTER_W, height: REFLECT_H }]}
            pointerEvents="none"
          />
        </View>
      )}
      getItemLayout={(_, index) => ({
        length: POSTER_W,
        offset: (POSTER_W + ITEM_SEP) * index,
        index,
      })}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: RS.spacing.md,
    paddingBottom:     REFLECT_H,  // room for reflection without clipping
  },
  itemWrap: {
    gap: 0,  // no gap — reflection connects flush to card bottom
  },
  reflection: {
    borderBottomLeftRadius:  RS.card.radius,
    borderBottomRightRadius: RS.card.radius,
    opacity:                 0.85,
  },
});
