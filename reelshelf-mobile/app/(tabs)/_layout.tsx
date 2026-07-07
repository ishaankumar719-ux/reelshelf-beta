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
      <IconSymbol size={22} name={name} color={color} />
      {focused && <View style={iconStyles.dot} />}
    </View>
  );
}

const iconStyles = StyleSheet.create({
  wrap: {
    alignItems:  'center',
    gap:          3,
  },
  dot: {
    width:           3,
    height:          3,
    borderRadius:    1.5,
    backgroundColor: RS.colors.accent,
  },
});

// ── Glass tab bar background ───────────────────────────────────────────────
function TabBarBackground() {
  return (
    <BlurView
      tint="dark"
      intensity={RS.blur.tabBar}
      style={StyleSheet.absoluteFill}
    />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor:   RS.colors.accent,
        tabBarInactiveTintColor: RS.colors.textMuted,
        headerShown:             false,
        tabBarButton:            HapticTab,
        tabBarBackground:        TabBarBackground,
        tabBarStyle: {
          // Glass: transparent so BlurView shows through
          backgroundColor: 'transparent',
          borderTopColor:  RS.glass.border,
          borderTopWidth:  0.5,
        },
        tabBarLabelStyle: {
          fontSize:   9,
          fontWeight: '600',
          marginTop:  -2,
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
