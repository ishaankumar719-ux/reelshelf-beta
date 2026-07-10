import { useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { RS } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

export interface GlassTabStripProps<T extends string> {
  tabs:      { key: T; label: string }[];
  activeTab: T;
  onChange:  (key: T) => void;
}

// Premium glass segmented control — one continuous BlurView surface with a
// sliding filled pill indicator that animates to the pressed tab's measured
// position/width. Reuses existing glass tokens (RS.blur, RS.button) rather
// than inventing a new surface treatment.
export function GlassTabStrip<T extends string>({ tabs, activeTab, onChange }: GlassTabStripProps<T>) {
  const reduceMotion = useReduceMotion();
  const layouts = useRef<Record<string, { x: number; width: number }>>({});
  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);
  const [ready, setReady] = useState(false);

  const moveIndicatorTo = (key: string) => {
    const layout = layouts.current[key];
    if (!layout) return;
    if (reduceMotion) {
      indicatorX.value = layout.x;
      indicatorW.value = layout.width;
    } else {
      indicatorX.value = withTiming(layout.x, { duration: 220 });
      indicatorW.value = withTiming(layout.width, { duration: 220 });
    }
  };

  const handleLayout = (key: string) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    layouts.current[key] = { x, width };
    if (key === activeTab && !ready) {
      indicatorX.value = x;
      indicatorW.value = width;
      setReady(true);
    }
  };

  const handlePress = (key: T) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onChange(key);
    moveIndicatorTo(key);
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width:     indicatorW.value,
    opacity:   ready ? 1 : 0,
  }));

  return (
    <View style={styles.outer}>
      <BlurView tint="dark" intensity={RS.blur.cardLight} style={StyleSheet.absoluteFill} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.track}>
          <Animated.View style={[styles.indicator, indicatorStyle]} />
          {tabs.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <Pressable
                key={tab.key}
                onLayout={handleLayout(tab.key)}
                style={styles.tabBtn}
                onPress={() => handlePress(tab.key)}
              >
                <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginHorizontal: RS.spacing.md,
    borderRadius:     RS.button.radius,
    overflow:          'hidden',
    borderWidth:       0.5,
    borderColor:       RS.glass.border,
  },
  scrollContent: {
    paddingHorizontal: 4,
    paddingVertical:   4,
  },
  track: {
    flexDirection: 'row',
    position:      'relative',
  },
  indicator: {
    position:        'absolute',
    top:             0,
    bottom:          0,
    borderRadius:    RS.button.radius,
    backgroundColor: RS.button.primaryFill,
    borderWidth:     1,
    borderColor:     RS.button.primaryBorder,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical:   10,
  },
  label: {
    fontSize:   RS.typography.caption,
    fontWeight: '600',
    color:      RS.colors.textSecondary,
  },
  labelActive: {
    color:      RS.button.primaryText,
    fontWeight: '700',
  },
});
