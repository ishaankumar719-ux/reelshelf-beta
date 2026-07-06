import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';

// Solid-color glow approximation used in place of a gradient.
// Wire expo-linear-gradient here in Phase 3 once it's installed.
export function Hero() {
  return (
    <View style={styles.hero}>
      <View style={styles.glow} pointerEvents="none" />

      <Text style={styles.heading}>{'Discover your\nnext story.'}</Text>
      <Text style={styles.sub}>Track films, series and books you love.</Text>

      <View style={styles.buttons}>
        <Pressable
          style={styles.btnPrimary}
          onPress={() => console.log('[Phase 2] Surprise Me pressed — no-op')}
          android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
        >
          <Text style={styles.btnPrimaryLabel}>Surprise Me</Text>
        </Pressable>

        <Pressable
          style={styles.btnOutline}
          onPress={() => console.log('[Phase 2] Browse pressed — no-op')}
          android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
        >
          <Text style={styles.btnOutlineLabel}>Browse</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginHorizontal: RS.spacing.md,
    marginTop:        RS.spacing.xs,
    marginBottom:     RS.spacing.sm,
    backgroundColor:  RS.colors.card,
    borderRadius:     12,
    padding:          RS.spacing.md,
    overflow:         'hidden',
    borderWidth:      0.5,
    borderColor:      RS.colors.border,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: RS.colors.accentGlow,
  },
  heading: {
    fontSize:      28,
    fontWeight:    '800',
    color:         RS.colors.textPrimary,
    letterSpacing: -0.8,
    lineHeight:    34,
    marginBottom:  RS.spacing.xs,
  },
  sub: {
    fontSize:     RS.typography.body,
    color:        RS.colors.textSecondary,
    lineHeight:   20,
    marginBottom: RS.spacing.md,
  },
  buttons: {
    flexDirection: 'row',
    gap:           RS.spacing.sm,
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
