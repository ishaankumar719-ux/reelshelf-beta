import { useCallback, useEffect, useState } from 'react';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RS } from '@/constants/theme';
import { fetchLeaderboard, type LeaderboardEntry } from '@/lib/supabase/leaderboard';

type Status = 'loading' | 'success' | 'error';

function initialsFor(entry: LeaderboardEntry): string {
  const value = entry.displayName || entry.username || 'R';
  return value.slice(0, 1).toUpperCase();
}

export default function LeaderboardScreen() {
  const [status, setStatus] = useState<Status>('loading');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setStatus('loading');
    try {
      setEntries(await fetchLeaderboard());
      setStatus('success');
    } catch {
      setStatus('error');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
          <MaterialIcons name="arrow-back" size={22} color={RS.colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Top Collectors</Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={entries}
        keyExtractor={(entry) => entry.userId}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={RS.colors.accent} />}
        ListHeaderComponent={
          <View style={styles.intro}>
            <Text style={styles.eyebrow}>COMMUNITY LEADERBOARD</Text>
            <Text style={styles.copy}>Ranked by real achievement XP. Only public profiles appear here.</Text>
          </View>
        }
        ListEmptyComponent={
          status === 'loading' ? <Text style={styles.emptyText}>Loading collectors…</Text>
            : status === 'error' ? <Text style={styles.emptyText}>Couldn&apos;t load the leaderboard. Pull to try again.</Text>
              : <Text style={styles.emptyText}>No achievements have been earned yet.</Text>
        }
        renderItem={({ item, index }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/profile/${item.userId}`)}>
            <Text style={[styles.rank, index < 3 && styles.rankTop]}>{index + 1}</Text>
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.avatarInitial}>{initialsFor(item)}</Text></View>
            )}
            <View style={styles.identity}>
              <Text style={styles.name} numberOfLines={1}>{item.displayName || item.username || 'ReelShelf member'}</Text>
              {item.username ? <Text style={styles.username} numberOfLines={1}>@{item.username}</Text> : null}
            </View>
            <View style={styles.score}>
              <Text style={styles.xp}>{item.totalXP} XP</Text>
              <Text style={styles.tier}>{item.tier}</Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: RS.colors.base },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: RS.spacing.sm, paddingVertical: RS.spacing.sm },
  backButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: RS.typography.subheading, fontWeight: '700', color: RS.colors.textPrimary },
  content: { paddingHorizontal: RS.spacing.md, paddingBottom: RS.spacing.xxl, gap: RS.spacing.sm },
  intro: { gap: RS.spacing.xs, paddingTop: RS.spacing.sm, paddingBottom: RS.spacing.md },
  eyebrow: { fontSize: RS.typography.overline, fontWeight: '700', color: RS.colors.accent, letterSpacing: RS.letterSpacing.widest },
  copy: { fontSize: RS.typography.body, color: RS.colors.textSecondary, lineHeight: 20 },
  emptyText: { fontSize: RS.typography.body, color: RS.colors.textMuted, textAlign: 'center', paddingVertical: RS.spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: RS.spacing.sm, borderRadius: RS.card.radius, backgroundColor: RS.colors.card, padding: RS.spacing.sm + 4 },
  rank: { width: 20, fontSize: RS.typography.body, fontWeight: '700', color: RS.colors.textMuted, textAlign: 'center' },
  rankTop: { color: RS.colors.gold },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: RS.colors.elevated },
  avatarInitial: { fontSize: RS.typography.subheading, fontWeight: '700', color: RS.colors.textMuted },
  identity: { flex: 1, gap: 2 },
  name: { fontSize: RS.typography.body, fontWeight: '700', color: RS.colors.textPrimary },
  username: { fontSize: RS.typography.caption, color: RS.colors.textMuted },
  score: { alignItems: 'flex-end', gap: 2 },
  xp: { fontSize: RS.typography.caption, fontWeight: '700', color: RS.colors.accent },
  tier: { fontSize: RS.typography.micro, fontWeight: '700', color: RS.colors.textMuted, textTransform: 'uppercase', letterSpacing: RS.letterSpacing.wide },
});
