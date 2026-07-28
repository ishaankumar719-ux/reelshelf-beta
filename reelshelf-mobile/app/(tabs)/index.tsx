import { useState } from 'react';
import Animated, {
  useAnimatedRef,
  useScrollViewOffset,
} from 'react-native-reanimated';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientAtmosphere } from '@/components/AmbientAtmosphere';
import { BookOfTheWeek } from '@/components/BookOfTheWeek';
import { ContinueWatchingCard } from '@/components/continue-watching-card';
import { DailyReel } from '@/components/DailyReel';
import { EditorialHeadline } from '@/components/EditorialHeadline';
import { FadingHeader } from '@/components/FadingHeader';
import { FloatingSearchBar } from '@/components/FloatingSearchBar';
import { HomeDiscoverSections } from '@/components/HomeDiscoverSections';
import { HomeSignUpCTA } from '@/components/HomeSignUpCTA';
import { RevealOnMount } from '@/components/RevealOnMount';
import { SectionHeader } from '@/components/section-header';
import { WelcomeBlock } from '@/components/WelcomeBlock';
import { AtmosphereProvider } from '@/contexts/AtmosphereContext';
import { useAuth } from '@/contexts/AuthContext';
import { RS } from '@/constants/theme';
import { continueWatching } from '@/data/seedHomeContent';

export default function HomeScreen() {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY   = useScrollViewOffset(scrollRef);
  const { user, initializing } = useAuth();
  const isAuthenticated = !!user;

  // Pull-to-refresh — most of Home's sections are static editorial seed data
  // with nothing to re-fetch; Because You Loved (inside HomeDiscoverSections)
  // is the one real, live section, so refreshing bumps a signal it depends
  // on rather than reloading the whole screen. Its own re-fetch is fire-
  // and-forget (no completion callback to await), so the spinner clears on
  // a short fixed delay rather than hanging indefinitely.
  const [refreshing, setRefreshing] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const handleRefresh = () => {
    setRefreshing(true);
    setRefreshSignal((n) => n + 1);
    setTimeout(() => setRefreshing(false), 600);
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

          {initializing ? (
            // Session still restoring — neither the personalized nor the
            // guest tree renders yet, avoiding a flash of either while the
            // real auth state is still unknown (same pattern as Daily Reel's
            // own `initializing` branch, reusing the one shared AuthContext).
            <Animated.ScrollView contentContainerStyle={styles.content} />
          ) : isAuthenticated ? (
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

              {/* 4 ── Continue Watching — personalized, signed-in only */}
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

              {/* 6-10 ── The real website's unified 10-section Home/Discover
                  structure (Trending Today, Because You Loved, New in Cinemas,
                  Trending TV, Trending Books, Hidden Gems, Award Winners,
                  Browse by Genre, Pick Something Random, Collections) —
                  identical shared component to Discover, see
                  components/HomeDiscoverSections.tsx. Because You Loved is
                  the one genuinely personalized row in this block — included
                  here via the default isAuthenticated=true, excluded
                  entirely (not just internally-hidden) in the guest branch
                  below. Home's own additional real mobile-only sections
                  (Continue Watching, Daily Reel above; Book of the Week
                  below) are NOT part of the real website's 10 sections and
                  keep their existing positions around this block. (Friends
                  Activity — previously here — was removed: the new
                  dedicated Activity screen's Following tab, reached via
                  Header's bell icon, is now the sole place for this.) */}
              <RevealOnMount delay={180}>
                <HomeDiscoverSections refreshSignal={refreshSignal} />
              </RevealOnMount>

              {/* 11 ── Book of the Week */}
              <RevealOnMount delay={360}>
                <BookOfTheWeek />
              </RevealOnMount>
            </Animated.ScrollView>
          ) : (
            // Guest Home — confirmed-real public sections only (Trending/New
            // in Cinemas/Trending TV/Trending Books/Hidden Gems/Award
            // Winners/Browse by Genre/Pick Something Random/Collections, via
            // the same shared HomeDiscoverSections used above), with every
            // personalized section (Continue Watching, Daily Reel, Because
            // You Loved) fully absent from this tree — not internally
            // null-returning, not a placeholder — genuinely never mounted.
            <Animated.ScrollView
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              contentContainerStyle={styles.content}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={RS.colors.accent} />
              }
            >
              <RevealOnMount delay={0}>
                <WelcomeBlock />
              </RevealOnMount>

              <RevealOnMount delay={60}>
                <EditorialHeadline />
              </RevealOnMount>

              <RevealOnMount delay={80}>
                <FloatingSearchBar />
              </RevealOnMount>

              <RevealOnMount delay={140}>
                <HomeDiscoverSections
                  refreshSignal={refreshSignal}
                  isAuthenticated={false}
                  guestCTA={(
                    <HomeSignUpCTA
                      headline="Make it yours"
                      body="Create a free account to track what you've watched and read, rate and review, and get picks made for your taste."
                    />
                  )}
                />
              </RevealOnMount>

              <RevealOnMount delay={360}>
                <BookOfTheWeek />
              </RevealOnMount>
            </Animated.ScrollView>
          )}
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
