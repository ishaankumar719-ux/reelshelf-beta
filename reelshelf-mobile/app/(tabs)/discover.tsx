import Animated, {
  useAnimatedRef,
  useScrollViewOffset,
} from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientAtmosphere } from '@/components/AmbientAtmosphere';
import { DiscoverEditorialCard } from '@/components/DiscoverEditorialCard';
import { DiscoverHero } from '@/components/DiscoverHero';
import { FeaturedCollectionSpotlight } from '@/components/FeaturedCollectionSpotlight';
import { FilterChips } from '@/components/FilterChips';
import { FloatingSearchBar } from '@/components/FloatingSearchBar';
import { HiddenGemsCarousel } from '@/components/HiddenGemsCarousel';
import { RandomDiscoveryCard } from '@/components/RandomDiscoveryCard';
import { RevealOnMount } from '@/components/RevealOnMount';
import { SectionHeader } from '@/components/section-header';
import { TrendingCarousel } from '@/components/TrendingCarousel';
import { AtmosphereProvider } from '@/contexts/AtmosphereContext';
import { RS } from '@/constants/theme';

export default function DiscoverScreen() {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY   = useScrollViewOffset(scrollRef);

  return (
    <AtmosphereProvider>
      <View style={styles.screen}>

        {/* Darker cinematic atmosphere — atmosphere shows through top content */}
        <AmbientAtmosphere scrollY={scrollY} dimmed />

        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <Animated.ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            contentContainerStyle={styles.content}
          >
            {/* 1 ── Hero: large serif title + subtitle */}
            <RevealOnMount delay={0}>
              <DiscoverHero />
            </RevealOnMount>

            {/* 2 ── Floating search bar */}
            <RevealOnMount delay={60}>
              <FloatingSearchBar />
            </RevealOnMount>

            {/* 3 ── Filter chips */}
            <RevealOnMount delay={80}>
              <FilterChips />
            </RevealOnMount>

            {/* 4 ── Featured Collection spotlight */}
            <RevealOnMount delay={120}>
              <FeaturedCollectionSpotlight />
            </RevealOnMount>

            {/* 5 ── Hidden Gems carousel */}
            <RevealOnMount delay={160}>
              <View style={styles.section}>
                <SectionHeader
                  eyebrow="Hidden Gems"
                  title="Under the Radar"
                  subtitle="Stories worth finding."
                />
                <HiddenGemsCarousel />
              </View>
            </RevealOnMount>

            {/* 6 ── Editorial card */}
            <RevealOnMount delay={200}>
              <DiscoverEditorialCard />
            </RevealOnMount>

            {/* 7 ── Trending Today */}
            <RevealOnMount delay={240}>
              <View style={styles.section}>
                <SectionHeader
                  title="Trending Today"
                  subtitle="Stories everyone is talking about."
                />
                <TrendingCarousel />
              </View>
            </RevealOnMount>

            {/* 8 ── Random Discovery */}
            <RevealOnMount delay={280}>
              <RandomDiscoveryCard />
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
  section: {
    gap: RS.spacing.sm,
  },
});
