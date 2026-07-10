// Mount Rushmore — reuses the EXISTING mount_rushmore table exactly as the
// website does (confirmed via WEBSITE_PROFILE_AUDIT.md §1, against real
// production rows). No new table, no schema change.
//
// CORRECTED MODEL (was wrong before this pass): this is THREE independent
// 4-slot sets — one each for movie/tv/book — not one 4-slot set mixing all
// media types. The website's own queries confirm this: both the editor load
// (`ProfileEditor.tsx:167-171`) and the public display fetch
// (`app/u/[username]/page.tsx:311-316`) order by `.order("media_type").order("position")`,
// and saving is scoped per media_type (`ProfileEditor.tsx:420-471`): delete
// + insert only the rows for the ONE type being edited, leaving the other
// two types' rows untouched. Real production data confirms `position` values
// repeat across media_type (up to 12 real rows per user, not 4).
import { supabase } from './client';

export type RushmoreMediaType = 'movie' | 'tv' | 'book';

export interface MountRushmoreSlot {
  position:   1 | 2 | 3 | 4;
  mediaId:    string;
  mediaType:  RushmoreMediaType;
  title:      string;
  year:       string | null;
  posterPath: string | null;
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

/** Fetches all of a user's Mount Rushmore rows across all three media types
 *  in one query — mirrors the website's own order-by exactly. Callers that
 *  only need one tab's slots should filter the result by `mediaType`. */
export async function fetchMountRushmore(userId: string): Promise<MountRushmoreSlot[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('mount_rushmore')
    .select('position, media_id, media_type, title, year, poster_path')
    .eq('user_id', userId)
    .order('media_type', { ascending: true })
    .order('position', { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .filter((row): row is typeof row & { position: 1 | 2 | 3 | 4; media_type: RushmoreMediaType } =>
      row.position >= 1 && row.position <= 4 &&
      (row.media_type === 'movie' || row.media_type === 'tv' || row.media_type === 'book'))
    .map((row) => ({
      position:   row.position,
      mediaId:    row.media_id,
      mediaType:  row.media_type,
      title:      row.title,
      year:       row.year,
      posterPath: row.poster_path,
    }));
}

/** Replaces ONLY the given media_type's slots — delete+insert scoped to
 *  `user_id AND media_type`, exactly matching the website's per-tab save
 *  behavior (`ProfileEditor.tsx:420-471`: "Each tab saves independently, so
 *  your top 4 in one category never overwrites another"). Saving Films never
 *  touches Series/Books rows. */
export async function saveMountRushmoreForType(
  userId: string,
  mediaType: RushmoreMediaType,
  slots: MountRushmoreSlot[],
): Promise<void> {
  const client = requireClient();
  const { error: deleteError } = await client
    .from('mount_rushmore')
    .delete()
    .eq('user_id', userId)
    .eq('media_type', mediaType);
  if (deleteError) throw deleteError;

  const toInsert = slots.filter((s) => s.mediaType === mediaType);
  if (toInsert.length === 0) return;

  const { error: insertError } = await client.from('mount_rushmore').insert(
    toInsert.map((item) => ({
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
