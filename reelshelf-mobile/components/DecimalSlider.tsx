import { useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { RS } from '@/constants/theme';

const TRACK_H = 6;
const THUMB_SIZE = 22;

interface DecimalSliderProps {
  label:     string;
  value:     number | null;   // null = not yet rated
  onChange:  (value: number) => void;
  min?:      number;
  max?:      number;
  step?:     number;
}

// Custom Reanimated Pan-gesture slider — reuses this codebase's established
// "GestureDetector + shared value" pattern (FannedDeck, RatingModal's
// half-star taps) rather than adding a new slider dependency. Supports both
// a direct tap-to-set and drag-to-adjust, snapped to `step` increments, with
// a live value label while dragging.
export function DecimalSlider({ label, value, onChange, min = 0, max = 10, step = 0.5 }: DecimalSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [liveValue, setLiveValue] = useState(value);
  const thumbX = useSharedValue(0);

  const commit = (v: number) => {
    setLiveValue(v);
    onChange(v);
    Haptics.selectionAsync().catch(() => {});
  };

  // Inlined in every gesture callback (rather than a shared worklet helper)
  // to avoid any ambiguity about whether a plain closure fn gets
  // auto-workletized when called from a UI-thread callback.
  const gesture = Gesture.Pan()
    .onBegin((e) => {
      if (trackWidth <= 0) return;
      const clamped = Math.min(Math.max(e.x, 0), trackWidth);
      const raw = min + (clamped / trackWidth) * (max - min);
      const stepped = Math.round(raw / step) * step;
      thumbX.value = ((stepped - min) / (max - min)) * trackWidth;
      runOnJS(setLiveValue)(stepped);
    })
    .onUpdate((e) => {
      if (trackWidth <= 0) return;
      const clamped = Math.min(Math.max(e.x, 0), trackWidth);
      const raw = min + (clamped / trackWidth) * (max - min);
      const stepped = Math.round(raw / step) * step;
      thumbX.value = ((stepped - min) / (max - min)) * trackWidth;
      runOnJS(setLiveValue)(stepped);
    })
    .onEnd((e) => {
      if (trackWidth <= 0) return;
      const clamped = Math.min(Math.max(e.x, 0), trackWidth);
      const raw = min + (clamped / trackWidth) * (max - min);
      const stepped = Math.round(raw / step) * step;
      runOnJS(commit)(stepped);
    });

  const fillStyle = useAnimatedStyle(() => ({ width: thumbX.value + THUMB_SIZE / 2 }));
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: thumbX.value }] }));

  const displayValue = liveValue ?? value;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.valueText}>{displayValue !== null ? displayValue.toFixed(1) : '—'}</Text>
      </View>
      <GestureDetector gesture={gesture}>
        <View
          style={styles.track}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            setTrackWidth(w);
            thumbX.value = ((value ?? min) - min) / (max - min) * w;
          }}
        >
          <View style={styles.trackBg} pointerEvents="none" />
          <Animated.View style={[styles.trackFill, fillStyle]} pointerEvents="none" />
          <Animated.View style={[styles.thumb, thumbStyle]} pointerEvents="none" />
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: RS.spacing.xs,
  },
  headerRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  label: {
    fontSize:   RS.typography.body,
    fontWeight: '600',
    color:      RS.colors.textSecondary,
  },
  valueText: {
    fontSize:   RS.typography.body,
    fontWeight: '700',
    color:      RS.colors.accent,
  },
  track: {
    height:         THUMB_SIZE,
    justifyContent: 'center',
  },
  trackBg: {
    position:        'absolute',
    left:            THUMB_SIZE / 2,
    right:           THUMB_SIZE / 2,
    height:          TRACK_H,
    borderRadius:    TRACK_H / 2,
    backgroundColor: RS.colors.elevated,
  },
  trackFill: {
    position:        'absolute',
    left:            0,
    height:          TRACK_H,
    borderRadius:    TRACK_H / 2,
    backgroundColor: RS.colors.accent,
  },
  thumb: {
    position:        'absolute',
    left:            0,
    width:           THUMB_SIZE,
    height:          THUMB_SIZE,
    borderRadius:    THUMB_SIZE / 2,
    backgroundColor: RS.colors.textPrimary,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.4,
    shadowRadius:    4,
    elevation:       4,
  },
});
