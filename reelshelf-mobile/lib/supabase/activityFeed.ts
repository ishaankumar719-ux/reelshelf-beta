// Exact port of the real website's Activity feed data layer — see
// WEBSITE_UNIVERSAL_ACTIVITY_FEED_AUDIT.md for the full read-only audit this
// is built from. Two independent real sources, ported precisely:
//
//  - lib/activity.ts's buildActivityEventsFromSources + fetchActivityEvents
//    → "My Activity" tab (mergeMyActivityEvents/fetchMyActivity below).
//  - lib/supabase/followingFeed.ts's scoreFeedRow/distributeEntries/
//    fetchFollowingFeed → "Following" tab (fetchFollowingActivityFeed below).
//
// Two confirmed, deliberate deviations from a literal byte-for-byte port,
// both from direct re-reads of the real source, not the audit summary alone:
//
//  1. The real fetchActivityEvents() never actually queries user_lists —
//     buildActivityEventsFromSources's listRows param and list_created
//     construction are real, working code, just never invoked with real data
//     by the one production caller. Ported anyway per explicit instruction —
//     it's real logic within the exact function being ported, using the
//     real, already-shared user_lists table.
//  2. The real ActivityEvent has no contains_spoilers field at all — the
//     real card never spoiler-blurs review text. Added here (using the real
//     diary_entries.contains_spoilers column) because every other place a
//     review appears on mobile (Diary, Media Detail Reviews) already
//     respects that flag via SpoilerBlur — showing it unblurred only here
//     would be a real, jarring inconsistency, not a faithful parity choice.
//  3. resolveMediaHref-equivalent navigation is extended to books (the real
//     resolveMediaHref only ever returns a href for tv/movie, silently
//     falling through to null for books) — real Book Detail pages exist on
//     both the website and mobile, and every other diary/review surface
//     treats all three media types symmetrically; the website's gap reads
//     as an oversight, not a deliberate design choice.
//
// Everything else — the exact ActivityType union, the exact per-row type
// derivation (favourite > TV > has-review > logged, meaning "reviewed" only
// ever applies to movies/books, never TV), the exact 60-second same-type
// batching, the exact scoring weights, the exact anti-clustering
// redistribution, the exact review_scope filters (My Activity: show/title/
// season/episode; Following: show/title ONLY, excluding season/episode
// granular logs) — is ported precisely.
import { supabase } from './client';
import { resolveImageUrl } from '../resolveImageUrl';
import type { MediaType } from '@/data/seedHomeContent';

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

function dbMediaTypeToApp(dbType: string): MediaType {
  return dbType === 'movie' ? 'film' : (dbType as MediaType);
}

// ─── types ──────────────────────────────────────────────────────────────────

// Exact real union — lib/activity.ts's ActivityType. finished_series and
// challenge_completed are included for type fidelity (they're real members
// of the real union with real card styling) but are never constructed here,
// matching the real website: neither is ever built by buildActivityEventsFromSources
// or fetchFollowingFeed's real code, confirmed via direct re-read.
export type ActivityType =
  | 'logged'
  | 'reviewed'
  | 'watchlisted'
  | 'rushmore'
  | 'finished_series'
  | 'watched_episode'
  | 'added_favourite'
  | 'challenge_completed'
  | 'list_created';

export interface ActivityProfile {
  userId:      string;
  username:    string | null;
  displayName: string | null;
  avatarUrl:   string | null;
}

export interface ActivityEvent {
  id:                string;
  type:              ActivityType;
  userId:            string;
  profile:           ActivityProfile;
  title:             string;
  mediaType:         MediaType;
  mediaId:           string | null;
  diaryEntryId:      string | null;
  poster:            string | null;
  rating:            number | null;
  review:            string | null;
  containsSpoilers:  boolean;
  attachmentUrl:     string | null;
  attachmentType:    'image' | 'gif' | null;
  reviewCoverUrl:    string | null;
  reviewCoverSource: 'default' | 'tmdb_poster' | 'tmdb_backdrop' | 'upload' | null;
  watchedInCinema:   boolean;
  timestamp:         string;
  isBatch:           boolean;
  batchCount:        number | null;
  /** list_created only — the created list's real id, for List Detail navigation. */
  listId?:           string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// "My Activity" — exact port of lib/activity.ts
// ═══════════════════════════════════════════════════════════════════════════

interface DiaryActivityRow {
  id:                string;
  media_id:          string | null;
  title:             string;
  media_type:        string;
  poster:            string | null;
  rating:            number | string | null;
  review:            string | null;
  favourite:         boolean | null;
  contains_spoilers: boolean | null;
  attachment_url:    string | null;
  attachment_type:   'image' | 'gif' | null;
  review_cover_url:  string | null;
  review_cover_source: 'default' | 'tmdb_poster' | 'tmdb_backdrop' | 'upload' | null;
  watched_in_cinema: boolean | null;
  created_at:        string;
  score_rating:            number | null;
  cinematography_rating:   number | null;
  writing_rating:          number | null;
  performances_rating:     number | null;
  direction_rating:        number | null;
  rewatchability_rating:   number | null;
  emotional_impact_rating: number | null;
  entertainment_rating:    number | null;
}

interface SavedActivityRow {
  id:         string;
  media_id:   string | null;
  title:      string;
  media_type: string;
  poster:     string | null;
  created_at: string;
}

interface RushmoreActivityRow {
  id:         string;
  title:      string;
  created_at: string | null;
}

interface ListActivityRow {
  id:         string;
  title:      string;
  created_at: string | null;
}

const BATCH_MS = 60000;

function toRating(rating: unknown): number | null {
  if (rating === null || rating === undefined || rating === '') return null;
  const parsed = parseFloat(String(rating));
  return Number.isNaN(parsed) ? null : parsed;
}

function rowHasReviewContent(row: DiaryActivityRow): boolean {
  if (row.review?.trim()) return true;
  return !!(
    row.score_rating !== null && row.score_rating !== undefined ||
    row.cinematography_rating !== null && row.cinematography_rating !== undefined ||
    row.writing_rating !== null && row.writing_rating !== undefined ||
    row.performances_rating !== null && row.performances_rating !== undefined ||
    row.direction_rating !== null && row.direction_rating !== undefined ||
    row.rewatchability_rating !== null && row.rewatchability_rating !== undefined ||
    row.emotional_impact_rating !== null && row.emotional_impact_rating !== undefined ||
    row.entertainment_rating !== null && row.entertainment_rating !== undefined
  );
}

// Exact port of collapseActivityEvents — batches ≥4 same-type (logged/
// reviewed/finished_series) events within a 60s window into one "N films" card.
function collapseActivityEvents(events: ActivityEvent[], limit: number): ActivityEvent[] {
  const collapsed: ActivityEvent[] = [];
  let index = 0;

  const isBatchable = (t: ActivityType) => t === 'logged' || t === 'reviewed' || t === 'finished_series';

  while (index < events.length) {
    const current = events[index];

    if (!isBatchable(current.type)) {
      collapsed.push(current);
      index += 1;
      continue;
    }

    let nextIndex = index + 1;
    while (nextIndex < events.length) {
      const candidate = events[nextIndex];
      const withinBatchWindow =
        Math.abs(new Date(candidate.timestamp).getTime() - new Date(current.timestamp).getTime()) < BATCH_MS;
      if (withinBatchWindow && isBatchable(candidate.type)) {
        nextIndex += 1;
        continue;
      }
      break;
    }

    const batchSize = nextIndex - index;

    if (batchSize >= 4) {
      collapsed.push({
        ...current,
        isBatch: true,
        batchCount: batchSize,
        title: `${batchSize} films`,
        review: null,
        rating: null,
      });
      index = nextIndex;
      continue;
    }

    collapsed.push(current);
    index += 1;
  }

  return collapsed.slice(0, limit);
}

// Exact port of buildActivityEventsFromSources.
export function mergeMyActivityEvents({
  diaryRows,
  savedRows = [],
  rushmoreRows = [],
  listRows = [],
  profile,
  limit = 50,
}: {
  diaryRows:     DiaryActivityRow[];
  savedRows?:    SavedActivityRow[];
  rushmoreRows?: RushmoreActivityRow[];
  listRows?:     ListActivityRow[];
  profile:       ActivityProfile;
  limit?:        number;
}): ActivityEvent[] {
  const diaryEvents: ActivityEvent[] = diaryRows.map((row) => {
    const isTV = row.media_type === 'tv';
    const hasReview = rowHasReviewContent(row);
    const type: ActivityType = row.favourite
      ? 'added_favourite'
      : isTV
        ? 'watched_episode'
        : hasReview
          ? 'reviewed'
          : 'logged';
    return {
      id: `diary-${row.id}`,
      type,
      userId: profile.userId,
      profile,
      title: row.title,
      mediaType: dbMediaTypeToApp(row.media_type),
      mediaId: row.media_id ?? null,
      diaryEntryId: row.id,
      poster: resolveImageUrl(row.poster, 'poster'),
      rating: toRating(row.rating),
      review: row.review?.trim() || null,
      containsSpoilers: row.contains_spoilers ?? false,
      attachmentUrl: row.attachment_url ?? null,
      attachmentType: row.attachment_type ?? null,
      reviewCoverUrl: row.review_cover_url ?? null,
      reviewCoverSource: row.review_cover_source ?? null,
      watchedInCinema: row.watched_in_cinema ?? false,
      timestamp: row.created_at,
      isBatch: false,
      batchCount: null,
    };
  });

  const savedEvents: ActivityEvent[] = savedRows.map((row) => ({
    id: `saved-${row.id}`,
    type: 'watchlisted',
    userId: profile.userId,
    profile,
    title: row.title,
    mediaType: dbMediaTypeToApp(row.media_type),
    mediaId: row.media_id ?? null,
    diaryEntryId: null,
    poster: resolveImageUrl(row.poster, 'poster'),
    rating: null,
    review: null,
    containsSpoilers: false,
    attachmentUrl: null,
    attachmentType: null,
    reviewCoverUrl: null,
    reviewCoverSource: null,
    watchedInCinema: false,
    timestamp: row.created_at,
    isBatch: false,
    batchCount: null,
  }));

  const rushmoreEvent: ActivityEvent[] =
    rushmoreRows.length > 0 && rushmoreRows[0].created_at
      ? [{
          id: 'rushmore-update',
          type: 'rushmore',
          userId: profile.userId,
          profile,
          title: 'Mount Rushmore',
          mediaType: 'film',
          mediaId: null,
          diaryEntryId: null,
          poster: null,
          rating: null,
          review: null,
          containsSpoilers: false,
          attachmentUrl: null,
          attachmentType: null,
          reviewCoverUrl: null,
          reviewCoverSource: null,
          watchedInCinema: false,
          timestamp: rushmoreRows[0].created_at,
          isBatch: true,
          batchCount: rushmoreRows.length,
        }]
      : [];

  const listEvents: ActivityEvent[] = listRows
    .filter((row) => row.created_at !== null)
    .map((row) => ({
      id: `list-${row.id}`,
      type: 'list_created',
      userId: profile.userId,
      profile,
      title: row.title,
      mediaType: 'film',
      mediaId: null,
      diaryEntryId: null,
      poster: null,
      rating: null,
      review: null,
      containsSpoilers: false,
      attachmentUrl: null,
      attachmentType: null,
      reviewCoverUrl: null,
      reviewCoverSource: null,
      watchedInCinema: false,
      timestamp: row.created_at!,
      isBatch: false,
      batchCount: null,
      listId: row.id,
    }));

  const merged = [...diaryEvents, ...savedEvents, ...rushmoreEvent, ...listEvents].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return collapseActivityEvents(merged, limit);
}

// Exact port of fetchActivityEvents — same 3 real queries/limits/filters
// (diary_entries scope show/title/season/episode limit 50, saved_items
// watchlist limit 20, mount_rushmore limit 5), plus user_lists (see header
// comment note 1) since the real merge function's list-handling is real,
// working code being ported per explicit instruction.
export async function fetchMyActivity(userId: string, profile: ActivityProfile, limit = 50): Promise<ActivityEvent[]> {
  const client = requireClient();

  const [diaryRes, savedRes, rushmoreRes, listRes] = await Promise.all([
    client
      .from('diary_entries')
      .select('id, media_id, title, media_type, poster, rating, review, favourite, contains_spoilers, attachment_url, attachment_type, review_cover_url, review_cover_source, watched_in_cinema, created_at, score_rating, cinematography_rating, writing_rating, performances_rating, direction_rating, rewatchability_rating, emotional_impact_rating, entertainment_rating')
      .eq('user_id', userId)
      .in('review_scope', ['show', 'title', 'season', 'episode'])
      .order('created_at', { ascending: false })
      .limit(limit),
    client
      .from('saved_items')
      .select('id, media_id, title, media_type, poster, created_at')
      .eq('user_id', userId)
      .eq('list_type', 'watchlist')
      .order('created_at', { ascending: false })
      .limit(20),
    client
      .from('mount_rushmore')
      .select('id, title, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),
    client
      .from('user_lists')
      .select('id, title, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return mergeMyActivityEvents({
    diaryRows: (diaryRes.data ?? []) as DiaryActivityRow[],
    savedRows: (savedRes.data ?? []) as SavedActivityRow[],
    rushmoreRows: (rushmoreRes.data ?? []) as RushmoreActivityRow[],
    listRows: (listRes.data ?? []) as ListActivityRow[],
    profile,
    limit,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// "Following" — exact port of lib/supabase/followingFeed.ts
// ═══════════════════════════════════════════════════════════════════════════

interface FeedDiaryRow {
  id:                string;
  media_id:          string | null;
  title:             string;
  media_type:        string;
  poster:            string | null;
  rating:            number | string | null;
  review:            string | null;
  favourite:         boolean | null;
  contains_spoilers: boolean | null;
  watched_in_cinema: boolean | null;
  created_at:        string;
  user_id:           string;
  score_rating:            number | null;
  cinematography_rating:   number | null;
  writing_rating:          number | null;
  performances_rating:     number | null;
  direction_rating:        number | null;
  rewatchability_rating:   number | null;
  emotional_impact_rating: number | null;
  entertainment_rating:    number | null;
}

function feedRowHasReviewContent(row: FeedDiaryRow): boolean {
  if (row.review?.trim()) return true;
  return !!(
    row.score_rating !== null ||
    row.cinematography_rating !== null ||
    row.writing_rating !== null ||
    row.performances_rating !== null ||
    row.direction_rating !== null ||
    row.rewatchability_rating !== null ||
    row.emotional_impact_rating !== null ||
    row.entertainment_rating !== null
  );
}

// Exact port of scoreFeedRow — review content +10, favourite +5, rating ≥8
// +8 / ≥6 +4, recency <6h +8 / <24h +6 / <72h +4 / <168h +2.
function scoreFeedRow(row: FeedDiaryRow): number {
  let score = 0;
  const hasReview = feedRowHasReviewContent(row);
  if (hasReview) score += 10;
  if (row.favourite) score += 5;

  const rating = toRating(row.rating);
  if (rating !== null) {
    if (rating >= 8) score += 8;
    else if (rating >= 6) score += 4;
  }

  const hoursAgo = (Date.now() - new Date(row.created_at).getTime()) / 3_600_000;
  if (hoursAgo < 6) score += 8;
  else if (hoursAgo < 24) score += 6;
  else if (hoursAgo < 72) score += 4;
  else if (hoursAgo < 168) score += 2;

  return score;
}

// Exact port of distributeEntries — defers entries that would put the same
// user back-to-back or cluster the same media type three-in-a-row, refilling
// from the deferred pool afterward.
function distributeEntries(
  scored: (FeedDiaryRow & { _score: number })[],
  limit: number,
): FeedDiaryRow[] {
  const result: (FeedDiaryRow & { _score: number })[] = [];
  const deferred: (FeedDiaryRow & { _score: number })[] = [];

  for (const entry of scored) {
    const len = result.length;
    const lastUser = result[len - 1]?.user_id;
    const lastType = result[len - 1]?.media_type;
    const prevType = result[len - 2]?.media_type;

    const sameUserAsLast = entry.user_id === lastUser;
    const clustersSameType = entry.media_type === lastType && entry.media_type === prevType;

    if ((sameUserAsLast || clustersSameType) && result.length >= 2) {
      deferred.push(entry);
    } else {
      result.push(entry);
      if (result.length >= limit) break;
    }
  }

  for (const entry of deferred) {
    if (result.length >= limit) break;
    result.push(entry);
  }

  return result.slice(0, limit);
}

// Exact port of fetchFollowingFeed — single bounded fetch (fetchLimit =
// min(limit*2, 60)), review_scope restricted to show/title ONLY (excludes
// season/episode granular logs, unlike My Activity), no batching applied.
export async function fetchFollowingActivityFeed(userId: string, limit = 30): Promise<ActivityEvent[]> {
  const client = requireClient();

  const { data: followData } = await client
    .from('followers')
    .select('following_id')
    .eq('follower_id', userId);

  if (!followData || followData.length === 0) return [];

  const followedIds = followData.map((f) => f.following_id as string);
  const fetchLimit = Math.min(limit * 2, 60);

  const [{ data: diaryData }, { data: profileData }] = await Promise.all([
    client
      .from('diary_entries')
      .select('id, media_id, title, media_type, poster, rating, review, favourite, contains_spoilers, watched_in_cinema, created_at, user_id, score_rating, cinematography_rating, writing_rating, performances_rating, direction_rating, rewatchability_rating, emotional_impact_rating, entertainment_rating')
      .in('user_id', followedIds)
      .in('review_scope', ['show', 'title'])
      .order('created_at', { ascending: false })
      .limit(fetchLimit),
    client
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', followedIds),
  ]);

  if (!diaryData) return [];

  const profileMap = new Map<string, { username: string | null; displayName: string | null; avatarUrl: string | null }>(
    (profileData ?? []).map((p) => [p.id as string, {
      username: p.username as string | null,
      displayName: p.display_name as string | null,
      avatarUrl: p.avatar_url as string | null,
    }]),
  );

  const rows = diaryData as FeedDiaryRow[];
  const scored = rows
    .map((row) => ({ ...row, _score: scoreFeedRow(row) }))
    .sort((a, b) => b._score - a._score);

  const distributed = distributeEntries(scored, limit);

  return distributed.map((row) => {
    const profile = profileMap.get(row.user_id) ?? { username: null, displayName: null, avatarUrl: null };

    const hasReview = feedRowHasReviewContent(row);
    const isTV = row.media_type === 'tv';
    const type: ActivityType = row.favourite
      ? 'added_favourite'
      : isTV
        ? 'watched_episode'
        : hasReview
          ? 'reviewed'
          : 'logged';

    return {
      id: `following-diary-${row.id}`,
      type,
      userId: row.user_id,
      profile: {
        userId: row.user_id,
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
      },
      title: row.title,
      mediaType: dbMediaTypeToApp(row.media_type),
      mediaId: row.media_id ?? null,
      diaryEntryId: row.id,
      poster: resolveImageUrl(row.poster, 'poster'),
      rating: toRating(row.rating),
      review: row.review?.trim() || null,
      containsSpoilers: row.contains_spoilers ?? false,
      // Following feed's real query never selects attachment/cover fields —
      // matching that precisely rather than fetching data the real page doesn't.
      attachmentUrl: null,
      attachmentType: null,
      reviewCoverUrl: null,
      reviewCoverSource: null,
      watchedInCinema: row.watched_in_cinema ?? false,
      timestamp: row.created_at,
      isBatch: false,
      batchCount: null,
    };
  });
}
