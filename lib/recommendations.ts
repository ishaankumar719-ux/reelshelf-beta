import type { SupabaseClient } from "@supabase/supabase-js"

// ─── Shared types ─────────────────────────────────────────────────────────────

export type RecItem = {
  media_id: string
  media_type: "movie" | "tv" | "book"
  title: string
  poster: string | null
  year: number
  logCount: number
  avgRating: number
}

export type TasteEntryMinimal = {
  media_id: string
  media_type: string
  rating: number | null
  favourite: boolean
  genres: string[] | null
}

export type CollabRec = {
  seedTitle: string
  items: RecItem[]
}

export type DiscoveryRowsResult = {
  hiddenGems: RecItem[]
  mostRewatched: RecItem[]
  criticallyLoved: RecItem[]
  booksCircle: RecItem[]
}

export type ProfileSimilarUser = {
  profileId: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  commonTitle: string | null
}

export type ProfileYouMayLikeItem = {
  media_id: string
  media_type: "movie" | "tv" | "book"
  title: string
  poster: string | null
  year: number
  rating: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolvePoster(raw: string | null): string | null {
  if (!raw) return null
  if (raw.startsWith("http")) return raw
  return `https://image.tmdb.org/t/p/w342${raw}`
}

function aggregateRows(
  rows: Array<{ media_id: unknown; media_type: unknown; title: unknown; poster: unknown; year: unknown; rating: unknown }>,
  excludeSet: Set<string>
): RecItem[] {
  const agg = new Map<string, { count: number; totalRating: number; item: RecItem }>()
  for (const row of rows) {
    const key = `${row.media_type}:${row.media_id}`
    if (excludeSet.has(key)) continue
    const existing = agg.get(key)
    const rating = Number(row.rating) || 0
    if (existing) {
      existing.count++
      existing.totalRating += rating
    } else {
      agg.set(key, {
        count: 1,
        totalRating: rating,
        item: {
          media_id: row.media_id as string,
          media_type: row.media_type as "movie" | "tv" | "book",
          title: row.title as string,
          poster: resolvePoster(row.poster as string | null),
          year: Number(row.year) || 0,
          logCount: 1,
          avgRating: rating,
        },
      })
    }
  }
  return Array.from(agg.values())
    .map((v) => ({
      ...v.item,
      logCount: v.count,
      avgRating: v.count > 0 ? v.totalRating / v.count : 0,
    }))
    .sort((a, b) => b.avgRating * b.logCount - a.avgRating * a.logCount)
    .slice(0, 8)
}

// ─── System 1: Taste match score ─────────────────────────────────────────────
// Pure computation — no Supabase needed. Returns 0–100 integer or null.

export function computeTasteMatchScore(
  viewerEntries: TasteEntryMinimal[],
  profileEntries: TasteEntryMinimal[]
): number | null {
  const viewerMap = new Map<string, TasteEntryMinimal>()
  for (const e of viewerEntries) {
    viewerMap.set(`${e.media_type}:${e.media_id}`, e)
  }

  const shared = profileEntries.filter((e) =>
    viewerMap.has(`${e.media_type}:${e.media_id}`)
  )

  if (shared.length < 3) return null

  let totalSimilarity = 0
  let ratedPairs = 0
  let sharedFavs = 0

  for (const pe of shared) {
    const ve = viewerMap.get(`${pe.media_type}:${pe.media_id}`)!
    if (ve.rating !== null && pe.rating !== null) {
      totalSimilarity += 1 - Math.abs(ve.rating - pe.rating) / 10
      ratedPairs++
    }
    if (ve.favourite && pe.favourite) sharedFavs++
  }

  if (ratedPairs < 3) return null

  const ratingSimilarity = totalSimilarity / ratedPairs // 0–1

  const favouriteBoost = Math.min(sharedFavs * 3, 12)

  // Genre overlap
  const viewerGenres = new Set(
    viewerEntries.flatMap((e) =>
      (e.genres ?? []).map((g) => g.toLowerCase().trim())
    )
  )
  const genreHits = profileEntries.flatMap((e) =>
    (e.genres ?? []).filter((g) => viewerGenres.has(g.toLowerCase().trim()))
  ).length
  const genreBoost = Math.min(genreHits * 0.5, 8)

  const raw = ratingSimilarity * 80 + favouriteBoost + genreBoost
  return Math.min(Math.round(raw), 100)
}

// ─── System 2: Collaborative recommendations ─────────────────────────────────
// Finds users who rated the same seed titles highly, surfaces what else they loved.

export async function getCollabRecommendations(
  supabase: SupabaseClient,
  userId: string,
  seedEntries: Array<{ media_id: string; title: string; rating: number; media_type: string }>
): Promise<CollabRec[]> {
  if (seedEntries.length === 0) return []

  const topSeeds = [...seedEntries]
    .filter((s) => s.media_type === "movie")
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 2)

  if (topSeeds.length === 0) return []

  const seedIds = topSeeds.map((s) => s.media_id)

  // Who else rated these seed titles highly?
  const { data: overlapUsers } = await supabase
    .from("diary_entries")
    .select("user_id")
    .in("media_id", seedIds)
    .gte("rating", 7)
    .neq("user_id", userId)
    .limit(120)

  if (!overlapUsers || overlapUsers.length === 0) return []

  const similarUserIds = Array.from(
    new Set(overlapUsers.map((r) => r.user_id as string))
  ).slice(0, 40)

  // What has the current user already logged?
  const { data: myEntries } = await supabase
    .from("diary_entries")
    .select("media_id, media_type")
    .eq("user_id", userId)

  const mySet = new Set(
    (myEntries ?? []).map((e) => `${e.media_type}:${e.media_id}`)
  )

  // What do similar users rate highly that the viewer hasn't logged?
  const { data: theirEntries } = await supabase
    .from("diary_entries")
    .select("media_id, media_type, title, poster, year, rating")
    .in("user_id", similarUserIds)
    .in("review_scope", ["show", "title"])
    .in("media_type", ["movie", "tv"])
    .gte("rating", 7.5)
    .not("poster", "is", null)
    .limit(400)

  if (!theirEntries || theirEntries.length === 0) return []

  const items = aggregateRows(theirEntries, mySet).slice(0, 8)
  if (items.length === 0) return []

  return [{ seedTitle: topSeeds[0].title, items }]
}

// ─── System 4: Circle discovery rows ─────────────────────────────────────────

export async function getCircleDiscoveryRows(
  supabase: SupabaseClient,
  userId: string,
  followedIds: string[]
): Promise<DiscoveryRowsResult> {
  const empty: DiscoveryRowsResult = {
    hiddenGems: [],
    mostRewatched: [],
    criticallyLoved: [],
    booksCircle: [],
  }
  if (followedIds.length === 0) return empty

  // Current user's logged set — exclude these from recommendations
  const { data: myEntries } = await supabase
    .from("diary_entries")
    .select("media_id, media_type")
    .eq("user_id", userId)

  const mySet = new Set(
    (myEntries ?? []).map((e) => `${e.media_type}:${e.media_id}`)
  )

  const [hiddenGemsRes, rewatchedRes, criticallyLovedRes, booksRes] =
    await Promise.all([
      // Hidden gems: niche films (low TMDB vote_average) rated highly by circle
      supabase
        .from("diary_entries")
        .select("media_id, media_type, title, poster, year, rating, vote_average")
        .in("user_id", followedIds)
        .in("review_scope", ["show", "title"])
        .eq("media_type", "movie")
        .gte("rating", 8)
        .lte("vote_average", 7.2)
        .not("poster", "is", null)
        .not("vote_average", "is", null)
        .limit(100),

      // Most rewatched: entries marked as rewatch by circle
      supabase
        .from("diary_entries")
        .select("media_id, media_type, title, poster, year, rating")
        .in("user_id", followedIds)
        .in("review_scope", ["show", "title"])
        .eq("rewatch", true)
        .not("poster", "is", null)
        .limit(100),

      // Critically loved: highest avg rating from circle (films + series)
      supabase
        .from("diary_entries")
        .select("media_id, media_type, title, poster, year, rating")
        .in("user_id", followedIds)
        .in("review_scope", ["show", "title"])
        .in("media_type", ["movie", "tv"])
        .gte("rating", 8)
        .not("poster", "is", null)
        .limit(200),

      // Books your circle is reading/has read
      supabase
        .from("diary_entries")
        .select("media_id, media_type, title, poster, year, rating")
        .in("user_id", followedIds)
        .eq("media_type", "book")
        .not("poster", "is", null)
        .limit(100),
    ])

  return {
    hiddenGems: aggregateRows(hiddenGemsRes.data ?? [], mySet),
    mostRewatched: aggregateRows(rewatchedRes.data ?? [], mySet),
    criticallyLoved: aggregateRows(criticallyLovedRes.data ?? [], mySet),
    booksCircle: aggregateRows(booksRes.data ?? [], mySet),
  }
}

// ─── System 6: Profile similarity + you-may-also-like ─────────────────────────
// Server-side: called from the profile page server component.

export async function getProfileSimilarUsers(
  supabase: SupabaseClient,
  profileUserId: string,
  topMovieIds: string[],
  excludeUserIds: string[]
): Promise<ProfileSimilarUser[]> {
  if (topMovieIds.length === 0) return []

  // Find users who share these movies in their Mount Rushmore (strongest taste signal)
  const { data: mrRows } = await supabase
    .from("mount_rushmore")
    .select("user_id, title")
    .in("media_id", topMovieIds.slice(0, 5))
    .neq("user_id", profileUserId)
    .not("user_id", "in", `(${excludeUserIds.map((id) => `"${id}"`).join(",")})`)
    .limit(30)

  if (!mrRows || mrRows.length === 0) return []

  // Count overlap per user and pick top unique users
  const userScore = new Map<string, { count: number; title: string }>()
  for (const row of mrRows) {
    const uid = row.user_id as string
    const existing = userScore.get(uid)
    if (existing) {
      existing.count++
    } else {
      userScore.set(uid, { count: 1, title: row.title as string })
    }
  }

  const topUserIds = Array.from(userScore.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 4)
    .map(([id]) => id)

  if (topUserIds.length === 0) return []

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", topUserIds)
    .eq("is_public", true)

  if (!profiles) return []

  return profiles.map((p) => ({
    profileId: p.id as string,
    username: (p.username as string | null) ?? null,
    displayName: (p.display_name as string | null) ?? null,
    avatarUrl: (p.avatar_url as string | null) ?? null,
    commonTitle: userScore.get(p.id as string)?.title ?? null,
  }))
}
