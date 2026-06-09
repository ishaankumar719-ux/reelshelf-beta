import { NextResponse } from "next/server"
import { getBookHrefFromRouteId } from "@/lib/bookRoutes"
import { getLocalMovieByTmdbId, localMovies } from "@/lib/localMovies"
import { getMovieHrefFromTmdbId } from "@/lib/movieRoutes"
import { getLocalSeriesByTmdbId, localSeries } from "@/lib/localSeries"
import { getSeriesHrefFromTmdbId } from "@/lib/seriesRoutes"
import { createClient as createSupabaseClient } from "@/lib/supabase/server"
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
  short_films: SearchResult[]
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

// Used when TMDB_API_KEY is absent — keeps film/series results populated from
// the curated local dataset so the navbar search doesn't go completely dark.
function searchLocalMoviesFallback(query: string, limit: number): SearchResult[] {
  const q = query.toLowerCase().trim()
  return localMovies
    .filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.director ?? "").toLowerCase().includes(q)
    )
    .slice(0, limit)
    .map((m): SearchResult => ({
      id: m.tmdbId,
      media_type: "film",
      title: m.title,
      year: m.year,
      poster_path: toPosterPath(m.poster),
      director: m.director ?? null,
      href: getMovieHrefFromTmdbId(m.tmdbId),
    }))
}

function searchLocalSeriesFallback(query: string, limit: number): SearchResult[] {
  const q = query.toLowerCase().trim()
  return localSeries
    .filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.creator ?? "").toLowerCase().includes(q)
    )
    .slice(0, limit)
    .map((s): SearchResult => ({
      id: s.tmdbId,
      media_type: "series",
      title: s.title,
      year: s.year,
      poster_path: toPosterPath(s.posterPath ?? s.poster),
      director: s.creator ?? null,
      href: getSeriesHrefFromTmdbId(s.tmdbId),
    }))
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
  if (!TMDB_API_KEY) return []

  const tmdbUrl =
    `${TMDB_BASE}/search/multi` +
    `?api_key=${TMDB_API_KEY}` +
    `&query=${encodeURIComponent(query)}` +
    `&include_adult=false` +
    `&language=en-US` +
    `&page=${page}`

  const response = await fetch(tmdbUrl, { cache: "no-store" })

  const body = (await response.json()) as {
    total_results?: number
    results?: TmdbMultiResult[]
  }

  return (body.results ?? [])
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
}

type OpenLibraryDoc = {
  key?: string
  title?: string
  first_publish_year?: number
  cover_i?: number
  author_name?: string[]
}

// Same source as Mount Rushmore book search — Open Library, no API key required.
async function searchBooks(query: string, _page: number, limit: number): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query.trim())}&limit=${Math.min(limit, 10)}`,
      { cache: "no-store" }
    )
    if (!res.ok) {
      console.warn("[BOOK SEARCH] Open Library responded", res.status)
      return []
    }

    const data = (await res.json()) as { docs?: OpenLibraryDoc[] }
    if (!data.docs) return []

    return data.docs
      .filter((doc) => doc.key && doc.title)
      .slice(0, limit)
      .map((doc): SearchResult => {
        // doc.key is "/works/OL123W" — strip prefix for a clean route id
        const routeId = (doc.key ?? "").replace(/^\/works\//, "")
        return {
          id:          doc.key ?? routeId,
          media_type:  "book",
          title:       doc.title ?? "Untitled",
          year:        doc.first_publish_year ? String(doc.first_publish_year) : null,
          poster_path: doc.cover_i
            ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
            : null,
          author:      doc.author_name?.[0] ?? null,
          href:        getBookHrefFromRouteId(routeId),
        } satisfies SearchResult
      })
  } catch (err) {
    console.warn("[BOOK SEARCH] error", err)
    return []
  }
}

type ShortFilmRow = {
  id: string
  title: string
  release_year: number | null
  thumbnail_url: string | null
  channel: string | null
}

function toShortFilmResult(row: ShortFilmRow): SearchResult {
  return {
    id: row.id,
    media_type: "short_film" as const,
    title: row.title,
    year: row.release_year ? String(row.release_year) : null,
    poster_path: row.thumbnail_url,
    director: row.channel ?? null,
    href: `/short-films/${row.id}`,
  }
}

async function searchShortFilms(query: string, limit: number): Promise<SearchResult[]> {
  const supabase = await createSupabaseClient()
  if (!supabase) return []

  const q = query.trim()
  if (!q) return []

  // Three parallel queries — each uses supported PostgREST syntax only:
  // 1. title + channel ilike
  // 2. search_aliases exact element match (array containment)
  // 3. credits jsonb containment — exact credit name match
  const [{ data: mainData }, { data: aliasData }, { data: creditData }] =
    await Promise.all([
      supabase
        .from("short_films")
        .select("id, title, release_year, thumbnail_url, channel")
        .or(`title.ilike.%${q}%,channel.ilike.%${q}%`)
        .limit(limit),
      supabase
        .from("short_films")
        .select("id, title, release_year, thumbnail_url, channel")
        .contains("search_aliases", [q])
        .limit(3),
      supabase
        .from("short_films")
        .select("id, title, release_year, thumbnail_url, channel")
        .filter("credits", "cs", JSON.stringify([{ name: q }]))
        .limit(3),
    ])

  // Deduplicate by id across all three result sets
  const seen = new Set<string>()
  const rows: ShortFilmRow[] = []
  for (const row of [
    ...(mainData ?? []),
    ...(aliasData ?? []),
    ...(creditData ?? []),
  ]) {
    const r = row as ShortFilmRow
    if (!seen.has(r.id)) {
      seen.add(r.id)
      rows.push(r)
    }
  }

  return rows.map(toShortFilmResult)
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const query = url.searchParams.get("q") ?? url.searchParams.get("query") ?? ""
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
        short_films: [],
      })
    }

    const [tmdbResults, books, shortFilms] = await Promise.all([
      hasType(types, "film") || hasType(types, "series")
        ? searchTmdb(trimmedQuery, page)
        : Promise.resolve([]),
      hasType(types, "book") ? searchBooks(trimmedQuery, page, limit) : Promise.resolve([]),
      // .catch ensures a Supabase failure never poisons the TMDB/Books results
      searchShortFilms(trimmedQuery, Math.min(limit, 4)).catch(() => []),
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
            const localTV = getLocalSeriesByTmdbId(item.id)
            return {
              id: item.id,
              media_type: "series",
              title: item.title,
              year: item.year,
              poster_path:
                item.poster_path || toPosterPath(localTV?.posterPath || localTV?.poster),
              director: localTV?.creator || null,
              href: getSeriesHrefFromTmdbId(item.id),
            } satisfies SearchResult
          })
      : []

    // When TMDB is unavailable (missing API key), serve the curated local dataset
    // so film/series results don't go completely dark.
    const finalFilms =
      films.length > 0 || !hasType(types, "film")
        ? films
        : searchLocalMoviesFallback(trimmedQuery, limit)
    const finalSeries =
      series.length > 0 || !hasType(types, "series")
        ? series
        : searchLocalSeriesFallback(trimmedQuery, limit)

    return NextResponse.json<SearchApiResponse>({
      results: tmdbResults.slice(0, 20),
      films: finalFilms,
      series: finalSeries,
      books,
      short_films: shortFilms,
    })
  } catch (error) {
    console.error("[SEARCH API] uncaught error:", error)
    return NextResponse.json<SearchApiResponse>({
      results: [],
      films: [],
      series: [],
      books: [],
      short_films: [],
    })
  }
}
