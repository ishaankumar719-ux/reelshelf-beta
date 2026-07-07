import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RS, Fonts } from '@/constants/theme';
import { Motion } from '@/constants/motion';
import { featuredItem } from '@/data/seedHomeContent';

// ── Time-of-day greeting logic (device local time, no network) ────────────────
function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12)  return 'Morning';
  if (h < 17)  return 'Afternoon';
  return 'Evening';
}

function getDayName(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

// ── Screen metrics (portrait-locked — safe to derive at module level) ─────────
const SCREEN_H   = Dimensions.get('window').height;
const HERO_H     = SCREEN_H * 0.40;
// Backdrop is taller than the hero to absorb the parallax translation without showing edges
const BACKDROP_H = HERO_H * 1.35;

interface HeroProps {
  /** Shared scroll-offset from parent Animated.ScrollView — drives parallax + fade */
  scrollY: SharedValue<number>;
}

export function Hero({ scrollY }: HeroProps) {
  const { top: safeTop } = useSafeAreaInsets();
  // Space from screen top to where editorial copy starts (safe area + header height)
  const HEADER_CLEARANCE = safeTop + 52;

  // ── Backdrop parallaxes at 30% of scroll speed ─────────────────────────────
  const backdropStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, HERO_H],
          [0, -(HERO_H * Motion.hero.parallaxFactor)],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  // ── Editorial text content fades + drifts upward as hero scrolls off ────────
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, HERO_H * Motion.hero.contentFadeAt],
      [1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, HERO_H * Motion.hero.contentFadeAt],
          [0, Motion.hero.contentDriftY],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <View style={[styles.hero, { height: HERO_H }]}>
      {/* ── Cinematic backdrop: parallax image, taller than hero ────────────── */}
      <Animated.View style={[styles.backdropWrap, { height: BACKDROP_H }, backdropStyle]}>
        <Image
          source={{ uri: featuredItem.posterUrl ?? undefined }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={300}
        />
      </Animated.View>

      {/* ── Gradient overlays: bottom-heavy for text legibility ──────────────── */}
      {/* Subtle top darkening for status bar legibility */}
      <LinearGradient
        colors={['rgba(7,7,11,0.55)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.25 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* Heavy bottom gradient — where editorial copy sits */}
      <LinearGradient
        colors={['transparent', 'rgba(7,7,11,0.80)', 'rgba(7,7,11,0.97)']}
        start={{ x: 0, y: 0.30 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* ── Editorial copy — fades out as hero scrolls away ──────────────────── */}
      <Animated.View style={[styles.content, { paddingTop: HEADER_CLEARANCE }, contentStyle]}>
        {/* TODAY eyebrow */}
        <Text style={styles.eyebrow}>TODAY</Text>

        {/* Day + time-of-day — computed from device Date */}
        <Text style={styles.timeLabel}>
          {getDayName()} {getTimeOfDay()}
        </Text>

        {/* Main serif heading */}
        <Text style={styles.heading}>{'Discover your\nnext story.'}</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Curated films, television and books worth your time.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    // overflow: 'hidden' clips the taller backdrop within the hero bounds
    overflow: 'hidden',
    width:    '100%' as `${number}%`,
  },
  backdropWrap: {
    position: 'absolute',
    top:       0,
    left:      0,
    right:     0,
  },
  content: {
    position:        'absolute',
    bottom:           0,
    left:             0,
    right:            0,
    paddingHorizontal: RS.spacing.md,
    paddingBottom:    RS.spacing.xl,
    gap:              RS.spacing.xs,
  },
  eyebrow: {
    fontSize:      RS.typography.overline,
    fontWeight:    '700',
    color:         RS.colors.accent,
    letterSpacing: RS.letterSpacing.widest,
  },
  timeLabel: {
    fontSize:      RS.typography.caption,
    fontWeight:    '500',
    color:         RS.colors.textMuted,
    letterSpacing: RS.letterSpacing.wide,
    marginBottom:  RS.spacing.xs,
  },
  heading: {
    fontSize:      RS.typography.display,
    fontWeight:    '800',
    fontFamily:    Fonts?.serif,
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.tight,
    lineHeight:    44,
  },
  subtitle: {
    fontSize:   RS.typography.subheading,
    fontWeight: '400',
    color:      RS.colors.textSecondary,
    lineHeight: 22,
    marginTop:  RS.spacing.xs,
  },
});
