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
import { useCallback, useEffect, useState } from 'react';

import { BecauseYouLovedSection, type BecauseYouLovedItem } from '@/components/BecauseYouLovedCarousel';
import { useAuth } from '@/contexts/AuthContext';
import { buildUserContext, generateReasons, pickTopN } from '@/lib/recommendationEngine';
import { fetchBecauseYouLovedAnchor } from '@/lib/supabase/becauseYouLoved';

interface HomeBecauseYouLovedProps {
  /** Bump to force a re-fetch — Home's pull-to-refresh, same pattern as HomeFriendsActivity. */
  refreshSignal?: number;
}

const ITEM_COUNT = 8;

export function HomeBecauseYouLoved({ refreshSignal }: HomeBecauseYouLovedProps) {
  const { user } = useAuth();
  const [anchor, setAnchor] = useState<string | null>(null);
  const [items, setItems] = useState<BecauseYouLovedItem[]>([]);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setReady(true); setAnchor(null); setItems([]); return; }
    try {
      const anchorTitle = await fetchBecauseYouLovedAnchor(user.id);
      if (!anchorTitle) {
        // Matches the real website's exact fallback: no qualifying diary
        // entry (no favourite, nothing rated ≥8) → the row doesn't render.
        setAnchor(null);
        setItems([]);
        setReady(true);
        return;
      }

      const ctx = await buildUserContext(user.id);
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

      setAnchor(anchorTitle);
      setItems(mapped);
    } catch {
      setAnchor(null);
      setItems([]);
    } finally {
      setReady(true);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (refreshSignal !== undefined && refreshSignal > 0) load(); }, [refreshSignal, load]);

  // Real fallback: no qualifying diary history, or fewer than 3 scored items
  // came back (mirrors app/page.tsx's own `recommendations.length >= 3` gate
  // for the equivalent Home/Discover row) — render nothing, not an empty state.
  if (!ready || !anchor || items.length < 3) return null;

  return (
    <BecauseYouLovedSection
      title={anchor}
      subtitle="Titles matched to your taste — the more you log, the sharper this gets."
      items={items}
    />
  );
}
