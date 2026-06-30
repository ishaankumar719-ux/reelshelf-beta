export const dynamic = "force-dynamic"

import { localMovies } from "@/lib/localMovies"
import { getMovieHrefFromRouteId } from "@/lib/movieRoutes"
import { COLLECTION_DEFS } from "@/lib/discoverCollections"
import type { DiscoverItem, CollectionCard } from "@/lib/discoverTypes"
import MoviesClient, { type HeroFilm, type DirectorRow } from "./MoviesClient"

export const metadata = {
  title: "Films – ReelShelf",
  description: "Trending films, award winners, hidden gems, and collections — all in one place.",
}

// ─── TMDB ─────────────────────────────────────────────────────────────────────

const TMDB_API_KEY = process.env.TMDB_API_KEY ?? process.env.NEXT_PUBLIC_TMDB_API_KEY
const TMDB_BASE = "https://api.themoviedb.org/3"
const TMDB_IMG = "https://image.tmdb.org/t/p/w500"
const TMDB_BACKDROP = "https://image.tmdb.org/t/p/w1280"

interface TMDBMovieResult {
  id: number
  title: string
  poster_path: string | null
  backdrop_path?: string | null
  release_date: string
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
  adult?: boolean
}

// Words that, when they appear as a standalone token in a title, signal adult content.
// TMDB's include_adult=false only excludes content TMDB has explicitly categorised as adult;
// art/niche films with explicit content (e.g. "Nude" 2017) slip through as adult=false.
const ADULT_TITLE_TOKENS = new Set([
  "nude", "naked", "porn", "porno", "pornographic",
  "xxx", "erotic", "erotica", "hentai", "softcore", "nsfw",
])

function isAdultContent(r: { title?: string; name?: string; adult?: boolean }): boolean {
  if (r.adult === true) return true
  const title = (r.title ?? r.name ?? "").toLowerCase()
  const tokens = title.split(/[\s\-–—_:,!?.()[\]\/]+/).filter(Boolean)
  return tokens.some((t) => ADULT_TITLE_TOKENS.has(t))
}

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

function tmdbBackdrop(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith("http")) return path
  return `${TMDB_BACKDROP}${path.startsWith("/") ? "" : "/"}${path}`
}

function yearOf(dateStr: string | null | undefined): string {
  if (!dateStr) return ""
  return dateStr.slice(0, 4)
}

function formatReleaseBadge(dateStr: string, todayStr: string): string | undefined {
  if (!dateStr || dateStr <= todayStr) return undefined
  const d = new Date(`${dateStr}T00:00:00`)
  if (isNaN(d.getTime())) return undefined
  return `Coming ${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })}`
}

function toDiscoverItem(r: TMDBDiscoverResult, badge?: string): DiscoverItem {
  return {
    id: String(r.id),
    mediaType: "movie",
    title: r.title ?? r.name ?? "Untitled",
    year: yearOf(r.release_date ?? r.first_air_date),
    poster: tmdbPoster(r.poster_path),
    href: `/films/${r.id}`,
    badge,
  }
}

// ─── Director grouping from localMovies ───────────────────────────────────────

function buildDirectorRows(): DirectorRow[] {
  const directorMap = new Map<string, DiscoverItem[]>()
  for (const m of localMovies) {
    const items = directorMap.get(m.director) ?? []
    items.push({
      id: m.id,
      mediaType: "movie",
      title: m.title,
      year: m.year,
      poster: m.poster,
      href: getMovieHrefFromRouteId(m.id),
      subtitle: m.director,
    })
    directorMap.set(m.director, items)
  }
  return Array.from(directorMap.entries())
    .filter(([, items]) => items.length >= 3)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3)
    .map(([director, items]) => ({ director, items }))
}

// ─── Movie collection slugs for this page ─────────────────────────────────────

const MOVIE_COLL_SLUGS = ["best-of-a24", "one-night-thrillers", "perfect-sunday-stories", "neo-noir"]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MoviesPage() {
  const todayStr = new Date().toISOString().slice(0, 10)

  const movieCollDefs = COLLECTION_DEFS.filter(
    (c) => c.tmdbPath && c.tmdbMediaType === "movie" && MOVIE_COLL_SLUGS.includes(c.slug),
  )

  // Parallel TMDB fetches
  const [
    trendingRaw,
    nowPlayingRaw,
    awardRaw,
    emotionalRaw,
    mindBendingRaw,
    horrorRaw,
    comedyRaw,
    koreanRaw,
    frenchRaw,
    hiddenRaw,
    ...collDataRaw
  ] = await Promise.all([
    tmdbGet<TMDBMovieResult>("/trending/movie/day"),
    tmdbGet<TMDBMovieResult>("/movie/now_playing"),
    tmdbGet<TMDBDiscoverResult>("/discover/movie?vote_average.gte=8.0&vote_count.gte=1000&sort_by=popularity.desc&include_adult=false"),
    tmdbGet<TMDBDiscoverResult>("/discover/movie?with_genres=18&vote_average.gte=7.0&vote_count.gte=500&sort_by=popularity.desc&include_adult=false"),
    tmdbGet<TMDBDiscoverResult>("/discover/movie?with_genres=878%7C53&vote_average.gte=7.5&vote_count.gte=300&sort_by=vote_average.desc&include_adult=false"),
    tmdbGet<TMDBDiscoverResult>("/discover/movie?with_genres=27&vote_average.gte=6.5&vote_count.gte=200&sort_by=popularity.desc&include_adult=false"),
    tmdbGet<TMDBDiscoverResult>("/discover/movie?with_genres=35&vote_average.gte=7.0&vote_count.gte=200&sort_by=popularity.desc&include_adult=false"),
    tmdbGet<TMDBDiscoverResult>("/discover/movie?with_original_language=ko&vote_average.gte=7.0&vote_count.gte=200&sort_by=popularity.desc&include_adult=false"),
    tmdbGet<TMDBDiscoverResult>("/discover/movie?with_original_language=fr&vote_average.gte=7.0&vote_count.gte=200&sort_by=popularity.desc&include_adult=false"),
    tmdbGet<TMDBDiscoverResult>("/discover/movie?vote_average.gte=7.5&vote_count.gte=100&vote_count.lte=5000&sort_by=vote_average.desc&include_adult=false"),
    ...movieCollDefs.map((c) => tmdbGet<TMDBDiscoverResult>(c.tmdbPath!)),
  ])

  // ── Hero film ───────────────────────────────────────────────────────────────
  const heroRaw = trendingRaw[0] ?? null
  const heroFilm: HeroFilm | null = heroRaw
    ? {
        title: heroRaw.title,
        year: yearOf(heroRaw.release_date),
        poster: tmdbPoster(heroRaw.poster_path),
        backdrop: tmdbBackdrop(heroRaw.backdrop_path ?? null),
        href: `/films/${heroRaw.id}`,
      }
    : null

  // ── Trending Now ────────────────────────────────────────────────────────────
  const trendingMovies: DiscoverItem[] = trendingRaw
    .filter((m) => !!m.poster_path)
    .slice(0, 12)
    .map((m) => ({
      id: String(m.id), mediaType: "movie" as const,
      title: m.title, year: yearOf(m.release_date),
      poster: tmdbPoster(m.poster_path), href: `/films/${m.id}`,
    }))

  // ── In Cinemas ──────────────────────────────────────────────────────────────
  const inCinemas: DiscoverItem[] = nowPlayingRaw
    .filter((m) => !!m.poster_path && !!m.release_date)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 12)
    .map((m) => ({
      id: String(m.id), mediaType: "movie" as const,
      title: m.title, year: yearOf(m.release_date),
      poster: tmdbPoster(m.poster_path), href: `/films/${m.id}`,
      releaseBadge: formatReleaseBadge(m.release_date, todayStr),
    }))

  // ── Award Winners ───────────────────────────────────────────────────────────
  const awardWinners: DiscoverItem[] = awardRaw
    .slice(0, 12)
    .map((r) => toDiscoverItem(r, "Award Winner 🏆"))

  // ── By Director (Villeneuve x4, Nolan x3, Fincher x3 from localMovies) ──────
  const byDirector = buildDirectorRows()

  // ── Emotional Stories ───────────────────────────────────────────────────────
  const emotional: DiscoverItem[] = emotionalRaw.slice(0, 12).map((r) => toDiscoverItem(r))

  // ── Mind-Bending (Sci-Fi | Thriller, 7.5+) ──────────────────────────────────
  const mindBending: DiscoverItem[] = mindBendingRaw.slice(0, 12).map((r) => toDiscoverItem(r))

  // ── Horror ──────────────────────────────────────────────────────────────────
  const horror: DiscoverItem[] = horrorRaw.slice(0, 12).map((r) => toDiscoverItem(r))

  // ── Comedy ──────────────────────────────────────────────────────────────────
  const comedy: DiscoverItem[] = comedyRaw.slice(0, 12).map((r) => toDiscoverItem(r))

  // ── World Cinema (Korean + French, deduped) ──────────────────────────────────
  const seenIds = new Set<string>()
  const worldCinema: DiscoverItem[] = [...koreanRaw, ...frenchRaw]
    .filter((r) => {
      if (seenIds.has(String(r.id))) return false
      seenIds.add(String(r.id))
      return !!r.poster_path
    })
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, 12)
    .map((r) => toDiscoverItem(r))

  // ── Hidden Gems ─────────────────────────────────────────────────────────────
  const hiddenGems: DiscoverItem[] = hiddenRaw
    .filter((r) => !isAdultContent(r))
    .slice(0, 12)
    .map((r) => toDiscoverItem(r, "Hidden Gem 💎"))

  // ── Collections ─────────────────────────────────────────────────────────────
  const collections: CollectionCard[] = movieCollDefs
    .map((def, i) => {
      const raw = collDataRaw[i] ?? []
      return {
        slug: def.slug,
        name: def.name,
        description: def.description,
        posters: raw
          .slice(0, 4)
          .map((r) => tmdbPoster(r.poster_path))
          .filter(Boolean) as string[],
        count: raw.length,
      }
    })
    .filter((c) => c.count >= 3)

  return (
    <MoviesClient
      heroFilm={heroFilm}
      trendingMovies={trendingMovies}
      inCinemas={inCinemas}
      awardWinners={awardWinners}
      byDirector={byDirector}
      emotional={emotional}
      mindBending={mindBending}
      horror={horror}
      comedy={comedy}
      worldCinema={worldCinema}
      hiddenGems={hiddenGems}
      collections={collections}
    />
  )
}
