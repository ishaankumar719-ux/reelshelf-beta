import { createClient } from "@/lib/supabase/server"
import { DIARY_SELECT, PROFILE_SELECT } from "@/lib/queries"
import ProfileShowcase from "@/src/components/profile/ProfileShowcase"
import type { MountRushmoreSlot, PublicProfileShowcaseData } from "@/src/types/profile"

export const dynamic = "force-dynamic"

function normalizeRushmoreSlots(rows: Array<{
  position: number
  media_id: string | null
  media_type: "movie" | "tv" | "book" | null
  title: string | null
  year: string | null
  poster_path: string | null
}>): MountRushmoreSlot[] {
  return rows
    .filter((row): row is typeof row & { position: 1 | 2 | 3 | 4 } => row.position >= 1 && row.position <= 4)
    .map((row) => ({
      position: row.position,
      media_id: row.media_id,
      media_type: row.media_type,
      title: row.title,
      year: row.year,
      poster_path: row.poster_path,
    }))
}

function normalizeRating(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

type ShowcaseDiaryRow = {
  id: string
  title: string
  media_type: "movie" | "tv" | "book"
  year: number | null
  poster: string | null
  rating: number | null
  watched_date: string | null
  review_scope: "show" | "season" | "episode" | "title" | null
  review: string | null
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
    return <ProfileShowcase profile={null} isOwner={false} />
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log("[PROFILE QUERY] select string:", PROFILE_SELECT)
  const { data: profileRowData, error: profileError } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("username", normalizedUsername)
    .limit(1)
    .maybeSingle()

  const profileRow = (profileRowData || null) as
    | {
        id: string
        username: string | null
        display_name: string | null
        avatar_url: string | null
        bio: string | null
        website_url: string | null
        created_at: string
        favourite_film: string | null
        favourite_series: string | null
        favourite_book: string | null
        is_public: boolean
      }
    | null

  console.log("[SHOWCASE LOAD] profile:", profileRow?.username ?? null)
  console.log("[SHOWCASE LOAD] error:", profileError?.message ?? "none")

  if (!profileRow) {
    return <ProfileShowcase profile={null} isOwner={false} />
  }

  const isOwner = user?.id === profileRow.id

  const [
    { data: rushmoreRows },
    { data: recentRows },
    { data: statsRows },
    { count: followersCount },
    { count: followingCount },
  ] = await Promise.all([
    supabase
      .from("mount_rushmore")
      .select("position, media_id, media_type, title, year, poster_path")
      .eq("user_id", profileRow.id)
      .order("position", { ascending: true }),
    supabase
      .from("diary_entries")
      .select(DIARY_SELECT)
      .eq("user_id", profileRow.id)
      .eq("review_scope", "show")
      .order("watched_date", { ascending: false })
      .limit(12),
    supabase
      .from("diary_entries")
      .select(DIARY_SELECT)
      .eq("user_id", profileRow.id)
      .eq("review_scope", "show"),
    supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("following_id", profileRow.id),
    supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", profileRow.id),
  ])

  const statsSource = ((statsRows || []) as unknown) as ShowcaseDiaryRow[]
  const recentActivityRows = ((recentRows || []) as unknown) as ShowcaseDiaryRow[]
  const films = statsSource.filter((entry) => entry.media_type === "movie").length
  const series = statsSource.filter((entry) => entry.media_type === "tv").length
  const reviews = statsSource.filter((entry) => (entry.review || "").trim().length > 0).length
  const ratings = statsSource
    .map((entry) => normalizeRating(entry.rating))
    .filter((value): value is number => typeof value === "number")
  const avgRating = ratings.length > 0 ? Number((ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(1)) : null

  const highestRated = statsSource
    .filter((entry) => entry.media_type === "movie")
    .map((entry) => ({
      title: entry.title,
      poster: entry.poster,
      rating: normalizeRating(entry.rating),
    }))
    .filter((entry) => entry.rating !== null)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 3)

  const profile: PublicProfileShowcaseData = {
    id: profileRow.id,
    username: profileRow.username ?? normalizedUsername,
    display_name: profileRow.display_name,
    avatar_url: profileRow.avatar_url,
    bio: profileRow.bio,
    website_url: profileRow.website_url,
    created_at: profileRow.created_at,
    favourite_film: profileRow.favourite_film,
    favourite_series: profileRow.favourite_series,
    favourite_book: profileRow.favourite_book,
    mount_rushmore: normalizeRushmoreSlots(rushmoreRows || []),
    recent_activity: recentActivityRows
      .filter((entry): entry is ShowcaseDiaryRow & { media_type: "movie" | "tv" } => entry.media_type === "movie" || entry.media_type === "tv")
      .map((entry) => ({
        id: entry.id,
        title: entry.title,
        media_type: entry.media_type,
        year: typeof entry.year === "number" ? entry.year : null,
        poster: entry.poster,
        rating: normalizeRating(entry.rating),
        watched_date: entry.watched_date,
        review_scope: entry.review_scope === "title" ? "show" : entry.review_scope,
      })),
    stats: {
      films,
      series,
      reviews,
      avg_rating: avgRating,
      followers: followersCount || 0,
      following: followingCount || 0,
    },
    highest_rated: highestRated,
  }

  return <ProfileShowcase profile={profile} isOwner={isOwner} />
}
