// Lists — reuses the EXISTING user_lists/user_list_items/list_likes/
// list_saves tables exactly as WEBSITE_LISTS_AUDIT.md confirms the website
// uses them. No new table. Reorder persistence uses the same live RPC the
// website calls (`update_list_items_order`); engagement counts use the same
// live RPC + exact trending-score formula as the website's
// `lib/supabase/list-engagement.ts` (`recalculateListScores`).
import { resolveImageUrl } from '../resolveImageUrl';
import { supabase } from './client';

export type ListVisibility = 'public' | 'private' | 'unlisted';
export type ListMediaType = 'movie' | 'tv' | 'book';

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

function toRouteId(mediaType: string, mediaId: string): string {
  const prefix = mediaType === 'movie' ? 'film' : mediaType;
  const bareId = mediaId.startsWith('tmdb-') ? mediaId.slice(5) : mediaId;
  return `${prefix}-${bareId}`;
}

interface RawListRow {
  id:          string;
  title:       string;
  description: string | null;
  visibility:  string;
  is_ranked:   boolean;
  like_count:  number | null;
  save_count:  number | null;
}

// ── List summaries (Lists tab / Profile Lists tab+preview) ──────────────────
export interface UserListSummary {
  id:             string;
  title:          string;
  description:    string | null;
  visibility:     ListVisibility;
  isRanked:       boolean;
  likeCount:      number;
  saveCount:      number;
  itemCount:      number;
  previewPosters: string[]; // already resolved via resolveImageUrl
  /** Only populated by fetchSavedLists — someone else's list, worth showing
   *  whose it is in a browsing context. Undefined for the owner's own list. */
  ownerName?:     string | null;
}

/** isOwnerView=false (viewing someone else's lists) only returns their
 *  public lists — matches the website's `fetchListsForProfile` exactly
 *  (private/unlisted lists are never shown on someone else's profile). */
export async function fetchUserLists(userId: string, isOwnerView: boolean): Promise<UserListSummary[]> {
  const client = requireClient();
  let query = client
    .from('user_lists')
    .select('id, title, description, visibility, is_ranked, like_count, save_count')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (!isOwnerView) query = query.eq('visibility', 'public');

  const { data: lists, error: listsErr } = await query;
  if (listsErr) throw listsErr;
  return attachCoversAndCounts(client, (lists ?? []) as RawListRow[]);
}

/** Lists shared by their id, with covers/counts resolved — the common tail
 *  end of both fetchUserLists and fetchSavedLists. `ownerNameById` is only
 *  passed by fetchSavedLists (browsing other people's lists). */
async function attachCoversAndCounts(
  client: NonNullable<typeof supabase>,
  lists: RawListRow[],
  ownerNameById?: Map<string, string | null>,
): Promise<UserListSummary[]> {
  if (lists.length === 0) return [];
  const listIds = lists.map((l) => l.id);
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
    if (posters.length < 4) posters.push(resolveImageUrl(item.poster_url as string | null, 'poster') ?? '');
    itemsByList.set(listId, posters);
  }

  return lists.map((l) => ({
    id:             l.id,
    title:          l.title,
    description:    l.description,
    visibility:     l.visibility as ListVisibility,
    isRanked:       l.is_ranked,
    likeCount:      l.like_count ?? 0,
    saveCount:      l.save_count ?? 0,
    itemCount:      countByList.get(l.id) ?? 0,
    previewPosters: (itemsByList.get(l.id) ?? []).filter(Boolean),
    ownerName:      ownerNameById?.get(l.id) ?? undefined,
  }));
}

/** Lists the current user has saved (list_saves), NOT lists they own —
 *  newest-saved first. A list that's since been made private/deleted simply
 *  won't come back from the user_lists lookup (RLS + the row being gone),
 *  so it's naturally dropped here without any extra visibility check needed. */
export async function fetchSavedLists(userId: string): Promise<UserListSummary[]> {
  const client = requireClient();
  const { data: saves, error: savesErr } = await client
    .from('list_saves')
    .select('list_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (savesErr) throw savesErr;
  if (!saves || saves.length === 0) return [];

  const listIds = saves.map((s) => s.list_id as string);
  const { data: lists, error: listsErr } = await client
    .from('user_lists')
    .select('id, title, description, visibility, is_ranked, like_count, save_count, user_id, profiles(username, display_name)')
    .in('id', listIds);
  if (listsErr) throw listsErr;

  const ownerNameById = new Map<string, string | null>();
  for (const l of lists ?? []) {
    const owner = Array.isArray(l.profiles) ? l.profiles[0] : (l.profiles as any);
    ownerNameById.set(l.id as string, (owner?.display_name || owner?.username) ?? null);
  }

  // .in() doesn't preserve order — reassemble in save order (newest first).
  const listById = new Map((lists ?? []).map((l) => [l.id as string, l as RawListRow]));
  const ordered = listIds.map((id) => listById.get(id)).filter((l): l is RawListRow => !!l);

  return attachCoversAndCounts(client, ordered, ownerNameById);
}

// ── Lists Discovery (app/lists/page.tsx + ListsDiscoveryClient.tsx) ─────────
// Real website behavior ported exactly: one fetch of up to 100 PUBLIC lists,
// newest first, then the caller sorts the same array client-side per the 3
// real sort modes (trending_score desc, like_count desc, created_at desc —
// each with created_at desc as the real tie-breaker for the first two,
// matching ListsDiscoveryClient.tsx's actual comparator functions exactly).
export interface DiscoveryListSummary extends UserListSummary {
  trendingScore: number;
  createdAt:     string;
}

interface RawDiscoveryListRow extends RawListRow {
  user_id:        string;
  trending_score: number;
  created_at:     string;
}

export async function fetchDiscoveryLists(): Promise<DiscoveryListSummary[]> {
  const client = requireClient();
  const { data: rawLists, error: listsErr } = await client
    .from('user_lists')
    .select('id, title, description, visibility, is_ranked, like_count, save_count, trending_score, created_at, user_id, profiles(username, display_name)')
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(100);
  if (listsErr) throw listsErr;
  if (!rawLists || rawLists.length === 0) return [];

  const ownerNameById = new Map<string, string | null>();
  for (const l of rawLists) {
    const owner = Array.isArray((l as any).profiles) ? (l as any).profiles[0] : (l as any).profiles;
    ownerNameById.set(l.id as string, (owner?.display_name || owner?.username) ?? null);
  }

  const base = await attachCoversAndCounts(client, rawLists as unknown as RawListRow[], ownerNameById);
  const extraById = new Map((rawLists as unknown as RawDiscoveryListRow[]).map((l) => [l.id, l]));

  return base.map((summary) => {
    const extra = extraById.get(summary.id)!;
    return { ...summary, trendingScore: extra.trending_score ?? 0, createdAt: extra.created_at };
  });
}

// ── List detail ──────────────────────────────────────────────────────────────
export interface ListDetailItem {
  id:        string;
  routeId:   string;
  mediaId:   string; // raw DB-form id (tmdb-<id> or book slug) — used to detect "already in list"
  mediaType: string; // mobile form: 'film' | 'tv' | 'book'
  title:     string;
  posterUrl: string | null; // already resolved
  year:      string | null;
  rankOrder: number;
  notes:     string | null;
}

export interface ListDetail {
  id:             string;
  title:          string;
  description:    string | null;
  visibility:     ListVisibility;
  isRanked:       boolean;
  likeCount:      number;
  saveCount:      number;
  ownerId:        string;
  ownerUsername:  string | null;
  ownerName:      string | null;
  ownerAvatarUrl: string | null;
  items:          ListDetailItem[];
}

/** A private list returns null for a non-owner viewer — same client-side
 *  check the website's list detail page performs on top of RLS
 *  (`app/lists/[id]/page.tsx`'s `fetchAll`), treated as "not found," not an
 *  error to work around. */
export async function fetchListDetail(listId: string, viewerId: string | null): Promise<ListDetail | null> {
  const client = requireClient();
  const { data: list, error: listErr } = await client
    .from('user_lists')
    .select('id, title, description, user_id, visibility, is_ranked, like_count, save_count, profiles(username, display_name, avatar_url)')
    .eq('id', listId)
    .maybeSingle();
  if (listErr) throw listErr;
  if (!list) return null;

  const owned = viewerId === list.user_id;
  if (list.visibility === 'private' && !owned) return null;

  const { data: items, error: itemsErr } = await client
    .from('user_list_items')
    .select('id, media_id, media_type, title, poster_url, year, rank_order, notes')
    .eq('list_id', listId)
    .order('rank_order', { ascending: true });
  if (itemsErr) throw itemsErr;

  const owner = Array.isArray(list.profiles) ? list.profiles[0] : (list.profiles as any);

  return {
    id:             list.id,
    title:          list.title,
    description:    list.description,
    visibility:     list.visibility as ListVisibility,
    isRanked:       list.is_ranked as boolean,
    likeCount:      (list.like_count as number) ?? 0,
    saveCount:      (list.save_count as number) ?? 0,
    ownerId:        list.user_id,
    ownerUsername:  owner?.username ?? null,
    ownerName:      (owner?.display_name || owner?.username) ?? null,
    ownerAvatarUrl: owner?.avatar_url ?? null,
    items: (items ?? []).map((row) => ({
      id:        row.id,
      routeId:   toRouteId(row.media_type, row.media_id),
      mediaId:   row.media_id,
      mediaType: row.media_type === 'movie' ? 'film' : row.media_type,
      title:     row.title,
      posterUrl: resolveImageUrl(row.poster_url, 'poster'),
      year:      row.year,
      rankOrder: row.rank_order,
      notes:     row.notes,
    })),
  };
}

// ── Create / Update / Delete ─────────────────────────────────────────────────
export interface ListEditFields {
  title:       string;
  description: string;
  visibility:  ListVisibility;
  isRanked:    boolean;
}

export async function createList(userId: string, fields: ListEditFields): Promise<string> {
  const client = requireClient();
  const { data, error } = await client
    .from('user_lists')
    .insert({
      user_id:     userId,
      title:       fields.title.trim(),
      description: fields.description.trim() || null,
      visibility:  fields.visibility,
      is_ranked:   fields.isRanked,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateList(listId: string, fields: ListEditFields): Promise<void> {
  const client = requireClient();
  const { error } = await client
    .from('user_lists')
    .update({
      title:       fields.title.trim(),
      description: fields.description.trim() || null,
      visibility:  fields.visibility,
      is_ranked:   fields.isRanked,
      updated_at:  new Date().toISOString(),
    })
    .eq('id', listId);
  if (error) throw error;
}

/** Cascades to user_list_items/list_likes/list_saves — confirmed live via
 *  `ON DELETE CASCADE` on all three FKs, no manual cleanup needed. */
export async function deleteList(listId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('user_lists').delete().eq('id', listId);
  if (error) throw error;
}

// ── Items: add / remove / reorder ────────────────────────────────────────────
export interface AddListItemInput {
  mediaType: ListMediaType;
  mediaId:   string; // DB-form id (tmdb-<id> or book slug)
  title:     string;
  posterUrl: string | null;
  year:      string | null;
  author?:   string | null;
}

export async function addListItem(listId: string, item: AddListItemInput): Promise<void> {
  const client = requireClient();
  const { count, error: countErr } = await client
    .from('user_list_items')
    .select('id', { count: 'exact', head: true })
    .eq('list_id', listId);
  if (countErr) throw countErr;

  const { error } = await client.from('user_list_items').insert({
    list_id:    listId,
    media_type: item.mediaType,
    media_id:   item.mediaId,
    title:      item.title,
    poster_url: item.posterUrl,
    year:       item.year,
    rank_order: (count ?? 0) + 1,
    author:     item.author ?? null,
  });
  if (error) throw error;
}

/** Removes an item, then renumbers the remaining items' rank_order to stay
 *  contiguous — matches the website's exact `removeItem` behavior
 *  (`app/lists/[id]/page.tsx`), persisted via the same
 *  `update_list_items_order` RPC used for drag-reorder. */
export async function removeListItem(listId: string, itemId: string, remainingInOrder: { id: string }[]): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('user_list_items').delete().eq('id', itemId);
  if (error) throw error;

  if (remainingInOrder.length === 0) return;
  const payload = remainingInOrder.map((it, i) => ({ id: it.id, rank_order: i + 1 }));
  const { error: rpcError } = await client.rpc('update_list_items_order', { payload });
  if (rpcError) throw rpcError;
}

/** Persists a full reordered item list — the same live RPC the website's
 *  desktop drag, touch-drag, and mobile "Move Up/Down" fallback all call. */
export async function reorderListItems(itemsInOrder: { id: string }[]): Promise<void> {
  const client = requireClient();
  const payload = itemsInOrder.map((it, i) => ({ id: it.id, rank_order: i + 1 }));
  const { error } = await client.rpc('update_list_items_order', { payload });
  if (error) throw error;
}

// ── Engagement: like / save ──────────────────────────────────────────────────
export interface ListEngagementState {
  isLiked: boolean;
  isSaved: boolean;
}

export async function fetchListEngagementState(listId: string, userId: string): Promise<ListEngagementState> {
  const client = requireClient();
  const [likeRes, saveRes] = await Promise.all([
    client.from('list_likes').select('id').eq('list_id', listId).eq('user_id', userId).maybeSingle(),
    client.from('list_saves').select('id').eq('list_id', listId).eq('user_id', userId).maybeSingle(),
  ]);
  if (likeRes.error) throw likeRes.error;
  if (saveRes.error) throw saveRes.error;
  return { isLiked: !!likeRes.data, isSaved: !!saveRes.data };
}

/** Mirrors the website's `recalculateListScores` exactly (same formula,
 *  same SECURITY DEFINER RPC) — trending_score = likes*2 + saves*3 +
 *  (10 if either had activity in the last 7 days, else 0). */
async function recalculateListEngagement(listId: string): Promise<{ likeCount: number; saveCount: number }> {
  const client = requireClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [likeCountRes, saveCountRes, recentLikesRes, recentSavesRes] = await Promise.all([
    client.from('list_likes').select('id', { count: 'exact', head: true }).eq('list_id', listId),
    client.from('list_saves').select('id', { count: 'exact', head: true }).eq('list_id', listId),
    client.from('list_likes').select('id').eq('list_id', listId).gte('created_at', sevenDaysAgo).limit(1),
    client.from('list_saves').select('id').eq('list_id', listId).gte('created_at', sevenDaysAgo).limit(1),
  ]);
  if (likeCountRes.error) throw likeCountRes.error;
  if (saveCountRes.error) throw saveCountRes.error;

  const likeCount = likeCountRes.count ?? 0;
  const saveCount = saveCountRes.count ?? 0;
  const hasRecentActivity = (recentLikesRes.data?.length ?? 0) > 0 || (recentSavesRes.data?.length ?? 0) > 0;
  const trendingScore = likeCount * 2 + saveCount * 3 + (hasRecentActivity ? 10 : 0);

  const { error } = await client.rpc('update_list_engagement_counts', {
    p_list_id: listId,
    p_like_count: likeCount,
    p_save_count: saveCount,
    p_trending_score: trendingScore,
  });
  if (error) throw error;

  return { likeCount, saveCount };
}

/** Liking/saving your own list is blocked — matches the website's API
 *  routes exactly ("Cannot like own list" / "Cannot save own list"). */
export async function likeList(listId: string, userId: string): Promise<{ likeCount: number; saveCount: number }> {
  const client = requireClient();
  const { error } = await client.from('list_likes').insert({ list_id: listId, user_id: userId });
  if (error && error.code !== '23505') throw error;
  return recalculateListEngagement(listId);
}

export async function unlikeList(listId: string, userId: string): Promise<{ likeCount: number; saveCount: number }> {
  const client = requireClient();
  const { error } = await client.from('list_likes').delete().eq('list_id', listId).eq('user_id', userId);
  if (error) throw error;
  return recalculateListEngagement(listId);
}

export async function saveList(listId: string, userId: string): Promise<{ likeCount: number; saveCount: number }> {
  const client = requireClient();
  const { error } = await client.from('list_saves').insert({ list_id: listId, user_id: userId });
  if (error && error.code !== '23505') throw error;
  return recalculateListEngagement(listId);
}

export async function unsaveList(listId: string, userId: string): Promise<{ likeCount: number; saveCount: number }> {
  const client = requireClient();
  const { error } = await client.from('list_saves').delete().eq('list_id', listId).eq('user_id', userId);
  if (error) throw error;
  return recalculateListEngagement(listId);
}
