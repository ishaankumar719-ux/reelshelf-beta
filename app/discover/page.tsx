export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { localMovies } from "@/lib/localMovies"
import { localSeries } from "@/lib/localSeries"
import { localBooks } from "@/lib/localBooks"
import { resolveBooksWithCovers } from "@/lib/bookCovers"
import { getMovieHrefFromRouteId } from "@/lib/movieRoutes"
import { getSeriesHrefFromRouteId, getSeriesHrefFromTmdbId } from "@/lib/seriesRoutes"
import { getBookHrefFromRouteId } from "@/lib/bookRoutes"
import {
  buildUserContext,
  scoreCandidate,
  generateReasons,
} from "@/lib/recommendation-engine"
import { COLLECTION_DEFS } from "@/lib/discoverCollections"
import type { DiscoverItem, CollectionCard, HeroCard } from "@/lib/discoverTypes"
import DiscoverClient from "@/components/discover/DiscoverClient"

export const metadata = {
  title: "Discover – ReelShelf",
  description: "Trending films, TV and books — curated for you.",
}

// ─── TMDB types ───────────────────────────────────────────────────────────────

interface TMDBMovieResult {
  id: number
  title: string
  poster_path: string | null
  release_date: string
  popularity: number
  vote_average?: number
}

interface TMDBTvResult {
  id: number
  name: string
  poster_path: string | null
  first_air_date: string
  popularity: number
  vote_average?: number
}

interface TMDBDiscoverResult {
  id: number
  title?: string
  name?: string
  poster_path: string | null
  release_date?: string
  first_air_date?: string
  popularity: number
  vote_average?: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TMDB_API_KEY = process.env.TMDB_API_KEY ?? process.env.NEXT_PUBLIC_TMDB_API_KEY
const TMDB_BASE = "https://api.themoviedb.org/3"
const TMDB_IMG = "https://image.tmdb.org/t/p/w500"

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function tmdbGet<T>(path: string): Promise<T[]> {
  if (!TMDB_API_KEY) return []
  try {
    const sep = path.includes("?") ? "&" : "?"
    const res = await fetch(
      `${TMDB_BASE}${path}${sep}api_key=${TMDB_API_KEY}&language=en-US`,
      { next: { revalidate: 3600 } },
    )
    if (!res.ok) return []
    const data = (await res.json()) as { results?: T[] }
    return data.results ?? []
  } catch {
    return []
  }
}

function tmdbPoster(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith("http")) return path
  return `${TMDB_IMG}${path.startsWith("/") ? "" : "/"}${path}`
}

function yearOf(dateStr: string | null | undefined): string {
  if (!dateStr) return ""
  return dateStr.slice(0, 4)
}

function formatReleaseBadge(dateStr: string): string {
  if (!dateStr) return ""
  const d = new Date(`${dateStr}T00:00:00`)
  if (isNaN(d.getTime())) return ""
  return `Coming ${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })}`
}

function countOccurrences(rows: { media_id: string }[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of rows) {
    if (r.media_id) m.set(r.media_id, (m.get(r.media_id) ?? 0) + 1)
  }
  return m
}

function discoverResultToItem(
  r: TMDBDiscoverResult,
  mediaType: "movie" | "tv",
  badge?: string,
): DiscoverItem {
  return {
    id: String(r.id),
    mediaType,
    title: r.title ?? r.name ?? "Untitled",
    year: yearOf(r.release_date ?? r.first_air_date),
    poster: tmdbPoster(r.poster_path),
    href: mediaType === "movie" ? `/films/${r.id}` : getSeriesHrefFromTmdbId(r.id),
    badge,
  }
}

// ─── Recommendations ──────────────────────────────────────────────────────────

async function getRecommendations(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  userId: string,
  bookCoverMap: Map<string, string | null>,
): Promise<DiscoverItem[]> {
  try {
    const ctx = await buildUserContext(supabase, userId, { excludeWatchlist: false })

    const scored = [
      ...localMovies
        .filter((m) => !ctx.loggedFilmIds.has(m.id))
        .map((m) => scoreCandidate("film", m.id, m.director, ctx)),
      ...localSeries
        .filter((s) => !ctx.loggedTvIds.has(s.id))
        .map((s) => scoreCandidate("tv", s.id, s.creator, ctx)),
      ...localBooks
        .filter((b) => !ctx.loggedBookIds.has(b.id))
        .map((b) => scoreCandidate("book", b.id, b.author, ctx)),
    ]
      .filter((c) => c.totalScore > -500)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 8)

    return scored.flatMap((candidate): DiscoverItem[] => {
      const reason = generateReasons(candidate)[0]

      if (candidate.mediaType === "film") {
        const m = localMovies.find((x) => x.id === candidate.mediaId)
        if (!m) return []
        return [{
          id: m.id, mediaType: "movie", title: m.title, year: m.year,
          poster: m.poster ?? null, href: getMovieHrefFromRouteId(m.id),
          subtitle: m.director, reason,
        }]
      }

      if (candidate.mediaType === "tv") {
        const s = localSeries.find((x) => x.id === candidate.mediaId)
        if (!s) return []
        return [{
          id: s.id, mediaType: "tv", title: s.title, year: s.year,
          poster: s.poster ?? null, href: getSeriesHrefFromRouteId(s.id),
          subtitle: s.creator, reason,
        }]
      }

      const b = localBooks.find((x) => x.id === candidate.mediaId)
      if (!b) return []
      return [{
        id: b.id, mediaType: "book", title: b.title, year: b.year,
        poster: bookCoverMap.get(b.id) ?? null, href: getBookHrefFromRouteId(b.id),
        subtitle: b.author, reason,
      }]
    })
  } catch {
    return []
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DiscoverPage() {
  const supabase = await createClient()
  const todayDate = new Date()
  const todayStr = todayDate.toISOString().slice(0, 10)
  const sevenDaysAgo = new Date(todayDate.getTime() - 7 * 86400000).toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date(todayDate.getTime() - 30 * 86400000).toISOString().slice(0, 10)

  // ── Parallel fetches ────────────────────────────────────────────────────────
  const [
    trendingMoviesRaw,
    trendingTvDayRaw,
    upcomingMoviesRaw,
    trendingTvWeekRaw,
    userResult,
    bookLogsResult,
    hiddenMoviesRaw,
    hiddenTvRaw,
    awardMoviesRaw,
    awardTvRaw,
  ] = await Promise.all([
    tmdbGet<TMDBMovieResult>("/trending/movie/day"),
    tmdbGet<TMDBTvResult>("/trending/tv/day"),
    tmdbGet<TMDBMovieResult>("/movie/upcoming"),
    tmdbGet<TMDBTvResult>("/trending/tv/week"),
    supabase ? supabase.auth.getUser() : Promise.resolve({ data: { user: null } }),
    supabase
      ? supabase
          .from("diary_entries")
          .select("media_id, watched_date")
          .eq("media_type", "book")
          .gte("watched_date", thirtyDaysAgo)
          .not("media_id", "is", null)
      : Promise.resolve({ data: null }),
    tmdbGet<TMDBDiscoverResult>("/discover/movie?vote_average.gte=7.5&vote_count.gte=100&vote_count.lte=5000&sort_by=vote_average.desc&include_adult=false"),
    tmdbGet<TMDBDiscoverResult>("/discover/tv?vote_average.gte=7.5&vote_count.gte=50&vote_count.lte=2000&sort_by=vote_average.desc&include_adult=false"),
    tmdbGet<TMDBDiscoverResult>("/discover/movie?vote_average.gte=8.0&vote_count.gte=1000&sort_by=popularity.desc&include_adult=false"),
    tmdbGet<TMDBDiscoverResult>("/discover/tv?vote_average.gte=8.0&vote_count.gte=300&sort_by=popularity.desc&include_adult=false"),
  ])

  const user = userResult?.data?.user ?? null
  const bookLogsAll = (bookLogsResult?.data ?? []) as { media_id: string; watched_date: string }[]

  // ── Book counts ─────────────────────────────────────────────────────────────
  const bookCounts30d = countOccurrences(bookLogsAll)
  const bookCounts7d = countOccurrences(bookLogsAll.filter((r) => r.watched_date >= sevenDaysAgo))

  // ── Book cover resolution ───────────────────────────────────────────────────
  const trendingBookIds = new Set([
    ...Array.from(bookCounts30d.keys()).slice(0, 10),
    ...Array.from(bookCounts7d.keys()).slice(0, 5),
  ])
  const booksForCover = [
    ...localBooks.filter((b) => trendingBookIds.has(b.id)),
    ...localBooks.filter((b) => !trendingBookIds.has(b.id)).slice(0, Math.max(0, 12 - trendingBookIds.size)),
  ]
  const resolvedBooks = booksForCover.length > 0 ? await resolveBooksWithCovers(booksForCover) : []
  const bookCoverMap = new Map(resolvedBooks.map((b) => [b.id, b.coverUrl ?? null]))

  // ── Trending Today ──────────────────────────────────────────────────────────
  const s1Movies: DiscoverItem[] = trendingMoviesRaw.slice(0, 6).map((m) => ({
    id: String(m.id), mediaType: "movie" as const,
    title: m.title, year: yearOf(m.release_date),
    poster: tmdbPoster(m.poster_path), href: `/films/${m.id}`,
    trendScore: m.popularity,
  }))

  const s1Tv: DiscoverItem[] = trendingTvDayRaw.slice(0, 6).map((t) => ({
    id: String(t.id), mediaType: "tv" as const,
    title: t.name, year: yearOf(t.first_air_date),
    poster: tmdbPoster(t.poster_path), href: getSeriesHrefFromTmdbId(t.id),
    trendScore: t.popularity,
  }))

  const s1Books: DiscoverItem[] = Array.from(bookCounts7d.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .flatMap(([id, count]): DiscoverItem[] => {
      const book = localBooks.find((b) => b.id === id)
      if (!book) return []
      return [{
        id: book.id, mediaType: "book" as const, title: book.title, year: book.year,
        poster: bookCoverMap.get(book.id) ?? null, href: getBookHrefFromRouteId(book.id),
        subtitle: book.author, trendScore: count * 150,
      }]
    })

  const trendingToday = [...s1Movies, ...s1Tv, ...s1Books]
    .sort((a, b) => (b.trendScore ?? 0) - (a.trendScore ?? 0))
    .slice(0, 12)

  // ── Recommendations ─────────────────────────────────────────────────────────
  const recommendations = user && supabase
    ? await getRecommendations(supabase, user.id, bookCoverMap)
    : []

  // ── New Movies ──────────────────────────────────────────────────────────────
  const newMovies: DiscoverItem[] = upcomingMoviesRaw
    .filter((m) => !!m.release_date && !!m.poster_path)
    .sort((a, b) => a.release_date.localeCompare(b.release_date))
    .slice(0, 10)
    .map((m) => ({
      id: String(m.id), mediaType: "movie" as const,
      title: m.title, year: yearOf(m.release_date),
      poster: tmdbPoster(m.poster_path), href: `/films/${m.id}`,
      releaseBadge: m.release_date > todayStr ? formatReleaseBadge(m.release_date) : undefined,
    }))

  // ── Trending TV ─────────────────────────────────────────────────────────────
  const trendingTvWeek: DiscoverItem[] = trendingTvWeekRaw.slice(0, 10).map((t) => ({
    id: String(t.id), mediaType: "tv" as const,
    title: t.name, year: yearOf(t.first_air_date),
    poster: tmdbPoster(t.poster_path), href: getSeriesHrefFromTmdbId(t.id),
  }))

  // ── Trending Books ──────────────────────────────────────────────────────────
  const trendingBooks30d: DiscoverItem[] = Array.from(bookCounts30d.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .flatMap(([id]): DiscoverItem[] => {
      const book = localBooks.find((b) => b.id === id)
      if (!book) return []
      return [{
        id: book.id, mediaType: "book" as const, title: book.title, year: book.year,
        poster: bookCoverMap.get(book.id) ?? null, href: getBookHrefFromRouteId(book.id),
        subtitle: book.author,
      }]
    })

  const trendingBooksDisplay: DiscoverItem[] =
    trendingBooks30d.length >= 5
      ? trendingBooks30d
      : [
          ...trendingBooks30d,
          ...localBooks
            .filter((b) => !trendingBooks30d.some((t) => t.id === b.id))
            .slice(0, 10 - trendingBooks30d.length)
            .map((b) => ({
              id: b.id, mediaType: "book" as const, title: b.title, year: b.year,
              poster: bookCoverMap.get(b.id) ?? null, href: getBookHrefFromRouteId(b.id),
              subtitle: b.author,
            })),
        ]

  // ── Hidden Gems ─────────────────────────────────────────────────────────────
  const hiddenGems: DiscoverItem[] = [
    ...hiddenMoviesRaw.slice(0, 6).map((r) => discoverResultToItem(r, "movie", "Hidden Gem 💎")),
    ...hiddenTvRaw.slice(0, 6).map((r) => discoverResultToItem(r, "tv", "Hidden Gem 💎")),
  ].slice(0, 10)

  // ── Award Winners ───────────────────────────────────────────────────────────
  const awardWinners: DiscoverItem[] = [
    ...awardMoviesRaw.slice(0, 6).map((r) => discoverResultToItem(r, "movie", "Award Winner 🏆")),
    ...awardTvRaw.slice(0, 6).map((r) => discoverResultToItem(r, "tv", "Award Winner 🏆")),
  ].slice(0, 10)

  // ── Collections ─────────────────────────────────────────────────────────────
  const tmdbCollDefs = COLLECTION_DEFS.filter((c) => !!c.tmdbPath)
  const localCollDefs = COLLECTION_DEFS.filter((c) => !!c.localFilter)

  const collDataRaw = await Promise.all(
    tmdbCollDefs.map((c) => tmdbGet<TMDBDiscoverResult>(c.tmdbPath!))
  )

  const tmdbCollections: CollectionCard[] = tmdbCollDefs
    .map((def, i) => ({
      slug: def.slug,
      name: def.name,
      description: def.description,
      posters: collDataRaw[i]
        .slice(0, 4)
        .map((r) => tmdbPoster(r.poster_path))
        .filter(Boolean) as string[],
      count: collDataRaw[i].length,
    }))
    .filter((c) => c.count >= 3)

  const classicBooks = localBooks.filter((b) => parseInt(b.year) < 1980)
  const movieTitleSet = new Set(localMovies.map((m) => m.title.toLowerCase()))
  const adaptationBooks = localBooks.filter((b) => movieTitleSet.has(b.title.toLowerCase()))

  const localCollections: CollectionCard[] = localCollDefs
    .map((def) => {
      const books = def.localFilter === "classic-literature" ? classicBooks : adaptationBooks
      const posters = books
        .slice(0, 4)
        .map((b) => bookCoverMap.get(b.id) ?? null)
        .filter(Boolean) as string[]
      return { slug: def.slug, name: def.name, description: def.description, posters, count: books.length }
    })
    .filter((c) => c.count >= 3)

  const allCollections: CollectionCard[] = [...tmdbCollections, ...localCollections]

  // ── Hero cards (rotating Film / TV / Book spotlight) ────────────────────────
  const heroCards: HeroCard[] = [
    trendingMoviesRaw[0]
      ? {
          mediaType: "movie" as const,
          title: trendingMoviesRaw[0].title,
          year: yearOf(trendingMoviesRaw[0].release_date),
          poster: tmdbPoster(trendingMoviesRaw[0].poster_path),
          href: `/films/${trendingMoviesRaw[0].id}`,
        }
      : null,
    trendingTvDayRaw[0]
      ? {
          mediaType: "tv" as const,
          title: trendingTvDayRaw[0].name,
          year: yearOf(trendingTvDayRaw[0].first_air_date),
          poster: tmdbPoster(trendingTvDayRaw[0].poster_path),
          href: getSeriesHrefFromTmdbId(trendingTvDayRaw[0].id),
        }
      : null,
    localBooks[0]
      ? {
          mediaType: "book" as const,
          title: localBooks[0].title,
          year: localBooks[0].year,
          poster: bookCoverMap.get(localBooks[0].id) ?? null,
          href: getBookHrefFromRouteId(localBooks[0].id),
          meta: localBooks[0].pages ? `${localBooks[0].pages} pages` : undefined,
        }
      : null,
  ].filter(Boolean) as HeroCard[]

  return (
    <DiscoverClient
      trendingToday={trendingToday}
      recommendations={recommendations}
      newMovies={newMovies}
      trendingTvWeek={trendingTvWeek}
      trendingBooksDisplay={trendingBooksDisplay}
      hiddenGems={hiddenGems}
      awardWinners={awardWinners}
      collections={allCollections}
      heroCards={heroCards}
      isLoggedIn={!!user}
    />
  )
}
