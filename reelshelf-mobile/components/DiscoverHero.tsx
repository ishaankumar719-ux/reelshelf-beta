import { StyleSheet, Text, View } from 'react-native';

import { Fonts, RS } from '@/constants/theme';

export function DiscoverHero() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Discover</Text>
      <Text style={styles.subtitle}>Find your next favourite story.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop:        RS.spacing.xl,
    paddingHorizontal: RS.spacing.md,
    gap:               RS.spacing.xs,
  },
  title: {
    fontSize:      42,
    fontFamily:    Fonts?.serif,
    fontWeight:    '700',
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.tight,
    lineHeight:    48,
  },
  subtitle: {
    fontSize:   RS.typography.subheading,
    fontWeight: '400',
    color:      RS.colors.textSecondary,
    lineHeight: 22,
  },
});
