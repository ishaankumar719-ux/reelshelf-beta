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
import { MediaCastCrew } from '@/components/MediaCastCrew';
import { MediaCrossMediaRow } from '@/components/MediaCrossMediaRow';
import { MediaHero } from '@/components/MediaHero';
import { NetworkErrorState } from '@/components/NetworkErrorState';
import { MediaPosterRow } from '@/components/MediaPosterRow';
import { MediaPrimaryActions } from '@/components/MediaPrimaryActions';
import { MediaReviews } from '@/components/MediaReviews';
import { MediaSynopsis } from '@/components/MediaSynopsis';
import { MediaWatchProviders } from '@/components/MediaWatchProviders';
import { RevealOnMount } from '@/components/RevealOnMount';
import { SeasonEpisodeBrowser } from '@/components/SeasonEpisodeBrowser';
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
import type { MediaType, SeedCardItem, SeedCollectionItem } from '@/data/seedHomeContent';
import { mediaDetails, type MediaDetailRecord } from '@/data/mediaDetails';
import { useMediaDetail } from '@/hooks/useMediaDetail';
import { getMediaKey } from '@/utils/listKeys';
import { useMediaPersistence } from '@/hooks/useMediaPersistence';
import { parseMediaRouteId } from '@/lib/tmdb';
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
  // TMDB details failed to load entirely (network drop, TMDB outage) — the
  // rest of the screen has nothing real to show without it (previously this
  // silently fell through to seed-fallback placeholders with no indication
  // anything had gone wrong, and no way to retry).
  const detailsError = !isBook && live.details.status === 'error';
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
        fullCast:       live.credits.data?.fullCast ?? [],
        director:       live.credits.data?.director ?? null,
        creator:        live.details.data?.creator ?? null,
        writer:         live.credits.data?.writer ?? null,
        composer:       live.credits.data?.composer ?? null,
        cinematographer: live.credits.data?.cinematographer ?? null,
        producers:      live.credits.data?.producers ?? [],
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
  const watchProvidersData  = live.watchProviders.data ?? { stream: [], rent: [], buy: [], attributionLink: null };

  // "More from this Director" — movie-only; only meaningful once credits has
  // actually resolved with a real director id (TV series never have one).
  const directorId = live.kind === 'movie' ? live.credits.data?.directorId ?? null : null;
  const showDirectorRow = !isBook && live.credits.status === 'success' && !!directorId;
  const directorLoading = showDirectorRow && live.moreFromDirector.status === 'loading';
  const directorItems   = live.moreFromDirector.data ?? [];

  // "More Like This" — the ONE recommendation section the real website has
  // (FilmDetailClient.tsx merges TMDB /recommendations with a scored local-
  // catalog fallback). Mobile has no local movie catalog to score against, so
  // the merge here is TMDB recommendations + the live TMDB director-discover
  // list mobile already fetches — same "primary + relevant fallback, deduped"
  // shape as the website, using real data mobile actually has.
  const moreLikeThisItems = [
    ...recommendationItems,
    ...directorItems.filter((d) => !recommendationItems.some((r) => r.id === d.id)),
  ].slice(0, 10);

  // "Appears in" — real collection membership: is this exact title a
  // verified item in any currently-live collection (collections/
  // collection_items tables)? Not a live TMDB discover-query re-derivation
  // of a rule anymore — see hooks/useMediaDetail.ts / lib/supabase/collections.ts.
  // Media-type-generic (movie/TV/book alike), unlike the old TMDB-rule
  // version this replaced, which only ever ran for movies/TV.
  const memberCollectionsLoading = live.collections.status === 'loading';
  const memberCollections: SeedCollectionItem[] = (live.collections.data ?? [])
    .filter((m) => m.previewItems.length > 0)
    .map((m) => ({
      id:          m.slug,
      title:       m.title,
      description: m.description,
      storyCount:  m.previewItems.length,
      items:       m.previewItems.slice(0, 4).map((item): SeedCardItem => ({
        id:        item.id,
        title:     item.title,
        year:      item.year ?? 0,
        mediaType: item.mediaType,
        posterUrl: item.posterUrl,
      })),
    }));

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
                ) : detailsError ? (
                  <NetworkErrorState message="Couldn't load this title — check your connection and try again." onRetry={live.retry} />
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
                        fullCast={detail.fullCast}
                        director={detail.director}
                        creator={detail.creator}
                        writer={detail.writer}
                        composer={detail.composer}
                        cinematographer={detail.cinematographer}
                        producers={detail.producers}
                      />
                    </View>
                  </RevealOnMount>
                ) : null}

                {/* ── Season/Episode logging — TV only. Real per-episode
                    diary logging, matching the real website's own
                    SeasonBrowser/SeriesReviewPanel feature (confirmed real,
                    not unused schema headroom — see
                    WEBSITE_DIARY_CALENDAR_TV_BOOK_AUDIT.md §2). Reuses the
                    existing Universal Review Composer exactly; no second
                    composer. ── */}
                {live.kind === 'tv' && live.details.status === 'success' && (live.details.data?.seasons.length ?? 0) > 0 && (
                  <RevealOnMount delay={200}>
                    <View style={styles.section}>
                      <SectionHeader title="Seasons & Episodes" subtitle="Log a specific episode." />
                      <SeasonEpisodeBrowser
                        tvId={parseMediaRouteId(id)?.tmdbId ?? ''}
                        seriesTitle={title ?? ''}
                        seriesYear={detail.year || 0}
                        posterUrl={posterUrl || null}
                        creator={detail.creator}
                        genres={detail.genres}
                        seasons={live.details.data!.seasons}
                      />
                    </View>
                  </RevealOnMount>
                )}

                {memberCollectionsLoading ? (
                  <View style={styles.section}>
                    <SectionHeader title="Appears in" />
                    <SkeletonPosterRow />
                  </View>
                ) : memberCollections.length > 0 ? (
                  <RevealOnMount delay={180}>
                    <View style={styles.section}>
                      {/* Real website copy is "Appears in" (FilmDetailClient.tsx),
                          not "Belongs To" / eyebrow "Collections" — corrected to
                          match per RELATED CONTENT labeling verification. */}
                      <SectionHeader title="Appears in" />
                      <FlatList<typeof memberCollections[number]>
                        data={memberCollections}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(c) => getMediaKey('collection', c.id)}
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

                {/* ── More Like This — collapsed to the ONE section the real website
                    has (FilmDetailClient.tsx: single "More Like This" row, TMDB
                    recommendations merged with a reason-annotated fallback,
                    gated on >=3 total results). Mobile has no local movie catalog
                    to score against (a documented, accepted divergence from the
                    website elsewhere in this app — see Daily Pick's candidate-pool
                    adaptation), so the fallback here is the live TMDB "more from
                    this director" list, annotated with a reason exactly the way
                    the website annotates its local-catalog fallback — an honest
                    adaptation of the same idea using data mobile actually has,
                    not a fabrication. */}
                {!isBook && (
                  (recommendationsLoading || directorLoading) ? (
                    <View style={styles.section}>
                      <SectionHeader eyebrow="Related Stories" title="More Like This" />
                      <SkeletonPosterRow />
                    </View>
                  ) : moreLikeThisItems.length >= 3 ? (
                    <RevealOnMount delay={200}>
                      <View style={styles.section}>
                        <SectionHeader eyebrow="Related Stories" title="More Like This" />
                        <MediaPosterRow items={moreLikeThisItems} />
                      </View>
                    </RevealOnMount>
                  ) : null
                )}

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

                {/* ── Reviews — Your Review is real (Supabase-backed diary_entries,
                    tap to edit via the same Composer as the Review action pill);
                    Friend/Community are real queries against followers +
                    diary_entries, gated by the same RLS Friend Activity uses. ── */}
                <View style={styles.section}>
                  <SectionHeader title="Reviews" />
                  <MediaReviews
                    id={id}
                    mediaType={resolvedMediaType}
                    title={title ?? ''}
                    posterUrl={posterUrl || null}
                    year={detail.year || 0}
                    genres={detail.genres}
                    runtime={detail.runtimeMinutes}
                    voteAverage={detail.rating}
                    director={detail.director}
                    review={persistence.review}
                    containsSpoilers={persistence.containsSpoilers}
                    onReviewSaved={(entry) => persistence.applyComposerSave({
                      rating: entry.rating,
                      review: entry.review,
                      containsSpoilers: entry.containsSpoilers,
                    })}
                  />
                </View>

                {/* Trivia and Awards sections were removed from this screen —
                    confirmed the real website has neither anywhere on Movie
                    Detail (full-file read + repo-wide grep, zero matches).
                    MediaTrivia.tsx/MediaAwards.tsx remain in the codebase,
                    just unrendered, in case real data is sourced later. */}
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
