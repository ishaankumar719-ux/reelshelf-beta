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
import { Vibrant } from 'node-vibrant/node';

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
  id:              string;
  title:           string;
  year:            number;
  mediaType:       MediaType;
  posterUrl:       string | null;
  dominantColors?: string[];
}

interface SeedFeaturedItem extends SeedCardItem {
  reason: string;
}

interface SeedContinueItem extends SeedCardItem {
  progress: number;
  subtitle: string;
}

interface SeedDailyReelItem extends SeedCardItem {
  description: string;
  reason: string;
}

interface SeedBookItem extends SeedCardItem {
  author: string;
  description: string;
}

interface SeedCollectionItem {
  id:          string;
  title:       string;
  description: string;
  storyCount:  number;
  items:       SeedCardItem[];
}

// ── Color extraction (atmosphere only — never bundled into the app) ───────────

function darkenHex(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (luminance > 0.25) {
    const f = 0.55;
    const nr = Math.floor(r * f);
    const ng = Math.floor(g * f);
    const nb = Math.floor(b * f);
    return `#${nr.toString(16).padStart(2,'0')}${ng.toString(16).padStart(2,'0')}${nb.toString(16).padStart(2,'0')}`;
  }
  return hex;
}

async function extractDominantColors(posterUrl: string | null): Promise<string[]> {
  if (!posterUrl) return [];
  try {
    const palette = await new Vibrant(posterUrl, { colorCount: 64 }).getPalette();
    const swatches = [
      palette.DarkVibrant,
      palette.DarkMuted,
      palette.Muted,
      palette.Vibrant,
    ].filter((s): s is NonNullable<typeof s> => s !== null && s !== undefined);
    return swatches.slice(0, 3).map(s => darkenHex(s.hex));
  } catch {
    console.warn(`  ⚠ Color extraction failed for ${posterUrl}`);
    return [];
  }
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

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

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Fetching from TMDB & Google Books…');

  // ── Batch-fetch everything in parallel ──────────────────────────────────────
  const [
    // Core items (existing)
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
    // BYL: Dune extras
    arrival,
    bladeRunner2049,
    odyssey2001,
    // BYL: The Bear extras
    theMenu,
    // Collections: Best A24 Films
    hereditary,
    midsommar,
    // Collections: Under 90 Minutes
    runLolaRun,
    moonlight,
    getOut,
    // Collections: Mind-Bending Stories
    fightClub,
    // Collections: True Crime Essentials
    zodiac,
    prisoners,
    spotlight,
    knivesOut,
    // Collections: Space Adventures
    interstellar,
    theMartian,
    gravity,
    contact,
    // Collections: Perfect Sunday Stories
    marriageStory,
    her,
    nomadland,
  ] = await Promise.all([
    // ── Core (17 existing) ────────────────────────────────────────────────────
    movie(872585),                               // Oppenheimer (2023)
    show(136315),                                // The Bear
    book('Dune', 'Frank Herbert', 1965),
    movie(27205),                                // Inception
    movie(693134),                               // Dune: Part Two
    show(126308),                                // Shōgun (FX 2024)
    movie(496243),                               // Parasite
    movie(792307),                               // Poor Things (A24)
    movie(545611),                               // Everything Everywhere All at Once (A24)
    show(76331),                                 // Succession
    movie(313369),                               // La La Land
    movie(244786),                               // Whiplash
    movie(466272),                               // Once Upon a Time... in Hollywood
    movie(194662),                               // Birdman
    movie(804095),                               // The Fabelmans
    book('Pachinko', 'Min Jin Lee', 2017),
    movie(1018),                                 // Mulholland Drive
    // ── BYL: Dune extras (3) ─────────────────────────────────────────────────
    movie(329865),                               // Arrival
    movie(335984),                               // Blade Runner 2049
    movie(62),                                   // 2001: A Space Odyssey
    // ── BYL: The Bear extras (1) ─────────────────────────────────────────────
    movie(593643),                               // The Menu
    // ── Collections: Best A24 Films (2 new — poorThings + eeaao reused) ──────
    movie(493922),                               // Hereditary (A24)
    movie(530385),                               // Midsommar (A24)
    // ── Collections: Under 90 Minutes (3 new — whiplash reused) ─────────────
    movie(5765),                                 // Run Lola Run
    movie(376867),                               // Moonlight (A24)
    movie(419430),                               // Get Out
    // ── Collections: Mind-Bending (1 new — inception + arrival + BR2049 reused)
    movie(550),                                  // Fight Club
    // ── Collections: True Crime Essentials (4 new) ───────────────────────────
    movie(929),                                  // Zodiac
    movie(146233),                               // Prisoners
    movie(314365),                               // Spotlight
    movie(546554),                               // Knives Out
    // ── Collections: Space Adventures (4 new) ────────────────────────────────
    movie(157336),                               // Interstellar
    movie(286217),                               // The Martian
    movie(80537),                                // Gravity
    movie(36557),                                // Contact
    // ── Collections: Perfect Sunday Stories (3 new — moonlight reused) ───────
    movie(492188),                               // Marriage Story
    movie(152601),                               // Her
    movie(752623),                               // Nomadland
  ]);

  // ── Extract dominant colors for atmosphere items ───────────────────────────
  console.log('Extracting dominant colors for atmosphere (Daily Reel + Collection of Week)…');
  const [
    oppenheimerColors,
    poorThingsColors,
    eeaaoColors,
    hereditaryColors,
    midsommarColors,
  ] = await Promise.all([
    extractDominantColors(oppenheimer.posterUrl),
    extractDominantColors(poorThings.posterUrl),
    extractDominantColors(eeaao.posterUrl),
    extractDominantColors(hereditary.posterUrl),
    extractDominantColors(midsommar.posterUrl),
  ]);

  // Attach colors to the items that need them
  const poorThingsC  = { ...poorThings,  dominantColors: poorThingsColors  };
  const eeaaoC       = { ...eeaao,       dominantColors: eeaaoColors       };
  const hereditaryC  = { ...hereditary,  dominantColors: hereditaryColors  };
  const midsommarC   = { ...midsommar,   dominantColors: midsommarColors   };

  // ── Build all exports ──────────────────────────────────────────────────────

  // Featured Today (backward-compat)
  const featuredItem: SeedFeaturedItem = {
    ...oppenheimer,
    reason: "Nolan's three-hour reckoning with conscience and consequence — the kind of film that leaves you sitting in silence after the credits roll.",
  };

  const featuredCards: SeedCardItem[] = [oppenheimer, theBear, dune_book];

  const trendingToday: SeedCardItem[] = [
    inception, dunePt2, shogun, parasite, poorThings, eeaao, succession,
  ];

  const continueWatching: SeedContinueItem = {
    ...theBear,
    id:       'continue-the-bear-s3',
    progress:  0.55,
    subtitle:  'Season 3 · Episode 1',
  };

  const becauseYouLoved: SeedCardItem[] = [
    laLaLand, whiplash, ouatih, birdman, fabelmans, pachinko_book, mulholland,
  ];

  // Daily Reel pick (editorial copy hardcoded — not from API)
  const dailyReelPick: SeedDailyReelItem = {
    ...oppenheimer,
    id:             'film-872585',
    description:    'Christopher Nolan reconstructs the invention of the atomic bomb with three-hour precision — intercutting past, present, and moral reckoning in a way only cinema can.',
    reason:         'A film that gets heavier the longer you sit with it.',
    dominantColors: oppenheimerColors,
  };

  // BYL: Babylon (alias)
  const bylBabylon: SeedCardItem[] = becauseYouLoved;

  // BYL: Dune
  const bylDune: SeedCardItem[] = [
    dunePt2, arrival, bladeRunner2049, inception, odyssey2001,
  ];

  // BYL: The Bear
  const bylTheBear: SeedCardItem[] = [
    theBear, succession, whiplash, birdman, theMenu,
  ];

  // Book of the Week (editorial copy hardcoded — not from Google Books)
  const bookOfTheWeek: SeedBookItem = {
    id:          'book-tomorrow-and-tomorrow',
    title:       'Tomorrow, and Tomorrow, and Tomorrow',
    year:         2022,
    mediaType:   'book',
    posterUrl:   null,
    author:      'Gabrielle Zevin',
    description: 'Two friends spend thirty years building video games together — a novel about creation, obsession, and the invisible grammar of a long collaboration.',
  };

  // 6 Collections — items[] carries full navigation metadata per poster
  const collections: SeedCollectionItem[] = [
    {
      id:          'c-a24',
      title:       'Best A24 Films',
      description: 'Fearless cinema from A24.',
      storyCount:  24,
      items:       [poorThingsC, eeaaoC, hereditaryC, midsommarC],
    },
    {
      id:          'c-under90',
      title:       'Under 90 Minutes',
      description: 'Great stories that don\'t overstay their welcome.',
      storyCount:  36,
      items:       [runLolaRun, whiplash, moonlight, getOut],
    },
    {
      id:          'c-mindbend',
      title:       'Mind-Bending Stories',
      description: 'Films that warp reality and linger long after the credits.',
      storyCount:  20,
      items:       [inception, arrival, bladeRunner2049, fightClub],
    },
    {
      id:          'c-truecrime',
      title:       'True Crime Essentials',
      description: 'Investigations that won\'t let you go.',
      storyCount:  18,
      items:       [zodiac, prisoners, spotlight, knivesOut],
    },
    {
      id:          'c-space',
      title:       'Space Adventures',
      description: 'Odysseys beyond the known — wormholes, alien worlds, the deep unknown.',
      storyCount:  15,
      items:       [interstellar, theMartian, gravity, contact],
    },
    {
      id:          'c-sunday',
      title:       'Perfect Sunday Stories',
      description: 'Slow, warm, unmissable.',
      storyCount:  29,
      items:       [marriageStory, moonlight, her, nomadland],
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
  /** 2-3 dominant dark hex colors extracted from posterUrl by generate-seed-data.ts.
   *  Set only for atmosphere-relevant items (Daily Reel + Collection of the Week deck).
   *  Never computed at runtime — always static. */
  dominantColors?: string[];
}

/** Single dominant featured recommendation — extends SeedCardItem with editorial reason copy. */
export interface SeedFeaturedItem extends SeedCardItem {
  /** One editorial sentence explaining why this is recommended right now. Static for Phase 5. */
  reason: string;
}

export interface SeedContinueItem extends SeedCardItem {
  /** 0–1 viewing/reading progress */
  progress: number;
  subtitle: string;
}

/** Daily Reel pick — the signature recommendation; supersedes FeaturedToday. */
export interface SeedDailyReelItem extends SeedCardItem {
  /** Editorial body copy about the pick (1–2 sentences). */
  description: string;
  /** One-line "why ReelShelf picked this" tagline. */
  reason: string;
}

/** Book of the Week — book card with author and editorial description. */
export interface SeedBookItem extends SeedCardItem {
  author: string;
  /** Editorial body copy about the book (1–2 sentences). */
  description: string;
}

export interface SeedCollectionItem {
  id:          string;
  title:       string;
  /** Short editorial description (one line). */
  description: string;
  /** Representative story count for the full collection — editorial, not an exact count. */
  storyCount:  number;
  /** 3-4 preview items with poster + navigation metadata. null posterUrl shows a fallback tile. */
  items:       SeedCardItem[];
}

// ── Featured Today (backward-compat) ─────────────────────────────────────────
export const featuredItem: SeedFeaturedItem = ${JSON.stringify(featuredItem, null, 2)};

// ── Featured (kept for backward-compat — no longer rendered as a 3-card carousel) ──
export const featuredCards: SeedCardItem[] = ${JSON.stringify(featuredCards, null, 2)};

// ── Trending Today ────────────────────────────────────────────────────────────
export const trendingToday: SeedCardItem[] = ${JSON.stringify(trendingToday, null, 2)};

// ── Continue Watching (static example — replace with user state in Phase 4) ──
export const continueWatching: SeedContinueItem = ${JSON.stringify(continueWatching, null, 2)};

// ── Because You Loved (static example anchored to "Babylon") ─────────────────
// Anchor title and list become personalized in Phase 4.
export const becauseYouLoved: SeedCardItem[] = ${JSON.stringify(becauseYouLoved, null, 2)};

// ── Sprint 3: additional interfaces and section data ─────────────────────────

export const dailyReelPick: SeedDailyReelItem = ${JSON.stringify(dailyReelPick, null, 2)};

// ── Because You Loved: Babylon (naming alias for existing BYL group) ──────────
export const bylBabylon: SeedCardItem[] = becauseYouLoved;

// ── Because You Loved: Dune (epic worlds, slow-burn world-building) ───────────
export const bylDune: SeedCardItem[] = ${JSON.stringify(bylDune, null, 2)};

// ── Because You Loved: The Bear (pressure, precision, people who care too much) ─
export const bylTheBear: SeedCardItem[] = ${JSON.stringify(bylTheBear, null, 2)};

// ── Book of the Week ──────────────────────────────────────────────────────────
// posterUrl: null — extend with Google Books cover fetch in Phase 4.
export const bookOfTheWeek: SeedBookItem = ${JSON.stringify(bookOfTheWeek, null, 2)};

// ── Collections ───────────────────────────────────────────────────────────────
export const collections: SeedCollectionItem[] = ${JSON.stringify(collections, null, 2)};
`;

  const outPath = path.join(__dirname, '..', 'data', 'seedHomeContent.ts');
  fs.writeFileSync(outPath, out, 'utf8');
  console.log(`✅  Written → ${path.relative(process.cwd(), outPath)}`);
  console.log('\nFilms fetched:');
  const allItems = [...featuredCards, ...trendingToday, ...becauseYouLoved, ...bylDune, ...bylTheBear];
  const seen = new Set<string>();
  allItems.forEach(c => {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      console.log(`  ${c.mediaType.padEnd(4)} ${c.year}  ${c.title}`);
    }
  });
  console.log('\nCollections:');
  collections.forEach(col => {
    const filled = col.items.filter(i => i.posterUrl !== null).length;
    console.log(`  ${col.title} — ${filled}/${col.items.length} posters, ${col.storyCount} stories`);
  });
}

main().catch(e => { console.error(e); process.exit(1); });
