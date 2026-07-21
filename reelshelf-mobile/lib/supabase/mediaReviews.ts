// Real Friend/Community Reviews for the Reviews section on Media Detail —
// mirrors the website's lib/supabase/mediaReviews.ts (fetchFollowingReviewsForMedia/
// fetchPublicReviewsForMedia) using the same followers + diary_entries shape
// mobile already queries elsewhere (see friendActivity.ts). Gated by the same
// "Public can view shared diary entries" RLS policy (profiles.username is not
// null) — no new tables or policies, RLS alone decides what's visible.
//
// Distinct from "review text" vs "activity": Friend Activity (friendActivity.ts)
// surfaces any logged rating/review; these two queries filter to entries that
// actually have review TEXT, since that's what a "review" reads as here.
import { supabase } from './client';
import { toDbMediaId, toDbMediaType, type MediaMeta } from './mediaActions';
import type { AttachmentType } from './diaryComposer';

export interface MediaReviewEntry {
  userId:           string;
  username:         string | null;
  displayName:      string | null;
  avatarUrl:        string | null;
  rating:           number | null;
  review:           string;
  watchedDate:      string;
  favourite:        boolean;
  rewatch:          boolean;
  containsSpoilers: boolean;
  watchedInCinema:  boolean;
  attachmentUrl:    string | null;
  attachmentType:   AttachmentType | null;
}

const REVIEW_ROW_SELECT = 'user_id, rating, review, watched_date, favourite, rewatch, contains_spoilers, watched_in_cinema, attachment_url, attachment_type';

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

interface RawReviewRow {
  user_id:           string;
  rating:            number | string | null;
  review:            string | null;
  watched_date:      string;
  favourite:         boolean;
  rewatch:           boolean;
  contains_spoilers: boolean;
  watched_in_cinema: boolean;
  attachment_url:    string | null;
  attachment_type:   AttachmentType | null;
}

/** Keeps only the most recent reviewed row per user — a user who's logged a
 *  title more than once (e.g. a rewatch) should only ever show up once here. */
function dedupeByUser(rows: RawReviewRow[]): RawReviewRow[] {
  const seen = new Set<string>();
  const out: RawReviewRow[] = [];
  for (const row of rows) {
    if (seen.has(row.user_id)) continue;
    seen.add(row.user_id);
    out.push(row);
  }
  return out;
}

async function attachProfiles(client: NonNullable<typeof supabase>, rows: RawReviewRow[]): Promise<MediaReviewEntry[]> {
  if (rows.length === 0) return [];
  const userIds = rows.map((r) => r.user_id);
  const { data: profiles, error } = await client
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', userIds);
  if (error) throw error;

  const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  return rows
    // RLS already restricts `profiles` to username-not-null rows, but a user
    // that's since gone private between the two queries above would otherwise
    // render with blank identity — skip rather than show an anonymous card.
    .filter((r) => profileById.has(r.user_id))
    .map((r) => {
      const profile = profileById.get(r.user_id)!;
      return {
        userId:           r.user_id,
        username:         profile.username ?? null,
        displayName:      profile.display_name ?? null,
        avatarUrl:        profile.avatar_url ?? null,
        rating:           typeof r.rating === 'number' ? r.rating : r.rating ? Number(r.rating) : null,
        review:           r.review ?? '',
        watchedDate:      r.watched_date,
        favourite:        r.favourite,
        rewatch:          r.rewatch,
        containsSpoilers: r.contains_spoilers,
        watchedInCinema:  r.watched_in_cinema,
        attachmentUrl:    r.attachment_url,
        attachmentType:   r.attachment_type,
      };
    });
}

/** Followed users' real, public, non-empty reviews for this exact title. */
export async function fetchFriendReviewsForMedia(
  userId: string,
  meta: Pick<MediaMeta, 'id' | 'mediaType'>,
): Promise<MediaReviewEntry[]> {
  const client = requireClient();

  const { data: follows, error: followErr } = await client
    .from('followers')
    .select('following_id')
    .eq('follower_id', userId);
  if (followErr) throw followErr;

  const followingIds = (follows ?? []).map((f) => f.following_id as string);
  if (followingIds.length === 0) return [];

  const { data: entries, error: entriesErr } = await client
    .from('diary_entries')
    .select(REVIEW_ROW_SELECT)
    .in('user_id', followingIds)
    .eq('media_type', toDbMediaType(meta.mediaType))
    .eq('media_id', toDbMediaId(meta.id))
    .eq('review_scope', 'show')
    .eq('season_number', 0)
    .eq('episode_number', 0)
    .not('review', 'is', null)
    .neq('review', '')
    .order('watched_date', { ascending: false })
    .limit(30);
  if (entriesErr) throw entriesErr;
  if (!entries || entries.length === 0) return [];

  return attachProfiles(client, dedupeByUser(entries as RawReviewRow[]));
}

/** Real public reviews from anyone (RLS-gated the same way as Friend
 *  Reviews), for this exact title. `excludeUserIds` lets the caller keep
 *  Community distinct from whatever's already shown in Friend Reviews. */
export async function fetchCommunityReviewsForMedia(
  meta: Pick<MediaMeta, 'id' | 'mediaType'>,
  excludeUserIds: string[],
  limit = 20,
): Promise<MediaReviewEntry[]> {
  const client = requireClient();
  const excluded = new Set(excludeUserIds);

  // Filtered client-side rather than a `.not('user_id', 'in', ...)` PostgREST
  // filter — the exclude set is only ever a handful of ids (current user +
  // whichever handful already appear in Friend Reviews), and this avoids
  // hand-building a query-string value for a filter shape no other query in
  // this codebase uses yet.
  const { data: entries, error } = await client
    .from('diary_entries')
    .select(REVIEW_ROW_SELECT)
    .eq('media_type', toDbMediaType(meta.mediaType))
    .eq('media_id', toDbMediaId(meta.id))
    .eq('review_scope', 'show')
    .eq('season_number', 0)
    .eq('episode_number', 0)
    .not('review', 'is', null)
    .neq('review', '')
    .order('watched_date', { ascending: false })
    .limit(limit * 3 + excluded.size); // headroom for dedupe + exclusion before slicing to `limit`
  if (error) throw error;
  if (!entries || entries.length === 0) return [];

  const deduped = dedupeByUser((entries as RawReviewRow[]).filter((r) => !excluded.has(r.user_id))).slice(0, limit);
  return attachProfiles(client, deduped);
}
