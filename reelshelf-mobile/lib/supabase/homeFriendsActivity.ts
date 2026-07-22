// Real query logic for Home's Friends Activity rail — a deliberate mobile-only
// enhancement (see components/HomeFriendsActivity.tsx for the full rationale).
// Cross-title, newest-first timeline of everyone the current user follows,
// merged from three real tables: diary_entries (watched/rated/reviewed,
// every media type), user_lists (created a public list), and mount_rushmore
// (updated their Top 4). All gated by the same existing RLS this app already
// relies on everywhere else — no new tables, no new policies.
//
// saved_items ("added to shelf") is deliberately NOT included: confirmed live
// against the database that saved_items has no public-read RLS policy at all
// (only "Users can view own saved items", auth.uid() = user_id) — a followed
// user's shelf additions are structurally unreadable by anyone else. Including
// it would silently always return zero rows for other users, not a real
// feature. If shelf activity is ever wanted here, that requires a schema/RLS
// change first, not a client-side query change.
import { supabase } from './client';
import { TMDB_IMG_POSTER } from '../tmdb';
import type { MediaType } from '@/data/seedHomeContent';

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

function dbMediaTypeToApp(dbType: string): MediaType {
  return dbType === 'movie' ? 'film' : (dbType as MediaType);
}
function toRouteId(mediaType: MediaType, mediaId: string): string {
  return `${mediaType === 'film' ? 'film' : mediaType === 'tv' ? 'tv' : 'book'}-${mediaId}`;
}
function resolvePoster(raw: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith('http')) return raw;
  return `${TMDB_IMG_POSTER}${raw}`;
}

export type HomeActivityType = 'watched' | 'rated' | 'reviewed' | 'list_created' | 'rushmore_updated';

export interface HomeActivityEntry {
  activityType: HomeActivityType;
  createdAt:    string; // ISO — the sort key for "newest first"
  userId:       string;
  username:     string | null;
  displayName:  string | null;
  avatarUrl:    string | null;
  // diary-derived (watched/rated/reviewed)
  routeId?:          string;
  mediaType?:         MediaType;
  title?:             string;
  posterUrl?:         string | null;
  rating?:            number | null;
  review?:            string;
  containsSpoilers?:  boolean;
  watchedInCinema?:   boolean;
  rewatch?:           boolean;
  // list-derived
  listId?:    string;
  listTitle?: string;
  // rushmore-derived
  rushmoreTitle?: string;
}

export interface HomeFriendsActivityResult {
  entries:      HomeActivityEntry[];
  followedCount: number;
}

const FETCH_LIMIT_PER_SOURCE = 30;
const RESULT_LIMIT = 20;

/** Dev-only diagnostics — never shipped to a production build (gated on __DEV__). */
function devLog(...args: unknown[]) {
  if (__DEV__) console.log('[HomeFriendsActivity]', ...args);
}

export async function fetchHomeFriendsActivity(userId: string): Promise<HomeFriendsActivityResult> {
  const client = requireClient();

  const { data: followRows, error: followErr } = await client
    .from('followers')
    .select('following_id')
    .eq('follower_id', userId);
  if (followErr) {
    devLog('userId=', userId, 'follow query error:', followErr.message);
    throw followErr;
  }

  const followedIds = (followRows ?? []).map((f) => f.following_id as string);
  devLog('userId=', userId, 'followedCount=', followedIds.length);
  if (followedIds.length === 0) {
    return { entries: [], followedCount: 0 };
  }

  // Three independent sources, fetched in parallel, each newest-first, none
  // filtered by any date relative to when the follow relationship started —
  // a followed user's pre-existing history is exactly as real as anything
  // logged after the follow, and must not be excluded.
  const [diaryRes, listsRes, rushmoreRes, profilesRes] = await Promise.all([
    client
      .from('diary_entries')
      .select('user_id, media_id, media_type, title, poster, rating, review, contains_spoilers, watched_in_cinema, rewatch, saved_at')
      .in('user_id', followedIds)
      .eq('review_scope', 'show')
      .eq('season_number', 0)
      .eq('episode_number', 0)
      .order('saved_at', { ascending: false })
      .limit(FETCH_LIMIT_PER_SOURCE),
    client
      .from('user_lists')
      .select('id, user_id, title, created_at')
      .in('user_id', followedIds)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(FETCH_LIMIT_PER_SOURCE),
    client
      .from('mount_rushmore')
      .select('user_id, title, created_at')
      .in('user_id', followedIds)
      .order('created_at', { ascending: false })
      .limit(FETCH_LIMIT_PER_SOURCE),
    client
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', followedIds),
  ]);

  if (diaryRes.error) devLog('diary_entries error:', diaryRes.error.message);
  if (listsRes.error) devLog('user_lists error:', listsRes.error.message);
  if (rushmoreRes.error) devLog('mount_rushmore error:', rushmoreRes.error.message);
  if (profilesRes.error) devLog('profiles error:', profilesRes.error.message);

  const firstError = diaryRes.error ?? listsRes.error ?? rushmoreRes.error ?? profilesRes.error;
  if (firstError) throw firstError;

  const profileById = new Map(
    (profilesRes.data ?? []).map((p) => [p.id as string, {
      username: p.username as string | null,
      displayName: p.display_name as string | null,
      avatarUrl: p.avatar_url as string | null,
    }]),
  );

  const entries: HomeActivityEntry[] = [];

  for (const row of diaryRes.data ?? []) {
    const owner = profileById.get(row.user_id as string);
    const mediaType = dbMediaTypeToApp(row.media_type as string);
    const rating = typeof row.rating === 'number' ? row.rating : row.rating ? Number(row.rating) : null;
    const review = (row.review as string | null) ?? '';
    const activityType: HomeActivityType = review.trim() ? 'reviewed' : rating != null ? 'rated' : 'watched';
    entries.push({
      activityType,
      createdAt: row.saved_at as string,
      userId: row.user_id as string,
      username: owner?.username ?? null,
      displayName: owner?.displayName ?? null,
      avatarUrl: owner?.avatarUrl ?? null,
      routeId: toRouteId(mediaType, row.media_id as string),
      mediaType,
      title: row.title as string,
      posterUrl: resolvePoster(row.poster as string | null),
      rating,
      review,
      containsSpoilers: Boolean(row.contains_spoilers),
      watchedInCinema: Boolean(row.watched_in_cinema),
      rewatch: Boolean(row.rewatch),
    });
  }

  for (const row of listsRes.data ?? []) {
    const owner = profileById.get(row.user_id as string);
    entries.push({
      activityType: 'list_created',
      createdAt: row.created_at as string,
      userId: row.user_id as string,
      username: owner?.username ?? null,
      displayName: owner?.displayName ?? null,
      avatarUrl: owner?.avatarUrl ?? null,
      listId: row.id as string,
      listTitle: row.title as string,
    });
  }

  for (const row of rushmoreRes.data ?? []) {
    const owner = profileById.get(row.user_id as string);
    entries.push({
      activityType: 'rushmore_updated',
      createdAt: row.created_at as string,
      userId: row.user_id as string,
      username: owner?.username ?? null,
      displayName: owner?.displayName ?? null,
      avatarUrl: owner?.avatarUrl ?? null,
      rushmoreTitle: row.title as string,
    });
  }

  entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const result = entries.slice(0, RESULT_LIMIT);
  devLog('userId=', userId, 'mergedEntries=', entries.length, 'returned=', result.length);

  return { entries: result, followedCount: followedIds.length };
}
