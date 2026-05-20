"use client"

import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/config"
import { createClient as createSupabaseClient } from "@/lib/supabase/client"
import type { DiaryMovie } from "@/lib/diary"

// ─── Constants ────────────────────────────────────────────────────────────────

const BATCH_SIZE    = 50   // bulk-insert up to 50 rows per request
const BATCH_TIMEOUT = 10_000 // ms before we abort a batch request

// ─── Types ────────────────────────────────────────────────────────────────────

export type BatchImportResult = {
  inserted: number
  errors: number
  total: number
  cancelled: boolean
  failedTitles: string[]
}

export type BatchImportProgress = {
  completed: number
  total: number
  batchIndex: number
  batchCount: number
  currentTitle: string
}

export type ProgressCallback = (progress: BatchImportProgress) => void

// ─── Row builder ──────────────────────────────────────────────────────────────

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "imported-film"
}

type DiaryRow = ReturnType<typeof buildRow>

function buildRow(userId: string, entry: DiaryMovie) {
  const mediaId =
    entry.id ||
    `letterboxd-${slugify(entry.title)}-${entry.year}`

  // All Letterboxd entries are show/title level (not season or episode).
  // Migration 20260409_tv_review_scopes.sql converted all "title" rows to "show"
  // and the partial unique index is on (user_id, media_id) WHERE review_scope = 'show'.
  const reviewScope = "show"

  return {
    user_id:           userId,
    media_id:          mediaId,
    media_type:        entry.mediaType,
    review_scope:      reviewScope,
    show_id:           entry.showId || (entry.mediaType === "tv" ? mediaId : ""),
    season_number:     null,
    episode_number:    null,
    title:             entry.title,
    poster:            entry.poster ?? null,
    year:              Number(entry.year) || 0,
    creator:           entry.director ?? null,
    genres:            entry.genres ?? [],
    runtime:           typeof entry.runtime === "number" ? entry.runtime : null,
    vote_average:      typeof entry.voteAverage === "number" ? entry.voteAverage : null,
    rating:            typeof entry.rating === "number" ? entry.rating : null,
    review:            entry.review ?? "",
    watched_date:      entry.watchedDate,
    favourite:         entry.favourite ?? false,
    rewatch:           entry.rewatch ?? false,
    contains_spoilers: entry.containsSpoilers ?? false,
    watched_in_cinema: entry.watchedInCinema ?? false,
    saved_at:          entry.savedAt || `${entry.watchedDate}T12:00:00.000Z`,
    score_rating:            null,
    cinematography_rating:   null,
    writing_rating:          null,
    performances_rating:     null,
    direction_rating:        null,
    rewatchability_rating:   null,
    emotional_impact_rating: null,
    entertainment_rating:    null,
    reelshelf_score:         null,
    attachment_url:          null,
    attachment_type:         null,
    letterboxd_rating:       typeof entry.letterboxdRating === "number" ? entry.letterboxdRating : null,
  }
}

// ─── Deduplication ────────────────────────────────────────────────────────────

function deduplicateEntries(entries: DiaryMovie[]): DiaryMovie[] {
  const seen = new Set<string>()
  const out: DiaryMovie[] = []
  for (const e of entries) {
    const mediaId = e.id || `letterboxd-${slugify(e.title)}-${e.year}`
    const key = `${mediaId}::${e.watchedDate}`
    if (!seen.has(key)) {
      seen.add(key)
      out.push(e)
    }
  }
  return out
}

// ─── Main export ──────────────────────────────────────────────────────────────
//
// Uses the Supabase JS client directly (like normal diary saves do), rather than
// raw fetch + token management. The client handles auth internally and will call
// getSession() once per batch. For 1-entry imports, that's 1 call; for 50-entry
// imports, that's 1 call. This matches the production diary save pattern.

export async function batchImportLetterboxd(
  entries: DiaryMovie[],
  onProgress: ProgressCallback,
  signal?: AbortSignal,
  userId?: string | null
): Promise<BatchImportResult> {
  console.log(`[IMPORT] ▶ start — ${entries.length} entries, userId: ${userId ? "ok" : "missing"}`)

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

  onProgress({ completed: 0, total: entries.length, batchIndex: 0, batchCount: 0, currentTitle: "Preparing entries…" })

  const deduped    = deduplicateEntries(entries)
  const total      = deduped.length
  const batchCount = Math.ceil(total / BATCH_SIZE)

  console.log(`[IMPORT] ${total} unique entries → ${batchCount} batch${batchCount === 1 ? "" : "es"} of up to ${BATCH_SIZE}`)

  let inserted    = 0
  let errors      = 0
  let cancelled   = false
  const failedTitles: string[] = []

  onProgress({ completed: 0, total, batchIndex: 0, batchCount, currentTitle: "" })

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
      const sample = rows[0]
      console.log("[IMPORT] first row payload:", {
        user_id:      sample?.user_id.slice(0, 8) + "…",
        media_id:     sample?.media_id,
        media_type:   sample?.media_type,
        review_scope: sample?.review_scope,
        title:        sample?.title,
        rating:       sample?.rating,
        watched_date: sample?.watched_date,
      })
    }

    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), BATCH_TIMEOUT)

      // Merge timeout signal with caller's cancel signal
      if (signal) {
        signal.addEventListener("abort", () => ctrl.abort(), { once: true })
      }

      console.log(`[IMPORT] inserting batch ${batchIndex} — ${rows.length} rows`)

      const { error } = await supabase
        .from("diary_entries")
        .insert(rows)
        .abortSignal(ctrl.signal as any) // Note: type mismatch but Supabase supports this

      clearTimeout(timer)

      if (error) {
        console.error(`[IMPORT] batch ${batchIndex} failed — code: ${error.code}, message: ${error.message}`)
        errors += chunk.length
        chunk.forEach((e) => failedTitles.push(e.title))
      } else {
        inserted += chunk.length
        console.log(`[IMPORT] batch ${batchIndex} ok — ${chunk.length} rows saved`)
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        console.error(`[IMPORT] batch ${batchIndex} timed out after ${BATCH_TIMEOUT / 1000}s`)
      } else {
        const msg = err instanceof Error ? err.message : "Unknown error"
        console.error(`[IMPORT] batch ${batchIndex} exception:`, msg)
      }
      errors += chunk.length
      chunk.forEach((e) => failedTitles.push(e.title))
    }

    // Advance progress to end of this batch
    onProgress({
      completed: Math.min(i + BATCH_SIZE, total),
      total,
      batchIndex,
      batchCount,
      currentTitle: chunk[chunk.length - 1]!.title,
    })

    // Brief pause between batches to avoid overwhelming the connection pool
    if (!signal?.aborted && i + BATCH_SIZE < deduped.length) {
      await new Promise<void>((resolve) => setTimeout(resolve, 80))
    }
  }

  console.log(`[IMPORT] ✓ complete — ${inserted} inserted, ${errors} errors, ${cancelled ? "cancelled" : "finished"}`)
  return { inserted, errors, total: inserted, cancelled, failedTitles }
}
