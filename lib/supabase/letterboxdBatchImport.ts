"use client"

import { isSupabaseConfigured } from "@/lib/supabase/config"
import { createClient as createSupabaseClient } from "@/lib/supabase/client"
import type { DiaryMovie } from "@/lib/diary"

// ─── Constants ────────────────────────────────────────────────────────────────

const BATCH_SIZE    = 50    // bulk-insert up to 50 rows per request
const BATCH_TIMEOUT = 12_000 // ms before we abort a batch request

// ─── Types ────────────────────────────────────────────────────────────────────

export type BatchImportResult = {
  inserted: number
  skipped:  number
  errors:   number
  total:    number
  cancelled:    boolean
  failedTitles: string[]
}

export type BatchImportProgress = {
  completed:    number
  total:        number
  batchIndex:   number
  batchCount:   number
  currentTitle: string
}

export type ProgressCallback = (progress: BatchImportProgress) => void

// ─── Minimal import row ───────────────────────────────────────────────────────
// Only the columns required to persist a Letterboxd entry.
// All review-layer, enrichment, and stat columns are intentionally omitted —
// they can be filled in asynchronously after import completes.

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "imported-film"
}

type ImportRow = {
  user_id:          string
  media_id:         string
  media_type:       string
  review_scope:     string
  show_id:          string
  season_number:    number
  episode_number:   number
  title:            string
  year:             number
  rating:           number | null
  letterboxd_rating: number | null
  review:           string
  watched_date:     string
  favourite:        boolean
  rewatch:          boolean
  contains_spoilers: boolean
  watched_in_cinema: boolean
  saved_at:         string
  genres:           string[]
  // Nullable enrichment — send null explicitly so the row is valid
  poster:           null
  creator:          null
  runtime:          null
  vote_average:     null
}

function buildRow(userId: string, entry: DiaryMovie): ImportRow {
  const mediaId =
    entry.id ||
    `letterboxd-${slugify(entry.title)}-${entry.year}`

  return {
    user_id:           userId,
    media_id:          mediaId,
    media_type:        entry.mediaType,
    // All Letterboxd entries are show-level.
    review_scope:      "show",
    show_id:           entry.showId || (entry.mediaType === "tv" ? mediaId : ""),
    // Use 0 (not null) so ON CONFLICT can match the full scope unique index.
    season_number:     0,
    episode_number:    0,
    title:             entry.title,
    year:              Number(entry.year) || 0,
    rating:            typeof entry.rating === "number" ? entry.rating : null,
    letterboxd_rating: typeof entry.letterboxdRating === "number" ? entry.letterboxdRating : null,
    review:            entry.review ?? "",
    watched_date:      entry.watchedDate,
    favourite:         entry.favourite ?? false,
    rewatch:           entry.rewatch ?? false,
    contains_spoilers: entry.containsSpoilers ?? false,
    watched_in_cinema: entry.watchedInCinema ?? false,
    saved_at:          entry.savedAt || `${entry.watchedDate}T12:00:00.000Z`,
    genres:            entry.genres ?? [],
    // Enrichment — null for now, can be filled asynchronously later
    poster:            null,
    creator:           null,
    runtime:           null,
    vote_average:      null,
  }
}

// ─── Deduplication ────────────────────────────────────────────────────────────

function deduplicateEntries(entries: DiaryMovie[]): DiaryMovie[] {
  const seen = new Set<string>()
  const out:  DiaryMovie[] = []
  for (const e of entries) {
    const mediaId = e.id || `letterboxd-${slugify(e.title)}-${e.year}`
    const key     = `${mediaId}::${e.watchedDate}`
    if (!seen.has(key)) {
      seen.add(key)
      out.push(e)
    }
  }
  return out
}

// ─── Timing helper ────────────────────────────────────────────────────────────

function ms(start: number) {
  return `${(performance.now() - start).toFixed(1)}ms`
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function batchImportLetterboxd(
  entries:    DiaryMovie[],
  onProgress: ProgressCallback,
  signal?:    AbortSignal,
  userId?:    string | null
): Promise<BatchImportResult> {
  const t0 = performance.now()
  console.log(`[IMPORT] ▶ start — ${entries.length} entries, userId: ${userId ? "ok" : "MISSING"}`)

  if (!userId) {
    throw new Error("You must be signed in to import your diary. Please refresh and try again.")
  }
  if (!isSupabaseConfigured()) {
    throw new Error("Database connection unavailable.")
  }

  const supabase = createSupabaseClient()
  if (!supabase) {
    throw new Error("Supabase client not available.")
  }

  // ── Step 1: Warm up auth session ──────────────────────────────────────────
  // This call resolves the cached JWT (and refreshes it if expired) BEFORE
  // the insert loop begins. Without this, the first insert awaits the token
  // refresh internally, adding 1–3s of hidden latency.
  onProgress({ completed: 0, total: entries.length, batchIndex: 0, batchCount: 0, currentTitle: "Checking auth…" })

  const tAuth = performance.now()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  console.log(`[IMPORT] auth session resolved — ${ms(tAuth)} | session: ${sessionData?.session ? "ok" : "null"} | error: ${sessionError?.message ?? "none"}`)

  if (!sessionData?.session) {
    throw new Error(
      `Auth session missing${sessionError ? `: ${sessionError.message}` : ""}. ` +
      "Please sign in again and retry."
    )
  }

  // ── Step 2: Prepare entries ────────────────────────────────────────────────
  const tPrep    = performance.now()
  const deduped  = deduplicateEntries(entries)
  const total    = deduped.length
  const batchCount = Math.ceil(total / BATCH_SIZE)
  console.log(`[IMPORT] ${total} unique entries → ${batchCount} batch(es) | prep: ${ms(tPrep)}`)

  let inserted   = 0
  let skipped    = 0
  let errors     = 0
  let cancelled  = false
  const failedTitles: string[] = []

  onProgress({ completed: 0, total, batchIndex: 0, batchCount, currentTitle: "" })

  // ── Step 3: Insert in batches ──────────────────────────────────────────────
  for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
    if (signal?.aborted) {
      console.log("[IMPORT] cancelled by user")
      cancelled = true
      break
    }

    const chunk      = deduped.slice(i, i + BATCH_SIZE)
    const batchIndex = Math.floor(i / BATCH_SIZE) + 1
    const firstTitle = chunk[0]!.title

    console.log(`[IMPORT] batch ${batchIndex}/${batchCount} — ${chunk.length} entries, first: "${firstTitle}"`)
    onProgress({ completed: i, total, batchIndex, batchCount, currentTitle: firstTitle })

    const rows = chunk.map((entry) => buildRow(userId, entry))

    // Log first row payload for debugging
    if (batchIndex === 1) {
      const s = rows[0]!
      console.log("[IMPORT] sample row:", {
        user_id:      s.user_id.slice(0, 8) + "…",
        media_id:     s.media_id,
        media_type:   s.media_type,
        review_scope: s.review_scope,
        season_number: s.season_number,
        episode_number: s.episode_number,
        title:        s.title,
        year:         s.year,
        rating:       s.rating,
        watched_date: s.watched_date,
      })
    }

    try {
      const ctrl  = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), BATCH_TIMEOUT)
      if (signal) {
        signal.addEventListener("abort", () => ctrl.abort(), { once: true })
      }

      const tInsert = performance.now()
      console.log(`[IMPORT] ⬆ supabase insert started — batch ${batchIndex}, ${rows.length} row(s)`)

      const { error } = await supabase
        .from("diary_entries")
        // ignoreDuplicates=true → ON CONFLICT DO NOTHING — skips existing entries
        // without overwriting user edits or counting as errors.
        .upsert(rows, {
          onConflict: "user_id,media_type,media_id,review_scope,season_number,episode_number",
          ignoreDuplicates: true,
        })

      clearTimeout(timer)
      const insertDuration = performance.now() - tInsert
      console.log(`[IMPORT] ⬇ supabase insert completed — batch ${batchIndex} | ${insertDuration.toFixed(1)}ms`)

      if (insertDuration > 5_000) {
        console.error(
          `[IMPORT] ⚠ insert took ${insertDuration.toFixed(0)}ms — over 5s threshold. ` +
          "This usually means RLS policy delay, a cold connection, or token refresh. " +
          "Check Supabase logs for this timestamp."
        )
      }

      if (error) {
        console.error(
          `[IMPORT] batch ${batchIndex} failed — code: ${error.code ?? "?"}, ` +
          `hint: ${error.hint ?? "none"}, message: ${error.message}`
        )
        // 23505 = unique_violation. With ignoreDuplicates this shouldn't fire,
        // but if it does (e.g. partial index from legacy null rows) count as skipped.
        if (error.code === "23505") {
          skipped += chunk.length
        } else {
          errors += chunk.length
          chunk.forEach((e) => failedTitles.push(`${e.title} [${error.code ?? "err"}]`))
        }
      } else {
        inserted += chunk.length
        console.log(`[IMPORT] batch ${batchIndex} ok — ${chunk.length} row(s) saved`)
      }
    } catch (err) {
      const isAbort = err instanceof Error && err.name === "AbortError"
      if (isAbort) {
        console.error(`[IMPORT] batch ${batchIndex} timed out after ${BATCH_TIMEOUT / 1000}s`)
        errors += chunk.length
        chunk.forEach((e) => failedTitles.push(`${e.title} [timeout]`))
      } else {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[IMPORT] batch ${batchIndex} exception: ${msg}`)
        errors += chunk.length
        chunk.forEach((e) => failedTitles.push(`${e.title} [${msg.slice(0, 40)}]`))
      }
    }

    onProgress({
      completed:    Math.min(i + chunk.length, total),
      total,
      batchIndex,
      batchCount,
      currentTitle: chunk[chunk.length - 1]!.title,
    })

    // Brief yield between batches to avoid overwhelming the connection pool
    if (!signal?.aborted && i + BATCH_SIZE < deduped.length) {
      await new Promise<void>((r) => setTimeout(r, 80))
    }
  }

  const totalDuration = performance.now() - t0
  console.log(
    `[IMPORT] ✓ complete — inserted: ${inserted}, skipped: ${skipped}, errors: ${errors}, ` +
    `cancelled: ${cancelled} | total: ${totalDuration.toFixed(1)}ms`
  )

  return { inserted, skipped, errors, total: inserted + skipped, cancelled, failedTitles }
}
