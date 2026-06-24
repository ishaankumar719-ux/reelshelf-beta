"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "../AuthProvider"
import DiaryLogModal from "../diary/DiaryLogModal"
import { addToWatchlist } from "../../lib/watchlist"
import { upsertSavedItemToBackend } from "../../lib/supabase/persistence"
import type { DailyPickData } from "../../app/api/daily-pick/route"
import type { DiaryEntry } from "../../types/diary"

const SANS = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'

function mediaTypeLabel(type: "film" | "tv" | "book"): string {
  if (type === "film") return "Film"
  if (type === "tv") return "TV Series"
  return "Book"
}

function mediaTypeToLogType(type: "film" | "tv" | "book"): "movie" | "tv" | "book" {
  return type === "film" ? "movie" : type
}

function mediaTypeColor(type: "film" | "tv" | "book"): string {
  if (type === "film") return "rgba(99,102,241,0.9)"
  if (type === "tv") return "rgba(45,212,191,0.9)"
  return "rgba(251,191,36,0.9)"
}

function mediaBadgeBg(type: "film" | "tv" | "book"): string {
  if (type === "film") return "rgba(99,102,241,0.18)"
  if (type === "tv") return "rgba(45,212,191,0.14)"
  return "rgba(251,191,36,0.14)"
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function DailyPickSkeleton() {
  return (
    <div
      style={{
        borderRadius: 18,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.06)",
        marginBottom: "clamp(12px, 2vw, 16px)",
      }}
    >
      <div
        style={{
          height: "clamp(220px, 38vw, 340px)",
          background: "linear-gradient(90deg,#151515 25%,#1f1f1f 50%,#151515 75%)",
          backgroundSize: "200% 100%",
          animation: "dp-shimmer 1.6s ease infinite",
        }}
      />
      <style>{`
        @keyframes dp-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .dp-card { animation: none !important; transition: none !important; opacity: 1 !important; }
        }
      `}</style>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DailyPickCard() {
  const { user, loading: authLoading } = useAuth()
  const [pick, setPick] = useState<DailyPickData | null>(null)
  const [fetchState, setFetchState] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [visible, setVisible] = useState(false)
  const [rerolling, setRerolling] = useState(false)
  const [watchlistDone, setWatchlistDone] = useState(false)
  const [logOpen, setLogOpen] = useState(false)

  const fetchPick = useCallback(async () => {
    setFetchState("loading")
    try {
      const res = await fetch("/api/daily-pick")
      if (!res.ok) throw new Error("fetch failed")
      const data = (await res.json()) as DailyPickData
      setPick(data)
      setFetchState("done")
      requestAnimationFrame(() => setVisible(true))
    } catch {
      setFetchState("error")
    }
  }, [])

  useEffect(() => {
    if (!authLoading && user) {
      void fetchPick()
    }
  }, [authLoading, user, fetchPick])

  const handleReroll = useCallback(async () => {
    if (rerolling || !pick || pick.reroll_count >= 1) return
    setRerolling(true)
    setVisible(false)
    try {
      const res = await fetch("/api/daily-pick", { method: "POST" })
      if (!res.ok) throw new Error("reroll failed")
      const data = (await res.json()) as DailyPickData
      setPick(data)
      requestAnimationFrame(() => setVisible(true))
    } catch {
      // keep existing pick on error
      setVisible(true)
    } finally {
      setRerolling(false)
    }
  }, [pick, rerolling])

  const handleAddToWatchlist = useCallback(async () => {
    if (!pick || watchlistDone) return
    const logType = mediaTypeToLogType(pick.media_type)
    addToWatchlist({
      id: pick.media_id,
      mediaType: logType,
      title: pick.title,
      poster: pick.poster ?? undefined,
      year: Number(pick.year) || 0,
      director: pick.creator ?? undefined,
    })
    setWatchlistDone(true)
    void upsertSavedItemToBackend({
      id: pick.media_id,
      mediaType: logType,
      title: pick.title,
      poster: pick.poster ?? undefined,
      year: Number(pick.year) || 0,
      director: pick.creator ?? undefined,
      addedAt: new Date().toISOString(),
    })
  }, [pick, watchlistDone])

  function handleLogSaved(_entry: DiaryEntry) {
    setLogOpen(false)
  }

  // Don't render anything for logged-out users
  if (!user && !authLoading) return null
  if (authLoading || fetchState === "idle") return null
  if (fetchState === "loading") return <DailyPickSkeleton />
  if (fetchState === "error" || !pick) return null

  const accentColor = mediaTypeColor(pick.media_type)
  const badgeBg = mediaBadgeBg(pick.media_type)
  const logType = mediaTypeToLogType(pick.media_type)
  const rerollsLeft = pick.reroll_count === 0

  return (
    <>
      <div
        className="dp-card"
        style={{
          position: "relative",
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          marginBottom: "clamp(12px, 2vw, 16px)",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.3s ease",
          boxShadow: "0 16px 48px rgba(0,0,0,0.55)",
        }}
      >
        {/* Poster background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: pick.poster
              ? `url(${pick.poster}) center/cover no-repeat`
              : "linear-gradient(135deg,#1a1a2e,#0d0d1a)",
            filter: "blur(2px) brightness(0.45) saturate(1.2)",
            transform: "scale(1.05)",
          }}
        />

        {/* Gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to right, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.7) 55%, rgba(0,0,0,0.35) 100%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            gap: "clamp(16px, 3vw, 28px)",
            padding: "clamp(18px, 3vw, 28px)",
            alignItems: "flex-start",
          }}
        >
          {/* Poster thumbnail */}
          {pick.poster && (
            <div
              style={{
                flexShrink: 0,
                width: "clamp(72px, 12vw, 110px)",
                aspectRatio: "2 / 3",
                borderRadius: 10,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
              }}
            >
              <img
                src={pick.poster}
                alt={pick.title}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
          )}

          {/* Text content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Label */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.55)",
                  fontFamily: SANS,
                }}
              >
                ✦ Today&apos;s Pick
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "2px 9px",
                  borderRadius: 999,
                  background: badgeBg,
                  border: `0.5px solid ${accentColor}55`,
                  color: accentColor,
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  fontFamily: SANS,
                }}
              >
                {mediaTypeLabel(pick.media_type)}
              </span>
            </div>

            {/* Title */}
            <h2
              style={{
                margin: "0 0 3px",
                fontSize: "clamp(18px, 3.5vw, 26px)",
                fontWeight: 700,
                letterSpacing: "-0.5px",
                lineHeight: 1.15,
                color: "rgba(255,255,255,0.96)",
              }}
            >
              {pick.title}
            </h2>

            {/* Meta row */}
            <p
              style={{
                margin: "0 0 8px",
                fontSize: 12,
                color: "rgba(255,255,255,0.38)",
                fontFamily: SANS,
              }}
            >
              {[pick.year, pick.genre, pick.creator].filter(Boolean).join(" · ")}
            </p>

            {/* Subtext */}
            <p
              style={{
                margin: "0 0 12px",
                fontSize: 11,
                color: "rgba(255,255,255,0.32)",
                letterSpacing: "0.02em",
                fontFamily: SANS,
              }}
            >
              A story selected for today.
            </p>

            {/* Overview */}
            <p
              style={{
                margin: "0 0 18px",
                fontSize: "clamp(12px, 1.8vw, 13px)",
                color: "rgba(255,255,255,0.52)",
                lineHeight: 1.65,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                maxWidth: 520,
              }}
            >
              {pick.overview}
            </p>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {/* Log It */}
              <button
                type="button"
                onClick={() => setLogOpen(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 34,
                  padding: "0 16px",
                  borderRadius: 999,
                  background: "white",
                  color: "black",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: SANS,
                  border: "none",
                  cursor: "pointer",
                  letterSpacing: "0.01em",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                Log It
              </button>

              {/* Add to Watchlist */}
              <button
                type="button"
                onClick={() => void handleAddToWatchlist()}
                disabled={watchlistDone}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 34,
                  padding: "0 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: watchlistDone ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.08)",
                  color: watchlistDone ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.72)",
                  fontSize: 12,
                  fontFamily: SANS,
                  cursor: watchlistDone ? "default" : "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                }}
              >
                {watchlistDone ? "Added ✓" : "Add to Watchlist"}
              </button>

              {/* Choose Another / reroll */}
              <button
                type="button"
                onClick={() => void handleReroll()}
                disabled={!rerollsLeft || rerolling}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 34,
                  padding: "0 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.09)",
                  background: "transparent",
                  color: !rerollsLeft
                    ? "rgba(255,255,255,0.2)"
                    : rerolling
                      ? "rgba(255,255,255,0.4)"
                      : "rgba(255,255,255,0.45)",
                  fontSize: 12,
                  fontFamily: SANS,
                  cursor: !rerollsLeft || rerolling ? "default" : "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                }}
              >
                {rerolling
                  ? "Choosing…"
                  : !rerollsLeft
                    ? "No more rerolls today"
                    : "Choose Another"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Log modal */}
      {logOpen && pick && (
        <DiaryLogModal
          isOpen={logOpen}
          onClose={() => setLogOpen(false)}
          onSaved={handleLogSaved}
          media={{
            title: pick.title,
            media_type: logType,
            year: Number(pick.year) || 0,
            poster: pick.poster ?? null,
            creator: pick.creator ?? null,
            media_id: pick.media_id,
          }}
        />
      )}
    </>
  )
}
