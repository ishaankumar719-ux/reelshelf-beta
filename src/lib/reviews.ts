"use client"

import { createClient as createSupabaseClient } from "@/lib/supabase/client"
import { DIARY_SELECT } from "@/lib/queries"
import type { Review, ReviewScope, UpsertReviewInput } from "@/src/types/reviews"

type DiaryReviewRow = {
  id: string
  user_id: string
  media_id: string
  media_type: "movie" | "tv"
  review_scope: ReviewScope | "title"
  season_number: number
  episode_number: number
  rating: number | null
  review: string
  contains_spoilers: boolean | null
  watched_date: string | null
  created_at: string
  updated_at: string
}

type ReviewLookupOptions = {
  aliases?: string[]
}

function toDbMediaType(mediaType: UpsertReviewInput["media_type"]) {
  return mediaType === "film" ? "movie" : "tv"
}

function normalizeNumericId(value: string) {
  const direct = Number(value)

  if (Number.isFinite(direct) && direct > 0) {
    return direct
  }

  const match = value.match(/(\d+)/)
  return match ? Number(match[1]) : 0
}

function normalizeScope(value: DiaryReviewRow["review_scope"]): ReviewScope {
  return value === "season" || value === "episode" ? value : "show"
}

function mapRowToReview(row: DiaryReviewRow): Review {
  return {
    id: row.id,
    user_id: row.user_id,
    media_id: normalizeNumericId(row.media_id),
    media_type: row.media_type === "movie" ? "film" : "series",
    review_scope: normalizeScope(row.review_scope),
    season_number: row.season_number > 0 ? row.season_number : null,
    episode_number: row.episode_number > 0 ? row.episode_number : null,
    rating: typeof row.rating === "number" ? row.rating : null,
    body: row.review?.trim() ? row.review : null,
    contains_spoilers: Boolean(row.contains_spoilers),
    watched_on: row.watched_date || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function buildMediaIdCandidates(mediaId: number, aliases?: string[]) {
  return Array.from(
    new Set([String(mediaId), ...(aliases || []).filter(Boolean)])
  )
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

export async function upsertReview(
  userId: string,
  input: UpsertReviewInput
): Promise<{ data: Review | null; error: string | null }> {
  const supabase = createSupabaseClient()

  if (!supabase) {
    return { data: null, error: "Supabase is not configured." }
  }

  const payload = {
    user_id: userId,
    media_id: String(input.media_id),
    show_id: String(input.media_id),
    media_type: toDbMediaType(input.media_type),
    review_scope: input.review_scope ?? "show",
    season_number: input.season_number ?? 0,
    episode_number: input.episode_number ?? 0,
    rating: typeof input.rating === "number" ? input.rating : null,
    review: input.body?.trim() || "",
    contains_spoilers: Boolean(input.contains_spoilers),
    watched_date: input.watched_on ?? todayIsoDate(),
    title: input.title?.trim() || "Untitled",
    poster: input.poster_path?.trim() || null,
    year: input.year ?? 0,
    creator: input.creator?.trim() || null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from("diary_entries")
    .upsert(payload, {
      onConflict:
        "user_id,media_type,media_id,review_scope,season_number,episode_number",
    })
    .select(DIARY_SELECT)
    .maybeSingle()

  if (error) {
    return { data: null, error: error.message || "Could not save review." }
  }

  return {
    data: data ? mapRowToReview((data as unknown) as DiaryReviewRow) : null,
    error: null,
  }
}

export async function getReview(
  userId: string,
  mediaId: number,
  scope: ReviewScope,
  seasonNumber?: number | null,
  episodeNumber?: number | null,
  options?: ReviewLookupOptions
): Promise<Review | null> {
  const supabase = createSupabaseClient()

  if (!supabase) {
    return null
  }

  const candidates = buildMediaIdCandidates(mediaId, options?.aliases)
  const { data, error } = await supabase
    .from("diary_entries")
    .select(DIARY_SELECT)
    .eq("user_id", userId)
    .eq("media_type", "tv")
    .in("media_id", candidates)
    .eq("review_scope", scope)
    .eq("season_number", seasonNumber ?? 0)
    .eq("episode_number", episodeNumber ?? 0)
    .order("updated_at", { ascending: false })
    .limit(1)

  if (error || !data?.length) {
    return null
  }

  return mapRowToReview((data[0] as unknown) as DiaryReviewRow)
}

export async function getAllShowReviews(
  userId: string,
  mediaId: number,
  options?: ReviewLookupOptions
): Promise<{
  showReview: Review | null
  seasonReviews: Review[]
  episodeReviews: Review[]
}> {
  const supabase = createSupabaseClient()

  if (!supabase) {
    return {
      showReview: null,
      seasonReviews: [],
      episodeReviews: [],
    }
  }

  const candidates = buildMediaIdCandidates(mediaId, options?.aliases)
  const { data, error } = await supabase
    .from("diary_entries")
    .select(DIARY_SELECT)
    .eq("user_id", userId)
    .eq("media_type", "tv")
    .in("media_id", candidates)
    .in("review_scope", ["show", "season", "episode"])
    .order("season_number", { ascending: true })
    .order("episode_number", { ascending: true })
    .order("updated_at", { ascending: false })

  if (error || !data) {
    return {
      showReview: null,
      seasonReviews: [],
      episodeReviews: [],
    }
  }

  const reviews = ((data as unknown) as DiaryReviewRow[]).map(mapRowToReview)

  return {
    showReview: reviews.find((review) => review.review_scope === "show") || null,
    seasonReviews: reviews
      .filter((review) => review.review_scope === "season")
      .sort((left, right) => (left.season_number || 0) - (right.season_number || 0)),
    episodeReviews: reviews
      .filter((review) => review.review_scope === "episode")
      .sort((left, right) => {
        const seasonDelta = (left.season_number || 0) - (right.season_number || 0)
        if (seasonDelta !== 0) return seasonDelta
        return (left.episode_number || 0) - (right.episode_number || 0)
      }),
  }
}

export async function deleteReview(
  userId: string,
  mediaId: number,
  scope: ReviewScope,
  seasonNumber?: number | null,
  episodeNumber?: number | null,
  options?: ReviewLookupOptions
): Promise<{ error: string | null }> {
  const supabase = createSupabaseClient()

  if (!supabase) {
    return { error: "Supabase is not configured." }
  }

  const candidates = buildMediaIdCandidates(mediaId, options?.aliases)
  const { error } = await supabase
    .from("diary_entries")
    .delete()
    .eq("user_id", userId)
    .eq("media_type", "tv")
    .in("media_id", candidates)
    .eq("review_scope", scope)
    .eq("season_number", seasonNumber ?? 0)
    .eq("episode_number", episodeNumber ?? 0)

  return { error: error?.message || null }
}

export async function getShowAverageRating(mediaId: number): Promise<number | null> {
  const supabase = createSupabaseClient()

  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from("diary_entries")
    .select(DIARY_SELECT)
    .eq("media_type", "tv")
    .eq("media_id", String(mediaId))
    .eq("review_scope", "show")
    .not("rating", "is", null)

  if (error || !data?.length) {
    return null
  }

  const ratings = (((data || []) as unknown) as Array<{ rating: number | null }>)
    .map((row) => (typeof row.rating === "number" ? row.rating : null))
    .filter((value): value is number => value !== null)

  if (!ratings.length) {
    return null
  }

  return Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1))
}
