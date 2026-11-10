// Universal Search — non-TMDB data sources: Google Books (via the
// books-search Edge Function when deployed, else the public endpoint), and Supabase
// (collections, user_lists, profiles) — all respecting existing RLS, no new
// policies.
import { canonicalBookRouteId, getFranchiseBookForRouteId } from './bookIdentity';
import { fetchWithTimeout } from './fetchWithTimeout';
import { resolveImageUrl } from './resolveImageUrl';
import { supabase } from './supabase/client';
import { searchCollections as searchCollectionsReal, type CollectionCardData } from './supabase/collections';

const GBOOKS = 'https://www.googleapis.com/books/v1/volumes';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export interface BookSearchResult {
  id:        string; // route id: "book-<Google volume id>", or "book-<OL work id>" for a verified franchise edition
  title:     string;
  author:    string | null;
  year:      number | undefined;
  posterUrl: string | null;
}

/** Book search failed. `rateLimited` (HTTP 429) means Google Books is
 *  throttling us — callers should say "try again shortly", never "no books". */
export class BookSearchError extends Error {
  readonly status: number | null;
  constructor(status: number | null, message: string) {
    super(message);
    this.name = 'BookSearchError';
    this.status = status;
  }
  get rateLimited() { return this.status === 429; }
}

export function isBookSearchRateLimited(error: unknown): boolean {
  return error instanceof BookSearchError && error.rateLimited;
}

// Server-side lookup: the books-search Supabase Edge Function adds the
// Google Books API key (a Supabase secret, never shipped in the app). Until
// it's deployed and the key is set, it answers 404/503 and the app falls back
// to Google's keyless endpoint, which has a much lower shared quota.
let proxyUnavailable = false;

async function fetchVolumes(query: string): Promise<any> {
  const params = `q=${encodeURIComponent(query)}&maxResults=15`;
  let res: Response | null = null;

  if (!proxyUnavailable && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      res = await fetchWithTimeout(`${SUPABASE_URL}/functions/v1/books-search?${params}`, {
        headers: { apikey: SUPABASE_ANON_KEY },
      });
      if (res.status === 404 || res.status === 503) {
        proxyUnavailable = true; // not deployed / no key configured
        res = null;
      } else if (res.status >= 500) {
        res = null; // proxy hiccup — try Google directly this time
      }
    } catch {
      res = null; // proxy unreachable — try Google directly
    }
  }

  if (!res) {
    try {
      res = await fetchWithTimeout(`${GBOOKS}?${params}`);
    } catch (e) {
      throw new BookSearchError(null, `Google Books search failed: ${(e as Error).message}`);
    }
  }
  if (!res.ok) throw new BookSearchError(res.status, `Google Books search failed: ${res.status}`);
  return res.json();
}

/** Google Books' /volumes response gives each item a top-level `id` — the
 *  real, globally-unique volume id. A verified edition of a catalogued
 *  franchise book (lib/bookIdentity.ts) is returned under that book's one
 *  stable id instead, so every edition and every search order logs to the
 *  same diary row. Duplicate editions collapse to the first one. */
export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  const data = await fetchVolumes(query);
  const items = Array.isArray(data.items) ? data.items : [];
  const seen = new Set<string>();
  const results: BookSearchResult[] = [];
  for (const item of items) {
    const info = item?.volumeInfo;
    if (!item?.id || !info?.title) continue;
    const authors: string[] = Array.isArray(info.authors) ? info.authors : [];
    const id = canonicalBookRouteId(`book-${item.id}`, { title: info.title, subtitle: info.subtitle, authors });
    if (seen.has(id)) continue;
    seen.add(id);
    // A verified edition shows (and logs) under the book's own title and
    // first-publication year, not "… (a Hunger Games Novel) (eBook)", 2025.
    const catalogued = getFranchiseBookForRouteId(id);
    const year = info.publishedDate ? Number(String(info.publishedDate).slice(0, 4)) : undefined;
    results.push({
      id,
      title:     catalogued?.title ?? info.title,
      author:    authors[0] ?? null,
      year:      catalogued?.year ?? (Number.isNaN(year) ? undefined : year),
      posterUrl: resolveImageUrl(info.imageLinks?.thumbnail ?? null, 'poster'),
    });
  }
  return results;
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
    .from('public_profiles')
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
