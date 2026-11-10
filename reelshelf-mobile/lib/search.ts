// Universal Search — non-TMDB data sources: Google Books (via the
// books-search Edge Function when deployed, else the public endpoint), and Supabase
// (collections, user_lists, profiles) — all respecting existing RLS, no new
// policies.
import { canonicalBookRouteId, getFranchiseBookForRouteId } from './bookIdentity';
import { fetchWithTimeout } from './fetchWithTimeout';
import { resolveImageUrl } from './resolveImageUrl';
import { supabase } from './supabase/client';
import { searchCollections as searchCollectionsReal, type CollectionCardData } from './supabase/collections';
import { localBooks } from '@/data/localBooks';

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

type OfflineBook = Omit<BookSearchResult, 'id'> & {
  slug: string;
  searchTerms?: string[];
};

const openLibraryCover = (isbn: string) => `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

// Google Books is a convenience, not a reason for Books search to go blank.
// These are the fan-canon titles that power our first hidden-moment rollout.
const OFFLINE_CULT_BOOKS: OfflineBook[] = [
  { slug: 'the-hunger-games', title: 'The Hunger Games', author: 'Suzanne Collins', year: 2008, posterUrl: openLibraryCover('9780439023481'), searchTerms: ['hunger games'] },
  { slug: 'catching-fire', title: 'Catching Fire', author: 'Suzanne Collins', year: 2009, posterUrl: openLibraryCover('9780439023498'), searchTerms: ['hunger games'] },
  { slug: 'mockingjay', title: 'Mockingjay', author: 'Suzanne Collins', year: 2010, posterUrl: openLibraryCover('9780439023511'), searchTerms: ['hunger games'] },
  { slug: 'the-ballad-of-songbirds-and-snakes', title: 'The Ballad of Songbirds and Snakes', author: 'Suzanne Collins', year: 2020, posterUrl: openLibraryCover('9781338635171'), searchTerms: ['hunger games'] },
  { slug: 'harry-potter-philosophers-stone', title: "Harry Potter and the Philosopher's Stone", author: 'J. K. Rowling', year: 1997, posterUrl: openLibraryCover('9780747532699'), searchTerms: ['harry potter'] },
  { slug: 'harry-potter-chamber-secrets', title: 'Harry Potter and the Chamber of Secrets', author: 'J. K. Rowling', year: 1998, posterUrl: openLibraryCover('9780747538493'), searchTerms: ['harry potter'] },
  { slug: 'harry-potter-prisoner-azkaban', title: 'Harry Potter and the Prisoner of Azkaban', author: 'J. K. Rowling', year: 1999, posterUrl: openLibraryCover('9780747546290'), searchTerms: ['harry potter'] },
  { slug: 'harry-potter-goblet-fire', title: 'Harry Potter and the Goblet of Fire', author: 'J. K. Rowling', year: 2000, posterUrl: openLibraryCover('9780747546245'), searchTerms: ['harry potter'] },
  { slug: 'harry-potter-order-phoenix', title: 'Harry Potter and the Order of the Phoenix', author: 'J. K. Rowling', year: 2003, posterUrl: openLibraryCover('9780747551003'), searchTerms: ['harry potter'] },
  { slug: 'harry-potter-half-blood-prince', title: 'Harry Potter and the Half-Blood Prince', author: 'J. K. Rowling', year: 2005, posterUrl: openLibraryCover('9780747581086'), searchTerms: ['harry potter'] },
  { slug: 'harry-potter-deathly-hallows', title: 'Harry Potter and the Deathly Hallows', author: 'J. K. Rowling', year: 2007, posterUrl: openLibraryCover('9780545010221'), searchTerms: ['harry potter'] },
  { slug: 'the-fellowship-of-the-ring', title: 'The Fellowship of the Ring', author: 'J. R. R. Tolkien', year: 1954, posterUrl: openLibraryCover('9780261103573'), searchTerms: ['lord of the rings', 'lotr'] },
  { slug: 'the-two-towers', title: 'The Two Towers', author: 'J. R. R. Tolkien', year: 1954, posterUrl: openLibraryCover('9780261102361'), searchTerms: ['lord of the rings', 'lotr'] },
  { slug: 'the-return-of-the-king', title: 'The Return of the King', author: 'J. R. R. Tolkien', year: 1955, posterUrl: openLibraryCover('9780261102378'), searchTerms: ['lord of the rings', 'lotr'] },
  { slug: 'the-hobbit', title: 'The Hobbit', author: 'J. R. R. Tolkien', year: 1937, posterUrl: openLibraryCover('9780261103283'), searchTerms: ['lord of the rings', 'lotr'] },
  { slug: 'a-game-of-thrones', title: 'A Game of Thrones', author: 'George R. R. Martin', year: 1996, posterUrl: openLibraryCover('9780553103540'), searchTerms: ['game of thrones', 'a song of ice and fire'] },
  { slug: 'a-clash-of-kings', title: 'A Clash of Kings', author: 'George R. R. Martin', year: 1998, posterUrl: openLibraryCover('9780553108033'), searchTerms: ['game of thrones', 'a song of ice and fire'] },
  { slug: 'a-storm-of-swords', title: 'A Storm of Swords', author: 'George R. R. Martin', year: 2000, posterUrl: openLibraryCover('9780553106633'), searchTerms: ['game of thrones', 'a song of ice and fire'] },
  { slug: 'fourth-wing', title: 'Fourth Wing', author: 'Rebecca Yarros', year: 2023, posterUrl: openLibraryCover('9781649374042'), searchTerms: ['the empyrean'] },
  { slug: 'iron-flame', title: 'Iron Flame', author: 'Rebecca Yarros', year: 2023, posterUrl: openLibraryCover('9781649374172'), searchTerms: ['the empyrean'] },
  { slug: 'the-lightning-thief', title: 'The Lightning Thief', author: 'Rick Riordan', year: 2005, posterUrl: openLibraryCover('9780786856299'), searchTerms: ['percy jackson'] },
  { slug: 'the-sea-of-monsters', title: 'The Sea of Monsters', author: 'Rick Riordan', year: 2006, posterUrl: openLibraryCover('9780786856862'), searchTerms: ['percy jackson'] },
  { slug: 'the-titans-curse', title: "The Titan's Curse", author: 'Rick Riordan', year: 2007, posterUrl: openLibraryCover('9781423101451'), searchTerms: ['percy jackson'] },
  { slug: 'twilight', title: 'Twilight', author: 'Stephenie Meyer', year: 2005, posterUrl: openLibraryCover('9780316015844'), searchTerms: ['twilight saga'] },
  { slug: 'new-moon', title: 'New Moon', author: 'Stephenie Meyer', year: 2006, posterUrl: openLibraryCover('9780316024969'), searchTerms: ['twilight saga'] },
  { slug: 'eclipse', title: 'Eclipse', author: 'Stephenie Meyer', year: 2007, posterUrl: openLibraryCover('9780316027656'), searchTerms: ['twilight saga'] },
  { slug: 'breaking-dawn', title: 'Breaking Dawn', author: 'Stephenie Meyer', year: 2008, posterUrl: openLibraryCover('9780316067928'), searchTerms: ['twilight saga'] },
  { slug: 'coraline', title: 'Coraline', author: 'Neil Gaiman', year: 2002, posterUrl: openLibraryCover('9780061139376') },
  { slug: 'the-shining', title: 'The Shining', author: 'Stephen King', year: 1977, posterUrl: openLibraryCover('9780307743657') },
  { slug: 'the-handmaids-tale', title: "The Handmaid's Tale", author: 'Margaret Atwood', year: 1985, posterUrl: openLibraryCover('9780385490818') },
  { slug: 'the-song-of-achilles', title: 'The Song of Achilles', author: 'Madeline Miller', year: 2011, posterUrl: openLibraryCover('9780062060624') },
  { slug: 'circe', title: 'Circe', author: 'Madeline Miller', year: 2018, posterUrl: openLibraryCover('9780316556347') },
];

function normalized(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function searchOfflineBooks(query: string): BookSearchResult[] {
  const needle = normalized(query);
  const local: OfflineBook[] = localBooks.map((book) => ({
    slug: book.id,
    title: book.title,
    author: book.author,
    year: Number(book.year),
    posterUrl: book.cover,
  }));

  return [...OFFLINE_CULT_BOOKS, ...local]
    .filter((book) => normalized(`${book.title} ${book.author ?? ''} ${book.searchTerms?.join(' ') ?? ''}`).includes(needle))
    .map(({ slug, searchTerms: _terms, ...book }) => {
      // The four Hunger Games novels here resolve to the same stable id as
      // the hub and verified Google editions (lib/bookIdentity.ts), not a
      // third "book-local-…" id of their own.
      const id = canonicalBookRouteId(`book-local-${slug}`, { title: book.title, authors: book.author ? [book.author] : [] });
      const catalogued = getFranchiseBookForRouteId(id);
      return { ...book, id, title: catalogued?.title ?? book.title };
    });
}

/** Google Books' /volumes response gives each item a top-level `id` — the
 *  real, globally-unique volume id. A verified edition of a catalogued
 *  franchise book (lib/bookIdentity.ts) is returned under that book's one
 *  stable id instead, so every edition and every search order logs to the
 *  same diary row. Duplicate editions collapse to the first one. */
export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  // Fan-favourite titles we always have, so Books search never goes blank
  // when Google Books is slow, throttled or empty (build-21 behaviour).
  const fallback = searchOfflineBooks(query);

  let data: any;
  try {
    data = await fetchVolumes(query);
  } catch (e) {
    // Built-in matches cover the gap; with none, surface the error so a 429
    // reads "busy, try again" rather than "no books found".
    if (fallback.length > 0) return fallback;
    throw e;
  }

  const items = Array.isArray(data.items) ? data.items : [];
  const seen = new Set<string>(fallback.map((book) => book.id));
  const fallbackTitles = new Set(fallback.map((book) => normalized(book.title)));
  const results: BookSearchResult[] = [];
  for (const item of items) {
    const info = item?.volumeInfo;
    if (!item?.id || !info?.title) continue;
    const authors: string[] = Array.isArray(info.authors) ? info.authors : [];
    const id = canonicalBookRouteId(`book-${item.id}`, { title: info.title, subtitle: info.subtitle, authors });
    // One result per book: editions of a catalogued book share its id, and a
    // Google listing with a built-in title defers to the built-in entry.
    if (seen.has(id) || fallbackTitles.has(normalized(info.title))) continue;
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
  return [...fallback, ...results].slice(0, 15);
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
