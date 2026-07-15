// Today's Story — confirmed "today's" article is simply the most recently
// published one (no rotation table, no per-day featured flag —
// WEBSITE_DAILY_REEL_AUDIT.md §2, matching the website's exact
// `fetchEditorialData()` query: is_published=true, order by published_at
// desc, limit 1).
import { supabase } from './client';
import { resolveImageUrl } from '../resolveImageUrl';

export interface TodaysStory {
  id:          string;
  title:       string;
  body:        string;
  coverImage:  string | null;
  author:      string;
  publishedAt: string;
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

export async function fetchTodaysStory(): Promise<TodaysStory | null> {
  const client = requireClient();
  const { data, error } = await client
    .from('articles')
    .select('id, title, body, cover_image, author, published_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;

  return {
    id:          row.id as string,
    title:       row.title as string,
    body:        row.body as string,
    coverImage:  resolveImageUrl(row.cover_image as string | null, 'backdrop'),
    author:      row.author as string,
    publishedAt: row.published_at as string,
  };
}
