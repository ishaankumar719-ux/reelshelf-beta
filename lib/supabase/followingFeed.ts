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
  watched_in_cinema: boolean | null
  created_at: string
  user_id: string
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

export async function fetchFollowingFeed(
  userId: string,
  limit = 30
): Promise<ActivityEvent[]> {
  const client = createClient()
  if (!client) return []

  // Step 1: who does this user follow?
  const { data: followData } = await client
    .from("followers")
    .select("following_id")
    .eq("follower_id", userId)

  if (!followData || followData.length === 0) return []

  const followedIds = followData.map((f) => f.following_id as string)

  // Step 2: fetch their recent diary entries + profiles in parallel
  const [{ data: diaryData }, { data: profileData }] = await Promise.all([
    client
      .from("diary_entries")
      .select("id, media_id, title, media_type, poster, rating, review, watched_in_cinema, created_at, user_id")
      .in("user_id", followedIds)
      .in("review_scope", ["show", "title"])
      .order("created_at", { ascending: false })
      .limit(limit),
    client
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", followedIds),
  ])

  if (!diaryData) return []

  const profileMap = new Map<string, FeedProfile>(
    (profileData ?? []).map((p) => [p.id, p as FeedProfile])
  )

  return (diaryData as FeedDiaryRow[]).map((row) => {
    const profile = profileMap.get(row.user_id) ?? {
      id: row.user_id,
      username: null,
      display_name: null,
      avatar_url: null,
    }

    const hasReview = Boolean(row.review?.trim())
    const isTV = row.media_type === "tv"
    const type: ActivityType = isTV
      ? "finished_series"
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
