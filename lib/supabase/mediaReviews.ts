"use client"

import { createClient } from "@/lib/supabase/client"
import type { ReviewLayers } from "@/types/diary"

export type MediaReview = {
  entryId: string
  userId: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  rating: number | null
  reelshelfScore: number | null
  review: string
  watchedDate: string
  savedAt: string
  reviewLayers: ReviewLayers | null
  favourite: boolean
  rewatch: boolean
  containsSpoilers: boolean
  watchedInCinema: boolean
  attachmentUrl: string | null
  attachmentType: "image" | "gif" | null
  reviewCoverUrl: string | null
  reviewCoverSource: "default" | "tmdb_poster" | "tmdb_backdrop" | "upload" | null
}

const ENTRY_SELECT =
  "id, user_id, rating, reelshelf_score, review, watched_date, saved_at, favourite, rewatch, contains_spoilers, watched_in_cinema, attachment_url, attachment_type, review_cover_url, review_cover_source, score_rating, cinematography_rating, writing_rating, performances_rating, direction_rating, rewatchability_rating, emotional_impact_rating, entertainment_rating"

type RawEntry = {
  id: string
  user_id: string
  rating: number | null
  reelshelf_score: number | null
  review: string | null
  watched_date: string | null
  saved_at: string
  favourite: boolean
  rewatch: boolean
  contains_spoilers: boolean
  watched_in_cinema: boolean
  attachment_url: string | null
  attachment_type: "image" | "gif" | null
  review_cover_url: string | null
  review_cover_source: "default" | "tmdb_poster" | "tmdb_backdrop" | "upload" | null
  score_rating: number | null
  cinematography_rating: number | null
  writing_rating: number | null
  performances_rating: number | null
  direction_rating: number | null
  rewatchability_rating: number | null
  emotional_impact_rating: number | null
  entertainment_rating: number | null
}

type ProfileRow = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  is_public: boolean
}

function buildReviewLayers(row: RawEntry): ReviewLayers | null {
  const layers: ReviewLayers = {
    score_rating: row.score_rating,
    cinematography_rating: row.cinematography_rating,
    writing_rating: row.writing_rating,
    performances_rating: row.performances_rating,
    direction_rating: row.direction_rating,
    rewatchability_rating: row.rewatchability_rating,
    emotional_impact_rating: row.emotional_impact_rating,
    entertainment_rating: row.entertainment_rating,
  }
  return Object.values(layers).some((v) => v !== null) ? layers : null
}

function toMediaReview(row: RawEntry, profile: ProfileRow): MediaReview {
  return {
    entryId: row.id,
    userId: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    rating: row.rating,
    reelshelfScore: row.reelshelf_score,
    review: row.review?.trim() ?? "",
    watchedDate: row.watched_date ?? row.saved_at,
    savedAt: row.saved_at,
    reviewLayers: buildReviewLayers(row),
    favourite: row.favourite,
    rewatch: row.rewatch,
    containsSpoilers: row.contains_spoilers,
    watchedInCinema: row.watched_in_cinema ?? false,
    attachmentUrl: row.attachment_url,
    attachmentType: row.attachment_type,
    reviewCoverUrl: row.review_cover_url ?? null,
    reviewCoverSource: row.review_cover_source ?? null,
  }
}

// Keep only the latest entry per user
function deduplicateByUser(entries: RawEntry[]): RawEntry[] {
  const seen = new Set<string>()
  const result: RawEntry[] = []
  for (const entry of entries) {
    if (!seen.has(entry.user_id)) {
      seen.add(entry.user_id)
      result.push(entry)
    }
  }
  return result
}

async function fetchProfiles(
  client: NonNullable<ReturnType<typeof createClient>>,
  userIds: string[]
): Promise<Map<string, ProfileRow>> {
  if (userIds.length === 0) return new Map()
  const { data } = await client
    .from("profiles")
    .select("id, username, display_name, avatar_url, is_public")
    .in("id", userIds)
  return new Map((data ?? []).map((p) => [p.id, p as ProfileRow]))
}

export async function fetchFollowingReviewsForMedia(
  mediaIds: string[]
): Promise<MediaReview[]> {
  if (mediaIds.length === 0) return []
  const client = createClient()
  if (!client) return []

  const {
    data: { session },
  } = await client.auth.getSession()
  if (!session) return []

  const { data: followData } = await client
    .from("followers")
    .select("following_id")
    .eq("follower_id", session.user.id)

  const followedIds = (followData ?? []).map((f) => f.following_id as string)
  const queryIds = Array.from(new Set([...followedIds, session.user.id]))

  const { data: entries } = await client
    .from("diary_entries")
    .select(ENTRY_SELECT)
    .in("media_id", mediaIds)
    .in("user_id", queryIds)
    .in("review_scope", ["show", "title"])
    .order("saved_at", { ascending: false })
    .limit(60)

  if (!entries?.length) return []

  const deduped = deduplicateByUser(entries as RawEntry[])
  const profileMap = await fetchProfiles(client, deduped.map((e) => e.user_id))

  return deduped
    .filter((entry) => {
      const profile = profileMap.get(entry.user_id)
      return profile && (profile.is_public || entry.user_id === session.user.id)
    })
    .map((entry) => toMediaReview(entry, profileMap.get(entry.user_id)!))
}

export async function fetchPublicReviewsForMedia(
  mediaIds: string[],
  limit = 20
): Promise<MediaReview[]> {
  if (mediaIds.length === 0) return []
  const client = createClient()
  if (!client) return []

  const {
    data: { session },
  } = await client.auth.getSession()
  const currentUserId = session?.user.id ?? null

  const { data: entries } = await client
    .from("diary_entries")
    .select(ENTRY_SELECT)
    .in("media_id", mediaIds)
    .in("review_scope", ["show", "title"])
    .order("saved_at", { ascending: false })
    .limit(limit * 4)

  if (!entries?.length) return []

  const deduped = deduplicateByUser(entries as RawEntry[])
  const profileMap = await fetchProfiles(client, deduped.map((e) => e.user_id))

  return deduped
    .filter((entry) => {
      const profile = profileMap.get(entry.user_id)
      return profile && (profile.is_public || entry.user_id === currentUserId)
    })
    .slice(0, limit)
    .map((entry) => toMediaReview(entry, profileMap.get(entry.user_id)!))
}
