import { NextResponse } from "next/server"
import { resolveBookCover } from "@/lib/bookCovers"
import { getBookHrefFromRouteId } from "@/lib/bookRoutes"
import { localBooks } from "@/lib/localBooks"
import { getLocalMovieByTmdbId } from "@/lib/localMovies"
import { getMovieHrefFromTmdbId } from "@/lib/movieRoutes"
import { getLocalSeriesByTmdbId } from "@/lib/localSeries"
import { getSeriesHrefFromTmdbId } from "@/lib/seriesRoutes"
import type { SearchResult } from "@/src/hooks/useSearch"

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY
const TMDB_BASE = "https://api.themoviedb.org/3"

type SearchApiResponse = {
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

async function searchFilms(query: string, page: number, limit: number): Promise<SearchResult[]> {
  if (!TMDB_API_KEY) return []

  const response = await fetch(
    `${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=${page}`,
    { cache: "no-store" }
  )

  if (!response.ok) return []

  const data = (await response.json()) as {
    results?: Array<{
      id: number
      title: string
      release_date?: string
      poster_path?: string | null
    }>
  }

  return (data.results || []).slice(0, limit).map((item) => {
    const localMovie = getLocalMovieByTmdbId(item.id)
    return {
      id: item.id,
      media_type: "film",
      title: item.title,
      year: item.release_date ? item.release_date.slice(0, 4) : null,
      poster_path: item.poster_path || toPosterPath(localMovie?.poster),
      director: localMovie?.director || null,
      href: getMovieHrefFromTmdbId(item.id),
    } satisfies SearchResult
  })
}

async function searchSeries(query: string, page: number, limit: number): Promise<SearchResult[]> {
  if (!TMDB_API_KEY) return []

  const response = await fetch(
    `${TMDB_BASE}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=${page}`,
    { cache: "no-store" }
  )

  if (!response.ok) return []

  const data = (await response.json()) as {
    results?: Array<{
      id: number
      name: string
      first_air_date?: string
      poster_path?: string | null
    }>
  }

  return (data.results || []).slice(0, limit).map((item) => {
    const localSeries = getLocalSeriesByTmdbId(item.id)
    return {
      id: item.id,
      media_type: "series",
      title: item.name,
      year: item.first_air_date ? item.first_air_date.slice(0, 4) : null,
      poster_path: item.poster_path || toPosterPath(localSeries?.posterPath || localSeries?.poster),
      director: localSeries?.creator || null,
      href: getSeriesHrefFromTmdbId(item.id),
    } satisfies SearchResult
  })
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
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim() || ""
  const typeParam = searchParams.get("type")?.trim() || ""
  const typesParam =
    typeParam === "both"
      ? "film,series"
      : typeParam
        ? typeParam
        : searchParams.get("types") || "film,series,book"
  const page = Math.max(1, Number(searchParams.get("page") || "1"))
  const limit = Math.min(20, Math.max(1, Number(searchParams.get("limit") || "7")))
  const types = new Set(typesParam.split(",").map((item) => item.trim()).filter(Boolean))

  if (!query || query.length < 2) {
    return NextResponse.json<SearchApiResponse>({
      films: [],
      series: [],
      books: [],
    })
  }

  const [films, series, books] = await Promise.all([
    hasType(types, "film") ? searchFilms(query, page, limit) : Promise.resolve([]),
    hasType(types, "series") ? searchSeries(query, page, limit) : Promise.resolve([]),
    hasType(types, "book") ? searchBooks(query, page, limit) : Promise.resolve([]),
  ])

  return NextResponse.json<SearchApiResponse>({
    films,
    series,
    books,
  })
}
