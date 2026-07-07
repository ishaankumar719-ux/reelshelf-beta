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
  /** 'sm' = standard carousel card; 'lg' = large featured card */
  size?:      'sm' | 'lg';
  onPress?:   () => void;
}

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
        // Sprint 4: collectible lift — scale UP on touch (was 0.96 depress)
        scale.value = withSpring(Motion.lift.scaleActive, {
          damping: 16, stiffness: 260, mass: 0.7,
        });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, {
          damping: 12, stiffness: 200, mass: 0.7,
        });
      }}
    >
      {/* Outer: float shadow + scale transform (no overflow:hidden — iOS shadow requires this) */}
      <Animated.View style={[styles.outer, { width, height, borderRadius: RS.card.radius }, animStyle]}>
        {/* Inner: overflow:hidden clips image + gradient to rounded rect */}
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

          {posterUrl && (
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.92)']}
              start={{ x: 0, y: 0.25 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          )}

          {badge && (
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeLabel, { color: badge.text }]}>{badge.label}</Text>
            </View>
          )}

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
    // Sprint 4: float shadow — soft, near-invisible, high blur
    shadowColor:   RS.shadow.color,
    shadowOffset:  { width: 0, height: RS.shadow.offsetY },
    shadowOpacity: RS.shadow.opacity,
    shadowRadius:  RS.shadow.radius,
    elevation:     RS.shadow.android,
  },
  inner: {
    flex:            1,
    borderRadius:    RS.card.radius,
    overflow:        'hidden',
    borderWidth:     0.5,
    borderColor:     RS.colors.border,
    justifyContent:  'flex-end',
    backgroundColor: RS.colors.card,
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
