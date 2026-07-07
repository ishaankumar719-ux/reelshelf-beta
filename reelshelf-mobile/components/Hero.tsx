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
        <Pressable
          style={styles.btnPrimary}
          onPress={() => console.log('[Phase 3] Surprise Me pressed — no-op')}
          android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
        >
          <Text style={styles.btnPrimaryLabel}>Surprise Me</Text>
        </Pressable>

        <Pressable
          style={styles.btnOutline}
          onPress={() => console.log('[Phase 3] Browse Collections pressed — no-op')}
          android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
        >
          <Text style={styles.btnOutlineLabel}>Browse Collections</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginTop:    RS.spacing.xs,
    marginBottom: RS.spacing.sm,
  },
  heading: {
    paddingHorizontal: RS.spacing.md,
    fontSize:          RS.typography.display,
    fontWeight:        '800',
    fontFamily:        Fonts?.serif,
    color:             RS.colors.textPrimary,
    letterSpacing:     -0.8,
    lineHeight:        40,
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
  btnPrimary: {
    flex:            1,
    backgroundColor: RS.colors.accent,
    borderRadius:    RS.card.radius,
    paddingVertical: RS.spacing.sm + 2,
    alignItems:      'center',
  },
  btnPrimaryLabel: {
    fontSize:   RS.typography.body,
    fontWeight: '700',
    color:      '#ffffff',
  },
  btnOutline: {
    flex:            1,
    borderWidth:     1,
    borderColor:     RS.colors.border,
    borderRadius:    RS.card.radius,
    paddingVertical: RS.spacing.sm + 2,
    alignItems:      'center',
  },
  btnOutlineLabel: {
    fontSize:   RS.typography.body,
    fontWeight: '600',
    color:      RS.colors.textSecondary,
  },
});
