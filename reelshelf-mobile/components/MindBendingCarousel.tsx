import { FlatList, type ListRenderItemInfo, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { PosterCard } from '@/components/poster-card';
import { RS } from '@/constants/theme';
import { mindBendingFilms, type SeedCardItem } from '@/data/seedHomeContent';

// Poster size — slightly larger than standard trending cards
const POSTER_W  = 130;
const POSTER_H  = 195;
const ITEM_SEP  = 20;    // extra gap — shadows need breathing room

// Decorative shadow decorators: purely visual depth, no interaction
const SHADOW_CONFIGS = [
  { rotate: '9deg',  tx: 10, ty: 6,  scale: 0.90, opacity: 0.45, bg: '#1a1a2e' },
  { rotate: '-6deg', tx: -8, ty: 3,  scale: 0.95, opacity: 0.60, bg: '#14141e' },
] as const;

function StackedPosterItem({ item }: { item: SeedCardItem }) {
  return (
    <View style={styles.itemWrap}>
      {/* Decorative shadow layers — rendered in DOM first so they sit behind */}
      {SHADOW_CONFIGS.map((cfg, i) => (
        <View
          key={i}
          style={[
            styles.shadowDecorator,
            {
              width:            POSTER_W,
              height:           POSTER_H,
              borderRadius:     RS.card.radius,
              backgroundColor:  cfg.bg,
              opacity:          cfg.opacity,
              transform: [
                { scale:      cfg.scale      },
                { rotate:     cfg.rotate     },
                { translateX: cfg.tx         },
                { translateY: cfg.ty         },
              ],
            },
          ]}
          pointerEvents="none"
        />
      ))}

      {/* Main poster on top — fully interactive */}
      <View style={styles.mainPoster}>
        <PosterCard
          title={item.title}
          year={item.year}
          mediaType={item.mediaType}
          posterUrl={item.posterUrl}
          width={POSTER_W}
          height={POSTER_H}
          size="lg"
          onPress={() =>
            router.push(
              `/media/${item.id}?title=${encodeURIComponent(item.title)}&posterUrl=${encodeURIComponent(item.posterUrl ?? '')}&mediaType=${item.mediaType}`
            )
          }
        />
      </View>
    </View>
  );
}

export function MindBendingCarousel() {
  return (
    <FlatList<SeedCardItem>
      data={mindBendingFilms}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={() => <View style={{ width: ITEM_SEP }} />}
      contentContainerStyle={styles.list}
      snapToInterval={POSTER_W + ITEM_SEP}
      decelerationRate="fast"
      renderItem={({ item }: ListRenderItemInfo<SeedCardItem>) => (
        <StackedPosterItem item={item} />
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
    paddingBottom:     RS.spacing.lg,  // shadow decorators extend below — needs room
  },
  itemWrap: {
    width:  POSTER_W,
    height: POSTER_H + RS.spacing.lg,  // extra vertical room for downward shadow offset
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  // Absolute so decorators render behind the main poster without pushing layout
  shadowDecorator: {
    position:    'absolute',
    top:          0,
    left:         0,
    borderWidth:  0.5,
    borderColor:  'rgba(255,255,255,0.06)',
  },
  mainPoster: {
    position: 'absolute',
    top:       0,
    left:      0,
  },
});
