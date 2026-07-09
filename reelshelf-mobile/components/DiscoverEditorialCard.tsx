import { StyleSheet, Text, View } from 'react-native';

import { Fonts, RS } from '@/constants/theme';

export function DiscoverEditorialCard() {
  return (
    <View style={styles.container}>
      <View style={styles.topBorder} />
      <View style={styles.content}>
        <Text style={styles.headline}>Films that{'\n'}changed cinema.</Text>
        <Text style={styles.supporting}>
          A curated thread through the stories that rewrote the rules.
        </Text>
      </View>
      <View style={styles.bottomBorder} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: RS.spacing.md,
  },
  topBorder: {
    height:          0.5,
    backgroundColor: RS.colors.border,
    marginBottom:    RS.spacing.lg,
  },
  bottomBorder: {
    height:          0.5,
    backgroundColor: RS.colors.border,
    marginTop:       RS.spacing.lg,
  },
  content: {
    gap: RS.spacing.sm,
  },
  headline: {
    fontSize:      32,
    fontFamily:    Fonts?.serif,
    fontWeight:    '700',
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.tight,
    lineHeight:    38,
  },
  supporting: {
    fontSize:   RS.typography.subheading,
    fontWeight: '400',
    color:      RS.colors.textSecondary,
    lineHeight: 22,
  },
});
