// Top 4 — reuses the EXISTING mount_rushmore table (built for exactly this
// feature; RLS already correct: public read, owner-only write). No new table.
import { supabase } from './client';

export interface Top4Item {
  position:   number; // 1-4
  mediaId:    string;
  mediaType:  string;
  title:      string;
  year:       string | null;
  posterPath: string | null;
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

export async function fetchTop4(userId: string): Promise<Top4Item[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('mount_rushmore')
    .select('position, media_id, media_type, title, year, poster_path')
    .eq('user_id', userId)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    position:   row.position,
    mediaId:    row.media_id,
    mediaType:  row.media_type,
    title:      row.title,
    year:       row.year,
    posterPath: row.poster_path,
  }));
}

/** Replaces the caller's entire Top 4 in one pass — simplest correct
 *  semantics for a 4-slot picker (delete then insert, both scoped to
 *  auth.uid() = user_id via existing RLS). */
export async function saveTop4(userId: string, items: Top4Item[]): Promise<void> {
  const client = requireClient();
  const { error: deleteError } = await client.from('mount_rushmore').delete().eq('user_id', userId);
  if (deleteError) throw deleteError;

  if (items.length === 0) return;

  const { error: insertError } = await client.from('mount_rushmore').insert(
    items.map((item) => ({
      user_id:     userId,
      position:    item.position,
      media_id:    item.mediaId,
      media_type:  item.mediaType,
      title:       item.title,
      year:        item.year,
      poster_path: item.posterPath,
    })),
  );
  if (insertError) throw insertError;
}
