import { notFound } from "next/navigation"
import { buildActivityEventsFromSources } from "@/lib/activity"
import { createClient } from "@/lib/supabase/server"
import { getMediaHref } from "@/lib/mediaRoutes"
import ProfileShowcase from "@/src/components/profile/ProfileShowcase"
import type { MountRushmoreSlot, PublicProfileShowcaseData } from "@/src/types/profile"
import type { PublicDiaryEntry } from "@/lib/publicProfiles"

export const dynamic = "force-dynamic"

type ProfileRow = {
  id: string
  username: string | null
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  is_public: boolean
  website_url: string | null
  favourite_film: string | null
  favourite_series: string | null
  favourite_book: string | null
  created_at: string
}

type RushmoreRow = {
  position: number
  title: string
  year: string | null
  poster_path: string | null
  media_id: string
  media_type: "movie" | "tv" | "book"
  created_at: string | null
}

type DiaryRow = {
  id: string
  title: string
  media_id: string
  media_type: "movie" | "tv" | "book"
  year: number | null
  poster: string | null
  rating: number | string | null
  watched_date: string | null
  review: string | null
  created_at: string
  review_scope: "show" | "season" | "episode" | "title" | null
}

type FullDiaryRow = {
  id: string
  title: string
  media_id: string
  media_type: "movie" | "tv" | "book"
  year: number | null
  poster: string | null
  creator: string | null
  rating: number | null
  review: string | null
  watched_date: string | null
  favourite: boolean
  rewatch: boolean
  contains_spoilers: boolean
  saved_at: string
  score_rating: number | null
  cinematography_rating: number | null
  writing_rating: number | null
  performances_rating: number | null
  direction_rating: number | null
  rewatchability_rating: number | null
  emotional_impact_rating: number | null
  entertainment_rating: number | null
  reelshelf_score: number | null
  attachment_url: string | null
  attachment_type: "image" | "gif" | null
}

function mapToPublicEntry(row: FullDiaryRow): PublicDiaryEntry {
  return {
    entryId: row.id,
    id: row.media_id,
    mediaType: row.media_type,
    title: row.title,
    poster: row.poster,
    year: Number(row.year) || 0,
    creator: row.creator,
    rating: typeof row.rating === "number" ? row.rating : null,
    review: row.review || "",
    watchedDate: row.watched_date ?? "",
    favourite: Boolean(row.favourite),
    rewatch: Boolean(row.rewatch),
    containsSpoilers: Boolean(row.contains_spoilers),
    savedAt: row.saved_at,
    href: getMediaHref({ id: row.media_id, mediaType: row.media_type }),
    likeCount: 0,
    commentCount: 0,
    reelshelfScore: row.reelshelf_score ?? null,
    attachmentUrl: row.attachment_url ?? null,
    attachmentType: row.attachment_type ?? null,
    reviewLayers: {
      score_rating: row.score_rating ?? null,
      cinematography_rating: row.cinematography_rating ?? null,
      writing_rating: row.writing_rating ?? null,
      performances_rating: row.performances_rating ?? null,
      direction_rating: row.direction_rating ?? null,
      rewatchability_rating: row.rewatchability_rating ?? null,
      emotional_impact_rating: row.emotional_impact_rating ?? null,
      entertainment_rating: row.entertainment_rating ?? null,
    },
  }
}

function normalizeRushmoreRows(rows: RushmoreRow[]): MountRushmoreSlot[] {
  return rows
    .filter((row): row is RushmoreRow & { position: 1 | 2 | 3 | 4 } => row.position >= 1 && row.position <= 4)
    .map((row) => ({
      position: row.position,
      media_id: row.media_id,
      media_type: row.media_type,
      title: row.title,
      year: row.year,
      poster_path: row.poster_path,
    }))
}

function parseRating(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null
  const parsed = typeof value === "string" ? parseFloat(value) : value
  return Number.isFinite(parsed) ? parsed : null
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const normalizedUsername = username.trim().toLowerCase()
  const supabase = await createClient()

  if (!normalizedUsername || !supabase) {
    notFound()
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, bio, avatar_url, is_public, website_url, favourite_film, favourite_series, favourite_book, created_at"
    )
    .eq("username", normalizedUsername)
    .single()

  if (profileError || !profileData) {
    notFound()
  }

  const profileRow = profileData as ProfileRow
  const isOwner = user?.id === profileRow.id

  if (!profileRow.is_public && !isOwner) {
    const privateProfile: PublicProfileShowcaseData = {
      id: profileRow.id,
      username: profileRow.username ?? normalizedUsername,
      display_name: profileRow.display_name,
      avatar_url: profileRow.avatar_url,
      bio: profileRow.bio,
      is_public: profileRow.is_public,
      website_url: profileRow.website_url,
      created_at: profileRow.created_at,
      favourite_film: profileRow.favourite_film,
      favourite_series: profileRow.favourite_series,
      favourite_book: profileRow.favourite_book,
      mount_rushmore: [],
      recent_activity: [],
      stats: {
        films: 0,
        series: 0,
        reviews: 0,
        watchlist: 0,
        followers: 0,
        following: 0,
      },
      highest_rated: [],
    }

    return <ProfileShowcase profile={privateProfile} isOwner={false} />
  }

  const [
    { data: rushmoreData },
    { data: recentDiaryData },
    { data: allDiaryData },
    { data: reviewsData },
    watchlistRes,
    { count: followersCount },
    { count: followingCount },
  ] = await Promise.all([
    supabase
      .from("mount_rushmore")
      .select("position, title, year, poster_path, media_id, media_type, created_at")
      .eq("user_id", profileRow.id)
      .order("media_type", { ascending: true })
      .order("position", { ascending: true }),
    supabase
      .from("diary_entries")
      .select("id, title, media_id, media_type, year, poster, rating, watched_date, review, created_at, review_scope")
      .eq("user_id", profileRow.id)
      .in("review_scope", ["show", "title"])
      .not("poster", "is", null)
      .order("watched_date", { ascending: false })
      .limit(10),
    supabase
      .from("diary_entries")
      .select("id, title, media_id, media_type, year, poster, rating, watched_date, review, created_at, review_scope")
      .eq("user_id", profileRow.id)
      .in("review_scope", ["show", "title"])
      .order("created_at", { ascending: false }),
    supabase
      .from("diary_entries")
      .select("id, media_id, media_type, title, poster, year, creator, rating, review, watched_date, favourite, rewatch, contains_spoilers, saved_at, score_rating, cinematography_rating, writing_rating, performances_rating, direction_rating, rewatchability_rating, emotional_impact_rating, entertainment_rating, reelshelf_score, attachment_url, attachment_type")
      .eq("user_id", profileRow.id)
      .in("review_scope", ["show", "title"])
      .not("review", "is", null)
      .order("saved_at", { ascending: false })
      .limit(8),
    supabase
      .from("saved_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profileRow.id)
      .eq("list_type", "watchlist"),
    supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("following_id", profileRow.id),
    supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", profileRow.id),
  ])

  const rushmoreRows = (rushmoreData ?? []) as RushmoreRow[]
  const recentRows = (recentDiaryData ?? []) as DiaryRow[]
  const allRows = (allDiaryData ?? []) as DiaryRow[]
  const watchlistCount = watchlistRes.count ?? 0

  const recentReviews = ((reviewsData ?? []) as FullDiaryRow[])
    .filter((row) => row.review && row.review.trim().length > 0)
    .map(mapToPublicEntry)

  const films = allRows.filter((entry) => entry.media_type === "movie").length
  const series = allRows.filter((entry) => entry.media_type === "tv").length
  const reviews = allRows.filter((entry) => parseRating(entry.rating) !== null).length

  const highestRated = allRows
    .filter((entry) => parseRating(entry.rating) !== null && parseRating(entry.rating)! >= 10)
    .filter((entry) => entry.poster)
    .filter((entry, index, source) => source.findIndex((candidate) => candidate.title === entry.title) === index)
    .slice(0, 5)
    .map((entry) => ({
      title: entry.title,
      poster: entry.poster,
      rating: parseRating(entry.rating),
    }))

  const activityEvents = buildActivityEventsFromSources({
    diaryRows: recentRows.map((entry) => ({
      id: entry.id,
      media_id: entry.media_id ?? null,
      title: entry.title,
      media_type: entry.media_type,
      poster: entry.poster ?? null,
      rating: entry.rating,
      review: entry.review ?? null,
      watched_date: entry.watched_date,
      created_at: entry.created_at,
    })),
    rushmoreRows: rushmoreRows.map((row) => ({
      id: `${row.media_type}-${row.position}`,
      title: row.title,
      media_type: row.media_type,
      poster_path: row.poster_path,
      created_at: row.created_at,
    })),
    profile: {
      username: profileRow.username ?? normalizedUsername,
      display_name: profileRow.display_name,
      avatar_url: profileRow.avatar_url,
    },
    limit: 5,
  })

  const profile: PublicProfileShowcaseData = {
    id: profileRow.id,
    username: profileRow.username ?? normalizedUsername,
    display_name: profileRow.display_name,
    avatar_url: profileRow.avatar_url,
    bio: profileRow.bio,
    is_public: profileRow.is_public,
    website_url: profileRow.website_url,
    created_at: profileRow.created_at,
    favourite_film: profileRow.favourite_film,
    favourite_series: profileRow.favourite_series,
    favourite_book: profileRow.favourite_book,
    mount_rushmore: normalizeRushmoreRows(rushmoreRows),
    recent_activity: recentRows.map((entry) => ({
      id: entry.id,
      title: entry.title,
      media_id: entry.media_id,
      media_type: entry.media_type,
      year: typeof entry.year === "number" ? entry.year : null,
      poster: entry.poster,
      rating: entry.rating,
      watched_date: entry.watched_date,
      review_scope:
        entry.review_scope === "show" || entry.review_scope === "season" || entry.review_scope === "episode"
          ? entry.review_scope
          : "show",
    })),
    stats: {
      films,
      series,
      reviews,
      watchlist: watchlistCount,
      followers: followersCount || 0,
      following: followingCount || 0,
    },
    highest_rated: highestRated,
  }

  return <ProfileShowcase profile={profile} isOwner={isOwner} activityEvents={activityEvents} recentReviews={recentReviews} />
}
