// Today's Staff Picks — confirmed independent editorial section, NOT related
// to daily_picks (WEBSITE_DAILY_REEL_AUDIT.md §6). Reads the existing
// staff_picks table exactly as the website does.
import { supabase } from './client';
import { resolveImageUrl } from '../resolveImageUrl';
import { searchMovies, searchTv } from '../tmdb';
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

function toRouteId(mediaType: PickMediaType, mediaId: string): string {
  return `${mediaType}-${mediaId}`;
}

function normalizeTitle(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

// The staff-picks table uses website catalog slugs (for example,
// "interstellar") rather than TMDB ids. Resolve film/TV picks from their
// public title and year before navigating so their detail pages can load.
// Keep the original route as a fallback for a temporary TMDB lookup failure.
async function resolveRouteId(
  mediaType: PickMediaType,
  mediaId: string,
  title: string,
  year: number | null,
): Promise<string> {
  if (mediaType === 'book') return toRouteId(mediaType, mediaId);

  try {
    const results = await (mediaType === 'film' ? searchMovies(title) : searchTv(title));
    const titleMatches = results.filter((item) => normalizeTitle(item.title) === normalizeTitle(title));
    const match = titleMatches.find((item) => year === null || item.year === year) ?? titleMatches[0];
    return match?.id ?? toRouteId(mediaType, mediaId);
  } catch {
    return toRouteId(mediaType, mediaId);
  }
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

  return Promise.all((data ?? []).map(async (row) => {
    const mediaType = row.media_type as PickMediaType;
    const title = row.title as string;
    const year = row.year as number | null;
    return {
      id:        row.id as string,
      mediaType,
      routeId:   await resolveRouteId(mediaType, row.media_id as string, title, year),
      title,
      posterUrl: resolveImageUrl(row.poster_url as string | null, 'poster'),
      year,
      reason:    row.reason as string,
    } satisfies StaffPick;
  }));
}
