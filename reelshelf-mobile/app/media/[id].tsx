import { BlurView } from 'expo-blur';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedRef,
  useScrollViewOffset,
} from 'react-native-reanimated';

import { AmbientAtmosphere } from '@/components/AmbientAtmosphere';
import { CollectionPreviewCard } from '@/components/CollectionPreviewCard';
import { ExpandEntrance } from '@/components/ExpandEntrance';
import { MediaCastCrew } from '@/components/MediaCastCrew';
import { MediaHero } from '@/components/MediaHero';
import { MediaPrimaryActions } from '@/components/MediaPrimaryActions';
import { MediaRecommendations } from '@/components/MediaRecommendations';
import { MediaSynopsis } from '@/components/MediaSynopsis';
import { MediaWatchProviders } from '@/components/MediaWatchProviders';
import { RevealOnMount } from '@/components/RevealOnMount';
import { SectionHeader } from '@/components/section-header';
import {
  SkeletonCastRow,
  SkeletonHero,
  SkeletonPosterRow,
  SkeletonProviderRow,
  SkeletonSynopsis,
} from '@/components/Skeleton';
import { AtmosphereProvider } from '@/contexts/AtmosphereContext';
import { RS } from '@/constants/theme';
import { collections, type MediaType } from '@/data/seedHomeContent';
import { mediaDetails, type MediaDetailRecord } from '@/data/mediaDetails';
import { useMediaDetail } from '@/hooks/useMediaDetail';

export default function MediaDetailScreen() {
  const { id, title, posterUrl, mediaType } = useLocalSearchParams<{
    id:        string;
    title:     string;
    posterUrl: string;
    mediaType: string;
    expand?:   string;
  }>();

  const live = useMediaDetail(id);
  const isBook = live.kind === null;

  // Books have no TMDB equivalent — they keep using the local enrichment seed
  // entirely. For films/TV, the seed is kept ONLY for dominantColors (our own
  // extraction, not something TMDB provides) — everything else below comes
  // from the live fetch.
  const seedDetail = mediaDetails[id];

  const heroLoading = !isBook && live.details.status === 'loading';
  // Cast & Crew depends on `credits` for cast/director/writer/composer, and
  // (TV only) on `details` for the creator field — wait for whichever of the
  // two this title actually needs.
  const castCrewLoading = !isBook && (
    live.credits.status === 'loading' ||
    (live.kind === 'tv' && live.details.status === 'loading')
  );
  const recommendationsLoading = !isBook && live.recommendations.status === 'loading';
  const watchProvidersLoading  = !isBook && live.watchProviders.status === 'loading';

  const detail: MediaDetailRecord = isBook
    ? (seedDetail ?? {
        year: 0, backdropUrl: null, synopsis: '', runtimeMinutes: null, genres: [],
        rating: null, cast: [], director: null, creator: null, writer: null,
        composer: null, author: null, dominantColors: [],
      })
    : {
        year:           live.details.data?.year ?? seedDetail?.year ?? 0,
        backdropUrl:    live.details.data?.backdropUrl ?? live.fallbackBackdrop.data ?? null,
        synopsis:       live.details.data?.synopsis ?? '',
        runtimeMinutes: live.details.data?.runtimeMinutes ?? null,
        genres:         live.details.data?.genres ?? [],
        rating:         live.details.data?.rating ?? null,
        cast:           live.credits.data?.cast ?? [],
        director:       live.credits.data?.director ?? null,
        creator:        live.details.data?.creator ?? null,
        writer:         live.credits.data?.writer ?? null,
        composer:       live.credits.data?.composer ?? null,
        author:         null,
        dominantColors: seedDetail?.dominantColors ?? [],
      };

  const recommendationItems = live.recommendations.data ?? [];
  const watchProvidersData  = live.watchProviders.data ?? { stream: [], rent: [], buy: [] };

  const memberCollections = collections.filter(c => c.items.some(i => i.id === id));

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY   = useScrollViewOffset(scrollRef);

  return (
    <AtmosphereProvider initialBaseColors={detail.dominantColors}>
      <View style={styles.screen}>
        <AmbientAtmosphere scrollY={scrollY} />

        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <BlurView tint="dark" intensity={RS.blur.cardInfo} style={StyleSheet.absoluteFill} />
            <MaterialIcons name="arrow-back" size={20} color={RS.colors.textPrimary} />
          </Pressable>

          <Animated.ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            contentContainerStyle={styles.content}
          >
            <ExpandEntrance active>
              <View style={styles.sections}>
                {heroLoading ? (
                  <SkeletonHero />
                ) : (
                  <MediaHero
                    title={title ?? '—'}
                    year={detail.year || undefined}
                    mediaType={(mediaType as MediaType) ?? 'film'}
                    posterUrl={posterUrl || null}
                    detail={detail}
                  />
                )}

                <RevealOnMount delay={60}>
                  <MediaPrimaryActions title={title ?? ''} synopsis={detail.synopsis || undefined} />
                </RevealOnMount>

                {heroLoading ? (
                  <SkeletonSynopsis />
                ) : detail.synopsis ? (
                  <RevealOnMount delay={100}>
                    <MediaSynopsis synopsis={detail.synopsis} />
                  </RevealOnMount>
                ) : null}

                {castCrewLoading ? (
                  <View style={styles.section}>
                    <SectionHeader title="Cast & Crew" />
                    <SkeletonCastRow />
                  </View>
                ) : (detail.cast.length > 0 || detail.director || detail.creator || detail.writer || detail.composer) ? (
                  <RevealOnMount delay={140}>
                    <View style={styles.section}>
                      <SectionHeader title="Cast & Crew" />
                      <MediaCastCrew
                        cast={detail.cast}
                        director={detail.director}
                        creator={detail.creator}
                        writer={detail.writer}
                        composer={detail.composer}
                      />
                    </View>
                  </RevealOnMount>
                ) : null}

                {memberCollections.length > 0 ? (
                  <RevealOnMount delay={180}>
                    <View style={styles.section}>
                      <SectionHeader
                        eyebrow="Collections"
                        title="Belongs To"
                        subtitle="Part of these curated shelves."
                      />
                      <Animated.ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.collectionsList}
                      >
                        {memberCollections.map((c, i) => (
                          <View key={c.id} style={i > 0 ? { marginLeft: 12 } : undefined}>
                            <CollectionPreviewCard item={c} />
                          </View>
                        ))}
                      </Animated.ScrollView>
                    </View>
                  </RevealOnMount>
                ) : null}

                {/* Recommendations — TMDB's native /recommendations, same-media-type
                    only. Not on TMDB for books, so this section doesn't apply there. */}
                {!isBook && (
                  recommendationsLoading ? (
                    <View style={styles.section}>
                      <SectionHeader title="Recommendations" subtitle="More to explore." />
                      <SkeletonPosterRow />
                    </View>
                  ) : recommendationItems.length > 0 ? (
                    <RevealOnMount delay={200}>
                      <View style={styles.section}>
                        <SectionHeader title="Recommendations" subtitle="More to explore." />
                        <MediaRecommendations items={recommendationItems} />
                      </View>
                    </RevealOnMount>
                  ) : null
                )}

                {/* Watch Providers — hardcoded to the US region (see lib/tmdb.ts).
                    Not on TMDB for books, so this section doesn't apply there. */}
                {!isBook && (
                  watchProvidersLoading ? (
                    <View style={styles.section}>
                      <SectionHeader title="Watch Providers" subtitle="Where to stream, rent, or buy." />
                      <SkeletonProviderRow />
                    </View>
                  ) : (
                    <RevealOnMount delay={220}>
                      <View style={styles.section}>
                        <SectionHeader title="Watch Providers" subtitle="Where to stream, rent, or buy." />
                        <MediaWatchProviders providers={watchProvidersData} />
                      </View>
                    </RevealOnMount>
                  )
                )}
              </View>
            </ExpandEntrance>
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
  backButton: {
    position:       'absolute',
    top:            RS.spacing.sm,
    left:           RS.spacing.md,
    zIndex:         10,
    width:          36,
    height:         36,
    borderRadius:   18,
    overflow:       'hidden',
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth:    0.5,
    borderColor:    'rgba(255,255,255,0.14)',
  },
  content: {
    paddingBottom: RS.tabBar.contentBottomPad,
  },
  sections: {
    gap: RS.spacing.xxl,
  },
  section: {
    gap: RS.spacing.sm,
  },
  collectionsList: {
    paddingHorizontal: RS.spacing.md,
  },
});
