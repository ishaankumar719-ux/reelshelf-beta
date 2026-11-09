import { Stack } from 'expo-router';

// Discover keeps its own stack so the franchise hub and the titles it opens
// stay inside the tab: the floating tab bar stays visible, Discover stays
// selected, and back / swipe-back pop within this tab.
export default function DiscoverStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
