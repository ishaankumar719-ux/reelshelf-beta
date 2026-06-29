export const dynamic = "force-dynamic"

import Link from "next/link"
import { notFound } from "next/navigation"
import { localMovies } from "@/lib/localMovies"
import { localBooks } from "@/lib/localBooks"
import { getBookHrefFromRouteId } from "@/lib/bookRoutes"
import { getSeriesHrefFromTmdbId } from "@/lib/seriesRoutes"
import { COLLECTION_DEFS } from "@/lib/discoverCollections"

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

interface ResultItem {
  id: string
  href: string
  posterUrl: string | null
  title: string
  year: string
  mediaType: "movie" | "tv" | "book"
}

async function fetchTmdb(path: string): Promise<TMDBResult[]> {
  if (!TMDB_KEY) return []
  try {
    const sep = path.includes("?") ? "&" : "?"
    const res = await fetch(
      `${TMDB_BASE}${path}${sep}api_key=${TMDB_KEY}&language=en-US`,
      { next: { revalidate: 3600 } },
    )
    if (!res.ok) return []
    const data = (await res.json()) as { results?: TMDBResult[] }
    return data.results ?? []
  } catch {
    return []
  }
}

function posterUrl(path: string | null): string | null {
  if (!path) return null
  if (path.startsWith("http")) return path
  return `${TMDB_IMG}${path.startsWith("/") ? "" : "/"}${path}`
}

function yearOf(d: string | null | undefined) {
  return d ? d.slice(0, 4) : ""
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function ItemCard({ item }: { item: ResultItem }) {
  const typeLabel = { movie: "Film", tv: "TV", book: "Book" }[item.mediaType]
  return (
    <Link href={item.href} className="coll-card" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      <div style={{
        position: "relative",
        aspectRatio: "2/3",
        borderRadius: 10,
        overflow: "hidden",
        background: "#131320",
        border: "1px solid rgba(255,255,255,0.08)",
        marginBottom: 8,
      }}>
        {item.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.posterUrl} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 10 }}>
            <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center" }}>{item.title}</span>
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 40%)", pointerEvents: "none" }} />
      </div>
      <span style={{
        display: "inline-block", padding: "2px 7px", borderRadius: 5, marginBottom: 4,
        background: "rgba(255,255,255,0.07)", border: "0.5px solid rgba(255,255,255,0.13)",
        fontFamily: SANS, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
        textTransform: "uppercase", color: "rgba(255,255,255,0.5)", lineHeight: 1,
      }}>
        {typeLabel}
      </span>
      <p style={{ margin: 0, fontFamily: SANS, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.88)", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {item.title}
      </p>
      {item.year && (
        <p style={{ margin: "3px 0 0", fontFamily: SANS, fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{item.year}</p>
      )}
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const def = COLLECTION_DEFS.find((c) => c.slug === slug)
  if (!def) notFound()

  let items: ResultItem[] = []

  if (def.tmdbPath && def.tmdbMediaType) {
    const raw = await fetchTmdb(def.tmdbPath)
    const isMovie = def.tmdbMediaType === "movie"
    items = raw.map((r): ResultItem => ({
      id: String(r.id),
      href: isMovie ? `/films/${r.id}` : getSeriesHrefFromTmdbId(r.id),
      posterUrl: posterUrl(r.poster_path),
      title: r.title ?? r.name ?? "Untitled",
      year: yearOf(r.release_date ?? r.first_air_date),
      mediaType: isMovie ? "movie" : "tv",
    }))
  } else if (def.localFilter === "classic-literature") {
    items = localBooks
      .filter((b) => parseInt(b.year) < 1980)
      .map((b): ResultItem => ({
        id: b.id,
        href: getBookHrefFromRouteId(b.id),
        posterUrl: null,
        title: b.title,
        year: b.year,
        mediaType: "book",
      }))
  } else if (def.localFilter === "books-to-screen") {
    const movieTitles = new Set(localMovies.map((m) => m.title.toLowerCase()))
    items = localBooks
      .filter((b) => movieTitles.has(b.title.toLowerCase()))
      .map((b): ResultItem => ({
        id: b.id,
        href: getBookHrefFromRouteId(b.id),
        posterUrl: null,
        title: b.title,
        year: b.year,
        mediaType: "book",
      }))
  }

  return (
    <>
      <style>{`
        .coll-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 16px 12px;
        }
        .coll-card { transition: transform 0.18s ease; }
        .coll-card:hover { transform: translateY(-3px); }
      `}</style>

      {/* Back link */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/discover" style={{ fontFamily: SANS, fontSize: 12, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>
          ← Discover
        </Link>
      </div>

      {/* Header */}
      <div style={{ marginBottom: "clamp(24px,4vw,36px)" }}>
        <p style={{ margin: "0 0 5px", fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)" }}>
          Collection · {items.length} title{items.length !== 1 ? "s" : ""}
        </p>
        <h1 style={{ margin: "0 0 8px", fontFamily: SANS, fontSize: "clamp(22px,4vw,36px)", fontWeight: 700, letterSpacing: "-0.5px", color: "rgba(255,255,255,0.92)", lineHeight: 1.15 }}>
          {def.name}
        </h1>
        <p style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontSize: "clamp(13px,1.6vw,15px)", color: "rgba(255,255,255,0.42)", lineHeight: 1.6, maxWidth: 500 }}>
          {def.description}
        </p>
      </div>

      {items.length === 0 ? (
        <p style={{ fontFamily: SANS, fontSize: 14, color: "rgba(255,255,255,0.3)" }}>
          No items in this collection right now.
        </p>
      ) : (
        <div className="coll-grid">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <div style={{ height: "clamp(24px,4vw,40px)" }} />
    </>
  )
}
