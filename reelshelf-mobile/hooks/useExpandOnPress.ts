import { useCallback } from 'react';
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useReduceMotion';

// Discover Phase 3 — the "expand" cross-transition used ONLY by the two
// hero-weight cards (Featured Collection, Book of the Month) when navigating
// into their detail view.
//
// Why not a real shared-element transition: expo-router's <Stack> wraps
// React Navigation's native-stack, which renders platform-native screen
// transitions. Morphing a card into the next screen's layout requires
// react-native-shared-element, which needs native module linking —
// unavailable in Expo Go SDK 54 without a custom dev client. That's out of
// scope here (no new native dependencies), so this is the deliberate
// fallback: the tapped card scales up slightly and fades as the next screen
// takes over, and that screen mounts with a matching fade+scale-in (see the
// `expand=1` query param read in app/collection/[id].tsx and
// app/media/[id].tsx). Two independently-animated screens reading as one
// continuous motion.
export function useExpandOnPress(navigate: () => void) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(1);
  const scale   = useSharedValue(1);

  const trigger = useCallback(() => {
    if (reduceMotion) {
      navigate();
      return;
    }
    opacity.value = withTiming(0.88, { duration: 140 });
    scale.value = withTiming(1.02, { duration: 140 }, (finished) => {
      if (finished) runOnJS(navigate)();
    });
  }, [reduceMotion, navigate]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return { style, trigger };
}
