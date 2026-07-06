import { StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';

export function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: RS.spacing.md,
    paddingTop:        RS.spacing.lg,
    paddingBottom:     RS.spacing.sm,
  },
  title: {
    fontSize:    RS.typography.heading,
    fontWeight:  '700',
    color:       RS.colors.textPrimary,
    letterSpacing: -0.3,
  },
});
