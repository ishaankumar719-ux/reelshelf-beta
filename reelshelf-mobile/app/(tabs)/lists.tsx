import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';

export default function ListsScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.inner}>
        <Text style={styles.title}>Lists</Text>
        <Text style={styles.sub}>Phase 1 placeholder</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: RS.colors.base },
  inner: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    gap:             RS.spacing.sm,
  },
  title: {
    fontSize:      RS.typography.heading,
    fontWeight:    '700',
    color:         RS.colors.textPrimary,
    letterSpacing: -0.3,
  },
  sub: {
    fontSize:      RS.typography.caption,
    color:         RS.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
