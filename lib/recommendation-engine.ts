import { createClient } from "@/lib/supabase/server"
import { localMovies } from "@/lib/localMovies"
import { localSeries } from "@/lib/localSeries"
import { localBooks } from "@/lib/localBooks"
import { getMediaMeta } from "@/lib/mediaMetadata"

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

// ─── Public types ─────────────────────────────────────────────────────────────
//
// The UserContext is the canonical data bag passed into all scoring functions.
// To add a new signal source (AI, friends activity, community trends) without
// rewriting the core: (1) add fields to UserContext, (2) populate them in
// buildUserContext, (3) add a ScoringSignal in scoreCandidate.

export interface ScoringSignal {
  name: string
  score: number
  reason?: string  // shown in "Why this pick?" when defined
}

export interface ScoredCandidate {
  mediaType: "film" | "tv" | "book"
  mediaId: string
  creator: string | null | undefined
  totalScore: number
  signals: ScoringSignal[]
}

export interface UserContext {
  // Genre preferences from diary ratings
  highRatedGenres: Map<string, string>       // genre → best diary title rated ≥ 8
  preferredGenres: Map<string, string>       // genre → best diary title rated ≥ 7
  // Creator preferences from diary ratings
  preferredCreators: Map<string, string>     // creator → best diary title rated ≥ 8
  // Genre/creator preferences from profile favourites (resolved to local catalog)
  favouriteMediaGenres: Map<string, string>  // genre → profile-favourite title that provided it
  favouriteMediaCreators: Map<string, string>// creator → profile-favourite title that provided it
  // Hard exclusions
  loggedFilmIds: Set<string>
  loggedTvIds: Set<string>
  loggedBookIds: Set<string>
  // Watchlist / reading shelf
  watchlistFilmIds: Set<string>
  watchlistTvIds: Set<string>
  watchlistBookIds: Set<string>
  watchlistGenres: Set<string>
  // Daily pick history
  recentPickIds: Set<string>                      // media_ids picked in last 7 days (excluding today)
  recentPickTypes: ("film" | "tv" | "book")[]     // last 3 pick types, newest first
  // Session
  excludeMediaId?: string   // current pick to exclude on reroll
  excludeWatchlist: boolean
}

// ─── Build user context ───────────────────────────────────────────────────────
//
// All DB reads happen here in a single Promise.all. Scoring functions receive
// only pure data — no DB calls inside the scoring path.

export async function buildUserContext(
  supabase: SupabaseClient,
  userId: string,
  options?: { excludeMediaId?: string; today?: string; excludeWatchlist?: boolean }
): Promise<UserContext> {
  const today = options?.today ?? new Date().toISOString().slice(0, 10)
  const excludeWatchlist = options?.excludeWatchlist ?? true
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const empty: UserContext = {
    highRatedGenres: new Map(),
    preferredGenres: new Map(),
    preferredCreators: new Map(),
    favouriteMediaGenres: new Map(),
    favouriteMediaCreators: new Map(),
    loggedFilmIds: new Set(),
    loggedTvIds: new Set(),
    loggedBookIds: new Set(),
    watchlistFilmIds: new Set(),
    watchlistTvIds: new Set(),
    watchlistBookIds: new Set(),
    watchlistGenres: new Set(),
    recentPickIds: new Set(),
    recentPickTypes: [],
    excludeMediaId: options?.excludeMediaId,
    excludeWatchlist,
  }

  if (!supabase) return empty

  const [diaryRes, savedRes, picksRes, profileRes] = await Promise.all([
    supabase
      .from("diary_entries")
      .select("media_id, media_type, genres, rating, creator, title")
      .eq("user_id", userId)
      .in("review_scope", ["show", "title"]),
    supabase
      .from("saved_items")
      .select("media_id, media_type, list_type, genres")
      .eq("user_id", userId),
    supabase
      .from("daily_picks")
      .select("media_id, media_type, pick_date")
      .eq("user_id", userId)
      .gte("pick_date", sevenDaysAgo)
      .order("pick_date", { ascending: false })
      .limit(7),
    supabase
      .from("profiles")
      .select("favourite_film, favourite_series, favourite_book")
      .eq("id", userId)
      .maybeSingle(),
  ])

  // ── Diary ────────────────────────────────────────────────────────────────────

  const highRatedGenres = new Map<string, string>()
  const preferredGenres = new Map<string, string>()
  const preferredCreators = new Map<string, string>()
  const loggedFilmIds = new Set<string>()
  const loggedTvIds = new Set<string>()
  const loggedBookIds = new Set<string>()

  // Sort descending by rating so the first-seen entry per genre is the best one
  const diaryRows = [...(diaryRes.data ?? [])].sort(
    (a, b) => ((b.rating as number) ?? 0) - ((a.rating as number) ?? 0)
  )

  for (const row of diaryRows) {
    const id = row.media_id as string
    const type = row.media_type as string
    const rating = row.rating as number | null
    const genres = (row.genres as string[]) ?? []
    const creator = row.creator as string | null
    const title = row.title as string

    if (type === "movie") loggedFilmIds.add(id)
    else if (type === "tv") loggedTvIds.add(id)
    else if (type === "book") loggedBookIds.add(id)

    if (rating === null) continue

    for (const genre of genres) {
      if (!genre) continue
      if (rating >= 8 && !highRatedGenres.has(genre)) highRatedGenres.set(genre, title)
      if (rating >= 7 && !preferredGenres.has(genre)) preferredGenres.set(genre, title)
    }

    if (creator && rating >= 8 && !preferredCreators.has(creator)) {
      preferredCreators.set(creator, title)
    }
  }

  // ── Watchlist / reading shelf ─────────────────────────────────────────────────

  const watchlistFilmIds = new Set<string>()
  const watchlistTvIds = new Set<string>()
  const watchlistBookIds = new Set<string>()
  const watchlistGenres = new Set<string>()

  for (const row of savedRes.data ?? []) {
    const id = row.media_id as string
    const type = row.media_type as string
    const genres = (row.genres as string[]) ?? []

    if (type === "movie") watchlistFilmIds.add(id)
    else if (type === "tv") watchlistTvIds.add(id)
    else if (type === "book") watchlistBookIds.add(id)

    for (const genre of genres) {
      if (genre) watchlistGenres.add(genre)
    }
  }

  // ── Daily pick history ────────────────────────────────────────────────────────

  const recentPickIds = new Set<string>()
  const recentPickTypes: ("film" | "tv" | "book")[] = []

  for (const row of picksRes.data ?? []) {
    const mediaId = row.media_id as string
    const mediaType = row.media_type as "film" | "tv" | "book"
    const pickDate = row.pick_date as string
    if (pickDate !== today) recentPickIds.add(mediaId)
    if (recentPickTypes.length < 3) recentPickTypes.push(mediaType)
  }

  // ── Profile favourites ────────────────────────────────────────────────────────
  //
  // Resolve the profile's favourite_film/series/book title strings to local
  // catalog entries (case-insensitive match). Derive genres and creator from
  // the matched local item to populate the favourite-media signals.

  const favouriteMediaGenres = new Map<string, string>()
  const favouriteMediaCreators = new Map<string, string>()

  const favLookups: { type: "film" | "tv" | "book"; title: string | null | undefined }[] = [
    { type: "film", title: profileRes.data?.favourite_film },
    { type: "tv",   title: profileRes.data?.favourite_series },
    { type: "book", title: profileRes.data?.favourite_book },
  ]

  for (const { type, title } of favLookups) {
    if (!title) continue
    const lower = title.toLowerCase()

    let matchId: string | undefined
    let matchCreator: string | null | undefined

    if (type === "film") {
      const found = localMovies.find(m => m.title.toLowerCase() === lower)
      matchId = found?.id
      matchCreator = found?.director
    } else if (type === "tv") {
      const found = localSeries.find(s => s.title.toLowerCase() === lower)
      matchId = found?.id
      matchCreator = found?.creator
    } else {
      const found = localBooks.find(b => b.title.toLowerCase() === lower)
      matchId = found?.id
      matchCreator = found?.author
    }

    if (!matchId) continue

    const meta = getMediaMeta(type, matchId)
    for (const genre of meta.genres) {
      if (!favouriteMediaGenres.has(genre)) favouriteMediaGenres.set(genre, title)
    }
    if (matchCreator && !favouriteMediaCreators.has(matchCreator)) {
      favouriteMediaCreators.set(matchCreator, title)
    }
  }

  return {
    highRatedGenres,
    preferredGenres,
    preferredCreators,
    favouriteMediaGenres,
    favouriteMediaCreators,
    loggedFilmIds,
    loggedTvIds,
    loggedBookIds,
    watchlistFilmIds,
    watchlistTvIds,
    watchlistBookIds,
    watchlistGenres,
    recentPickIds,
    recentPickTypes,
    excludeMediaId: options?.excludeMediaId,
    excludeWatchlist,
  }
}

// ─── Hard exclusion check ─────────────────────────────────────────────────────

function isExcluded(
  mediaType: "film" | "tv" | "book",
  mediaId: string,
  ctx: UserContext
): boolean {
  if (mediaId === ctx.excludeMediaId) return true

  if (mediaType === "film") {
    if (ctx.loggedFilmIds.has(mediaId)) return true
    if (ctx.excludeWatchlist && ctx.watchlistFilmIds.has(mediaId)) return true
  } else if (mediaType === "tv") {
    if (ctx.loggedTvIds.has(mediaId)) return true
    if (ctx.excludeWatchlist && ctx.watchlistTvIds.has(mediaId)) return true
  } else {
    if (ctx.loggedBookIds.has(mediaId)) return true
    if (ctx.excludeWatchlist && ctx.watchlistBookIds.has(mediaId)) return true
  }

  return false
}

// ─── Score a single candidate ─────────────────────────────────────────────────
//
// Pure function — no DB calls. Returns every signal that fired (including
// penalties) so the caller can introspect scoring decisions and extract reasons.

export function scoreCandidate(
  mediaType: "film" | "tv" | "book",
  mediaId: string,
  creator: string | null | undefined,
  ctx: UserContext
): ScoredCandidate {
  const meta = getMediaMeta(mediaType, mediaId)
  const signals: ScoringSignal[] = []

  // Type rotation: if the last 3 picks are all the same type, hard-block it
  const last3 = ctx.recentPickTypes.slice(0, 3)
  if (last3.length === 3 && last3.every(t => t === mediaType)) {
    signals.push({ name: "type-rotation-block", score: -999 })
    return { mediaType, mediaId, creator, totalScore: -999, signals }
  }

  // Mild variety penalty: −15 per recent pick of the same type
  const recentSameType = last3.filter(t => t === mediaType).length
  if (recentSameType > 0) {
    signals.push({ name: "type-variety", score: -15 * recentSameType })
  }

  // ── Genre signals (mutually exclusive — only the highest tier fires) ──────────

  let genreSignalFired = false

  // +30 genre matches a diary entry the user rated ≥ 8
  for (const genre of meta.genres) {
    if (ctx.highRatedGenres.has(genre)) {
      const title = ctx.highRatedGenres.get(genre)!
      signals.push({ name: "genre-high-rated", score: 30, reason: `Because you loved ${title}` })
      genreSignalFired = true
      break
    }
  }

  // +25 genre matches a diary entry rated ≥ 7 (only if high-rated didn't fire)
  if (!genreSignalFired) {
    for (const genre of meta.genres) {
      if (ctx.preferredGenres.has(genre)) {
        signals.push({ name: "genre-preferred", score: 25, reason: `You enjoy ${genre}` })
        genreSignalFired = true
        break
      }
    }
  }

  // +15 genre matches a profile-favourite's genre (only if no diary genre signal fired)
  if (!genreSignalFired) {
    for (const genre of meta.genres) {
      if (ctx.favouriteMediaGenres.has(genre)) {
        const favTitle = ctx.favouriteMediaGenres.get(genre)!
        signals.push({
          name: "favourite-media-genre",
          score: 15,
          reason: `Similar to your favourite: ${favTitle}`,
        })
        genreSignalFired = true
        break
      }
    }
  }

  // ── Creator signals (independent of genre signals) ────────────────────────────

  if (creator) {
    if (ctx.preferredCreators.has(creator)) {
      // +20 creator matches a diary entry rated ≥ 8
      const title = ctx.preferredCreators.get(creator)!
      signals.push({
        name: "creator-match",
        score: 20,
        reason: `By ${creator}, who made ${title}`,
      })
    } else if (ctx.favouriteMediaCreators.has(creator)) {
      // +15 creator matches the creator of a profile favourite
      const favTitle = ctx.favouriteMediaCreators.get(creator)!
      signals.push({
        name: "favourite-creator",
        score: 15,
        reason: `By ${creator}, who made your favourite: ${favTitle}`,
      })
    }
  }

  // ── Quality signal ────────────────────────────────────────────────────────────

  // +15 critically acclaimed (voteAverage ≥ 8.0 from curated mediaMetadata)
  if (meta.voteAverage >= 8.0) {
    signals.push({ name: "critically-acclaimed", score: 15, reason: "Critically acclaimed" })
  }

  // ── Watchlist taste signal ────────────────────────────────────────────────────

  // +10 genre matches genres of items currently on the user's watchlist
  const hasWatchlistGenre = meta.genres.some(g => ctx.watchlistGenres.has(g))
  if (hasWatchlistGenre) {
    signals.push({ name: "watchlist-genre", score: 10, reason: "Matches your watchlist taste" })
  }

  // ── Freshness ─────────────────────────────────────────────────────────────────

  // +5 not recommended in the last 7 days
  if (!ctx.recentPickIds.has(mediaId)) {
    signals.push({ name: "fresh-pick", score: 5 })
  }

  // Small random tiebreaker so equal-scored items rotate daily
  signals.push({ name: "tiebreaker", score: Math.random() * 4 })

  const totalScore = signals.reduce((sum, s) => sum + s.score, 0)
  return { mediaType, mediaId, creator, totalScore, signals }
}

// ─── Pick the best candidate ──────────────────────────────────────────────────

export function pickBest(ctx: UserContext): ScoredCandidate | null {
  const candidates: ScoredCandidate[] = []

  for (const movie of localMovies) {
    if (isExcluded("film", movie.id, ctx)) continue
    candidates.push(scoreCandidate("film", movie.id, movie.director, ctx))
  }

  for (const series of localSeries) {
    if (isExcluded("tv", series.id, ctx)) continue
    candidates.push(scoreCandidate("tv", series.id, series.creator, ctx))
  }

  for (const book of localBooks) {
    if (isExcluded("book", book.id, ctx)) continue
    candidates.push(scoreCandidate("book", book.id, book.author, ctx))
  }

  // Filter type-rotation-blocked candidates, then pick the highest scorer
  const eligible = candidates.filter(c => c.totalScore > -500)
  if (eligible.length === 0) return null

  eligible.sort((a, b) => b.totalScore - a.totalScore)
  return eligible[0]
}

// ─── Generate "Why this pick?" reasons from fired signals ─────────────────────

export function generateReasons(candidate: ScoredCandidate): string[] {
  const reasons = candidate.signals
    .filter(s => s.score > 0 && s.reason !== undefined)
    .map(s => s.reason!)
    .slice(0, 4)

  if (reasons.length === 0) {
    const meta = getMediaMeta(candidate.mediaType, candidate.mediaId)
    return [meta.voteAverage >= 8.0 ? "Critically acclaimed" : "A hidden gem"]
  }

  return reasons
}
