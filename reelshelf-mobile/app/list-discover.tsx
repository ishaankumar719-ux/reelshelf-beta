// Real port of the website's app/lists/page.tsx + ListsDiscoveryClient.tsx —
// public lists only, exactly 3 real sort modes (Trending/Most Liked/Recent,
// confirmed via WEBSITE_SOCIAL_DISCOVERY_AUDIT.md — no Staff Picks, no
// Friend Lists, neither is real anywhere on the website). One fetch of up to
// 100 public lists, sorted client-side per mode — same architecture as the
// real ListsDiscoveryClient.tsx, not 3 separate queries.
import { useEffect, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListCard } from '@/components/lists/ListCard';
import { SkeletonBlock } from '@/components/Skeleton';
import { RS } from '@/constants/theme';
import { fetchDiscoveryLists, type DiscoveryListSummary } from '@/lib/supabase/lists';
import { getMediaKey } from '@/utils/listKeys';

type SortMode = 'trending' | 'liked' | 'recent';

// Exact real labels — ListsDiscoveryClient.tsx's SORT_LABELS.
const SORT_LABELS: Record<SortMode, string> = {
  trending: 'Trending',
  liked:    'Most Liked',
  recent:   'Recent',
};
const SORT_MODES: SortMode[] = ['trending', 'liked', 'recent'];

type Status = 'loading' | 'success' | 'error';

function SortPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.sortPill, active && styles.sortPillActive]} onPress={onPress}>
      <Text style={[styles.sortLabel, active && styles.sortLabelActive]}>{label}</Text>
    </Pressable>
  );
}

export default function ListDiscoverScreen() {
  const [status, setStatus] = useState<Status>('loading');
  const [lists, setLists] = useState<DiscoveryListSummary[]>([]);
  const [sort, setSort] = useState<SortMode>('trending');

  useEffect(() => {
    let cancelled = false;
    fetchDiscoveryLists()
      .then((data) => { if (!cancelled) { setLists(data); setStatus('success'); } })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, []);

  // Exact real comparators — ListsDiscoveryClient.tsx's `sorted` useMemo.
  const sorted = useMemo(() => {
    const copy = [...lists];
    if (sort === 'trending') {
      copy.sort((a, b) => b.trendingScore - a.trendingScore || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sort === 'liked') {
      copy.sort((a, b) => b.likeCount - a.likeCount || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return copy;
  }, [lists, sort]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={22} color={RS.colors.textPrimary} />
        </Pressable>
        <Text style={styles.header}>Discover Lists</Text>
        <View style={{ width: 22 }} />
      </View>
      <Text style={styles.subtitle}>Explore rankings, recommendations and collections from the ReelShelf community.</Text>

      <View style={styles.sortRow}>
        {SORT_MODES.map((mode) => (
          <SortPill
            key={mode}
            label={SORT_LABELS[mode]}
            active={sort === mode}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setSort(mode);
            }}
          />
        ))}
      </View>

      {status === 'loading' ? (
        <View style={styles.skeletonList}>
          {[0, 1, 2].map((i) => (
            <SkeletonBlock key={getMediaKey('discover-lists-skeleton', i)} height={220} radius={RS.card.radius} style={{ marginHorizontal: RS.spacing.md }} />
          ))}
        </View>
      ) : status === 'error' ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Couldn&apos;t load lists — check your connection.</Text>
        </View>
      ) : sorted.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Nobody has created any public lists yet.</Text>
        </View>
      ) : (
        <FlatList<DiscoveryListSummary>
          data={sorted}
          keyExtractor={(item) => getMediaKey('discover-list', item.id)}
          renderItem={({ item }) => <ListCard list={item} onPress={() => router.push(`/list/${item.id}`)} />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: RS.spacing.md }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: RS.colors.base },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: RS.spacing.lg },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: RS.spacing.md, paddingTop: RS.spacing.sm, paddingBottom: RS.spacing.xs,
  },
  header: { fontSize: RS.typography.subheading, fontWeight: '700', color: RS.colors.textPrimary },
  subtitle: {
    fontSize: RS.typography.caption, color: RS.colors.textMuted, lineHeight: 16,
    paddingHorizontal: RS.spacing.md, marginBottom: RS.spacing.md,
  },
  sortRow: { flexDirection: 'row', gap: RS.spacing.xs, paddingHorizontal: RS.spacing.md, marginBottom: RS.spacing.md },
  sortPill: {
    borderRadius: RS.button.radius, borderWidth: 0.5, borderColor: RS.colors.border,
    backgroundColor: RS.colors.elevated, paddingHorizontal: 14, paddingVertical: 7,
  },
  sortPillActive: { backgroundColor: RS.button.primaryFill, borderColor: RS.button.primaryBorder },
  sortLabel: { fontSize: RS.typography.caption, fontWeight: '700', color: RS.colors.textSecondary },
  sortLabelActive: { color: RS.button.primaryText },
  emptyText: { fontSize: RS.typography.body, color: RS.colors.textMuted, textAlign: 'center' },
  skeletonList: { gap: RS.spacing.md },
  listContent: { paddingHorizontal: RS.spacing.md, paddingBottom: RS.tabBar.contentBottomPad },
});
