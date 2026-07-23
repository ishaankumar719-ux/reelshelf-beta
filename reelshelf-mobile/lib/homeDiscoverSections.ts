// Real Home/Discover section data — every query here is a direct port of the
// website's actual app/page.tsx / app/discover/page.tsx logic (see
// WEBSITE_RECOMMENDATION_ENGINE_AUDIT.md for the "Because You Loved" section,
// handled separately in recommendationEngine.ts/becauseYouLoved.ts). Exact
// TMDB paths quoted from the real source, not guessed.
import { supabase } from './supabase/client';
import { resolveImageUrl } from './resolveImageUrl';
import {
  fetchTmdbCollectionByPath,
  type TmdbKind,
  type CollectionDiscoverItem,
} from './tmdb';

export type SectionMediaType = 'film' | 'tv' | 'book';

export interface SectionItem {
  id:          string; // route id
  title:       string;
  year:        number | undefined;
  posterUrl:   string | null;
  mediaType:   SectionMediaType;
  badge?:      string;
  releaseBadge?: string;
}

const TMDB_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

async function tmdbRaw(path: string): Promise<any[]> {
  if (!TMDB_KEY) return [];
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${TMDB_BASE}${path}${sep}api_key=${TMDB_KEY}&language=en-US`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.results) ? data.results : [];
}

function yearOf(dateStr: string | null | undefined): number | undefined {
  if (!dateStr) return undefined;
  const y = Number(String(dateStr).slice(0, 4));
  return Number.isNaN(y) ? undefined : y;
}

// ─── Trending Today — real: /trending/movie/day (6) + /trending/tv/day (6) +
// real community book-diary activity (7-day window, top 4), merged by a
// trend score, sliced to 12. Exact port of app/page.tsx's s1Movies/s1Tv/
// s1Books/trendingToday. ──────────────────────────────────────────────────
export async function fetchTrendingToday(): Promise<SectionItem[]> {
  const [movies, tv] = await Promise.all([
    tmdbRaw('/trending/movie/day'),
    tmdbRaw('/trending/tv/day'),
  ]);

  const s1Movies = movies.slice(0, 6).map((m) => ({
    id: `film-${m.id}`, title: m.title, year: yearOf(m.release_date),
    posterUrl: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
    mediaType: 'film' as const, trendScore: m.popularity as number,
  }));
  const s1Tv = tv.slice(0, 6).map((t) => ({
    id: `tv-${t.id}`, title: t.name, year: yearOf(t.first_air_date),
    posterUrl: t.poster_path ? `https://image.tmdb.org/t/p/w500${t.poster_path}` : null,
    mediaType: 'tv' as const, trendScore: t.popularity as number,
  }));

  let s1Books: (SectionItem & { trendScore: number })[] = [];
  const client = supabase;
  if (client) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const { data } = await client
      .from('diary_entries')
      .select('media_id, title, poster, media_type, watched_date')
      .eq('media_type', 'book')
      .gte('watched_date', sevenDaysAgo)
      .not('media_id', 'is', null);
    const counts = new Map<string, { count: number; title: string; poster: string | null }>();
    for (const row of data ?? []) {
      const id = row.media_id as string;
      const existing = counts.get(id);
      counts.set(id, { count: (existing?.count ?? 0) + 1, title: row.title as string, poster: row.poster as string | null });
    }
    s1Books = Array.from(counts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 4)
      .map(([id, v]) => ({
        id: id.startsWith('book-') ? id : `book-${id}`, title: v.title, year: undefined,
        posterUrl: resolveImageUrl(v.poster, 'poster'), mediaType: 'book' as const,
        trendScore: v.count * 150,
      }));
  }

  return [...s1Movies, ...s1Tv, ...s1Books]
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, 12)
    .map(({ trendScore: _t, ...item }) => item);
}

// ─── New in Cinemas — real: /movie/upcoming, filtered to has release_date +
// poster, sorted by release_date ascending, sliced to 10. Movie-only —
// exact port of app/page.tsx's newMovies. ────────────────────────────────
export async function fetchNewInCinemas(): Promise<SectionItem[]> {
  const results = await tmdbRaw('/movie/upcoming');
  const today = new Date().toISOString().slice(0, 10);
  return results
    .filter((m) => !!m.release_date && !!m.poster_path)
    .sort((a, b) => String(a.release_date).localeCompare(String(b.release_date)))
    .slice(0, 10)
    .map((m) => ({
      id: `film-${m.id}`, title: m.title, year: yearOf(m.release_date),
      posterUrl: `https://image.tmdb.org/t/p/w500${m.poster_path}`, mediaType: 'film' as const,
      releaseBadge: m.release_date > today ? formatReleaseBadge(m.release_date) : undefined,
    }));
}

function formatReleaseBadge(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return `Coming ${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`;
}

// ─── Trending TV — real: /trending/tv/week, sliced to 10. Exact port of
// app/page.tsx's trendingTvWeek. ─────────────────────────────────────────
export async function fetchTrendingTv(): Promise<SectionItem[]> {
  const items = await fetchTmdbCollectionByPath('/trending/tv/week', 'tv');
  return items.slice(0, 10).map(toSectionItem);
}

// ─── Trending Books — real website logic has no native "trending" signal
// for books (Google Books has none), so it counts real 30-day community
// diary activity, mapped against its static local book catalog for
// title/poster. Mobile has no local catalog — ADAPTED to read title/poster
// directly off the diary_entries rows themselves (already stored per entry),
// which is a strictly more accurate live equivalent, not a fallback. Padding
// behavior (website pads to 10 with extra catalog titles if fewer than 5
// trending) has no mobile equivalent without a local catalog — real trending
// items are shown as-is, possibly fewer than 10, rather than padded with
// unrelated titles. ───────────────────────────────────────────────────────
export async function fetchTrendingBooks(): Promise<SectionItem[]> {
  const client = supabase;
  if (!client) return [];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const { data } = await client
    .from('diary_entries')
    .select('media_id, title, poster, media_type, watched_date')
    .eq('media_type', 'book')
    .gte('watched_date', thirtyDaysAgo)
    .not('media_id', 'is', null);
  const counts = new Map<string, { count: number; title: string; poster: string | null }>();
  for (const row of data ?? []) {
    const id = row.media_id as string;
    const existing = counts.get(id);
    counts.set(id, { count: (existing?.count ?? 0) + 1, title: row.title as string, poster: row.poster as string | null });
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([id, v]) => ({
      id: id.startsWith('book-') ? id : `book-${id}`, title: v.title, year: undefined,
      posterUrl: resolveImageUrl(v.poster, 'poster'), mediaType: 'book' as const,
    }));
}

function toSectionItem(item: CollectionDiscoverItem): SectionItem {
  return { id: item.id, title: item.title, year: item.year, posterUrl: item.posterUrl, mediaType: item.mediaType };
}

// ─── Hidden Gems — real: /discover/movie (vote_average≥7.5, vote_count
// 100-5000, sort by vote_average desc) top 6 + /discover/tv (vote_average≥
// 7.5, vote_count 50-2000) top 6, combined, sliced to 10. Exact paths quoted
// from app/discover/page.tsx (Discover's copy, which adds the adult-content
// filter Home's doesn't — see fetchHiddenGems's excludeAdult param). ──────
const HIDDEN_GEMS_MOVIE_PATH = '/discover/movie?vote_average.gte=7.5&vote_count.gte=100&vote_count.lte=5000&sort_by=vote_average.desc&include_adult=false';
const HIDDEN_GEMS_TV_PATH = '/discover/tv?vote_average.gte=7.5&vote_count.gte=50&vote_count.lte=2000&sort_by=vote_average.desc&include_adult=false';

// Exact port of app/discover/page.tsx's ADULT_TITLE_TOKENS/isAdultContent —
// the one real, confirmed difference between Home and Discover (Discover
// applies this to Hidden Gems; Home's copy of the same query doesn't).
const ADULT_TITLE_TOKENS = new Set([
  'nude', 'naked', 'porn', 'porno', 'pornographic',
  'xxx', 'erotic', 'erotica', 'hentai', 'softcore', 'nsfw',
]);

function isAdultTitle(title: string): boolean {
  const tokens = title.toLowerCase().split(/[\s\-–—_:,!?.()[\]/]+/).filter(Boolean);
  return tokens.some((t) => ADULT_TITLE_TOKENS.has(t));
}

export async function fetchHiddenGems(excludeAdult = false): Promise<SectionItem[]> {
  const [movies, tv] = await Promise.all([
    fetchTmdbCollectionByPath(HIDDEN_GEMS_MOVIE_PATH, 'movie'),
    fetchTmdbCollectionByPath(HIDDEN_GEMS_TV_PATH, 'tv'),
  ]);
  const filterAdult = (list: CollectionDiscoverItem[]) => excludeAdult ? list.filter((r) => !isAdultTitle(r.title)) : list;
  return [
    ...filterAdult(movies).slice(0, 6).map((m) => ({ ...toSectionItem(m), badge: 'Hidden Gem 💎' })),
    ...filterAdult(tv).slice(0, 6).map((t) => ({ ...toSectionItem(t), badge: 'Hidden Gem 💎' })),
  ].slice(0, 10);
}

// ─── Award Winners — real: /discover/movie (vote_average≥8.0, vote_count≥
// 1000, sort by popularity desc) top 6 + /discover/tv (vote_average≥8.0,
// vote_count≥300) top 6, combined, sliced to 10. NOT a curated static list —
// confirmed via direct read of app/page.tsx: a live TMDB discover query.
// Mobile's previous AwardWinnersCarousel used a static seed list; replaced. ─
const AWARD_MOVIE_PATH = '/discover/movie?vote_average.gte=8.0&vote_count.gte=1000&sort_by=popularity.desc&include_adult=false';
const AWARD_TV_PATH = '/discover/tv?vote_average.gte=8.0&vote_count.gte=300&sort_by=popularity.desc&include_adult=false';

export async function fetchAwardWinners(): Promise<SectionItem[]> {
  const [movies, tv] = await Promise.all([
    fetchTmdbCollectionByPath(AWARD_MOVIE_PATH, 'movie'),
    fetchTmdbCollectionByPath(AWARD_TV_PATH, 'tv'),
  ]);
  return [
    ...movies.slice(0, 6).map((m) => ({ ...toSectionItem(m), badge: 'Award Winner 🏆' })),
    ...tv.slice(0, 6).map((t) => ({ ...toSectionItem(t), badge: 'Award Winner 🏆' })),
  ].slice(0, 10);
}

// ─── Pick Something Random — real: app/api/discover/random/route.ts.
// Movie/TV: random page (1-5) of /discover/{kind}?sort_by=popularity.desc&
// vote_count.gte=500(movie)/200(tv)&include_adult=false, then a random
// result from that page, excluding the last pick. Book: mobile has no local
// book catalog to pick from — adapted to the same rotating Google Books
// query pool the ported Daily Reel engine already uses
// (recommendationEngine.ts's BOOK_QUERY_ROTATION), picking a random result
// from today's rotation query instead of a random result from a fixed local
// list. Real website behavior preserved: navigates directly to the result,
// no inline preview. ──────────────────────────────────────────────────────
export async function fetchRandomPick(
  kind: SectionMediaType,
  excludeId: string | null,
): Promise<SectionItem | null> {
  if (kind === 'book') {
    const query = 'bestselling fiction';
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20&orderBy=relevance`);
    if (!res.ok) return null;
    const data = await res.json();
    const items = (Array.isArray(data.items) ? data.items : []).filter((it: any) => it.id && it.volumeInfo?.title && `book-${it.id}` !== excludeId);
    if (items.length === 0) return null;
    const pick = items[Math.floor(Math.random() * items.length)];
    return {
      id: `book-${pick.id}`, title: pick.volumeInfo.title, year: yearOf(pick.volumeInfo.publishedDate),
      posterUrl: resolveImageUrl(pick.volumeInfo.imageLinks?.thumbnail ?? null, 'poster'), mediaType: 'book',
    };
  }

  const path = kind === 'film'
    ? '/discover/movie?sort_by=popularity.desc&vote_count.gte=500&include_adult=false'
    : '/discover/tv?sort_by=popularity.desc&vote_count.gte=200&include_adult=false';
  const page = Math.ceil(Math.random() * 5);
  const results = await tmdbRaw(`${path}&page=${page}`);
  const eligible = results.filter((r) => !!r.poster_path && `${kind === 'film' ? 'film' : 'tv'}-${r.id}` !== excludeId);
  if (eligible.length === 0) return null;
  const pick = eligible[Math.floor(Math.random() * eligible.length)];
  return {
    id: `${kind === 'film' ? 'film' : 'tv'}-${pick.id}`,
    title: kind === 'film' ? pick.title : pick.name,
    year: yearOf(kind === 'film' ? pick.release_date : pick.first_air_date),
    posterUrl: `https://image.tmdb.org/t/p/w500${pick.poster_path}`,
    mediaType: kind,
  };
}

export type { TmdbKind };
