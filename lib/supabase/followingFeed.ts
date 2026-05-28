"use client"

import { createClient } from "@/lib/supabase/client"
import type { ActivityEvent, ActivityType } from "@/lib/activity"

type FeedDiaryRow = {
  id: string
  media_id: string | null
  title: string
  media_type: "movie" | "tv" | "book"
  poster: string | null
  rating: number | null
  review: string | null
  favourite: boolean | null
  watched_in_cinema: boolean | null
  created_at: string
  user_id: string
  score_rating: number | null
  cinematography_rating: number | null
  writing_rating: number | null
  performances_rating: number | null
  direction_rating: number | null
  rewatchability_rating: number | null
  emotional_impact_rating: number | null
  entertainment_rating: number | null
}

function feedRowHasReviewContent(row: FeedDiaryRow): boolean {
  if (row.review?.trim()) return true
  return !!(
    row.score_rating !== null ||
    row.cinematography_rating !== null ||
    row.writing_rating !== null ||
    row.performances_rating !== null ||
    row.direction_rating !== null ||
    row.rewatchability_rating !== null ||
    row.emotional_impact_rating !== null ||
    row.entertainment_rating !== null
  )
}

type FeedProfile = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

function toRating(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = parseFloat(String(value))
  return Number.isNaN(parsed) ? null : parsed
}

// ─── Ranking utilities ────────────────────────────────────────────────────────

function scoreFeedRow(row: FeedDiaryRow): number {
  let score = 0
  const hasReview = feedRowHasReviewContent(row)
  if (hasReview) score += 10
  if (row.favourite) score += 5

  const rating = toRating(row.rating)
  if (rating !== null) {
    if (rating >= 8) score += 8
    else if (rating >= 6) score += 4
  }

  const hoursAgo =
    (Date.now() - new Date(row.created_at).getTime()) / 3_600_000
  if (hoursAgo < 6) score += 8
  else if (hoursAgo < 24) score += 6
  else if (hoursAgo < 72) score += 4
  else if (hoursAgo < 168) score += 2

  return score
}

// Redistribute entries so the same user never appears consecutively and
// content types alternate where possible — without discarding high-scored entries.
function distributeEntries(
  scored: Array<FeedDiaryRow & { _score: number }>,
  limit: number
): FeedDiaryRow[] {
  const result: Array<FeedDiaryRow & { _score: number }> = []
  const deferred: Array<FeedDiaryRow & { _score: number }> = []

  for (const entry of scored) {
    const len = result.length
    const lastUser = result[len - 1]?.user_id
    const prevUser = result[len - 2]?.user_id
    const lastType = result[len - 1]?.media_type
    const prevType = result[len - 2]?.media_type

    const sameUserAsLast = entry.user_id === lastUser
    const clustersSameType =
      entry.media_type === lastType && entry.media_type === prevType

    if ((sameUserAsLast || clustersSameType) && result.length >= 2) {
      deferred.push(entry)
    } else {
      result.push(entry)
      if (result.length >= limit) break
    }
  }

  // Fill remaining slots with deferred entries
  for (const entry of deferred) {
    if (result.length >= limit) break
    result.push(entry)
  }

  return result.slice(0, limit)
}

export async function fetchFollowingFeed(
  userId: string,
  limit = 30
): Promise<ActivityEvent[]> {
  const client = createClient()
  if (!client) return []

  const { data: followData } = await client
    .from("followers")
    .select("following_id")
    .eq("follower_id", userId)

  if (!followData || followData.length === 0) return []

  const followedIds = followData.map((f) => f.following_id as string)

  // Fetch more than `limit` so we have room to rerank and redistribute
  const fetchLimit = Math.min(limit * 2, 60)

  const [{ data: diaryData }, { data: profileData }] = await Promise.all([
    client
      .from("diary_entries")
      .select(
        "id, media_id, title, media_type, poster, rating, review, favourite, watched_in_cinema, created_at, user_id, score_rating, cinematography_rating, writing_rating, performances_rating, direction_rating, rewatchability_rating, emotional_impact_rating, entertainment_rating"
      )
      .in("user_id", followedIds)
      .in("review_scope", ["show", "title"])
      .order("created_at", { ascending: false })
      .limit(fetchLimit),
    client
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", followedIds),
  ])

  if (!diaryData) return []

  const profileMap = new Map<string, FeedProfile>(
    (profileData ?? []).map((p) => [p.id, p as FeedProfile])
  )

  // Score and sort
  const rows = diaryData as FeedDiaryRow[]
  const scored = rows
    .map((row) => ({ ...row, _score: scoreFeedRow(row) }))
    .sort((a, b) => b._score - a._score)

  // Distribute: prevent consecutive same-user and content-type clustering
  const distributed = distributeEntries(scored, limit)

  return distributed.map((row) => {
    const profile = profileMap.get(row.user_id) ?? {
      id: row.user_id,
      username: null,
      display_name: null,
      avatar_url: null,
    }

    const hasReview = feedRowHasReviewContent(row)
    const isTV = row.media_type === "tv"
    const type: ActivityType = row.favourite
      ? "added_favourite"
      : isTV
        ? "watched_episode"
        : hasReview
          ? "reviewed"
          : "logged"

    return {
      id: `following-diary-${row.id}`,
      type,
      user_id: row.user_id,
      profile: {
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
      },
      title: row.title,
      media_type: row.media_type,
      media_id: row.media_id ?? null,
      diary_entry_id: row.id,
      poster: row.poster ?? null,
      rating: toRating(row.rating),
      review: row.review?.trim() || null,
      watchedInCinema: row.watched_in_cinema ?? false,
      timestamp: row.created_at,
      isBatch: false,
    } satisfies ActivityEvent
  })
}
