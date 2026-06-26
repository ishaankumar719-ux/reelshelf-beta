"use client"

import Link from "next/link"

const SANS = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'
const SERIF = "Georgia,\"Times New Roman\",Times,serif"

export type ArticleData = {
  id: string
  title: string
  body: string
  cover_image: string | null
  author: string
  published_at: string
}

export type StaffPickData = {
  id: string
  media_type: "film" | "tv" | "book"
  title: string
  poster_url: string | null
  year: number | null
  reason: string
}

export type UpcomingRelease = {
  id: number
  title: string
  poster_path: string | null
  release_date: string
  media_type: "movie" | "tv"
}

export type FanPickData = {
  media_id: string
  media_type: string
  title: string
  poster: string | null
  log_count: number
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })
  } catch {
    return ""
  }
}

function formatRelease(dateStr: string, mediaType: "movie" | "tv") {
  if (!dateStr) return mediaType === "tv" ? "On air" : "Coming soon"
  try {
    const d = new Date(dateStr + "T00:00:00Z")
    if (isNaN(d.getTime())) return "Coming soon"
    const now = new Date()
    if (d < now) return mediaType === "tv" ? "On air now" : "Now showing"
    return `Coming ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}`
  } catch {
    return "Coming soon"
  }
}

function tmdbPoster(path: string | null, size = "w342") {
  if (!path) return null
  return `https://image.tmdb.org/t/p/${size}${path}`
}

// ─── Section wrapper ───────────────────────────────────────────────────────────

function EditSection({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section style={{ marginBottom: "clamp(22px, 3.5vw, 32px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 8, marginBottom: "clamp(10px, 1.8vw, 14px)" }}>
        <div>
          <p style={{ margin: "0 0 3px", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--rs-text-muted)", fontFamily: SANS }}>
            {eyebrow}
          </p>
          <h2 style={{ margin: 0, fontSize: "clamp(17px, 3vw, 22px)", fontWeight: 400, letterSpacing: "-0.4px", lineHeight: 1.1, fontFamily: SERIF }}>
            {title}
          </h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

// ─── Poster placeholder ────────────────────────────────────────────────────────

function PosterFallback({ title, size = 100 }: { title: string; size?: number }) {
  return (
    <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#181818,#0d0d0d)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color: "rgba(255,255,255,0.1)", fontSize: size * 0.28, fontWeight: 700, fontFamily: SANS }}>
        {title[0] ?? "?"}
      </span>
    </div>
  )
}

// ─── Section 1: Featured Article ──────────────────────────────────────────────

function FeaturedArticleSection({ article }: { article: ArticleData }) {
  const date = formatDate(article.published_at)

  return (
    <section className="dr-hero-wrap" style={{ marginBottom: "clamp(24px, 4vw, 36px)" }}>
      <div
        className="dr-hero"
        style={{
          position: "relative",
          borderRadius: 16,
          overflow: "hidden",
          minHeight: "clamp(220px, 38vw, 340px)",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
        }}
      >
        {/* Background cover image */}
        {article.cover_image && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `url(${article.cover_image}) center/cover no-repeat`,
              filter: "brightness(0.55) saturate(1.1)",
              transform: "scale(1.03)",
            }}
          />
        )}

        {/* Gradient overlay — dark at bottom-left */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.65) 45%, rgba(0,0,0,0.18) 100%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "clamp(20px, 3.5vw, 36px)",
          }}
        >
          <p style={{ margin: "0 0 8px", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontFamily: SANS }}>
            ✍︎ Editorial
          </p>
          <h2 style={{
            margin: "0 0 6px",
            fontSize: "clamp(20px, 3.8vw, 32px)",
            fontWeight: 700,
            letterSpacing: "-0.5px",
            lineHeight: 1.15,
            color: "rgba(255,255,255,0.97)",
            maxWidth: 600,
          }}>
            {article.title}
          </h2>
          <p style={{ margin: "0 0 16px", fontSize: 12, color: "rgba(255,255,255,0.38)", fontFamily: SANS }}>
            {article.author} · {date}
          </p>
          <p style={{
            margin: "0 0 20px",
            fontSize: "clamp(12px, 1.8vw, 13px)",
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.65,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            maxWidth: 520,
            fontFamily: SERIF,
          }}>
            {article.body}
          </p>
          <button
            type="button"
            className="dr-read-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 32,
              padding: "0 16px",
              borderRadius: 999,
              background: "white",
              color: "black",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: SANS,
              border: "none",
              cursor: "pointer",
              letterSpacing: "0.01em",
            }}
          >
            Read more →
          </button>
        </div>
      </div>
    </section>
  )
}

// ─── Section 2: Staff Picks ────────────────────────────────────────────────────

function StaffPicksSection({ picks }: { picks: StaffPickData[] }) {
  if (picks.length === 0) return null

  const mediaIcon = (type: string) => type === "film" ? "🎬" : type === "tv" ? "📺" : "📚"

  return (
    <EditSection eyebrow="Editorial" title="Staff picks">
      <div className="dr-row-wrap">
        <div className="dr-row">
          {picks.map((pick) => (
            <div key={pick.id} className="dr-card" style={{
              flexShrink: 0,
              width: "min(160px, 44vw)",
              background: "var(--rs-surface-card)",
              border: "1px solid var(--rs-border-subtle)",
              borderRadius: "var(--rs-radius-card)",
              overflow: "hidden",
            }}>
              {/* Poster */}
              <div style={{ position: "relative", aspectRatio: "2/3", background: "#0f0f0f", overflow: "hidden" }}>
                {pick.poster_url ? (
                  <img
                    src={pick.poster_url}
                    alt={pick.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <PosterFallback title={pick.title} />
                )}
                {/* Staff Pick badge */}
                <div style={{
                  position: "absolute",
                  top: 8,
                  left: 8,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: "rgba(0,0,0,0.7)",
                  backdropFilter: "blur(6px)",
                  border: "0.5px solid rgba(255,255,255,0.18)",
                  fontSize: 8,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  color: "rgba(255,255,255,0.8)",
                  fontFamily: SANS,
                  whiteSpace: "nowrap" as const,
                }}>
                  Staff Pick ✨
                </div>
                {/* Media type badge */}
                <div style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  fontSize: 13,
                }}>
                  {mediaIcon(pick.media_type)}
                </div>
              </div>
              {/* Info */}
              <div style={{ padding: "10px 10px 12px" }}>
                <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 600, lineHeight: 1.2, color: "var(--rs-text-primary)", fontFamily: SANS, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                  {pick.title}
                </p>
                {pick.year && (
                  <p style={{ margin: "0 0 6px", fontSize: 10, color: "var(--rs-text-muted)", fontFamily: SANS }}>
                    {pick.year}
                  </p>
                )}
                <p style={{
                  margin: 0,
                  fontSize: 11,
                  color: "rgba(255,255,255,0.42)",
                  fontFamily: SERIF,
                  fontStyle: "italic",
                  lineHeight: 1.5,
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}>
                  {pick.reason}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </EditSection>
  )
}

// ─── Section 3: Upcoming Releases ─────────────────────────────────────────────

function UpcomingSection({ items }: { items: UpcomingRelease[] }) {
  if (items.length === 0) return null

  return (
    <EditSection eyebrow="Coming soon" title="Upcoming releases">
      <div className="dr-row-wrap">
        <div className="dr-row">
          {items.map((item) => {
            const poster = tmdbPoster(item.poster_path)
            const releaseLabel = formatRelease(item.release_date, item.media_type)
            const isOnAir = releaseLabel.includes("On air")

            return (
              <div key={`${item.media_type}-${item.id}`} className="dr-card" style={{
                flexShrink: 0,
                width: "min(130px, 38vw)",
                background: "var(--rs-surface-card)",
                border: "1px solid var(--rs-border-subtle)",
                borderRadius: "var(--rs-radius-card)",
                overflow: "hidden",
              }}>
                {/* Poster */}
                <div style={{ position: "relative", aspectRatio: "2/3", background: "#0f0f0f", overflow: "hidden" }}>
                  {poster ? (
                    <img
                      src={poster}
                      alt={item.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <PosterFallback title={item.title} />
                  )}
                  {/* Release date badge */}
                  <div style={{
                    position: "absolute",
                    bottom: 7,
                    left: 7,
                    right: 7,
                    padding: "3px 6px",
                    borderRadius: 5,
                    background: isOnAir ? "rgba(29,158,117,0.85)" : "rgba(0,0,0,0.78)",
                    backdropFilter: "blur(6px)",
                    fontSize: 8,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    color: "white",
                    fontFamily: SANS,
                    textAlign: "center" as const,
                    lineHeight: 1.4,
                  }}>
                    {releaseLabel}
                  </div>
                  {/* Media type badge */}
                  <div style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    padding: "1px 5px",
                    borderRadius: 4,
                    background: item.media_type === "movie" ? "rgba(99,102,241,0.75)" : "rgba(45,212,191,0.75)",
                    fontSize: 8,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    color: "white",
                    fontFamily: SANS,
                    backdropFilter: "blur(4px)",
                  }}>
                    {item.media_type === "movie" ? "Film" : "TV"}
                  </div>
                </div>
                {/* Title */}
                <div style={{ padding: "8px 8px 10px" }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 500, lineHeight: 1.25, color: "var(--rs-text-primary)", fontFamily: SANS, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {item.title}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </EditSection>
  )
}

// ─── Section 4: Fan Picks ──────────────────────────────────────────────────────

function FanPicksSection({ picks }: { picks: FanPickData[] }) {
  if (picks.length < 3) return null

  const mediaIcon = (type: string) => type === "movie" ? "🎬" : type === "tv" ? "📺" : "📚"

  return (
    <EditSection eyebrow="Community" title="Trending this week">
      <div className="dr-row-wrap">
        <div className="dr-row">
          {picks.map((pick, idx) => (
            <div key={`${pick.media_type}-${pick.media_id}`} className="dr-card" style={{
              flexShrink: 0,
              width: "min(130px, 38vw)",
              background: "var(--rs-surface-card)",
              border: "1px solid var(--rs-border-subtle)",
              borderRadius: "var(--rs-radius-card)",
              overflow: "hidden",
            }}>
              {/* Poster */}
              <div style={{ position: "relative", aspectRatio: "2/3", background: "#0f0f0f", overflow: "hidden" }}>
                {pick.poster ? (
                  <img
                    src={pick.poster}
                    alt={pick.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <PosterFallback title={pick.title} />
                )}
                {/* Rank badge */}
                <div style={{
                  position: "absolute",
                  top: 6,
                  left: 6,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: idx === 0 ? "rgba(212,175,55,0.9)" : "rgba(0,0,0,0.7)",
                  backdropFilter: "blur(4px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 700,
                  color: idx === 0 ? "black" : "rgba(255,255,255,0.75)",
                  fontFamily: SANS,
                }}>
                  {idx + 1}
                </div>
                {/* Media type */}
                <div style={{ position: "absolute", top: 6, right: 6, fontSize: 12 }}>
                  {mediaIcon(pick.media_type)}
                </div>
              </div>
              {/* Info */}
              <div style={{ padding: "8px 8px 10px" }}>
                <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 500, lineHeight: 1.25, color: "var(--rs-text-primary)", fontFamily: SANS, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {pick.title}
                </p>
                <p style={{ margin: 0, fontSize: 9, color: "var(--rs-text-muted)", fontFamily: SANS }}>
                  Logged {pick.log_count} {pick.log_count === 1 ? "time" : "times"} this week
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </EditSection>
  )
}

// ─── Main export ───────────────────────────────────────────────────────────────

export default function DailyReelEditorial({
  featuredArticle,
  staffPicks,
  upcomingItems,
  fanPicks,
}: {
  featuredArticle: ArticleData | null
  staffPicks: StaffPickData[]
  upcomingItems: UpcomingRelease[]
  fanPicks: FanPickData[]
}) {
  const hasAnyContent =
    featuredArticle !== null ||
    staffPicks.length > 0 ||
    upcomingItems.length > 0 ||
    fanPicks.length >= 3

  if (!hasAnyContent) return null

  return (
    <>
      <style>{`
        /* ── Horizontal carousel rows ── */
        .dr-row-wrap {
          position: relative;
          overflow: hidden;
        }
        .dr-row {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
          padding-bottom: 4px;
          padding-inline: 2px 24px;
          cursor: grab;
        }
        .dr-row::-webkit-scrollbar { display: none; }
        .dr-row > * { scroll-snap-align: start; }

        /* ── Card hover lift ── */
        .dr-card {
          transition: transform 0.2s ease, border-color 0.18s ease, box-shadow 0.2s ease;
          will-change: transform;
        }
        .dr-card:hover {
          transform: translateY(-4px);
          border-color: var(--rs-border-strong) !important;
          box-shadow: 0 12px 36px rgba(0,0,0,0.55);
        }
        .dr-card:active {
          transform: scale(0.99) !important;
          transition-duration: 0.05s !important;
        }

        /* ── Hero card ── */
        .dr-hero {
          transition: box-shadow 0.2s ease;
        }
        .dr-hero:hover {
          box-shadow: 0 28px 72px rgba(0,0,0,0.7) !important;
        }
        .dr-read-btn:hover {
          background: rgba(240,240,240,1) !important;
        }
        .dr-read-btn:active {
          transform: scale(0.97);
        }

        /* ── Mobile full-bleed hero ── */
        @media (max-width: 760px) {
          .dr-hero { border-radius: 12px !important; }
          .dr-hero-wrap { margin-inline: -14px; }
          .dr-row-wrap { margin-inline: -14px; }
          .dr-row { padding-inline: 14px 32px; }
        }
        @media (max-width: 390px) {
          .dr-hero-wrap { margin-inline: -12px; }
          .dr-row-wrap { margin-inline: -12px; }
          .dr-row { padding-inline: 12px 28px; }
        }

        /* ── Divider between editorial and trivia ── */
        .dr-divider {
          border: none;
          height: 1px;
          background: rgba(255,255,255,0.06);
          margin: clamp(20px, 3.5vw, 36px) 0;
        }
      `}</style>

      {featuredArticle && <FeaturedArticleSection article={featuredArticle} />}
      {staffPicks.length > 0 && <StaffPicksSection picks={staffPicks} />}
      {upcomingItems.length > 0 && <UpcomingSection items={upcomingItems} />}
      {fanPicks.length >= 3 && <FanPicksSection picks={fanPicks} />}

      <hr className="dr-divider" />
    </>
  )
}
