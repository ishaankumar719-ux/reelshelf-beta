// Real anchor-title selection for Home's "Because You Loved {X}" row.
//
// recommendation-engine.ts (website) and its mobile port (recommendationEngine.ts)
// have NO single-anchor-title concept — they produce per-ITEM reasons across a
// whole recommendation set, with a static row heading ("❤️ Because You Loved…",
// no specific title). The real, live website component that DOES pick one
// anchor title for a dynamic heading is a *different* real component —
// components/BecauseYouLikedRow.tsx (used on Series/Book detail pages, not
// Home/Discover) — its rule: from the user's own diary entries, filter to
// favourite===true OR rating>=8, sort by (favourite?2:0)+rating descending,
// take the first entry's title (falls back to null — no render — if none
// qualify). Ported here exactly, against the real Supabase diary_entries
// table (the website version reads localStorage there — a stale, pre-Supabase
// data source; this mobile port intentionally uses the real synced table
// instead, a strict improvement, not a parity deviation worth matching).
import { supabase } from './client';

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

export async function fetchBecauseYouLovedAnchor(userId: string): Promise<string | null> {
  const client = requireClient();
  const { data, error } = await client
    .from('diary_entries')
    .select('title, rating, favourite')
    .eq('user_id', userId)
    .in('review_scope', ['show', 'title']);
  if (error) throw error;

  const seedEntries = (data ?? [])
    .filter((row) => row.favourite === true || (typeof row.rating === 'number' && row.rating >= 8))
    .sort((a, b) => {
      const left = (a.favourite ? 2 : 0) + (typeof a.rating === 'number' ? a.rating : 0);
      const right = (b.favourite ? 2 : 0) + (typeof b.rating === 'number' ? b.rating : 0);
      return right - left;
    });

  return seedEntries[0]?.title ?? null;
}
