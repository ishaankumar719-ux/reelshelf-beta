import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';

export function Header() {
  return (
    <View style={styles.header}>
      {/* Left: wordmark only — minimal Sprint 3 nav */}
      <Text style={styles.wordmark}>ReelShelf</Text>

      {/* Right: search icon, notification bell, avatar — visual-only, no-op */}
      <View style={styles.right}>
        <Pressable
          hitSlop={10}
          onPress={() => router.push('/search')}
        >
          <MaterialIcons name="search" size={24} color={RS.colors.textSecondary} />
        </Pressable>
        <Pressable
          hitSlop={10}
          onPress={() => console.log('[Sprint 3] Notifications pressed — no-op')}
        >
          <MaterialIcons name="notifications-none" size={24} color={RS.colors.textSecondary} />
        </Pressable>
        <Pressable
          hitSlop={10}
          style={styles.avatar}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <MaterialIcons name="person" size={18} color={RS.colors.textSecondary} />
        </Pressable>
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
  wordmark: {
    fontSize:      26,
    fontWeight:    '800',
    color:         RS.colors.textPrimary,
    letterSpacing: -0.8,
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
