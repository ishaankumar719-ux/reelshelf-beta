"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { computeStreak } from "@/lib/streak"
import RatingBar from "./RatingBar"

type StatsEntry = {
  id: string
  title: string
  year: number
  poster: string | null
  rating: number | string | null
  watched_date: string
  media_type: "movie" | "tv" | "book"
  runtime: number | null
  genres: string[] | null
  review_scope: string
  media_id: string
}

interface StatsClientProps {
  entries: StatsEntry[]
}

function toRating(rating: unknown): number | null {
  if (rating === null || rating === undefined || rating === "") return null
  const value = typeof rating === "string" ? parseFloat(rating) : Number(rating)
  return Number.isNaN(value) ? null : value
}

function formatWatchedDate(value: string | null) {
  if (!value) return "—"

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function extractTmdbId(mediaId: string): number | null {
  if (!mediaId.startsWith("tmdb-")) return null
  const raw = mediaId.slice(5)
  return /^\d+$/.test(raw) ? Number(raw) : null
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        margin: 0,
        marginBottom: "12px",
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.35)",
      }}
    >
      {children}
    </h2>
  )
}

export default function StatsClient({ entries }: StatsClientProps) {
  const router = useRouter()
  const [barsAnimated, setBarsAnimated] = useState(false)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setBarsAnimated(true)
    }, 50)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [])

  const totalEntries = entries.length
  const filmsCount = entries.filter((entry) => entry.media_type === "movie").length
  const seriesCount = entries.filter((entry) => entry.media_type === "tv").length
  const ratedEntries = entries.filter((entry) => toRating(entry.rating) !== null)
  const avgRating =
    ratedEntries.length > 0
      ? ratedEntries.reduce((sum, entry) => sum + (toRating(entry.rating) ?? 0), 0) /
        ratedEntries.length
      : null

  const ratingDist = useMemo(() => {
    const distribution: Record<number, number> = {}
    for (let bucket = 1; bucket <= 10; bucket += 1) {
      distribution[bucket] = 0
    }

    ratedEntries.forEach((entry) => {
      const rating = Math.round(toRating(entry.rating) ?? 0)
      if (rating >= 1 && rating <= 10) {
        distribution[rating] += 1
      }
    })

    return distribution
  }, [ratedEntries])

  const maxBucketCount = Math.max(...Object.values(ratingDist), 0)

  const topRated = useMemo(
    () =>
      entries
        .filter((entry) => entry.media_type === "movie")
        .filter((entry) => toRating(entry.rating) === 10 && entry.poster)
        .filter((entry, index, all) => all.findIndex((item) => item.title === entry.title) === index)
        .slice(0, 8),
    [entries]
  )

  const streakStats = useMemo(
    () => computeStreak(entries.map((entry) => entry.watched_date)),
    [entries]
  )

  const genreEntries = useMemo(() => {
    const genreMap: Record<string, number> = {}

    entries.forEach((entry) => {
      ;(entry.genres ?? []).forEach((genre) => {
        genreMap[genre] = (genreMap[genre] ?? 0) + 1
      })
    })

    return Object.entries(genreMap)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 8)
  }, [entries])

  const hasGenreData = genreEntries.length >= 3

  const highRaterPct =
    ratedEntries.length > 0
      ? Math.round(
          (ratedEntries.filter((entry) => (toRating(entry.rating) ?? 0) >= 8).length /
            ratedEntries.length) *
            100
        )
      : 0

  const subtitle =
    highRaterPct >= 50
      ? `You rate generously — ${highRaterPct}% of your ratings are 8 or above`
      : avgRating && avgRating < 6
        ? `You're a tough critic — avg ${(avgRating / 2).toFixed(1)}/5`
        : `${ratedEntries.length} films rated`

  const unratedCount = totalEntries - ratedEntries.length

  return (
    <main style={{ padding: "32px 20px 56px", background: "#08080f", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1020px", margin: "0 auto" }}>
        <header style={{ marginBottom: "40px" }}>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.92)",
              margin: 0,
            }}
          >
            Your Taste
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "rgba(255,255,255,0.4)",
              marginTop: "6px",
            }}
          >
            {totalEntries} titles tracked · your viewing identity
          </p>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            marginBottom: "36px",
          }}
        >
          {[
            { label: "Films logged", value: `${filmsCount}` },
            { label: "Avg rating", value: avgRating ? `${(avgRating / 2).toFixed(1)} / 5` : "—" },
            { label: "Rated", value: `${ratedEntries.length} titles` },
            { label: "Streak", value: `${streakStats.currentStreak} days` },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "0.5px solid rgba(255,255,255,0.08)",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <div
                style={{
                  fontSize: "28px",
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.9)",
                  lineHeight: 1.1,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  marginTop: "8px",
                  fontSize: "11px",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.35)",
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </section>

        <section style={{ marginBottom: "40px" }}>
          <SectionLabel>How you rate</SectionLabel>
          <p
            style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.45)",
              margin: "0 0 20px",
              fontStyle: "italic",
            }}
          >
            {subtitle}
          </p>

          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((bucket) => (
            <RatingBar
              key={bucket}
              bucket={bucket}
              count={ratingDist[bucket]}
              maxBucketCount={maxBucketCount}
              animated={barsAnimated}
            />
          ))}
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "0.5px solid rgba(255,255,255,0.08)",
              borderRadius: "14px",
              padding: "18px 18px 20px",
            }}
          >
            <SectionLabel>Patterns</SectionLabel>
            <div style={{ display: "grid", gap: "12px" }}>
              <div>
                <p style={{ margin: 0, fontSize: "22px", color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>
                  {streakStats.longestStreak} days
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "rgba(255,255,255,0.36)" }}>
                  Longest streak · last log {formatWatchedDate(streakStats.lastLogDate)}
                </p>
              </div>
              <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                <div>
                  <p style={{ margin: 0, fontSize: "18px", color: "rgba(255,255,255,0.86)", fontWeight: 600 }}>
                    {seriesCount}
                  </p>
                  <p style={{ margin: "3px 0 0", fontSize: "11px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Series
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "18px", color: "rgba(255,255,255,0.86)", fontWeight: 600 }}>
                    {unratedCount}
                  </p>
                  <p style={{ margin: "3px 0 0", fontSize: "11px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Unrated
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "0.5px solid rgba(255,255,255,0.08)",
              borderRadius: "14px",
              padding: "18px 18px 20px",
            }}
          >
            <SectionLabel>Genres</SectionLabel>
            {hasGenreData ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {genreEntries.map(([genre, count]) => (
                  <span
                    key={genre}
                    style={{
                      padding: "7px 10px",
                      borderRadius: "999px",
                      background: "rgba(255,255,255,0.06)",
                      border: "0.5px solid rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.72)",
                      fontSize: "12px",
                    }}
                  >
                    {genre} · {count}
                  </span>
                ))}
              </div>
            ) : (
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  lineHeight: 1.7,
                  color: "rgba(255,255,255,0.42)",
                  fontStyle: "italic",
                  maxWidth: "480px",
                }}
              >
                Genre data is still too sparse to say anything meaningful here. Most of your
                library came in without genres, so this section will get richer as you log more
                directly from TMDB.
              </p>
            )}
          </div>
        </section>

        {topRated.length > 0 ? (
          <section>
            <SectionLabel>Your 10s</SectionLabel>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                gap: "12px",
              }}
            >
              {topRated.map((entry) => {
                const tmdbId = extractTmdbId(entry.media_id)

                return (
                  <div
                    key={entry.id}
                    onClick={() => {
                      if (tmdbId) {
                        router.push(`/films/${tmdbId}`)
                      }
                    }}
                    style={{
                      cursor: tmdbId ? "pointer" : "default",
                    }}
                  >
                    <div
                      style={{
                        aspectRatio: "2/3",
                        borderRadius: "8px",
                        overflow: "hidden",
                        background: "#111122",
                        marginBottom: "8px",
                      }}
                    >
                      {entry.poster ? (
                        <img
                          src={entry.poster}
                          alt={entry.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "linear-gradient(160deg, #1a1a2e 0%, #0d0d1a 100%)",
                            color: "rgba(255,255,255,0.14)",
                            fontSize: "32px",
                            fontWeight: 600,
                          }}
                        >
                          {entry.title.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        lineHeight: 1.35,
                        color: "rgba(255,255,255,0.82)",
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {entry.title}
                    </p>
                    <p
                      style={{
                        margin: "3px 0 0",
                        fontSize: "11px",
                        color: "rgba(255,255,255,0.35)",
                      }}
                    >
                      {entry.year || "—"} · 10 / 10
                    </p>
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  )
}
