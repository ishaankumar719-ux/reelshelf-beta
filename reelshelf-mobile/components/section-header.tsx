import { StyleSheet, Text, View } from 'react-native';

import { RS, Fonts } from '@/constants/theme';

interface SectionHeaderProps {
  eyebrow?: string;
  title:    string;
  subtitle?: string;
  /** When true, renders the title in the editorial serif typeface (ui-serif / New York on iOS). */
  titleSerif?: boolean;
}

export function SectionHeader({ eyebrow, title, subtitle, titleSerif }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      {eyebrow ? (
        <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>
      ) : null}
      <Text style={[styles.title, titleSerif ? { fontFamily: Fonts?.serif } : undefined]}>
        {title}
      </Text>
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
