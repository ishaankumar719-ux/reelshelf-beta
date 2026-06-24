import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { localMovies } from "@/lib/localMovies"
import { localSeries } from "@/lib/localSeries"
import { localBooks } from "@/lib/localBooks"
import { getMediaMeta } from "@/lib/mediaMetadata"

export const dynamic = "force-dynamic"

export type DailyPickData = {
  id: string
  pick_date: string
  media_type: "film" | "tv" | "book"
  media_id: string
  reroll_count: number
  title: string
  year: string
  poster: string | null
  overview: string
  genre: string | null
  creator: string | null
  reasons: string[]
}

type LocalFilm = (typeof localMovies)[number]
type LocalSeries = (typeof localSeries)[number]
type LocalBook = (typeof localBooks)[number]

type UserPreferences = {
  preferredGenres: Set<string>
  preferredCreators: Set<string>
  topRatedByGenre: Map<string, string>    // genre → title of highest-rated diary entry
  topRatedByCreator: Map<string, string>  // creator → title of highest-rated diary entry
}

type Candidate = {
  media_type: "film" | "tv" | "book"
  media_id: string
  creator: string | null | undefined
  score: number
}

// ─── Enrich ──────────────────────────────────────────────────────────────────

function enrichPick(
  mediaType: "film" | "tv" | "book",
  mediaId: string
): Omit<DailyPickData, "id" | "pick_date" | "reroll_count" | "reasons"> | null {
  if (mediaType === "film") {
    const item = localMovies.find((m) => m.id === mediaId) as LocalFilm | undefined
    if (!item) return null
    return { media_type: "film", media_id: mediaId, title: item.title, year: item.year, poster: item.poster ?? null, overview: item.overview, genre: null, creator: item.director }
  }
  if (mediaType === "tv") {
    const item = localSeries.find((s) => s.id === mediaId) as LocalSeries | undefined
    if (!item) return null
    return { media_type: "tv", media_id: mediaId, title: item.title, year: item.year, poster: item.poster ?? null, overview: item.overview, genre: null, creator: item.creator }
  }
  const item = localBooks.find((b) => b.id === mediaId) as LocalBook | undefined
  if (!item) return null
  return { media_type: "book", media_id: mediaId, title: item.title, year: item.year, poster: item.cover ?? null, overview: item.overview, genre: item.genre ?? null, creator: item.author }
}

// ─── Exclusion sets ───────────────────────────────────────────────────────────

async function buildExclusionSets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  if (!supabase) return { filmIds: new Set<string>(), tvIds: new Set<string>(), bookIds: new Set<string>() }

  const [diaryRes, watchlistRes] = await Promise.all([
    supabase.from("diary_entries").select("media_id, media_type").eq("user_id", userId).in("review_scope", ["show", "title"]),
    supabase.from("saved_items").select("media_id, media_type").eq("user_id", userId).eq("list_type", "watchlist"),
  ])

  const filmIds = new Set<string>()
  const tvIds = new Set<string>()
  const bookIds = new Set<string>()

  for (const row of [...(diaryRes.data ?? []), ...(watchlistRes.data ?? [])]) {
    const id = row.media_id as string
    const type = row.media_type as string
    if (type === "movie") filmIds.add(id)
    else if (type === "tv") tvIds.add(id)
    else if (type === "book") bookIds.add(id)
  }

  return { filmIds, tvIds, bookIds }
}

// ─── User preferences ─────────────────────────────────────────────────────────

async function buildUserPreferences(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<UserPreferences> {
  const preferredGenres = new Set<string>()
  const preferredCreators = new Set<string>()
  const topRatedByGenre = new Map<string, string>()
  const topRatedByCreator = new Map<string, string>()

  if (!supabase) return { preferredGenres, preferredCreators, topRatedByGenre, topRatedByCreator }

  const { data } = await supabase
    .from("diary_entries")
    .select("genres, rating, creator, title")
    .eq("user_id", userId)
    .not("rating", "is", null)
    .gte("rating", 7)
    .order("rating", { ascending: false })

  for (const entry of data ?? []) {
    const genres = (entry.genres as string[]) ?? []
    const title = entry.title as string
    const creator = entry.creator as string | null

    for (const genre of genres) {
      if (genre) {
        preferredGenres.add(genre)
        if (!topRatedByGenre.has(genre)) topRatedByGenre.set(genre, title)
      }
    }

    if (creator) {
      preferredCreators.add(creator)
      if (!topRatedByCreator.has(creator)) topRatedByCreator.set(creator, title)
    }
  }

  return { preferredGenres, preferredCreators, topRatedByGenre, topRatedByCreator }
}

// ─── Recent type penalties (variety) ─────────────────────────────────────────

async function buildTypePenalties(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  today: string
): Promise<Map<"film" | "tv" | "book", number>> {
  const penalties = new Map<"film" | "tv" | "book", number>()
  if (!supabase) return penalties

  const { data } = await supabase
    .from("daily_picks")
    .select("media_type")
    .eq("user_id", userId)
    .neq("pick_date", today)
    .order("pick_date", { ascending: false })
    .limit(2)

  for (const row of data ?? []) {
    const t = row.media_type as "film" | "tv" | "book"
    penalties.set(t, (penalties.get(t) ?? 0) + 20)
  }

  return penalties
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function scoreCandidate(
  mediaType: "film" | "tv" | "book",
  mediaId: string,
  candidateCreator: string | null | undefined,
  prefs: UserPreferences,
  typePenalty: number
): number {
  const meta = getMediaMeta(mediaType, mediaId)
  let score = 0

  // +30 matches a preferred genre (capped at one match to avoid stacking)
  for (const genre of meta.genres) {
    if (prefs.preferredGenres.has(genre)) { score += 30; break }
  }

  // +20 same creator/director as a high-rated diary entry
  if (candidateCreator && prefs.preferredCreators.has(candidateCreator)) score += 20

  // +15 critically acclaimed
  if (meta.voteAverage >= 8.0) score += 15

  // +5 baseline (item is unlogged — enforced by exclusions)
  score += 5

  // Type variety penalty
  score -= typePenalty

  // Small random tiebreaker so equal scores vary daily
  score += Math.random() * 4

  return score
}

// ─── Reasons ─────────────────────────────────────────────────────────────────

function generateReasons(
  mediaType: "film" | "tv" | "book",
  mediaId: string,
  candidateCreator: string | null | undefined,
  prefs: UserPreferences
): string[] {
  const meta = getMediaMeta(mediaType, mediaId)
  const reasons: string[] = []

  // "Because you love [genre]"
  for (const genre of meta.genres) {
    if (prefs.preferredGenres.has(genre)) {
      reasons.push(`Because you love ${genre}`)
      break
    }
  }

  // "Similar to [title]" — genre similarity first, then creator similarity
  let similarTitle: string | undefined
  for (const genre of meta.genres) {
    const t = prefs.topRatedByGenre.get(genre)
    if (t) { similarTitle = t; break }
  }
  if (!similarTitle && candidateCreator) {
    similarTitle = prefs.topRatedByCreator.get(candidateCreator)
  }
  if (similarTitle && !reasons.some((r) => r.includes(similarTitle!)) && reasons.length < 4) {
    reasons.push(`Similar to ${similarTitle}`)
  }

  // "Critically acclaimed"
  if (meta.voteAverage >= 8.0 && reasons.length < 4) {
    reasons.push("Critically acclaimed")
  }

  // Only pad with fallback reason if fewer than 2 genuine ones
  if (reasons.length < 2) {
    reasons.push("You haven't logged it yet")
  }

  return reasons.slice(0, 4)
}

// ─── Build scored candidates ──────────────────────────────────────────────────

function buildScoredCandidates(
  filmIds: Set<string>,
  tvIds: Set<string>,
  bookIds: Set<string>,
  prefs: UserPreferences,
  typePenalties: Map<"film" | "tv" | "book", number>,
  extraExcludeId?: string
): Candidate[] {
  const candidates: Candidate[] = []

  for (const movie of localMovies) {
    if (filmIds.has(movie.id) || movie.id === extraExcludeId) continue
    candidates.push({
      media_type: "film",
      media_id: movie.id,
      creator: movie.director,
      score: scoreCandidate("film", movie.id, movie.director, prefs, typePenalties.get("film") ?? 0),
    })
  }

  for (const series of localSeries) {
    if (tvIds.has(series.id) || series.id === extraExcludeId) continue
    candidates.push({
      media_type: "tv",
      media_id: series.id,
      creator: series.creator,
      score: scoreCandidate("tv", series.id, series.creator, prefs, typePenalties.get("tv") ?? 0),
    })
  }

  for (const book of localBooks) {
    if (bookIds.has(book.id) || book.id === extraExcludeId) continue
    candidates.push({
      media_type: "book",
      media_id: book.id,
      creator: book.author,
      score: scoreCandidate("book", book.id, book.author, prefs, typePenalties.get("book") ?? 0),
    })
  }

  return candidates.sort((a, b) => b.score - a.score)
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET() {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)

  const { data: existing } = await supabase
    .from("daily_picks")
    .select("*")
    .eq("user_id", user.id)
    .eq("pick_date", today)
    .maybeSingle()

  if (existing) {
    const enriched = enrichPick(existing.media_type as "film" | "tv" | "book", existing.media_id as string)
    if (!enriched) return NextResponse.json({ error: "Pick media not found" }, { status: 404 })
    const prefs = await buildUserPreferences(supabase, user.id)
    const reasons = generateReasons(existing.media_type as "film" | "tv" | "book", existing.media_id as string, enriched.creator, prefs)
    return NextResponse.json({
      id: existing.id as string,
      pick_date: existing.pick_date as string,
      reroll_count: existing.reroll_count as number,
      reasons,
      ...enriched,
    } satisfies DailyPickData)
  }

  const [exclusions, prefs, typePenalties] = await Promise.all([
    buildExclusionSets(supabase, user.id),
    buildUserPreferences(supabase, user.id),
    buildTypePenalties(supabase, user.id, today),
  ])

  const candidates = buildScoredCandidates(exclusions.filmIds, exclusions.tvIds, exclusions.bookIds, prefs, typePenalties)
  if (candidates.length === 0) return NextResponse.json({ error: "No candidates available" }, { status: 404 })

  const best = candidates[0]
  const enriched = enrichPick(best.media_type, best.media_id)
  if (!enriched) return NextResponse.json({ error: "Pick media not found" }, { status: 404 })

  const reasons = generateReasons(best.media_type, best.media_id, best.creator, prefs)

  const { data: inserted, error } = await supabase
    .from("daily_picks")
    .insert({ user_id: user.id, pick_date: today, media_type: best.media_type, media_id: best.media_id, reroll_count: 0 })
    .select()
    .single()

  if (error || !inserted) return NextResponse.json({ error: "Failed to save pick" }, { status: 500 })

  return NextResponse.json({
    id: inserted.id as string,
    pick_date: inserted.pick_date as string,
    reroll_count: 0,
    reasons,
    ...enriched,
  } satisfies DailyPickData)
}

// ─── POST (reroll) ────────────────────────────────────────────────────────────

export async function POST() {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)

  const { data: existing } = await supabase
    .from("daily_picks")
    .select("*")
    .eq("user_id", user.id)
    .eq("pick_date", today)
    .maybeSingle()

  if (!existing) return NextResponse.json({ error: "No pick exists for today" }, { status: 404 })
  if ((existing.reroll_count as number) >= 1) return NextResponse.json({ error: "No more rerolls today" }, { status: 409 })

  const previousMediaId = existing.media_id as string

  const [exclusions, prefs, typePenalties] = await Promise.all([
    buildExclusionSets(supabase, user.id),
    buildUserPreferences(supabase, user.id),
    buildTypePenalties(supabase, user.id, today),
  ])

  const candidates = buildScoredCandidates(exclusions.filmIds, exclusions.tvIds, exclusions.bookIds, prefs, typePenalties, previousMediaId)
  if (candidates.length === 0) return NextResponse.json({ error: "No candidates available" }, { status: 404 })

  const best = candidates[0]
  const enriched = enrichPick(best.media_type, best.media_id)
  if (!enriched) return NextResponse.json({ error: "Pick media not found" }, { status: 404 })

  const reasons = generateReasons(best.media_type, best.media_id, best.creator, prefs)

  const { data: updated, error } = await supabase
    .from("daily_picks")
    .update({ media_type: best.media_type, media_id: best.media_id, reroll_count: 1 })
    .eq("id", existing.id as string)
    .select()
    .single()

  if (error || !updated) return NextResponse.json({ error: "Failed to update pick" }, { status: 500 })

  return NextResponse.json({
    id: updated.id as string,
    pick_date: updated.pick_date as string,
    reroll_count: 1,
    reasons,
    ...enriched,
  } satisfies DailyPickData)
}
