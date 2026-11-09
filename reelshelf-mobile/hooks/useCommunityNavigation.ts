import { StackActions, useNavigation } from '@react-navigation/native';
import { router, useSegments } from 'expo-router';
import { useCallback } from 'react';

/** "/discover" when this screen lives in the Discover tab's stack (so links
 *  keep the tab bar), "" for the root stack (e.g. a title opened from Search). */
export function useStackBase() {
  const segments = useSegments() as string[];
  return segments[0] === '(tabs)' && segments[1] === 'discover' ? '/discover' : '';
}

/** Opens a franchise hub. If that hub is already in this stack (the title was
 *  opened from it), pop back to it instead of pushing a second copy. */
export function useOpenCommunity() {
  const navigation = useNavigation();
  const base = useStackBase();

  return useCallback(
    (slug: string) => {
      const state = navigation.getState();
      const existing = state?.routes.find(
        (route) => route.name === 'community/[slug]' && (route.params as { slug?: string } | undefined)?.slug === slug,
      );
      if (existing) {
        navigation.dispatch(StackActions.popTo(existing.name, existing.params));
        return;
      }
      router.push(`${base}/community/${slug}`);
    },
    [navigation, base],
  );
}

/** Back that never strands the user: falls back to Discover if there is no
 *  history (e.g. the screen was opened from a deep link). */
export function goBackOrDiscover() {
  if (router.canGoBack()) router.back();
  else router.replace('/discover');
}
