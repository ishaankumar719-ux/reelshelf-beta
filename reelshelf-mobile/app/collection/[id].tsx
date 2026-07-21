// Real collection detail screen — the route param is a collection SLUG.
// Reads the shared collections/collection_items tables (verification_status
// ='verified' items only) via lib/supabase/collections.ts — a small, fixed,
// individually-verified list per collection, not a live TMDB discover query
// re-deriving the collection's rule (that's what this screen did before;
// replaced entirely now that the real table is the source of truth).
import { useEffect, useState } from 'react';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, type ListRenderItemInfo } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExpandEntrance } from '@/components/ExpandEntrance';
import { RS, Fonts } from '@/constants/theme';
import { useExpandOnPress } from '@/hooks/useExpandOnPress';
import { fetchCollectionBySlug, type CollectionCardData, type CollectionItemCard } from '@/lib/supabase/collections';
import { getMediaKey } from '@/utils/listKeys';

const THUMB_SIZE = 72;

function CollectionItem({ item }: { item: CollectionItemCard }) {
  const badgeMap = { film: RS.badge.film, tv: RS.badge.tv, book: RS.badge.book } as const;
  const badge = badgeMap[item.mediaType];

  const navigate = () => router.push(
    `/media/${item.id}?title=${encodeURIComponent(item.title)}&posterUrl=${encodeURIComponent(item.posterUrl ?? '')}&mediaType=${item.mediaType}&expand=1`
  );
  const { style: expandStyle, trigger } = useExpandOnPress(navigate);

  return (
    <Animated.View style={expandStyle}>
      <Pressable style={styles.itemRow} onPress={trigger}>
        <View style={styles.thumbOuter}>
          {item.posterUrl ? (
            <Image source={{ uri: item.posterUrl }} style={styles.thumb} contentFit="cover" transition={200} />
          ) : (
            <View style={[styles.thumb, styles.thumbFallback]} />
          )}
        </View>

        <View style={styles.itemMeta}>
          <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.itemFooter}>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
            </View>
            {item.year ? <Text style={styles.itemYear}>{item.year}</Text> : null}
          </View>
        </View>

        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </Animated.View>
  );
}

type Status = 'loading' | 'success' | 'error' | 'not-found';

export default function CollectionDetailScreen() {
  const { id, expand } = useLocalSearchParams<{ id: string; expand?: string }>();
  const isExpandEntry = expand === '1';

  const [status, setStatus] = useState<Status>('loading');
  const [collection, setCollection] = useState<CollectionCardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetchCollectionBySlug(id)
      .then((data) => {
        if (cancelled) return;
        if (!data) { setStatus('not-found'); return; }
        setCollection(data);
        setStatus('success');
      })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [id]);

  if (status === 'not-found') {
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

  const items = collection?.items ?? [];
  const renderItem = ({ item }: ListRenderItemInfo<CollectionItemCard>) => <CollectionItem item={item} />;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ExpandEntrance active={isExpandEntry}>
        <Pressable style={styles.backRow} onPress={() => router.back()}>
          <Text style={styles.backChevron}>‹</Text>
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>

        {status === 'loading' ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={RS.colors.accent} />
          </View>
        ) : status === 'error' ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Couldn&apos;t load this collection.</Text>
          </View>
        ) : (
          <FlatList<CollectionItemCard>
            data={items}
            keyExtractor={(item) => getMediaKey(item.mediaType, item.id)}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.header}>
                <Text style={styles.collectionTitle}>{collection?.title}</Text>
                <Text style={styles.collectionDesc}>{collection?.description}</Text>
                <Text style={styles.collectionCount}>
                  Collection · {items.length} title{items.length !== 1 ? 's' : ''}
                </Text>
              </View>
            }
            ListEmptyComponent={
              <Text style={styles.emptyInlineText}>No items in this collection right now.</Text>
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
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
  loadingWrap: {
    paddingTop: RS.spacing.xxl,
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: RS.spacing.md,
    paddingBottom:     RS.spacing.lg,
    gap:               RS.spacing.xs,
  },
  collectionTitle: {
    fontSize:      RS.typography.display - 8,
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
  emptyInlineText: {
    fontSize:          RS.typography.body,
    color:             RS.colors.textMuted,
    fontStyle:         'italic',
    textAlign:         'center',
    paddingHorizontal: RS.spacing.md,
    paddingTop:        RS.spacing.lg,
  },
});
