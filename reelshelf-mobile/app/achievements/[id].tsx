import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SkeletonBlock } from '@/components/Skeleton';
import { RS } from '@/constants/theme';
import {
  computeBadgeProgress, computeTotalXP, computeUserBadgeStats, fetchBadgeCatalog,
  fetchEarnedBadges, getTier,
  type BadgeProgress, type EarnedBadge, type LevelTier,
} from '@/lib/supabase/badges';
import { getMediaKey } from '@/utils/listKeys';

type Status = 'loading' | 'success' | 'error';

// "View All Achievements" screen — the real tap destination for the Profile
// overview's Achievements preview (limited to 4 cards there). Same existing
// badges/user_badges data, no new schema. Two mobile-only additions beyond
// the original minimal version: an XP/tier header and a progress-toward-
// next-badge list — both real formulas ported from the website's own
// lib/supabase/badges.ts, which computes them but never displays them
// anywhere (see WEBSITE_ACHIEVEMENTS_AUDIT.md §3, §10).
export default function AchievementsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [status, setStatus] = useState<Status>('loading');
  const [badges, setBadges] = useState<EarnedBadge[]>([]);
  const [totalXP, setTotalXP] = useState(0);
  const [tier, setTier] = useState<LevelTier>('Collector');
  const [progress, setProgress] = useState<BadgeProgress[]>([]);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    Promise.all([fetchEarnedBadges(id), fetchBadgeCatalog(), computeUserBadgeStats(id)])
      .then(([earned, catalog, stats]) => {
        if (cancelled) return;
        setBadges(earned);
        setTotalXP(computeTotalXP(earned));
        setTier(getTier(computeTotalXP(earned)));
        const earnedSlugs = new Set(earned.map((b) => b.slug));
        setProgress(
          computeBadgeProgress(catalog, earnedSlugs, stats)
            .sort((a, b) => b.percentage - a.percentage)
            .slice(0, 12),
        );
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
        <Pressable style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8}>
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
      ) : (
        <FlatList
          data={badges}
          keyExtractor={(item) => getMediaKey('badge', item.id)}
          numColumns={3}
          columnWrapperStyle={badges.length > 0 ? styles.row : undefined}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              {badges.length > 0 && (
                <View style={styles.tierHeader}>
                  <View style={styles.tierPill}>
                    <Text style={styles.tierPillLabel}>{tier}</Text>
                  </View>
                  <Text style={styles.xpText}>{totalXP} XP total</Text>
                </View>
              )}
              <Text style={styles.sectionLabel}>Earned ({badges.length})</Text>
            </>
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No achievements yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.icon}>{item.icon ?? '🏅'}</Text>
              <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
              {item.rarity ? <Text style={styles.rarity}>{item.rarity}</Text> : null}
            </View>
          )}
          ListFooterComponent={
            progress.length > 0 ? (
              <View style={styles.progressSection}>
                <Text style={styles.sectionLabel}>In progress</Text>
                {progress.map((p) => (
                  <View key={p.badge.slug} style={styles.progressRow}>
                    <Text style={styles.progressIcon}>{p.badge.icon ?? '🏅'}</Text>
                    <View style={styles.progressBody}>
                      <View style={styles.progressHeaderRow}>
                        <Text style={styles.progressName} numberOfLines={1}>{p.badge.name}</Text>
                        <Text style={styles.progressCount}>{p.current}/{p.max}</Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${p.percentage}%` as `${number}%` }]} />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : null
          }
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
  tierHeader: {
    flexDirection: 'row', alignItems: 'center', gap: RS.spacing.xs,
    marginBottom: RS.spacing.sm,
  },
  tierPill: { borderRadius: RS.badge.pillRadius, backgroundColor: RS.colors.elevated, paddingHorizontal: RS.spacing.sm, paddingVertical: 3 },
  tierPillLabel: { fontSize: RS.typography.micro, fontWeight: '700', color: RS.colors.accent, textTransform: 'uppercase', letterSpacing: RS.letterSpacing.wide },
  xpText: { fontSize: RS.typography.caption, fontWeight: '600', color: RS.colors.textMuted },
  sectionLabel: {
    fontSize: RS.typography.overline, fontWeight: '700', color: RS.colors.textMuted,
    textTransform: 'uppercase', letterSpacing: RS.letterSpacing.wide, marginBottom: RS.spacing.sm,
  },
  card: {
    flex: 1, alignItems: 'center', gap: 4,
    borderRadius: RS.card.radius, backgroundColor: RS.colors.elevated,
    paddingVertical: RS.spacing.sm + 2, paddingHorizontal: RS.spacing.xs,
  },
  icon: { fontSize: 30 },
  name: { fontSize: RS.typography.caption, fontWeight: '600', color: RS.colors.textPrimary, textAlign: 'center', lineHeight: 14 },
  rarity: { fontSize: RS.typography.micro, color: RS.colors.textMuted, textTransform: 'uppercase', letterSpacing: RS.letterSpacing.wide },
  progressSection: { marginTop: RS.spacing.lg, gap: RS.spacing.sm },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: RS.spacing.sm },
  progressIcon: { fontSize: 20, opacity: 0.5 },
  progressBody: { flex: 1, gap: 4 },
  progressHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressName: { flex: 1, fontSize: RS.typography.caption, fontWeight: '600', color: RS.colors.textSecondary },
  progressCount: { fontSize: RS.typography.micro, color: RS.colors.textMuted, fontVariant: ['tabular-nums'] },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: RS.colors.elevated, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: RS.colors.accent },
});
