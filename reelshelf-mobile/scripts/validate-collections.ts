/**
 * DEV TOOL ONLY — validates every curated collection's real membership
 * against its stated collection_type's rule using live TMDB data, then
 * (optionally) writes the results straight into the shared `collections` /
 * `collection_items` Supabase tables.
 *
 *   cd reelshelf-mobile && npx tsx scripts/validate-collections.ts [--write]
 *
 * Reads EXPO_PUBLIC_TMDB_API_KEY from .env (see .env.example), mirroring
 * generate-seed-data.ts's convention. `--write` additionally requires
 * SUPABASE_SERVICE_ROLE_KEY + EXPO_PUBLIC_SUPABASE_URL in .env (RLS on both
 * tables is public-SELECT-only — the anon key cannot write, by design; see
 * supabase/migrations/20260721_collections.sql). Without --write, this only
 * validates and reports — no database changes.
 *
 * This is the REUSABLE validator: add a new collection to COLLECTIONS below
 * and re-run — it is not one-off code for this pass. Every item is checked
 * for real against its collection's rule; nothing is trusted just because
 * it's in this file's source list (that was the exact failure mode that let
 * "Poor Things" (a Searchlight Pictures film) sit in "Best A24 Films", and
 * let a plain wrong TMDB id (575264, actually Mission: Impossible — Dead
 * Reckoning) sit in place of "The Lighthouse").
 *
 * Output: console summary + reports/collections-validation-report.{json,md}
 * (both committed) — nothing is considered "published" without reading them.
 */

import * as fs from 'node:fs';
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
const SHOULD_WRITE = process.argv.includes('--write');

// ── Verified constants ───────────────────────────────────────────────────────
// Confirmed live against TMDB's actual /search/company + cross-checked
// against 3 known real A24 titles before ever being used below — see
// A24_VERIFICATION_LOG in the report output for the raw evidence. There are
// TWO companies named "A24" in TMDB (id 293354, origin GB, unrelated; id
// 41077, origin US, the real distributor) — do not confuse them.
const A24_COMPANY_ID = 41077;

// TMDB's stable well-known genre ids (movie).
const GENRE = {
  ADVENTURE: 12,
  CRIME: 80,
  DRAMA: 18,
  HORROR: 27,
  SCIENCE_FICTION: 878,
  THRILLER: 53,
} as const;

// Keyword ids for these two collections (coming-of-age, neo-noir) — verified
// individually via TMDB's /keyword/{id} endpoint before use, rather than
// trusted from the source list:
//   10683 -> confirmed "coming of age" (matches lib/discoverCollections.ts's
//            existing with_keywords=10683 query — that one was right).
//   6564  -> confirmed "terminal illness", NOT "neo-noir". The existing
//            lib/discoverCollections.ts neo-noir TMDB query
//            (with_keywords=6564) has been using the WRONG keyword id — a
//            live bug in that file, out of scope to fix here (schema/data
//            task only), but flagged in the validation report for
//            visibility. The real "neo-noir" keyword, confirmed via
//            /search/keyword?query=neo-noir, is 207268 — used below instead.
const KEYWORD = {
  COMING_OF_AGE: 10683,
  NEO_NOIR: 207268,
};

// ── Types ─────────────────────────────────────────────────────────────────────
type CollectionType = 'studio' | 'genre' | 'runtime' | 'decade' | 'awards' | 'curated';
type VerificationStatus = 'verified' | 'flagged' | 'unverified';
type MediaKind = 'movie' | 'tv';

interface ItemSpec {
  tmdbId: number;
  mediaType: MediaKind;
  /** What the source list called it — compared against TMDB's real title to catch id mismatches (e.g. the Lighthouse/Mission:Impossible bug). */
  expectedTitle: string;
}

interface CollectionSpec {
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  collectionType: CollectionType;
  isFeatured: boolean;
  sortOrder: number;
  items: ItemSpec[];
}

interface ItemResult {
  slug: string;
  tmdbId: number;
  mediaType: MediaKind;
  expectedTitle: string;
  resolvedTitle: string | null;
  year: number | null;
  posterPath: string | null;
  status: VerificationStatus;
  note: string | null;
}

// ── TMDB fetch helpers ───────────────────────────────────────────────────────
async function tmdbGet(pathname: string, params: Record<string, string> = {}): Promise<any> {
  const query = new URLSearchParams({ api_key: TMDB_KEY!, ...params }).toString();
  const res = await fetch(`${TMDB_BASE}${pathname}?${query}`);
  if (!res.ok) throw new Error(`TMDB ${pathname} -> ${res.status}`);
  return res.json();
}

async function fetchMovie(id: number) {
  return tmdbGet(`/movie/${id}`, { append_to_response: 'keywords' });
}
async function fetchTv(id: number) {
  return tmdbGet(`/tv/${id}`, { append_to_response: 'keywords' });
}

// ── Per-collection-type verification rules (each a real, checkable TMDB field) ─
function checkStudio(data: any): { pass: boolean; note: string } {
  const companies: any[] = data.production_companies ?? [];
  const pass = companies.some((c) => c.id === A24_COMPANY_ID);
  return pass
    ? { pass: true, note: `production_companies includes id ${A24_COMPANY_ID} (A24)` }
    : {
        pass: false,
        note: `production_companies does NOT include id ${A24_COMPANY_ID} (A24) — TMDB's production_companies field reflects producers, not distributors, so a real A24-DISTRIBUTED title can legitimately fail this specific check (confirmed for Hereditary/Midsommar/Lady Bird — all real A24 films with no A24 entry in this field). Not independently verifiable via this field alone.`,
      };
}

function checkRuntime(data: any, maxMinutes: number): { pass: boolean; note: string } {
  const runtime = data.runtime ?? null;
  const pass = typeof runtime === 'number' && runtime > 0 && runtime <= maxMinutes;
  return { pass, note: `runtime=${runtime ?? 'null'} (rule: <= ${maxMinutes})` };
}

function checkGenre(data: any, anyOf: number[], allOf: number[] = []): { pass: boolean; note: string } {
  const genreIds: number[] = (data.genres ?? []).map((g: any) => g.id);
  const hasAny = anyOf.length === 0 || anyOf.some((id) => genreIds.includes(id));
  const hasAll = allOf.every((id) => genreIds.includes(id));
  const pass = hasAny && hasAll;
  return { pass, note: `genre_ids=[${genreIds.join(',')}] (rule: ${allOf.length ? `all of [${allOf}]` : `any of [${anyOf}]`})` };
}

function checkKeyword(data: any, keywordIds: number[]): { pass: boolean; note: string } {
  const raw = data.keywords?.keywords ?? data.keywords?.results ?? [];
  const ids: number[] = raw.map((k: any) => k.id);
  const pass = keywordIds.some((id) => ids.includes(id));
  return { pass, note: `keyword_ids=[${ids.join(',')}] (rule: any of [${keywordIds}])` };
}

// ── Collections (the reusable source list — extend this, not the logic above) ─
const COLLECTIONS: CollectionSpec[] = [
  {
    slug: 'best-a24-films', title: 'Best A24 Films', collectionType: 'studio', isFeatured: true, sortOrder: 0,
    description: 'Fearless cinema from A24.',
    items: [
      // Poor Things intentionally removed — confirmed Searchlight Pictures, not A24.
      { tmdbId: 545611, mediaType: 'movie', expectedTitle: 'Everything Everywhere All at Once' },
      { tmdbId: 493922, mediaType: 'movie', expectedTitle: 'Hereditary' },
      { tmdbId: 530385, mediaType: 'movie', expectedTitle: 'Midsommar' },
      { tmdbId: 376867, mediaType: 'movie', expectedTitle: 'Moonlight' },
      { tmdbId: 503919, mediaType: 'movie', expectedTitle: 'The Lighthouse' },
      { tmdbId: 473033, mediaType: 'movie', expectedTitle: 'Uncut Gems' },
      { tmdbId: 391713, mediaType: 'movie', expectedTitle: 'Lady Bird' },
      { tmdbId: 559907, mediaType: 'movie', expectedTitle: 'The Green Knight' },
      { tmdbId: 666277, mediaType: 'movie', expectedTitle: 'Past Lives' },
      { tmdbId: 467244, mediaType: 'movie', expectedTitle: 'The Zone of Interest' },
    ],
  },
  {
    slug: 'under-90-minutes', title: 'Under 90 Minutes', collectionType: 'runtime', isFeatured: true, sortOrder: 1,
    description: "Great stories that don't overstay their welcome.",
    items: [
      // Was 5765 in the old static seed — that id is actually "Knight Moves", not Run Lola Run. Corrected here.
      { tmdbId: 104, mediaType: 'movie', expectedTitle: 'Run Lola Run' },
      { tmdbId: 244786, mediaType: 'movie', expectedTitle: 'Whiplash' },
      { tmdbId: 376867, mediaType: 'movie', expectedTitle: 'Moonlight' },
      { tmdbId: 419430, mediaType: 'movie', expectedTitle: 'Get Out' },
    ],
  },
  {
    slug: 'mind-bending-stories', title: 'Mind-Bending Stories', collectionType: 'genre', isFeatured: true, sortOrder: 2,
    description: 'Films that warp reality and linger long after the credits.',
    items: [
      { tmdbId: 27205, mediaType: 'movie', expectedTitle: 'Inception' },
      { tmdbId: 329865, mediaType: 'movie', expectedTitle: 'Arrival' },
      { tmdbId: 335984, mediaType: 'movie', expectedTitle: 'Blade Runner 2049' },
      { tmdbId: 550, mediaType: 'movie', expectedTitle: 'Fight Club' },
    ],
  },
  {
    slug: 'true-crime-essentials', title: 'True Crime Essentials', collectionType: 'genre', isFeatured: true, sortOrder: 3,
    description: "Investigations that won't let you go.",
    items: [
      // Was 929 in the old static seed — that id is actually "Godzilla", not Zodiac. Corrected here.
      { tmdbId: 1949, mediaType: 'movie', expectedTitle: 'Zodiac' },
      { tmdbId: 146233, mediaType: 'movie', expectedTitle: 'Prisoners' },
      { tmdbId: 314365, mediaType: 'movie', expectedTitle: 'Spotlight' },
      { tmdbId: 546554, mediaType: 'movie', expectedTitle: 'Knives Out' },
    ],
  },
  {
    slug: 'space-adventures', title: 'Space Adventures', collectionType: 'genre', isFeatured: true, sortOrder: 4,
    description: 'Odysseys beyond the known — wormholes, alien worlds, the deep unknown.',
    items: [
      { tmdbId: 157336, mediaType: 'movie', expectedTitle: 'Interstellar' },
      { tmdbId: 286217, mediaType: 'movie', expectedTitle: 'The Martian' },
      // Was 80537 in the old static seed — that id doesn't resolve on TMDB at all (404). Corrected here.
      { tmdbId: 49047, mediaType: 'movie', expectedTitle: 'Gravity' },
      // Was 36557 in the old static seed — that id is actually "Casino Royale", not Contact. Corrected here.
      { tmdbId: 686, mediaType: 'movie', expectedTitle: 'Contact' },
    ],
  },
  {
    slug: 'perfect-sunday-stories', title: 'Perfect Sunday Stories', collectionType: 'genre', isFeatured: true, sortOrder: 5,
    description: 'Slow, warm, unmissable.',
    items: [
      { tmdbId: 492188, mediaType: 'movie', expectedTitle: 'Marriage Story' },
      { tmdbId: 376867, mediaType: 'movie', expectedTitle: 'Moonlight' },
      { tmdbId: 152601, mediaType: 'movie', expectedTitle: 'Her' },
      // Was 752623 in the old static seed — that id is actually "The Lost City", not Nomadland. Corrected here.
      { tmdbId: 581734, mediaType: 'movie', expectedTitle: 'Nomadland' },
    ],
  },
  {
    slug: 'greatest-horror', title: 'Greatest Horror', collectionType: 'genre', isFeatured: true, sortOrder: 6,
    description: 'Films that stay with you long after you close your eyes.',
    items: [
      { tmdbId: 493922, mediaType: 'movie', expectedTitle: 'Hereditary' },
      { tmdbId: 419430, mediaType: 'movie', expectedTitle: 'Get Out' },
      { tmdbId: 530385, mediaType: 'movie', expectedTitle: 'Midsommar' },
      // Was 575264 in the old static seed — that id is actually Mission:
      // Impossible - Dead Reckoning Part One, not The Lighthouse. Corrected here.
      { tmdbId: 503919, mediaType: 'movie', expectedTitle: 'The Lighthouse' },
    ],
  },
  {
    slug: 'best-mind-bending-films', title: 'Best Mind-Bending Films', collectionType: 'genre', isFeatured: true, sortOrder: 7,
    description: 'Curated picks that question reality.',
    items: [
      { tmdbId: 27205, mediaType: 'movie', expectedTitle: 'Inception' },
      { tmdbId: 329865, mediaType: 'movie', expectedTitle: 'Arrival' },
      { tmdbId: 550, mediaType: 'movie', expectedTitle: 'Fight Club' },
      { tmdbId: 1018, mediaType: 'movie', expectedTitle: 'Mulholland Drive' },
    ],
  },
  {
    slug: 'perfect-sunday-watches', title: 'Perfect Sunday Watches', collectionType: 'genre', isFeatured: true, sortOrder: 8,
    description: 'Unwind with stories built for quiet afternoons.',
    items: [
      { tmdbId: 492188, mediaType: 'movie', expectedTitle: 'Marriage Story' },
      { tmdbId: 152601, mediaType: 'movie', expectedTitle: 'Her' },
      { tmdbId: 376867, mediaType: 'movie', expectedTitle: 'Moonlight' },
      // Was 752623 in the old static seed — that id is actually "The Lost City", not Nomadland. Corrected here.
      { tmdbId: 581734, mediaType: 'movie', expectedTitle: 'Nomadland' },
    ],
  },
  {
    slug: 'oscar-winners', title: 'Oscar Winners', collectionType: 'awards', isFeatured: true, sortOrder: 9,
    description: "The films the Academy couldn't ignore.",
    items: [
      { tmdbId: 496243, mediaType: 'movie', expectedTitle: 'Parasite' },
      { tmdbId: 376867, mediaType: 'movie', expectedTitle: 'Moonlight' },
      // Was 752623 in the old static seed — that id is actually "The Lost City", not Nomadland. Corrected here.
      { tmdbId: 581734, mediaType: 'movie', expectedTitle: 'Nomadland' },
      { tmdbId: 244786, mediaType: 'movie', expectedTitle: 'Whiplash' },
    ],
  },
  {
    slug: 'coming-of-age', title: 'Coming of Age', collectionType: 'curated', isFeatured: true, sortOrder: 10,
    description: 'The films that understand what it felt like to grow up.',
    items: [
      { tmdbId: 376867, mediaType: 'movie', expectedTitle: 'Moonlight' },
      // Was 435022 in the old static seed — that id doesn't resolve on TMDB at all (404). Corrected here.
      { tmdbId: 394117, mediaType: 'movie', expectedTitle: 'The Florida Project' },
      { tmdbId: 244786, mediaType: 'movie', expectedTitle: 'Whiplash' },
      { tmdbId: 391713, mediaType: 'movie', expectedTitle: 'Lady Bird' },
    ],
  },
  {
    slug: 'neo-noir', title: 'Neo-Noir', collectionType: 'curated', isFeatured: true, sortOrder: 11,
    description: 'Sleek, shadowed, morally complicated.',
    items: [
      { tmdbId: 335984, mediaType: 'movie', expectedTitle: 'Blade Runner 2049' },
      { tmdbId: 146233, mediaType: 'movie', expectedTitle: 'Prisoners' },
      // Was 929 in the old static seed — that id is actually "Godzilla", not Zodiac. Corrected here.
      { tmdbId: 1949, mediaType: 'movie', expectedTitle: 'Zodiac' },
      // Was 79218 in the old static seed — that id is actually "Ice Age: A Mammoth Christmas", not Drive. Corrected here.
      { tmdbId: 64690, mediaType: 'movie', expectedTitle: 'Drive' },
    ],
  },
];

function verificationSourceFor(type: CollectionType): string {
  switch (type) {
    case 'studio':  return `TMDB production_companies field, checked against verified company id ${A24_COMPANY_ID} (A24)`;
    case 'runtime': return 'TMDB runtime field';
    case 'genre':   return 'TMDB genres field';
    case 'awards':  return 'No verified awards data source available in this project — every item flagged, requires manual curation';
    case 'curated': return 'TMDB keywords endpoint (no single discrete genre/runtime/company field defines this theme)';
    case 'decade':  return 'TMDB release_date field';
  }
}

// ── Item-level verification dispatcher ───────────────────────────────────────
async function verifyItem(spec: CollectionSpec, item: ItemSpec): Promise<ItemResult> {
  const base: Omit<ItemResult, 'status' | 'note' | 'resolvedTitle' | 'year' | 'posterPath'> = {
    slug: spec.slug, tmdbId: item.tmdbId, mediaType: item.mediaType, expectedTitle: item.expectedTitle,
  };

  let data: any;
  try {
    data = item.mediaType === 'movie' ? await fetchMovie(item.tmdbId) : await fetchTv(item.tmdbId);
  } catch (e) {
    return { ...base, resolvedTitle: null, year: null, posterPath: null, status: 'unverified', note: `TMDB fetch failed: ${(e as Error).message}` };
  }

  const resolvedTitle = data.title ?? data.name ?? null;
  const dateStr = item.mediaType === 'movie' ? data.release_date : data.first_air_date;
  const year = dateStr ? Number(String(dateStr).slice(0, 4)) : null;
  const posterPath = data.poster_path ?? null;

  // Awards-type: no verifiable data source exists in this project at all —
  // per CONSTRAINTS, never attempt to infer this from TMDB (it doesn't
  // reliably carry award data) and never fabricate a pass. Flag unconditionally.
  if (spec.collectionType === 'awards') {
    return {
      ...base, resolvedTitle, year, posterPath, status: 'flagged',
      note: 'No verified awards data source available in this project (confirmed in an earlier audit) — flagged pending manual curation, not silently treated as verified.',
    };
  }

  // Id/title sanity check first — this is exactly the class of bug that let
  // a wrong TMDB id (575264, "Mission: Impossible") sit in place of "The
  // Lighthouse" in the old static seed data.
  if (!resolvedTitle) {
    return { ...base, resolvedTitle, year, posterPath, status: 'unverified', note: 'TMDB returned no title for this id — invalid/unreachable media_id.' };
  }
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalize(resolvedTitle) !== normalize(item.expectedTitle)) {
    return {
      ...base, resolvedTitle, year, posterPath, status: 'unverified',
      note: `Title mismatch: source list expected "${item.expectedTitle}" but TMDB id ${item.tmdbId} resolves to "${resolvedTitle}" — wrong media_id, not a real match.`,
    };
  }

  let check: { pass: boolean; note: string };
  switch (spec.collectionType) {
    case 'studio':
      check = checkStudio(data);
      break;
    case 'runtime':
      check = checkRuntime(data, 90);
      break;
    case 'genre': {
      switch (spec.slug) {
        case 'mind-bending-stories':
        case 'best-mind-bending-films':
          check = checkGenre(data, [GENRE.SCIENCE_FICTION, GENRE.THRILLER]);
          break;
        case 'true-crime-essentials':
          check = checkGenre(data, [GENRE.CRIME]);
          break;
        case 'space-adventures':
          check = checkGenre(data, [], [GENRE.SCIENCE_FICTION, GENRE.ADVENTURE]);
          break;
        case 'perfect-sunday-stories':
        case 'perfect-sunday-watches':
          check = checkGenre(data, [GENRE.DRAMA]);
          break;
        case 'greatest-horror':
          check = checkGenre(data, [GENRE.HORROR]);
          break;
        default:
          check = { pass: false, note: `No genre rule defined for slug "${spec.slug}" — add one before trusting this collection.` };
      }
      break;
    }
    case 'curated': {
      switch (spec.slug) {
        case 'coming-of-age':
          check = checkKeyword(data, [KEYWORD.COMING_OF_AGE]);
          break;
        case 'neo-noir': {
          const genre = checkGenre(data, [GENRE.CRIME]);
          const keyword = checkKeyword(data, [KEYWORD.NEO_NOIR]);
          check = { pass: genre.pass && keyword.pass, note: `${genre.note}; ${keyword.note}` };
          break;
        }
        default:
          check = { pass: false, note: `No curated rule defined for slug "${spec.slug}" — add one before trusting this collection.` };
      }
      break;
    }
    default:
      check = { pass: false, note: `No rule implemented for collection_type "${spec.collectionType}".` };
  }

  const missingPoster = !posterPath;
  const status: VerificationStatus = check.pass && !missingPoster ? 'verified' : 'flagged';
  const note = missingPoster ? `${check.note}; ALSO missing poster_path` : check.note;

  return { ...base, resolvedTitle, year, posterPath, status, note };
}

// ── Run ───────────────────────────────────────────────────────────────────────
async function run() {
  const allResults: ItemResult[] = [];

  for (const spec of COLLECTIONS) {
    console.log(`\n=== ${spec.title} (${spec.slug}, type=${spec.collectionType}) ===`);
    const seenIds = new Set<string>();

    for (const item of spec.items) {
      const key = `${item.mediaType}-${item.tmdbId}`;
      let result = await verifyItem(spec, item);

      // Duplicate media_id within a collection — flag the SECOND+ occurrence,
      // don't silently drop or silently keep it verified twice.
      if (seenIds.has(key) && result.status === 'verified') {
        result = { ...result, status: 'flagged', note: `${result.note}; ALSO a duplicate media_id within this collection` };
      }
      seenIds.add(key);

      allResults.push(result);
      const icon = result.status === 'verified' ? '✅' : result.status === 'flagged' ? '🚩' : '❓';
      console.log(`  ${icon} [${result.status}] ${result.resolvedTitle ?? result.expectedTitle} (id ${result.tmdbId}) — ${result.note}`);
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n\n=== SUMMARY ===');
  const summary: Record<string, { verified: number; flagged: number; unverified: number }> = {};
  for (const spec of COLLECTIONS) {
    const items = allResults.filter((r) => r.slug === spec.slug);
    summary[spec.slug] = {
      verified: items.filter((r) => r.status === 'verified').length,
      flagged: items.filter((r) => r.status === 'flagged').length,
      unverified: items.filter((r) => r.status === 'unverified').length,
    };
    const s = summary[spec.slug];
    console.log(`  ${spec.title}: ${s.verified} verified, ${s.flagged} flagged, ${s.unverified} unverified`);
  }

  // ── Write report files ───────────────────────────────────────────────────
  const reportsDir = path.join(__dirname, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });

  const dataIntegrityFindings = [
    'The old static seed (scripts/generate-seed-data.ts) hardcoded 7 TMDB movie ids that resolve to the WRONG title or don\'t exist at all — none of these were caught until this validation ran real lookups against them: '
      + '"Run Lola Run" was id 5765 (actually "Knight Moves"; correct id 104), '
      + '"Zodiac" was id 929 (actually "Godzilla"; correct id 1949), '
      + '"Gravity" was id 80537 (404, does not exist; correct id 49047), '
      + '"Contact" was id 36557 (actually "Casino Royale"; correct id 686), '
      + '"Nomadland" was id 752623 (actually "The Lost City"; correct id 581734), '
      + '"The Florida Project" was id 435022 (404, does not exist; correct id 394117), '
      + '"Drive" was id 79218 (actually "Ice Age: A Mammoth Christmas"; correct id 64690). '
      + 'All corrected in this script\'s COLLECTIONS list; the old static seed data itself is untouched by this data-only task but should be treated as unreliable.',
    'lib/discoverCollections.ts\'s live "neo-noir" TMDB discover query (with_keywords=6564) uses the wrong keyword id — TMDB keyword 6564 is "terminal illness", not "neo-noir" (confirmed via /keyword/6564 and /search/keyword?query=neo-noir, which gives 207268 as the real "neo-noir" keyword). This is a bug in currently-running app code (both mobile\'s port and the website\'s original), out of scope to fix in this schema/data-only task, but should be corrected in a future pass — it means the app\'s live Neo-Noir Discover row is not actually filtering by neo-noir at all right now.',
  ];

  const jsonReport = {
    generatedAt: new Date().toISOString(),
    a24CompanyIdVerification: {
      companyId: A24_COMPANY_ID,
      method: 'TMDB /search/company?query=A24 (US-origin result, id 41077 — a second, unrelated GB-origin "A24" also exists, id 293354) cross-checked against production_companies on Moonlight (376867), which lists id 41077.',
    },
    dataIntegrityFindings,
    collections: COLLECTIONS.map((spec) => ({
      slug: spec.slug, title: spec.title, collectionType: spec.collectionType,
      verificationSource: verificationSourceFor(spec.collectionType),
      summary: summary[spec.slug],
    })),
    items: allResults,
  };
  fs.writeFileSync(path.join(reportsDir, 'collections-validation-report.json'), JSON.stringify(jsonReport, null, 2));

  const md: string[] = [
    '# Collections Validation Report',
    '',
    `Generated: ${jsonReport.generatedAt}`,
    '',
    `## A24 company id verification`,
    '',
    `Verified company id: **${A24_COMPANY_ID}** ("A24", origin_country US).`,
    '',
    'Confirmed via TMDB `/search/company?query=A24` (a second, unrelated company also named "A24", id 293354, origin GB, exists — not used) and cross-checked against `production_companies` on Moonlight (TMDB id 376867), which includes id 41077.',
    '',
    '**Important caveat found during verification**: TMDB\'s `production_companies` field reflects production entities, not distributors. Hereditary, Midsommar, and Lady Bird are all real, well-known A24-distributed films, but none of them carry company id 41077 in this field — so the strict per-CONSTRAINTS check (`production_companies` contains the verified id) correctly flags them as not independently verifiable via this field, even though they are genuinely A24 films in the real world. They are marked `flagged`, not `verified`, with this exact caveat in their `verification_note` — not silently passed and not silently dropped.',
    '',
    '## Data integrity findings (beyond this pass\'s scope, surfaced for visibility)',
    '',
    ...dataIntegrityFindings.map((f) => `- ${f}`),
    '',
    '## Per-collection summary',
    '',
    '| Collection | Type | Verified | Flagged | Unverified |',
    '|---|---|---|---|---|',
    ...COLLECTIONS.map((s) => `| ${s.title} | ${s.collectionType} | ${summary[s.slug].verified} | ${summary[s.slug].flagged} | ${summary[s.slug].unverified} |`),
    '',
    '## Item detail',
    '',
  ];
  for (const spec of COLLECTIONS) {
    md.push(`### ${spec.title} (\`${spec.slug}\`)`, '');
    for (const r of allResults.filter((x) => x.slug === spec.slug)) {
      const icon = r.status === 'verified' ? '✅' : r.status === 'flagged' ? '🚩' : '❓';
      md.push(`- ${icon} **${r.resolvedTitle ?? r.expectedTitle}** (${r.year ?? '—'}, tmdb id ${r.tmdbId}) — \`${r.status}\` — ${r.note}`);
    }
    md.push('');
  }
  fs.writeFileSync(path.join(reportsDir, 'collections-validation-report.md'), md.join('\n'));
  console.log(`\nReport written to scripts/reports/collections-validation-report.{json,md}`);

  // ── Optional direct write ────────────────────────────────────────────────
  if (!SHOULD_WRITE) {
    console.log('\n(Run with --write, plus SUPABASE_SERVICE_ROLE_KEY in .env, to populate the collections/collection_items tables directly. RLS on both tables is public-SELECT-only, so this requires the service role key, never the anon key.)');
    return;
  }

  const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('\n❌  --write requires EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env — skipping write.');
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  for (const spec of COLLECTIONS) {
    const { data: collectionRow, error: collectionErr } = await admin
      .from('collections')
      .upsert({
        slug: spec.slug,
        title: spec.title,
        subtitle: spec.subtitle ?? null,
        description: spec.description,
        collection_type: spec.collectionType,
        verification_source: verificationSourceFor(spec.collectionType),
        verified_at: new Date().toISOString(),
        is_featured: spec.isFeatured,
        sort_order: spec.sortOrder,
        active_start_date: new Date().toISOString(),
        active_end_date: null,
        is_archived: false,
      }, { onConflict: 'slug' })
      .select('id')
      .single();
    if (collectionErr || !collectionRow) {
      console.error(`❌  Failed to upsert collection "${spec.slug}":`, collectionErr);
      continue;
    }

    // Replace this collection's items wholesale each run — simplest way to
    // keep collection_items an exact mirror of this file's current source
    // list (dedup/removed items shouldn't linger from a previous run).
    await admin.from('collection_items').delete().eq('collection_id', collectionRow.id);

    const items = allResults
      .filter((r) => r.slug === spec.slug)
      .map((r, i) => ({
        collection_id: collectionRow.id,
        media_id: String(r.tmdbId),
        media_type: r.mediaType,
        title: r.resolvedTitle ?? r.expectedTitle,
        year: r.year,
        poster_path: r.posterPath,
        sort_order: i,
        verification_status: r.status,
        verification_note: r.note,
      }));

    const { error: itemsErr } = await admin.from('collection_items').insert(items);
    if (itemsErr) console.error(`❌  Failed to insert items for "${spec.slug}":`, itemsErr);
    else console.log(`✅  Wrote "${spec.slug}": ${items.length} items.`);
  }
}

run().catch((e) => {
  console.error('Validation script failed:', e);
  process.exit(1);
});
