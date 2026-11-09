import { useEffect, useMemo, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MediaPosterRow, type PosterRowItem } from '@/components/MediaPosterRow';
import { SectionHeader } from '@/components/section-header';
import { Fonts, RS } from '@/constants/theme';
import {
  getFranchiseCommunity,
  shortLabel,
  toMediaRouteId,
  type FranchiseCommunity,
  type FranchiseMediaType,
} from '@/data/franchiseCommunities';
import { goBackOrDiscover, useStackBase } from '@/hooks/useCommunityNavigation';
import { fetchFilmBackdrop, fetchFranchiseTitleImage } from '@/lib/franchiseImages';

const shelves: { type: FranchiseMediaType; label: string }[] = [
  { type: 'book', label: 'Books' },
  { type: 'film', label: 'Films' },
  { type: 'series', label: 'Series' },
];

function openMedia(base: string, routeId: string, title: string, posterUrl: string | null, mediaType: string) {
  router.push(
    `${base}/media/${routeId}?title=${encodeURIComponent(title)}&posterUrl=${encodeURIComponent(posterUrl ?? '')}&mediaType=${mediaType}`,
  );
}

export default function CommunityScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const community = getFranchiseCommunity(slug ?? '');

  if (!community) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <BackButton />
        <Text style={styles.missing}>This community isn’t available.</Text>
      </SafeAreaView>
    );
  }

  return <CommunityHub community={community} />;
}

function BackButton({ top }: { top?: number }) {
  return (
    <Pressable
      style={[styles.backBtn, top !== undefined && { position: 'absolute', top, zIndex: 10 }]}
      onPress={goBackOrDiscover}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={8}
    >
      <MaterialIcons name="arrow-back" size={22} color={RS.colors.textPrimary} />
    </Pressable>
  );
}

function CommunityHub({ community }: { community: FranchiseCommunity }) {
  const [images, setImages] = useState<Record<string, string | null>>({});
  const [backdrop, setBackdrop] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const base = useStackBase();

  useEffect(() => {
    let cancelled = false;
    community.titles.forEach((title) => {
      fetchFranchiseTitleImage(title)
        .catch(() => null)
        .then((url) => {
          if (!cancelled) setImages((prev) => ({ ...prev, [toMediaRouteId(title.type, title.id)]: url }));
        });
    });
    if (community.featured) {
      fetchFilmBackdrop(community.featured.filmId).then((url) => {
        if (!cancelled) setBackdrop(url);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [community]);

  const rows = useMemo(
    () =>
      shelves
        .map(({ type, label }) => ({
          label,
          items: community.titles
            .filter((title) => title.type === type)
            .map<PosterRowItem>((title) => {
              const id = toMediaRouteId(title.type, title.id);
              return {
                id,
                title: shortLabel(title.title, community.name),
                year: title.year,
                posterUrl: images[id] ?? null,
                mediaType: type === 'series' ? 'tv' : type,
              };
            }),
        }))
        .filter((row) => row.items.length > 0),
    [community, images],
  );

  const counts = rows.map((row) => `${row.items.length} ${row.label.toLowerCase()}`).join(' · ');
  const featured = community.featured;
  const featuredBook = featured && community.titles.find((t) => t.type === 'book' && t.id === featured.bookId);
  const featuredFilm = featured && community.titles.find((t) => t.type === 'film' && t.id === featured.filmId);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          {backdrop ? (
            <Image source={{ uri: backdrop }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
          ) : null}
          <LinearGradient
            colors={['rgba(42,22,16,0.35)', 'rgba(14,10,11,0.75)', RS.colors.base]}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />
          {/* Keeps the hero copy clear of the pinned back button. */}
          <View style={{ height: insets.top + 52 }} />

          <View style={styles.heroBody}>
            <Text style={styles.eyebrow}>{`FRANCHISE COMMUNITY · ${counts.toUpperCase()}`}</Text>
            <Text style={styles.franchise} accessibilityRole="header">{community.name}</Text>

            {featured ? (
              <>
                <Text style={styles.featuredLabel}>FEATURED</Text>
                <Text style={styles.featuredTitle}>{featured.title}</Text>
                <Text style={styles.tagline}>{featured.tagline}</Text>
                <View style={styles.ctaRow}>
                  {featuredBook ? (
                    <Pressable
                      style={[styles.cta, styles.ctaPrimary]}
                      accessibilityRole="link"
                      onPress={() => {
                        const id = toMediaRouteId('book', featuredBook.id);
                        openMedia(base, id, featuredBook.title, images[id] ?? null, 'book');
                      }}
                    >
                      <Text style={styles.ctaPrimaryText}>View the book</Text>
                    </Pressable>
                  ) : null}
                  {featuredFilm ? (
                    <Pressable
                      style={[styles.cta, styles.ctaSecondary]}
                      accessibilityRole="link"
                      onPress={() => {
                        const id = toMediaRouteId('film', featuredFilm.id);
                        openMedia(base, id, featuredFilm.title, images[id] ?? null, 'film');
                      }}
                    >
                      <Text style={styles.ctaSecondaryText}>View the film</Text>
                    </Pressable>
                  ) : null}
                </View>
              </>
            ) : (
              <Text style={styles.tagline}>{community.description}</Text>
            )}
          </View>
        </View>

        <View style={styles.starter} accessibilityRole="summary">
          <View style={styles.starterRule} />
          <View style={styles.starterHead}>
            <Text style={styles.starterEyebrow}>FROM THE REELSHELF EDITORS</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>SPOILER-FREE</Text>
            </View>
          </View>
          <Text style={styles.starterTitle}>{community.discussion.title}</Text>
          <Text style={styles.starterPrompt}>{community.discussion.prompt}</Text>
          <Text style={styles.starterNote}>Replies open soon. For now, take the prompt with you.</Text>
        </View>

        {rows.map((row) => (
          <View key={row.label} style={styles.shelf}>
            <View style={styles.shelfHeader}>
              <SectionHeader title={row.label} subtitle={`${row.items.length} titles`} />
            </View>
            <MediaPosterRow items={row.items} hrefBase={base} />
          </View>
        ))}
      </ScrollView>

      {/* Pinned, so it stays tappable after scrolling down the shelves. */}
      <BackButton top={insets.top + RS.spacing.xs} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: RS.colors.base,
  },
  content: {
    // Clears the floating tab bar when the hub is inside the Discover tab.
    paddingBottom: RS.tabBar.contentBottomPad,
    gap: RS.spacing.lg,
  },
  missing: {
    color: RS.colors.textSecondary,
    fontSize: RS.typography.body,
    padding: RS.spacing.md,
  },
  backBtn: {
    width: 44,
    height: 44,
    marginLeft: RS.spacing.sm,
    borderRadius: 22,
    backgroundColor: 'rgba(7,7,7,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    minHeight: 460,
    backgroundColor: '#0e0a0b',
    overflow: 'hidden',
  },
  heroBody: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: RS.spacing.md,
    paddingTop: RS.spacing.xl,
    paddingBottom: RS.spacing.lg,
  },
  eyebrow: {
    color: RS.colors.gold,
    fontSize: RS.typography.caption,
    fontWeight: '600',
    letterSpacing: RS.letterSpacing.widest,
  },
  franchise: {
    marginTop: RS.spacing.xs,
    color: RS.colors.textSecondary,
    fontSize: RS.typography.body,
    fontWeight: '500',
  },
  featuredLabel: {
    marginTop: RS.spacing.lg,
    color: RS.colors.textSecondary,
    fontSize: RS.typography.caption,
    fontWeight: '600',
    letterSpacing: RS.letterSpacing.widest,
  },
  featuredTitle: {
    marginTop: RS.spacing.xs,
    color: RS.colors.textPrimary,
    fontFamily: Fonts?.serif,
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: RS.letterSpacing.tight,
  },
  tagline: {
    marginTop: RS.spacing.sm,
    color: 'rgba(255,255,255,0.8)',
    fontSize: RS.typography.subheading,
    lineHeight: 22,
  },
  ctaRow: {
    marginTop: RS.spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: RS.spacing.sm,
  },
  cta: {
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: RS.button.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPrimary: {
    backgroundColor: '#fde68a',
  },
  ctaPrimaryText: {
    color: '#1a0f0a',
    fontSize: RS.typography.body,
    fontWeight: '600',
  },
  ctaSecondary: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  ctaSecondaryText: {
    color: RS.colors.textPrimary,
    fontSize: RS.typography.body,
    fontWeight: '600',
  },
  starter: {
    marginHorizontal: RS.spacing.md,
    padding: RS.spacing.md,
    paddingLeft: RS.spacing.md + 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.2)',
    backgroundColor: 'rgba(251,191,36,0.05)',
    overflow: 'hidden',
  },
  starterRule: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: 'rgba(252,211,77,0.8)',
  },
  starterHead: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: RS.spacing.sm,
  },
  starterEyebrow: {
    color: RS.colors.gold,
    fontSize: RS.typography.caption,
    fontWeight: '600',
    letterSpacing: RS.letterSpacing.wide,
  },
  badge: {
    borderWidth: 1,
    borderColor: RS.colors.borderStrong,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: RS.letterSpacing.wide,
  },
  starterTitle: {
    marginTop: RS.spacing.sm,
    color: RS.colors.textPrimary,
    fontFamily: Fonts?.serif,
    fontSize: 19,
    lineHeight: 25,
  },
  starterPrompt: {
    marginTop: RS.spacing.sm,
    color: 'rgba(255,255,255,0.75)',
    fontSize: RS.typography.body,
    lineHeight: 20,
  },
  starterNote: {
    marginTop: RS.spacing.sm,
    color: RS.colors.textSecondary,
    fontSize: 13,
  },
  shelf: {
    gap: RS.spacing.sm,
  },
  shelfHeader: {
    paddingHorizontal: RS.spacing.md,
  },
});
