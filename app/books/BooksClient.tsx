"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { DiscoverItem } from "@/lib/discoverTypes"
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
// Warm parchment gold — distinct from Movies orange and TV blue
const GOLD = "rgba(194,154,87,1)"
const GOLD_DIM = "rgba(194,154,87,0.75)"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HeroBook {
  title: string
  author: string
  year: string
  cover: string | null
  href: string
}

interface Props {
  heroBook: HeroBook | null
  trendingBooks: DiscoverItem[]
  modernClassics: DiscoverItem[]
  hiddenGems: DiscoverItem[]
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
          <span className="p-card-type-badge" style={{ fontFamily: SANS }}>Book</span>
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
            aria-label={inWl ? "Remove from reading shelf" : "Add to reading shelf"}
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function BooksClient({
  heroBook,
  trendingBooks,
  modernClassics,
  hiddenGems,
}: Props) {
  const router = useRouter()
  const hiddenGemsRef = useRef<HTMLDivElement>(null)
  const [logTarget, setLogTarget] = useState<DiscoverItem | null>(null)
  const [heroLoading, setHeroLoading] = useState(false)

  const handleLog = useCallback((item: DiscoverItem) => setLogTarget(item), [])

  // Scroll fade-in for below-fold sections
  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>(".bk-section[data-fadein]")
    if (!sections.length) return
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("bk-vis")
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
      const res = await fetch("/api/discover/random?type=book")
      if (res.ok) {
        const data = (await res.json()) as { href: string }
        router.push(data.href)
      }
    } catch { /* fail silently */ }
    setHeroLoading(false)
  }

  function scrollToHiddenGems() {
    hiddenGemsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <>
      <style>{`
        /* ── Base layout ─────────────────────────────────────────── */
        .bk-wrap {
          padding: 0 0 80px;
        }

        /* ── Hero ─────────────────────────────────────────────────── */
        .bk-hero {
          position: relative;
          margin-top: -28px;
          margin-inline: -20px;
          min-height: 400px;
          display: flex;
          align-items: center;
          overflow: hidden;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        @media (max-width: 760px) {
          .bk-hero {
            margin-top: -16px;
            margin-inline: -14px;
            min-height: unset;
          }
        }
        @media (max-width: 390px) {
          .bk-hero { margin-top: -12px; margin-inline: -12px; }
        }
        .bk-hero-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .bk-hero-bg img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 20%;
          display: block;
          opacity: 0.16;
          filter: saturate(0.5) blur(2px);
        }
        .bk-hero-gradient {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(105deg, rgba(7,7,11,0.98) 0%, rgba(7,7,11,0.76) 45%, rgba(7,7,11,0.25) 100%),
            linear-gradient(to top, rgba(7,7,11,1) 0%, transparent 35%),
            radial-gradient(ellipse 70% 80% at 5% 50%, rgba(194,154,87,0.06) 0%, transparent 60%);
          z-index: 1;
        }
        .bk-hero-inner {
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
          .bk-hero-inner { flex-direction: column; gap: 28px; padding-block: clamp(36px,7vw,52px); }
        }
        .bk-hero-left { flex: 1; min-width: 0; }
        .bk-hero-right {
          flex-shrink: 0;
          width: clamp(140px,20vw,220px);
        }
        @media (max-width: 700px) {
          .bk-hero-right { width: 100%; max-width: 180px; align-self: center; }
        }
        .bk-hero-eyebrow {
          margin: 0 0 10px;
          font-family: ${SANS};
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: ${GOLD_DIM};
        }
        .bk-hero-title {
          margin: 0 0 12px;
          font-family: ${SERIF};
          font-style: italic;
          font-size: clamp(28px,4.8vw,48px);
          font-weight: 400;
          letter-spacing: -0.5px;
          color: rgba(255,255,255,0.94);
          line-height: 1.1;
        }
        .bk-hero-sub {
          margin: 0 0 24px;
          font-family: ${SANS};
          font-size: clamp(12px,1.6vw,14px);
          color: rgba(255,255,255,0.38);
          line-height: 1.65;
          max-width: 420px;
        }
        .bk-hero-btns {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .bk-btn-primary {
          padding: 11px 22px;
          border-radius: 9999px;
          border: 1px solid rgba(194,154,87,0.45);
          background: rgba(194,154,87,0.13);
          font-family: ${SANS};
          font-size: 13px;
          font-weight: 700;
          color: ${GOLD};
          cursor: pointer;
          transition: background 0.15s ease, transform 0.12s ease;
          white-space: nowrap;
        }
        .bk-btn-primary:hover:not(:disabled) {
          background: rgba(194,154,87,0.23);
          transform: translateY(-1px);
        }
        .bk-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .bk-btn-ghost {
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
        .bk-btn-ghost:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.28);
          color: rgba(255,255,255,0.85);
          transform: translateY(-1px);
        }

        /* ── Hero featured book cover ─────────────────────────────── */
        .bk-hero-feat {
          display: block;
          position: relative;
          border-radius: 10px;
          overflow: hidden;
          aspect-ratio: 2/3;
          background: #0e0e1a;
          text-decoration: none;
          color: inherit;
          box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(194,154,87,0.12);
          transition: transform 0.22s ease, box-shadow 0.22s ease;
        }
        .bk-hero-feat:hover {
          transform: translateY(-4px) scale(1.01);
          box-shadow: 0 18px 50px rgba(0,0,0,0.7), 0 0 0 1px rgba(194,154,87,0.22);
        }
        .bk-hero-feat img {
          width: 100%; height: 100%;
          object-fit: cover; display: block;
        }
        .bk-hero-feat-grad {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.1) 45%, transparent 70%);
          pointer-events: none;
        }
        .bk-hero-feat-badge {
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
        .bk-hero-feat-info {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 14px 14px 16px;
        }
        .bk-hero-feat-title {
          margin: 0 0 2px;
          font-family: ${SERIF};
          font-style: italic;
          font-size: 14px; font-weight: 400; color: rgba(255,255,255,0.95); line-height: 1.25;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .bk-hero-feat-meta {
          margin: 0; font-family: ${SANS}; font-size: 10px; color: rgba(255,255,255,0.4);
        }
        .bk-hero-no-cover {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          background: #131320;
        }
        .bk-hero-no-cover-text {
          font-family: ${SERIF};
          font-style: italic;
          font-size: 15px; color: rgba(255,255,255,0.3); text-align: center; line-height: 1.4;
        }

        /* ── Section spacing ─────────────────────────────────────── */
        .bk-section {
          margin-top: clamp(28px,4vw,44px);
        }
        .bk-section-divider {
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
          box-shadow: 0 8px 28px rgba(0,0,0,0.6), 0 0 0 1px rgba(194,154,87,0.15);
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
        .p-card-act-btn.wl-active { background: rgba(194,154,87,0.2); border-color: rgba(194,154,87,0.42); color: ${GOLD}; }
        @media (max-width: 760px) {
          .disc-p-row-wrap { margin-inline: -14px; }
          .disc-p-row { padding-inline: 14px 32px; }
        }
        @media (max-width: 390px) {
          .disc-p-row-wrap { margin-inline: -12px; }
          .disc-p-row { padding-inline: 12px 24px; }
        }

        /* ── Scroll fade-in ──────────────────────────────────────── */
        @media (prefers-reduced-motion: no-preference) {
          .bk-section[data-fadein] {
            opacity: 0;
            transition: opacity 0.3s ease;
          }
          .bk-section[data-fadein].bk-vis { opacity: 1; }
        }
      `}</style>

      <main className="bk-wrap">
        {/* ── Hero ──────────────────────────────────────────────────────────────── */}
        <section className="bk-hero">
          {heroBook?.cover && (
            <div className="bk-hero-bg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroBook.cover} alt="" aria-hidden="true" />
            </div>
          )}
          <div className="bk-hero-gradient" />

          <div className="bk-hero-inner">
            {/* Left: text + buttons */}
            <div className="bk-hero-left">
              <p className="bk-hero-eyebrow">Discover</p>
              <h1 className="bk-hero-title">Stories worth getting lost in.</h1>
              <p className="bk-hero-sub">
                The world's greatest literature, from modern classics to hidden gems.
              </p>
              <div className="bk-hero-btns">
                <button
                  className="bk-btn-primary"
                  onClick={() => void handleSurpriseMe()}
                  disabled={heroLoading}
                  style={{ fontFamily: SANS }}
                >
                  {heroLoading ? "Finding a book…" : "🎲 Surprise Me"}
                </button>
                <button
                  className="bk-btn-ghost"
                  onClick={scrollToHiddenGems}
                  style={{ fontFamily: SANS }}
                >
                  💎 Hidden Gems
                </button>
              </div>
            </div>

            {/* Right: featured book cover */}
            {heroBook && (
              <div className="bk-hero-right">
                <Link href={heroBook.href} className="bk-hero-feat">
                  {heroBook.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={heroBook.cover} alt={heroBook.title} />
                  ) : (
                    <div className="bk-hero-no-cover">
                      <span className="bk-hero-no-cover-text">{heroBook.title}</span>
                    </div>
                  )}
                  <div className="bk-hero-feat-grad" />
                  <span className="bk-hero-feat-badge" style={{ fontFamily: SANS }}>Book</span>
                  <div className="bk-hero-feat-info">
                    <p className="bk-hero-feat-title">{heroBook.title}</p>
                    <p className="bk-hero-feat-meta" style={{ fontFamily: SANS }}>
                      {[heroBook.author, heroBook.year].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* ── Trending Books ─────────────────────────────────────────────────────── */}
        {trendingBooks.length >= 3 && (
          <div className="bk-section">
            <RowHead
              title="📚 Trending Books"
              desc="The most-logged books in the ReelShelf community recently."
            />
            <CarouselRow items={trendingBooks} onLog={handleLog} />
          </div>
        )}

        {/* ── Modern Classics ────────────────────────────────────────────────────── */}
        {modernClassics.length >= 3 && (
          <div className="bk-section" data-fadein>
            <RowHead
              title="📖 Modern Classics"
              desc="Published before 2000 — essential reading that has stood the test of time."
            />
            <CarouselRow items={modernClassics} onLog={handleLog} />
          </div>
        )}

        {/* ── Hidden Gems ────────────────────────────────────────────────────────── */}
        {hiddenGems.length >= 3 && (
          <div ref={hiddenGemsRef} className="bk-section" data-fadein>
            <hr className="bk-section-divider" />
            <RowHead
              title="💎 Hidden Gems"
              desc="Our curated shelf — remarkable books that deserve your attention."
            />
            <CarouselRow items={hiddenGems} onLog={handleLog} />
          </div>
        )}
      </main>

      {/* ── Log modal ─────────────────────────────────────────────────────────── */}
      {logTarget && (
        <DiaryLogModal
          isOpen
          onClose={() => setLogTarget(null)}
          onSaved={(_entry: DiaryEntry) => setLogTarget(null)}
          media={{
            title: logTarget.title,
            media_type: "book",
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
