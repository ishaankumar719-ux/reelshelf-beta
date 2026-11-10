import type { MediaType } from '@/data/seedHomeContent';
import { toDbMediaId, toDbMediaType } from './mediaActions';
import { supabase } from './client';

export interface MediaRatingSummary {
  average: number;
  count: number;
}

interface RatingRow {
  user_id: string;
  rating: number | string | null;
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

function toValidRating(value: RatingRow['rating']): number | null {
  const rating = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(rating) && rating > 0 && rating <= 10 ? rating : null;
}

// Public diary rows are already constrained by RLS. Entries are newest first,
// so keeping the first rating per person prevents rewatches from giving one
// member extra weight in the community average.
export async function fetchCommunityRatingSummary(
  id: string,
  mediaType: MediaType,
): Promise<MediaRatingSummary | null> {
  const client = requireClient();
  const { data, error } = await client
    .from('diary_entries')
    .select('user_id, rating')
    .eq('media_type', toDbMediaType(mediaType))
    .eq('media_id', toDbMediaId(id))
    .eq('review_scope', 'show')
    .eq('season_number', 0)
    .eq('episode_number', 0)
    .not('rating', 'is', null)
    .order('watched_date', { ascending: false })
    .limit(500);
  if (error) throw error;

  const seenUsers = new Set<string>();
  const ratings: number[] = [];
  for (const row of (data ?? []) as RatingRow[]) {
    if (seenUsers.has(row.user_id)) continue;
    seenUsers.add(row.user_id);
    const rating = toValidRating(row.rating);
    if (rating !== null) ratings.push(rating);
  }

  if (ratings.length === 0) return null;
  const average = ratings.reduce((total, rating) => total + rating, 0) / ratings.length;
  return { average: Math.round(average * 10) / 10, count: ratings.length };
}
