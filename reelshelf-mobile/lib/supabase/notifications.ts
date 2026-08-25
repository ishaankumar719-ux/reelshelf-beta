// Notifications — real Supabase-backed, reusing the EXISTING `notifications`
// table (recipient_id, actor_id, type, reference_id, reference_type,
// created_at) and the exact same 7 types/copy the real website's (partly
// unused) builder functions in lib/supabase/notifications.ts define — ported
// deliberately, not reinvented (see the notification-trigger-fix task's
// RETURN for how followed_user_mount_rushmore/comment_replied were verified
// against those real builders before this file was written).
//
// Two confirmed, documented deviations from the website's own dispatch loop:
// 1. entry_commented/comment_replied never show the actual comment/reply
//    text on the website either — reference_id only stores diary_entry_id,
//    not the specific comment's own id, so there's no reliable way to know
//    WHICH comment (among possibly several) triggered a given notification.
//    The website's own caller hardcodes body:"" for entry_commented rather
//    than guess; comment_replied's dispatch never existed there at all. This
//    mirrors that same conservative choice — falls back to rating/title.
// 2. followed_user_mount_rushmore never resolves a "preview" diary entry
//    (the website's own createRushmoreNotification's `preview` param is
//    never actually wired to real data anywhere in its own dispatch loop
//    either — a dead parameter). Shown with no poster, matching NotificationCard's
//    documented "Social" fallback badge for exactly this case.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './client';
import type { MediaType } from '@/data/seedHomeContent';

export type ReelShelfNotificationType =
  | 'new_follower'
  | 'followed_user_logged'
  | 'followed_user_reviewed'
  | 'followed_user_mount_rushmore'
  | 'review_liked'
  | 'entry_commented'
  | 'comment_replied';

export interface ReelShelfNotification {
  id: string;
  type: ReelShelfNotificationType;
  createdAt: string;
  actorId: string;
  /** Route id (film-<id>/tv-<id>/book-<slug>) for media-linked types, else null. */
  mediaRouteId: string | null;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  actionText: string;
  mediaTitle: string | null;
  mediaPoster: string | null;
  mediaType: MediaType | null;
  rating: number | null;
  review: string;
}

export const NOTIFICATION_POLL_INTERVAL_MS = 90_000;

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

interface NotificationRow {
  id: string;
  type: ReelShelfNotificationType;
  actor_id: string;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

interface ProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface DiaryRow {
  id: string;
  media_id: string;
  media_type: 'movie' | 'tv' | 'book';
  title: string;
  poster: string | null;
  rating: number | null;
}

function toRouteId(mediaType: 'movie' | 'tv' | 'book', mediaId: string): string {
  const prefix = mediaType === 'movie' ? 'film' : mediaType;
  const bareId = mediaId.startsWith('tmdb-') ? mediaId.slice(5) : mediaId;
  return `${prefix}-${bareId}`;
}

function toMobileMediaType(mediaType: 'movie' | 'tv' | 'book'): MediaType {
  return mediaType === 'movie' ? 'film' : mediaType;
}

function buildNotification(
  row: NotificationRow,
  actor: ProfileRow | undefined,
  entry: DiaryRow | undefined,
): ReelShelfNotification | null {
  const base = {
    id: row.id,
    createdAt: row.created_at,
    actorId: row.actor_id,
    username: actor?.username ?? null,
    displayName: actor?.display_name ?? null,
    avatarUrl: actor?.avatar_url ?? null,
  };

  switch (row.type) {
    case 'new_follower':
      return {
        ...base, type: 'new_follower',
        actionText: 'started following you',
        mediaRouteId: null, mediaTitle: null, mediaPoster: null, mediaType: null, rating: null, review: '',
      };

    case 'followed_user_mount_rushmore':
      return {
        ...base, type: 'followed_user_mount_rushmore',
        actionText: 'updated their Mount Rushmore',
        mediaRouteId: null, mediaTitle: null, mediaPoster: null, mediaType: null, rating: null, review: '',
      };

    case 'followed_user_logged':
    case 'followed_user_reviewed': {
      if (!entry) return null;
      const title = entry.title || 'a title';
      const isReview = row.type === 'followed_user_reviewed';
      return {
        ...base, type: row.type,
        actionText: isReview ? `reviewed ${title}` : `logged ${title}`,
        mediaRouteId: toRouteId(entry.media_type, entry.media_id),
        mediaTitle: entry.title, mediaPoster: entry.poster,
        mediaType: toMobileMediaType(entry.media_type),
        rating: typeof entry.rating === 'number' ? entry.rating : null,
        // Matches the real website's own createDiaryNotification, which DOES
        // show the real review text for this type (only entry_commented/
        // comment_replied omit it, per the header comment above).
        review: '',
      };
    }

    case 'review_liked': {
      if (!entry) return null;
      const title = entry.title || 'this title';
      const hasReview = typeof entry.rating === 'number';
      return {
        ...base, type: 'review_liked',
        actionText: hasReview ? `liked your review of ${title}` : `liked your log of ${title}`,
        mediaRouteId: toRouteId(entry.media_type, entry.media_id),
        mediaTitle: entry.title, mediaPoster: entry.poster,
        mediaType: toMobileMediaType(entry.media_type),
        rating: typeof entry.rating === 'number' ? entry.rating : null,
        review: '',
      };
    }

    case 'entry_commented':
    case 'comment_replied': {
      if (!entry) return null;
      const title = entry.title || 'this title';
      return {
        ...base, type: row.type,
        actionText: row.type === 'entry_commented'
          ? `commented on your entry for ${title}`
          : `replied to your comment on ${title}`,
        mediaRouteId: toRouteId(entry.media_type, entry.media_id),
        mediaTitle: entry.title, mediaPoster: entry.poster,
        mediaType: toMobileMediaType(entry.media_type),
        rating: typeof entry.rating === 'number' ? entry.rating : null,
        review: '', // see header comment — not reliably resolvable, matches website
      };
    }

    default:
      return null;
  }
}

export async function fetchNotifications(userId: string): Promise<ReelShelfNotification[]> {
  const client = requireClient();
  const { data: rawRows, error } = await client
    .from('notifications')
    .select('id, type, actor_id, reference_id, reference_type, created_at')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  if (!rawRows || rawRows.length === 0) return [];

  const rows = rawRows as NotificationRow[];
  const actorIds = Array.from(new Set(rows.map((r) => r.actor_id)));
  const diaryIds = Array.from(new Set(
    rows.filter((r) => r.reference_type === 'diary_entry' && r.reference_id).map((r) => r.reference_id!),
  ));

  const [profilesRes, diaryRes] = await Promise.all([
    client.from('public_profiles').select('id, username, display_name, avatar_url').in('id', actorIds),
    diaryIds.length > 0
      ? client.from('diary_entries').select('id, media_id, media_type, title, poster, rating').in('id', diaryIds)
      : Promise.resolve({ data: [] as DiaryRow[] }),
  ]);

  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id as string, p as ProfileRow]));
  const diaryMap = new Map(((diaryRes.data ?? []) as DiaryRow[]).map((e) => [e.id, e]));

  return rows
    .map((row) => buildNotification(row, profileMap.get(row.actor_id), row.reference_id ? diaryMap.get(row.reference_id) : undefined))
    .filter((n): n is ReelShelfNotification => n !== null)
    .slice(0, 24);
}

// ── local-only mark-as-read (matches the website's real behavior exactly —
// no `read` column write, ever) — namespaced per user like every other
// AsyncStorage key in this app; swept by AuthContext's clearUserCache on sign-out.
function lastReadKey(userId: string): string {
  return `reelshelf:notificationsLastRead:${userId}`;
}

export async function readNotificationLastReadAt(userId: string): Promise<string | null> {
  return AsyncStorage.getItem(lastReadKey(userId));
}

export async function writeNotificationLastReadAt(userId: string, timestamp: string): Promise<void> {
  await AsyncStorage.setItem(lastReadKey(userId), timestamp);
}

export function getUnreadNotificationCount(notifications: ReelShelfNotification[], lastReadAt: string | null): number {
  if (!lastReadAt) return notifications.length;
  const readTs = new Date(lastReadAt).getTime();
  return notifications.filter((n) => new Date(n.createdAt).getTime() > readTs).length;
}

export function isNotificationUnread(notification: ReelShelfNotification, lastReadAt: string | null): boolean {
  if (!lastReadAt) return true;
  return new Date(notification.createdAt).getTime() > new Date(lastReadAt).getTime();
}

export function formatNotificationRecency(dateStr: string): string {
  const deltaMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.max(1, Math.floor(deltaMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Shared by NotificationsSheet's tap-to-navigate AND the push notification
// tap handler (lib/pushNotifications.ts) — both must resolve to the exact
// same destination for the exact same notification, so this lives in one
// place rather than being duplicated. Accepts either a ReelShelfNotification
// or a push payload's `data` field — both share this same field shape by
// design (see the send-push-notification Edge Function, which builds its
// `data` payload with these exact field names for this reason).
export interface NotificationDestinationInput {
  type: ReelShelfNotificationType;
  actorId: string;
  mediaRouteId: string | null;
  mediaType: MediaType | null;
  mediaTitle: string | null;
  mediaPoster: string | null;
}

export function getNotificationDestination(input: NotificationDestinationInput): string {
  if (input.mediaRouteId && input.mediaType) {
    const title = encodeURIComponent(input.mediaTitle ?? '');
    const poster = encodeURIComponent(input.mediaPoster ?? '');
    return `/media/${input.mediaRouteId}?title=${title}&posterUrl=${poster}&mediaType=${input.mediaType}`;
  }
  return `/profile/${input.actorId}`;
}
