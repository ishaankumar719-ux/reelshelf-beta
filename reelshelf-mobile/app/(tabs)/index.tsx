import Animated, {
  useAnimatedRef,
  useScrollViewOffset,
} from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';

import { BecauseYouLovedSection } from '@/components/BecauseYouLovedCarousel';
import { CollectionsSection } from '@/components/CollectionsSection';
import { ContinueWatchingCard } from '@/components/continue-watching-card';
import { FadingHeader } from '@/components/FadingHeader';
import { FeaturedToday } from '@/components/FeaturedToday';
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
    // Root has no SafeAreaView top edge — Hero is full-bleed from screen top.
    // Bottom safe area is handled by the tab bar.
    <View style={styles.root}>
      {/* ── Header: floats as absolute overlay above the hero backdrop ────── */}
      {/* Fades independently of the hero collapse motion. */}
      <View style={styles.headerOverlay} pointerEvents="box-none">
        <FadingHeader scrollY={scrollY} />
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
      >
        {/* 1 ── Hero: full-bleed cinematic backdrop, ~40% screen height.
                    Parallax collapse + text fade on scroll. No buttons. */}
        <Hero scrollY={scrollY} />

        {/* 2 ── Featured Today: ONE dominant recommendation.
                    Contains the only filled button on the screen ("Log"). */}
        <RevealOnMount delay={0}>
          <FeaturedToday />
        </RevealOnMount>

        {/* 3 ── Filter Chips */}
        <RevealOnMount delay={60}>
          <FilterChips />
        </RevealOnMount>

        {/* 4 ── Trending Today */}
        <RevealOnMount delay={120}>
          <View style={styles.section}>
            <SectionHeader
              title="Trending Today"
              subtitle="What's resonating right now."
            />
            <TrendingCarousel />
          </View>
        </RevealOnMount>

        {/* 5 ── Because You Loved Babylon */}
        <RevealOnMount delay={180}>
          <BecauseYouLovedSection
            title="Babylon"
            subtitle="Stories about obsession, ambition and sacrifice."
          />
        </RevealOnMount>

        {/* 6 ── Collection of the Week (heading set inside CollectionsSection) */}
        <RevealOnMount delay={240}>
          <CollectionsSection />
        </RevealOnMount>

        {/* 7 ── Continue Your Story */}
        <RevealOnMount delay={300}>
          <View style={styles.section}>
            <SectionHeader
              eyebrow="IN PROGRESS"
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: RS.colors.base,
  },
  // FadingHeader floats above everything — Hero backdrop shows through
  headerOverlay: {
    position: 'absolute',
    top:      0,
    left:     0,
    right:    0,
    zIndex:   10,
  },
  content: {
    // "reading chapters" gap between major sections
    gap:           RS.spacing.xxxl,
    paddingBottom: RS.spacing.xxl,
  },
  section: {
    gap: RS.spacing.sm,
  },
});
