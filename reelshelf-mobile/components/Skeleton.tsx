import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';

import { RS } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

interface SkeletonBlockProps {
  width?:  number | `${number}%`;
  height:  number;
  radius?: number;
  style?:  object;
}

/** Single pulsing placeholder rect — the one shimmer primitive every section-level skeleton below is built from. */
export function SkeletonBlock({ width = '100%', height, radius = 8, style }: SkeletonBlockProps) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(reduceMotion ? 0.5 : 0.35);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 0.5;
      return;
    }
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: RS.colors.elevated },
        animStyle,
        style,
      ]}
    />
  );
}

export function SkeletonHero() {
  return (
    <View style={styles.heroRow}>
      <SkeletonBlock width={128} height={192} radius={RS.card.radius} />
      <View style={styles.heroMeta}>
        <SkeletonBlock width="80%" height={22} />
        <SkeletonBlock width="45%" height={14} style={{ marginTop: 8 }} />
        <SkeletonBlock width="60%" height={14} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

export function SkeletonSynopsis() {
  return (
    <View style={styles.synopsis}>
      <SkeletonBlock height={14} />
      <SkeletonBlock height={14} />
      <SkeletonBlock width="70%" height={14} />
    </View>
  );
}

export function SkeletonCastRow() {
  return (
    <View style={styles.castRow}>
      {[0, 1, 2, 3, 4].map(i => (
        <View key={i} style={styles.castItem}>
          <SkeletonBlock width={84} height={110} radius={12} />
          <SkeletonBlock width={70} height={10} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}

export function SkeletonPosterRow() {
  return (
    <View style={styles.castRow}>
      {[0, 1, 2, 3].map(i => (
        <SkeletonBlock key={i} width={100} height={150} radius={RS.card.radius} />
      ))}
    </View>
  );
}

export function SkeletonProviderRow() {
  return (
    <View style={styles.providerRow}>
      {[0, 1, 2].map(i => (
        <SkeletonBlock key={i} width={72} height={32} radius={RS.button.radius} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection:     'row',
    alignItems:        'flex-end',
    paddingHorizontal: RS.spacing.md,
    gap:               RS.spacing.md,
  },
  heroMeta: {
    flex: 1,
    paddingBottom: 2,
  },
  synopsis: {
    paddingHorizontal: RS.spacing.md,
    gap:               6,
  },
  castRow: {
    flexDirection:     'row',
    paddingHorizontal: RS.spacing.md,
    gap:               12,
  },
  castItem: {
    alignItems: 'center',
  },
  providerRow: {
    flexDirection:     'row',
    paddingHorizontal: RS.spacing.md,
    gap:               10,
  },
});
