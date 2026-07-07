/**
 * DEV TOOL ONLY — run once to regenerate static seed data:
 *   cd reelshelf-mobile && npx tsx scripts/generate-seed-data.ts
 *
 * Output: data/seedHomeContent.ts (committed, read-only at runtime)
 * This script is NOT imported or executed by the running app.
 * Reads EXPO_PUBLIC_TMDB_API_KEY from .env (see .env.example).
 * Google Books API requires no key for basic searches.
 */

import * as fs   from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '..', '.env') });

const TMDB_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
if (!TMDB_KEY) {
  console.error('❌  EXPO_PUBLIC_TMDB_API_KEY not found in .env');
  process.exit(1);
}

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG  = 'https://image.tmdb.org/t/p/w342';
const GBOOKS    = 'https://www.googleapis.com/books/v1/volumes';

// ── Types (mirrors seedHomeContent.ts shape) ──────────────────────────────────
type MediaType = 'film' | 'tv' | 'book';

interface SeedCardItem {
  id:        string;
  title:     string;
  year:      number;
  mediaType: MediaType;
  posterUrl: string | null;
}

interface SeedContinueItem extends SeedCardItem {
  progress: number;
  subtitle: string;
}

interface SeedCollectionItem {
  id:       string;
  title:    string;
  subtitle: string;
  coverUrl: string | null;
}

// ── Fetchers ─────────────────────────────────────────────────────────────────

async function movie(tmdbId: number): Promise<SeedCardItem> {
  const r = await fetch(`${TMDB_BASE}/movie/${tmdbId}?api_key=${TMDB_KEY}`);
  const d = await r.json() as Record<string, unknown>;
  const year = d.release_date
    ? parseInt((d.release_date as string).slice(0, 4))
    : 0;
  return {
    id:        `film-${tmdbId}`,
    title:     d.title as string,
    year,
    mediaType: 'film',
    posterUrl: d.poster_path ? `${TMDB_IMG}${d.poster_path as string}` : null,
  };
}

async function show(tmdbId: number): Promise<SeedCardItem> {
  const r = await fetch(`${TMDB_BASE}/tv/${tmdbId}?api_key=${TMDB_KEY}`);
  const d = await r.json() as Record<string, unknown>;
  const year = d.first_air_date
    ? parseInt((d.first_air_date as string).slice(0, 4))
    : 0;
  return {
    id:        `tv-${tmdbId}`,
    title:     d.name as string,
    year,
    mediaType: 'tv',
    posterUrl: d.poster_path ? `${TMDB_IMG}${d.poster_path as string}` : null,
  };
}

async function book(
  titleQuery: string,
  authorQuery: string,
  fallbackYear: number,
): Promise<SeedCardItem> {
  const q = encodeURIComponent(`intitle:${titleQuery} inauthor:${authorQuery}`);
  const r = await fetch(`${GBOOKS}?q=${q}&maxResults=1`);
  const d = await r.json() as Record<string, unknown>;
  const items = (d.items as Record<string, unknown>[] | undefined) ?? [];
  if (!items.length) {
    return {
      id:        `book-${titleQuery.toLowerCase().replace(/\s+/g, '-')}`,
      title:     titleQuery,
      year:      fallbackYear,
      mediaType: 'book',
      posterUrl: null,
    };
  }
  const item = items[0];
  const volId = item.id as string;
  const info  = (item.volumeInfo as Record<string, unknown>) ?? {};
  const links = info.imageLinks as Record<string, string> | undefined;
  // Prefer thumbnail; upgrade zoom for a larger image
  let cover   = links?.thumbnail ?? links?.smallThumbnail ?? null;
  if (cover) cover = cover.replace('http:', 'https:').replace('zoom=1', 'zoom=2');

  return {
    id:        `book-${volId}`,
    title:     (info.title as string | undefined) ?? titleQuery,
    year:      parseInt(((info.publishedDate as string | undefined) ?? String(fallbackYear)).slice(0, 4)),
    mediaType: 'book',
    posterUrl: cover,
  };
}

// ── Curated titles — non-adult, well-known, with real TMDB IDs ───────────────

async function main() {
  console.log('Fetching from TMDB…');

  const [
    oppenheimer,
    theBear,
    dune_book,
    inception,
    dunePt2,
    shogun,
    parasite,
    poorThings,
    eeaao,
    succession,
    laLaLand,
    whiplash,
    ouatih,
    birdman,
    fabelmans,
    pachinko_book,
    mulholland,
  ] = await Promise.all([
    // Featured (3 — one per type)
    movie(872585),                               // Oppenheimer (2023)
    show(136315),                                // The Bear
    book('Dune', 'Frank Herbert', 1965),

    // Trending Today (7)
    movie(27205),                                // Inception
    movie(693134),                               // Dune: Part Two
    show(126308),                                // Shōgun (FX 2024)
    movie(496243),                               // Parasite
    movie(792307),                               // Poor Things
    movie(545611),                               // Everything Everywhere All at Once
    show(76331),                                 // Succession

    // Because You Loved Babylon (epic ambition / Hollywood stories)
    movie(313369),                               // La La Land
    movie(244786),                               // Whiplash
    movie(466272),                               // Once Upon a Time... in Hollywood
    movie(194662),                               // Birdman
    movie(804095),                               // The Fabelmans
    book('Pachinko', 'Min Jin Lee', 2017),
    movie(1018),                                 // Mulholland Drive
  ]);

  // Featured: pick one of each type
  const featuredCards: SeedCardItem[] = [oppenheimer, theBear, dune_book];

  const trendingToday: SeedCardItem[] = [
    inception, dunePt2, shogun, parasite, poorThings, eeaao, succession,
  ];

  // Continue Watching — static example; The Bear season 3
  const continueWatching: SeedContinueItem = {
    ...theBear,
    id:       'continue-the-bear-s3',
    progress:  0.55,
    subtitle:  'Season 3 · Episode 1',
  };

  const becauseYouLoved: SeedCardItem[] = [
    laLaLand, whiplash, ouatih, birdman, fabelmans, pachinko_book, mulholland,
  ];

  // Collections — use real posters from titles already fetched
  const collections: SeedCollectionItem[] = [
    {
      id:       'c-a24',
      title:    'Best A24 Films',
      subtitle: 'Fearless cinema from A24.',
      coverUrl: poorThings.posterUrl,     // Poor Things is A24
    },
    {
      id:       'c-mindbend',
      title:    'Mind-Bending Stories',
      subtitle: 'Reality is just a suggestion.',
      coverUrl: inception.posterUrl,
    },
    {
      id:       'c-sunday',
      title:    'Perfect Sunday Stories',
      subtitle: 'Slow, warm, unmissable.',
      coverUrl: eeaao.posterUrl,
    },
  ];

  // ── Write output ───────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const out = `// SEED DATA — generated by scripts/generate-seed-data.ts on ${today}.
// Real titles sourced from TMDB (image.tmdb.org) and Google Books APIs.
// Replace with live Supabase/TMDB/Google Books calls in Phase 4.
// Do NOT edit manually — re-run the script to refresh.
//
// TMDB attribution: "This app uses the TMDB API but is not endorsed or certified by TMDB."
// Poster images © The Movie Database (TMDB). Google Books data © Google LLC.

export type MediaType = 'film' | 'tv' | 'book';

/** Card data shape — mirrors what Phase 4 live API calls will return. */
export interface SeedCardItem {
  id:        string;
  title:     string;
  year:      number;
  mediaType: MediaType;
  /** TMDB CDN URL (image.tmdb.org/t/p/w342) or Google Books thumbnail. null = show fallback. */
  posterUrl: string | null;
}

export interface SeedContinueItem extends SeedCardItem {
  /** 0–1 viewing/reading progress */
  progress: number;
  subtitle: string;
}

export interface SeedCollectionItem {
  id:       string;
  title:    string;
  subtitle: string;
  coverUrl: string | null;
}

// ── Featured (one per media type) ────────────────────────────────────────────
export const featuredCards: SeedCardItem[] = ${JSON.stringify(featuredCards, null, 2)};

// ── Trending Today ────────────────────────────────────────────────────────────
export const trendingToday: SeedCardItem[] = ${JSON.stringify(trendingToday, null, 2)};

// ── Continue Watching (static example — replace with user state in Phase 4) ──
export const continueWatching: SeedContinueItem = ${JSON.stringify(continueWatching, null, 2)};

// ── Because You Loved (static example anchored to "Babylon") ─────────────────
// Anchor title and list become personalized in Phase 4.
export const becauseYouLoved: SeedCardItem[] = ${JSON.stringify(becauseYouLoved, null, 2)};

// ── Collections ───────────────────────────────────────────────────────────────
export const collections: SeedCollectionItem[] = ${JSON.stringify(collections, null, 2)};
`;

  const outPath = path.join(__dirname, '..', 'data', 'seedHomeContent.ts');
  fs.writeFileSync(outPath, out, 'utf8');
  console.log(`✅  Written → ${path.relative(process.cwd(), outPath)}`);
  console.log('Titles fetched:');
  [...featuredCards, ...trendingToday, ...becauseYouLoved]
    .forEach(c => console.log(`  ${c.mediaType.padEnd(4)} ${c.year}  ${c.title}`));
}

main().catch(e => { console.error(e); process.exit(1); });
