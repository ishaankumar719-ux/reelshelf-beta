import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BecauseYouLovedCarousel } from '@/components/BecauseYouLovedCarousel';
import { ContinueWatchingCard } from '@/components/continue-watching-card';
import { FeaturedCarousel } from '@/components/FeaturedCarousel';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { SectionHeader } from '@/components/section-header';
import { TrendingCarousel } from '@/components/TrendingCarousel';
import { RS } from '@/constants/theme';
import { continueWatching } from '@/data/mockHomeContent';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* 1 ── Header: wordmark, BETA badge, bell, avatar */}
        <Header />

        {/* 2 ── Hero: heading, subtitle, Surprise Me + Browse CTAs */}
        <Hero />

        {/* 3 ── Featured Carousel (3 items — film / TV / book) */}
        <SectionHeader title="Featured" />
        <FeaturedCarousel />

        {/* 4 ── Trending Today */}
        <SectionHeader title="Trending Today" />
        <TrendingCarousel />

        {/* 5 ── Continue Your Story */}
        <SectionHeader title="Continue Your Story" />
        <ContinueWatchingCard
          title={continueWatching.title}
          subtitle={continueWatching.subtitle}
          progress={continueWatching.progress}
          colorSeed={continueWatching.colorSeed}
        />

        {/* 6 ── Because You Loved */}
        <SectionHeader title="Because You Loved..." />
        <BecauseYouLovedCarousel />
      </ScrollView>
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
  },
});
