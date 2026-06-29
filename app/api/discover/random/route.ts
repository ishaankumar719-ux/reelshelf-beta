import { NextResponse } from "next/server"
import { localMovies } from "@/lib/localMovies"
import { localSeries } from "@/lib/localSeries"
import { localBooks } from "@/lib/localBooks"
import { getSeriesHrefFromTmdbId } from "@/lib/seriesRoutes"

export const dynamic = "force-dynamic"

const TMDB_KEY = process.env.TMDB_API_KEY ?? process.env.NEXT_PUBLIC_TMDB_API_KEY
const TMDB_BASE = "https://api.themoviedb.org/3"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") ?? "movie"
  const exclude = searchParams.get("exclude") ?? ""

  if (type === "book") {
    const pool = localBooks.filter((b) => b.id !== exclude)
    const item = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : localBooks[0]
    if (!item) return NextResponse.json({ error: "no books" }, { status: 404 })
    return NextResponse.json({ href: `/books/${item.id}`, id: item.id })
  }

  // For movie/tv: pick a random page from top-250 popular results
  if (TMDB_KEY) {
    try {
      const path =
        type === "movie"
          ? "/discover/movie?sort_by=popularity.desc&vote_count.gte=500&include_adult=false"
          : "/discover/tv?sort_by=popularity.desc&vote_count.gte=200&include_adult=false"
      const page = Math.ceil(Math.random() * 5)
      const res = await fetch(
        `${TMDB_BASE}${path}&page=${page}&api_key=${TMDB_KEY}&language=en-US`,
        { cache: "no-store" },
      )
      if (res.ok) {
        const data = (await res.json()) as { results?: { id: number; poster_path?: string | null }[] }
        const results = (data.results ?? []).filter(
          (r) => !!r.poster_path && String(r.id) !== exclude,
        )
        if (results.length > 0) {
          const item = results[Math.floor(Math.random() * results.length)]
          const href =
            type === "movie" ? `/films/${item.id}` : getSeriesHrefFromTmdbId(item.id)
          return NextResponse.json({ href, id: String(item.id) })
        }
      }
    } catch {
      // fall through to local fallback
    }
  }

  // Local fallback when TMDB key not available
  if (type === "movie") {
    const pool = localMovies.filter((m) => m.id !== exclude)
    const item = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : localMovies[0]
    if (!item) return NextResponse.json({ error: "no movies" }, { status: 404 })
    return NextResponse.json({ href: `/films/${item.tmdbId}`, id: item.id })
  }

  const pool = localSeries.filter((s) => s.id !== exclude)
  const item = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : localSeries[0]
  if (!item) return NextResponse.json({ error: "no tv" }, { status: 404 })
  return NextResponse.json({ href: `/series/${item.id}`, id: item.id })
}
