// Real, live "Because You Loved {X}" row — replaces the 3 static hardcoded
// rows (Babylon/Dune/The Bear, data/seedHomeContent.ts) this sprint. Two
// distinct real website sources combined, each used for the part it's
// actually responsible for (see WEBSITE_RECOMMENDATION_ENGINE_AUDIT.md):
//
//  - Anchor title + no-history fallback: ported from components/
//    BecauseYouLikedRow.tsx (real, live on Series/Book detail) — the only
//    real component with a single-anchor-title concept. Its rule: best
//    diary entry by (favourite bonus + rating), or don't render at all if
//    none qualifies. lib/supabase/becauseYouLoved.ts ports this exactly.
//  - Item scoring + per-item reasons: the ALREADY-PORTED Daily Reel engine
//    (lib/recommendationEngine.ts — itself a port of the website's real
//    lib/recommendation-engine.ts), reused via its new pickTopN() export
//    rather than rebuilt.
//
// recommendation-engine.ts itself has no anchor-title concept (its real
// Home/Discover row heading is static "❤️ Because You Loved…", no specific
// title) — conflating the two would misrepresent either source, so this
// documents the split honestly rather than pretending one file does both.
//
// Caching: unlike Daily Reel (single cheap Supabase read, real persistence
// lives server-side in daily_picks — its own AsyncStorage layer is a pure
// instant-paint optimization, see hooks/useDailyPick.ts), this row's real
// computation is expensive (live TMDB/Google Books candidate-pool queries +
// scoring). The cheap anchor fetch doubles as the invalidation signal: the
// anchor is derived from the same diary rows (favourite/rating≥8) that feed
// the scoring signals, so a changed anchor is a reliable proxy for "the
// user logged something that should change these recommendations." Cache
// is skipped (not just repainted-then-overwritten) when both the anchor
// still matches AND the cache is under 30 minutes old — see CACHE_TTL_MS.
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet, View } from 'react-native';

import { BecauseYouLovedSection, type BecauseYouLovedItem } from '@/components/BecauseYouLovedCarousel';
import { RevealOnMount } from '@/components/RevealOnMount';
import { SkeletonBlock, SkeletonPosterRow } from '@/components/Skeleton';
import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { buildUserContext, generateReasons, pickTopN } from '@/lib/recommendationEngine';
import { fetchBecauseYouLovedAnchor } from '@/lib/supabase/becauseYouLoved';

interface HomeBecauseYouLovedProps {
  /** Bump to force a re-fetch — Home's pull-to-refresh, same pattern as HomeFriendsActivity. */
  refreshSignal?: number;
}

const ITEM_COUNT = 8;
const CACHE_KEY = 'reelshelf:becauseYouLovedCache';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes — instructed fallback window

interface CachedRow {
  anchor:   string;
  items:    BecauseYouLovedItem[];
  cachedAt: number;
}

async function readCache(userId: string): Promise<CachedRow | null> {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_KEY}:${userId}`);
    if (!raw) return null;
    return JSON.parse(raw) as CachedRow;
  } catch {
    return null;
  }
}

function writeCache(userId: string, row: CachedRow) {
  AsyncStorage.setItem(`${CACHE_KEY}:${userId}`, JSON.stringify(row)).catch(() => {});
}

export function HomeBecauseYouLoved({ refreshSignal }: HomeBecauseYouLovedProps) {
  const { user } = useAuth();
  const [anchor, setAnchor] = useState<string | null>(null);
  const [items, setItems] = useState<BecauseYouLovedItem[]>([]);
  const [ready, setReady] = useState(false);

  const computeFresh = useCallback(async (userId: string, anchorTitle: string) => {
    const ctx = await buildUserContext(userId);
    const scored = await pickTopN(ctx, ITEM_COUNT);
    const mapped: BecauseYouLovedItem[] = scored
      .filter((c) => c.posterUrl)
      .map((c) => ({
        id:        c.mediaId,
        title:     c.title,
        year:      c.year ?? 0,
        mediaType: c.mediaType,
        posterUrl: c.posterUrl,
        reason:    generateReasons(c)[0],
      }));
    writeCache(userId, { anchor: anchorTitle, items: mapped, cachedAt: Date.now() });
    return mapped;
  }, []);

  const load = useCallback(async () => {
    if (!user) { setReady(true); setAnchor(null); setItems([]); return; }
    try {
      // Cheap real query — also the invalidation signal (see header comment).
      const anchorTitle = await fetchBecauseYouLovedAnchor(user.id);
      if (!anchorTitle) {
        // Matches the real website's exact fallback: no qualifying diary
        // entry (no favourite, nothing rated ≥8) → the row doesn't render.
        setAnchor(null);
        setItems([]);
        setReady(true);
        return;
      }

      const cached = await readCache(user.id);
      const cacheValid = cached && cached.anchor === anchorTitle && (Date.now() - cached.cachedAt) < CACHE_TTL_MS;

      if (cacheValid) {
        setAnchor(anchorTitle);
        setItems(cached.items);
        setReady(true);
        return;
      }

      const mapped = await computeFresh(user.id, anchorTitle);
      setAnchor(anchorTitle);
      setItems(mapped);
    } catch {
      setAnchor(null);
      setItems([]);
    } finally {
      setReady(true);
    }
  }, [user, computeFresh]);

  // Re-validates (cheap anchor check, see header comment) every time Home
  // regains focus — not just on first mount. Expo Router keeps tab screens
  // mounted in the background, so logging a rating on a Detail screen and
  // returning to Home would never otherwise re-trigger this without the
  // user manually pull-to-refreshing.
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { if (refreshSignal !== undefined && refreshSignal > 0) load(); }, [refreshSignal, load]);

  // Real fallback: no qualifying diary history, or fewer than 3 scored items
  // came back (mirrors app/page.tsx's own `recommendations.length >= 3` gate
  // for the equivalent Home/Discover row) — render nothing, not an empty state.
  if (ready && (!anchor || items.length < 3)) return null;

  if (!ready) {
    return (
      <View style={styles.skeletonSection}>
        <SkeletonBlock width="55%" height={20} />
        <SkeletonBlock width="75%" height={13} style={{ marginTop: 6, marginBottom: RS.spacing.sm }} />
        <SkeletonPosterRow />
      </View>
    );
  }

  // Newly mounted the instant real content is ready (not already-mounted-
  // then-repainted) — RevealOnMount's fade-in genuinely triggers here rather
  // than firing earlier against a still-loading placeholder.
  return (
    <RevealOnMount>
      <BecauseYouLovedSection
        title={anchor!}
        subtitle="Titles matched to your taste — the more you log, the sharper this gets."
        items={items}
      />
    </RevealOnMount>
  );
}

const styles = StyleSheet.create({
  skeletonSection: { paddingHorizontal: RS.spacing.md, marginBottom: RS.spacing.lg },
});
