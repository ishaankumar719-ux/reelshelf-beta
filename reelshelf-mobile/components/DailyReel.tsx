import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';

import { RS, Fonts } from '@/constants/theme';
import { dailyReelPick } from '@/data/seedHomeContent';

const SCREEN_W  = Dimensions.get('window').width;
const ARTWORK_W = SCREEN_W - 2 * RS.spacing.md;
const ARTWORK_H = RS.card.featuredArtHeight;

export function DailyReel() {
  const badge = RS.badge[dailyReelPick.mediaType];

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>DAILY REEL</Text>

      {/* ── Artwork card — two-layer shadow pattern ────────────────────────── */}
      <View style={[styles.artworkOuter, { width: ARTWORK_W, height: ARTWORK_H }]}>
        <View style={styles.artworkInner}>
          <Image
            source={{ uri: dailyReelPick.posterUrl ?? undefined }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={300}
          />

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.65)', 'rgba(0,0,0,0.94)']}
            start={{ x: 0, y: 0.30 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeLabel, { color: badge.text }]}>{badge.label}</Text>
          </View>

          <View style={styles.titleArea}>
            <Text style={styles.title} numberOfLines={2}>{dailyReelPick.title}</Text>
            <Text style={styles.year}>{dailyReelPick.year}</Text>
          </View>
        </View>
      </View>

      {/* ── Editorial description ─────────────────────────────────────────── */}
      <Text style={styles.description}>{dailyReelPick.description}</Text>

      {/* ── "Why ReelShelf picked this" tagline ──────────────────────────── */}
      <Text style={styles.reason}>{dailyReelPick.reason}</Text>

      {/* ── THE one filled button on the Home screen ─────────────────────── */}
      <Pressable
        style={({ pressed }) => [styles.btnPick, pressed && styles.btnPickPressed]}
        onPress={() => console.log("[Sprint 3] View Today's Pick — no-op")}
        android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
      >
        <Text style={styles.btnPickLabel}>View Today's Pick</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: RS.spacing.md,
    gap:               RS.spacing.md,
  },
  eyebrow: {
    fontSize:      RS.typography.overline,
    fontWeight:    '700',
    color:         RS.colors.textMuted,
    letterSpacing: RS.letterSpacing.widest,
  },

  // Two-layer shadow: outer holds shadow (no clip), inner clips overflow
  artworkOuter: {
    borderRadius:  RS.card.radius,
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius:  18,
    elevation:     14,
    alignSelf:     'flex-start',
  },
  artworkInner: {
    flex:            1,
    borderRadius:    RS.card.radius,
    overflow:        'hidden',
    borderWidth:     0.5,
    borderColor:     RS.colors.border,
    justifyContent:  'flex-end',
    backgroundColor: RS.colors.card,
  },
  badge: {
    position:          'absolute',
    top:               RS.spacing.sm,
    left:              RS.spacing.sm,
    borderRadius:      RS.badge.pillRadius,
    paddingHorizontal: 7,
    paddingVertical:   2,
  },
  badgeLabel: {
    fontSize:      8,
    fontWeight:    '700',
    letterSpacing: 0.6,
  },
  titleArea: {
    paddingHorizontal: RS.spacing.md,
    paddingBottom:     RS.spacing.md,
    gap:               4,
  },
  title: {
    fontSize:      RS.typography.heading,
    fontWeight:    '700',
    fontFamily:    Fonts?.serif,
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.tight,
    lineHeight:    26,
  },
  year: {
    fontSize:      RS.typography.caption,
    fontWeight:    '500',
    color:         RS.colors.textSecondary,
    letterSpacing: RS.letterSpacing.wide,
  },
  description: {
    fontSize:   RS.typography.body,
    fontWeight: '400',
    color:      RS.colors.textSecondary,
    lineHeight: 22,
  },
  reason: {
    fontSize:      RS.typography.caption,
    fontWeight:    '500',
    fontStyle:     'italic',
    color:         RS.colors.textMuted,
    lineHeight:    18,
  },
  btnPick: {
    backgroundColor:   RS.button.filledBg,
    borderRadius:      RS.button.radius,
    paddingVertical:   RS.button.paddingV,
    paddingHorizontal: RS.button.paddingH,
    alignSelf:         'flex-start',
  },
  btnPickPressed: {
    backgroundColor: '#179866',
  },
  btnPickLabel: {
    fontSize:      RS.typography.body,
    fontWeight:    '700',
    color:         RS.button.filledText,
    letterSpacing: RS.letterSpacing.wide,
  },
});
