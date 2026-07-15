import Animated, {
  useAnimatedRef,
  useScrollViewOffset,
} from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientAtmosphere } from '@/components/AmbientAtmosphere';
import { AwardWinnersCarousel } from '@/components/AwardWinnersCarousel';
import { BookSection } from '@/components/BookSection';
import { CollectionsRow } from '@/components/CollectionsRow';
import { DiscoverEditorialCard } from '@/components/DiscoverEditorialCard';
import { DiscoverHero } from '@/components/DiscoverHero';
import { FeaturedCollectionSpotlight } from '@/components/FeaturedCollectionSpotlight';
import { FilterChips } from '@/components/FilterChips';
import { FloatingSearchBar } from '@/components/FloatingSearchBar';
import { GenreChipsRow } from '@/components/GenreChipsRow';
import { HiddenGemsCarousel } from '@/components/HiddenGemsCarousel';
import { MindBendingCarousel } from '@/components/MindBendingCarousel';
import { RandomDiscoveryCard } from '@/components/RandomDiscoveryCard';
import { RevealOnMount } from '@/components/RevealOnMount';
import { SectionHeader } from '@/components/section-header';
import { TrendingCarousel } from '@/components/TrendingCarousel';
import { TvPicksCarousel } from '@/components/TvPicksCarousel';
import { AtmosphereProvider } from '@/contexts/AtmosphereContext';
import { RS } from '@/constants/theme';

export default function DiscoverScreen() {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY   = useScrollViewOffset(scrollRef);

  return (
    <AtmosphereProvider>
      <View style={styles.screen}>

        {/* Darker cinematic atmosphere behind all content */}
        <AmbientAtmosphere scrollY={scrollY} dimmed />

        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <Animated.ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            contentContainerStyle={styles.content}
          >

            {/* ── Phase 1: Hero → Search → Filter → Featured → Hidden Gems ── */}

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
              <FeaturedCollectionSpotlight />
            </RevealOnMount>

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

            {/* ── Editorial card 1: "If you loved Interstellar…" ─────────── */}
            <RevealOnMount delay={180}>
              <DiscoverEditorialCard
                headline={"If you loved\nInterstellar…"}
                supporting="These films share that rare quality — leaving you with a sense of something vast and unresolved."
              />
            </RevealOnMount>

            {/* ── Phase 2: Award Winners ────────────────────────────────── */}
            <RevealOnMount delay={200}>
              <View style={styles.section}>
                <SectionHeader
                  title="Award Winners"
                  subtitle="Recognised by the industry, remembered by us."
                />
                <AwardWinnersCarousel />
              </View>
            </RevealOnMount>

            {/* ── Browse by Genre — direct port of the website's Discover
                 "Browse by Genre" section (components/discover/
                 DiscoverClient.tsx), same position (after Award Winners),
                 same copy, same 12-genre config, links to the new Genre
                 Detail screen. This is genre browsing's real entry point —
                 the website's Movie/TV Detail genre metadata is plain text,
                 never a link, so it stays that way here too. ── */}
            <RevealOnMount delay={230}>
              <View style={styles.section}>
                <SectionHeader
                  title="🎭 Browse by Genre"
                  subtitle="Explore by mood, theme, or taste."
                />
                <GenreChipsRow />
              </View>
            </RevealOnMount>

            {/* ── Phase 2: Mind-Bending ─────────────────────────────────── */}
            <RevealOnMount delay={220}>
              <View style={styles.section}>
                <SectionHeader
                  title="Mind-Bending"
                  subtitle="Stories that rearrange how you think."
                />
                <MindBendingCarousel />
              </View>
            </RevealOnMount>

            {/* ── Phase 1: Trending Today ───────────────────────────────── */}
            <RevealOnMount delay={240}>
              <View style={styles.section}>
                <SectionHeader
                  title="Trending Today"
                  subtitle="Stories everyone is talking about."
                />
                <TrendingCarousel />
              </View>
            </RevealOnMount>

            {/* ── Editorial card 2: "Watch these before they leave…" ──────── */}
            <RevealOnMount delay={250}>
              <DiscoverEditorialCard
                headline={"Watch these before\nthey leave streaming."}
                supporting="A short window is all some films get. These are worth clearing your evening for right now."
              />
            </RevealOnMount>

            {/* ── Phase 2: TV Picks ─────────────────────────────────────── */}
            <RevealOnMount delay={260}>
              <View style={styles.section}>
                <SectionHeader
                  title="TV Picks"
                  subtitle="Television worth clearing your evening for."
                />
                <TvPicksCarousel />
              </View>
            </RevealOnMount>

            {/* ── Phase 2: Additional Collections Row ──────────────────── */}
            <RevealOnMount delay={270}>
              <View style={styles.section}>
                <SectionHeader
                  eyebrow="Collections"
                  title="More to Explore"
                  subtitle="Curated lists for every mood."
                />
                <CollectionsRow />
              </View>
            </RevealOnMount>

            {/* ── Editorial card 3: "Greatest directorial debuts" ──────── */}
            <RevealOnMount delay={280}>
              <DiscoverEditorialCard
                headline={"The greatest\ndirectorial debuts."}
                supporting="Every iconic filmmaker had a first film. These are the ones that announced a voice too distinct to ignore."
              />
            </RevealOnMount>

            {/* ── Phase 2: Book Section ─────────────────────────────────── */}
            <RevealOnMount delay={290}>
              <BookSection />
            </RevealOnMount>

            {/* ── Phase 1: Random Discovery ─────────────────────────────── */}
            <RevealOnMount delay={300}>
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
