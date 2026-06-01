"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/AuthProvider"

type EpisodeEntry = {
  id: string
  season_number: number | null
  episode_number: number | null
  title: string
  watched_date: string | null
  saved_at: string
  rating: number | null
}

type ProgressState = {
  watchedCount: number
  lastWatched: EpisodeEntry | null
}

function formatWatchedDate(iso: string | null): string {
  if (!iso) return ""
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return ""
  }
}

export default function SeriesProgress({
  tmdbId,
  seriesId,
  totalEpisodes,
}: {
  tmdbId: number
  seriesId: string
  totalEpisodes: number
}) {
  const { user } = useAuth()
  const [progress, setProgress] = useState<ProgressState | null>(null)

  useEffect(() => {
    if (!user?.id || totalEpisodes < 1) return
    const client = createClient()
    if (!client) return

    const candidates = Array.from(new Set([String(tmdbId), seriesId, `tmdb-${tmdbId}`]))

    client
      .from("diary_entries")
      .select("id, season_number, episode_number, title, watched_date, saved_at, rating")
      .eq("user_id", user.id)
      .eq("media_type", "tv")
      .eq("review_scope", "episode")
      .in("media_id", candidates)
      .order("saved_at", { ascending: false })
      .then(({ data }) => {
        if (!data) return
        setProgress({
          watchedCount: data.length,
          lastWatched: (data[0] as EpisodeEntry) ?? null,
        })
      })
  }, [user?.id, tmdbId, seriesId, totalEpisodes])

  if (!user || !progress || progress.watchedCount === 0) return null

  const pct = Math.min(100, Math.round((progress.watchedCount / totalEpisodes) * 100))
  const { lastWatched } = progress

  return (
    <div style={{
      padding: "20px 24px",
      borderRadius: 20,
      border: "1px solid rgba(255,255,255,0.07)",
      background: "linear-gradient(180deg, rgba(14,14,22,0.96) 0%, rgba(9,9,15,0.96) 100%)",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.32)" }}>
          Your progress
        </p>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
          <span style={{ color: "rgba(255,255,255,0.88)", fontVariantNumeric: "tabular-nums" }}>{progress.watchedCount}</span>
          <span style={{ color: "rgba(255,255,255,0.30)" }}> / {totalEpisodes} episodes</span>
          {pct === 100 && (
            <span style={{ marginLeft: 8, color: "#1D9E75", fontSize: 11, letterSpacing: "0.08em" }}>Complete</span>
          )}
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: 14 }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          borderRadius: 2,
          background: pct === 100
            ? "linear-gradient(90deg, #1D9E75, #25c48e)"
            : "linear-gradient(90deg, rgba(255,255,255,0.5), rgba(255,255,255,0.72))",
          transition: "width 0.4s ease",
        }} />
      </div>

      {/* Last watched */}
      {lastWatched && (lastWatched.season_number ?? 0) > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.32)", letterSpacing: "0.04em" }}>
            Last watched
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.62)" }}>
            S{lastWatched.season_number} E{lastWatched.episode_number}
            {lastWatched.rating != null && (
              <span style={{ marginLeft: 8, color: "rgba(255,255,255,0.40)" }}>
                {lastWatched.rating.toFixed(1)} / 10
              </span>
            )}
          </p>
          {formatWatchedDate(lastWatched.watched_date ?? lastWatched.saved_at) && (
            <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.26)" }}>
              {formatWatchedDate(lastWatched.watched_date ?? lastWatched.saved_at)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
