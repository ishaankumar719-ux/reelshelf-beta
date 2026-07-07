import { StyleSheet, Text, View } from 'react-native';

import { RS, Fonts } from '@/constants/theme';

export function EditorialHeadline() {
  return (
    <View style={styles.container}>
      <Text style={styles.headline}>
        What story are you{'\n'}looking for today?
      </Text>
      <Text style={styles.subline}>Curated picks, honest shelves.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: RS.spacing.md,
    gap:               RS.spacing.sm,
  },
  headline: {
    fontSize:      RS.typography.display,
    fontWeight:    '800',
    fontFamily:    Fonts?.serif,
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.tight,
    lineHeight:    44,
  },
  subline: {
    fontSize:      RS.typography.subheading,
    fontWeight:    '400',
    color:         RS.colors.textSecondary,
    lineHeight:    22,
  },
});
