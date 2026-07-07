import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FeaturedCarousel } from '@/components/FeaturedCarousel';
import { RS, Fonts } from '@/constants/theme';

export function Hero() {
  return (
    <View style={styles.hero}>
      <Text style={styles.heading}>{'Discover your\nnext story.'}</Text>
      <Text style={styles.sub}>Films, series, and books worth your time.</Text>

      <FeaturedCarousel />

      <View style={styles.buttons}>
        {/* Primary: subtle accent-tinted outlined pill */}
        <Pressable
          style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]}
          onPress={() => console.log('[Phase 3] Surprise Me pressed — no-op')}
          android_ripple={{ color: 'rgba(29,158,117,0.15)' }}
        >
          <Text style={styles.btnPrimaryLabel}>Surprise Me</Text>
        </Pressable>

        {/* Secondary: ghost pill, nearly invisible until pressed */}
        <Pressable
          style={({ pressed }) => [styles.btnSecondary, pressed && styles.btnSecondaryPressed]}
          onPress={() => console.log('[Phase 3] Browse Collections pressed — no-op')}
          android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
        >
          <Text style={styles.btnSecondaryLabel}>Browse Collections</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginTop:    RS.spacing.sm,
    marginBottom: RS.spacing.xs,
  },
  heading: {
    paddingHorizontal: RS.spacing.md,
    fontSize:          RS.typography.display,
    fontWeight:        '800',
    fontFamily:        Fonts?.serif,
    color:             RS.colors.textPrimary,
    letterSpacing:     RS.letterSpacing.tight,
    lineHeight:        44,
    marginBottom:      RS.spacing.xs,
  },
  sub: {
    paddingHorizontal: RS.spacing.md,
    fontSize:          RS.typography.subheading,
    fontWeight:        '400',
    color:             RS.colors.textSecondary,
    lineHeight:        22,
    marginBottom:      RS.spacing.md,
  },
  buttons: {
    flexDirection:     'row',
    gap:               RS.spacing.sm,
    paddingHorizontal: RS.spacing.md,
    marginTop:         RS.spacing.md,
  },
  // Primary: subtle accent-tinted pill (not a loud solid fill)
  btnPrimary: {
    flex:            1,
    borderWidth:     1,
    borderColor:     RS.button.primaryBorder,
    backgroundColor: RS.button.primaryFill,
    borderRadius:    RS.button.radius,
    paddingVertical: RS.button.paddingV,
    alignItems:      'center',
  },
  btnPrimaryLabel: {
    fontSize:      RS.typography.body,
    fontWeight:    '600',
    color:         RS.button.primaryText,
    letterSpacing: RS.letterSpacing.wide,
  },
  // Secondary: ghost pill, barely visible
  btnSecondary: {
    flex:            1,
    borderWidth:     1,
    borderColor:     RS.button.secondaryBorder,
    backgroundColor: 'transparent',
    borderRadius:    RS.button.radius,
    paddingVertical: RS.button.paddingV,
    alignItems:      'center',
  },
  btnSecondaryLabel: {
    fontSize:      RS.typography.body,
    fontWeight:    '500',
    color:         RS.button.secondaryText,
    letterSpacing: RS.letterSpacing.wide,
  },
  btnPressed: {
    backgroundColor: 'rgba(29,158,117,0.18)',
  },
  btnSecondaryPressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
});
