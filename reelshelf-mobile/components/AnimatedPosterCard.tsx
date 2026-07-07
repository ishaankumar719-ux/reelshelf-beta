import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Pressable } from 'react-native';

import { PosterCard, type PosterCardProps } from '@/components/poster-card';
import { Motion } from '@/constants/motion';

interface AnimatedPosterCardProps extends PosterCardProps {
  onPress?: () => void;
}

// Wraps PosterCard with a UI-thread-driven press-lift animation.
// Matches the web .rs-card-hover:active treatment (scale + compression).
export function AnimatedPosterCard({ onPress, ...props }: AnimatedPosterCardProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(Motion.lift.scaleActive, {
          damping: 18,
          stiffness: 240,
          mass: 0.8,
        });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, {
          damping: 14,
          stiffness: 180,
          mass: 0.8,
        });
      }}
    >
      <Animated.View style={animStyle}>
        <PosterCard {...props} />
      </Animated.View>
    </Pressable>
  );
}
