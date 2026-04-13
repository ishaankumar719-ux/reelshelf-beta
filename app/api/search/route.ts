import { NextResponse } from "next/server"
import { resolveBookCover } from "@/lib/bookCovers"
import { getBookHrefFromRouteId } from "@/lib/bookRoutes"
import { localBooks } from "@/lib/localBooks"
import { getLocalMovieByTmdbId } from "@/lib/localMovies"
import { getMovieHrefFromTmdbId } from "@/lib/movieRoutes"
import { getLocalSeriesByTmdbId } from "@/lib/localSeries"
import { getSeriesHrefFromTmdbId } from "@/lib/seriesRoutes"
import type { SearchResult } from "@/src/hooks/useSearch"

const TMDB_API_KEY = process.env.TMDB_API_KEY ?? process.env.NEXT_PUBLIC_TMDB_API_KEY
const TMDB_BASE = "https://api.themoviedb.org/3"

type SearchApiResponse = {
  results: Array<{
    id: number
    tmdb_id: number
    media_type: "movie" | "tv"
    title: string
    year: string | null
    poster_path: string | null
    overview: string
  }>
  films: SearchResult[]
  series: SearchResult[]
  books: SearchResult[]
}

type SearchType = "film" | "series" | "book"

function normalize(value: string) {
  return value.toLowerCase().trim()
}

function toPosterPath(value: string | null | undefined) {
  if (!value) return null
  if (value.startsWith("http")) {
    const match = value.match(/\/t\/p\/(?:w\d+|original)(\/.+)$/)
    return match?.[1] ?? null
  }

  return value
}

function hasType(types: Set<string>, type: SearchType) {
  return types.has(type)
}

type TmdbMultiResult = {
  id: number
  media_type: "movie" | "tv" | "person"
  title?: string
  name?: string
  release_date?: string
  first_air_date?: string
  poster_path?: string | null
  overview?: string
}

async function searchTmdb(query: string, page: number) {
  console.log("[SEARCH API] TMDB key present:", !!TMDB_API_KEY)

  if (!TMDB_API_KEY) {
    console.error("[SEARCH API] FATAL: TMDB_API_KEY is not set in environment")
    return []
  }

  const tmdbUrl =
    `${TMDB_BASE}/search/multi` +
    `?api_key=${TMDB_API_KEY}` +
    `&query=${encodeURIComponent(query)}` +
    `&include_adult=false` +
    `&language=en-US` +
    `&page=${page}`

  console.log("[SEARCH API] fetching:", tmdbUrl.replace(TMDB_API_KEY, "KEY_HIDDEN"))

  const response = await fetch(tmdbUrl, { cache: "no-store" })
  console.log("[SEARCH API] TMDB response status:", response.status)

  const body = (await response.json()) as {
    total_results?: number
    results?: TmdbMultiResult[]
  }

  console.log("[SEARCH API] TMDB total results:", body.total_results)
  console.log("[SEARCH API] TMDB results array length:", body.results?.length ?? 0)
  console.log("[SEARCH API] TMDB first result:", JSON.stringify(body.results?.[0] ?? null))

  const mapped = (body.results ?? [])
    .filter((result) => result.media_type === "movie" || result.media_type === "tv")
    .map((result) => ({
      id: result.id,
      tmdb_id: result.id,
      media_type: result.media_type as "movie" | "tv",
      title: result.title ?? result.name ?? "",
      year: (result.release_date ?? result.first_air_date ?? "").slice(0, 4) || null,
      poster_path: result.poster_path ?? null,
      overview: result.overview ?? "",
    }))
    .filter((result) => result.title.length > 0)

  console.log("[SEARCH API] mapped count:", mapped.length)
  return mapped
}

async function searchBooks(query: string, page: number, limit: number): Promise<SearchResult[]> {
  const matches = localBooks.filter((book) =>
    [book.title, book.author, book.genre].some((value) => normalize(value).includes(normalize(query)))
  )

  const start = (page - 1) * limit
  const slice = matches.slice(start, start + limit)

  return Promise.all(
    slice.map(async (book, index) => ({
      id: start + index + 1,
      media_type: "book",
      title: book.title,
      year: book.year,
      poster_path: await resolveBookCover(book),
      author: book.author,
      href: getBookHrefFromRouteId(book.id),
    }))
  )
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const query = url.searchParams.get("q") ?? url.searchParams.get("query") ?? ""
    console.log("[SEARCH API] handler invoked, query:", query)

    const trimmedQuery = query.trim()
    const typeParam = url.searchParams.get("type")?.trim() || ""
    const typesParam =
      typeParam === "both"
        ? "film,series"
        : typeParam
          ? typeParam
          : url.searchParams.get("types") || "film,series,book"
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"))
    const limit = Math.min(20, Math.max(1, Number(url.searchParams.get("limit") || "7")))
    const types = new Set(typesParam.split(",").map((item) => item.trim()).filter(Boolean))

    if (!trimmedQuery || trimmedQuery.length < 2) {
      return NextResponse.json<SearchApiResponse>({
        results: [],
        films: [],
        series: [],
        books: [],
      })
    }

    const [tmdbResults, books] = await Promise.all([
      hasType(types, "film") || hasType(types, "series")
        ? searchTmdb(trimmedQuery, page)
        : Promise.resolve([]),
      hasType(types, "book") ? searchBooks(trimmedQuery, page, limit) : Promise.resolve([]),
    ])

    const films = hasType(types, "film")
      ? tmdbResults
          .filter((result) => result.media_type === "movie")
          .slice(0, limit)
          .map((item) => {
            const localMovie = getLocalMovieByTmdbId(item.id)
            return {
              id: item.id,
              media_type: "film",
              title: item.title,
              year: item.year,
              poster_path: item.poster_path || toPosterPath(localMovie?.poster),
              director: localMovie?.director || null,
              href: getMovieHrefFromTmdbId(item.id),
            } satisfies SearchResult
          })
      : []

    const series = hasType(types, "series")
      ? tmdbResults
          .filter((result) => result.media_type === "tv")
          .slice(0, limit)
          .map((item) => {
            const localSeries = getLocalSeriesByTmdbId(item.id)
            return {
              id: item.id,
              media_type: "series",
              title: item.title,
              year: item.year,
              poster_path:
                item.poster_path || toPosterPath(localSeries?.posterPath || localSeries?.poster),
              director: localSeries?.creator || null,
              href: getSeriesHrefFromTmdbId(item.id),
            } satisfies SearchResult
          })
      : []

    return NextResponse.json<SearchApiResponse>({
      results: tmdbResults.slice(0, 20),
      films,
      series,
      books,
    })
  } catch (error) {
    console.error("[SEARCH API] uncaught error:", error)
    return NextResponse.json<SearchApiResponse>({
      results: [],
      films: [],
      series: [],
      books: [],
    })
  }
}
