"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/AuthProvider"

type EpisodeEntry = {
  season_number: number | null
  episode_number: number | null
  watched_date: string | null
  saved_at: string
  rating: number | null
}

type ProgressState = {
  watchedCount: number
  totalEpisodes: number
  lastWatched: EpisodeEntry | null
}

function fmtDate(iso: string | null): string {
  if (!iso) return ""
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
  } catch { return "" }
}

export default function TVProgressModule({
  tmdbId,
  seriesId,
  totalEpisodes,
  seasonBrowserId,
}: {
  tmdbId: number
  seriesId: string
  totalEpisodes: number
  /** DOM id of the SeasonBrowser section to scroll to on "Continue" */
  seasonBrowserId?: string
}) {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [progress, setProgress] = useState<ProgressState | null>(null)

  useEffect(() => {
    if (!user?.id || totalEpisodes < 1) return
    const client = createClient()
    if (!client) return

    const candidates = Array.from(new Set([String(tmdbId), seriesId, `tmdb-${tmdbId}`]))

    client
      .from("diary_entries")
      .select("season_number, episode_number, watched_date, saved_at, rating")
      .eq("user_id", user.id)
      .eq("media_type", "tv")
      .eq("review_scope", "episode")
      .in("media_id", candidates)
      .order("saved_at", { ascending: false })
      .then(({ data }) => {
        if (!data?.length) return
        setProgress({
          watchedCount: data.length,
          totalEpisodes,
          lastWatched: (data[0] as EpisodeEntry) ?? null,
        })
      })
  }, [user?.id, tmdbId, seriesId, totalEpisodes])

  if (!user || !progress || progress.watchedCount === 0) return null

  const pct = Math.min(100, Math.round((progress.watchedCount / progress.totalEpisodes) * 100))
  const { lastWatched } = progress
  const hasLast = lastWatched && (lastWatched.season_number ?? 0) > 0
  const isComplete = pct === 100

  function handleContinue() {
    if (!hasLast || !lastWatched) return
    const target = seasonBrowserId ? document.getElementById(seasonBrowserId) : null
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <div style={{
      padding: "20px 24px",
      borderRadius: 20,
      border: "1px solid rgba(255,255,255,0.07)",
      background: "linear-gradient(180deg, rgba(14,14,22,0.97) 0%, rgba(9,9,15,0.97) 100%)",
      display: "flex",
      flexDirection: "column",
      gap: 16,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <p style={{
            margin: 0, fontSize: 10, fontWeight: 600,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.30)",
          }}>
            Your progress
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 400, color: "rgba(255,255,255,0.90)", fontVariantNumeric: "tabular-nums" }}>
            {progress.watchedCount}
            <span style={{ fontSize: 15, color: "rgba(255,255,255,0.38)", fontWeight: 400 }}>
              {" "}/ {progress.totalEpisodes} Episodes
            </span>
          </p>
        </div>
        <p style={{
          margin: 0, fontSize: 20, fontWeight: 300,
          color: isComplete ? "#1D9E75" : "rgba(255,255,255,0.55)",
          fontVariantNumeric: "tabular-nums",
        }}>
          {pct}%{isComplete && <span style={{ fontSize: 12, marginLeft: 6, letterSpacing: "0.08em" }}>Complete</span>}
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          borderRadius: 3,
          background: isComplete
            ? "linear-gradient(90deg, #1D9E75, #25c48e)"
            : "linear-gradient(90deg, rgba(255,255,255,0.45), rgba(255,255,255,0.68))",
          transition: "width 0.5s ease",
        }} />
      </div>

      {/* Continue Watching */}
      {hasLast && !isComplete && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 14, flexWrap: "wrap",
          padding: "14px 16px",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.025)",
        }}>
          <div>
            <p style={{
              margin: 0, fontSize: 10, fontWeight: 600,
              letterSpacing: "0.20em", textTransform: "uppercase",
              color: "rgba(255,255,255,0.28)",
            }}>
              Continue watching
            </p>
            <p style={{ margin: "5px 0 0", fontSize: 14, color: "rgba(255,255,255,0.80)" }}>
              S{lastWatched!.season_number} E{lastWatched!.episode_number}
              {lastWatched!.rating != null && (
                <span style={{ marginLeft: 10, fontSize: 12, color: "rgba(255,255,255,0.36)" }}>
                  {lastWatched!.rating.toFixed(1)} / 10
                </span>
              )}
            </p>
            {fmtDate(lastWatched!.watched_date ?? lastWatched!.saved_at) && (
              <p style={{ margin: "3px 0 0", fontSize: 11, color: "rgba(255,255,255,0.26)" }}>
                Last watched {fmtDate(lastWatched!.watched_date ?? lastWatched!.saved_at)}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleContinue}
            style={{
              padding: "10px 20px", borderRadius: 999, minHeight: 44,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.82)",
              fontSize: 13, fontWeight: 500,
              cursor: "pointer",
              transition: "background 0.14s ease",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)" }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)" }}
          >
            Resume →
          </button>
        </div>
      )}

      {isComplete && (
        <p style={{ margin: 0, fontSize: 13, color: "rgba(29,158,117,0.80)", letterSpacing: "0.04em" }}>
          You've watched every episode. ✓
        </p>
      )}
    </div>
  )
}
