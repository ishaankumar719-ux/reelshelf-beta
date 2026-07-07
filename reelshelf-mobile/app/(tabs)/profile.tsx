import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.sub}>Phase 2 placeholder</Text>
      </View>
      <Text style={styles.attribution}>
        This app uses the TMDB API but is not endorsed or certified by TMDB.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: RS.colors.base },
  inner: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            RS.spacing.sm,
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
  attribution: {
    textAlign:         'center',
    paddingHorizontal: RS.spacing.md,
    paddingBottom:     RS.spacing.md,
    fontSize:          RS.typography.caption,
    color:             RS.colors.textMuted,
    lineHeight:        16,
  },
});
