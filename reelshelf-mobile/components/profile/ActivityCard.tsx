import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';
import type { ActivityKind } from '@/lib/supabase/recentActivity';

const KIND_ICON: Record<ActivityKind, React.ComponentProps<typeof MaterialIcons>['name']> = {
  watched:  'visibility',
  rated:    'grade',
  reviewed: 'rate-review',
  shelved:  'bookmark-add',
  listed:   'playlist-add',
};

interface ActivityCardProps {
  kind:      ActivityKind;
  verbLabel: string;
  /** Already-formatted detail string (e.g. "8.7 / 10" or a list title) —
   *  ratings use the app's established numeric-decimal convention, same as
   *  the Reviews tab, never a star-glyph treatment. */
  detail?:   string;
  title:     string;
  poster:    string | null;
  timeLabel: string;
  onPress?:  () => void;
}

// Editorial restyle of what was a plain row — same underlying ActivityItem
// data (lib/supabase/recentActivity.ts), just presented as a small card with
// an icon-badged verb instead of a bare label.
export function ActivityCard({ kind, verbLabel, detail, title, poster, timeLabel, onPress }: ActivityCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress} disabled={!onPress}>
      {poster ? (
        <Image source={{ uri: poster }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]} />
      )}
      <View style={styles.meta}>
        <View style={styles.verbRow}>
          <View style={styles.verbBadge}>
            <MaterialIcons name={KIND_ICON[kind]} size={11} color={RS.colors.accent} />
          </View>
          <Text style={styles.verb}>{verbLabel}{detail ? ` · ${detail}` : ''}</Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.time}>{timeLabel}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             RS.spacing.sm,
    borderRadius:    RS.card.radius,
    borderWidth:     0.5,
    borderColor:     RS.colors.border,
    backgroundColor: RS.colors.card,
    padding:         RS.spacing.sm,
  },
  thumb: {
    width:        44,
    height:       66,
    borderRadius: 8,
  },
  thumbFallback: {
    backgroundColor: RS.colors.elevated,
  },
  meta: {
    flex: 1,
    gap:  3,
  },
  verbRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           5,
  },
  verbBadge: {
    width:            16,
    height:           16,
    borderRadius:     8,
    backgroundColor:  RS.colors.accentGlow,
    alignItems:       'center',
    justifyContent:   'center',
  },
  verb: {
    fontSize:      RS.typography.overline,
    fontWeight:    '700',
    color:         RS.colors.accent,
    textTransform: 'uppercase',
    letterSpacing: RS.letterSpacing.wide,
  },
  title: {
    fontSize:   RS.typography.body,
    fontWeight: '600',
    color:      RS.colors.textPrimary,
  },
  time: {
    fontSize: RS.typography.overline,
    color:    RS.colors.textMuted,
  },
});
