import { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { Motion } from '@/constants/motion';

interface RevealOnMountProps {
  children: React.ReactNode;
  /** Stagger delay in ms — use increments of ~80ms across sections */
  delay?: number;
}

// Gentle fade + upward-translate entrance for each Home screen section.
// Mirrors web's .rs-page-fade (opacity 0→1, 0.38s ease-out) with added translateY.
export function RevealOnMount({ children, delay = 0 }: RevealOnMountProps) {
  const opacity    = useSharedValue<number>(0);
  const translateY = useSharedValue<number>(Motion.section.translateY);

  useEffect(() => {
    const config = {
      duration: Motion.section.duration,
      easing: Easing.out(Easing.ease),
    };
    const t = delay === 0
      ? null
      : setTimeout(() => {
          opacity.value    = withTiming(1, config);
          translateY.value = withTiming(0, config);
        }, delay);

    if (delay === 0) {
      opacity.value    = withTiming(1, config);
      translateY.value = withTiming(0, config);
    }

    return () => { if (t !== null) clearTimeout(t); };
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}
