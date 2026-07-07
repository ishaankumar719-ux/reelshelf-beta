import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';
import { Motion } from '@/constants/motion';
import type { MediaType } from '@/data/seedHomeContent';

export interface PosterCardProps {
  title?:     string;
  year?:      number;
  mediaType?: MediaType;
  posterUrl?: string | null;
  width?:     number;
  height?:    number;
  /** 'sm' = standard 100px card; 'lg' = featured 220px card with serif title */
  size?:      'sm' | 'lg';
  onPress?:   () => void;
}

// Single definitive poster card — includes press-lift animation (UI thread).
// Replaces the former PosterCard + AnimatedPosterCard split from Phase 4.
export function PosterCard({
  title,
  year,
  mediaType,
  posterUrl,
  width  = RS.card.posterWidth,
  height = RS.card.posterHeight,
  size   = 'sm',
  onPress,
}: PosterCardProps = {}) {
  const badge   = mediaType ? RS.badge[mediaType] : null;
  const initial = title ? title[0].toUpperCase() : '';

  const scale = useSharedValue<number>(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(Motion.lift.scaleActive, {
          damping: 18, stiffness: 240, mass: 0.8,
        });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, {
          damping: 14, stiffness: 180, mass: 0.8,
        });
      }}
    >
      {/* Outer: shadow + scale animation */}
      <Animated.View style={[styles.outer, { width, height, borderRadius: RS.card.radius }, animStyle]}>
        {/* Inner: clipping + overflow hidden */}
        <View style={styles.inner}>
          {posterUrl ? (
            <Image
              source={{ uri: posterUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <LinearGradient
              colors={['#1a1a2a', '#0c0c14']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, styles.fallback]}
            >
              {initial ? <Text style={styles.initial}>{initial}</Text> : null}
            </LinearGradient>
          )}

          {/* Gradient overlay — bottom-heavy for natural title legibility */}
          {posterUrl && (
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.92)']}
              start={{ x: 0, y: 0.25 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          )}

          {/* Media-type badge — top left */}
          {badge && (
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeLabel, { color: badge.text }]}>{badge.label}</Text>
            </View>
          )}

          {/* Footer: title + year */}
          <View style={styles.footer}>
            {title ? (
              <Text
                style={[styles.title, size === 'lg' && styles.titleLg]}
                numberOfLines={2}
              >
                {title}
              </Text>
            ) : null}
            {year ? (
              <Text style={[styles.year, size === 'lg' && styles.yearLg]}>{year}</Text>
            ) : null}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    // Premium shadow — on outer non-clipped view (overflow: hidden kills shadow on iOS)
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.52,
    shadowRadius:  16,
    elevation:     14,
  },
  inner: {
    flex:            1,
    borderRadius:    RS.card.radius,
    overflow:        'hidden',
    borderWidth:     0.5,
    borderColor:     RS.colors.border,
    justifyContent:  'flex-end',
    backgroundColor: RS.colors.card,   // visible during image load
  },
  fallback: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  initial: {
    fontSize:   38,
    fontWeight: '700',
    color:      RS.colors.textMuted,
  },
  badge: {
    position:          'absolute',
    top:               RS.spacing.xs,
    left:              RS.spacing.xs,
    borderRadius:      RS.badge.pillRadius,
    paddingHorizontal: 5,
    paddingVertical:   1,
  },
  badgeLabel: {
    fontSize:      8,
    fontWeight:    '700',
    letterSpacing: 0.5,
  },
  footer: {
    paddingHorizontal: RS.spacing.xs + 2,
    paddingBottom:     RS.spacing.sm,
    gap:               2,
  },
  title: {
    fontSize:   RS.typography.caption,
    fontWeight: '600',
    color:      RS.colors.textPrimary,
    lineHeight: 14,
  },
  // Featured / large card: larger text, sans-serif (serif reserved for editorial moments)
  titleLg: {
    fontSize:   RS.typography.body,
    fontWeight: '600',
    lineHeight: 20,
  },
  year: {
    fontSize: 10,
    color:    RS.colors.textMuted,
  },
  yearLg: {
    fontSize: RS.typography.caption,
    color:    RS.colors.textSecondary,
  },
});
