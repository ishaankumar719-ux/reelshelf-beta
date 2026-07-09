import { supabase } from './client';

export interface UserListSummary {
  id:            string;
  title:         string;
  description:   string | null;
  itemCount:     number;
  previewPosters: string[];
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

export async function fetchUserLists(userId: string): Promise<UserListSummary[]> {
  const client = requireClient();
  const { data: lists, error: listsErr } = await client
    .from('user_lists')
    .select('id, title, description')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (listsErr) throw listsErr;
  if (!lists || lists.length === 0) return [];

  const listIds = lists.map((l) => l.id as string);
  const { data: items, error: itemsErr } = await client
    .from('user_list_items')
    .select('list_id, poster_url')
    .in('list_id', listIds)
    .order('rank_order', { ascending: true });
  if (itemsErr) throw itemsErr;

  const itemsByList = new Map<string, string[]>();
  const countByList = new Map<string, number>();
  for (const item of items ?? []) {
    const listId = item.list_id as string;
    countByList.set(listId, (countByList.get(listId) ?? 0) + 1);
    const posters = itemsByList.get(listId) ?? [];
    if (posters.length < 4 && item.poster_url) posters.push(item.poster_url as string);
    itemsByList.set(listId, posters);
  }

  return lists.map((l) => ({
    id:             l.id as string,
    title:          l.title as string,
    description:    l.description as string | null,
    itemCount:      countByList.get(l.id as string) ?? 0,
    previewPosters: itemsByList.get(l.id as string) ?? [],
  }));
}

export interface ListDetailItem {
  id:        string;
  routeId:   string; // mobile route id, e.g. "film-693134"
  title:     string;
  posterUrl: string | null;
  year:      string | null;
  rankOrder: number;
}

export interface ListDetail {
  id:          string;
  title:       string;
  description: string | null;
  ownerId:     string;
  ownerName:   string | null;
  items:       ListDetailItem[];
}

function toRouteIdFromListItem(mediaType: string, mediaId: string): string {
  const prefix = mediaType === 'movie' ? 'film' : mediaType;
  const bareId = mediaId.startsWith('tmdb-') ? mediaId.slice(5) : mediaId;
  return `${prefix}-${bareId}`;
}

/** Fetches a single list's detail — RLS (public/unlisted for non-owners,
 *  all for the owner) already scopes this correctly; a private list simply
 *  returns null for a non-owner viewer, which the screen treats as
 *  "not found," not an error to work around. */
export async function fetchListDetail(listId: string): Promise<ListDetail | null> {
  const client = requireClient();
  const { data: list, error: listErr } = await client
    .from('user_lists')
    .select('id, title, description, user_id, profiles(username, display_name)')
    .eq('id', listId)
    .maybeSingle();
  if (listErr) throw listErr;
  if (!list) return null;

  const { data: items, error: itemsErr } = await client
    .from('user_list_items')
    .select('id, media_id, media_type, title, poster_url, year, rank_order')
    .eq('list_id', listId)
    .order('rank_order', { ascending: true });
  if (itemsErr) throw itemsErr;

  const owner = Array.isArray(list.profiles) ? list.profiles[0] : (list.profiles as any);

  return {
    id:          list.id,
    title:       list.title,
    description: list.description,
    ownerId:     list.user_id,
    ownerName:   (owner?.display_name || owner?.username) ?? null,
    items: (items ?? []).map((row) => ({
      id:        row.id,
      routeId:   toRouteIdFromListItem(row.media_type, row.media_id),
      title:     row.title,
      posterUrl: row.poster_url,
      year:      row.year,
      rankOrder: row.rank_order,
    })),
  };
}
