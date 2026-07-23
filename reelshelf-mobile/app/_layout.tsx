import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { RS } from '@/constants/theme';
import { AuthProvider } from '@/contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { initAnalytics, trackAppOpened } from '@/lib/observability/analytics';
import { initSentry } from '@/lib/observability/sentry';

// Runs once at module load, before the first render — both no-op silently
// without real env credentials (see .env.example).
initSentry();
initAnalytics();

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
  useEffect(() => {
    trackAppOpened();
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <SettingsProvider>
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
                <Stack.Screen name="achievements/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="search"          options={{ headerShown: false, presentation: 'modal' }} />
                <Stack.Screen name="settings/index"          options={{ headerShown: false }} />
                <Stack.Screen name="settings/report-bug"     options={{ headerShown: false, presentation: 'modal' }} />
                <Stack.Screen name="settings/delete-account" options={{ headerShown: false }} />
              </Stack>
              <OfflineBanner />
              <StatusBar style="light" />
            </ThemeProvider>
          </SettingsProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
