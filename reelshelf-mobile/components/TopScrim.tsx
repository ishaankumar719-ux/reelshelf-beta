import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Shallow dark header behind the status bar and a pinned back arrow, so
 *  content scrolling underneath doesn't collide with the clock or the arrow.
 *  Solid down to just below the arrow, then fades out. Touches pass through.
 *  Render it after the scroll view and before the back arrow.
 *  With `scrollY`, it fades in over the first few points of scrolling, so
 *  the top of the page (title, backdrop) is never dimmed at rest. */
export const TOP_BAR_HEIGHT = 52; // back arrow (36–44pt) + breathing room

export function TopScrim({ scrollY }: { scrollY?: SharedValue<number> }) {
  const insets = useSafeAreaInsets();
  const solid = insets.top + TOP_BAR_HEIGHT;
  const fade = 28;
  const height = solid + fade;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: scrollY ? interpolate(scrollY.value, [0, 32], [0, 1], 'clamp') : 1,
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.scrim, { height }, animatedStyle]}>
      <LinearGradient
        colors={['rgb(7,7,7)', 'rgba(7,7,7,0.9)', 'rgba(7,7,7,0)']}
        locations={[0, solid / height, 1]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
  },
});
