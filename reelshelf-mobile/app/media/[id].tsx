import { BlurView } from 'expo-blur';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedRef,
  useScrollViewOffset,
} from 'react-native-reanimated';

import { AmbientAtmosphere } from '@/components/AmbientAtmosphere';
import { CollectionPreviewCard } from '@/components/CollectionPreviewCard';
import { ExpandEntrance } from '@/components/ExpandEntrance';
import { FriendActivity } from '@/components/FriendActivity';
import { MediaAwards } from '@/components/MediaAwards';
import { MediaCastCrew } from '@/components/MediaCastCrew';
import { MediaCrossMediaRow } from '@/components/MediaCrossMediaRow';
import { MediaHero } from '@/components/MediaHero';
import { MediaPosterRow } from '@/components/MediaPosterRow';
import { MediaPrimaryActions } from '@/components/MediaPrimaryActions';
import { MediaReviews } from '@/components/MediaReviews';
import { MediaSynopsis } from '@/components/MediaSynopsis';
import { MediaTrivia } from '@/components/MediaTrivia';
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
import { useAuth } from '@/contexts/AuthContext';
import { RS } from '@/constants/theme';
import { collections, type MediaType, type SeedCollectionItem } from '@/data/seedHomeContent';
import { mediaDetails, type MediaDetailRecord } from '@/data/mediaDetails';
import { useMediaDetail } from '@/hooks/useMediaDetail';
import { useMediaPersistence } from '@/hooks/useMediaPersistence';
import type { MediaMeta } from '@/lib/supabase/mediaActions';

export default function MediaDetailScreen() {
  const { id, title, posterUrl, mediaType } = useLocalSearchParams<{
    id:        string;
    title:     string;
    posterUrl: string;
    mediaType: string;
    expand?:   string;
  }>();

  const live = useMediaDetail(id);
  const { user } = useAuth();
  const isBook = live.kind === null;
  const resolvedMediaType = (mediaType as MediaType) ?? 'film';

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
        trivia:         seedDetail?.trivia ?? [],
        awards:         seedDetail?.awards ?? [],
      };

  const meta: MediaMeta = {
    id,
    title: title ?? '',
    posterUrl: posterUrl || null,
    mediaType: resolvedMediaType,
    year: detail.year || 0,
    genres: detail.genres,
    runtime: detail.runtimeMinutes,
    voteAverage: detail.rating,
    director: detail.director,
  };
  const persistence = useMediaPersistence(id, meta, user?.id ?? null);

  const recommendationItems = live.recommendations.data ?? [];
  const watchProvidersData  = live.watchProviders.data ?? { stream: [], rent: [], buy: [] };

  // "More from this Director" — movie-only; only meaningful once credits has
  // actually resolved with a real director id (TV series never have one).
  const directorId = live.kind === 'movie' ? live.credits.data?.directorId ?? null : null;
  const showDirectorRow = !isBook && live.credits.status === 'success' && !!directorId;
  const directorLoading = showDirectorRow && live.moreFromDirector.status === 'loading';
  const directorItems   = live.moreFromDirector.data ?? [];

  const memberCollections = collections.filter(c => c.items.some(i => i.id === id));
  // Collection-membership sibling row: other real items from the first
  // collection this title belongs to (if any) — not the collection cards
  // themselves (those stay in "Belongs To" below), the other titles inside it.
  const siblingCollection: SeedCollectionItem | undefined = memberCollections[0];
  const siblingItems = siblingCollection
    ? siblingCollection.items
        .filter(i => i.id !== id)
        .map(i => ({ id: i.id, title: i.title, year: i.year, posterUrl: i.posterUrl, mediaType: i.mediaType }))
    : [];

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
                    mediaType={resolvedMediaType}
                    posterUrl={posterUrl || null}
                    detail={detail}
                  />
                )}

                <RevealOnMount delay={60}>
                  <MediaPrimaryActions
                    id={id}
                    title={title ?? ''}
                    synopsis={detail.synopsis || undefined}
                    mediaType={resolvedMediaType}
                    posterUrl={posterUrl || null}
                    year={detail.year || 0}
                    genres={detail.genres}
                    runtime={detail.runtimeMinutes}
                    voteAverage={detail.rating}
                    director={detail.director}
                    inShelf={persistence.inShelf}
                    watched={persistence.watched}
                    rating={persistence.rating}
                    review={persistence.review}
                    error={persistence.error}
                    onToggleShelf={persistence.toggleShelf}
                    onToggleWatched={persistence.toggleWatched}
                    onSaveRating={persistence.saveRating}
                    onReviewSaved={(entry) => persistence.applyComposerSave({
                      rating: entry.rating,
                      review: entry.review,
                      containsSpoilers: entry.containsSpoilers,
                    })}
                  />
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
                      <FlatList<typeof memberCollections[number]>
                        data={memberCollections}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(c) => c.id}
                        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                        contentContainerStyle={styles.collectionsList}
                        renderItem={({ item }) => <CollectionPreviewCard item={item} />}
                      />
                    </View>
                  </RevealOnMount>
                ) : null}

                {/* ── Related Stories — automatable rows only. Cross-media matching
                    (e.g. books with a similar theme) needs editorial curation, not
                    an algorithm — see MediaCrossMediaRow / data/relatedStoriesSeed.ts. ── */}

                {showDirectorRow && (
                  directorLoading ? (
                    <View style={styles.section}>
                      <SectionHeader eyebrow="Related Stories" title={`More from ${live.credits.data?.director}`} />
                      <SkeletonPosterRow />
                    </View>
                  ) : directorItems.length > 0 ? (
                    <RevealOnMount delay={200}>
                      <View style={styles.section}>
                        <SectionHeader eyebrow="Related Stories" title={`More from ${live.credits.data?.director}`} />
                        <MediaPosterRow items={directorItems} />
                      </View>
                    </RevealOnMount>
                  ) : null
                )}

                {!isBook && (
                  recommendationsLoading ? (
                    <View style={styles.section}>
                      <SectionHeader eyebrow="Related Stories" title="Because You Liked This" />
                      <SkeletonPosterRow />
                    </View>
                  ) : recommendationItems.length > 0 ? (
                    <RevealOnMount delay={220}>
                      <View style={styles.section}>
                        <SectionHeader eyebrow="Related Stories" title="Because You Liked This" />
                        <MediaPosterRow items={recommendationItems} />
                      </View>
                    </RevealOnMount>
                  ) : null
                )}

                {siblingItems.length > 0 ? (
                  <RevealOnMount delay={240}>
                    <View style={styles.section}>
                      <SectionHeader eyebrow="Related Stories" title={`More ${siblingCollection!.title}`} />
                      <MediaPosterRow items={siblingItems} />
                    </View>
                  </RevealOnMount>
                ) : null}

                <MediaCrossMediaRow id={id} />

                {/* ── Watch Providers — hardcoded to the US region (see lib/tmdb.ts).
                    Not on TMDB for books, so this section doesn't apply there. ── */}
                {!isBook && (
                  watchProvidersLoading ? (
                    <View style={styles.section}>
                      <SectionHeader title="Watch Providers" subtitle="Where to stream, rent, or buy." />
                      <SkeletonProviderRow />
                    </View>
                  ) : (
                    <RevealOnMount delay={260}>
                      <View style={styles.section}>
                        <SectionHeader title="Watch Providers" subtitle="Where to stream, rent, or buy." />
                        <MediaWatchProviders providers={watchProvidersData} />
                      </View>
                    </RevealOnMount>
                  )
                )}

                {/* ── Friend Activity — real once authenticated (followers + their
                    public diary_entries), honest empty state otherwise. ── */}
                <View style={styles.section}>
                  <SectionHeader title="Friend Activity" />
                  <FriendActivity id={id} mediaType={resolvedMediaType} />
                </View>

                {/* ── Reviews — Your Review is real (locally persisted); Friend/Community
                    are honest empty states. ── */}
                <View style={styles.section}>
                  <SectionHeader title="Reviews" />
                  <MediaReviews review={persistence.review} containsSpoilers={persistence.containsSpoilers} />
                </View>

                {/* ── Trivia / Awards — conditionally hidden shells; both seed fields
                    are empty for every title until a real sourcing decision is made
                    (see RETURN's OPEN_QUESTIONS). ── */}
                {detail.trivia && detail.trivia.length > 0 ? (
                  <View style={styles.section}>
                    <SectionHeader eyebrow="Did You Know?" title="Trivia" />
                    <MediaTrivia trivia={detail.trivia} />
                  </View>
                ) : null}

                {detail.awards && detail.awards.length > 0 ? (
                  <View style={styles.section}>
                    <SectionHeader title="Awards" />
                    <MediaAwards awards={detail.awards} />
                  </View>
                ) : null}
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
