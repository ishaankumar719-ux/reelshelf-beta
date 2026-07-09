import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

const COLLAPSED_LINES = 4;

interface MediaSynopsisProps {
  synopsis: string;
}

export function MediaSynopsis({ synopsis }: MediaSynopsisProps) {
  const reduceMotion = useReduceMotion();
  const [expanded, setExpanded] = useState(false);
  const [collapsedHeight, setCollapsedHeight] = useState<number | null>(null);
  const [fullHeight, setFullHeight] = useState<number | null>(null);

  const progress = useSharedValue(0);

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const next = !expanded;
    setExpanded(next);
    if (reduceMotion) {
      progress.value = next ? 1 : 0;
      return;
    }
    progress.value = withTiming(next ? 1 : 0, { duration: 320 });
  };

  const containerStyle = useAnimatedStyle(() => {
    if (collapsedHeight === null || fullHeight === null) {
      // Before measurement resolves, cap to an estimate so the full (invisible)
      // text never briefly expands the layout.
      return { height: COLLAPSED_LINES * 22 + 4 };
    }
    const height = collapsedHeight + (fullHeight - collapsedHeight) * progress.value;
    return { height };
  });

  const fullTextStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));
  const collapsedTextStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
  }));

  const measuring = collapsedHeight === null || fullHeight === null;

  return (
    <View style={styles.container}>
      {/* Invisible measurement pass — establishes collapsed vs full height once. */}
      {measuring && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Text
            style={[styles.text, { opacity: 0 }]}
            numberOfLines={COLLAPSED_LINES}
            onLayout={(e) => setCollapsedHeight(e.nativeEvent.layout.height)}
          >
            {synopsis}
          </Text>
          <Text
            style={[styles.text, { opacity: 0, position: 'absolute', top: 0, left: 0, right: 0 }]}
            onLayout={(e) => setFullHeight(e.nativeEvent.layout.height)}
          >
            {synopsis}
          </Text>
        </View>
      )}

      <Animated.View style={[styles.clip, containerStyle]}>
        <Animated.Text style={[styles.text, styles.overlayText, collapsedTextStyle]} numberOfLines={COLLAPSED_LINES}>
          {synopsis}
        </Animated.Text>
        <Animated.Text style={[styles.text, fullTextStyle]}>
          {synopsis}
        </Animated.Text>
      </Animated.View>

      {!measuring && fullHeight! > collapsedHeight! && (
        <Pressable onPress={toggle} hitSlop={8}>
          <Text style={styles.readMore}>{expanded ? 'Show less' : 'Read more'}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: RS.spacing.md,
    gap:               RS.spacing.xs,
  },
  clip: {
    overflow: 'hidden',
  },
  text: {
    fontSize:   RS.typography.body,
    fontWeight: '400',
    color:      RS.colors.textSecondary,
    lineHeight: 22,
  },
  overlayText: {
    position: 'absolute',
    top:      0,
    left:     0,
    right:    0,
  },
  readMore: {
    fontSize:      RS.typography.caption,
    fontWeight:    '700',
    color:         RS.colors.accent,
    letterSpacing: RS.letterSpacing.wide,
    marginTop:     2,
  },
});
