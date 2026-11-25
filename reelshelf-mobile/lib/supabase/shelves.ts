// Shelves: the film / TV watchlist and reading list shown as shelves, plus custom lists.
// Mirrors lib/shelves.ts on the website — same RPCs, same ordering, same visibility rules.
import { supabase } from './client';

export type Visibility = 'public' | 'unlisted' | 'private';
export type SystemShelf = 'film' | 'tv' | 'reading';
export type ShelfMediaType = 'movie' | 'tv' | 'book' | 'short_film';

export interface ShelfItem {
  key: string;            // saved_items.id or user_list_items.id
  mediaId: string;
  mediaType: ShelfMediaType;
  routeId: string;        // /media/[id]
  title: string;
  poster: string | null;
  year: string | null;
  creator: string | null;
  note: string | null;
  rank: number | null;
}

export interface Shelf {
  id: string;             // 'film' | 'tv' | 'reading' | list uuid
  kind: 'system' | 'list';
  title: string;
  visibility: Visibility;
  ranked: boolean;
  items: ShelfItem[];
}

export const SYSTEM_SHELVES: { id: SystemShelf; title: string; listType: string }[] = [
  { id: 'film', title: 'Films to watch', listType: 'watchlist' },
  { id: 'tv', title: 'Shows to watch', listType: 'watchlist' },
  { id: 'reading', title: 'Reading list', listType: 'reading_shelf' },
];

function client() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

function toRouteId(mediaType: string, mediaId: string): string {
  const prefix = mediaType === 'movie' ? 'film' : mediaType;
  const bareId = mediaId.startsWith('tmdb-') ? mediaId.slice(5) : mediaId;
  return `${prefix}-${bareId}`;
}

interface SavedRow { id: string; media_id: string; media_type: ShelfMediaType; title: string; poster: string | null; year: number | null; creator: string | null }
interface ListRow {
  id: string; title: string; is_ranked: boolean; visibility: Visibility;
  user_list_items: { id: string; media_id: string; media_type: ShelfMediaType; title: string; poster_url: string | null; year: string | null; author: string | null; notes: string | null; rank_order: number }[];
}

const LIST_SELECT = 'id, title, is_ranked, visibility, user_list_items(id, media_id, media_type, title, poster_url, year, author, notes, rank_order)';


async function systemShelf(userId: string, shelf: SystemShelf, visibility: Visibility, token: string | null): Promise<Shelf> {
  const { data, error } = await client().rpc('get_shelf_items', { p_user: userId, p_shelf: shelf, p_token: token });
  if (error) throw error;
  const def = SYSTEM_SHELVES.find((s) => s.id === shelf)!;
  const items = ((data ?? []) as SavedRow[]).map<ShelfItem>((r) => ({
    key: r.id,
    mediaId: r.media_id,
    mediaType: r.media_type,
    routeId: toRouteId(r.media_type, r.media_id),
    title: r.title,
    poster: r.poster,
    year: r.year ? String(r.year) : null,
    creator: r.creator,
    note: null,
    rank: null,
  }));
  return { id: shelf, kind: 'system', title: def.title, visibility, ranked: false, items };
}

function fromList(l: ListRow): Shelf {
  const items = [...(l.user_list_items ?? [])]
    .sort((a, b) => a.rank_order - b.rank_order)
    .map<ShelfItem>((i) => ({
      key: i.id,
      mediaId: i.media_id,
      mediaType: i.media_type,
      routeId: toRouteId(i.media_type, i.media_id),
      title: i.title,
      poster: i.poster_url,
      year: i.year,
      creator: i.author,
      note: i.notes,
      rank: l.is_ranked ? i.rank_order : null,
    }));
  return { id: l.id, kind: 'list', title: l.title, visibility: l.visibility ?? 'private', ranked: l.is_ranked, items };
}

export async function loadOwnShelves(userId: string): Promise<Shelf[]> {
  const c = client();
  const [{ data: settings }, { data: lists, error }] = await Promise.all([
    c.from('shelf_settings').select('film_visibility, tv_visibility, reading_visibility').eq('user_id', userId).maybeSingle(),
    c.from('user_lists').select(LIST_SELECT).eq('user_id', userId).order('updated_at', { ascending: false }),
  ]);
  if (error) throw error;
  const vis = (s: SystemShelf) => ((settings as Record<string, Visibility> | null)?.[`${s}_visibility`] ?? 'private') as Visibility;
  const system = await Promise.all(SYSTEM_SHELVES.map((s) => systemShelf(userId, s.id, vis(s.id), null)));
  return [...system, ...((lists ?? []) as ListRow[]).map(fromList)];
}

/** Someone else's shelves: public system shelves and public lists (unlisted never appear here). */
export async function loadProfileShelves(userId: string): Promise<Shelf[]> {
  const c = client();
  const [{ data: rows }, { data: lists }] = await Promise.all([
    c.rpc('profile_shelves', { p_user: userId }),
    c.from('user_lists').select(LIST_SELECT).eq('user_id', userId).eq('visibility', 'public').order('updated_at', { ascending: false }),
  ]);
  const visible = ((rows ?? []) as { shelf: SystemShelf; visibility: Visibility }[]).filter((r) => r.visibility === 'public');
  const system = await Promise.all(visible.map((r) => systemShelf(userId, r.shelf, 'public', null)));
  return [...system.filter((s) => s.items.length), ...((lists ?? []) as ListRow[]).map(fromList)];
}

export async function saveShelfOrder(shelf: Shelf, ordered: ShelfItem[]) {
  const c = client();
  if (shelf.kind === 'system') {
    const listType = SYSTEM_SHELVES.find((s) => s.id === shelf.id)!.listType;
    const { error } = await c.rpc('reorder_shelf', { p_list_type: listType, p_ids: ordered.map((i) => i.key) });
    if (error) throw error;
    return;
  }
  const { error } = await c.rpc('update_list_items_order', { payload: ordered.map((i, idx) => ({ id: i.key, rank_order: idx + 1 })) });
  if (error) throw error;
}

export async function setShelfVisibility(userId: string, shelf: Shelf, v: Visibility) {
  const c = client();
  const { error } =
    shelf.kind === 'system'
      ? await c.from('shelf_settings').upsert({ user_id: userId, [`${shelf.id}_visibility`]: v, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      : await c.from('user_lists').update({ visibility: v, is_public: v === 'public' }).eq('id', shelf.id);
  if (error) throw error;
}

export function posterAt(url: string | null, size: 'w154' | 'w342') {
  if (!url) return null;
  return url.replace(/\/t\/p\/(w\d+|original)\//, `/t/p/${size}/`);
}
