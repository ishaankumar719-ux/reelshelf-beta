export const dynamic = "force-dynamic"

import Link from "next/link"
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
import SurpriseMe from "@/components/discover/SurpriseMe"

export const metadata = {
  title: "Discover – ReelShelf",
  description: "Trending films, TV and books — curated for you.",
}

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface DiscoverItem {
  id: string
  mediaType: "movie" | "tv" | "book"
  title: string
  year: string
  poster: string | null
  href: string
  subtitle?: string
  reason?: string
  releaseBadge?: string
  badge?: string
  trendScore?: number
}

interface CollectionCard {
  slug: string
  name: string
  description: string
  posters: string[]
  count: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SANS = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'
const SERIF = 'Georgia,"Times New Roman",Times,serif'
const TMDB_API_KEY = process.env.TMDB_API_KEY ?? process.env.NEXT_PUBLIC_TMDB_API_KEY
const TMDB_BASE = "https://api.themoviedb.org/3"
const TMDB_IMG = "https://image.tmdb.org/t/p/w500"

const GENRE_CHIPS = [
  { slug: "sci-fi", label: "Sci-Fi", emoji: "🚀" },
  { slug: "thriller", label: "Thriller", emoji: "🔪" },
  { slug: "comedy", label: "Comedy", emoji: "😂" },
  { slug: "fantasy", label: "Fantasy", emoji: "🔮" },
  { slug: "mystery", label: "Mystery", emoji: "🕵️" },
  { slug: "drama", label: "Drama", emoji: "🎭" },
  { slug: "animation", label: "Animation", emoji: "✏️" },
  { slug: "romance", label: "Romance", emoji: "💕" },
  { slug: "horror", label: "Horror", emoji: "👻" },
  { slug: "crime", label: "Crime", emoji: "🚔" },
  { slug: "documentary", label: "Documentary", emoji: "🎥" },
  { slug: "adventure", label: "Adventure", emoji: "🗺️" },
] as const

// ─── Data helpers ─────────────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

const TYPE_LABEL: Record<DiscoverItem["mediaType"], string> = {
  movie: "Film",
  tv: "TV",
  book: "Book",
}

function MediaBadge({ mediaType }: { mediaType: DiscoverItem["mediaType"] }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 7px",
      borderRadius: 5,
      background: "rgba(255,255,255,0.07)",
      border: "0.5px solid rgba(255,255,255,0.13)",
      fontFamily: SANS,
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: "0.06em",
      textTransform: "uppercase" as const,
      color: "rgba(255,255,255,0.5)",
      lineHeight: 1,
    }}>
      {TYPE_LABEL[mediaType]}
    </span>
  )
}

function DiscoverCard({ item }: { item: DiscoverItem }) {
  return (
    <Link href={item.href} className="disc-card" style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{
        position: "relative",
        aspectRatio: "2/3",
        borderRadius: 10,
        overflow: "hidden",
        background: "#131320",
        border: "1px solid rgba(255,255,255,0.08)",
        marginBottom: 8,
      }}>
        {item.poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.poster}
            alt={item.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            loading="lazy"
          />
        ) : (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 10,
          }}>
            <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center" }}>
              {item.title}
            </span>
          </div>
        )}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 40%)",
          pointerEvents: "none",
        }} />
        {item.releaseBadge && (
          <div style={{
            position: "absolute", bottom: 6, left: 7, right: 7,
            fontFamily: SANS, fontSize: 9, fontWeight: 700,
            color: "rgba(255,255,255,0.85)", letterSpacing: "0.03em", lineHeight: 1.3,
          }}>
            {item.releaseBadge}
          </div>
        )}
      </div>

      <div style={{ padding: "0 1px" }}>
        <div style={{ marginBottom: 4 }}>
          <MediaBadge mediaType={item.mediaType} />
        </div>
        {item.badge && (
          <p style={{
            margin: "0 0 4px",
            fontFamily: SANS, fontSize: 9, fontWeight: 700,
            letterSpacing: "0.04em", color: "rgba(29,158,117,0.9)",
          }}>
            {item.badge}
          </p>
        )}
        <p style={{
          margin: 0,
          fontFamily: SANS, fontSize: 12, fontWeight: 600,
          color: "rgba(255,255,255,0.88)", lineHeight: 1.3,
          display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
          overflow: "hidden",
        }}>
          {item.title}
        </p>
        {(item.year || item.subtitle) && (
          <p style={{
            margin: "3px 0 0",
            fontFamily: SANS, fontSize: 10,
            color: "rgba(255,255,255,0.3)", lineHeight: 1.4,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
          }}>
            {[item.year, item.subtitle].filter(Boolean).join(" · ")}
          </p>
        )}
        {item.reason && (
          <p style={{
            margin: "5px 0 0",
            fontFamily: SERIF, fontStyle: "italic", fontSize: 10,
            color: "rgba(255,255,255,0.33)", lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
            overflow: "hidden",
          }}>
            {item.reason}
          </p>
        )}
      </div>
    </Link>
  )
}

function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{
        margin: "0 0 5px",
        fontFamily: SANS, fontSize: 10, fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase" as const,
        color: "rgba(255,255,255,0.28)",
      }}>
        {eyebrow}
      </p>
      <h2 style={{
        margin: 0,
        fontFamily: SANS, fontSize: "clamp(18px,3vw,24px)",
        fontWeight: 700, letterSpacing: "-0.3px",
        color: "rgba(255,255,255,0.92)", lineHeight: 1.2,
      }}>
        {title}
      </h2>
    </div>
  )
}

function ScrollRow({ items }: { items: DiscoverItem[] }) {
  if (items.length === 0) return null
  return (
    <div className="disc-row-wrap">
      <div className="disc-row">
        {items.map((item) => (
          <DiscoverCard key={`${item.mediaType}-${item.id}`} item={item} />
        ))}
      </div>
    </div>
  )
}

function CollectionCardUI({ col }: { col: CollectionCard }) {
  return (
    <Link href={`/discover/collection/${col.slug}`} className="disc-coll-card" style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        height: 120,
        borderRadius: "10px 10px 0 0",
        overflow: "hidden",
      }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ overflow: "hidden", background: "#131320" }}>
            {col.posters[i] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={col.posters[i]}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.72, display: "block" }}
                loading="lazy"
              />
            ) : null}
          </div>
        ))}
      </div>
      <div style={{
        padding: "10px 12px 12px",
        background: "#0d0d14",
        border: "1px solid rgba(255,255,255,0.08)",
        borderTop: "none",
        borderRadius: "0 0 10px 10px",
      }}>
        <p style={{
          margin: "0 0 3px",
          fontFamily: SANS, fontSize: 9, fontWeight: 700,
          letterSpacing: "0.07em", textTransform: "uppercase" as const,
          color: "rgba(255,255,255,0.28)",
        }}>
          {col.count} title{col.count !== 1 ? "s" : ""}
        </p>
        <p style={{
          margin: "0 0 4px",
          fontFamily: SANS, fontSize: 13, fontWeight: 700,
          color: "rgba(255,255,255,0.88)", lineHeight: 1.3,
        }}>
          {col.name}
        </p>
        <p style={{
          margin: 0,
          fontFamily: SERIF, fontStyle: "italic", fontSize: 10,
          color: "rgba(255,255,255,0.33)", lineHeight: 1.5,
          display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
          overflow: "hidden",
        }}>
          {col.description}
        </p>
      </div>
    </Link>
  )
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
    // Section 6 — Hidden Gems: high rating, low vote_count (not massively popular)
    tmdbGet<TMDBDiscoverResult>("/discover/movie?vote_average.gte=7.5&vote_count.gte=100&vote_count.lte=5000&sort_by=vote_average.desc&include_adult=false"),
    tmdbGet<TMDBDiscoverResult>("/discover/tv?vote_average.gte=7.5&vote_count.gte=50&vote_count.lte=2000&sort_by=vote_average.desc&include_adult=false"),
    // Section 7 — Award Winners: very high rating, well-known
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

  // ── Section 1: Trending Today ───────────────────────────────────────────────
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
      return [{ id: book.id, mediaType: "book" as const, title: book.title, year: book.year,
        poster: bookCoverMap.get(book.id) ?? null, href: getBookHrefFromRouteId(book.id),
        subtitle: book.author, trendScore: count * 150 }]
    })

  const trendingToday = [...s1Movies, ...s1Tv, ...s1Books]
    .sort((a, b) => (b.trendScore ?? 0) - (a.trendScore ?? 0))
    .slice(0, 12)

  // ── Section 2: Recommendations ──────────────────────────────────────────────
  const recommendations = user && supabase
    ? await getRecommendations(supabase, user.id, bookCoverMap)
    : []

  // ── Section 3: New Movies ───────────────────────────────────────────────────
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

  // ── Section 4: Trending TV ──────────────────────────────────────────────────
  const trendingTvWeek: DiscoverItem[] = trendingTvWeekRaw.slice(0, 10).map((t) => ({
    id: String(t.id), mediaType: "tv" as const,
    title: t.name, year: yearOf(t.first_air_date),
    poster: tmdbPoster(t.poster_path), href: getSeriesHrefFromTmdbId(t.id),
  }))

  // ── Section 5: Trending Books ───────────────────────────────────────────────
  const trendingBooks30d: DiscoverItem[] = Array.from(bookCounts30d.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .flatMap(([id]): DiscoverItem[] => {
      const book = localBooks.find((b) => b.id === id)
      if (!book) return []
      return [{ id: book.id, mediaType: "book" as const, title: book.title, year: book.year,
        poster: bookCoverMap.get(book.id) ?? null, href: getBookHrefFromRouteId(book.id),
        subtitle: book.author }]
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

  // ── Section 6: Hidden Gems ──────────────────────────────────────────────────
  const hiddenGems: DiscoverItem[] = [
    ...hiddenMoviesRaw.slice(0, 6).map((r) => discoverResultToItem(r, "movie", "Hidden Gem 💎")),
    ...hiddenTvRaw.slice(0, 6).map((r) => discoverResultToItem(r, "tv", "Hidden Gem 💎")),
  ].slice(0, 10)

  // ── Section 7: Award Winners ────────────────────────────────────────────────
  const awardWinners: DiscoverItem[] = [
    ...awardMoviesRaw.slice(0, 6).map((r) => discoverResultToItem(r, "movie", "Award Winner 🏆")),
    ...awardTvRaw.slice(0, 6).map((r) => discoverResultToItem(r, "tv", "Award Winner 🏆")),
  ].slice(0, 10)

  // ── Section 10: Collections ─────────────────────────────────────────────────
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

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .disc-hero {
          margin-top: -28px;
          margin-inline: -20px;
          padding: clamp(52px,9vw,88px) clamp(20px,5vw,60px);
          background:
            radial-gradient(ellipse 90% 60% at 20% 50%, rgba(29,158,117,0.05) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 80% 30%, rgba(80,80,200,0.03) 0%, transparent 55%),
            #07070b;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          position: relative;
          overflow: hidden;
        }
        @media (max-width: 760px) {
          .disc-hero { margin-top: -16px; margin-inline: -14px; padding-block: clamp(40px,8vw,60px); }
        }
        @media (max-width: 390px) {
          .disc-hero { margin-top: -12px; margin-inline: -12px; }
        }

        .disc-section { padding-top: clamp(28px,4vw,44px); }

        .disc-row-wrap { overflow: hidden; }
        .disc-row {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 4px;
        }
        .disc-row::-webkit-scrollbar { display: none; }
        @media (max-width: 760px) {
          .disc-row-wrap { margin-inline: -14px; }
          .disc-row { padding-inline: 14px 32px; }
        }
        @media (max-width: 390px) {
          .disc-row-wrap { margin-inline: -12px; }
          .disc-row { padding-inline: 12px 24px; }
        }

        .disc-card {
          flex-shrink: 0;
          scroll-snap-align: start;
          width: min(140px, 38vw);
          transition: transform 0.18s ease;
        }
        .disc-card:hover { transform: translateY(-3px); }
        .disc-card:hover img { filter: brightness(1.05); }
        .disc-card img { transition: filter 0.18s ease; }
        @media (max-width: 390px) { .disc-card { width: min(120px, 36vw); } }

        .disc-genre-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        @media (max-width: 760px) { .disc-genre-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 480px) { .disc-genre-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; } }

        .disc-genre-chip {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 11px 14px;
          border-radius: 9999px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          text-decoration: none;
          color: rgba(255,255,255,0.72);
          font-family: "Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif;
          font-size: 13px;
          font-weight: 600;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
          white-space: nowrap;
        }
        .disc-genre-chip:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.18);
          color: rgba(255,255,255,0.92);
        }
        @media (max-width: 480px) {
          .disc-genre-chip { font-size: 12px; padding: 9px 12px; }
        }

        .disc-coll-card {
          flex-shrink: 0;
          scroll-snap-align: start;
          width: min(240px, 62vw);
          border-radius: 10px;
          overflow: hidden;
          transition: transform 0.18s ease;
          display: block;
        }
        .disc-coll-card:hover { transform: translateY(-3px); }
        @media (max-width: 390px) { .disc-coll-card { width: min(210px, 75vw); } }
      `}</style>

      {/* Hero */}
      <div className="disc-hero">
        <div style={{ maxWidth: 700 }}>
          <p style={{
            margin: "0 0 10px",
            fontFamily: SANS, fontSize: 10, fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: "rgba(29,158,117,0.8)",
          }}>
            ReelShelf Discover
          </p>
          <h1 style={{
            margin: "0 0 12px",
            fontFamily: SERIF, fontStyle: "italic",
            fontSize: "clamp(26px,5vw,46px)", fontWeight: 400,
            letterSpacing: "-0.5px",
            color: "rgba(255,255,255,0.92)", lineHeight: 1.1,
          }}>
            Discover Your Next Story
          </h1>
          <p style={{
            margin: 0,
            fontFamily: SANS, fontSize: "clamp(13px,1.8vw,15px)",
            color: "rgba(255,255,255,0.42)", lineHeight: 1.65,
            maxWidth: 480,
          }}>
            Curated recommendations across Movies, TV and Books
          </p>
        </div>
      </div>

      {/* Section 1: Trending Today */}
      {trendingToday.length > 0 && (
        <div className="disc-section">
          <SectionHead eyebrow="Right now" title="🔥 Trending Today" />
          <ScrollRow items={trendingToday} />
        </div>
      )}

      {/* Section 2: Because You Loved */}
      {recommendations.length >= 3 && (
        <div className="disc-section">
          <SectionHead eyebrow="Personalised for you" title="❤️ Because You Loved…" />
          <ScrollRow items={recommendations} />
        </div>
      )}

      {/* Section 3: New Movies */}
      {newMovies.length > 0 && (
        <div className="disc-section">
          <SectionHead eyebrow="In cinemas soon" title="🎬 New Movies" />
          <ScrollRow items={newMovies} />
        </div>
      )}

      {/* Section 4: Trending TV */}
      {trendingTvWeek.length > 0 && (
        <div className="disc-section">
          <SectionHead eyebrow="This week" title="📺 Trending TV" />
          <ScrollRow items={trendingTvWeek} />
        </div>
      )}

      {/* Section 5: Trending Books */}
      {trendingBooksDisplay.length > 0 && (
        <div className="disc-section">
          <SectionHead eyebrow="On shelves" title="📚 Trending Books" />
          <ScrollRow items={trendingBooksDisplay} />
        </div>
      )}

      {/* Section 6: Hidden Gems */}
      {hiddenGems.length >= 3 && (
        <div className="disc-section">
          <SectionHead eyebrow="Critically acclaimed, rarely watched" title="💎 Hidden Gems" />
          <ScrollRow items={hiddenGems} />
        </div>
      )}

      {/* Section 7: Award Winners */}
      {awardWinners.length >= 3 && (
        <div className="disc-section">
          <SectionHead eyebrow="The best of the best" title="🏆 Award Winners" />
          <ScrollRow items={awardWinners} />
        </div>
      )}

      {/* Section 8: Browse by Genre */}
      <div className="disc-section">
        <SectionHead eyebrow="Explore by mood" title="🎭 Browse by Genre" />
        <div className="disc-genre-grid">
          {GENRE_CHIPS.map(({ slug, label, emoji }) => (
            <Link key={slug} href={`/discover/genre/${slug}`} className="disc-genre-chip">
              <span style={{ fontSize: 16 }}>{emoji}</span>
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Section 9: Surprise Me */}
      <div className="disc-section">
        <SectionHead eyebrow="Not sure what to watch?" title="🎲 Surprise Me" />
        <SurpriseMe />
      </div>

      {/* Section 10: Collections */}
      {allCollections.length > 0 && (
        <div className="disc-section">
          <SectionHead eyebrow="Curated" title="🗂 Collections" />
          <div className="disc-row-wrap">
            <div className="disc-row">
              {allCollections.map((col) => (
                <CollectionCardUI key={col.slug} col={col} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ height: "clamp(24px,4vw,40px)" }} />
    </>
  )
}
