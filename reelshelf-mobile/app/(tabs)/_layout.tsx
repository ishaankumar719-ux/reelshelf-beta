import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

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

// ── Floating glass background — clips to pill shape via container borderRadius ─
function TabBarBackground() {
  return (
    <BlurView
      tint="dark"
      intensity={RS.blur.tabBar}
      style={[StyleSheet.absoluteFill, tabBgStyles.blur]}
    />
  );
}

const tabBgStyles = StyleSheet.create({
  blur: {
    // BorderRadius on BlurView matches the container — clips the blur to pill shape on iOS
    borderRadius: RS.tabBar.floatingRadius,
  },
});

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor:   RS.colors.accent,   // action — active tab state
        tabBarInactiveTintColor: RS.colors.textMuted,
        headerShown:             false,
        tabBarButton:            HapticTab,
        tabBarBackground:        TabBarBackground,
        tabBarStyle: {
          // Sprint 4: floating pill — detached from screen edges
          position:        'absolute',
          bottom:           RS.tabBar.floatingMarginB,
          left:             RS.tabBar.floatingMarginH,
          right:            RS.tabBar.floatingMarginH,
          height:           RS.tabBar.floatingHeight,
          borderRadius:     RS.tabBar.floatingRadius,
          // Transparent — BlurView provides the surface
          backgroundColor: 'transparent',
          // No top border — tonal glass separation does the work
          borderTopWidth:   0,
          // Shadow for depth (no overflow:hidden so shadow renders on iOS)
          shadowColor:      '#000',
          shadowOffset:     { width: 0, height: 8 },
          shadowOpacity:    0.28,
          shadowRadius:     20,
          elevation:        16,
        },
        tabBarLabelStyle: {
          fontSize:   9,
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
