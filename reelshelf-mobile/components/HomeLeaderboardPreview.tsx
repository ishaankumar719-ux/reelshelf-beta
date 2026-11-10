import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { SectionHeader } from '@/components/section-header';
import { RS } from '@/constants/theme';
import { fetchLeaderboard, type LeaderboardEntry } from '@/lib/supabase/leaderboard';

function displayName(entry: LeaderboardEntry): string {
  return entry.displayName || entry.username || 'ReelShelf member';
}

export function HomeLeaderboardPreview() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboard(3)
      .then((data) => { if (!cancelled) setEntries(data); })
      .catch(() => { if (!cancelled) setEntries([]); });
    return () => { cancelled = true; };
  }, []);

  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <SectionHeader eyebrow="Community" title="Top Collectors" subtitle="The ReelShelf members building the biggest shelves." />
        <Pressable onPress={() => router.push('/leaderboard')} hitSlop={8}>
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      </View>
      <Pressable style={styles.card} onPress={() => router.push('/leaderboard')} accessibilityRole="button" accessibilityLabel="Open the community leaderboard">
        {entries === null ? (
          <ActivityIndicator color={RS.colors.accent} style={styles.loader} />
        ) : entries.length === 0 ? (
          <Text style={styles.empty}>The first collectors are still earning their place.</Text>
        ) : entries.map((entry, index) => (
          <View key={entry.userId} style={styles.row}>
            <Text style={[styles.rank, index === 0 && styles.rankFirst]}>{index + 1}</Text>
            {entry.avatarUrl ? (
              <Image source={{ uri: entry.avatarUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.initial}>{displayName(entry)[0]?.toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.identity}>
              <Text style={styles.name} numberOfLines={1}>{displayName(entry)}</Text>
              <Text style={styles.tier}>{entry.tier}</Text>
            </View>
            <Text style={styles.xp}>{entry.totalXP} XP</Text>
          </View>
        ))}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: RS.spacing.xs },
  headingRow: { flexDirection: 'row', alignItems: 'flex-end' },
  seeAll: { color: RS.colors.accent, fontSize: RS.typography.caption, fontWeight: '700', paddingRight: RS.spacing.md, paddingBottom: RS.spacing.sm },
  card: { marginHorizontal: RS.spacing.md, borderRadius: RS.card.radius, borderWidth: 0.5, borderColor: RS.colors.border, backgroundColor: RS.colors.card, padding: RS.spacing.sm + 2, gap: RS.spacing.xs },
  loader: { height: 132, justifyContent: 'center' },
  empty: { color: RS.colors.textMuted, fontSize: RS.typography.caption, textAlign: 'center', paddingVertical: RS.spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: RS.spacing.sm, minHeight: 42 },
  rank: { width: 18, textAlign: 'center', color: RS.colors.textMuted, fontSize: RS.typography.caption, fontWeight: '700' },
  rankFirst: { color: RS.colors.gold },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: RS.colors.elevated },
  initial: { color: RS.colors.textMuted, fontSize: RS.typography.caption, fontWeight: '700' },
  identity: { flex: 1, gap: 1 },
  name: { color: RS.colors.textPrimary, fontSize: RS.typography.caption, fontWeight: '700' },
  tier: { color: RS.colors.textMuted, fontSize: RS.typography.micro, fontWeight: '700', textTransform: 'uppercase', letterSpacing: RS.letterSpacing.wide },
  xp: { color: RS.colors.accent, fontSize: RS.typography.micro, fontWeight: '700' },
});
