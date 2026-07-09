import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';

interface MediaAwardsProps {
  awards?: { name: string; category: string }[];
}

// Only-if-data-exists per the brief. Deliberately styled with neutral/accent
// colors rather than RS.colors.gold — that token is explicitly flagged in
// constants/theme.ts as "not yet used on mobile — define usage before
// introducing," so this component doesn't unilaterally spend that design
// decision; see RETURN's open question about a first real usage of it.
export function MediaAwards({ awards }: MediaAwardsProps) {
  if (!awards || awards.length === 0) return null;

  return (
    <View style={styles.list}>
      {awards.map((award, i) => (
        <View key={i} style={styles.pill}>
          <MaterialCommunityIcons name="trophy-outline" size={16} color={RS.colors.accent} />
          <View style={styles.textCol}>
            <Text style={styles.name} numberOfLines={1}>{award.name}</Text>
            <Text style={styles.category} numberOfLines={1}>{award.category}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: RS.spacing.md,
    gap:               RS.spacing.sm,
  },
  pill: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               RS.spacing.sm,
    borderRadius:      RS.card.radius,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    backgroundColor:   RS.colors.card,
    paddingHorizontal: RS.spacing.md,
    paddingVertical:   RS.spacing.sm + 2,
  },
  textCol: {
    flex: 1,
    gap:  2,
  },
  name: {
    fontSize:   RS.typography.body,
    fontWeight: '600',
    color:      RS.colors.textPrimary,
  },
  category: {
    fontSize: RS.typography.caption,
    color:    RS.colors.textMuted,
  },
});
