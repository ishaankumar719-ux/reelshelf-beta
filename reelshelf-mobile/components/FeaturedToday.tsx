import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';

import { RS, Fonts } from '@/constants/theme';
import { featuredItem } from '@/data/seedHomeContent';

const SCREEN_W  = Dimensions.get('window').width;
const ARTWORK_W = SCREEN_W - 2 * RS.spacing.md;
const ARTWORK_H = RS.card.featuredArtHeight;  // 300px — biggest card on screen after hero

export function FeaturedToday() {
  const badge = RS.badge[featuredItem.mediaType];

  return (
    <View style={styles.container}>
      {/* Section label */}
      <Text style={styles.eyebrow}>FEATURED TODAY</Text>

      {/* ── Dominant artwork card ──────────────────────────────────────────── */}
      {/* Outer: shadow container — no overflow clip */}
      <View style={[styles.artworkOuter, { width: ARTWORK_W, height: ARTWORK_H }]}>
        {/* Inner: overflow hidden for image + gradient clipping */}
        <View style={styles.artworkInner}>
          <Image
            source={{ uri: featuredItem.posterUrl ?? undefined }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={300}
          />

          {/* Deep bottom gradient — title area sits in a darker band */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.65)', 'rgba(0,0,0,0.94)']}
            start={{ x: 0, y: 0.30 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          {/* Media-type badge — top left */}
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeLabel, { color: badge.text }]}>{badge.label}</Text>
          </View>

          {/* In-card title + year */}
          <View style={styles.titleArea}>
            <Text style={styles.title} numberOfLines={2}>
              {featuredItem.title}
            </Text>
            <Text style={styles.year}>{featuredItem.year}</Text>
          </View>
        </View>
      </View>

      {/* ── Editorial reason copy ──────────────────────────────────────────── */}
      <Text style={styles.reason}>{featuredItem.reason}</Text>

      {/* ── Action row: Log (ONE filled), Save (outlined), More Info (text) ── */}
      <View style={styles.actions}>
        {/* Log — THE ONE solid filled button on the Home screen */}
        <Pressable
          style={({ pressed }) => [styles.btnLog, pressed && styles.btnLogPressed]}
          onPress={() => console.log('[Phase 6] Log pressed — no-op')}
          android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
        >
          <Text style={styles.btnLogLabel}>Log</Text>
        </Pressable>

        {/* Save — outlined ghost */}
        <Pressable
          style={({ pressed }) => [styles.btnSave, pressed && styles.btnSavePressed]}
          onPress={() => console.log('[Phase 6] Save pressed — no-op')}
          android_ripple={{ color: 'rgba(29,158,117,0.12)' }}
        >
          <Text style={styles.btnSaveLabel}>Save</Text>
        </Pressable>

        {/* More Info — text-only, no border, minimal presence */}
        <Pressable
          style={({ pressed }) => [styles.btnInfo, pressed && styles.btnInfoPressed]}
          onPress={() => console.log('[Phase 6] More Info pressed — no-op')}
        >
          <Text style={styles.btnInfoLabel}>More Info</Text>
        </Pressable>
      </View>
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

  // ── Artwork card ─────────────────────────────────────────────────────────
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

  // ── Editorial reason ─────────────────────────────────────────────────────
  reason: {
    fontSize:   RS.typography.body,
    fontWeight: '400',
    color:      RS.colors.textSecondary,
    lineHeight: 22,
  },

  // ── Action buttons ────────────────────────────────────────────────────────
  actions: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           RS.spacing.sm,
  },

  // Log — ONLY solid filled button on the Home screen
  btnLog: {
    backgroundColor: RS.button.filledBg,
    borderRadius:    RS.button.radius,
    paddingVertical: RS.button.paddingV,
    paddingHorizontal: RS.button.paddingH,
  },
  btnLogPressed: {
    backgroundColor: '#179866',
  },
  btnLogLabel: {
    fontSize:      RS.typography.body,
    fontWeight:    '700',
    color:         RS.button.filledText,
    letterSpacing: RS.letterSpacing.wide,
  },

  // Save — outlined, no fill
  btnSave: {
    borderWidth:     1,
    borderColor:     RS.button.primaryBorder,
    borderRadius:    RS.button.radius,
    paddingVertical: RS.button.paddingV,
    paddingHorizontal: RS.button.paddingH,
    backgroundColor: 'transparent',
  },
  btnSavePressed: {
    backgroundColor: RS.button.primaryFill,
  },
  btnSaveLabel: {
    fontSize:      RS.typography.body,
    fontWeight:    '600',
    color:         RS.button.primaryText,
    letterSpacing: RS.letterSpacing.wide,
  },

  // More Info — text only, no border, barely there
  btnInfo: {
    paddingVertical:   RS.button.paddingV,
    paddingHorizontal: RS.spacing.sm,
  },
  btnInfoPressed: {
    opacity: 0.6,
  },
  btnInfoLabel: {
    fontSize:      RS.typography.body,
    fontWeight:    '500',
    color:         RS.colors.textSecondary,
    letterSpacing: RS.letterSpacing.wide,
  },
});
