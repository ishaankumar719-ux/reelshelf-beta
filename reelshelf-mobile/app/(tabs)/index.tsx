import Animated, {
  useAnimatedRef,
  useScrollViewOffset,
} from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BecauseYouLovedSection } from '@/components/BecauseYouLovedCarousel';
import { CollectionsSection } from '@/components/CollectionsSection';
import { ContinueWatchingCard } from '@/components/continue-watching-card';
import { FadingHeader } from '@/components/FadingHeader';
import { FilterChips } from '@/components/FilterChips';
import { Hero } from '@/components/Hero';
import { RevealOnMount } from '@/components/RevealOnMount';
import { SectionHeader } from '@/components/section-header';
import { TrendingCarousel } from '@/components/TrendingCarousel';
import { RS } from '@/constants/theme';
import { continueWatching } from '@/data/seedHomeContent';

export default function HomeScreen() {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY   = useScrollViewOffset(scrollRef);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
      >
        {/* 1 ── Header — fades gracefully on scroll */}
        <FadingHeader scrollY={scrollY} />

        {/* 2 ── Hero: serif heading + Featured Carousel + CTAs */}
        <RevealOnMount delay={0}>
          <Hero />
        </RevealOnMount>

        {/* 3 ── Filter Chips */}
        <RevealOnMount delay={80}>
          <FilterChips />
        </RevealOnMount>

        {/* 4 ── Trending Today */}
        <RevealOnMount delay={160}>
          <View style={styles.section}>
            <SectionHeader
              title="Trending Today"
              subtitle="What's resonating right now."
            />
            <TrendingCarousel />
          </View>
        </RevealOnMount>

        {/* 5 ── Because You Loved */}
        <RevealOnMount delay={240}>
          <BecauseYouLovedSection
            title="Babylon"
            subtitle="Epic stories driven by ambition."
          />
        </RevealOnMount>

        {/* 6 ── Collections */}
        <RevealOnMount delay={320}>
          <CollectionsSection />
        </RevealOnMount>

        {/* 7 ── Continue Your Story */}
        <RevealOnMount delay={400}>
          <View style={styles.section}>
            <SectionHeader
              title="Continue Your Story"
              subtitle="Pick up where you left off."
            />
            <ContinueWatchingCard
              title={continueWatching.title}
              subtitle={continueWatching.subtitle}
              progress={continueWatching.progress}
              posterUrl={continueWatching.posterUrl}
            />
          </View>
        </RevealOnMount>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: RS.colors.base,
  },
  content: {
    paddingBottom: RS.spacing.xl,
    gap:           RS.spacing.xxl,
  },
  section: {
    gap: RS.spacing.sm,
  },
});
