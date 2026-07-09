import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { RS } from '@/constants/theme';
import { AuthProvider } from '@/contexts/AuthContext';

const RSTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary:    RS.colors.accent,
    background: RS.colors.base,
    card:       RS.colors.card,
    text:       RS.colors.textPrimary,
    border:     RS.colors.border,
  },
};

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider value={RSTheme}>
          <Stack>
            <Stack.Screen name="(tabs)"          options={{ headerShown: false }} />
            <Stack.Screen name="login"           options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="modal"           options={{ presentation: 'modal', title: 'Modal' }} />
            {/* Placeholder screens — minimal, no extra content beyond nav + title/poster */}
            <Stack.Screen name="media/[id]"      options={{ headerShown: false }} />
            <Stack.Screen name="collection/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="profile/[id]"    options={{ headerShown: false }} />
            <Stack.Screen name="person/[id]"     options={{ headerShown: false }} />
            <Stack.Screen name="list/[id]"       options={{ headerShown: false }} />
            <Stack.Screen name="search"          options={{ headerShown: false, presentation: 'modal' }} />
          </Stack>
          <StatusBar style="light" />
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
