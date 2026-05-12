"use client"

import { createClient } from "@/lib/supabase/client"
import type { DiaryMovie } from "@/lib/diary"

// ─── Constants ────────────────────────────────────────────────────────────────

const BATCH_SIZE = 25

// ─── Types ────────────────────────────────────────────────────────────────────

export type BatchImportResult = {
  inserted: number
  updated: number
  errors: number
  total: number
  cancelled: boolean
}

export type BatchImportProgress = {
  completed: number
  total: number
  batchIndex: number
  batchCount: number
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
    // Import leaves review layers and score null — user can enrich via modal later
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
  }
}

// ─── Deduplication ────────────────────────────────────────────────────────────

// When the CSV has multiple entries for the same film (rewatches), keep all of
// them unless they share the exact same (media_id, review_scope, watched_date).
// Letterboxd diary.csv legitimately has multiple rows for rewatches.
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

// ─── Main export ──────────────────────────────────────────────────────────────

export async function batchImportLetterboxd(
  entries: DiaryMovie[],
  onProgress: ProgressCallback,
  signal?: AbortSignal
): Promise<BatchImportResult> {
  const client = createClient()
  if (!client) throw new Error("Database connection unavailable.")

  const {
    data: { session },
  } = await client.auth.getSession()
  if (!session) throw new Error("Sign in to import your diary.")

  const userId = session.user.id
  const deduped = deduplicateEntries(entries)
  const total = deduped.length
  const batchCount = Math.ceil(total / BATCH_SIZE)

  // Fetch existing media_ids so we can count inserted vs updated
  const existingKeys = new Set<string>()
  try {
    let offset = 0
    while (true) {
      const { data } = await client
        .from("diary_entries")
        .select("media_id, media_type, review_scope, season_number, episode_number")
        .eq("user_id", userId)
        .range(offset, offset + 999)
      if (!data || data.length === 0) break
      for (const row of data) {
        existingKeys.add(
          `${row.media_type}::${row.media_id}::${row.review_scope}::${row.season_number ?? 0}::${row.episode_number ?? 0}`
        )
      }
      if (data.length < 1000) break
      offset += 1000
    }
  } catch {
    // Non-fatal — just won't distinguish inserted from updated
  }

  let inserted = 0
  let updated = 0
  let errors = 0
  let cancelled = false

  onProgress({ completed: 0, total, batchIndex: 0, batchCount })

  for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
    if (signal?.aborted) {
      cancelled = true
      break
    }

    const chunk = deduped.slice(i, i + BATCH_SIZE)
    const rows = chunk.map((e) => buildRow(userId, e))
    const batchIndex = Math.floor(i / BATCH_SIZE) + 1

    try {
      const { error } = await client.from("diary_entries").upsert(rows, {
        onConflict:
          "user_id,media_type,media_id,review_scope,season_number,episode_number",
      })

      if (error) {
        errors += chunk.length
      } else {
        for (const row of rows) {
          const key = `${row.media_type}::${row.media_id}::${row.review_scope}::${row.season_number ?? 0}::${row.episode_number ?? 0}`
          if (existingKeys.has(key)) {
            updated++
          } else {
            inserted++
          }
        }
      }
    } catch {
      errors += chunk.length
    }

    onProgress({ completed: Math.min(i + BATCH_SIZE, total), total, batchIndex, batchCount })

    // Yield to the UI thread between batches so the progress bar actually renders
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
  }

  return { inserted, updated, errors, total: inserted + updated, cancelled }
}
