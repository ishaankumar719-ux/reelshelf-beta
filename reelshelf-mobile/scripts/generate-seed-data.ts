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

interface SeedAwardItem extends SeedCardItem {
  award: string;
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
): Promise<SeedCardItem & { author: string }> {
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
      author:    authorQuery,
    };
  }
  const item = items[0];
  const volId = item.id as string;
  const info  = (item.volumeInfo as Record<string, unknown>) ?? {};
  const links = info.imageLinks as Record<string, string> | undefined;
  let cover   = links?.thumbnail ?? links?.smallThumbnail ?? null;
  if (cover) cover = cover.replace('http:', 'https:').replace('zoom=1', 'zoom=2');
  const authorsArr = info.authors as string[] | undefined;
  return {
    id:        `book-${volId}`,
    title:     (info.title as string | undefined) ?? titleQuery,
    year:      parseInt(((info.publishedDate as string | undefined) ?? String(fallbackYear)).slice(0, 4)),
    mediaType: 'book',
    posterUrl: cover,
    author:    authorsArr?.[0] ?? authorQuery,
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
    // Discover: Hidden Gems
    lighthouse,
    floridaProject,
    wilderpeople,
    ghostStory,
    // Phase 2: Award Winners (new titles)
    shapeOfWater,
    chernobyl,
    // Phase 2: TV Picks (new shows)
    severance,
    lastOfUs,
    // Phase 2: 6 new collections (new titles)
    ladyBird,
    drive,
    // Phase 2: Books — Book of the Month
    remainsOfTheDay_book,
    // Phase 2: Books — Trending
    normalPeople_book,
    midnightLibrary_book,
    aLittleLife_book,
    fourthWing_book,
    demonCopperhead_book,
    // Phase 2: Books — Award Winners
    theRoad_book,
    lincolnInTheBardo_book,
    undergroundRailroad_book,
    gentlemanMoscow_book,
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
    movie(752623),                               // Nomadland (Perfect Sunday)
    // ── Discover: Hidden Gems (4 new titles) ─────────────────────────────────
    movie(575264),                               // The Lighthouse (2019)
    movie(435022),                               // The Florida Project (2017)
    movie(344968),                               // Hunt for the Wilderpeople (2016)
    movie(418064),                               // A Ghost Story (2017)
    // ── Phase 2: Award Winners new titles ────────────────────────────────────
    movie(399055),                               // The Shape of Water (2017)
    show(87108),                                 // Chernobyl (2019)
    // ── Phase 2: TV Picks new shows ───────────────────────────────────────────
    show(95396),                                 // Severance (2022)
    show(100088),                                // The Last of Us (2023)
    // ── Phase 2: new collection items ────────────────────────────────────────
    movie(391713),                               // Lady Bird (2017)
    movie(79218),                                // Drive (2011)
    // ── Phase 2: Book of the Month ───────────────────────────────────────────
    book('The Remains of the Day', 'Kazuo Ishiguro', 1989),
    // ── Phase 2: Trending Books ───────────────────────────────────────────────
    book('Normal People', 'Sally Rooney', 2018),
    book('The Midnight Library', 'Matt Haig', 2020),
    book('A Little Life', 'Hanya Yanagihara', 2015),
    book('Fourth Wing', 'Rebecca Yarros', 2023),
    book('Demon Copperhead', 'Barbara Kingsolver', 2022),
    // ── Phase 2: Award Winners Books ─────────────────────────────────────────
    book('The Road', 'Cormac McCarthy', 2006),
    book('Lincoln in the Bardo', 'George Saunders', 2017),
    book('The Underground Railroad', 'Colson Whitehead', 2016),
    book('A Gentleman in Moscow', 'Amor Towles', 2016),
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

  // 12 Collections — original 6 + 6 Phase 2 additions
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
    // ── Phase 2: 6 additional collections ─────────────────────────────────────
    {
      id:          'c-horror',
      title:       'Greatest Horror',
      description: 'Films that stay with you long after you close your eyes.',
      storyCount:  22,
      items:       [hereditary, getOut, midsommar, lighthouse],
    },
    {
      id:          'c-mindbend2',
      title:       'Best Mind-Bending Films',
      description: 'Curated picks that question reality.',
      storyCount:  18,
      items:       [inception, arrival, fightClub, mulholland],
    },
    {
      id:          'c-sunday-watches',
      title:       'Perfect Sunday Watches',
      description: 'Unwind with stories built for quiet afternoons.',
      storyCount:  31,
      items:       [marriageStory, her, moonlight, nomadland],
    },
    {
      id:          'c-oscar',
      title:       'Oscar Winners',
      description: 'The films the Academy couldn\'t ignore.',
      storyCount:  25,
      items:       [parasite, moonlight, nomadland, whiplash],
    },
    {
      id:          'c-comingofage',
      title:       'Coming of Age',
      description: 'The films that understand what it felt like to grow up.',
      storyCount:  20,
      items:       [moonlight, floridaProject, whiplash, ladyBird],
    },
    {
      id:          'c-neonoir',
      title:       'Neo-Noir',
      description: 'Sleek, shadowed, morally complicated.',
      storyCount:  16,
      items:       [bladeRunner2049, prisoners, zodiac, drive],
    },
  ];

  // Phase 2: Award Winners
  const awardWinners: SeedAwardItem[] = [
    { ...parasite,     award: 'Best Picture 2020' },
    { ...moonlight,    award: 'Best Picture 2017' },
    { ...nomadland,    award: 'Best Picture 2021' },
    { ...laLaLand,     award: 'Golden Globe — Best Picture' },
    { ...whiplash,     award: 'Academy Award — Film Editing' },
    { ...shapeOfWater, award: 'Best Picture 2018' },
    { ...succession,   award: 'Emmy — Outstanding Drama' },
    { ...chernobyl,    award: 'Emmy — Limited Series 2019' },
  ];

  // Phase 2: Mind-Bending films for stacked-shadow section
  const mindBendingFilms: SeedCardItem[] = [
    inception, arrival, bladeRunner2049, fightClub, mulholland, parasite,
  ];

  // Phase 2: TV Picks
  const tvPicks: SeedCardItem[] = [
    theBear, succession, shogun, chernobyl, severance, lastOfUs,
  ];

  // Phase 2: Books
  const bookOfTheMonth: SeedBookItem = {
    ...remainsOfTheDay_book,
    id:          'book-remains-of-the-day',
    description: 'A butler\'s quiet reflections on duty and suppressed feeling reveal the cost of a life given entirely to service — Ishiguro\'s Booker Prize masterpiece of restraint.',
  };

  const trendingBooks: SeedBookItem[] = [
    { ...normalPeople_book,      description: 'Two Irish students drift together and apart over several years — a precise study of how love and class shape the people we become.' },
    { ...midnightLibrary_book,   description: 'A library between life and death holds every book of every life you could have lived — a moving meditation on regret and possibility.' },
    { ...aLittleLife_book,       description: 'Four friends navigate adulthood in New York across three decades — an unsparing, devastating novel about trauma, love, and survival.' },
    { ...fourthWing_book,        description: 'A war college for dragon riders, a heroine who shouldn\'t be there, and a rebellion building in the shadows — ferociously entertaining.' },
    { ...demonCopperhead_book,   description: 'A Pulitzer Prize-winning retelling of David Copperfield set in the opioid-ravaged Appalachian Mountains — Dickens as American tragedy.' },
  ];

  const awardWinnerBooks: SeedBookItem[] = [
    { ...theRoad_book,             description: 'A father and son cross a devastated American landscape — McCarthy\'s Pulitzer-winning novel distils love and survival to their barest elements.' },
    { ...lincolnInTheBardo_book,   description: 'Abraham Lincoln visits his son\'s tomb; the dead speak. A Booker Prize-winning novel unlike anything else — grief rendered as polyphony.' },
    { ...undergroundRailroad_book, description: 'A Pulitzer Prize-winning reimagining of the Underground Railroad as a literal network of secret trains carrying enslaved people to freedom.' },
    { ...gentlemanMoscow_book,     description: 'A count sentenced to house arrest in a luxury Moscow hotel finds that even a world reduced to one building can contain an entire life.' },
  ];

  // Discover: Hidden Gems
  const hiddenGems: SeedCardItem[] = [
    moonlight, her, marriageStory,
    lighthouse, floridaProject, wilderpeople, ghostStory,
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

/** Award-winning film or show — extends SeedCardItem with a short award label. */
export interface SeedAwardItem extends SeedCardItem {
  /** Short award label, e.g. "Academy Award — Best Picture". */
  award: string;
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

// ── Discover: Hidden Gems ────────────────────────────────────────────────────
// Curated lesser-known films. posterUrl = null items show letter fallback;
// run scripts/generate-seed-data.ts with EXPO_PUBLIC_TMDB_API_KEY to populate.
export const hiddenGems: SeedCardItem[] = ${JSON.stringify(hiddenGems, null, 2)};

// ── Discover: Random Discovery pool ──────────────────────────────────────────
// Static pool for the "I can't decide" shuffle card. Deduplicated union of
// curated lists. Items with posterUrl = null show the letter-fallback.
const _poolRaw: SeedCardItem[] = [
  // Trending
  { id: "film-27205",   title: "Inception",                         year: 2010, mediaType: "film", posterUrl: "https://image.tmdb.org/t/p/w342/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg" },
  { id: "film-693134",  title: "Dune: Part Two",                    year: 2024, mediaType: "film", posterUrl: "https://image.tmdb.org/t/p/w342/heM4XKC0jA8fTSNe8F7oUkcJV7Z.jpg" },
  { id: "film-496243",  title: "Parasite",                          year: 2019, mediaType: "film", posterUrl: "https://image.tmdb.org/t/p/w342/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg" },
  { id: "film-792307",  title: "Poor Things",                       year: 2023, mediaType: "film", posterUrl: "https://image.tmdb.org/t/p/w342/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg" },
  { id: "film-545611",  title: "Everything Everywhere All at Once", year: 2022, mediaType: "film", posterUrl: "https://image.tmdb.org/t/p/w342/u68AjlvlutfEIcpmbYpKcdi09ut.jpg" },
  { id: "film-376867",  title: "Moonlight",                         year: 2016, mediaType: "film", posterUrl: "https://image.tmdb.org/t/p/w342/qLnfEmPrDjJfPyyddLJPkXmshkp.jpg" },
  { id: "film-152601",  title: "Her",                               year: 2013, mediaType: "film", posterUrl: "https://image.tmdb.org/t/p/w342/eCOtqtfvn7mxGl6nfmq4b1exJRc.jpg" },
  { id: "film-492188",  title: "Marriage Story",                    year: 2019, mediaType: "film", posterUrl: "https://image.tmdb.org/t/p/w342/2JRyCKaRKyJAVpsIHeLvPw5nHmw.jpg" },
  { id: "film-329865",  title: "Arrival",                           year: 2016, mediaType: "film", posterUrl: "https://image.tmdb.org/t/p/w342/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg" },
  { id: "film-335984",  title: "Blade Runner 2049",                 year: 2017, mediaType: "film", posterUrl: "https://image.tmdb.org/t/p/w342/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg" },
  { id: "film-493922",  title: "Hereditary",                        year: 2018, mediaType: "film", posterUrl: "https://image.tmdb.org/t/p/w342/4GFPuL14eXi66V96xBWY73Y9PfR.jpg" },
  { id: "film-530385",  title: "Midsommar",                         year: 2019, mediaType: "film", posterUrl: "https://image.tmdb.org/t/p/w342/7LEI8ulZzO5gy9Ww2NVCrKmHeDZ.jpg" },
  { id: "film-419430",  title: "Get Out",                           year: 2017, mediaType: "film", posterUrl: "https://image.tmdb.org/t/p/w342/tFXcEccSQMf3lfhfXKSU9iRBpa3.jpg" },
  { id: "film-575264",  title: "The Lighthouse",                    year: 2019, mediaType: "film", posterUrl: null },
  { id: "film-435022",  title: "The Florida Project",               year: 2017, mediaType: "film", posterUrl: null },
];

const _seenIds = new Set<string>();
export const randomDiscoveryPool: SeedCardItem[] = _poolRaw.filter(item => {
  if (_seenIds.has(item.id)) return false;
  _seenIds.add(item.id);
  return true;
});

// ── Discover Phase 2: Award Winners ──────────────────────────────────────────
export const awardWinners: SeedAwardItem[] = ${JSON.stringify(awardWinners, null, 2)};

// ── Discover Phase 2: Mind-Bending films (stacked-shadow section) ─────────────
export const mindBendingFilms: SeedCardItem[] = ${JSON.stringify(mindBendingFilms, null, 2)};

// ── Discover Phase 2: TV Picks ────────────────────────────────────────────────
export const tvPicks: SeedCardItem[] = ${JSON.stringify(tvPicks, null, 2)};

// ── Discover Phase 2: Book Section ───────────────────────────────────────────
export const bookOfTheMonth: SeedBookItem = ${JSON.stringify(bookOfTheMonth, null, 2)};

export const trendingBooks: SeedBookItem[] = ${JSON.stringify(trendingBooks, null, 2)};

export const awardWinnerBooks: SeedBookItem[] = ${JSON.stringify(awardWinnerBooks, null, 2)};

// ── Discover Phase 2: Additional Collections Row ─────────────────────────────
export const discoverCollections: SeedCollectionItem[] = collections.filter(c =>
  ['c-horror', 'c-mindbend2', 'c-sunday-watches', 'c-oscar', 'c-comingofage', 'c-neonoir'].includes(c.id)
);
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
