import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { Header } from '@/components/Header';
import { Motion } from '@/constants/motion';

interface FadingHeaderProps {
  /** Shared scroll-offset value from the parent Animated.ScrollView */
  scrollY: SharedValue<number>;
}

// Ties the Header's opacity and subtle translateY to the Home screen's scroll offset.
// Runs entirely on the UI thread — no JS-thread jank.
export function FadingHeader({ scrollY }: FadingHeaderProps) {
  const animStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [Motion.header.fadeScrollStart, Motion.header.fadeScrollEnd],
      [1, Motion.header.minOpacity],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollY.value,
      [Motion.header.fadeScrollStart, Motion.header.fadeScrollEnd],
      [0, Motion.header.translateYOffset],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ translateY }] };
  });

  return (
    <Animated.View style={animStyle}>
      <Header />
    </Animated.View>
  );
}
