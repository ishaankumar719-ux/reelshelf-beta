// Today's Staff Picks — confirmed independent editorial section, NOT related
// to daily_picks (WEBSITE_DAILY_REEL_AUDIT.md §6). Reads the existing
// staff_picks table exactly as the website does.
import { supabase } from './client';
import { resolveImageUrl } from '../resolveImageUrl';
import type { PickMediaType } from '../recommendationEngine';

export interface StaffPick {
  id:        string;
  mediaType: PickMediaType;
  routeId:   string; // film-<mediaId> | tv-<mediaId> | book-<mediaId>, for navigation
  title:     string;
  posterUrl: string | null;
  year:      number | null;
  reason:    string;
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

// NOTE: real staff_picks.media_id values are the website's local-catalog
// slugs (e.g. "interstellar", "chernobyl", "dune-book"), not TMDB numeric ids
// — confirmed live. Movie Detail's live TMDB enrichment needs a numeric id
// after "film-"/"tv-", so tapping through will correctly show the title/
// poster passed via URL params but will not resolve live synopsis/cast/etc.
// for these specific ids — same known, disclosed sparse-detail limitation
// already documented for unseeded book ids elsewhere in this app; not
// something this task can fix without a schema/data change on the website.
function toRouteId(mediaType: PickMediaType, mediaId: string): string {
  return `${mediaType}-${mediaId}`;
}

export async function fetchStaffPicks(): Promise<StaffPick[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('staff_picks')
    .select('id, media_type, media_id, title, poster_url, year, reason')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .limit(6);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id:        row.id as string,
    mediaType: row.media_type as PickMediaType,
    routeId:   toRouteId(row.media_type as PickMediaType, row.media_id as string),
    title:     row.title as string,
    posterUrl: resolveImageUrl(row.poster_url as string | null, 'poster'),
    year:      row.year as number | null,
    reason:    row.reason as string,
  }));
}
