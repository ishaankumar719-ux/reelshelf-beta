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
