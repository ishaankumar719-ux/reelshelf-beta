/**
 * DEV TOOL ONLY — run once to regenerate the Movie Detail enrichment data:
 *   cd reelshelf-mobile && npx tsx scripts/generate-media-details.ts
 *
 * Output: data/mediaDetails.ts (committed, read-only at runtime)
 * This script is NOT imported or executed by the running app.
 *
 * Additive to generate-seed-data.ts — does NOT re-fetch or regenerate
 * data/seedHomeContent.ts (base card data). Instead it reads every id already
 * committed there and fetches ONE extra enrichment record per film/TV id
 * (backdrop, credits, runtime, genres, rating) via TMDB's
 * `append_to_response=credits`, so no additional TMDB calls beyond what's
 * already spent per item. Books are NOT re-queried against Google Books here
 * (quota-limited at the time this was written) — book enrichment reuses the
 * author/description/poster already committed in seedHomeContent.ts and
 * cleanly omits fields that don't apply (cast, crew, runtime, rating).
 *
 * Never fabricates: every film/TV field below is real TMDB data; every
 * omitted field (composer for a book, runtime for a TV show with no
 * episode_run_time, etc.) is set to null/[] and the UI must render it as
 * "not shown", never invented.
 */

import * as fs   from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { Vibrant } from 'node-vibrant/node';

import * as seed from '../data/seedHomeContent';
import type { SeedCardItem } from '../data/seedHomeContent';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '..', '.env') });

const TMDB_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
if (!TMDB_KEY) {
  console.error('❌  EXPO_PUBLIC_TMDB_API_KEY not found in .env');
  process.exit(1);
}

const TMDB_BASE     = 'https://api.themoviedb.org/3';
const TMDB_BACKDROP = 'https://image.tmdb.org/t/p/w780';
const TMDB_PROFILE  = 'https://image.tmdb.org/t/p/w185';

const CAST_CAP = 9;

// ── Types (mirrors what data/mediaDetails.ts exports) ─────────────────────────
interface CastMember {
  name:      string;
  character: string;
  photoUrl:  string | null;
}

interface MediaDetailRecord {
  /** Not part of the existing /media/[id] route-param contract (year isn't passed
   *  through navigation) — sourced here from the same seed item at generation time. */
  year:           number;
  backdropUrl:    string | null;
  synopsis:       string;
  runtimeMinutes: number | null;
  genres:         string[];
  rating:         number | null;
  cast:           CastMember[];
  /** Film only — real TMDB crew credit, job === 'Director'. */
  director:       string | null;
  /** TV only — real TMDB `created_by`, labeled "Created by" in the UI (not "Directed by"). */
  creator:        string | null;
  /** Film only — real TMDB crew credit, job in Writer/Screenplay/Story. */
  writer:         string | null;
  /** Film only — real TMDB crew credit, job === 'Original Music Composer'. */
  composer:       string | null;
  /** Book only — real author already committed in seedHomeContent.ts. */
  author:         string | null;
  dominantColors: string[];
}

// ── Color extraction — same pipeline as generate-seed-data.ts (Vibrant + darken) ──
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

async function extractDominantColors(imageUrl: string | null): Promise<string[]> {
  if (!imageUrl) return [];
  try {
    const palette = await new Vibrant(imageUrl, { colorCount: 64 }).getPalette();
    const swatches = [
      palette.DarkVibrant,
      palette.DarkMuted,
      palette.Muted,
      palette.Vibrant,
    ].filter((s): s is NonNullable<typeof s> => s !== null && s !== undefined);
    return swatches.slice(0, 3).map(s => darkenHex(s.hex));
  } catch {
    console.warn(`  ⚠ Color extraction failed for ${imageUrl}`);
    return [];
  }
}

// ── Collect every unique navigable item across all seed sections ─────────────
// Collections (Best A24 Films, Oscar Winners, etc.) are no longer part of
// this static seed system — real, editorially-verified collections now live
// in the shared Supabase collections/collection_items tables, populated
// separately by scripts/validate-collections.ts, which fetches its own
// TMDB data directly rather than depending on this seed-detail enrichment.
function collectAllItems(): SeedCardItem[] {
  const all: SeedCardItem[] = [
    ...seed.featuredCards,
    ...seed.trendingToday,
    ...seed.becauseYouLoved,
    ...seed.bylDune,
    ...seed.bylTheBear,
    seed.bookOfTheWeek,
    ...seed.hiddenGems,
    ...seed.randomDiscoveryPool,
    ...seed.awardWinners,
    ...seed.mindBendingFilms,
    ...seed.tvPicks,
    seed.bookOfTheMonth,
    ...seed.trendingBooks,
    ...seed.awardWinnerBooks,
    seed.dailyReelPick,
  ];
  const seen = new Map<string, SeedCardItem>();
  for (const item of all) {
    if (!seen.has(item.id)) seen.set(item.id, item);
  }
  return [...seen.values()];
}

// ── Per-type enrichment fetchers ──────────────────────────────────────────────
async function enrichFilm(tmdbId: number): Promise<Omit<MediaDetailRecord, 'dominantColors' | 'year'>> {
  const r = await fetch(`${TMDB_BASE}/movie/${tmdbId}?api_key=${TMDB_KEY}&append_to_response=credits`);
  const d = await r.json() as Record<string, any>;

  const crew = (d.credits?.crew ?? []) as Record<string, any>[];
  const director = crew.find(c => c.job === 'Director')?.name ?? null;
  const writers = crew
    .filter(c => c.job === 'Writer' || c.job === 'Screenplay' || c.job === 'Story')
    .map(c => c.name);
  const writer = writers.length ? [...new Set(writers)].join(', ') : null;
  const composer = crew.find(c => c.job === 'Original Music Composer')?.name ?? null;

  const cast: CastMember[] = ((d.credits?.cast ?? []) as Record<string, any>[])
    .slice(0, CAST_CAP)
    .map(c => ({
      name:      c.name as string,
      character: (c.character as string) || '',
      photoUrl:  c.profile_path ? `${TMDB_PROFILE}${c.profile_path}` : null,
    }));

  return {
    backdropUrl:    d.backdrop_path ? `${TMDB_BACKDROP}${d.backdrop_path}` : null,
    synopsis:       (d.overview as string) || '',
    runtimeMinutes: typeof d.runtime === 'number' && d.runtime > 0 ? d.runtime : null,
    genres:         ((d.genres ?? []) as Record<string, any>[]).map(g => g.name as string),
    rating:         typeof d.vote_average === 'number' ? Math.round(d.vote_average * 10) / 10 : null,
    cast,
    director,
    creator: null,
    writer,
    composer,
    author: null,
  };
}

async function enrichShow(tmdbId: number): Promise<Omit<MediaDetailRecord, 'dominantColors' | 'year'>> {
  const r = await fetch(`${TMDB_BASE}/tv/${tmdbId}?api_key=${TMDB_KEY}&append_to_response=credits`);
  const d = await r.json() as Record<string, any>;

  const cast: CastMember[] = ((d.credits?.cast ?? []) as Record<string, any>[])
    .slice(0, CAST_CAP)
    .map(c => ({
      name:      c.name as string,
      character: (c.character as string) || '',
      photoUrl:  c.profile_path ? `${TMDB_PROFILE}${c.profile_path}` : null,
    }));

  const creators = ((d.created_by ?? []) as Record<string, any>[]).map(c => c.name as string);
  const creator = creators.length ? creators.join(', ') : null;

  const episodeRuntime = Array.isArray(d.episode_run_time) && d.episode_run_time.length > 0
    ? d.episode_run_time[0] as number
    : null;

  return {
    backdropUrl:    d.backdrop_path ? `${TMDB_BACKDROP}${d.backdrop_path}` : null,
    synopsis:       (d.overview as string) || '',
    runtimeMinutes: episodeRuntime,
    genres:         ((d.genres ?? []) as Record<string, any>[]).map(g => g.name as string),
    rating:         typeof d.vote_average === 'number' ? Math.round(d.vote_average * 10) / 10 : null,
    cast,
    // TV credits at the show level don't reliably map to a single director/writer —
    // omit cleanly rather than attribute a per-episode crew credit to the whole series.
    director: null,
    creator,
    writer:   null,
    composer: null,
    author:   null,
  };
}

// Books: Google Books quota was exhausted when this script was written — do NOT
// re-query. Reuse the already-committed, real author/description/poster instead
// of fabricating anything. Every other field is cleanly omitted (doesn't apply).
function enrichBookFromSeed(item: SeedCardItem & { author?: string; description?: string }): Omit<MediaDetailRecord, 'dominantColors' | 'year'> {
  return {
    backdropUrl:    null,
    synopsis:       item.description ?? '',
    runtimeMinutes: null,
    genres:         [],
    rating:         null,
    cast:           [],
    director:       null,
    creator:        null,
    writer:         null,
    composer:       null,
    author:         item.author ?? null,
  };
}

async function main() {
  const items = collectAllItems();
  console.log(`Enriching ${items.length} unique items…`);

  const results: [string, MediaDetailRecord][] = [];

  // Batch to stay well under TMDB's rate limit while still running concurrently.
  const BATCH_SIZE = 8;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(async (item) => {
      try {
        let base: Omit<MediaDetailRecord, 'dominantColors' | 'year'>;
        if (item.mediaType === 'film') {
          const tmdbId = parseInt(item.id.replace(/^film-/, ''), 10);
          base = await enrichFilm(tmdbId);
        } else if (item.mediaType === 'tv') {
          const tmdbId = parseInt(item.id.replace(/^tv-/, ''), 10);
          base = await enrichShow(tmdbId);
        } else {
          base = enrichBookFromSeed(item as SeedCardItem & { author?: string; description?: string });
        }
        const dominantColors = await extractDominantColors(base.backdropUrl ?? item.posterUrl);
        return [item.id, { ...base, year: item.year, dominantColors }] as [string, MediaDetailRecord];
      } catch (e) {
        console.warn(`  ⚠ Failed to enrich ${item.id} (${item.title}):`, e instanceof Error ? e.message : e);
        return null;
      }
    }));
    for (const r of batchResults) if (r) results.push(r);
    console.log(`  …${Math.min(i + BATCH_SIZE, items.length)}/${items.length}`);
  }

  const record: Record<string, MediaDetailRecord> = Object.fromEntries(results);

  const today = new Date().toISOString().slice(0, 10);
  const out = `// MEDIA DETAIL DATA — generated by scripts/generate-media-details.ts on ${today}.
// Real film/TV data sourced from TMDB (backdrop, credits, runtime, genres, rating).
// Book entries reuse the already-committed seed data (Google Books quota-limited
// at generation time) — cast/crew/runtime/rating/genres cleanly omitted for books.
// Do NOT edit manually — re-run the script to refresh.
//
// TMDB attribution: "This app uses the TMDB API but is not endorsed or certified by TMDB."

export interface CastMember {
  name:      string;
  character: string;
  photoUrl:  string | null;
}

/** Movie Detail Phase 1 enrichment — keyed by the same id used throughout the app (film-*, tv-*, book-*). */
export interface MediaDetailRecord {
  /** Not part of the existing /media/[id] route-param contract (year isn't passed
   *  through navigation) — sourced here from the same seed item at generation time. */
  year:           number;
  backdropUrl:    string | null;
  synopsis:       string;
  runtimeMinutes: number | null;
  genres:         string[];
  /** Real TMDB vote_average (rounded to 1 decimal), shown as "ReelShelf {rating}" — never a fabricated personal rating. null for books this pass. */
  rating:         number | null;
  cast:           CastMember[];
  director:       string | null;
  creator:        string | null;
  writer:         string | null;
  composer:       string | null;
  author:         string | null;
  dominantColors: string[];
}

export const mediaDetails: Record<string, MediaDetailRecord> = ${JSON.stringify(record, null, 2)};
`;

  const outPath = path.join(__dirname, '..', 'data', 'mediaDetails.ts');
  fs.writeFileSync(outPath, out, 'utf8');
  console.log(`✅  Written → ${path.relative(process.cwd(), outPath)} (${results.length}/${items.length} enriched)`);
}

main().catch(e => { console.error(e); process.exit(1); });
