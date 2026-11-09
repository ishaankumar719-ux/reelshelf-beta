import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Shallow dark header behind the status bar and a pinned back arrow, so
 *  content scrolling underneath doesn't collide with the clock or the arrow.
 *  Near-solid down to just below the arrow, then fades out. Touches pass
 *  through. Render it after the scroll view and before the back arrow. */
export const TOP_BAR_HEIGHT = 52; // back arrow (36–44pt) + breathing room

export function TopScrim() {
  const insets = useSafeAreaInsets();
  const solid = insets.top + TOP_BAR_HEIGHT;
  const fade = 28;
  const height = solid + fade;

  return (
    <LinearGradient
      pointerEvents="none"
      colors={['rgba(7,7,7,0.94)', 'rgba(7,7,7,0.86)', 'rgba(7,7,7,0)']}
      locations={[0, solid / height, 1]}
      style={[styles.scrim, { height }]}
    />
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
