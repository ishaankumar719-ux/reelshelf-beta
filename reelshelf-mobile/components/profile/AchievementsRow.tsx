import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';
import type { EarnedBadge } from '@/lib/supabase/badges';
import { getMediaKey } from '@/utils/listKeys';

interface AchievementsRowProps {
  badges:  EarnedBadge[] | null;
  loading: boolean;
  /** Caps the row to a preview count (e.g. 4 on the Profile overview) — the
   *  parent renders its own header + "View All" affordance, matching the
   *  Lists/Diary preview pattern elsewhere on this screen. Omit for the
   *  full, unlimited list (the dedicated "View All Achievements" screen). */
  limit?:  number;
}

// Surfaces the EXISTING badges/user_badges data (already populated by
// existing triggers, e.g. trg_grant_beta_badges) — no new schema, this is
// purely a first-time mobile UI for real, already-earned badges. No own
// heading — the parent (ProfileView overview, or the achievements screen)
// renders its own section header, consistent with how every other preview
// section on this screen owns its header + "See All"/"View All" control.
export function AchievementsRow({ badges, loading, limit }: AchievementsRowProps) {
  const visible = limit !== undefined ? (badges ?? []).slice(0, limit) : badges;
  return (
    <View style={styles.wrap}>
      {loading ? (
        <ActivityIndicator color={RS.colors.accent} />
      ) : (visible?.length ?? 0) === 0 ? (
        <Text style={styles.emptyText}>No achievements yet.</Text>
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={visible!}
          keyExtractor={(item) => getMediaKey('badge', item.id)}
          contentContainerStyle={styles.row}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.icon}>{item.icon ?? '🏅'}</Text>
              <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
              {item.rarity ? <Text style={styles.rarity}>{item.rarity}</Text> : null}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: RS.spacing.xs,
  },
  emptyText: {
    fontSize:   RS.typography.body,
    color:      RS.colors.textMuted,
    fontStyle:  'italic',
    paddingVertical: RS.spacing.xs,
  },
  row: {
    gap:             RS.spacing.sm,
    paddingVertical: RS.spacing.xs,
  },
  // Tonal separation instead of a border — a secondary/preview-weight card,
  // distinguished from the base background by fill alone (matches the app's
  // established "no unnecessary borders" convention for lower-emphasis cards).
  card: {
    width:             86,
    alignItems:        'center',
    gap:               4,
    borderRadius:      RS.card.radius,
    backgroundColor:   RS.colors.elevated,
    paddingVertical:   RS.spacing.sm + 2,
    paddingHorizontal: RS.spacing.xs,
  },
  icon: {
    fontSize: 28,
  },
  name: {
    fontSize:   RS.typography.caption,
    fontWeight: '600',
    color:      RS.colors.textPrimary,
    textAlign:  'center',
    lineHeight: 14,
  },
  rarity: {
    fontSize:      9,
    color:         RS.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: RS.letterSpacing.wide,
  },
});
