/**
 * PLACEHOLDER — minimal collection detail screen.
 * Receives: id via route params. Looks up collection from static seed data.
 * Phase 5 will replace with live data, filters, sort, and add/remove.
 */
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View, type ListRenderItemInfo } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExpandEntrance } from '@/components/ExpandEntrance';
import { RS, Fonts } from '@/constants/theme';
import { collections, type SeedCardItem } from '@/data/seedHomeContent';

const THUMB_SIZE = 72;

function CollectionItem({ item }: { item: SeedCardItem }) {
  const badgeMap = { film: RS.badge.film, tv: RS.badge.tv, book: RS.badge.book } as const;
  const badge    = badgeMap[item.mediaType as keyof typeof badgeMap] ?? RS.badge.film;

  const onPress = () => {
    router.push(
      `/media/${item.id}?title=${encodeURIComponent(item.title)}&posterUrl=${encodeURIComponent(item.posterUrl ?? '')}&mediaType=${item.mediaType}`
    );
  };

  return (
    <Pressable style={styles.itemRow} onPress={onPress}>
      {/* Thumbnail */}
      <View style={styles.thumbOuter}>
        {item.posterUrl ? (
          <Image
            source={{ uri: item.posterUrl }}
            style={styles.thumb}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]} />
        )}
      </View>

      {/* Title + badge + year */}
      <View style={styles.itemMeta}>
        <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.itemFooter}>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
          <Text style={styles.itemYear}>{item.year}</Text>
        </View>
      </View>

      {/* Tap affordance chevron */}
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export default function CollectionDetailScreen() {
  const { id, expand } = useLocalSearchParams<{ id: string; expand?: string }>();
  const collection = collections.find(c => c.id === id);
  const isExpandEntry = expand === '1';

  if (!collection) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <Pressable style={styles.backRow} onPress={() => router.back()}>
          <Text style={styles.backChevron}>‹</Text>
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Collection not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: ListRenderItemInfo<SeedCardItem>) => (
    <CollectionItem item={item} />
  );

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ExpandEntrance active={isExpandEntry}>
        {/* Back navigation */}
        <Pressable style={styles.backRow} onPress={() => router.back()}>
          <Text style={styles.backChevron}>‹</Text>
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>

        <FlatList<SeedCardItem>
          data={collection.items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.collectionTitle}>{collection.title}</Text>
              <Text style={styles.collectionDesc}>{collection.description}</Text>
              <Text style={styles.collectionCount}>
                {collection.storyCount} stories — showing {collection.items.length} previews
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </ExpandEntrance>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: RS.colors.base,
  },
  backRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: RS.spacing.md,
    paddingVertical:   RS.spacing.sm,
    gap:               4,
  },
  backChevron: {
    fontSize:   26,
    color:      RS.colors.textPrimary,
    lineHeight: 30,
    marginTop:  -2,
  },
  backLabel: {
    fontSize:   RS.typography.body,
    fontWeight: '500',
    color:      RS.colors.textPrimary,
  },
  header: {
    paddingHorizontal: RS.spacing.md,
    paddingBottom:     RS.spacing.lg,
    gap:               RS.spacing.xs,
  },
  collectionTitle: {
    fontSize:      RS.typography.display - 8,  // 28px — editorial but not oversized
    fontWeight:    '700',
    fontFamily:    Fonts?.serif,
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.tight,
    lineHeight:    36,
  },
  collectionDesc: {
    fontSize:   RS.typography.subheading,
    fontWeight: '400',
    color:      RS.colors.textSecondary,
    lineHeight: 22,
  },
  collectionCount: {
    fontSize:      RS.typography.overline,
    fontWeight:    '600',
    color:         RS.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: RS.letterSpacing.wide,
    marginTop:     RS.spacing.xs,
  },
  listContent: {
    paddingBottom: RS.spacing.xxxl,
  },
  itemRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: RS.spacing.md,
    paddingVertical:   RS.spacing.sm + 2,
    gap:               RS.spacing.sm + 4,
  },
  thumbOuter: {
    borderRadius:  8,
    overflow:      'hidden',
    shadowColor:   RS.shadow.color,
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.30,
    shadowRadius:  6,
    elevation:     3,
  },
  thumb: {
    width:        THUMB_SIZE,
    height:       Math.round(THUMB_SIZE * 1.5),
    borderRadius: 8,
  },
  thumbFallback: {
    backgroundColor: RS.colors.card,
  },
  itemMeta: {
    flex:  1,
    gap:   RS.spacing.xs,
  },
  itemTitle: {
    fontSize:      RS.typography.subheading,
    fontWeight:    '600',
    color:         RS.colors.textPrimary,
    lineHeight:    21,
    letterSpacing: RS.letterSpacing.tight,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           RS.spacing.xs,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:      RS.badge.pillRadius,
  },
  badgeText: {
    fontSize:      RS.typography.overline - 1,
    fontWeight:    '700',
    letterSpacing: RS.letterSpacing.widest,
  },
  itemYear: {
    fontSize:   RS.typography.caption,
    fontWeight: '400',
    color:      RS.colors.textMuted,
  },
  chevron: {
    fontSize:   20,
    color:      RS.colors.textMuted,
    marginLeft: RS.spacing.xs,
  },
  separator: {
    height:          0.5,
    marginHorizontal: RS.spacing.md,
    backgroundColor:  RS.colors.border,
  },
  empty: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: RS.typography.body,
    color:    RS.colors.textMuted,
  },
});
