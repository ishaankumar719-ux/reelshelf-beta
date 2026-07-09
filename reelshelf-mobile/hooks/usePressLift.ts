import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Motion } from '@/constants/motion';
import { useReduceMotion } from '@/hooks/useReduceMotion';

export type PressLiftVariant = 'lift' | 'depress';

// Discover Phase 3: the one press/lift interaction primitive shared across every
// card type on the screen (portrait posters, landscape cards, book covers,
// collection previews). Two variants mirror the existing Home convention:
//  - 'lift'    — small/medium cards feel "collectible", scale UP slightly
//  - 'depress' — hero-weight cards (Featured Collection, Book of the Month)
//                feel like a physical button, scale DOWN slightly
// Reduce Motion: press feedback is skipped entirely rather than instantly
// snapped, since a snap-without-animation on a press-in/out pair reads as a
// flicker — no motion at all is the calmer fallback.
export function usePressLift(variant: PressLiftVariant = 'lift') {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);

  const target   = variant === 'lift' ? Motion.lift.scaleActive : Motion.lift.depressScale;
  const springIn  = variant === 'lift' ? Motion.spring.liftIn  : Motion.spring.depressIn;
  const springOut = variant === 'lift' ? Motion.spring.liftOut : Motion.spring.depressOut;

  const onPressIn = () => {
    if (reduceMotion) return;
    scale.value = withSpring(target, springIn);
  };

  const onPressOut = () => {
    if (reduceMotion) return;
    scale.value = withSpring(1, springOut);
  };

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { style, onPressIn, onPressOut };
}
