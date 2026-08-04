/**
 * DEV TOOL ONLY — schedules Collection of the Week windows.
 *
 *   cd reelshelf-mobile && npx tsx scripts/schedule-collection-of-the-week.ts <mode> [flags]
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY + EXPO_PUBLIC_SUPABASE_URL in .env,
 * mirroring validate-collections.ts's --write convention (RLS on
 * `collections` is public-SELECT-only — the anon key cannot write).
 *
 * NO CRON/SCHEDULED INFRASTRUCTURE EXISTS FOR THIS (deliberate — this
 * project has no pg_cron or scheduled Edge Function trigger anywhere, and
 * this script does not introduce one). A window's start/end date CAN be
 * scheduled arbitrarily far in advance — the "is X currently live" query
 * (see lib/supabase/collections.ts's fetchLiveCollectionRows) is purely
 * date-range-based and needs nothing running to work correctly the moment
 * that date arrives. But the OPTIONAL push announcement (--announce) only
 * fires at the moment THIS SCRIPT is actually run — running the script
 * near a collection's real go-live moment IS the announcement trigger;
 * there is nothing that fires it automatically at midnight on that date if
 * the script was only run to schedule it weeks earlier. Document this to
 * whoever runs future weeks: to announce a collection's go-live, run this
 * script (in single mode, --announce, on the collection already scheduled
 * to be live "now") AT/NEAR its real start date, not just once far ahead
 * of time in batch mode.
 *
 * ── Modes ──────────────────────────────────────────────────────────────────
 *
 * Single:
 *   npx tsx scripts/schedule-collection-of-the-week.ts single \
 *     --slug best-a24-films --start 2026-08-04T00:00:00Z --end 2026-08-11T00:00:00Z \
 *     [--announce]
 *
 * Batch (auto-assigns sequential windows to a pool of collections in order,
 * starting from --start, each --days long, up to --weeks windows):
 *   npx tsx scripts/schedule-collection-of-the-week.ts batch \
 *     --start 2026-08-04T00:00:00Z --weeks 11 [--days 7] \
 *     [--pool slug1,slug2,...] [--announce-first]
 *   Without --pool, uses every non-archived collection in sort_order (the
 *   same deterministic fallback order used for the initial correction).
 *
 * Both modes reject any window that would overlap an existing scheduled
 * window on a DIFFERENT collection (the one thing that would break the
 * "exactly one live collection at a time" invariant) — see checkOverlap().
 */

import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Requires EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env — see the header comment.');
  process.exit(1);
}

interface CollectionRow {
  id: string;
  slug: string;
  title: string;
  sort_order: number;
  is_archived: boolean;
  active_start_date: string | null;
  active_end_date: string | null;
}

function parseArgs(argv: string[]): { mode: string; flags: Record<string, string | boolean> } {
  const mode = argv[2];
  const flags: Record<string, string | boolean> = {};
  for (let i = 3; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      flags[key] = next;
      i++;
    } else {
      flags[key] = true;
    }
  }
  return { mode, flags };
}

/** Windows are treated as [start, end) — a new window overlaps an existing
 *  one (on a DIFFERENT collection) if start < existing.end AND end >
 *  existing.start. A null existing.end is treated as "open/unbounded". */
function windowsOverlap(
  newStart: Date, newEnd: Date,
  existingStart: Date, existingEnd: Date | null,
): boolean {
  const existingEndsAfterNewStarts = existingEnd === null || existingEnd > newStart;
  return newStart < (existingEnd ?? new Date(8640000000000000)) && newEnd > existingStart && existingEndsAfterNewStarts;
}

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);

  const { mode, flags } = parseArgs(process.argv);

  const { data: allRows, error: fetchErr } = await admin
    .from('collections')
    .select('id, slug, title, sort_order, is_archived, active_start_date, active_end_date')
    .order('sort_order', { ascending: true });
  if (fetchErr) {
    console.error('❌  Failed to load collections:', fetchErr.message);
    process.exit(1);
  }
  const all = (allRows ?? []) as CollectionRow[];

  function checkOverlap(excludeId: string, start: Date, end: Date): CollectionRow | null {
    for (const row of all) {
      if (row.id === excludeId || row.is_archived || !row.active_start_date) continue;
      const existingStart = new Date(row.active_start_date);
      const existingEnd = row.active_end_date ? new Date(row.active_end_date) : null;
      if (windowsOverlap(start, end, existingStart, existingEnd)) return row;
    }
    return null;
  }

  async function announce(slug: string, title: string) {
    console.log(`  📣 Announcing "${title}" via dispatch_collection_announcement...`);
    const { error } = await admin.rpc('dispatch_collection_announcement', { p_slug: slug, p_title: title });
    if (error) console.error('  ⚠️  Announcement dispatch failed:', error.message);
    else console.log('  ✅ Announcement dispatched (delivery depends on opted-in recipients having a registered token).');
  }

  if (mode === 'single') {
    const slug = flags.slug as string;
    const startStr = flags.start as string;
    const endStr = flags.end as string;
    if (!slug || !startStr || !endStr) {
      console.error('❌  single mode requires --slug --start --end (ISO 8601).');
      process.exit(1);
    }
    const target = all.find((r) => r.slug === slug);
    if (!target) {
      console.error(`❌  No collection with slug "${slug}".`);
      process.exit(1);
    }
    if (target.is_archived) {
      console.error(`❌  "${slug}" is archived — cannot schedule it into rotation.`);
      process.exit(1);
    }
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      console.error('❌  Invalid or non-chronological --start/--end.');
      process.exit(1);
    }
    const conflict = checkOverlap(target.id, start, end);
    if (conflict) {
      console.error(`❌  Overlaps "${conflict.title}" (${conflict.slug})'s window: ${conflict.active_start_date} → ${conflict.active_end_date ?? 'open'}. Rejected — no write performed.`);
      process.exit(1);
    }
    const { error } = await admin
      .from('collections')
      .update({ is_featured: true, active_start_date: start.toISOString(), active_end_date: end.toISOString() })
      .eq('id', target.id);
    if (error) {
      console.error('❌  Update failed:', error.message);
      process.exit(1);
    }
    console.log(`✅  Scheduled "${target.title}" (${slug}): ${start.toISOString()} → ${end.toISOString()}`);
    if (flags.announce) await announce(target.slug, target.title);
    return;
  }

  if (mode === 'batch') {
    const startStr = flags.start as string;
    if (!startStr) {
      console.error('❌  batch mode requires --start (ISO 8601).');
      process.exit(1);
    }
    const batchStart = new Date(startStr);
    if (isNaN(batchStart.getTime())) {
      console.error('❌  Invalid --start.');
      process.exit(1);
    }
    const days = flags.days ? Number(flags.days) : 7;
    const poolSlugs = flags.pool ? (flags.pool as string).split(',').map((s) => s.trim()) : null;
    const pool = poolSlugs
      ? poolSlugs.map((slug) => {
          const row = all.find((r) => r.slug === slug && !r.is_archived);
          if (!row) throw new Error(`Unknown or archived slug in --pool: ${slug}`);
          return row;
        })
      : all.filter((r) => !r.is_archived);
    const weeks = flags.weeks ? Number(flags.weeks) : pool.length;

    console.log(`Scheduling ${weeks} window(s) of ${days} day(s) each, starting ${batchStart.toISOString()}, cycling through ${pool.length} collection(s)...`);

    for (let i = 0; i < weeks; i++) {
      const target = pool[i % pool.length];
      const start = new Date(batchStart.getTime() + i * days * 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
      const conflict = checkOverlap(target.id, start, end);
      if (conflict && conflict.id !== target.id) {
        console.error(`❌  Window ${i + 1} for "${target.title}" overlaps "${conflict.title}"'s existing window — aborting batch at window ${i + 1}, no further writes performed this run. Already-written windows from this run remain.`);
        process.exit(1);
      }
      const { error } = await admin
        .from('collections')
        .update({ is_featured: true, active_start_date: start.toISOString(), active_end_date: end.toISOString() })
        .eq('id', target.id);
      if (error) {
        console.error(`❌  Update failed for "${target.title}":`, error.message);
        process.exit(1);
      }
      console.log(`  ✅ Week ${i + 1}: "${target.title}" (${target.slug}) — ${start.toISOString()} → ${end.toISOString()}`);
      // Keep local `all` in sync so subsequent overlap checks in this same run see it.
      target.active_start_date = start.toISOString();
      target.active_end_date = end.toISOString();

      if (flags['announce-first'] && i === 0) await announce(target.slug, target.title);
    }
    console.log('✅  Batch complete.');
    return;
  }

  console.error('❌  Unknown mode. Use "single" or "batch" — see the header comment for usage.');
  process.exit(1);
}

main().catch((e) => {
  console.error('❌  Unexpected error:', e instanceof Error ? e.message : e);
  process.exit(1);
});
