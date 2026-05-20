"use client"

import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/config"
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

// ─── Bulk insert via raw fetch ────────────────────────────────────────────────
//
// We bypass the Supabase JS client for actual inserts. The client internally
// calls getSession() before every request to build auth headers. If the access
// token has just expired, getSession() triggers a network token-refresh call
// that can hang indefinitely — causing every insert to timeout.
//
// Instead we use raw fetch() with the access token that AuthProvider already
// resolved when the user loaded the page. onAuthStateChange keeps it current.
//
// Prefer: resolution=ignore-duplicates → ON CONFLICT DO NOTHING (no target
// column list needed, so it works with partial unique indexes).

async function bulkInsert(
  supabaseUrl: string,
  supabaseKey: string,
  accessToken: string,
  rows: DiaryRow[],
  signal?: AbortSignal
): Promise<{ error: string | null; httpStatus?: number }> {
  const ctrl  = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), BATCH_TIMEOUT)

  // Merge our timeout signal with the caller's cancel signal
  if (signal) {
    signal.addEventListener("abort", () => ctrl.abort(), { once: true })
  }

  const url = `${supabaseUrl}/rest/v1/diary_entries`
  console.log(`[IMPORT] fetch → POST ${url} (${rows.length} rows, timeout ${BATCH_TIMEOUT / 1000}s)`)

  try {
    const resp = await fetch(url, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "apikey":        supabaseKey,
        // ON CONFLICT DO NOTHING — works with partial unique indexes unlike
        // the onConflict column-list approach (which requires a non-partial index).
        "Prefer":        "return=minimal,resolution=ignore-duplicates",
      },
      body:   JSON.stringify(rows),
      signal: ctrl.signal,
    })

    clearTimeout(timer)
    console.log(`[IMPORT] fetch ← ${resp.status} ${resp.statusText}`)

    if (!resp.ok) {
      const body = await resp.json().catch(() => null) as Record<string, unknown> | null
      const code    = (body?.code as string | undefined)    ?? String(resp.status)
      const message = (body?.message as string | undefined) ?? resp.statusText
      console.error(`[IMPORT] batch failed — HTTP ${resp.status}, code: ${code}, message: ${message}`, body)
      return { error: `${code}: ${message}`, httpStatus: resp.status }
    }

    return { error: null }
  } catch (err) {
    clearTimeout(timer)

    if (err instanceof Error && err.name === "AbortError") {
      if (signal?.aborted) return { error: "Cancelled" }
      console.error(`[IMPORT] batch timed out after ${BATCH_TIMEOUT / 1000}s — supabaseUrl: ${supabaseUrl}`)
      return { error: `Timed out after ${BATCH_TIMEOUT / 1000}s — the insert request did not respond. Check Supabase RLS or network connectivity.` }
    }

    const msg = err instanceof Error ? err.message : "Network error"
    console.error("[IMPORT] batch exception:", msg)
    return { error: msg }
  } finally {
    clearTimeout(timer)
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function batchImportLetterboxd(
  entries: DiaryMovie[],
  onProgress: ProgressCallback,
  signal?: AbortSignal,
  userId?: string | null,
  accessToken?: string | null
): Promise<BatchImportResult> {
  console.log(`[IMPORT] ▶ start — ${entries.length} entries, userId: ${userId ? "ok" : "missing"}, token: ${accessToken ? "ok" : "missing"}`)

  if (!userId) {
    throw new Error("You must be signed in to import your diary. Please refresh and try again.")
  }
  if (!accessToken) {
    throw new Error("Auth token unavailable. Please refresh the page and try again.")
  }
  if (!isSupabaseConfigured()) {
    throw new Error("Database connection unavailable.")
  }

  const { url: supabaseUrl, publishableKey: supabaseKey } = getSupabaseEnv()
  console.log(`[IMPORT] supabaseUrl: ${supabaseUrl ? "ok" : "MISSING"}, entries: ${entries.length}`)

  // Firing onProgress immediately confirms the function was entered and the
  // React state setter is reachable. If the UI stays on "Starting…" after this
  // log, the issue is between here and the first batch — not in the auth step.
  console.log("[IMPORT] firing first onProgress — if UI still shows Starting… after this, check React rendering")
  onProgress({ completed: 0, total: entries.length, batchIndex: 0, batchCount: 0, currentTitle: "Preparing entries…" })
  console.log("[IMPORT] first onProgress fired")

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

    // Log the first row payload so we can verify user_id, media_id, etc. before insert
    if (batchIndex === 1) {
      const sample = rows[0]
      console.log("[IMPORT] first row payload:", {
        user_id:      sample?.user_id ? `${sample.user_id.slice(0, 8)}…` : "MISSING",
        media_id:     sample?.media_id,
        media_type:   sample?.media_type,
        review_scope: sample?.review_scope,
        title:        sample?.title,
        rating:       sample?.rating,
        watched_date: sample?.watched_date,
      })
    }

    const { error, httpStatus } = await bulkInsert(supabaseUrl, supabaseKey, accessToken, rows, signal)

    if (error) {
      if (httpStatus === 401 || httpStatus === 403) {
        // Auth error — no point continuing, every subsequent batch will fail too
        console.error("[IMPORT] auth error — stopping import")
        throw new Error("Session expired during import. Please refresh and try again.")
      }

      errors += chunk.length
      chunk.forEach((e) => failedTitles.push(e.title))
      console.error(`[IMPORT] batch ${batchIndex} failed: ${error}`)
    } else {
      inserted += chunk.length
      console.log(`[IMPORT] batch ${batchIndex} ok — ${chunk.length} rows saved`)
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
