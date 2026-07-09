import { useEffect, useRef, useState } from 'react';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { AccessibilityInfo, Dimensions, StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { useAtmosphere } from '@/contexts/AtmosphereContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const ATMO_H = Math.round(SCREEN_H * 0.38);

// ── Grain dots — deterministic pseudo-random positions, computed once at module load ──
const GRAIN_COUNT = 22;
const GRAIN_DOTS = Array.from({ length: GRAIN_COUNT }, (_, i) => ({
  left: (((i * 37 + 13) % 97) / 97) * SCREEN_W,
  top:  (((i * 53 + 7)  % 89) / 89) * ATMO_H,
  size: 1.5 + (i % 3) * 0.8,
}));

// ── Grain layer — single opacity loop drives all dots together ──────────────
function GrainLayer({ reduceMotion }: { reduceMotion: boolean }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = reduceMotion
      ? 0.5                                // static half-opacity when reduce motion is on
      : withRepeat(
          withTiming(1, { duration: 4800, easing: Easing.inOut(Easing.sin) }),
          -1,
          true,
        );
  }, [reduceMotion]);

  const layerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * 0.07,
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, layerStyle]} pointerEvents="none">
      {GRAIN_DOTS.map((dot, i) => (
        <View
          key={i}
          style={{
            position:        'absolute',
            left:             dot.left,
            top:              dot.top,
            width:            dot.size,
            height:           dot.size,
            borderRadius:     dot.size / 2,
            backgroundColor:  'rgba(255,255,255,0.9)',
          }}
        />
      ))}
    </Animated.View>
  );
}

// ── AmbientAtmosphere ────────────────────────────────────────────────────────
// Positioned absolutely at the top of the screen, behind all content.
// Height = 38% of screen. Fades to transparent at its bottom edge (permanent),
// and fades to black as the user scrolls (scroll-linked overlay).

interface Props {
  scrollY: SharedValue<number>;
  /** When true, renders at 65% opacity for a darker ambient feel (e.g. Discover screen). */
  dimmed?:  boolean;
}

export function AmbientAtmosphere({ scrollY, dimmed = false }: Props) {
  const { baseColors, overrideColor } = useAtmosphere();

  // ── Reduce Motion ───────────────────────────────────────────────────────────
  // Keep both a React state (for JSX/effects) and a SharedValue (for worklets)
  const [reduceMotion, setReduceMotion] = useState(false);
  const reduceMotionSV = useSharedValue(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(v => {
      setReduceMotion(v);
      reduceMotionSV.value = v;
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', v => {
      setReduceMotion(v);
      reduceMotionSV.value = v;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Crossfade state (for future Daily Reel rotation) ───────────────────────
  // fromColors/toColors start as the same — crossfade fires once on mount (gentle fade-in)
  const [fromColors, setFromColors] = useState<string[]>(baseColors);
  const [toColors, setToColors]     = useState<string[]>(baseColors);
  const crossfade = useSharedValue(1);

  const baseKey = baseColors.join(',');
  const prevBaseKey = useRef(baseKey);

  useEffect(() => {
    if (prevBaseKey.current === baseKey) {
      // First mount: just animate in over 700ms
      crossfade.value = 0;
      crossfade.value = withTiming(1, { duration: 700 });
    } else {
      // Subsequent baseColors change: crossfade old → new
      setFromColors(toColors);
      setToColors(baseColors);
      crossfade.value = 0;
      crossfade.value = withTiming(1, { duration: 700 });
    }
    prevBaseKey.current = baseKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseKey]);

  // ── Breathing animation ─────────────────────────────────────────────────────
  const breath = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      breath.value = 0;
      return;
    }
    breath.value = withRepeat(
      withTiming(1, { duration: 12000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [reduceMotion]);

  // ── Override color transitions ──────────────────────────────────────────────
  const [currentOverride, setCurrentOverride] = useState<string | null>(null);
  const overrideOpacity = useSharedValue(0);

  useEffect(() => {
    if (overrideColor) {
      setCurrentOverride(overrideColor);
      overrideOpacity.value = withTiming(0.20, { duration: 600 });
    } else {
      overrideOpacity.value = withTiming(0, { duration: 600 }, () => {
        runOnJS(setCurrentOverride)(null);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrideColor]);

  // ── Animated styles ─────────────────────────────────────────────────────────
  const fromStyle = useAnimatedStyle(() => ({
    opacity: 1 - crossfade.value,
  }));
  const toStyle = useAnimatedStyle(() => ({
    opacity: crossfade.value,
  }));
  const breathStyle = useAnimatedStyle(() => ({
    opacity: reduceMotionSV.value ? 0 : breath.value * 0.28,
  }));
  const overrideStyle = useAnimatedStyle(() => ({
    opacity: overrideOpacity.value,
  }));
  // Scroll-driven black overlay: fully opaque at scroll 220px (black before Continue Watching)
  const scrollFadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 220], [0, 1], Extrapolation.CLAMP),
  }));

  const c1f = fromColors[0] ?? '#1a1020';
  const c2f = fromColors[1] ?? '#0f1a1a';
  const c1t = toColors[0]   ?? '#1a1020';
  const c2t = toColors[1]   ?? '#0f1a1a';
  const c3t = toColors[2]   ?? toColors[0] ?? '#1a1020';

  return (
    <View style={[styles.container, dimmed && styles.containerDimmed]} pointerEvents="none">

      {/* ── From gradient (crossfade out) ──────────────────────────────── */}
      <Animated.View style={[StyleSheet.absoluteFill, fromStyle]}>
        <LinearGradient
          colors={[c1f, c2f, 'rgba(7,7,7,0)']}
          locations={[0, 0.56, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* ── To gradient (crossfade in — current base) ─────────────────── */}
      <Animated.View style={[StyleSheet.absoluteFill, toStyle]}>
        <LinearGradient
          colors={[c1t, c2t, 'rgba(7,7,7,0)']}
          locations={[0, 0.56, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* ── Breathing layer: slow phase shift using third palette color ── */}
      <Animated.View style={[StyleSheet.absoluteFill, breathStyle]}>
        <LinearGradient
          colors={[c3t, 'rgba(7,7,7,0)']}
          locations={[0, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* ── Override blend: active Collection poster's tint ───────────── */}
      {currentOverride ? (
        <Animated.View style={[StyleSheet.absoluteFill, overrideStyle]}>
          <LinearGradient
            colors={[currentOverride, 'rgba(7,7,7,0)']}
            locations={[0, 1]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}

      {/* ── Grain ─────────────────────────────────────────────────────── */}
      <GrainLayer reduceMotion={reduceMotion} />

      {/* ── Scroll-driven black overlay — atmosphere disappears as you scroll ── */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.blackOverlay, scrollFadeStyle]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top:       0,
    left:      0,
    right:     0,
    height:    ATMO_H,
    // No zIndex — render order (first child in parent) puts it behind siblings
  },
  containerDimmed: {
    opacity: 0.65,   // darker variant for Discover screen
  },
  blackOverlay: {
    backgroundColor: '#070707',
  },
});
