import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';

interface HomeSignUpCTAProps {
  headline: string;
  body: string;
}

// Mobile-only Guest Home addition (no real-website equivalent to port —
// the real site has no inline sign-up prompts on Discover/Home, it's purely
// a logged-in-vs-not content difference). Reuses the exact same button/card
// tokens as every other card on this screen (RS.button.filledBg is "the one
// filled button per screen" token; guest layout has none of the sections
// that would otherwise use it, so this is a safe, single filled button for
// this state) rather than inventing new visual language.
export function HomeSignUpCTA({ headline, body }: HomeSignUpCTAProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.headline}>{headline}</Text>
      <Text style={styles.body}>{body}</Text>
      <View style={styles.btnRow}>
        <Pressable style={styles.btnFilled} onPress={() => router.push('/login?mode=signup')}>
          <Text style={styles.btnFilledLabel}>Create Account</Text>
        </Pressable>
        <Pressable style={styles.btnOutline} onPress={() => router.push('/login')}>
          <Text style={styles.btnOutlineLabel}>Sign In</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: RS.spacing.md,
    borderRadius:      RS.card.radius,
    borderWidth:        0.5,
    borderColor:        RS.colors.border,
    backgroundColor:    RS.colors.card,
    padding:            RS.spacing.md,
    gap:                RS.spacing.xs,
  },
  headline: {
    fontSize:   RS.typography.subheading,
    fontWeight: '700',
    color:      RS.colors.textPrimary,
  },
  body: {
    fontSize:   RS.typography.body,
    color:      RS.colors.textSecondary,
    lineHeight: 20,
    marginBottom: RS.spacing.xs,
  },
  btnRow: {
    flexDirection: 'row',
    gap:           RS.spacing.sm,
  },
  btnFilled: {
    borderRadius:      RS.button.radius,
    backgroundColor:   RS.button.filledBg,
    paddingHorizontal: RS.button.paddingH,
    paddingVertical:   RS.button.paddingV,
  },
  btnFilledLabel: {
    fontSize:      RS.typography.body,
    fontWeight:    '700',
    color:         RS.button.filledText,
    letterSpacing: RS.letterSpacing.wide,
  },
  btnOutline: {
    borderRadius:      RS.button.radius,
    borderWidth:        0.5,
    borderColor:        RS.button.primaryBorder,
    backgroundColor:    RS.button.primaryFill,
    paddingHorizontal:  RS.button.paddingH,
    paddingVertical:    RS.button.paddingV,
  },
  btnOutlineLabel: {
    fontSize:      RS.typography.body,
    fontWeight:    '700',
    color:         RS.button.primaryText,
    letterSpacing: RS.letterSpacing.wide,
  },
});
