import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';
import type { EarnedBadge } from '@/lib/supabase/badges';
import { getMediaKey } from '@/utils/listKeys';

interface AchievementsRowProps {
  badges:  EarnedBadge[] | null;
  loading: boolean;
}

// Surfaces the EXISTING badges/user_badges data (already populated by
// existing triggers, e.g. trg_grant_beta_badges) — no new schema, this is
// purely a first-time mobile UI for real, already-earned badges.
export function AchievementsRow({ badges, loading }: AchievementsRowProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Achievements</Text>
      {loading ? (
        <ActivityIndicator color={RS.colors.accent} />
      ) : (badges?.length ?? 0) === 0 ? (
        <Text style={styles.emptyText}>No achievements yet.</Text>
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={badges!}
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
  heading: {
    fontSize:      RS.typography.overline,
    fontWeight:    '700',
    color:         RS.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: RS.letterSpacing.wide,
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
  card: {
    width:             86,
    alignItems:        'center',
    gap:               4,
    borderRadius:      RS.card.radius,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    backgroundColor:   RS.colors.card,
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
