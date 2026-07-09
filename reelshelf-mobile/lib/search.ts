// Universal Search — non-TMDB data sources: Google Books (public endpoint,
// same one already used by scripts/generate-seed-data.ts), and Supabase
// (collections from existing seed data, user_lists, profiles) — all
// respecting existing RLS, no new policies.
import { supabase } from './supabase/client';
import { collections, type SeedCollectionItem } from '@/data/seedHomeContent';

const GBOOKS = 'https://www.googleapis.com/books/v1/volumes';

export interface BookSearchResult {
  id:        string; // route id, e.g. "book-<slug>"
  title:     string;
  author:    string | null;
  year:      number | undefined;
  posterUrl: string | null;
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  const res = await fetch(`${GBOOKS}?q=${encodeURIComponent(query)}&maxResults=15`);
  if (!res.ok) throw new Error(`Google Books search failed: ${res.status}`);
  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];
  return items
    .filter((item: any) => item.volumeInfo?.title)
    .map((item: any) => {
      const info = item.volumeInfo;
      const year = info.publishedDate ? Number(String(info.publishedDate).slice(0, 4)) : undefined;
      return {
        id:        `book-${slugify(info.title)}`,
        title:     info.title,
        author:    Array.isArray(info.authors) ? info.authors[0] : null,
        year:      Number.isNaN(year) ? undefined : year,
        posterUrl: info.imageLinks?.thumbnail?.replace('http://', 'https://') ?? null,
      } as BookSearchResult;
    });
}

// ── Collections (existing curated seed data — not a live table) ─────────────
export interface CollectionSearchResult {
  id:          string;
  title:       string;
  storyCount:  number;
  previewItem: SeedCollectionItem['items'][number] | undefined;
}

export function searchCollections(query: string): CollectionSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return collections
    .filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q))
    .map((c) => ({ id: c.id, title: c.title, storyCount: c.storyCount, previewItem: c.items[0] }));
}

// ── Lists (real user_lists — RLS already restricts to public/unlisted for non-owners) ──
export interface ListSearchResult {
  id:          string;
  title:       string;
  description: string | null;
  ownerId:     string;
  ownerName:   string | null;
  itemCount:   number;
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

export async function searchLists(query: string): Promise<ListSearchResult[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('user_lists')
    .select('id, title, description, user_id, profiles(username, display_name)')
    .ilike('title', `%${query}%`)
    .in('visibility', ['public', 'unlisted'])
    .limit(15);
  if (error) throw error;

  const lists = data ?? [];
  const listIds = lists.map((l) => l.id as string);
  const counts = new Map<string, number>();
  if (listIds.length > 0) {
    const { data: items, error: itemsError } = await client
      .from('user_list_items')
      .select('list_id')
      .in('list_id', listIds);
    if (itemsError) throw itemsError;
    for (const item of items ?? []) {
      counts.set(item.list_id as string, (counts.get(item.list_id as string) ?? 0) + 1);
    }
  }

  return lists.map((l) => {
    const owner = Array.isArray(l.profiles) ? l.profiles[0] : l.profiles;
    return {
      id:          l.id as string,
      title:       l.title as string,
      description: l.description as string | null,
      ownerId:     l.user_id as string,
      ownerName:   (owner?.display_name || owner?.username) ?? null,
      itemCount:   counts.get(l.id as string) ?? 0,
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
    avatarUrl:   row.avatar_url as string | null,
  }));
}
