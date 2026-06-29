"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { DiscoverItem, CollectionCard, HeroCard } from "@/lib/discoverTypes"
import SurpriseMe from "./SurpriseMe"
import { getDiaryMovies, subscribeToDiary } from "../../lib/diary"

// ─── Constants ────────────────────────────────────────────────────────────────

const SANS = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'
const SERIF = 'Georgia,"Times New Roman",Times,serif'

const GENRE_CHIPS = [
  { slug: "sci-fi",      label: "Sci-Fi",       emoji: "🚀" },
  { slug: "thriller",    label: "Thriller",     emoji: "🔪" },
  { slug: "comedy",      label: "Comedy",       emoji: "😂" },
  { slug: "fantasy",     label: "Fantasy",      emoji: "🔮" },
  { slug: "mystery",     label: "Mystery",      emoji: "🕵️" },
  { slug: "drama",       label: "Drama",        emoji: "🎭" },
  { slug: "animation",   label: "Animation",    emoji: "✏️" },
  { slug: "romance",     label: "Romance",      emoji: "💕" },
  { slug: "horror",      label: "Horror",       emoji: "👻" },
  { slug: "crime",       label: "Crime",        emoji: "🚔" },
  { slug: "documentary", label: "Documentary",  emoji: "🎥" },
  { slug: "adventure",   label: "Adventure",    emoji: "🗺️" },
] as const

type FilterKey =
  | "all" | "movies" | "tv" | "books"
  | "trending" | "new" | "popular"
  | "award-winners" | "hidden-gems"

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",           label: "All" },
  { key: "movies",        label: "🎬 Movies" },
  { key: "tv",            label: "📺 TV" },
  { key: "books",         label: "📚 Books" },
  { key: "trending",      label: "🔥 Trending" },
  { key: "new",           label: "🆕 New" },
  { key: "popular",       label: "⭐ Popular" },
  { key: "award-winners", label: "🏆 Award Winners" },
  { key: "hidden-gems",   label: "💎 Hidden Gems" },
]

const SHOW_MAP: Record<FilterKey, Set<string>> = {
  all:             new Set(["trending","recs","new-movies","trending-tv","trending-books","hidden-gems","award-winners"]),
  movies:          new Set(["new-movies"]),
  tv:              new Set(["trending-tv"]),
  books:           new Set(["trending-books"]),
  trending:        new Set(["trending"]),
  new:             new Set(["new-movies"]),
  popular:         new Set(["award-winners"]),
  "award-winners": new Set(["award-winners"]),
  "hidden-gems":   new Set(["hidden-gems"]),
}

const TYPE_LABEL: Record<DiscoverItem["mediaType"], string> = {
  movie: "Film",
  tv: "TV",
  book: "Book",
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  trendingToday: DiscoverItem[]
  recommendations: DiscoverItem[]
  newMovies: DiscoverItem[]
  trendingTvWeek: DiscoverItem[]
  trendingBooksDisplay: DiscoverItem[]
  hiddenGems: DiscoverItem[]
  awardWinners: DiscoverItem[]
  collections: CollectionCard[]
  heroCards: HeroCard[]
  isLoggedIn: boolean
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RowHead({ title, desc }: { title: string; desc?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2 style={{
        margin: "0 0 3px",
        fontFamily: SANS,
        fontSize: "clamp(16px,2.5vw,20px)",
        fontWeight: 700,
        color: "rgba(255,255,255,0.92)",
        letterSpacing: "-0.3px",
        lineHeight: 1.2,
      }}>
        {title}
      </h2>
      {desc && (
        <p style={{
          margin: 0,
          fontFamily: SANS,
          fontSize: 11,
          color: "rgba(255,255,255,0.32)",
          lineHeight: 1.5,
        }}>
          {desc}
        </p>
      )}
    </div>
  )
}

function PremiumCard({ item }: { item: DiscoverItem }) {
  return (
    <Link href={item.href} className="p-card">
      <div className="p-card-poster">
        {item.poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.poster} alt={item.title} loading="lazy" />
        ) : (
          <div className="p-card-no-img">
            <span className="p-card-no-img-text" style={{ fontFamily: SERIF }}>
              {item.title}
            </span>
          </div>
        )}
        <div className="p-card-gradient" />
        <div className="p-card-badge-wrap">
          <span className="p-card-type-badge" style={{ fontFamily: SANS }}>
            {TYPE_LABEL[item.mediaType]}
          </span>
          {item.badge && (
            <span className="p-card-gem-badge" style={{ fontFamily: SANS }}>
              {item.badge}
            </span>
          )}
        </div>
        <div className="p-card-info">
          {item.releaseBadge && (
            <p className="p-card-release" style={{ fontFamily: SANS }}>{item.releaseBadge}</p>
          )}
          <p className="p-card-title" style={{ fontFamily: SANS }}>{item.title}</p>
          {(item.year || item.subtitle) && (
            <p className="p-card-meta" style={{ fontFamily: SANS }}>
              {[item.year, item.subtitle].filter(Boolean).join(" · ")}
            </p>
          )}
          {item.reason && (
            <p className="p-card-reason" style={{ fontFamily: SERIF }}>{item.reason}</p>
          )}
        </div>
      </div>
    </Link>
  )
}

function CarouselRow({ items }: { items: DiscoverItem[] }) {
  if (items.length === 0) return null
  return (
    <div className="disc-p-row-wrap">
      <div className="disc-p-row">
        {items.map((item) => (
          <PremiumCard key={`${item.mediaType}-${item.id}`} item={item} />
        ))}
      </div>
    </div>
  )
}

function CollectionCardV2({ col }: { col: CollectionCard }) {
  return (
    <Link href={`/discover/collection/${col.slug}`} className="disc-coll-v2">
      <div className="disc-coll-collage">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="disc-coll-cell">
            {col.posters[i] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={col.posters[i]} alt="" loading="lazy" />
            )}
          </div>
        ))}
      </div>
      <div className="disc-coll-overlay" />
      <div className="disc-coll-text">
        <p className="disc-coll-name" style={{ fontFamily: SANS }}>{col.name}</p>
        <p className="disc-coll-count" style={{ fontFamily: SANS }}>
          {col.count} title{col.count !== 1 ? "s" : ""}
        </p>
      </div>
    </Link>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DiscoverClient({
  trendingToday,
  recommendations,
  newMovies,
  trendingTvWeek,
  trendingBooksDisplay,
  hiddenGems,
  awardWinners,
  collections,
  heroCards,
  isLoggedIn,
}: Props) {
  const router = useRouter()
  const collectionsRef = useRef<HTMLDivElement>(null)

  const [filter, setFilter] = useState<FilterKey>("all")
  const [heroIdx, setHeroIdx] = useState(0)
  const [heroVisible, setHeroVisible] = useState(true)
  const [genresExpanded, setGenresExpanded] = useState(false)
  const [heroLoading, setHeroLoading] = useState(false)
  const [continueItem, setContinueItem] = useState<{
    title: string; subtitle: string; poster: string | null; href: string
  } | null>(null)

  const show = (id: string) => SHOW_MAP[filter].has(id)

  // Continue watching — in-progress TV shows for logged-in users
  useEffect(() => {
    if (!isLoggedIn) return
    function compute() {
      const entries = getDiaryMovies()
      const tvEntries = entries.filter((e) => e.mediaType === "tv")
      const completedIds = new Set(
        tvEntries
          .filter((e) => !e.reviewScope || e.reviewScope === "show" || e.reviewScope === "title")
          .map((e) => e.showId ?? e.id)
      )
      const seen = new Set<string>()
      const inProgress = tvEntries.filter((e) => {
        const scope = e.reviewScope
        if (scope !== "season" && scope !== "episode") return false
        const key = e.showId ?? e.id
        if (completedIds.has(key) || seen.has(key)) return false
        seen.add(key)
        return true
      })
      if (!inProgress.length) { setContinueItem(null); return }
      const item = inProgress[0]
      const showId = item.showId ?? item.id
      let subtitle = "TV Series"
      if (item.reviewScope === "season" && item.seasonNumber != null) subtitle = `Season ${item.seasonNumber}`
      if (item.reviewScope === "episode" && item.seasonNumber != null && item.episodeNumber != null) {
        subtitle = `S${item.seasonNumber} · E${item.episodeNumber}`
      }
      setContinueItem({ title: item.title, subtitle, poster: item.poster ?? null, href: `/series/${showId}` })
    }
    compute()
    const unsub = subscribeToDiary(compute)
    return unsub
  }, [isLoggedIn])

  // Auto-rotate hero every 5 seconds
  useEffect(() => {
    if (heroCards.length <= 1) return
    const timer = setInterval(() => {
      setHeroVisible(false)
      setTimeout(() => {
        setHeroIdx((i) => (i + 1) % heroCards.length)
        setHeroVisible(true)
      }, 300)
    }, 5000)
    return () => clearInterval(timer)
  }, [heroCards.length])

  function advanceHero() {
    if (heroCards.length <= 1) return
    setHeroVisible(false)
    setTimeout(() => {
      setHeroIdx((i) => (i + 1) % heroCards.length)
      setHeroVisible(true)
    }, 200)
  }

  function jumpToHero(i: number) {
    if (i === heroIdx) return
    setHeroVisible(false)
    setTimeout(() => {
      setHeroIdx(i)
      setHeroVisible(true)
    }, 200)
  }

  async function handleHeroSurprise() {
    if (heroLoading) return
    setHeroLoading(true)
    const types = ["movie", "tv", "book"] as const
    const type = types[Math.floor(Math.random() * types.length)]
    try {
      const res = await fetch(`/api/discover/random?type=${type}`)
      if (res.ok) {
        const data = (await res.json()) as { href: string }
        router.push(data.href)
      }
    } catch { /* fail silently */ }
    setHeroLoading(false)
  }

  function scrollToCollections() {
    collectionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const heroCard = heroCards[heroIdx] ?? null
  const GENRE_VISIBLE = 8
  const visibleGenres = genresExpanded ? GENRE_CHIPS : GENRE_CHIPS.slice(0, GENRE_VISIBLE)
  const hiddenGenreCount = GENRE_CHIPS.length - GENRE_VISIBLE

  return (
    <>
      <style>{`
        /* ── Hero ─────────────────────────────────────────────────── */
        .disc-hero-v2 {
          margin-top: -28px;
          margin-inline: -20px;
          padding: clamp(48px,8vw,80px) clamp(20px,5vw,60px) clamp(44px,7vw,72px);
          background:
            radial-gradient(ellipse 80% 70% at 10% 50%, rgba(29,158,117,0.065) 0%, transparent 55%),
            radial-gradient(ellipse 55% 55% at 88% 25%, rgba(80,80,220,0.04) 0%, transparent 50%),
            #07070b;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          overflow: hidden;
          min-height: 380px;
          display: flex;
          align-items: center;
        }
        @media (max-width: 760px) {
          .disc-hero-v2 {
            margin-top: -16px;
            margin-inline: -14px;
            min-height: unset;
            padding-block: clamp(36px,7vw,52px);
          }
        }
        @media (max-width: 390px) {
          .disc-hero-v2 { margin-top: -12px; margin-inline: -12px; }
        }
        .disc-hero-inner {
          display: flex;
          align-items: center;
          gap: clamp(24px,4vw,56px);
          max-width: 1060px;
          width: 100%;
        }
        @media (max-width: 700px) {
          .disc-hero-inner { flex-direction: column; gap: 28px; }
        }
        .disc-hero-left { flex: 1; min-width: 0; }
        .disc-hero-right {
          flex-shrink: 0;
          width: clamp(160px,25vw,260px);
        }
        @media (max-width: 700px) {
          .disc-hero-right { width: 100%; max-width: 220px; align-self: center; }
        }
        .disc-hero-eyebrow {
          margin: 0 0 10px;
          font-family: "Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(29,158,117,0.75);
        }
        .disc-hero-title {
          margin: 0 0 12px;
          font-family: Georgia,"Times New Roman",Times,serif;
          font-style: italic;
          font-size: clamp(26px,4.5vw,44px);
          font-weight: 400;
          letter-spacing: -0.5px;
          color: rgba(255,255,255,0.93);
          line-height: 1.1;
        }
        .disc-hero-sub {
          margin: 0 0 22px;
          font-family: "Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif;
          font-size: clamp(12px,1.6vw,14px);
          color: rgba(255,255,255,0.4);
          line-height: 1.65;
          max-width: 420px;
        }
        .disc-hero-btns {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .disc-btn-primary {
          padding: 11px 22px;
          border-radius: 9999px;
          border: none;
          background: rgba(29,158,117,0.18);
          border: 1px solid rgba(29,158,117,0.42);
          font-family: "Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #1d9e75;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.12s ease;
          white-space: nowrap;
        }
        .disc-btn-primary:hover:not(:disabled) {
          background: rgba(29,158,117,0.26);
          transform: translateY(-1px);
        }
        .disc-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .disc-btn-ghost {
          padding: 11px 22px;
          border-radius: 9999px;
          border: 1px solid rgba(255,255,255,0.15);
          background: transparent;
          font-family: "Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.6);
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.12s ease;
          white-space: nowrap;
        }
        .disc-btn-ghost:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.28);
          color: rgba(255,255,255,0.85);
          transform: translateY(-1px);
        }
        /* Hero featured card */
        .disc-hero-feat-card {
          display: block;
          position: relative;
          border-radius: 14px;
          overflow: hidden;
          aspect-ratio: 2/3;
          background: #0e0e1a;
          text-decoration: none;
          color: inherit;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          transition: transform 0.22s ease;
        }
        .disc-hero-feat-card:hover { transform: translateY(-4px) scale(1.01); }
        .disc-hero-feat-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .disc-hero-feat-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 45%, transparent 70%);
          pointer-events: none;
        }
        .disc-hero-feat-type {
          position: absolute;
          top: 10px;
          left: 10px;
          padding: 3px 9px;
          border-radius: 5px;
          background: rgba(0,0,0,0.65);
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
          border: 0.5px solid rgba(255,255,255,0.18);
          font-family: "Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.72);
          line-height: 1;
        }
        .disc-hero-feat-info {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 14px 14px 16px;
        }
        .disc-hero-feat-title {
          margin: 0 0 4px;
          font-family: "Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif;
          font-size: 17px;
          font-weight: 700;
          color: rgba(255,255,255,0.96);
          line-height: 1.2;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .disc-hero-feat-meta {
          margin: 0;
          font-family: "Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif;
          font-size: 10px;
          color: rgba(255,255,255,0.45);
        }
        /* Dots + arrow */
        .disc-hero-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 10px;
        }
        .disc-hero-dots { display: flex; gap: 5px; align-items: center; }
        .disc-hero-dot {
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          border: none;
          background: rgba(255,255,255,0.2);
          cursor: pointer;
          padding: 0;
          transition: all 0.22s ease;
        }
        .disc-hero-dot.active {
          background: rgba(29,158,117,0.85);
          width: 18px;
        }
        .disc-hero-arrow {
          width: 26px;
          height: 26px;
          border-radius: 9999px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.6);
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.14s ease, color 0.14s ease;
        }
        .disc-hero-arrow:hover {
          background: rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.88);
        }
        .disc-hero-feat-no-img {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        /* ── Filter bar ────────────────────────────────────────────── */
        .disc-filter-wrap { overflow: hidden; padding-top: 18px; }
        @media (max-width: 760px) {
          .disc-filter-wrap { margin-inline: -14px; }
        }
        @media (max-width: 390px) {
          .disc-filter-wrap { margin-inline: -12px; }
        }
        .disc-filter-bar {
          display: flex;
          gap: 7px;
          overflow-x: auto;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 2px;
        }
        .disc-filter-bar::-webkit-scrollbar { display: none; }
        @media (max-width: 760px) {
          .disc-filter-bar { padding-inline: 14px 32px; }
        }
        @media (max-width: 390px) {
          .disc-filter-bar { padding-inline: 12px 24px; }
        }
        .disc-filter-pill {
          flex-shrink: 0;
          padding: 8px 15px;
          border-radius: 9999px;
          border: 1px solid rgba(255,255,255,0.09);
          background: rgba(255,255,255,0.03);
          font-family: "Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,255,255,0.5);
          cursor: pointer;
          transition: all 0.14s ease;
          white-space: nowrap;
        }
        .disc-filter-pill:hover {
          background: rgba(255,255,255,0.07);
          border-color: rgba(255,255,255,0.18);
          color: rgba(255,255,255,0.82);
        }
        .disc-filter-pill.active {
          background: rgba(29,158,117,0.14);
          border-color: rgba(29,158,117,0.48);
          color: #1d9e75;
        }

        /* ── Sections ──────────────────────────────────────────────── */
        .disc-section { padding-top: clamp(28px,4vw,44px); }

        /* ── Premium carousel ──────────────────────────────────────── */
        .disc-p-row-wrap { overflow: hidden; }
        .disc-p-row {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 4px;
        }
        .disc-p-row::-webkit-scrollbar { display: none; }
        @media (max-width: 760px) {
          .disc-p-row-wrap { margin-inline: -14px; }
          .disc-p-row { padding-inline: 14px 32px; }
        }
        @media (max-width: 390px) {
          .disc-p-row-wrap { margin-inline: -12px; }
          .disc-p-row { padding-inline: 12px 24px; }
        }

        /* Premium card */
        .p-card {
          flex-shrink: 0;
          scroll-snap-align: start;
          width: min(150px,40vw);
          text-decoration: none;
          color: inherit;
          display: block;
          transition: transform 0.2s ease;
        }
        .p-card:hover { transform: translateY(-4px); }
        @media (max-width: 390px) { .p-card { width: min(128px,36vw); } }
        .p-card-poster {
          position: relative;
          aspect-ratio: 2/3;
          border-radius: 10px;
          overflow: hidden;
          background: #0e0e1a;
        }
        .p-card-poster img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.3s ease;
        }
        .p-card:hover .p-card-poster img { transform: scale(1.03); }
        .p-card-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.35) 35%, transparent 60%);
          pointer-events: none;
        }
        .p-card-badge-wrap {
          position: absolute;
          top: 7px;
          left: 7px;
          display: flex;
          flex-direction: column;
          gap: 3px;
          align-items: flex-start;
        }
        .p-card-type-badge {
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(0,0,0,0.62);
          -webkit-backdrop-filter: blur(6px);
          backdrop-filter: blur(6px);
          border: 0.5px solid rgba(255,255,255,0.15);
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.7);
          line-height: 1;
          white-space: nowrap;
        }
        .p-card-gem-badge {
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(29,158,117,0.22);
          border: 0.5px solid rgba(29,158,117,0.45);
          font-size: 7px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: #1d9e75;
          line-height: 1;
          white-space: nowrap;
        }
        .p-card-info {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 8px 9px 10px;
        }
        .p-card-title {
          margin: 0;
          font-size: 12px;
          font-weight: 700;
          color: rgba(255,255,255,0.95);
          line-height: 1.25;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .p-card-meta {
          margin: 3px 0 0;
          font-size: 9px;
          color: rgba(255,255,255,0.42);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .p-card-reason {
          margin: 3px 0 0;
          font-size: 9px;
          font-style: italic;
          color: rgba(255,255,255,0.33);
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .p-card-release {
          margin: 0 0 2px;
          font-size: 8px;
          font-weight: 700;
          color: rgba(29,158,117,0.9);
          letter-spacing: 0.03em;
        }
        .p-card-no-img {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
        }
        .p-card-no-img-text {
          font-style: italic;
          font-size: 11px;
          color: rgba(255,255,255,0.18);
          text-align: center;
          line-height: 1.4;
        }

        /* ── Genre row ─────────────────────────────────────────────── */
        .disc-genre-wrap { overflow: hidden; }
        @media (max-width: 760px) {
          .disc-genre-wrap { margin-inline: -14px; }
          .disc-genre-row { padding-inline: 14px 32px !important; }
        }
        @media (max-width: 390px) {
          .disc-genre-wrap { margin-inline: -12px; }
          .disc-genre-row { padding-inline: 12px 24px !important; }
        }
        .disc-genre-row {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 2px;
        }
        .disc-genre-row::-webkit-scrollbar { display: none; }
        .disc-genre-chip {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 9px 15px;
          border-radius: 9999px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09);
          text-decoration: none;
          color: rgba(255,255,255,0.65);
          font-family: "Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          transition: background 0.14s ease, border-color 0.14s ease, color 0.14s ease, transform 0.12s ease;
        }
        .disc-genre-chip:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.2);
          color: rgba(255,255,255,0.92);
          transform: translateY(-1px);
        }
        .disc-genre-more {
          flex-shrink: 0;
          padding: 9px 15px;
          border-radius: 9999px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.09);
          color: rgba(255,255,255,0.35);
          font-family: "Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.14s ease, color 0.14s ease;
        }
        .disc-genre-more:hover {
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.55);
        }

        /* ── Random pick ───────────────────────────────────────────── */
        .disc-random-wrap {
          display: flex;
          align-items: center;
          gap: clamp(20px,4vw,48px);
          padding: clamp(22px,3.5vw,32px) clamp(18px,3vw,28px);
          border-radius: 14px;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
        }
        .disc-random-left { flex: 1; min-width: 0; }
        .disc-random-title {
          margin: 0 0 4px;
          font-family: "Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif;
          font-size: clamp(15px,2vw,18px);
          font-weight: 700;
          color: rgba(255,255,255,0.88);
          letter-spacing: -0.2px;
        }
        .disc-random-sub {
          margin: 0;
          font-family: Georgia,"Times New Roman",Times,serif;
          font-style: italic;
          font-size: 12px;
          color: rgba(255,255,255,0.35);
          line-height: 1.5;
        }
        @media (max-width: 560px) {
          .disc-random-wrap { flex-direction: column; align-items: flex-start; gap: 16px; }
        }

        /* ── Collection cards ──────────────────────────────────────── */
        .disc-coll-v2 {
          flex-shrink: 0;
          scroll-snap-align: start;
          width: min(210px,56vw);
          border-radius: 12px;
          overflow: hidden;
          position: relative;
          aspect-ratio: 4/3;
          display: block;
          text-decoration: none;
          color: inherit;
          transition: transform 0.2s ease;
        }
        .disc-coll-v2:hover { transform: translateY(-4px); }
        @media (max-width: 390px) { .disc-coll-v2 { width: min(185px,72vw); } }
        .disc-coll-collage {
          position: absolute;
          inset: 0;
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
          background: #0e0e1a;
        }
        .disc-coll-cell { overflow: hidden; }
        .disc-coll-cell img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .disc-coll-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.22) 50%, rgba(0,0,0,0.05) 75%);
          pointer-events: none;
        }
        .disc-coll-text {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 10px 13px 13px;
        }
        .disc-coll-name {
          margin: 0 0 2px;
          font-size: 13px;
          font-weight: 700;
          color: rgba(255,255,255,0.95);
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .disc-coll-count {
          margin: 0;
          font-size: 9px;
          font-weight: 600;
          color: rgba(255,255,255,0.42);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        /* Shared carousel row (for collections) */
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
      `}</style>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="disc-hero-v2">
        <div className="disc-hero-inner">
          {/* Left: headline + buttons */}
          <div className="disc-hero-left">
            <p className="disc-hero-eyebrow">DISCOVER</p>
            <h1 className="disc-hero-title">
              Discover your<br />next story.
            </h1>
            <p className="disc-hero-sub">
              Curated recommendations across Movies, TV and Books — every visit should spark your next obsession.
            </p>
            <div className="disc-hero-btns">
              <button
                className="disc-btn-primary"
                onClick={() => void handleHeroSurprise()}
                disabled={heroLoading}
              >
                {heroLoading ? "Finding…" : "✨ Surprise Me"}
              </button>
              <button className="disc-btn-ghost" onClick={scrollToCollections}>
                📚 Browse Collections
              </button>
            </div>
          </div>

          {/* Right: rotating featured card */}
          {heroCard && (
            <div className="disc-hero-right">
              <Link
                href={heroCard.href}
                className="disc-hero-feat-card"
                style={{ opacity: heroVisible ? 1 : 0 }}
              >
                <span className="disc-hero-feat-type">
                  {TYPE_LABEL[heroCard.mediaType]}
                </span>
                {heroCard.poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={heroCard.poster} alt={heroCard.title} />
                ) : (
                  <div className="disc-hero-feat-no-img">
                    <span style={{
                      fontFamily: SERIF, fontStyle: "italic",
                      fontSize: 13, color: "rgba(255,255,255,0.18)",
                      textAlign: "center", lineHeight: 1.4,
                    }}>
                      {heroCard.title}
                    </span>
                  </div>
                )}
                <div className="disc-hero-feat-gradient" />
                <div className="disc-hero-feat-info">
                  <p className="disc-hero-feat-title">{heroCard.title}</p>
                  <p className="disc-hero-feat-meta">
                    {[heroCard.year, heroCard.meta].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </Link>

              {/* Dots + advance arrow */}
              {heroCards.length > 1 && (
                <div className="disc-hero-controls">
                  <div className="disc-hero-dots">
                    {heroCards.map((_, i) => (
                      <button
                        key={i}
                        className={`disc-hero-dot${i === heroIdx ? " active" : ""}`}
                        onClick={() => jumpToHero(i)}
                        aria-label={`Card ${i + 1}`}
                      />
                    ))}
                  </div>
                  <button
                    className="disc-hero-arrow"
                    onClick={advanceHero}
                    aria-label="Next card"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Continue Watching nudge (logged-in, in-progress TV only) ── */}
      {continueItem && (
        <div style={{
          margin: "clamp(12px,1.8vw,18px) 0",
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(255,255,255,0.03)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          {continueItem.poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={continueItem.poster}
              alt={continueItem.title}
              style={{ width: 34, height: 50, borderRadius: 5, objectFit: "cover", flexShrink: 0, border: "1px solid rgba(255,255,255,0.08)" }}
            />
          ) : (
            <div style={{ width: 34, height: 50, borderRadius: 5, background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: "0 0 2px", fontFamily: SANS, fontSize: 9, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "rgba(255,255,255,0.26)" }}>
              Continue Watching
            </p>
            <p style={{ margin: 0, fontFamily: SANS, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {continueItem.title}
            </p>
            <p style={{ margin: "1px 0 0", fontFamily: SANS, fontSize: 11, color: "rgba(255,255,255,0.34)" }}>
              {continueItem.subtitle}
            </p>
          </div>
          <Link href={continueItem.href} style={{
            flexShrink: 0, padding: "7px 13px", borderRadius: 7,
            border: "1px solid rgba(255,255,255,0.13)", background: "rgba(255,255,255,0.05)",
            fontFamily: SANS, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.78)",
            textDecoration: "none", whiteSpace: "nowrap",
          }}>
            Resume →
          </Link>
        </div>
      )}

      {/* ── Filter bar ────────────────────────────────────────────────── */}
      <div className="disc-filter-wrap">
        <div className="disc-filter-bar">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`disc-filter-pill${filter === f.key ? " active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Trending Today ───────────────────────────────────────────── */}
      {show("trending") && trendingToday.length > 0 && (
        <div className="disc-section">
          <RowHead
            title="🔥 Trending Today"
            desc="What everyone's watching right now."
          />
          <CarouselRow items={trendingToday} />
        </div>
      )}

      {/* ── Because You Loved ────────────────────────────────────────── */}
      {isLoggedIn && show("recs") && recommendations.length >= 3 && (
        <div className="disc-section">
          <RowHead
            title="❤️ Because You Loved…"
            desc="Personalised picks based on your taste."
          />
          <CarouselRow items={recommendations} />
        </div>
      )}

      {/* ── New Movies ───────────────────────────────────────────────── */}
      {show("new-movies") && newMovies.length > 0 && (
        <div className="disc-section">
          <RowHead
            title="🎬 New Movies"
            desc="Coming soon and just released in cinemas."
          />
          <CarouselRow items={newMovies} />
        </div>
      )}

      {/* ── Trending TV ──────────────────────────────────────────────── */}
      {show("trending-tv") && trendingTvWeek.length > 0 && (
        <div className="disc-section">
          <RowHead
            title="📺 Trending TV"
            desc="The shows everyone's talking about this week."
          />
          <CarouselRow items={trendingTvWeek} />
        </div>
      )}

      {/* ── Trending Books ───────────────────────────────────────────── */}
      {show("trending-books") && trendingBooksDisplay.length > 0 && (
        <div className="disc-section">
          <RowHead
            title="📚 Trending Books"
            desc="On shelves and in everyone's hands right now."
          />
          <CarouselRow items={trendingBooksDisplay} />
        </div>
      )}

      {/* ── Hidden Gems ──────────────────────────────────────────────── */}
      {show("hidden-gems") && hiddenGems.length >= 3 && (
        <div className="disc-section">
          <RowHead
            title="💎 Hidden Gems"
            desc="Critically acclaimed and criminally underrated."
          />
          <CarouselRow items={hiddenGems} />
        </div>
      )}

      {/* ── Award Winners ────────────────────────────────────────────── */}
      {show("award-winners") && awardWinners.length >= 3 && (
        <div className="disc-section">
          <RowHead
            title="🏆 Award Winners"
            desc="The best of the best — acclaimed and beloved."
          />
          <CarouselRow items={awardWinners} />
        </div>
      )}

      {/* ── Browse by Genre ──────────────────────────────────────────── */}
      <div className="disc-section">
        <RowHead
          title="🎭 Browse by Genre"
          desc="Explore by mood, theme, or taste."
        />
        <div className="disc-genre-wrap">
          <div className="disc-genre-row">
            {visibleGenres.map(({ slug, label, emoji }) => (
              <Link
                key={slug}
                href={`/discover/genre/${slug}`}
                className="disc-genre-chip"
              >
                <span style={{ fontSize: 15 }}>{emoji}</span>
                <span>{label}</span>
              </Link>
            ))}
            {!genresExpanded && hiddenGenreCount > 0 && (
              <button
                className="disc-genre-more"
                onClick={() => setGenresExpanded(true)}
              >
                +{hiddenGenreCount} More
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Random Pick ──────────────────────────────────────────────── */}
      <div className="disc-section">
        <div className="disc-random-wrap">
          <div className="disc-random-left">
            <h2 className="disc-random-title">🎲 Pick something random</h2>
            <p className="disc-random-sub">Can&apos;t decide? We&apos;ll choose for you.</p>
          </div>
          <SurpriseMe />
        </div>
      </div>

      {/* ── Collections ──────────────────────────────────────────────── */}
      {collections.length > 0 && (
        <div className="disc-section" ref={collectionsRef}>
          <RowHead
            title="🗂 Collections"
            desc="Curated sets worth exploring from start to finish."
          />
          <div className="disc-row-wrap">
            <div className="disc-row">
              {collections.map((col) => (
                <CollectionCardV2 key={col.slug} col={col} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ height: "clamp(24px,4vw,40px)" }} />
    </>
  )
}
