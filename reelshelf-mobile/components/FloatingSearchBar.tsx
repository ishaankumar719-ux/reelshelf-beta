import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';

export function FloatingSearchBar() {
  return (
    <View style={styles.wrapper}>
      <Pressable
        style={({ pressed }) => [styles.bar, pressed && styles.barPressed]}
        onPress={() => console.log('[Sprint 3] Search pressed — no-op')}
        android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
      >
        <MaterialIcons name="search" size={20} color={RS.colors.textMuted} />
        <Text style={styles.placeholder}>Search films, shows, books…</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: RS.spacing.md,
  },
  bar: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   RS.colors.elevated,
    borderRadius:      28,
    borderWidth:       1,
    borderColor:       RS.colors.border,
    paddingHorizontal: RS.spacing.md,
    paddingVertical:   14,
    gap:               RS.spacing.sm,
    shadowColor:       '#000',
    shadowOffset:      { width: 0, height: 4 },
    shadowOpacity:     0.30,
    shadowRadius:      10,
    elevation:         6,
  },
  barPressed: {
    backgroundColor: RS.colors.card,
  },
  placeholder: {
    fontSize:   RS.typography.body,
    fontWeight: '400',
    color:      RS.colors.textMuted,
    flex:       1,
  },
});
