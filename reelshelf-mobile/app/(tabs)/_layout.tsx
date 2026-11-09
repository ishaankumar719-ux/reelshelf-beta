import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { RS } from '@/constants/theme';

// ── Custom tab icon: icon + accent dot when focused ────────────────────────
function TabIcon({
  name,
  color,
  focused,
}: {
  name: React.ComponentProps<typeof IconSymbol>['name'];
  color: string;
  focused: boolean;
}) {
  return (
    <View style={iconStyles.wrap}>
      {/* Sprint 4: reduced icon size (20 → lighter, more refined) */}
      <IconSymbol size={20} name={name} color={color} />
      {focused && <View style={iconStyles.dot} />}
    </View>
  );
}

const iconStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap:         4,
  },
  dot: {
    width:           3,
    height:          3,
    borderRadius:    1.5,
    // action — active state indicator for navigation
    backgroundColor: RS.colors.accent,
  },
});

// ── Docked glass background — runs to the bottom edge, home-indicator area
// included, so nothing scrolling underneath shows through below the bar. ─────
function TabBarBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView tint="dark" intensity={RS.blur.tabBar} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, tabBgStyles.scrim]} />
    </View>
  );
}

const tabBgStyles = StyleSheet.create({
  scrim: {
    // Keeps posters from reading through the blur.
    backgroundColor: 'rgba(7,7,7,0.72)',
  },
});

export default function TabLayout() {
  // Bottom inset is applied exactly once: as padding under the icons. The bar
  // itself sits at bottom: 0, so its background covers the home indicator.
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor:   RS.colors.accent,   // action — active tab state
        tabBarInactiveTintColor: RS.colors.textMuted,
        headerShown:             false,
        tabBarButton:            HapticTab,
        tabBarBackground:        TabBarBackground,
        tabBarStyle: {
          // Docked to the bottom edge. Absolute so content scrolls under the
          // glass; screens pad by the reported tab bar height.
          position:        'absolute',
          bottom:           0,
          left:             0,
          right:            0,
          height:           RS.tabBar.contentHeight + insets.bottom,
          paddingBottom:    insets.bottom,
          // Transparent — BlurView + scrim provide the surface
          backgroundColor: 'transparent',
          borderTopWidth:   StyleSheet.hairlineWidth,
          borderTopColor:   RS.colors.border,
          elevation:        0,
        },
        tabBarLabelStyle: {
          fontSize:   RS.typography.micro,
          fontWeight: '600',
          marginTop:  -2,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="house.fill" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="daily-reel"
        options={{
          title: 'Daily Reel',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="film.fill" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="magnifyingglass" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="diary"
        options={{
          title: 'Diary',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="calendar" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="lists"
        options={{
          title: 'Lists',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="list.bullet" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person.fill" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
