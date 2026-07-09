// Recent Activity — the profile owner's OWN action history (watched/rated/
// reviewed/added to shelf/added to list). Deliberately distinct from:
//   - `notifications` (actions OTHER people took that affect you)
//   - Friend Activity on Movie Detail (OTHER users' public entries for one title)
// Assembled client-side from three existing tables (diary_entries,
// saved_items, user_list_items+user_lists) — no new table, RLS applies
// per-query exactly as it does everywhere else, so viewing another user's
// profile naturally shows only what RLS already permits (their public diary
// entries and public/unlisted lists; saved_items has no public-read policy
// at all, so it will always be empty for a non-owner viewer — expected, not
// a bug, per CONSTRAINTS).
import { supabase } from './client';

export type ActivityKind = 'watched' | 'rated' | 'reviewed' | 'shelved' | 'listed';

export interface ActivityItem {
  kind:      ActivityKind;
  title:     string;
  poster:    string | null;
  timestamp: string; // ISO
  detail?:   string; // e.g. list title, rating value
  routeId?:  string; // route id for navigating back into Movie Detail, when applicable
  mediaType?: string;
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

function toRouteId(dbMediaType: string, dbMediaId: string): string {
  const prefix = dbMediaType === 'movie' ? 'film' : dbMediaType;
  const bareId = dbMediaId.startsWith('tmdb-') ? dbMediaId.slice(5) : dbMediaId;
  return `${prefix}-${bareId}`;
}

export async function fetchRecentActivity(userId: string, limit = 20): Promise<ActivityItem[]> {
  const client = requireClient();

  const [diaryRes, savedRes, listItemsRes] = await Promise.all([
    client
      .from('diary_entries')
      .select('media_id, media_type, title, poster, rating, review, watched_date, updated_at')
      .eq('user_id', userId)
      .eq('review_scope', 'show')
      .order('updated_at', { ascending: false })
      .limit(limit),
    client
      .from('saved_items')
      .select('media_id, media_type, title, poster, added_at')
      .eq('user_id', userId)
      .order('added_at', { ascending: false })
      .limit(limit),
    client
      .from('user_list_items')
      .select('title, poster_url, created_at, list_id, user_lists!inner(user_id, title)')
      .eq('user_lists.user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);

  if (diaryRes.error) throw diaryRes.error;
  if (savedRes.error) throw savedRes.error;
  if (listItemsRes.error) throw listItemsRes.error;

  const items: ActivityItem[] = [];

  for (const row of diaryRes.data ?? []) {
    const routeId = toRouteId(row.media_type, row.media_id);
    // A diary row can represent watched/rated/reviewed simultaneously — pick
    // the most descriptive single label rather than emitting 3 entries for one row.
    const kind: ActivityKind = row.review ? 'reviewed' : (row.rating ? 'rated' : 'watched');
    items.push({
      kind,
      title:     row.title,
      poster:    row.poster,
      timestamp: row.updated_at,
      detail:    kind === 'rated' ? `${Number(row.rating).toFixed(1)} / 10` : undefined,
      routeId,
      mediaType: row.media_type,
    });
  }

  for (const row of savedRes.data ?? []) {
    items.push({
      kind:      'shelved',
      title:     row.title,
      poster:    row.poster,
      timestamp: row.added_at,
      routeId:   toRouteId(row.media_type, row.media_id),
      mediaType: row.media_type,
    });
  }

  for (const row of listItemsRes.data ?? []) {
    const listInfo = Array.isArray(row.user_lists) ? row.user_lists[0] : row.user_lists;
    items.push({
      kind:      'listed',
      title:     row.title,
      poster:    row.poster_url,
      timestamp: row.created_at,
      detail:    listInfo?.title,
    });
  }

  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}
