import Ionicons from '@expo/vector-icons/Ionicons';
import { FlatList, type ListRenderItemInfo, StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';
import { type MediaType, type MockCardItem, featuredCards } from '@/data/mockHomeContent';

const BG: Record<MediaType, string> = {
  film: RS.gradient.featFilm,
  tv:   RS.gradient.featTv,
  book: RS.gradient.featBook,
};

const ICON: Record<MediaType, React.ComponentProps<typeof Ionicons>['name']> = {
  film: 'film-outline',
  tv:   'tv-outline',
  book: 'book-outline',
};

function FeaturedCard({ item }: { item: MockCardItem }) {
  const badge = RS.badge[item.mediaType];

  return (
    <View style={[styles.card, { backgroundColor: BG[item.mediaType] }]}>
      {/* Large centered icon to imply media type */}
      <View style={styles.iconWrap}>
        <Ionicons name={ICON[item.mediaType]} size={52} color="rgba(255,255,255,0.22)" />
      </View>

      {/* Footer: badge · title · year */}
      <View style={styles.footer}>
        <View style={[styles.badgePill, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeLabel, { color: badge.text }]}>{badge.label}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.year}>{item.year}</Text>
      </View>
    </View>
  );
}

const ITEM_SEP = RS.spacing.md;

export function FeaturedCarousel() {
  return (
    <FlatList<MockCardItem>
      data={featuredCards}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={() => <View style={{ width: ITEM_SEP }} />}
      contentContainerStyle={styles.list}
      renderItem={({ item }: ListRenderItemInfo<MockCardItem>) => <FeaturedCard item={item} />}
      getItemLayout={(_, index) => ({
        length: RS.card.featWidth,
        offset: (RS.card.featWidth + ITEM_SEP) * index,
        index,
      })}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: RS.spacing.md,
  },
  card: {
    width:        RS.card.featWidth,
    height:       RS.card.featHeight,
    borderRadius: 12,
    overflow:     'hidden',
    borderWidth:  0.5,
    borderColor:  RS.colors.border,
  },
  iconWrap: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  footer: {
    padding: RS.spacing.sm,
    gap:     RS.spacing.xs,
  },
  badgePill: {
    alignSelf:         'flex-start',
    borderRadius:      RS.badge.pillRadius,
    paddingHorizontal: 6,
    paddingVertical:   2,
  },
  badgeLabel: {
    fontSize:      8,
    fontWeight:    '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize:      RS.typography.heading - 2,
    fontWeight:    '700',
    color:         RS.colors.textPrimary,
    letterSpacing: -0.2,
    lineHeight:    22,
  },
  year: {
    fontSize: RS.typography.caption,
    color:    RS.colors.textMuted,
  },
});
