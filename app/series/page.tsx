export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { getSeriesHrefFromTmdbId } from "@/lib/seriesRoutes"
import { COLLECTION_DEFS } from "@/lib/discoverCollections"
import type { DiscoverItem, CollectionCard } from "@/lib/discoverTypes"
import SeriesClient, { type HeroShow } from "./SeriesClient"

export const metadata = {
  title: "Series – ReelShelf",
  description: "Trending TV, crime dramas, sci-fi, and acclaimed series — all in one place.",
}

// ─── TMDB ─────────────────────────────────────────────────────────────────────

const TMDB_API_KEY = process.env.TMDB_API_KEY ?? process.env.NEXT_PUBLIC_TMDB_API_KEY
const TMDB_BASE = "https://api.themoviedb.org/3"
const TMDB_IMG = "https://image.tmdb.org/t/p/w500"
const TMDB_BACKDROP = "https://image.tmdb.org/t/p/w1280"

interface TMDBTvResult {
  id: number
  name: string
  poster_path: string | null
  backdrop_path?: string | null
  first_air_date: string
  popularity: number
  vote_average?: number
  adult?: boolean
}

interface TMDBDiscoverResult {
  id: number
  title?: string
  name?: string
  poster_path: string | null
  first_air_date?: string
  popularity: number
  vote_average?: number
  adult?: boolean
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

function toDiscoverItem(r: TMDBDiscoverResult, badge?: string): DiscoverItem {
  return {
    id: String(r.id),
    mediaType: "tv",
    title: r.title ?? r.name ?? "Untitled",
    year: yearOf(r.first_air_date),
    poster: tmdbPoster(r.poster_path),
    href: getSeriesHrefFromTmdbId(r.id),
    badge,
  }
}

// ─── Adult content exclusion (identical to Movies page) ───────────────────────
// TMDB include_adult=false only excludes content TMDB has explicitly flagged adult=true.
// Niche/art titles with explicit content (e.g. "Nude" 2017) pass through as adult=false.
// This blocklist catches mis-classified titles via unambiguous title tokens.

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

// ─── TV collection slugs for this page ────────────────────────────────────────

const TV_COLL_SLUGS = ["mind-bending-tv", "crime-drama-tv"]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SeriesPage() {
  const supabase = await createClient()

  const tvCollDefs = COLLECTION_DEFS.filter(
    (c) => c.tmdbPath && c.tmdbMediaType === "tv" && TV_COLL_SLUGS.includes(c.slug),
  )

  // Get logged-in state for Continue Watching gate
  const userResult = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } }
  const isLoggedIn = !!(userResult?.data?.user)

  // Parallel TMDB fetches
  const [
    trendingRaw,
    acclaimedRaw,
    crimeRaw,
    sciFiRaw,
    comedyRaw,
    dramaRaw,
    hiddenRaw,
    ...collDataRaw
  ] = await Promise.all([
    tmdbGet<TMDBTvResult>("/trending/tv/day"),
    tmdbGet<TMDBDiscoverResult>("/discover/tv?vote_average.gte=8.0&vote_count.gte=300&sort_by=vote_average.desc&include_adult=false"),
    tmdbGet<TMDBDiscoverResult>("/discover/tv?with_genres=80&vote_average.gte=7.0&vote_count.gte=200&sort_by=popularity.desc&include_adult=false"),
    tmdbGet<TMDBDiscoverResult>("/discover/tv?with_genres=10765&vote_average.gte=7.0&vote_count.gte=200&sort_by=popularity.desc&include_adult=false"),
    tmdbGet<TMDBDiscoverResult>("/discover/tv?with_genres=35&vote_average.gte=7.0&vote_count.gte=200&sort_by=popularity.desc&include_adult=false"),
    tmdbGet<TMDBDiscoverResult>("/discover/tv?with_genres=18&vote_average.gte=7.5&vote_count.gte=300&sort_by=popularity.desc&include_adult=false"),
    tmdbGet<TMDBDiscoverResult>("/discover/tv?vote_average.gte=7.5&vote_count.gte=50&vote_count.lte=2000&sort_by=vote_average.desc&include_adult=false"),
    ...tvCollDefs.map((c) => tmdbGet<TMDBDiscoverResult>(c.tmdbPath!)),
  ])

  // ── Hero show ───────────────────────────────────────────────────────────────
  const heroRaw = trendingRaw[0] ?? null
  const heroShow: HeroShow | null = heroRaw
    ? {
        title: heroRaw.name,
        year: yearOf(heroRaw.first_air_date),
        poster: tmdbPoster(heroRaw.poster_path),
        backdrop: tmdbBackdrop(heroRaw.backdrop_path ?? null),
        href: getSeriesHrefFromTmdbId(heroRaw.id),
      }
    : null

  // ── Everyone's Watching ─────────────────────────────────────────────────────
  const everyoneWatching: DiscoverItem[] = trendingRaw
    .filter((r) => !!r.poster_path && !isAdultContent(r))
    .slice(0, 12)
    .map((r) => ({
      id: String(r.id), mediaType: "tv" as const,
      title: r.name, year: yearOf(r.first_air_date),
      poster: tmdbPoster(r.poster_path), href: getSeriesHrefFromTmdbId(r.id),
    }))

  // ── Acclaimed Series (merges "Limited Series" + "One Season Masterpieces") ──
  // TMDB /discover/tv does not support number_of_seasons filter.
  // vote_average >= 8.0 with high vote_count selects the same prestige tier both rows intended.
  const acclaimedSeries: DiscoverItem[] = acclaimedRaw
    .filter((r) => !isAdultContent(r))
    .slice(0, 12)
    .map((r) => toDiscoverItem(r, "Acclaimed 🏆"))

  // ── Crime ───────────────────────────────────────────────────────────────────
  const crime: DiscoverItem[] = crimeRaw
    .filter((r) => !isAdultContent(r))
    .slice(0, 12)
    .map((r) => toDiscoverItem(r))

  // ── Sci-Fi & Fantasy ────────────────────────────────────────────────────────
  const sciFi: DiscoverItem[] = sciFiRaw
    .filter((r) => !isAdultContent(r))
    .slice(0, 12)
    .map((r) => toDiscoverItem(r))

  // ── Comedy ──────────────────────────────────────────────────────────────────
  const comedy: DiscoverItem[] = comedyRaw
    .filter((r) => !isAdultContent(r))
    .slice(0, 12)
    .map((r) => toDiscoverItem(r))

  // ── Character Dramas ────────────────────────────────────────────────────────
  const drama: DiscoverItem[] = dramaRaw
    .filter((r) => !isAdultContent(r))
    .slice(0, 12)
    .map((r) => toDiscoverItem(r))

  // ── Hidden Gems (adult exclusion applied — same as Movies and Discover) ──────
  const hiddenGems: DiscoverItem[] = hiddenRaw
    .filter((r) => !isAdultContent(r))
    .slice(0, 12)
    .map((r) => toDiscoverItem(r, "Hidden Gem 💎"))

  // ── Collections ─────────────────────────────────────────────────────────────
  const collections: CollectionCard[] = tvCollDefs
    .map((def, i) => {
      const raw = collDataRaw[i] ?? []
      return {
        slug: def.slug,
        name: def.name,
        description: def.description,
        posters: raw
          .filter((r) => !isAdultContent(r))
          .slice(0, 4)
          .map((r) => tmdbPoster(r.poster_path))
          .filter(Boolean) as string[],
        count: raw.filter((r) => !isAdultContent(r)).length,
      }
    })
    .filter((c) => c.count >= 3)

  return (
    <SeriesClient
      heroShow={heroShow}
      everyoneWatching={everyoneWatching}
      acclaimedSeries={acclaimedSeries}
      crime={crime}
      sciFi={sciFi}
      comedy={comedy}
      drama={drama}
      hiddenGems={hiddenGems}
      collections={collections}
      isLoggedIn={isLoggedIn}
    />
  )
}
