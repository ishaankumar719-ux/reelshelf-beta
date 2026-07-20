import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SkeletonBlock } from '@/components/Skeleton';
import { RS } from '@/constants/theme';
import { fetchEarnedBadges, type EarnedBadge } from '@/lib/supabase/badges';
import { getMediaKey } from '@/utils/listKeys';

type Status = 'loading' | 'success' | 'error';

// Minimal "View All Achievements" screen — the real tap destination for the
// Profile overview's Achievements preview (limited to 4 cards there). Same
// existing badges/user_badges data, no new schema, no scoring/tier logic
// invented — a straightforward full-list view, consistent with how Person
// Detail/List Detail started minimal when a real destination was needed.
export default function AchievementsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [status, setStatus] = useState<Status>('loading');
  const [badges, setBadges] = useState<EarnedBadge[]>([]);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetchEarnedBadges(id)
      .then((data) => {
        if (cancelled) return;
        setBadges(data);
        setStatus('success');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
      });
    return () => { cancelled = true; };
  }, [id]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={22} color={RS.colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Achievements</Text>
        <View style={styles.backBtn} />
      </View>

      {status === 'loading' ? (
        <View style={styles.grid}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonBlock key={getMediaKey('achievements-skeleton', i)} width={104} height={104} radius={RS.card.radius} />
          ))}
        </View>
      ) : status === 'error' ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Couldn&apos;t load achievements.</Text>
        </View>
      ) : badges.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No achievements yet.</Text>
        </View>
      ) : (
        <FlatList
          data={badges}
          keyExtractor={(item) => getMediaKey('badge', item.id)}
          numColumns={3}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.icon}>{item.icon ?? '🏅'}</Text>
              <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
              {item.rarity ? <Text style={styles.rarity}>{item.rarity}</Text> : null}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: RS.colors.base },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: RS.spacing.lg },
  emptyText: { fontSize: RS.typography.body, color: RS.colors.textMuted, textAlign: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: RS.spacing.sm, paddingTop: RS.spacing.sm, paddingBottom: RS.spacing.sm,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: RS.typography.subheading, fontWeight: '700', color: RS.colors.textPrimary },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: RS.spacing.sm,
    paddingHorizontal: RS.spacing.md, paddingTop: RS.spacing.sm,
  },
  listContent: { paddingHorizontal: RS.spacing.md, paddingBottom: RS.tabBar.contentBottomPad, gap: RS.spacing.sm },
  row: { gap: RS.spacing.sm },
  card: {
    flex: 1, alignItems: 'center', gap: 4,
    borderRadius: RS.card.radius, backgroundColor: RS.colors.elevated,
    paddingVertical: RS.spacing.sm + 2, paddingHorizontal: RS.spacing.xs,
  },
  icon: { fontSize: 30 },
  name: { fontSize: RS.typography.caption, fontWeight: '600', color: RS.colors.textPrimary, textAlign: 'center', lineHeight: 14 },
  rarity: { fontSize: 9, color: RS.colors.textMuted, textTransform: 'uppercase', letterSpacing: RS.letterSpacing.wide },
});
