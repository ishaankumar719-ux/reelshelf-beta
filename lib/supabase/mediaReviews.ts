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
    .in("review_scope", ["show", "title", "season", "episode"])
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
    .in("review_scope", ["show", "title", "season", "episode"])
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

// ─── Friends show progress ────────────────────────────────────────────────────

export type FriendShowEntry = {
  userId: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  /** "finished" = has show-scope entry; "watching" = has episode entries only */
  status: "finished" | "watching"
  lastSeasonNumber: number | null
  rating: number | null
  reviewSnippet: string | null
}

export type TopRatedEpisode = {
  seasonNumber: number
  episodeNumber: number
  avgRating: number
  ratingCount: number
}

export type FriendsShowProgress = {
  friends: FriendShowEntry[]
  topEpisode: TopRatedEpisode | null
}

export async function fetchFriendsForShow(
  mediaIds: string[]
): Promise<FriendsShowProgress> {
  const empty: FriendsShowProgress = { friends: [], topEpisode: null }
  if (mediaIds.length === 0) return empty

  const client = createClient()
  if (!client) return empty

  const { data: { session } } = await client.auth.getSession()
  if (!session) return empty

  const { data: followData } = await client
    .from("followers")
    .select("following_id")
    .eq("follower_id", session.user.id)

  const followedIds = (followData ?? []).map((f) => f.following_id as string)
  if (followedIds.length === 0) return empty

  // Fetch all entries (un-deduped) for this show from followed users
  const { data: rawEntries } = await client
    .from("diary_entries")
    .select("user_id, review_scope, season_number, episode_number, rating, review, saved_at")
    .in("media_id", mediaIds)
    .in("user_id", followedIds)
    .in("review_scope", ["show", "title", "season", "episode"])
    .order("saved_at", { ascending: false })
    .limit(300)

  if (!rawEntries?.length) return empty

  type RawRow = {
    user_id: string
    review_scope: string
    season_number: number | null
    episode_number: number | null
    rating: number | string | null
    review: string | null
    saved_at: string
  }

  const entries = rawEntries as RawRow[]
  const allUserIds = Array.from(new Set(entries.map((e) => e.user_id)))

  const { data: profiles } = await client
    .from("profiles")
    .select("id, username, display_name, avatar_url, is_public")
    .in("id", allUserIds)

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p as { id: string; username: string | null; display_name: string | null; avatar_url: string | null; is_public: boolean }])
  )

  // Group by user
  const byUser = new Map<string, RawRow[]>()
  for (const entry of entries) {
    if (!byUser.has(entry.user_id)) byUser.set(entry.user_id, [])
    byUser.get(entry.user_id)!.push(entry)
  }

  // Episode ratings across all users for top-episode calc
  const episodeRatings = new Map<string, number[]>()
  for (const entry of entries) {
    if (entry.review_scope === "episode" && entry.rating != null && entry.season_number != null && entry.episode_number != null) {
      const key = `${entry.season_number}:${entry.episode_number}`
      if (!episodeRatings.has(key)) episodeRatings.set(key, [])
      episodeRatings.get(key)!.push(Number(entry.rating))
    }
  }

  // Build friend list
  const friends: FriendShowEntry[] = []
  for (const userId of Array.from(byUser.keys())) {
    const userRows = byUser.get(userId)!
    const profile = profileMap.get(userId)
    if (!profile?.is_public) continue

    const showRow = userRows.find((r) => r.review_scope === "show" || r.review_scope === "title")
    const epRows = userRows.filter((r) => r.review_scope === "episode")
    const lastEp = epRows[0]

    friends.push({
      userId,
      username: profile.username,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      status: showRow ? "finished" : "watching",
      lastSeasonNumber: lastEp?.season_number ?? null,
      rating: showRow?.rating != null ? Number(showRow.rating) : null,
      reviewSnippet: showRow?.review?.trim() || null,
    })
  }

  // Find top episode (most highly rated with >= 2 ratings, else top-1)
  let topEpisode: TopRatedEpisode | null = null
  let bestScore = -1
  for (const key of Array.from(episodeRatings.keys())) {
    const ratings = episodeRatings.get(key)!
    const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length
    const score = avg + (ratings.length > 1 ? 1 : 0)
    if (score > bestScore) {
      bestScore = score
      const [sn, en] = key.split(":").map(Number)
      topEpisode = { seasonNumber: sn, episodeNumber: en, avgRating: Number(avg.toFixed(1)), ratingCount: ratings.length }
    }
  }

  return { friends, topEpisode }
}
