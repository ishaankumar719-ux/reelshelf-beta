// Shared Home/Discover section list — real website has exactly one section
// set rendered on both pages (app/page.tsx and app/discover/page.tsx are
// near-byte-identical, see WEBSITE_RECOMMENDATION_ENGINE_AUDIT.md), so this
// mobile component is likewise rendered identically by both screens, with
// only the one confirmed real difference applied (Discover's Hidden Gems
// excludes adult-title matches; Home's copy of the same query doesn't).
import { useCallback, useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, type ListRenderItemInfo } from 'react-native';

import { CollectionsSection } from '@/components/CollectionsSection';
import { GenreChipsRow } from '@/components/GenreChipsRow';
import { HomeBecauseYouLoved } from '@/components/HomeBecauseYouLoved';
import { PosterCard } from '@/components/poster-card';
import { SectionHeader } from '@/components/section-header';
import { RS } from '@/constants/theme';
import {
  fetchAwardWinners,
  fetchHiddenGems,
  fetchNewInCinemas,
  fetchRandomPick,
  fetchTrendingBooks,
  fetchTrendingToday,
  fetchTrendingTv,
  type SectionItem,
  type SectionMediaType,
} from '@/lib/homeDiscoverSections';
import { getMediaKey } from '@/utils/listKeys';

const ITEM_SEP = RS.spacing.sm;

function openMedia(item: SectionItem) {
  router.push(`/media/${item.id}?title=${encodeURIComponent(item.title)}&posterUrl=${encodeURIComponent(item.posterUrl ?? '')}&mediaType=${item.mediaType}`);
}

// ── Generic live TMDB/Supabase-backed row — used by every section below
// except Because You Loved (its own component), Browse by Genre, Pick
// Something Random, and Collections (all structurally different). ─────────
function SectionRow({
  title, subtitle, fetcher, refreshSignal,
}: {
  title: string;
  subtitle: string;
  fetcher: () => Promise<SectionItem[]>;
  refreshSignal?: number;
}) {
  const [items, setItems] = useState<SectionItem[] | null>(null);
  // Kept distinct from "resolved with zero results" (a real, legitimately
  // hideable outcome for a query like Award Winners this month) — a fetch
  // rejection (network drop, TMDB/Supabase error) always gets its own state
  // with a retry, rather than silently collapsing into the same "hide this
  // section" behavior as genuine emptiness.
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    setFailed(false);
    fetcher().then((data) => { if (!cancelled) setItems(data); }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  useEffect(() => load(), [load]);

  if (!failed && items !== null && items.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title={title} subtitle={subtitle} />
      {failed ? (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>Couldn&apos;t load this row.</Text>
          <Pressable onPress={load} hitSlop={6}>
            <Text style={styles.retryLabel}>Retry</Text>
          </Pressable>
        </View>
      ) : items === null ? (
        <ActivityIndicator color={RS.colors.accent} style={styles.loader} />
      ) : (
        <FlatList<SectionItem>
          data={items}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => getMediaKey(item.mediaType, item.id)}
          ItemSeparatorComponent={() => <View style={{ width: ITEM_SEP }} />}
          contentContainerStyle={styles.list}
          renderItem={({ item }: ListRenderItemInfo<SectionItem>) => (
            <View>
              <PosterCard
                title={item.title}
                year={item.year}
                mediaType={item.mediaType}
                posterUrl={item.posterUrl}
                onPress={() => openMedia(item)}
              />
              {item.badge ? <Text style={styles.badge}>{item.badge}</Text> : null}
              {item.releaseBadge ? <Text style={styles.badge}>{item.releaseBadge}</Text> : null}
            </View>
          )}
        />
      )}
    </View>
  );
}

// ── Pick Something Random — real: 3 separate buttons (movie/tv/book), each
// live-queries and navigates directly to a result (no inline preview),
// excludes the last pick per type. Exact port of components/discover/
// SurpriseMe.tsx. Replaces the old RandomDiscoveryCard's single-shuffle/
// static-pool/inline-preview pattern, which didn't match the real logic. ──
const RANDOM_BUTTONS: { type: SectionMediaType; idle: string; loading: string }[] = [
  { type: 'film', idle: '🎬 Random Movie', loading: 'Finding a film…' },
  { type: 'tv',   idle: '📺 Random TV Show', loading: 'Finding a show…' },
  { type: 'book', idle: '📚 Random Book', loading: 'Finding a book…' },
];

function RandomPickRow() {
  const [loading, setLoading] = useState<SectionMediaType | null>(null);
  const [lastIds, setLastIds] = useState<Partial<Record<SectionMediaType, string>>>({});

  const handlePress = async (type: SectionMediaType) => {
    if (loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setLoading(type);
    try {
      const result = await fetchRandomPick(type, lastIds[type] ?? null);
      if (result) {
        setLastIds((prev) => ({ ...prev, [type]: result.id }));
        openMedia(result);
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={styles.section}>
      <SectionHeader title="Pick something random" subtitle="Can't decide? We'll choose for you." />
      <View style={styles.randomRow}>
        {RANDOM_BUTTONS.map((btn) => (
          <Pressable
            key={btn.type}
            style={[styles.randomBtn, loading === btn.type && styles.randomBtnLoading]}
            disabled={loading !== null}
            onPress={() => handlePress(btn.type)}
          >
            <Text style={styles.randomBtnLabel}>{loading === btn.type ? btn.loading : btn.idle}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

interface HomeDiscoverSectionsProps {
  /** Discover applies the real adult-title filter to Hidden Gems that Home's
   *  copy of the same query doesn't — the one confirmed real difference
   *  between the two pages (WEBSITE_RECOMMENDATION_ENGINE_AUDIT.md). */
  excludeAdultContent?: boolean;
  /** Bump to re-fetch every live section — Home's pull-to-refresh. */
  refreshSignal?: number;
  /** Whether "Because You Loved" (the one genuinely personalized row in this
   *  shared section list — real website gates its equivalent the same way,
   *  see DiscoverClient.tsx's `isLoggedIn && show("recs")`) should be
   *  included at all. Defaults to true so Discover — which doesn't (and per
   *  this task's scope, doesn't need to) pass this prop — keeps its exact
   *  prior behavior unchanged; only Home's guest branch explicitly passes
   *  false, guaranteeing the row is never even mounted for guests rather
   *  than relying on its own internal auth check alone. */
  isAuthenticated?: boolean;
  /** Optional mobile-only guest sign-up card, rendered after "New in
   *  Cinemas" when provided. Undefined for every caller except Home's guest
   *  branch — Discover never passes this, so its layout is unaffected. */
  guestCTA?: React.ReactNode;
}

export function HomeDiscoverSections({
  excludeAdultContent = false, refreshSignal, isAuthenticated = true, guestCTA,
}: HomeDiscoverSectionsProps) {
  return (
    <>
      <SectionRow title="Trending Today" subtitle="Stories everyone is talking about." fetcher={fetchTrendingToday} refreshSignal={refreshSignal} />
      {isAuthenticated && <HomeBecauseYouLoved refreshSignal={refreshSignal} />}
      <SectionRow title="New in Cinemas" subtitle="Coming soon and just released." fetcher={fetchNewInCinemas} refreshSignal={refreshSignal} />
      {guestCTA}
      <SectionRow title="Trending TV" subtitle="Television everyone's watching." fetcher={fetchTrendingTv} refreshSignal={refreshSignal} />
      <SectionRow title="Trending Books" subtitle="What the community is reading." fetcher={fetchTrendingBooks} refreshSignal={refreshSignal} />
      <SectionRow title="Hidden Gems" subtitle="Highly rated, still under the radar." fetcher={() => fetchHiddenGems(excludeAdultContent)} refreshSignal={refreshSignal} />
      <SectionRow title="Award Winners" subtitle="Recognised by the industry, remembered by us." fetcher={fetchAwardWinners} refreshSignal={refreshSignal} />
      <View style={styles.section}>
        <SectionHeader title="Browse by Genre" subtitle="Explore by mood, theme, or taste." />
        <GenreChipsRow />
      </View>
      <RandomPickRow />
      <CollectionsSection refreshSignal={refreshSignal} />
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: RS.spacing.xs, marginBottom: RS.spacing.lg },
  list: { paddingHorizontal: RS.spacing.md },
  loader: { marginVertical: RS.spacing.lg },
  errorRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               RS.spacing.sm,
    paddingHorizontal: RS.spacing.md,
    paddingVertical:   RS.spacing.md,
  },
  errorText: { fontSize: RS.typography.body, color: RS.colors.textMuted },
  retryLabel: { fontSize: RS.typography.body, fontWeight: '600', color: RS.colors.accent },
  badge: {
    marginTop: RS.spacing.xs, fontSize: RS.typography.caption, color: RS.colors.textSecondary,
  },
  randomRow: { paddingHorizontal: RS.spacing.md, gap: RS.spacing.sm },
  randomBtn: {
    borderRadius: RS.button.radius, borderWidth: 0.5, borderColor: RS.colors.border,
    backgroundColor: RS.colors.elevated, paddingVertical: 12, alignItems: 'center',
  },
  randomBtnLoading: { borderColor: RS.button.primaryBorder, backgroundColor: RS.button.primaryFill },
  randomBtnLabel: { fontSize: RS.typography.body, fontWeight: '600', color: RS.colors.textPrimary },
});
