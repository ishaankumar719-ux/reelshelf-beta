import { StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';

interface SectionHeaderProps {
  eyebrow?: string;   // tiny uppercase label above the title
  title:    string;
  subtitle?: string;
}

export function SectionHeader({ eyebrow, title, subtitle }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      {eyebrow ? (
        <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: RS.spacing.md,
    paddingBottom:     RS.spacing.sm,
    gap:               3,
  },
  eyebrow: {
    fontSize:      RS.typography.overline,
    fontWeight:    '700',
    color:         RS.colors.textMuted,
    letterSpacing: RS.letterSpacing.widest,
  },
  title: {
    fontSize:      RS.typography.heading,
    fontWeight:    '700',
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.tight,
  },
  subtitle: {
    fontSize:   RS.typography.subheading,
    fontWeight: '400',
    color:      RS.colors.textSecondary,
    lineHeight: 20,
  },
});
