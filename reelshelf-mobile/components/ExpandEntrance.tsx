import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useReduceMotion';

interface ExpandEntranceProps {
  children: React.ReactNode;
  /** Only animate when the screen was entered via the expand transition. */
  active: boolean;
}

// Destination-screen half of the Discover Phase 3 expand transition (see
// hooks/useExpandOnPress.ts for the source-card half). Only fires when the
// `expand=1` query param is present — i.e. only for navigations from the two
// hero-weight cards (Featured Collection, Book of the Month) — every other
// entry into these detail screens mounts instantly, unaffected.
export function ExpandEntrance({ children, active }: ExpandEntranceProps) {
  const reduceMotion = useReduceMotion();
  const shouldAnimate = active && !reduceMotion;

  const opacity = useSharedValue(shouldAnimate ? 0 : 1);
  const scale   = useSharedValue(shouldAnimate ? 0.96 : 1);

  useEffect(() => {
    if (!shouldAnimate) return;
    const config = { duration: 220, easing: Easing.out(Easing.ease) };
    opacity.value = withTiming(1, config);
    scale.value   = withTiming(1, config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[{ flex: 1 }, style]}>{children}</Animated.View>;
}
