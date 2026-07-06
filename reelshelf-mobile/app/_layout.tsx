import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { RS } from '@/constants/theme';

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
    <ThemeProvider value={RSTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login"  options={{ headerShown: false }} />
        <Stack.Screen name="modal"  options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
