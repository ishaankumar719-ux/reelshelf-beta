import Animated, {
  useAnimatedRef,
  useScrollViewOffset,
} from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BecauseYouLovedSection } from '@/components/BecauseYouLovedCarousel';
import { BookOfTheWeek } from '@/components/BookOfTheWeek';
import { CollectionsSection } from '@/components/CollectionsSection';
import { ContinueWatchingCard } from '@/components/continue-watching-card';
import { DailyReel } from '@/components/DailyReel';
import { EditorialHeadline } from '@/components/EditorialHeadline';
import { FadingHeader } from '@/components/FadingHeader';
import { FloatingSearchBar } from '@/components/FloatingSearchBar';
import { RevealOnMount } from '@/components/RevealOnMount';
import { SectionHeader } from '@/components/section-header';
import { TrendingCarousel } from '@/components/TrendingCarousel';
import { WelcomeBlock } from '@/components/WelcomeBlock';
import { RS } from '@/constants/theme';
import {
  bylBabylon,
  bylDune,
  bylTheBear,
  continueWatching,
} from '@/data/seedHomeContent';

export default function HomeScreen() {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY   = useScrollViewOffset(scrollRef);

  return (
    // SafeAreaView with top edge — calm, in-flow header (no full-bleed hero).
    // Bottom safe area handled by the tab navigator.
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header: fixed above scroll, fades gently on scroll (opacity only) */}
      <FadingHeader scrollY={scrollY} />

      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
      >
        {/* 1 ── Welcome greeting + date */}
        <RevealOnMount delay={0}>
          <WelcomeBlock />
        </RevealOnMount>

        {/* 2 ── Editorial feature headline (serif) */}
        <RevealOnMount delay={60}>
          <EditorialHeadline />
        </RevealOnMount>

        {/* 3 ── Floating search bar — visual centerpiece, no-op this sprint */}
        <RevealOnMount delay={80}>
          <FloatingSearchBar />
        </RevealOnMount>

        {/* 4 ── Continue Watching */}
        <RevealOnMount delay={100}>
          <View style={styles.section}>
            <SectionHeader
              title="Continue Watching"
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

        {/* 5 ── Daily Reel — signature recommendation, ONE filled button */}
        <RevealOnMount delay={140}>
          <DailyReel />
        </RevealOnMount>

        {/* 6 ── Trending Today */}
        <RevealOnMount delay={180}>
          <View style={styles.section}>
            <SectionHeader
              title="Trending Today"
              subtitle="Stories everyone is talking about."
            />
            <TrendingCarousel />
          </View>
        </RevealOnMount>

        {/* 7 ── Because You Loved: Babylon */}
        <RevealOnMount delay={220}>
          <BecauseYouLovedSection
            title="Babylon"
            subtitle="Stories about obsession, ambition and sacrifice."
            items={bylBabylon}
          />
        </RevealOnMount>

        {/* 8 ── Because You Loved: Dune */}
        <RevealOnMount delay={260}>
          <BecauseYouLovedSection
            title="Dune"
            subtitle="Epic worlds built with painstaking detail."
            items={bylDune}
          />
        </RevealOnMount>

        {/* 9 ── Because You Loved: The Bear */}
        <RevealOnMount delay={300}>
          <BecauseYouLovedSection
            title="The Bear"
            subtitle="Pressure, precision, and people who care too much."
            items={bylTheBear}
          />
        </RevealOnMount>

        {/* 10 ── Collections — hand-picked editorial carousel */}
        <RevealOnMount delay={320}>
          <CollectionsSection />
        </RevealOnMount>

        {/* 11 ── Book of the Week */}
        <RevealOnMount delay={360}>
          <BookOfTheWeek />
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
    gap:           RS.spacing.xxxl,
    paddingBottom: RS.tabBar.contentBottomPad,  // floating tab bar is position:absolute — must pad manually
  },
  section: {
    gap: RS.spacing.sm,
  },
});
