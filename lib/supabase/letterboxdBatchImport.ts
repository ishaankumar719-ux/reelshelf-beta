"use client"

import { createClient } from "@/lib/supabase/client"
import type { DiaryMovie } from "@/lib/diary"

// ─── Constants ────────────────────────────────────────────────────────────────

const BATCH_SIZE    = 8   // small batches → frequent progress updates
const ENTRY_TIMEOUT = 12_000 // ms per entry before we skip and continue

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

function buildRow(userId: string, entry: DiaryMovie) {
  const mediaId =
    entry.id ||
    `letterboxd-${slugify(entry.title)}-${entry.year}`

  const reviewScope = entry.reviewScope || (entry.mediaType === "tv" ? "show" : "title")

  return {
    user_id: userId,
    media_id: mediaId,
    media_type: entry.mediaType,
    review_scope: reviewScope,
    show_id: entry.showId || (entry.mediaType === "tv" ? mediaId : ""),
    season_number: entry.seasonNumber ?? 0,
    episode_number: entry.episodeNumber ?? 0,
    title: entry.title,
    poster: entry.poster ?? null,
    year: Number(entry.year) || 0,
    creator: entry.director ?? null,
    genres: entry.genres ?? [],
    runtime: typeof entry.runtime === "number" ? entry.runtime : null,
    vote_average: typeof entry.voteAverage === "number" ? entry.voteAverage : null,
    rating: typeof entry.rating === "number" ? entry.rating : null,
    review: entry.review ?? "",
    watched_date: entry.watchedDate,
    favourite: entry.favourite ?? false,
    rewatch: entry.rewatch ?? false,
    contains_spoilers: entry.containsSpoilers ?? false,
    watched_in_cinema: entry.watchedInCinema ?? false,
    saved_at: entry.savedAt || `${entry.watchedDate}T12:00:00.000Z`,
    score_rating: null,
    cinematography_rating: null,
    writing_rating: null,
    performances_rating: null,
    direction_rating: null,
    rewatchability_rating: null,
    emotional_impact_rating: null,
    entertainment_rating: null,
    reelshelf_score: null,
    attachment_url: null,
    attachment_type: null,
    letterboxd_rating: typeof entry.letterboxdRating === "number" ? entry.letterboxdRating : null,
  }
}

// ─── Deduplication ────────────────────────────────────────────────────────────

function deduplicateEntries(entries: DiaryMovie[]): DiaryMovie[] {
  const seen = new Set<string>()
  const out: DiaryMovie[] = []
  for (const e of entries) {
    const mediaId = e.id || `letterboxd-${slugify(e.title)}-${e.year}`
    const scope = e.reviewScope || (e.mediaType === "tv" ? "show" : "title")
    const key = `${mediaId}::${scope}::${e.watchedDate}`
    if (!seen.has(key)) {
      seen.add(key)
      out.push(e)
    }
  }
  return out
}

// ─── Single-row insert with timeout ──────────────────────────────────────────

async function insertRow(
  client: NonNullable<ReturnType<typeof createClient>>,
  row: ReturnType<typeof buildRow>
): Promise<{ error: string | null }> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.warn(`[IMPORT] timeout inserting: ${row.title}`)
      resolve({ error: "Timed out" })
    }, ENTRY_TIMEOUT)

    void (async () => {
      try {
        const { error } = await client
          .from("diary_entries")
          .upsert(row, {
            onConflict:
              "user_id,media_type,media_id,review_scope,season_number,episode_number",
            ignoreDuplicates: true,
          })
        clearTimeout(timer)
        if (error) {
          console.error(`[IMPORT] DB error for "${row.title}":`, error.message, error.code)
          resolve({ error: error.message })
        } else {
          console.log(`[IMPORT] saved: "${row.title}" (${row.watched_date})`)
          resolve({ error: null })
        }
      } catch (err: unknown) {
        clearTimeout(timer)
        const msg = err instanceof Error ? err.message : "Unknown error"
        console.error(`[IMPORT] exception for "${row.title}":`, msg)
        resolve({ error: msg })
      }
    })()
  })
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function batchImportLetterboxd(
  entries: DiaryMovie[],
  onProgress: ProgressCallback,
  signal?: AbortSignal
): Promise<BatchImportResult> {
  console.log(`[IMPORT] starting — ${entries.length} entries`)

  const client = createClient()
  if (!client) throw new Error("Database connection unavailable.")

  const { data: { session } } = await client.auth.getSession()
  if (!session) throw new Error("Sign in to import your diary.")

  const userId     = session.user.id
  const deduped    = deduplicateEntries(entries)
  const total      = deduped.length
  const batchCount = Math.ceil(total / BATCH_SIZE)

  console.log(`[IMPORT] ${deduped.length} unique entries across ${batchCount} batches`)

  let inserted     = 0
  let errors       = 0
  let cancelled    = false
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

    console.log(`[IMPORT] batch ${batchIndex}/${batchCount} — ${chunk.length} entries`)

    for (let j = 0; j < chunk.length; j++) {
      if (signal?.aborted) { cancelled = true; break }

      const entry = chunk[j]!
      const row   = buildRow(userId, entry)
      const completed = i + j

      console.log(`[IMPORT] inserting (${completed + 1}/${total}): "${entry.title}"`)

      onProgress({
        completed,
        total,
        batchIndex,
        batchCount,
        currentTitle: entry.title,
      })

      const { error } = await insertRow(client, row)

      if (error) {
        errors++
        failedTitles.push(entry.title)
      } else {
        inserted++
      }

      // Yield to the React event loop so the progress bar re-renders
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
    }

    console.log(`[IMPORT] batch ${batchIndex} done — ${inserted} saved so far, ${errors} errors`)

    // Brief pause between batches to avoid overwhelming the connection pool
    if (!signal?.aborted && i + BATCH_SIZE < deduped.length) {
      await new Promise<void>((resolve) => setTimeout(resolve, 80))
    }
  }

  console.log(`[IMPORT] complete — ${inserted} inserted, ${errors} errors`)

  return { inserted, errors, total: inserted, cancelled, failedTitles }
}
