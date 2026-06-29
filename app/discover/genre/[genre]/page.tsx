export const dynamic = "force-dynamic"

import Link from "next/link"
import { notFound } from "next/navigation"
import { localBooks } from "@/lib/localBooks"
import { getBookHrefFromRouteId } from "@/lib/bookRoutes"
import { getSeriesHrefFromTmdbId } from "@/lib/seriesRoutes"

export function generateMetadata({ params }: { params: Promise<{ genre: string }> }) {
  void params
  return { title: "Genre – ReelShelf" }
}

// ─── Genre config ─────────────────────────────────────────────────────────────

const GENRE_CONFIG: Record<string, {
  label: string
  emoji: string
  movieId: number
  tvId: number
  bookKeywords: string[]
}> = {
  "sci-fi":       { label: "Sci-Fi",       emoji: "🚀", movieId: 878,   tvId: 10765, bookKeywords: ["Science Fiction", "Speculative Fiction"] },
  "thriller":     { label: "Thriller",     emoji: "🔪", movieId: 53,    tvId: 53,    bookKeywords: ["Thriller", "Psychological Thriller"] },
  "comedy":       { label: "Comedy",       emoji: "😂", movieId: 35,    tvId: 35,    bookKeywords: ["Comedy", "Humor"] },
  "fantasy":      { label: "Fantasy",      emoji: "🔮", movieId: 14,    tvId: 10765, bookKeywords: ["Fantasy", "Mythic Fiction"] },
  "mystery":      { label: "Mystery",      emoji: "🕵️", movieId: 9648,  tvId: 9648,  bookKeywords: ["Mystery", "Dark Academia", "Psychological Thriller"] },
  "drama":        { label: "Drama",        emoji: "🎭", movieId: 18,    tvId: 18,    bookKeywords: ["Literary Fiction", "Contemporary Fiction"] },
  "animation":    { label: "Animation",    emoji: "✏️", movieId: 16,    tvId: 16,    bookKeywords: [] },
  "romance":      { label: "Romance",      emoji: "💕", movieId: 10749, tvId: 10749, bookKeywords: ["Romance", "Contemporary Fiction"] },
  "horror":       { label: "Horror",       emoji: "👻", movieId: 27,    tvId: 27,    bookKeywords: ["Horror"] },
  "crime":        { label: "Crime",        emoji: "🚔", movieId: 80,    tvId: 80,    bookKeywords: ["Crime"] },
  "documentary":  { label: "Documentary",  emoji: "🎥", movieId: 99,    tvId: 99,    bookKeywords: [] },
  "adventure":    { label: "Adventure",    emoji: "🗺️", movieId: 12,    tvId: 10759, bookKeywords: ["Adventure"] },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SANS = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'
const SERIF = 'Georgia,"Times New Roman",Times,serif'
const TMDB_KEY = process.env.TMDB_API_KEY ?? process.env.NEXT_PUBLIC_TMDB_API_KEY
const TMDB_BASE = "https://api.themoviedb.org/3"
const TMDB_IMG = "https://image.tmdb.org/t/p/w500"

interface TMDBResult {
  id: number
  title?: string
  name?: string
  poster_path: string | null
  release_date?: string
  first_air_date?: string
}

async function tmdbGenre(type: "movie" | "tv", genreId: number): Promise<TMDBResult[]> {
  if (!TMDB_KEY) return []
  try {
    const endpoint = type === "movie" ? "movie" : "tv"
    const res = await fetch(
      `${TMDB_BASE}/discover/${endpoint}?with_genres=${genreId}&sort_by=popularity.desc&vote_count.gte=50&include_adult=false&api_key=${TMDB_KEY}&language=en-US`,
      { next: { revalidate: 3600 } },
    )
    if (!res.ok) return []
    const data = (await res.json()) as { results?: TMDBResult[] }
    return data.results ?? []
  } catch {
    return []
  }
}

function poster(path: string | null): string | null {
  if (!path) return null
  if (path.startsWith("http")) return path
  return `${TMDB_IMG}${path.startsWith("/") ? "" : "/"}${path}`
}

function yearOf(d: string | null | undefined) {
  return d ? d.slice(0, 4) : ""
}

// ─── Card components ──────────────────────────────────────────────────────────

function MediaCard({
  href, posterUrl, title, year, mediaType,
}: {
  href: string
  posterUrl: string | null
  title: string
  year: string
  mediaType: "movie" | "tv" | "book"
}) {
  const typeLabel = { movie: "Film", tv: "TV", book: "Book" }[mediaType]
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit", flexShrink: 0, scrollSnapAlign: "start", width: "min(140px, 38vw)", display: "block" }} className="genre-card">
      <div style={{
        position: "relative",
        aspectRatio: "2/3",
        borderRadius: 10,
        overflow: "hidden",
        background: "#131320",
        border: "1px solid rgba(255,255,255,0.08)",
        marginBottom: 8,
      }}>
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={posterUrl} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 10 }}>
            <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center" }}>{title}</span>
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 40%)", pointerEvents: "none" }} />
      </div>
      <div style={{ padding: "0 1px" }}>
        <span style={{
          display: "inline-block", padding: "2px 7px", borderRadius: 5,
          background: "rgba(255,255,255,0.07)", border: "0.5px solid rgba(255,255,255,0.13)",
          fontFamily: SANS, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
          textTransform: "uppercase", color: "rgba(255,255,255,0.5)", lineHeight: 1,
          marginBottom: 4,
        }}>
          {typeLabel}
        </span>
        <p style={{ margin: 0, fontFamily: SANS, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.88)", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {title}
        </p>
        {year && (
          <p style={{ margin: "3px 0 0", fontFamily: SANS, fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{year}</p>
        )}
      </div>
    </Link>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: "clamp(28px,4vw,44px)" }}>
      <h2 style={{ margin: "0 0 16px", fontFamily: SANS, fontSize: "clamp(16px,2.5vw,20px)", fontWeight: 700, color: "rgba(255,255,255,0.88)", letterSpacing: "-0.2px" }}>
        {label}
      </h2>
      {children}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function GenrePage({ params }: { params: Promise<{ genre: string }> }) {
  const { genre } = await params
  const config = GENRE_CONFIG[genre.toLowerCase()]
  if (!config) notFound()

  const [moviesRaw, tvRaw] = await Promise.all([
    tmdbGenre("movie", config.movieId),
    tmdbGenre("tv", config.tvId),
  ])

  const movies = moviesRaw.slice(0, 12)
  const tv = tvRaw.slice(0, 12)

  const genreBooks = localBooks.filter((b) =>
    config.bookKeywords.some((kw) => b.genre.toLowerCase().includes(kw.toLowerCase()))
  )

  const hasAnyContent = movies.length > 0 || tv.length > 0 || genreBooks.length > 0

  return (
    <>
      <style>{`
        .genre-row {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 4px;
        }
        .genre-row::-webkit-scrollbar { display: none; }
        @media (max-width: 760px) {
          .genre-row-wrap { margin-inline: -14px; }
          .genre-row { padding-inline: 14px 32px; }
        }
        @media (max-width: 390px) {
          .genre-row-wrap { margin-inline: -12px; }
          .genre-row { padding-inline: 12px 24px; }
        }
        .genre-card { transition: transform 0.18s ease; }
        .genre-card:hover { transform: translateY(-3px); }
        @media (max-width: 390px) { .genre-card { width: min(120px, 36vw) !important; } }
      `}</style>

      {/* Back link */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/discover" style={{ fontFamily: SANS, fontSize: 12, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>
          ← Discover
        </Link>
      </div>

      {/* Genre header */}
      <div style={{ marginBottom: "clamp(24px,4vw,40px)" }}>
        <p style={{ margin: "0 0 6px", fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)" }}>
          Genre
        </p>
        <h1 style={{ margin: 0, fontFamily: SANS, fontSize: "clamp(22px,4vw,36px)", fontWeight: 700, letterSpacing: "-0.5px", color: "rgba(255,255,255,0.92)", lineHeight: 1.15 }}>
          <span style={{ marginRight: 10 }}>{config.emoji}</span>{config.label}
        </h1>
      </div>

      {!hasAnyContent && (
        <p style={{ fontFamily: SANS, fontSize: 14, color: "rgba(255,255,255,0.3)" }}>
          No results found for this genre right now.
        </p>
      )}

      {movies.length > 0 && (
        <Section label="Films">
          <div className="genre-row-wrap" style={{ overflow: "hidden" }}>
            <div className="genre-row">
              {movies.map((m) => (
                <MediaCard
                  key={m.id}
                  href={`/films/${m.id}`}
                  posterUrl={poster(m.poster_path)}
                  title={m.title ?? ""}
                  year={yearOf(m.release_date)}
                  mediaType="movie"
                />
              ))}
            </div>
          </div>
        </Section>
      )}

      {tv.length > 0 && (
        <Section label="TV Shows">
          <div className="genre-row-wrap" style={{ overflow: "hidden" }}>
            <div className="genre-row">
              {tv.map((t) => (
                <MediaCard
                  key={t.id}
                  href={getSeriesHrefFromTmdbId(t.id)}
                  posterUrl={poster(t.poster_path)}
                  title={t.name ?? ""}
                  year={yearOf(t.first_air_date)}
                  mediaType="tv"
                />
              ))}
            </div>
          </div>
        </Section>
      )}

      {genreBooks.length > 0 && (
        <Section label="Books">
          <div className="genre-row-wrap" style={{ overflow: "hidden" }}>
            <div className="genre-row">
              {genreBooks.map((b) => (
                <MediaCard
                  key={b.id}
                  href={getBookHrefFromRouteId(b.id)}
                  posterUrl={null}
                  title={b.title}
                  year={b.year}
                  mediaType="book"
                />
              ))}
            </div>
          </div>
        </Section>
      )}

      <div style={{ height: "clamp(24px,4vw,40px)" }} />
    </>
  )
}
