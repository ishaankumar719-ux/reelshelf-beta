// Real Friend Activity for Movie Detail — who the current user follows
// (followers table) who has logged this specific title publicly
// (diary_entries, gated by the existing "Public can view shared diary
// entries" RLS policy — profiles.username IS NOT NULL). No new tables or
// policies; this is exactly the existing RLS doing its job.
import { supabase } from './client';
import { toDbMediaId, toDbMediaType, type MediaMeta } from './mediaActions';

export interface FriendActivityEntry {
  userId:      string;
  username:    string | null;
  displayName: string | null;
  avatarUrl:   string | null;
  rating:      number | null;
  review:      string;
  watchedDate: string;
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

export async function fetchFriendActivity(
  userId: string,
  meta: Pick<MediaMeta, 'id' | 'mediaType'>,
): Promise<FriendActivityEntry[]> {
  const client = requireClient();

  const { data: follows, error: followErr } = await client
    .from('followers')
    .select('following_id')
    .eq('follower_id', userId);
  if (followErr) throw followErr;

  const followingIds = (follows ?? []).map((f) => f.following_id as string);
  if (followingIds.length === 0) return [];

  // diary_entries has no direct FK to profiles (both reference auth.users
  // independently) — PostgREST can't embed the join, so this is two queries
  // merged client-side rather than one embedded select.
  const { data: entries, error: entriesErr } = await client
    .from('diary_entries')
    .select('user_id, rating, review, watched_date')
    .in('user_id', followingIds)
    .eq('media_type', toDbMediaType(meta.mediaType))
    .eq('media_id', toDbMediaId(meta.id))
    .eq('review_scope', 'show')
    .eq('season_number', 0)
    .eq('episode_number', 0)
    .order('watched_date', { ascending: false });
  if (entriesErr) throw entriesErr;
  if (!entries || entries.length === 0) return [];

  const entryUserIds = entries.map((e) => e.user_id as string);
  const { data: profiles, error: profilesErr } = await client
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', entryUserIds);
  if (profilesErr) throw profilesErr;

  const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  return entries.map((e) => {
    const profile = profileById.get(e.user_id as string);
    return {
      userId:      e.user_id as string,
      username:    profile?.username ?? null,
      displayName: profile?.display_name ?? null,
      avatarUrl:   profile?.avatar_url ?? null,
      rating:      typeof e.rating === 'number' ? e.rating : e.rating ? Number(e.rating) : null,
      review:      e.review ?? '',
      watchedDate: e.watched_date as string,
    };
  });
}
