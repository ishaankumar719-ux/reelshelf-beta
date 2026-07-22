import { useState } from 'react';
import Animated, {
  useAnimatedRef,
  useScrollViewOffset,
} from 'react-native-reanimated';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientAtmosphere } from '@/components/AmbientAtmosphere';
import { BecauseYouLovedSection } from '@/components/BecauseYouLovedCarousel';
import { BookOfTheWeek } from '@/components/BookOfTheWeek';
import { CollectionsSection } from '@/components/CollectionsSection';
import { ContinueWatchingCard } from '@/components/continue-watching-card';
import { DailyReel } from '@/components/DailyReel';
import { EditorialHeadline } from '@/components/EditorialHeadline';
import { FadingHeader } from '@/components/FadingHeader';
import { FloatingSearchBar } from '@/components/FloatingSearchBar';
import { HomeFriendsActivity } from '@/components/HomeFriendsActivity';
import { RevealOnMount } from '@/components/RevealOnMount';
import { SectionHeader } from '@/components/section-header';
import { TrendingCarousel } from '@/components/TrendingCarousel';
import { WelcomeBlock } from '@/components/WelcomeBlock';
import { AtmosphereProvider } from '@/contexts/AtmosphereContext';
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

  // Pull-to-refresh — Home's other sections are static editorial seed data
  // with nothing to re-fetch; Friends Activity is the one real, live section,
  // so refreshing bumps a signal it depends on rather than reloading the
  // whole screen.
  const [refreshing, setRefreshing] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const handleRefresh = () => {
    setRefreshing(true);
    setRefreshSignal((n) => n + 1);
  };

  return (
    <AtmosphereProvider>
      {/* Outer wrapper provides dark base background + absolute atmosphere layer */}
      <View style={styles.screen}>

        {/* Cinematic atmosphere — absolute, behind all content, top 38% of screen */}
        <AmbientAtmosphere scrollY={scrollY} />

        {/* SafeAreaView: transparent bg so atmosphere shows through top content */}
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* Header: fixed above scroll, fades gently on scroll (opacity only) */}
          <FadingHeader scrollY={scrollY} />

          <Animated.ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={RS.colors.accent} />
            }
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
                  id={continueWatching.id}
                  title={continueWatching.title}
                  subtitle={continueWatching.subtitle}
                  mediaType={continueWatching.mediaType}
                  progress={continueWatching.progress}
                  posterUrl={continueWatching.posterUrl}
                />
              </View>
            </RevealOnMount>

            {/* 5 ── Daily Reel — signature recommendation, ONE filled button */}
            <RevealOnMount delay={140}>
              <DailyReel />
            </RevealOnMount>

            {/* 5.5 ── Friends Activity — deliberate mobile-only enhancement,
                no live website equivalent (see HomeFriendsActivity.tsx header
                comment / WEBSITE_HOME_FRIENDS_ACTIVITY_AUDIT.md). Inserted
                after Daily Reel, before Collection of the Week, per spec —
                every other existing section keeps its original order. */}
            <RevealOnMount delay={160}>
              <View style={styles.section}>
                <SectionHeader
                  title="Friends Activity"
                  subtitle="What people you follow have been watching."
                />
                <HomeFriendsActivity refreshSignal={refreshSignal} onRefreshComplete={() => setRefreshing(false)} />
              </View>
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
      </View>
    </AtmosphereProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: RS.colors.base,  // dark base for area below atmosphere
  },
  safeArea: {
    flex:            1,
    backgroundColor: 'transparent',   // let atmosphere gradient show through top content
  },
  content: {
    gap:           RS.spacing.xxxl,
    paddingBottom: RS.tabBar.contentBottomPad,  // floating tab bar is position:absolute — must pad manually
  },
  section: {
    gap: RS.spacing.sm,
  },
});
