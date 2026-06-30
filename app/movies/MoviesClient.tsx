"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { DiscoverItem, CollectionCard } from "@/lib/discoverTypes"
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
const ORANGE = "rgba(224,123,57,1)"
const ORANGE_DIM = "rgba(224,123,57,0.75)"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HeroFilm {
  title: string
  year: string
  poster: string | null
  backdrop: string | null
  href: string
}

export interface DirectorRow {
  director: string
  items: DiscoverItem[]
}

interface Props {
  heroFilm: HeroFilm | null
  trendingMovies: DiscoverItem[]
  inCinemas: DiscoverItem[]
  awardWinners: DiscoverItem[]
  byDirector: DirectorRow[]
  emotional: DiscoverItem[]
  mindBending: DiscoverItem[]
  horror: DiscoverItem[]
  comedy: DiscoverItem[]
  worldCinema: DiscoverItem[]
  hiddenGems: DiscoverItem[]
  collections: CollectionCard[]
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
          <span className="p-card-type-badge" style={{ fontFamily: SANS }}>Film</span>
          {item.badge && (
            <span className="p-card-gem-badge" style={{ fontFamily: SANS }}>{item.badge}</span>
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
          {col.count} {col.count !== 1 ? "films" : "film"}
        </p>
      </div>
    </Link>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MoviesClient({
  heroFilm,
  trendingMovies,
  inCinemas,
  awardWinners,
  byDirector,
  emotional,
  mindBending,
  horror,
  comedy,
  worldCinema,
  hiddenGems,
  collections,
}: Props) {
  const router = useRouter()
  const collectionsRef = useRef<HTMLDivElement>(null)
  const [logTarget, setLogTarget] = useState<DiscoverItem | null>(null)
  const [heroLoading, setHeroLoading] = useState(false)

  const handleLog = useCallback((item: DiscoverItem) => setLogTarget(item), [])

  // Scroll fade-in for below-fold sections
  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>(".mov-section[data-fadein]")
    if (!sections.length) return
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("mov-vis")
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
      const res = await fetch("/api/discover/random?type=movie")
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
        /* ── Base layout ─────────────────────────────────────────── */
        .mov-wrap {
          padding: 0 0 80px;
        }

        /* ── Hero ─────────────────────────────────────────────────── */
        .mov-hero {
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
          .mov-hero {
            margin-top: -16px;
            margin-inline: -14px;
            min-height: unset;
          }
        }
        @media (max-width: 390px) {
          .mov-hero { margin-top: -12px; margin-inline: -12px; }
        }
        .mov-hero-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .mov-hero-bg img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 30%;
          display: block;
          opacity: 0.22;
          filter: saturate(0.7);
        }
        .mov-hero-gradient {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(105deg, rgba(7,7,11,0.97) 0%, rgba(7,7,11,0.72) 45%, rgba(7,7,11,0.2) 100%),
            linear-gradient(to top, rgba(7,7,11,1) 0%, transparent 35%),
            radial-gradient(ellipse 70% 80% at 5% 50%, rgba(224,123,57,0.08) 0%, transparent 60%);
          z-index: 1;
        }
        .mov-hero-inner {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: clamp(24px,4vw,56px);
          padding: clamp(48px,8vw,80px) clamp(20px,5vw,60px) clamp(44px,7vw,72px);
          max-width: 1120px;
          width: 100%;
        }
        @media (max-width: 700px) {
          .mov-hero-inner { flex-direction: column; gap: 28px; padding-block: clamp(36px,7vw,52px); }
        }
        .mov-hero-left { flex: 1; min-width: 0; }
        .mov-hero-right {
          flex-shrink: 0;
          width: clamp(160px,22vw,240px);
        }
        @media (max-width: 700px) {
          .mov-hero-right { width: 100%; max-width: 200px; align-self: center; }
        }
        .mov-hero-eyebrow {
          margin: 0 0 10px;
          font-family: ${SANS};
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: ${ORANGE_DIM};
        }
        .mov-hero-title {
          margin: 0 0 12px;
          font-family: ${SERIF};
          font-style: italic;
          font-size: clamp(28px,4.8vw,48px);
          font-weight: 400;
          letter-spacing: -0.5px;
          color: rgba(255,255,255,0.94);
          line-height: 1.1;
        }
        .mov-hero-sub {
          margin: 0 0 24px;
          font-family: ${SANS};
          font-size: clamp(12px,1.6vw,14px);
          color: rgba(255,255,255,0.38);
          line-height: 1.65;
          max-width: 420px;
        }
        .mov-hero-btns {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .mov-btn-primary {
          padding: 11px 22px;
          border-radius: 9999px;
          border: 1px solid rgba(224,123,57,0.45);
          background: rgba(224,123,57,0.14);
          font-family: ${SANS};
          font-size: 13px;
          font-weight: 700;
          color: ${ORANGE};
          cursor: pointer;
          transition: background 0.15s ease, transform 0.12s ease;
          white-space: nowrap;
        }
        .mov-btn-primary:hover:not(:disabled) {
          background: rgba(224,123,57,0.24);
          transform: translateY(-1px);
        }
        .mov-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .mov-btn-ghost {
          padding: 11px 22px;
          border-radius: 9999px;
          border: 1px solid rgba(255,255,255,0.15);
          background: transparent;
          font-family: ${SANS};
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.6);
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.12s ease;
          white-space: nowrap;
        }
        .mov-btn-ghost:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.28);
          color: rgba(255,255,255,0.85);
          transform: translateY(-1px);
        }

        /* ── Hero featured film card ─────────────────────────────── */
        .mov-hero-feat {
          display: block;
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          aspect-ratio: 2/3;
          background: #0e0e1a;
          text-decoration: none;
          color: inherit;
          box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(224,123,57,0.12);
          transition: transform 0.22s ease, box-shadow 0.22s ease;
        }
        .mov-hero-feat:hover {
          transform: translateY(-4px) scale(1.01);
          box-shadow: 0 18px 50px rgba(0,0,0,0.7), 0 0 0 1px rgba(224,123,57,0.22);
        }
        .mov-hero-feat img {
          width: 100%; height: 100%;
          object-fit: cover; display: block;
        }
        .mov-hero-feat-grad {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.1) 45%, transparent 70%);
          pointer-events: none;
        }
        .mov-hero-feat-badge {
          position: absolute; top: 10px; left: 10px;
          padding: 3px 9px; border-radius: 5px;
          background: rgba(0,0,0,0.65);
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
          border: 0.5px solid rgba(255,255,255,0.18);
          font-family: ${SANS};
          font-size: 9px; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; color: rgba(255,255,255,0.72); line-height: 1;
        }
        .mov-hero-feat-info {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 14px 14px 16px;
        }
        .mov-hero-feat-title {
          margin: 0 0 3px;
          font-family: ${SANS};
          font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.95); line-height: 1.25;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .mov-hero-feat-meta {
          margin: 0; font-family: ${SANS}; font-size: 10px; color: rgba(255,255,255,0.4);
        }

        /* ── Section spacing ─────────────────────────────────────── */
        .mov-section {
          margin-top: clamp(28px,4vw,44px);
        }
        .mov-section-divider {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.05);
          margin: 0 0 clamp(28px,4vw,44px);
        }

        /* ── Premium card grid/carousel ──────────────────────────── */
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
        .p-card {
          flex-shrink: 0;
          width: clamp(120px,18vw,160px);
          scroll-snap-align: start;
          text-decoration: none;
          color: inherit;
          display: block;
        }
        .p-card-poster {
          position: relative;
          aspect-ratio: 2/3;
          border-radius: 10px;
          overflow: hidden;
          background: #0e0e1a;
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: 0 2px 10px rgba(0,0,0,0.4);
          transition: box-shadow 0.2s ease;
        }
        .p-card:hover .p-card-poster {
          box-shadow: 0 8px 28px rgba(0,0,0,0.6), 0 0 0 1px rgba(224,123,57,0.15);
        }
        .p-card-poster img {
          width: 100%; height: 100%;
          object-fit: cover; display: block;
          transition: transform 0.3s ease;
        }
        .p-card:hover .p-card-poster img { transform: scale(1.03); }
        .p-card-no-img {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          padding: 12px;
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
        .p-card-badge-wrap {
          position: absolute; top: 8px; left: 8px;
          display: flex; gap: 4px; flex-wrap: wrap;
        }
        .p-card-type-badge {
          padding: 2px 7px; border-radius: 4px;
          background: rgba(0,0,0,0.6);
          -webkit-backdrop-filter: blur(6px);
          backdrop-filter: blur(6px);
          border: 0.5px solid rgba(255,255,255,0.15);
          font-size: 8px; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; color: rgba(255,255,255,0.6); line-height: 1;
        }
        .p-card-gem-badge {
          padding: 2px 7px; border-radius: 4px;
          background: rgba(0,0,0,0.55);
          border: 0.5px solid rgba(255,255,255,0.12);
          font-size: 8px; font-weight: 600;
          color: rgba(255,255,255,0.55); line-height: 1;
        }
        .p-card-info {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 10px 10px 12px;
          transition: opacity 0.18s ease;
        }
        .p-card:hover .p-card-info { opacity: 0; pointer-events: none; }
        .p-card-release {
          margin: 0 0 3px;
          font-size: 9px; font-weight: 600; color: ${ORANGE_DIM};
          letter-spacing: 0.04em;
        }
        .p-card-title {
          margin: 0; font-size: 12px; font-weight: 700;
          color: rgba(255,255,255,0.92); line-height: 1.3;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .p-card-meta {
          margin: 3px 0 0; font-size: 10px; color: rgba(255,255,255,0.4);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        /* Hover quick-actions */
        .p-card-actions {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 10px 8px 10px;
          display: flex; gap: 5px;
          opacity: 0; transform: translateY(3px);
          transition: opacity 0.18s ease, transform 0.18s ease;
          z-index: 10;
        }
        .p-card:hover .p-card-actions { opacity: 1; transform: translateY(0); }
        @media (hover: none) { .p-card-actions { display: none !important; } }
        .p-card-act-btn {
          flex: 1; padding: 6px 4px; border-radius: 5px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(10,10,15,0.78);
          -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
          color: rgba(255,255,255,0.84);
          font-size: 9px; font-weight: 700; cursor: pointer;
          text-align: center; letter-spacing: 0.05em; text-transform: uppercase;
          transition: background 0.14s ease, border-color 0.14s ease;
          text-decoration: none;
          display: flex; align-items: center; justify-content: center; line-height: 1;
        }
        .p-card-act-btn:hover { background: rgba(40,40,50,0.9); border-color: rgba(255,255,255,0.24); }
        .p-card-act-btn.wl-active { background: rgba(224,123,57,0.2); border-color: rgba(224,123,57,0.42); color: ${ORANGE}; }
        @media (max-width: 760px) {
          .disc-p-row-wrap { margin-inline: -14px; }
          .disc-p-row { padding-inline: 14px 32px; }
        }
        @media (max-width: 390px) {
          .disc-p-row-wrap { margin-inline: -12px; }
          .disc-p-row { padding-inline: 12px 24px; }
        }

        /* ── Collection cards ────────────────────────────────────── */
        .disc-coll-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 14px;
        }
        @media (max-width: 480px) {
          .disc-coll-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
        }
        .disc-coll-v2 {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          aspect-ratio: 3/2;
          background: #0b0b14;
          display: block;
          text-decoration: none;
          color: inherit;
          border: 1px solid rgba(255,255,255,0.07);
          transition: transform 0.22s ease, box-shadow 0.22s ease;
        }
        .disc-coll-v2:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .disc-coll-fan {
          position: absolute; inset: 0;
          background: #0b0b14;
          display: flex; align-items: center; justify-content: center; overflow: hidden;
        }
        .disc-coll-fan-poster {
          position: absolute; width: 44%; aspect-ratio: 2/3;
          border-radius: 7px; overflow: hidden;
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 4px 14px rgba(0,0,0,0.55);
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
        .disc-coll-text {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 12px 14px 14px;
        }
        .disc-coll-name {
          margin: 0 0 3px;
          font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.92); line-height: 1.2;
        }
        .disc-coll-desc {
          margin: 2px 0 3px; font-size: 9px; color: rgba(255,255,255,0.32); line-height: 1.4;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .disc-coll-count {
          margin: 0; font-size: 10px; color: rgba(255,255,255,0.38);
        }

        /* ── Director sub-rows ───────────────────────────────────── */
        .mov-dir-head {
          margin: 0 0 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .mov-dir-name {
          font-family: ${SANS};
          font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.75);
          letter-spacing: -0.1px;
        }
        .mov-dir-count {
          font-family: ${SANS};
          font-size: 10px; color: rgba(255,255,255,0.3);
        }
        .mov-dir-row { margin-bottom: clamp(18px,3vw,26px); }
        .mov-dir-row:last-child { margin-bottom: 0; }

        /* ── Scroll fade-in ──────────────────────────────────────── */
        @media (prefers-reduced-motion: no-preference) {
          .mov-section[data-fadein] {
            opacity: 0;
            transition: opacity 0.3s ease;
          }
          .mov-section[data-fadein].mov-vis { opacity: 1; }
        }
      `}</style>

      <main className="mov-wrap">
        {/* ── Hero ──────────────────────────────────────────────────────────────── */}
        <section className="mov-hero">
          {/* Backdrop */}
          {heroFilm?.backdrop && (
            <div className="mov-hero-bg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroFilm.backdrop} alt="" aria-hidden="true" />
            </div>
          )}
          <div className="mov-hero-gradient" />

          <div className="mov-hero-inner">
            {/* Left: text + buttons */}
            <div className="mov-hero-left">
              <p className="mov-hero-eyebrow">Discover</p>
              <h1 className="mov-hero-title">Cinema begins here.</h1>
              <p className="mov-hero-sub">
                The world's greatest stories, timeless classics, hidden gems and unforgettable experiences.
              </p>
              <div className="mov-hero-btns">
                <button
                  className="mov-btn-primary"
                  onClick={() => void handleSurpriseMe()}
                  disabled={heroLoading}
                  style={{ fontFamily: SANS }}
                >
                  {heroLoading ? "Finding a film…" : "🎲 Surprise Me"}
                </button>
                <button
                  className="mov-btn-ghost"
                  onClick={scrollToCollections}
                  style={{ fontFamily: SANS }}
                >
                  🏆 Explore Collections
                </button>
              </div>
            </div>

            {/* Right: featured film poster */}
            {heroFilm && (
              <div className="mov-hero-right">
                <Link href={heroFilm.href} className="mov-hero-feat">
                  {heroFilm.poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={heroFilm.poster} alt={heroFilm.title} />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, background: "#131320" }} />
                  )}
                  <div className="mov-hero-feat-grad" />
                  <span className="mov-hero-feat-badge" style={{ fontFamily: SANS }}>Film</span>
                  <div className="mov-hero-feat-info">
                    <p className="mov-hero-feat-title" style={{ fontFamily: SANS }}>{heroFilm.title}</p>
                    {heroFilm.year && (
                      <p className="mov-hero-feat-meta" style={{ fontFamily: SANS }}>{heroFilm.year}</p>
                    )}
                  </div>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* ── Trending Now ───────────────────────────────────────────────────────── */}
        {trendingMovies.length >= 3 && (
          <div className="mov-section">
            <RowHead
              title="🔥 Trending Now"
              desc="The films everyone is watching and talking about today."
            />
            <CarouselRow items={trendingMovies} onLog={handleLog} />
          </div>
        )}

        {/* ── In Cinemas ─────────────────────────────────────────────────────────── */}
        {inCinemas.length >= 3 && (
          <div className="mov-section" data-fadein>
            <RowHead
              title="🍿 In Cinemas"
              desc="Playing now — plan your next cinema trip."
            />
            <CarouselRow items={inCinemas} onLog={handleLog} />
          </div>
        )}

        {/* ── Award Winners ──────────────────────────────────────────────────────── */}
        {awardWinners.length >= 3 && (
          <div className="mov-section" data-fadein>
            <RowHead
              title="🏆 Award Winners"
              desc="Critically acclaimed and beloved — the best of cinema."
            />
            <CarouselRow items={awardWinners} onLog={handleLog} />
          </div>
        )}

        {/* ── By Director ────────────────────────────────────────────────────────── */}
        {byDirector.length > 0 && (
          <div className="mov-section" data-fadein>
            <RowHead
              title="🎥 By Director"
              desc="Explore the filmographies of cinema's most distinctive voices."
            />
            {byDirector.map((row) => (
              <div key={row.director} className="mov-dir-row">
                <div className="mov-dir-head">
                  <span className="mov-dir-name">{row.director}</span>
                  <span className="mov-dir-count">{row.items.length} films</span>
                </div>
                <CarouselRow items={row.items} onLog={handleLog} />
              </div>
            ))}
          </div>
        )}

        {/* ── Emotional Stories ──────────────────────────────────────────────────── */}
        {emotional.length >= 3 && (
          <div className="mov-section" data-fadein>
            <RowHead
              title="❤️ Emotional Stories"
              desc="Drama and romance — films that stay with you long after the credits."
            />
            <CarouselRow items={emotional} onLog={handleLog} />
          </div>
        )}

        {/* ── Mind-Bending ───────────────────────────────────────────────────────── */}
        {mindBending.length >= 3 && (
          <div className="mov-section" data-fadein>
            <RowHead
              title="🧠 Mind-Bending"
              desc="Sci-fi and thrillers that question reality and linger in your head."
            />
            <CarouselRow items={mindBending} onLog={handleLog} />
          </div>
        )}

        {/* ── Horror ─────────────────────────────────────────────────────────────── */}
        {horror.length >= 3 && (
          <div className="mov-section" data-fadein>
            <RowHead
              title="👻 Horror"
              desc="From slow-burn dread to all-out terror — films that get under your skin."
            />
            <CarouselRow items={horror} onLog={handleLog} />
          </div>
        )}

        {/* ── Comedy ─────────────────────────────────────────────────────────────── */}
        {comedy.length >= 3 && (
          <div className="mov-section" data-fadein>
            <RowHead
              title="😂 Comedy"
              desc="Sharp, warm, and gloriously funny — films that make you feel good."
            />
            <CarouselRow items={comedy} onLog={handleLog} />
          </div>
        )}

        {/* ── World Cinema ───────────────────────────────────────────────────────── */}
        {worldCinema.length >= 3 && (
          <div className="mov-section" data-fadein>
            <RowHead
              title="🌍 World Cinema"
              desc="Masterpieces beyond English — Korean, French, Japanese, and more."
            />
            <CarouselRow items={worldCinema} onLog={handleLog} />
          </div>
        )}

        {/* ── Hidden Gems ────────────────────────────────────────────────────────── */}
        {hiddenGems.length >= 3 && (
          <div className="mov-section" data-fadein>
            <RowHead
              title="💎 Hidden Gems"
              desc="Critically acclaimed and criminally underrated — find something the algorithm missed."
            />
            <CarouselRow items={hiddenGems} onLog={handleLog} />
          </div>
        )}

        {/* ── Collections ────────────────────────────────────────────────────────── */}
        {collections.length >= 1 && (
          <div className="mov-section" data-fadein ref={collectionsRef}>
            <hr className="mov-section-divider" />
            <RowHead
              title="🎞️ Collections"
              desc="Curated film sets — by studio, mood, genre, and era."
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

      {/* ── Quick Log modal ──────────────────────────────────────────────────────── */}
      {logTarget && (
        <DiaryLogModal
          isOpen
          onClose={() => setLogTarget(null)}
          onSaved={(_entry: DiaryEntry) => setLogTarget(null)}
          media={{
            title: logTarget.title,
            media_type: "movie",
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
