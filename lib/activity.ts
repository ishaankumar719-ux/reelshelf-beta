import { createClient } from "@/lib/supabase/server"

export type ActivityType = "logged" | "reviewed" | "watchlisted" | "rushmore" | "finished_series" | "challenge_completed"

export interface ActivityEvent {
  id: string
  type: ActivityType
  user_id: string
  profile: {
    username: string | null
    display_name: string | null
    avatar_url: string | null
  }
  title: string
  media_type: "movie" | "tv" | "book"
  media_id?: string | null
  diary_entry_id?: string | null
  poster: string | null
  rating: number | null
  review: string | null
  attachmentUrl?: string | null
  attachmentType?: "image" | "gif" | null
  reviewCoverUrl?: string | null
  reviewCoverSource?: "default" | "tmdb_poster" | "tmdb_backdrop" | "upload" | null
  watchedInCinema?: boolean
  timestamp: string
  isBatch: boolean
  batchCount?: number
}

type DiaryActivityRow = {
  id: string
  media_id: string | null
  title: string
  media_type: "movie" | "tv" | "book"
  poster: string | null
  rating: unknown
  review: string | null
  attachment_url?: string | null
  attachment_type?: "image" | "gif" | null
  review_cover_url?: string | null
  review_cover_source?: "default" | "tmdb_poster" | "tmdb_backdrop" | "upload" | null
  watched_date?: string | null
  created_at: string
  watched_in_cinema?: boolean
}

type SavedActivityRow = {
  id: string
  media_id: string | null
  title: string
  media_type: "movie" | "tv" | "book"
  poster: string | null
  created_at: string
}

type RushmoreActivityRow = {
  id: string
  title: string
  media_type: "movie" | "tv" | "book"
  poster_path: string | null
  created_at: string | null
}

const BATCH_MS = 60000

function toRating(rating: unknown): number | null {
  if (rating === null || rating === undefined || rating === "") return null
  const parsed = parseFloat(String(rating))
  return Number.isNaN(parsed) ? null : parsed
}

function collapseActivityEvents(events: ActivityEvent[], limit: number) {
  const collapsed: ActivityEvent[] = []
  let index = 0

  while (index < events.length) {
    const current = events[index]

    const isBatchable = (t: ActivityType) => t === "logged" || t === "reviewed" || t === "finished_series"

    if (!isBatchable(current.type)) {
      collapsed.push(current)
      index += 1
      continue
    }

    let nextIndex = index + 1

    while (nextIndex < events.length) {
      const candidate = events[nextIndex]
      const withinBatchWindow =
        Math.abs(
          new Date(candidate.timestamp).getTime() -
            new Date(current.timestamp).getTime()
        ) < BATCH_MS

      if (withinBatchWindow && isBatchable(candidate.type)) {
        nextIndex += 1
        continue
      }

      break
    }

    const batchSize = nextIndex - index

    if (batchSize >= 4) {
      collapsed.push({
        ...current,
        isBatch: true,
        batchCount: batchSize,
        title: `${batchSize} films`,
        review: null,
        rating: null,
        poster: current.poster,
      })
      index = nextIndex
      continue
    }

    collapsed.push(current)
    index += 1
  }

  return collapsed.slice(0, limit)
}

export function buildActivityEventsFromSources({
  diaryRows,
  savedRows = [],
  rushmoreRows = [],
  profile,
  userId,
  limit = 50,
}: {
  diaryRows: DiaryActivityRow[]
  savedRows?: SavedActivityRow[]
  rushmoreRows?: RushmoreActivityRow[]
  profile: ActivityEvent["profile"]
  userId: string
  limit?: number
}): ActivityEvent[] {
  const diaryEvents: ActivityEvent[] = diaryRows.map((row) => {
    const isTV = row.media_type === "tv"
    const hasReview = Boolean(row.review?.trim())
    const type: ActivityType = isTV ? "finished_series" : hasReview ? "reviewed" : "logged"
    return {
      id: `diary-${row.id}`,
      type,
      user_id: userId,
      profile,
      title: row.title,
      media_type: row.media_type,
      media_id: row.media_id ?? null,
      diary_entry_id: row.id,
      poster: row.poster ?? null,
      rating: toRating(row.rating),
      review: row.review?.trim() || null,
      attachmentUrl: row.attachment_url ?? null,
      attachmentType: row.attachment_type ?? null,
      reviewCoverUrl: row.review_cover_url ?? null,
      reviewCoverSource: row.review_cover_source ?? null,
      watchedInCinema: row.watched_in_cinema ?? false,
      timestamp: row.created_at,
      isBatch: false,
    }
  })

  const savedEvents: ActivityEvent[] = savedRows.map((row) => ({
    id: `saved-${row.id}`,
    type: "watchlisted",
    user_id: userId,
    profile,
    title: row.title,
    media_type: row.media_type,
    media_id: row.media_id ?? null,
    poster: row.poster ?? null,
    rating: null,
    review: null,
    timestamp: row.created_at,
    isBatch: false,
  }))

  const rushmoreEvent: ActivityEvent[] =
    rushmoreRows.length > 0 && rushmoreRows[0].created_at
      ? [
          {
            id: "rushmore-update",
            type: "rushmore",
            user_id: userId,
            profile,
            title: "Mount Rushmore",
            media_type: "movie",
            poster: null,
            rating: null,
            review: null,
            timestamp: rushmoreRows[0].created_at,
            isBatch: true,
            batchCount: rushmoreRows.length,
          },
        ]
      : []

  const merged = [...diaryEvents, ...savedEvents, ...rushmoreEvent].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return collapseActivityEvents(merged, limit)
}

export async function fetchActivityEvents(
  userId: string,
  profile: { username: string | null; display_name: string | null; avatar_url: string | null },
  limit = 50
): Promise<ActivityEvent[]> {
  const supabase = await createClient()

  if (!supabase) {
    return []
  }

  const [diaryRes, savedRes, rushmoreRes] = await Promise.all([
    supabase
      .from("diary_entries")
      .select("id, media_id, title, media_type, poster, rating, review, attachment_url, attachment_type, review_cover_url, review_cover_source, watched_in_cinema, watched_date, created_at")
      .eq("user_id", userId)
      .in("review_scope", ["show", "title"])
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("saved_items")
      .select("id, media_id, title, media_type, poster, created_at")
      .eq("user_id", userId)
      .eq("list_type", "watchlist")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("mount_rushmore")
      .select("id, title, media_type, poster_path, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  return buildActivityEventsFromSources({
    diaryRows: (diaryRes.data ?? []) as DiaryActivityRow[],
    savedRows: (savedRes.data ?? []) as SavedActivityRow[],
    rushmoreRows: (rushmoreRes.data ?? []) as RushmoreActivityRow[],
    profile,
    userId,
    limit,
  })
}

/*
 * Phase 2: Replace derived feed with a dedicated activity_events table:
 *
 * CREATE TABLE activity_events (
 *   id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
 *   type        text CHECK (type IN ('logged','reviewed','watchlisted',
 *                                    'rushmore','followed')),
 *   media_id    text,
 *   media_type  text,
 *   title       text,
 *   poster      text,
 *   rating      numeric,
 *   review_snippet text,
 *   metadata    jsonb,
 *   created_at  timestamptz DEFAULT now()
 * );
 * CREATE INDEX ON activity_events (user_id, created_at DESC);
 * CREATE INDEX ON activity_events (created_at DESC);  -- for global feed
 *
 * Phase 2 also requires:
 *   - followers table queries for "Following" tab
 *   - Supabase triggers or app-level inserts to populate activity_events
 *   - RLS: SELECT public, INSERT/DELETE owner only
 */
