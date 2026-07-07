import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';

export function Header() {
  return (
    <View style={styles.header}>
      {/* Left: wordmark + BETA pill */}
      <View style={styles.left}>
        <Text style={styles.wordmark}>ReelShelf</Text>
        <View style={styles.betaBadge}>
          <Text style={styles.betaLabel}>{RS.badge.beta.label}</Text>
        </View>
      </View>

      {/* Right: search icon, notification bell, avatar */}
      <View style={styles.right}>
        <Pressable
          hitSlop={10}
          onPress={() => console.log('[Phase 3] Search pressed — no-op')}
        >
          <MaterialIcons name="search" size={24} color={RS.colors.textSecondary} />
        </Pressable>
        <Pressable
          hitSlop={10}
          onPress={() => console.log('[Phase 3] Notifications pressed — no-op')}
        >
          <MaterialIcons name="notifications-none" size={24} color={RS.colors.textSecondary} />
        </Pressable>
        <View style={styles.avatar}>
          <MaterialIcons name="person" size={18} color={RS.colors.textSecondary} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: RS.spacing.md,
    paddingTop:        RS.spacing.sm,
    paddingBottom:     RS.spacing.xs,
  },
  left: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           RS.spacing.sm,
  },
  wordmark: {
    fontSize:      26,
    fontWeight:    '800',
    color:         RS.colors.textPrimary,
    letterSpacing: -0.8,
  },
  betaBadge: {
    backgroundColor:   RS.badge.beta.bg,
    borderRadius:      RS.badge.pillRadius,
    paddingHorizontal: RS.spacing.sm,
    paddingVertical:   2,
  },
  betaLabel: {
    fontSize:      RS.typography.caption,
    fontWeight:    '700',
    color:         RS.badge.beta.text,
    letterSpacing: 0.5,
  },
  right: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           RS.spacing.md,
  },
  avatar: {
    width:           32,
    height:          32,
    borderRadius:    16,
    backgroundColor: RS.colors.elevated,
    borderWidth:     1,
    borderColor:     RS.colors.border,
    alignItems:      'center',
    justifyContent:  'center',
  },
});
