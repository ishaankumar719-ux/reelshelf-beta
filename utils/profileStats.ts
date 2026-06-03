import type { SupabaseClient } from "@supabase/supabase-js";

// ── Types ──────────────────────────────────────────────────────────────────────

export type TopRatedEntry = {
  id: string;
  title: string;
  media_type: "movie" | "tv" | "book";
  year: number | null;
  poster: string | null;
  rating: number;
};

export type CurrentObsession = {
  title: string;
  poster: string | null;
  mediaType: string;
};

export type MostReactedReview = {
  id: string;
  title: string;
  poster: string | null;
  review: string;
  reactionCount: number;
  mediaType: string;
};

export type ProfileStats = {
  filmCount: number;
  tvCount: number;
  bookCount: number;
  averageRating: number | null;
  totalLogs: number;
  followersCount: number;
  followingCount: number;
  totalReactions: number;
  topRatedThisYear: TopRatedEntry[];
  currentObsession: CurrentObsession | null;
  mostReactedReview: MostReactedReview | null;
};

// ── Internal types ─────────────────────────────────────────────────────────────

type RawEntry = {
  id: string;
  title: string;
  media_id: string;
  media_type: string;
  year: number | null;
  poster: string | null;
  rating: number | string | null;
  review: string | null;
  created_at: string;
  watched_date: string | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseRating(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchReactionRows(
  supabase: SupabaseClient,
  entryIds: string[]
): Promise<Array<{ diary_entry_id: string }>> {
  if (entryIds.length === 0) return [];
  const { data } = await supabase
    .from("diary_entry_reactions")
    .select("diary_entry_id")
    .in("diary_entry_id", entryIds);
  return (data ?? []) as Array<{ diary_entry_id: string }>;
}

async function countReactionsBatch(
  supabase: SupabaseClient,
  entryIds: string[]
): Promise<number> {
  if (entryIds.length === 0) return 0;
  const { count } = await supabase
    .from("diary_entry_reactions")
    .select("*", { count: "exact", head: true })
    .in("diary_entry_id", entryIds);
  return count ?? 0;
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function getProfileStats(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileStats> {
  const yearStart = "2026-01-01";
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  // Parallel primary fetch ────────────────────────────────────────────────────
  const [
    { data: allEntriesData },
    { data: yearEntriesData },
    { data: recentEntriesData },
    { count: followersCount },
    { count: followingCount },
  ] = await Promise.all([
    supabase
      .from("diary_entries")
      .select(
        "id, media_id, media_type, title, poster, rating, review, created_at, watched_date"
      )
      .eq("user_id", userId)
      .in("review_scope", ["show", "title"]),
    supabase
      .from("diary_entries")
      .select(
        "id, title, media_id, media_type, year, poster, rating, created_at, watched_date"
      )
      .eq("user_id", userId)
      .in("review_scope", ["show", "title"])
      .gte("created_at", yearStart)
      .order("created_at", { ascending: false })
      .limit(20),
    // No review_scope filter for obsession — captures all activity incl. episodes
    supabase
      .from("diary_entries")
      .select(
        "id, media_id, title, poster, media_type, rating, watched_date, created_at"
      )
      .eq("user_id", userId)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false }),
    supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId),
    supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId),
  ]);

  const allEntries = (allEntriesData ?? []) as RawEntry[];
  const yearEntries = (yearEntriesData ?? []) as RawEntry[];
  const recentEntries = (recentEntriesData ?? []) as RawEntry[];

  // ── Taste Snapshot ──────────────────────────────────────────────────────────
  const filmCount = allEntries.filter((e) => e.media_type === "movie").length;
  const tvCount = allEntries.filter((e) => e.media_type === "tv").length;
  const bookCount = allEntries.filter((e) => e.media_type === "book").length;
  const totalLogs = allEntries.length;

  const parsedRatings = allEntries
    .map((e) => parseRating(e.rating))
    .filter((r): r is number => r !== null);
  const averageRating =
    parsedRatings.length > 0
      ? parsedRatings.reduce((a, b) => a + b, 0) / parsedRatings.length
      : null;

  // ── Top Rated This Year ─────────────────────────────────────────────────────
  // Fetch top 20, parseFloat ratings, sort in JS, slice top 4 for accuracy
  const topRatedThisYear: TopRatedEntry[] = yearEntries
    .map((e) => ({ ...e, _r: parseRating(e.rating) }))
    .filter(
      (e): e is typeof e & { _r: number } => e._r !== null && e.poster !== null
    )
    .sort((a, b) => b._r - a._r)
    .slice(0, 4)
    .map((e) => ({
      id: e.id,
      title: e.title,
      media_type: e.media_type as "movie" | "tv" | "book",
      year: e.year,
      poster: e.poster,
      rating: e._r,
    }));

  // ── Current Obsession (last 30 days) ────────────────────────────────────────
  type ObsessionEntry = {
    count: number;
    entry: RawEntry;
    latestAt: string;
  };
  const freqMap = new Map<string, ObsessionEntry>();
  for (const entry of recentEntries) {
    const key = entry.media_id;
    const existing = freqMap.get(key);
    if (!existing) {
      freqMap.set(key, { count: 1, entry, latestAt: entry.created_at });
    } else {
      const isNewer = entry.created_at > existing.latestAt;
      freqMap.set(key, {
        count: existing.count + 1,
        entry: isNewer ? entry : existing.entry,
        latestAt: isNewer ? entry.created_at : existing.latestAt,
      });
    }
  }

  let currentObsession: CurrentObsession | null = null;
  if (freqMap.size > 0) {
    const top = Array.from(freqMap.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      // Tiebreaker: highest rating (spec: fallback to highest-rated recent item)
      const aR = parseRating(a.entry.rating) ?? 0;
      const bR = parseRating(b.entry.rating) ?? 0;
      return bR - aR;
    })[0];
    if (top) {
      currentObsession = {
        title: top.entry.title,
        poster: top.entry.poster,
        mediaType: top.entry.media_type,
      };
    }
  }

  // ── Reactions (parallel second-pass) ────────────────────────────────────────
  const allEntryIds = allEntries.map((e) => e.id);
  const entriesWithReviews = allEntries.filter(
    (e) => e.review && e.review.trim().length > 0
  );
  const reviewEntryIds = entriesWithReviews.slice(0, 50).map((e) => e.id);
  // Batch to 100 IDs for total reactions count (approximation for large catalogues)
  const batchIds = allEntryIds.slice(0, 100);

  const [reactionRows, totalReactions] = await Promise.all([
    fetchReactionRows(supabase, reviewEntryIds),
    countReactionsBatch(supabase, batchIds),
  ]);

  // ── Most Reacted Review ──────────────────────────────────────────────────────
  let mostReactedReview: MostReactedReview | null = null;
  if (reactionRows.length > 0) {
    const countMap = new Map<string, number>();
    for (const r of reactionRows) {
      countMap.set(r.diary_entry_id, (countMap.get(r.diary_entry_id) ?? 0) + 1);
    }
    const [maxId, maxCount] = Array.from(countMap.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];
    const maxEntry = entriesWithReviews.find((e) => e.id === maxId);
    if (maxEntry) {
      mostReactedReview = {
        id: maxEntry.id,
        title: maxEntry.title,
        poster: maxEntry.poster,
        review: maxEntry.review!,
        reactionCount: maxCount,
        mediaType: maxEntry.media_type,
      };
    }
  }

  return {
    filmCount,
    tvCount,
    bookCount,
    averageRating,
    totalLogs,
    followersCount: followersCount ?? 0,
    followingCount: followingCount ?? 0,
    totalReactions,
    topRatedThisYear,
    currentObsession,
    mostReactedReview,
  };
}
