// Universal Search — non-TMDB data sources: Google Books (public endpoint,
// same one already used by scripts/generate-seed-data.ts), and Supabase
// (collections, user_lists, profiles) — all respecting existing RLS, no new
// policies.
import { resolveImageUrl } from './resolveImageUrl';
import { supabase } from './supabase/client';
import { searchCollections as searchCollectionsReal, type CollectionCardData } from './supabase/collections';

const GBOOKS = 'https://www.googleapis.com/books/v1/volumes';

export interface BookSearchResult {
  id:        string; // route id, e.g. "book-<real Google Books volumeId>"
  title:     string;
  author:    string | null;
  year:      number | undefined;
  posterUrl: string | null;
}

/** Google Books' /volumes response gives each item a top-level `id` — the
 *  real, globally-unique volume id (confirmed against this app's own
 *  scripts/generate-seed-data.ts, which reads the same field: `item.id`).
 *  Previously this used a slugified title instead, which collided for any
 *  two books sharing a title (reprints, unrelated books, etc.) both in the
 *  React key and in the route id persisted downstream via toDbMediaId. */
export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  const res = await fetch(`${GBOOKS}?q=${encodeURIComponent(query)}&maxResults=15`);
  if (!res.ok) throw new Error(`Google Books search failed: ${res.status}`);
  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];
  return items
    .filter((item: any) => item.id && item.volumeInfo?.title)
    .map((item: any) => {
      const info = item.volumeInfo;
      const year = info.publishedDate ? Number(String(info.publishedDate).slice(0, 4)) : undefined;
      return {
        id:        `book-${item.id}`,
        title:     info.title,
        author:    Array.isArray(info.authors) ? info.authors[0] : null,
        year:      Number.isNaN(year) ? undefined : year,
        posterUrl: resolveImageUrl(info.imageLinks?.thumbnail ?? null, 'poster'),
      } as BookSearchResult;
    });
}

// ── Collections (real collections/collection_items tables) ──────────────────
export interface CollectionSearchResult {
  id:            string;
  title:         string;
  storyCount:    number;
  /** Up to 4 items for a cover-collage deck preview (matches Lists' own
   *  ListCoverCollage treatment) — was previously a single preview thumb. */
  previewItems:  CollectionCardData['items'];
}

export async function searchCollections(query: string): Promise<CollectionSearchResult[]> {
  const results = await searchCollectionsReal(query);
  return results.map((c) => ({
    id:           c.id,
    title:        c.title,
    storyCount:   c.storyCount,
    previewItems: c.items.slice(0, 4),
  }));
}

// ── Lists (real user_lists — RLS already restricts to public/unlisted for non-owners) ──
export interface ListSearchResult {
  id:             string;
  title:          string;
  description:    string | null;
  ownerId:        string;
  ownerName:      string | null;
  itemCount:      number;
  /** Real aggregate from user_lists.like_count (same denormalized column
   *  List Detail's like toggle already maintains via recalculateListEngagement). */
  likeCount:      number;
  /** Up to 4 resolved poster URLs for a ListCoverCollage — same shape
   *  fetchUserLists already builds for Profile/Lists tab. */
  previewPosters: string[];
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

export async function searchLists(query: string): Promise<ListSearchResult[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('user_lists')
    .select('id, title, description, user_id, like_count, profiles(username, display_name)')
    .ilike('title', `%${query}%`)
    .in('visibility', ['public', 'unlisted'])
    .limit(15);
  if (error) throw error;

  const lists = data ?? [];
  const listIds = lists.map((l) => l.id as string);
  const counts = new Map<string, number>();
  const previewsByList = new Map<string, string[]>();
  if (listIds.length > 0) {
    const { data: items, error: itemsError } = await client
      .from('user_list_items')
      .select('list_id, poster_url')
      .in('list_id', listIds)
      .order('rank_order', { ascending: true });
    if (itemsError) throw itemsError;
    for (const item of items ?? []) {
      const listId = item.list_id as string;
      counts.set(listId, (counts.get(listId) ?? 0) + 1);
      const posters = previewsByList.get(listId) ?? [];
      if (posters.length < 4) {
        const resolved = resolveImageUrl(item.poster_url as string | null, 'poster');
        if (resolved) posters.push(resolved);
      }
      previewsByList.set(listId, posters);
    }
  }

  return lists.map((l) => {
    const owner = Array.isArray(l.profiles) ? l.profiles[0] : l.profiles;
    return {
      id:             l.id as string,
      title:          l.title as string,
      description:    l.description as string | null,
      ownerId:        l.user_id as string,
      ownerName:      (owner?.display_name || owner?.username) ?? null,
      itemCount:      counts.get(l.id as string) ?? 0,
      likeCount:      (l.like_count as number) ?? 0,
      previewPosters: previewsByList.get(l.id as string) ?? [],
    };
  });
}

// ── Users (profiles — public-visibility rule: username IS NOT NULL) ─────────
export interface UserSearchResult {
  id:          string;
  username:    string;
  displayName: string | null;
  avatarUrl:   string | null;
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .not('username', 'is', null)
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(15);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id:          row.id as string,
    username:    row.username as string,
    displayName: row.display_name as string | null,
    avatarUrl:   resolveImageUrl(row.avatar_url as string | null, 'profile'),
  }));
}
