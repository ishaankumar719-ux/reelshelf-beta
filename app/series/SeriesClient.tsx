"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { DiscoverItem, CollectionCard } from "@/lib/discoverTypes"
import { getDiaryMovies, subscribeToDiary } from "@/lib/diary"
import {
  addToWatchlist,
  removeFromWatchlistByMedia,
  isInWatchlist,
} from "@/lib/watchlist"
import DiaryLogModal from "@/components/diary/DiaryLogModal"
import type { DiaryEntry } from "@/types/diary"

// ─── Constants ────────────────────────────────────────────────────────────────

const SANS = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'
const SERIF = 'Georgia,"Times New Roman",Times,serif'
const BLUE = "rgba(56,162,235,1)"
const BLUE_DIM = "rgba(56,162,235,0.75)"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HeroShow {
  title: string
  year: string
  poster: string | null
  backdrop: string | null
  href: string
}

interface ContinueItem {
  title: string
  subtitle: string
  poster: string | null
  href: string
}

interface Props {
  heroShow: HeroShow | null
  everyoneWatching: DiscoverItem[]
  acclaimedSeries: DiscoverItem[]
  crime: DiscoverItem[]
  sciFi: DiscoverItem[]
  comedy: DiscoverItem[]
  drama: DiscoverItem[]
  hiddenGems: DiscoverItem[]
  collections: CollectionCard[]
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
          fontSize: 12,
          color: "rgba(255,255,255,0.35)",
          lineHeight: 1.5,
        }}>
          {desc}
        </p>
      )}
    </div>
  )
}

function PremiumCard({
  item,
  onLog,
}: {
  item: DiscoverItem
  onLog: (item: DiscoverItem) => void
}) {
  const [inWl, setInWl] = useState(() => isInWatchlist(item.id, item.mediaType))

  function handleWatchlist(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (inWl) {
      removeFromWatchlistByMedia(item.id, item.mediaType)
    } else {
      addToWatchlist({
        id: item.id,
        mediaType: item.mediaType,
        title: item.title,
        year: parseInt(item.year) || 0,
        poster: item.poster ?? undefined,
        director: item.subtitle,
      })
    }
    setInWl(!inWl)
  }

  function handleLog(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onLog(item)
  }

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
          <span className="p-card-type-badge" style={{ fontFamily: SANS }}>TV</span>
          {item.badge && (
            <span className="p-card-gem-badge" style={{ fontFamily: SANS }}>{item.badge}</span>
          )}
        </div>
        <div className="p-card-info">
          <p className="p-card-title" style={{ fontFamily: SANS }}>{item.title}</p>
          {(item.year || item.subtitle) && (
            <p className="p-card-meta" style={{ fontFamily: SANS }}>
              {[item.year, item.subtitle].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="p-card-actions" style={{ fontFamily: SANS }}>
          <Link href={item.href} className="p-card-act-btn" onClick={(e) => e.stopPropagation()}>
            Open
          </Link>
          <button className="p-card-act-btn" onClick={handleLog} type="button">Log</button>
          <button
            className={`p-card-act-btn${inWl ? " wl-active" : ""}`}
            onClick={handleWatchlist}
            type="button"
            aria-label={inWl ? "Remove from watchlist" : "Add to watchlist"}
          >
            {inWl ? "✓" : "+"}
          </button>
        </div>
      </div>
    </Link>
  )
}

function CarouselRow({ items, onLog }: { items: DiscoverItem[]; onLog: (item: DiscoverItem) => void }) {
  if (!items.length) return null
  return (
    <div className="disc-p-row-wrap">
      <div className="disc-p-row">
        {items.map((item) => (
          <PremiumCard key={`${item.mediaType}-${item.id}`} item={item} onLog={onLog} />
        ))}
      </div>
    </div>
  )
}

const FAN_ROTATIONS = [-9, -3, 3, 9]
const FAN_X = [-26, -9, 9, 26]
const FAN_Y = [4, 0, 0, 4]
const FAN_Z = [1, 2, 3, 2]

function CollectionCardV2({ col }: { col: CollectionCard }) {
  const validPosters = col.posters.filter(Boolean).slice(0, 4)
  return (
    <Link href={`/discover/collection/${col.slug}`} className="disc-coll-v2">
      <div className="disc-coll-fan">
        {validPosters.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={src}
            alt=""
            loading="lazy"
            className="disc-coll-fan-poster"
            style={{
              transform: `rotate(${FAN_ROTATIONS[i]}deg) translateX(${FAN_X[i]}px) translateY(${FAN_Y[i]}px)`,
              zIndex: FAN_Z[i],
            }}
          />
        ))}
        {validPosters.length === 0 && <div className="disc-coll-fan-empty" />}
      </div>
      <div className="disc-coll-overlay" />
      <div className="disc-coll-text">
        <p className="disc-coll-name" style={{ fontFamily: SANS }}>{col.name}</p>
        {col.description && (
          <p className="disc-coll-desc" style={{ fontFamily: SANS }}>{col.description}</p>
        )}
        <p className="disc-coll-count" style={{ fontFamily: SANS }}>
          {col.count} {col.count !== 1 ? "shows" : "show"}
        </p>
      </div>
    </Link>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SeriesClient({
  heroShow,
  everyoneWatching,
  acclaimedSeries,
  crime,
  sciFi,
  comedy,
  drama,
  hiddenGems,
  collections,
  isLoggedIn,
}: Props) {
  const router = useRouter()
  const collectionsRef = useRef<HTMLDivElement>(null)
  const [logTarget, setLogTarget] = useState<DiscoverItem | null>(null)
  const [heroLoading, setHeroLoading] = useState(false)
  const [continueItem, setContinueItem] = useState<ContinueItem | null>(null)
  const [continueLoaded, setContinueLoaded] = useState(false)

  const handleLog = useCallback((item: DiscoverItem) => setLogTarget(item), [])

  // Continue Watching — in-progress TV shows (client-side, same logic as DiscoverClient)
  useEffect(() => {
    if (!isLoggedIn) { setContinueLoaded(true); return }
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
      setContinueLoaded(true)
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

  // Scroll fade-in for below-fold sections
  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>(".ser-section[data-fadein]")
    if (!sections.length) return
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("ser-vis")
            obs.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.06 }
    )
    sections.forEach((s) => obs.observe(s))
    return () => obs.disconnect()
  }, [])

  async function handleSurpriseMe() {
    if (heroLoading) return
    setHeroLoading(true)
    try {
      const res = await fetch("/api/discover/random?type=tv")
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

  return (
    <>
      <style>{`
        /* ── Hero ──────────────────────────────────────────────────── */
        .ser-hero {
          position: relative;
          margin-top: -28px;
          margin-inline: -20px;
          min-height: 420px;
          display: flex;
          align-items: center;
          overflow: hidden;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        @media (max-width: 760px) {
          .ser-hero { margin-top: -16px; margin-inline: -14px; min-height: unset; }
        }
        @media (max-width: 390px) {
          .ser-hero { margin-top: -12px; margin-inline: -12px; }
        }
        .ser-hero-bg { position: absolute; inset: 0; z-index: 0; }
        .ser-hero-bg img {
          width: 100%; height: 100%;
          object-fit: cover; object-position: center 30%;
          display: block; opacity: 0.2; filter: saturate(0.65);
        }
        .ser-hero-gradient {
          position: absolute; inset: 0;
          background:
            linear-gradient(105deg, rgba(7,7,11,0.97) 0%, rgba(7,7,11,0.72) 45%, rgba(7,7,11,0.18) 100%),
            linear-gradient(to top, rgba(7,7,11,1) 0%, transparent 35%),
            radial-gradient(ellipse 70% 80% at 5% 50%, rgba(56,162,235,0.07) 0%, transparent 60%);
          z-index: 1;
        }
        .ser-hero-inner {
          position: relative; z-index: 2;
          display: flex; align-items: center;
          gap: clamp(24px,4vw,56px);
          padding: clamp(48px,8vw,80px) clamp(20px,5vw,60px) clamp(44px,7vw,72px);
          max-width: 1120px; width: 100%;
        }
        @media (max-width: 700px) {
          .ser-hero-inner { flex-direction: column; gap: 28px; padding-block: clamp(36px,7vw,52px); }
        }
        .ser-hero-left { flex: 1; min-width: 0; }
        .ser-hero-right { flex-shrink: 0; width: clamp(160px,22vw,240px); }
        @media (max-width: 700px) {
          .ser-hero-right { width: 100%; max-width: 200px; align-self: center; }
        }
        .ser-hero-eyebrow {
          margin: 0 0 10px;
          font-family: ${SANS}; font-size: 10px; font-weight: 700;
          letter-spacing: 0.16em; text-transform: uppercase; color: ${BLUE_DIM};
        }
        .ser-hero-title {
          margin: 0 0 12px;
          font-family: ${SERIF}; font-style: italic;
          font-size: clamp(28px,4.8vw,48px); font-weight: 400;
          letter-spacing: -0.5px; color: rgba(255,255,255,0.94); line-height: 1.1;
        }
        .ser-hero-sub {
          margin: 0 0 24px;
          font-family: ${SANS}; font-size: clamp(12px,1.6vw,14px);
          color: rgba(255,255,255,0.38); line-height: 1.65; max-width: 420px;
        }
        .ser-hero-btns { display: flex; gap: 10px; flex-wrap: wrap; }
        .ser-btn-primary {
          padding: 11px 22px; border-radius: 9999px;
          border: 1px solid rgba(56,162,235,0.45); background: rgba(56,162,235,0.12);
          font-family: ${SANS}; font-size: 13px; font-weight: 700; color: ${BLUE};
          cursor: pointer; transition: background 0.15s ease, transform 0.12s ease;
          white-space: nowrap;
        }
        .ser-btn-primary:hover:not(:disabled) {
          background: rgba(56,162,235,0.22); transform: translateY(-1px);
        }
        .ser-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .ser-btn-ghost {
          padding: 11px 22px; border-radius: 9999px;
          border: 1px solid rgba(255,255,255,0.15); background: transparent;
          font-family: ${SANS}; font-size: 13px; font-weight: 600;
          color: rgba(255,255,255,0.6); cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.12s ease;
          white-space: nowrap;
        }
        .ser-btn-ghost:hover {
          background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.28);
          color: rgba(255,255,255,0.85); transform: translateY(-1px);
        }

        /* ── Hero featured show card ───────────────────────────────── */
        .ser-hero-feat {
          display: block; position: relative; border-radius: 12px;
          overflow: hidden; aspect-ratio: 2/3; background: #0e0e1a;
          text-decoration: none; color: inherit;
          box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(56,162,235,0.1);
          transition: transform 0.22s ease, box-shadow 0.22s ease;
        }
        .ser-hero-feat:hover {
          transform: translateY(-4px) scale(1.01);
          box-shadow: 0 18px 50px rgba(0,0,0,0.7), 0 0 0 1px rgba(56,162,235,0.2);
        }
        .ser-hero-feat img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .ser-hero-feat-grad {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.1) 45%, transparent 70%);
          pointer-events: none;
        }
        .ser-hero-feat-badge {
          position: absolute; top: 10px; left: 10px;
          padding: 3px 9px; border-radius: 5px;
          background: rgba(0,0,0,0.65);
          -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
          border: 0.5px solid rgba(255,255,255,0.18);
          font-family: ${SANS}; font-size: 9px; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: rgba(255,255,255,0.72); line-height: 1;
        }
        .ser-hero-feat-info { position: absolute; bottom: 0; left: 0; right: 0; padding: 14px 14px 16px; }
        .ser-hero-feat-title {
          margin: 0 0 3px; font-family: ${SANS}; font-size: 15px; font-weight: 700;
          color: rgba(255,255,255,0.95); line-height: 1.25;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .ser-hero-feat-meta { margin: 0; font-family: ${SANS}; font-size: 10px; color: rgba(255,255,255,0.4); }

        /* ── Sections ─────────────────────────────────────────────── */
        .ser-section { margin-top: clamp(28px,4vw,44px); }
        .ser-section-divider {
          border: none; border-top: 1px solid rgba(255,255,255,0.05);
          margin: 0 0 clamp(28px,4vw,44px);
        }

        /* ── Premium cards ────────────────────────────────────────── */
        .disc-p-row-wrap { overflow: hidden; }
        .disc-p-row {
          display: flex; gap: 10px; overflow-x: auto;
          scroll-snap-type: x mandatory; scrollbar-width: none;
          -webkit-overflow-scrolling: touch; padding-bottom: 4px;
        }
        .disc-p-row::-webkit-scrollbar { display: none; }
        .p-card {
          flex-shrink: 0; width: clamp(120px,18vw,160px);
          scroll-snap-align: start; text-decoration: none; color: inherit; display: block;
        }
        .p-card-poster {
          position: relative; aspect-ratio: 2/3; border-radius: 10px; overflow: hidden;
          background: #0e0e1a; border: 1px solid rgba(255,255,255,0.07);
          box-shadow: 0 2px 10px rgba(0,0,0,0.4); transition: box-shadow 0.2s ease;
        }
        .p-card:hover .p-card-poster {
          box-shadow: 0 8px 28px rgba(0,0,0,0.6), 0 0 0 1px rgba(56,162,235,0.14);
        }
        .p-card-poster img {
          width: 100%; height: 100%; object-fit: cover; display: block;
          transition: transform 0.3s ease;
        }
        .p-card:hover .p-card-poster img { transform: scale(1.03); }
        .p-card-no-img {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center; padding: 12px;
        }
        .p-card-no-img-text {
          font-style: italic; font-size: 11px;
          color: rgba(255,255,255,0.25); text-align: center; line-height: 1.4;
        }
        .p-card-gradient {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.22) 45%, transparent 70%);
          pointer-events: none;
        }
        .p-card-badge-wrap { position: absolute; top: 8px; left: 8px; display: flex; gap: 4px; flex-wrap: wrap; }
        .p-card-type-badge {
          padding: 2px 7px; border-radius: 4px; background: rgba(0,0,0,0.6);
          -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
          border: 0.5px solid rgba(255,255,255,0.15);
          font-size: 8px; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; color: rgba(255,255,255,0.6); line-height: 1;
        }
        .p-card-gem-badge {
          padding: 2px 7px; border-radius: 4px; background: rgba(0,0,0,0.55);
          border: 0.5px solid rgba(255,255,255,0.12);
          font-size: 8px; font-weight: 600; color: rgba(255,255,255,0.55); line-height: 1;
        }
        .p-card-info {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 10px 10px 12px; transition: opacity 0.18s ease;
        }
        .p-card:hover .p-card-info { opacity: 0; pointer-events: none; }
        .p-card-title {
          margin: 0; font-size: 12px; font-weight: 700;
          color: rgba(255,255,255,0.92); line-height: 1.3;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .p-card-meta { margin: 3px 0 0; font-size: 10px; color: rgba(255,255,255,0.4); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .p-card-actions {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 10px 8px 10px; display: flex; gap: 5px;
          opacity: 0; transform: translateY(3px);
          transition: opacity 0.18s ease, transform 0.18s ease; z-index: 10;
        }
        .p-card:hover .p-card-actions { opacity: 1; transform: translateY(0); }
        @media (hover: none) { .p-card-actions { display: none !important; } }
        .p-card-act-btn {
          flex: 1; padding: 6px 4px; border-radius: 5px;
          border: 1px solid rgba(255,255,255,0.14); background: rgba(10,10,15,0.78);
          -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
          color: rgba(255,255,255,0.84); font-size: 9px; font-weight: 700; cursor: pointer;
          text-align: center; letter-spacing: 0.05em; text-transform: uppercase;
          transition: background 0.14s ease, border-color 0.14s ease; text-decoration: none;
          display: flex; align-items: center; justify-content: center; line-height: 1;
        }
        .p-card-act-btn:hover { background: rgba(40,40,50,0.9); border-color: rgba(255,255,255,0.24); }
        .p-card-act-btn.wl-active { background: rgba(56,162,235,0.18); border-color: rgba(56,162,235,0.4); color: ${BLUE}; }
        @media (max-width: 760px) {
          .disc-p-row-wrap { margin-inline: -14px; }
          .disc-p-row { padding-inline: 14px 32px; }
        }
        @media (max-width: 390px) {
          .disc-p-row-wrap { margin-inline: -12px; }
          .disc-p-row { padding-inline: 12px 24px; }
        }

        /* ── Collection cards ─────────────────────────────────────── */
        .disc-coll-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 14px;
        }
        @media (max-width: 480px) { .disc-coll-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; } }
        .disc-coll-v2 {
          position: relative; border-radius: 12px; overflow: hidden;
          aspect-ratio: 3/2; background: #0b0b14; display: block;
          text-decoration: none; color: inherit;
          border: 1px solid rgba(255,255,255,0.07);
          transition: transform 0.22s ease, box-shadow 0.22s ease;
        }
        .disc-coll-v2:hover { transform: translateY(-3px); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .disc-coll-fan {
          position: absolute; inset: 0; background: #0b0b14;
          display: flex; align-items: center; justify-content: center; overflow: hidden;
        }
        .disc-coll-fan-poster {
          position: absolute; width: 44%; aspect-ratio: 2/3; border-radius: 7px; overflow: hidden;
          border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 14px rgba(0,0,0,0.55);
          object-fit: cover;
        }
        .disc-coll-fan-empty {
          width: 52%; aspect-ratio: 2/3; border-radius: 7px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
        }
        .disc-coll-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 55%, transparent 80%);
          pointer-events: none;
        }
        .disc-coll-text { position: absolute; bottom: 0; left: 0; right: 0; padding: 12px 14px 14px; }
        .disc-coll-name { margin: 0 0 3px; font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.92); line-height: 1.2; }
        .disc-coll-desc { margin: 2px 0 3px; font-size: 9px; color: rgba(255,255,255,0.32); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .disc-coll-count { margin: 0; font-size: 10px; color: rgba(255,255,255,0.38); }

        /* ── Continue Watching ────────────────────────────────────── */
        @keyframes ser-cw-fadein {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ser-cw-enter { animation: ser-cw-fadein 0.25s ease forwards; }
        @keyframes ser-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .ser-skeleton {
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
          background-size: 200% 100%;
          animation: ser-shimmer 1.6s ease-in-out infinite;
          border-radius: 8px;
        }

        /* ── Scroll fade-in ───────────────────────────────────────── */
        @media (prefers-reduced-motion: no-preference) {
          .ser-section[data-fadein] { opacity: 0; transition: opacity 0.3s ease; }
          .ser-section[data-fadein].ser-vis { opacity: 1; }
        }
      `}</style>

      <main style={{ padding: "0 0 80px" }}>
        {/* ── Hero ─────────────────────────────────────────────────────────────── */}
        <section className="ser-hero">
          {heroShow?.backdrop && (
            <div className="ser-hero-bg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroShow.backdrop} alt="" aria-hidden="true" />
            </div>
          )}
          <div className="ser-hero-gradient" />

          <div className="ser-hero-inner">
            <div className="ser-hero-left">
              <p className="ser-hero-eyebrow">Discover</p>
              <h1 className="ser-hero-title">Your next binge starts here.</h1>
              <p className="ser-hero-sub">The world's greatest television — from prestige drama to cult sci-fi.</p>
              <div className="ser-hero-btns">
                <button
                  className="ser-btn-primary"
                  onClick={() => void handleSurpriseMe()}
                  disabled={heroLoading}
                  style={{ fontFamily: SANS }}
                >
                  {heroLoading ? "Finding a show…" : "🎲 Surprise Me"}
                </button>
                <button
                  className="ser-btn-ghost"
                  onClick={scrollToCollections}
                  style={{ fontFamily: SANS }}
                >
                  🏆 Explore Collections
                </button>
              </div>
            </div>

            {heroShow && (
              <div className="ser-hero-right">
                <Link href={heroShow.href} className="ser-hero-feat">
                  {heroShow.poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={heroShow.poster} alt={heroShow.title} />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, background: "#131320" }} />
                  )}
                  <div className="ser-hero-feat-grad" />
                  <span className="ser-hero-feat-badge" style={{ fontFamily: SANS }}>TV</span>
                  <div className="ser-hero-feat-info">
                    <p className="ser-hero-feat-title" style={{ fontFamily: SANS }}>{heroShow.title}</p>
                    {heroShow.year && (
                      <p className="ser-hero-feat-meta" style={{ fontFamily: SANS }}>{heroShow.year}</p>
                    )}
                  </div>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* ── Everyone's Watching ──────────────────────────────────────────────── */}
        {everyoneWatching.length >= 3 && (
          <div className="ser-section">
            <RowHead
              title="🔥 Everyone's Watching"
              desc="The shows dominating conversation right now."
            />
            <CarouselRow items={everyoneWatching} onLog={handleLog} />
          </div>
        )}

        {/* ── Continue Watching (client-side, logged-in TV only) ──────────────── */}
        {isLoggedIn && !continueLoaded && (
          <div className="ser-section">
            <div className="ser-skeleton" style={{ height: 70, borderRadius: 10 }} />
          </div>
        )}
        {continueLoaded && continueItem && (
          <div className="ser-section ser-cw-enter">
            <div style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.025)",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                {continueItem.poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={continueItem.poster}
                    alt={continueItem.title}
                    style={{ width: 34, height: 50, borderRadius: 5, objectFit: "cover", display: "block", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                ) : (
                  <div style={{ width: 34, height: 50, borderRadius: 5, background: "rgba(255,255,255,0.07)" }} />
                )}
                <span style={{
                  position: "absolute", bottom: -4, right: -4,
                  width: 14, height: 14, borderRadius: "50%",
                  background: "rgba(56,162,235,0.18)", border: "1px solid rgba(56,162,235,0.4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 7, color: `rgba(56,162,235,0.9)`,
                }}>▶</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: "0 0 1px", fontFamily: SANS, fontSize: 9, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "rgba(255,255,255,0.24)" }}>
                  Continue Watching
                </p>
                <p style={{ margin: 0, fontFamily: SANS, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {continueItem.title}
                </p>
                <p style={{ margin: "2px 0 0", fontFamily: SANS, fontSize: 11, color: "rgba(255,255,255,0.36)" }}>
                  {continueItem.subtitle}
                </p>
              </div>
              <Link href={continueItem.href} style={{
                flexShrink: 0, padding: "7px 14px", borderRadius: 7,
                border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.05)",
                fontFamily: SANS, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)",
                textDecoration: "none", whiteSpace: "nowrap",
              }}>
                Resume →
              </Link>
            </div>
          </div>
        )}

        {/* ── Acclaimed Series ────────────────────────────────────────────────── */}
        {acclaimedSeries.length >= 3 && (
          <div className="ser-section" data-fadein>
            <RowHead
              title="🏆 Acclaimed Series"
              desc="The prestige tier — critically celebrated, culturally defining television."
            />
            <CarouselRow items={acclaimedSeries} onLog={handleLog} />
          </div>
        )}

        {/* ── Crime ───────────────────────────────────────────────────────────── */}
        {crime.length >= 3 && (
          <div className="ser-section" data-fadein>
            <RowHead
              title="🎬 Crime"
              desc="Moral complexity, brilliant writing, and tension you can taste."
            />
            <CarouselRow items={crime} onLog={handleLog} />
          </div>
        )}

        {/* ── Sci-Fi & Fantasy ────────────────────────────────────────────────── */}
        {sciFi.length >= 3 && (
          <div className="ser-section" data-fadein>
            <RowHead
              title="🧠 Sci-Fi & Fantasy"
              desc="Worlds that couldn't exist — yet feel more real than anything."
            />
            <CarouselRow items={sciFi} onLog={handleLog} />
          </div>
        )}

        {/* ── Comedy ─────────────────────────────────────────────────────────── */}
        {comedy.length >= 3 && (
          <div className="ser-section" data-fadein>
            <RowHead
              title="😂 Comedy"
              desc="Sharp, warm, and genuinely funny — television that earns the laugh."
            />
            <CarouselRow items={comedy} onLog={handleLog} />
          </div>
        )}

        {/* ── Character Dramas ────────────────────────────────────────────────── */}
        {drama.length >= 3 && (
          <div className="ser-section" data-fadein>
            <RowHead
              title="❤️ Character Dramas"
              desc="Deeply human stories — written with care and performed with conviction."
            />
            <CarouselRow items={drama} onLog={handleLog} />
          </div>
        )}

        {/* ── Hidden Gems ────────────────────────────────────────────────────── */}
        {hiddenGems.length >= 3 && (
          <div className="ser-section" data-fadein>
            <RowHead
              title="💎 Hidden Gems"
              desc="Critically acclaimed and criminally under-watched — find something the algorithm missed."
            />
            <CarouselRow items={hiddenGems} onLog={handleLog} />
          </div>
        )}

        {/* ── Collections ─────────────────────────────────────────────────────── */}
        {collections.length >= 1 && (
          <div className="ser-section" data-fadein ref={collectionsRef}>
            <hr className="ser-section-divider" />
            <RowHead
              title="📺 Collections"
              desc="Curated TV sets — by genre, tone, and cultural moment."
            />
            <div className="disc-coll-grid">
              {collections.map((col) => (
                <CollectionCardV2 key={col.slug} col={col} />
              ))}
            </div>
          </div>
        )}

        <div style={{ height: "clamp(24px,4vw,40px)" }} />
      </main>

      {/* ── Quick Log modal ─────────────────────────────────────────────────── */}
      {logTarget && (
        <DiaryLogModal
          isOpen
          onClose={() => setLogTarget(null)}
          onSaved={(_entry: DiaryEntry) => setLogTarget(null)}
          media={{
            title: logTarget.title,
            media_type: "tv",
            year: parseInt(logTarget.year) || 0,
            poster: logTarget.poster,
            creator: logTarget.subtitle ?? null,
            media_id: logTarget.id,
          }}
        />
      )}
    </>
  )
}
