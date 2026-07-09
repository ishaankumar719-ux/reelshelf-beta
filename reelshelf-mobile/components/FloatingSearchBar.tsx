import { BlurView } from 'expo-blur';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

import { RS } from '@/constants/theme';

const PLACEHOLDERS = [
  'Search films…',
  'Search TV shows…',
  'Search books…',
  'Search people…',
  'Search collections…',
  'Search lists…',
] as const;

const ROTATE_INTERVAL_MS = 2800;

export function FloatingSearchBar() {
  const [phraseIdx, setPhraseIdx]   = useState(0);
  const textOpacity  = useSharedValue<number>(1);
  const barScale     = useSharedValue<number>(1);

  const textAnimStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const barAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: barScale.value }],
  }));

  const advancePhrase = useCallback(() => {
    setPhraseIdx(i => (i + 1) % PLACEHOLDERS.length);
    textOpacity.value = withTiming(1, { duration: 280 });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      textOpacity.value = withTiming(0, { duration: 230 }, (finished) => {
        if (finished) runOnJS(advancePhrase)();
      });
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.wrapper}>
      {/* Outer: holds scale animation + shadow (no overflow clip) */}
      <Animated.View style={[styles.outerShadow, barAnimStyle]}>
        {/* Inner: clips BlurView to pill shape */}
        <Pressable
          style={styles.bar}
          onPressIn={() => {
            barScale.value = withSpring(1.015, { damping: 20, stiffness: 300, mass: 0.6 });
          }}
          onPressOut={() => {
            barScale.value = withSpring(1, { damping: 16, stiffness: 220, mass: 0.6 });
          }}
          onPress={() => console.log('[Sprint 4] Search pressed — no-op')}
          android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
        >
          {/* Glass background */}
          <BlurView
            tint="dark"
            intensity={RS.blur.search}
            style={[StyleSheet.absoluteFill, styles.blur]}
          />

          {/* Top-edge inner highlight — simulates glass edge refraction */}
          <View style={styles.innerHighlight} pointerEvents="none" />

          <MaterialIcons name="search" size={20} color={RS.colors.textMuted} />
          <Animated.Text style={[styles.placeholder, textAnimStyle]}>
            {PLACEHOLDERS[phraseIdx]}
          </Animated.Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: RS.spacing.md,
  },
  outerShadow: {
    borderRadius: 28,
    // Float shadow — soft, near-invisible
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: RS.shadow.offsetY },
    shadowOpacity: RS.shadow.opacity,
    shadowRadius:  RS.shadow.radius,
    elevation:     RS.shadow.android,
  },
  bar: {
    flexDirection:     'row',
    alignItems:        'center',
    borderRadius:      28,
    overflow:          'hidden',   // clips BlurView to pill shape
    borderWidth:       0.5,
    borderColor:       RS.glass.border,
    paddingHorizontal: RS.spacing.md,
    paddingVertical:   16,          // Sprint 4: taller (was 14)
    gap:               RS.spacing.sm,
    backgroundColor:   RS.colors.elevated,  // Android fallback (BlurView unavailable)
  },
  blur: {
    borderRadius: 28,
  },
  // Subtle top-edge white line — simulates glass edge lighting
  innerHighlight: {
    position:         'absolute',
    top:               0,
    left:              RS.spacing.md,
    right:             RS.spacing.md,
    height:            0.5,
    backgroundColor:  'rgba(255,255,255,0.14)',
  },
  placeholder: {
    fontSize:   RS.typography.body,
    fontWeight: '400',
    color:      RS.colors.textMuted,
    flex:       1,
  },
});
