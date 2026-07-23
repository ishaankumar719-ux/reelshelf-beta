import Animated, {
  useAnimatedRef,
  useScrollViewOffset,
} from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientAtmosphere } from '@/components/AmbientAtmosphere';
import { DiscoverHero } from '@/components/DiscoverHero';
import { FilterChips } from '@/components/FilterChips';
import { FloatingSearchBar } from '@/components/FloatingSearchBar';
import { HomeDiscoverSections } from '@/components/HomeDiscoverSections';
import { RevealOnMount } from '@/components/RevealOnMount';
import { AtmosphereProvider } from '@/contexts/AtmosphereContext';
import { RS } from '@/constants/theme';

// Real website's app/discover/page.tsx renders the exact same 10-section
// structure as app/page.tsx (Home) — confirmed near-byte-identical via
// direct diff (see WEBSITE_RECOMMENDATION_ENGINE_AUDIT.md) — so this screen
// shares components/HomeDiscoverSections.tsx with Home rather than
// maintaining a second, separately-drifting implementation. Page-level
// chrome above it (Hero/Search/Filter chips) isn't part of the real 10
// sections and stays Discover-specific. The one confirmed real difference
// between the two pages — Discover's Hidden Gems excludes TMDB results
// whose title matches an adult-content token, Home's copy of the same query
// doesn't — is applied via excludeAdultContent.
export default function DiscoverScreen() {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY   = useScrollViewOffset(scrollRef);

  return (
    <AtmosphereProvider>
      <View style={styles.screen}>
        <AmbientAtmosphere scrollY={scrollY} dimmed />

        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <Animated.ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            contentContainerStyle={styles.content}
          >
            <RevealOnMount delay={0}>
              <DiscoverHero />
            </RevealOnMount>

            <RevealOnMount delay={60}>
              <FloatingSearchBar />
            </RevealOnMount>

            <RevealOnMount delay={80}>
              <FilterChips />
            </RevealOnMount>

            <RevealOnMount delay={120}>
              <HomeDiscoverSections excludeAdultContent />
            </RevealOnMount>
          </Animated.ScrollView>
        </SafeAreaView>
      </View>
    </AtmosphereProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: RS.colors.base,
  },
  safeArea: {
    flex:            1,
    backgroundColor: 'transparent',
  },
  content: {
    gap:           RS.spacing.xxxl,
    paddingBottom: RS.tabBar.contentBottomPad,
  },
});
