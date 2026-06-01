"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/components/AuthProvider"
import { getTVSeasonDetails } from "@/lib/tmdb"
import { getAllShowReviews } from "@/src/lib/reviews"
import ReviewForm from "@/src/components/reviews/ReviewForm"
import type { Review } from "@/src/types/reviews"

// ─── Types ────────────────────────────────────────────────────────────────────

export type BasicSeason = {
  seasonNumber: number
  name: string
  overview: string
  posterUrl: string | null
  airDate: string | null
  episodeCount: number
}

export type InitialSeason = {
  seasonNumber: number
  episodes: EpisodeData[]
}

type EpisodeData = {
  id: number
  name: string
  overview: string
  airDate: string | undefined
  episodeNumber: number
  runtime: number | null
  stillPath: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | undefined): string {
  if (!d) return ""
  try {
    return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
  } catch { return d }
}

function fmtYear(d: string | null): string {
  return d ? d.slice(0, 4) : ""
}

// ─── Season card ──────────────────────────────────────────────────────────────

function SeasonCard({
  season,
  isSelected,
  onSelect,
}: {
  season: BasicSeason
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        flexShrink: 0,
        width: 148,
        textAlign: "left",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
      }}
    >
      {/* Poster */}
      <div style={{
        position: "relative",
        width: 148,
        aspectRatio: "2 / 3",
        borderRadius: 14,
        overflow: "hidden",
        border: isSelected
          ? "2px solid rgba(255,255,255,0.55)"
          : "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        transition: "border-color 0.15s ease",
      }}>
        {season.posterUrl ? (
          <Image
            src={season.posterUrl}
            alt={season.name}
            fill
            sizes="148px"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div style={{
            height: "100%", display: "flex", alignItems: "center",
            justifyContent: "center",
            fontSize: 11, letterSpacing: "0.14em",
            color: "rgba(255,255,255,0.22)", textTransform: "uppercase",
          }}>
            S{season.seasonNumber}
          </div>
        )}
        {isSelected && (
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(255,255,255,0.12) 0%, transparent 50%)",
          }} />
        )}
      </div>

      {/* Metadata */}
      <div style={{ marginTop: 10, paddingLeft: 2 }}>
        <p style={{
          margin: 0, fontSize: 13, fontWeight: 500,
          color: isSelected ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.68)",
          lineHeight: 1.3,
          transition: "color 0.15s ease",
        }}>
          {season.name}
        </p>
        <p style={{
          margin: "4px 0 0", fontSize: 11,
          color: "rgba(255,255,255,0.36)",
        }}>
          {season.episodeCount} eps
          {fmtYear(season.airDate) ? ` · ${fmtYear(season.airDate)}` : ""}
        </p>
        {season.overview && (
          <p style={{
            margin: "6px 0 0", fontSize: 11, lineHeight: 1.55,
            color: "rgba(255,255,255,0.32)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}>
            {season.overview}
          </p>
        )}
      </div>
    </button>
  )
}

// ─── Episode card ─────────────────────────────────────────────────────────────

function EpisodeCard({
  episode,
  seasonNumber,
  review,
  tmdbId,
  seriesId,
  seriesTitle,
  seriesYear,
  creator,
  isOpen,
  onToggle,
  onReviewSaved,
}: {
  episode: EpisodeData
  seasonNumber: number
  review: Review | null
  tmdbId: number
  seriesId: string
  seriesTitle: string
  seriesYear: number
  creator: string
  isOpen: boolean
  onToggle: () => void
  onReviewSaved: (r: Review | null) => void
}) {
  return (
    <div
      style={{
        borderRadius: 18,
        border: isOpen
          ? "1px solid rgba(29,158,117,0.30)"
          : "1px solid rgba(255,255,255,0.07)",
        background: isOpen
          ? "rgba(29,158,117,0.04)"
          : "rgba(255,255,255,0.02)",
        overflow: "hidden",
        transition: "border-color 0.15s ease",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%", display: "flex", gap: 12,
          alignItems: "flex-start",
          padding: "14px 16px",
          background: "none", border: "none",
          cursor: "pointer", textAlign: "left",
          minHeight: 44,
        }}
      >
        {/* Still thumbnail */}
        <div className="series-episode-still" style={{
          position: "relative", flexShrink: 0,
          width: 120, aspectRatio: "16/9",
          borderRadius: 10, overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(255,255,255,0.04)",
        }}>
          {episode.stillPath ? (
            <Image
              src={`https://image.tmdb.org/t/p/w300${episode.stillPath}`}
              alt={episode.name}
              fill
              sizes="120px"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div style={{
              height: "100%", display: "flex", alignItems: "center",
              justifyContent: "center",
              fontSize: 10, color: "rgba(255,255,255,0.18)",
              letterSpacing: "0.1em",
            }}>
              E{episode.episodeNumber}
            </div>
          )}
        </div>

        {/* Metadata */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 10, letterSpacing: "0.18em",
              textTransform: "uppercase", color: "rgba(255,255,255,0.32)",
            }}>
              E{episode.episodeNumber}
            </span>
            {review && (
              <span style={{
                display: "inline-flex", alignItems: "center", height: 22,
                padding: "0 8px", borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                fontSize: 10, color: "rgba(255,255,255,0.62)",
                letterSpacing: "0.08em",
              }}>
                {review.rating ? `${review.rating.toFixed(1)} / 10` : "Logged"}
              </span>
            )}
          </div>
          <p style={{
            margin: "4px 0 0", fontSize: 14, fontWeight: 500,
            color: "rgba(255,255,255,0.88)", lineHeight: 1.3,
          }}>
            {episode.name}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "rgba(255,255,255,0.38)" }}>
            {fmtDate(episode.airDate)}
            {episode.runtime ? ` · ${episode.runtime}m` : ""}
          </p>
          {episode.overview && (
            <p style={{
              margin: "4px 0 0", fontSize: 11, lineHeight: 1.5,
              color: "rgba(255,255,255,0.26)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}>
              {episode.overview}
            </p>
          )}
        </div>

        <span style={{
          flexShrink: 0, alignSelf: "flex-start", marginTop: 4,
          fontSize: 11, letterSpacing: "0.12em",
          textTransform: "uppercase", color: "rgba(255,255,255,0.32)",
        }}>
          {review ? "Edit" : "+ Log"}
        </span>
      </button>

      {/* Expanded: overview + review form */}
      {isOpen && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {episode.overview && (
            <p style={{
              margin: "14px 0 16px", fontSize: 13, lineHeight: 1.7,
              color: "rgba(255,255,255,0.50)",
            }}>
              {episode.overview}
            </p>
          )}
          <ReviewForm
            mediaId={tmdbId}
            mediaType="series"
            scope="episode"
            seasonNumber={seasonNumber}
            episodeNumber={episode.episodeNumber}
            initialReview={review}
            onSaved={onReviewSaved}
            compact
            title={`${seriesTitle} · S${seasonNumber}E${episode.episodeNumber} — ${episode.name}`}
            year={episode.airDate ? Number(episode.airDate.slice(0, 4)) : seriesYear}
            creator={creator}
            aliases={[seriesId, `tmdb-${tmdbId}`]}
          />
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SeasonBrowser({
  tmdbId,
  seriesId,
  title,
  year,
  creator,
  basicSeasons,
  initialSeason,
}: {
  tmdbId: number
  seriesId: string
  title: string
  year: number
  creator: string
  basicSeasons: BasicSeason[]
  initialSeason: InitialSeason | null
}) {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const realSeasons = basicSeasons.filter((s) => s.seasonNumber >= 1)

  // Resume-navigation params set by TVProgressModule's Resume button
  const resumeS = Number(searchParams.get("resume-s")) || 0
  const resumeE = Number(searchParams.get("resume-e")) || 0

  const firstNum = (resumeS > 0 ? resumeS : null)
    ?? initialSeason?.seasonNumber
    ?? realSeasons[0]?.seasonNumber
    ?? 1

  const [selectedSeason, setSelectedSeason] = useState(firstNum)
  const [seasonCache, setSeasonCache] = useState<Map<number, EpisodeData[]>>(
    initialSeason ? new Map([[initialSeason.seasonNumber, initialSeason.episodes]]) : new Map()
  )
  const [loadingNum, setLoadingNum] = useState<number | null>(null)
  const [openEpKey, setOpenEpKey] = useState<string | null>(null)
  const [episodeReviews, setEpisodeReviews] = useState<Map<string, Review>>(new Map())
  // Pending episode to open once its season is loaded
  const [pendingEpKey, setPendingEpKey] = useState<string | null>(
    resumeS > 0 && resumeE > 0 ? `${resumeS}:${resumeE}` : null
  )
  const episodeListRef = useRef<HTMLDivElement>(null)

  // Load user episode reviews once
  useEffect(() => {
    if (!user?.id) return
    getAllShowReviews(user.id, tmdbId, {
      aliases: [seriesId, `tmdb-${tmdbId}`],
    }).then(({ episodeReviews: reviews }) => {
      const map = new Map<string, Review>()
      for (const r of reviews) {
        if (r.season_number != null && r.episode_number != null) {
          map.set(`${r.season_number}:${r.episode_number}`, r)
        }
      }
      setEpisodeReviews(map)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, tmdbId, seriesId])

  // On mount: if a resume target exists and its season isn't cached yet, load it
  useEffect(() => {
    if (!pendingEpKey) return
    const [s] = pendingEpKey.split(":").map(Number)
    if (seasonCache.has(s)) return
    setLoadingNum(s)
    getTVSeasonDetails(tmdbId, s).then((data) => {
      setSeasonCache((prev) => {
        const next = new Map(prev)
        next.set(s, data?.episodes.map((ep) => ({
          id: ep.id,
          name: ep.name || `Episode ${ep.episode_number}`,
          overview: ep.overview || "",
          airDate: ep.air_date || undefined,
          episodeNumber: ep.episode_number,
          runtime: ep.runtime ?? null,
          stillPath: ep.still_path ?? null,
        })) ?? [])
        return next
      })
      setLoadingNum(null)
      setSelectedSeason(s)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Once the pending season is in cache, open the episode and scroll
  useEffect(() => {
    if (!pendingEpKey) return
    const [s] = pendingEpKey.split(":").map(Number)
    if (!seasonCache.has(s)) return
    setOpenEpKey(pendingEpKey)
    setPendingEpKey(null)
    setTimeout(() => {
      episodeListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 80)
  }, [pendingEpKey, seasonCache])

  async function switchSeason(num: number) {
    setSelectedSeason(num)
    setOpenEpKey(null)
    if (!seasonCache.has(num)) {
      setLoadingNum(num)
      const data = await getTVSeasonDetails(tmdbId, num)
      setSeasonCache((prev) => {
        const next = new Map(prev)
        next.set(num, data?.episodes.map((ep) => ({
          id: ep.id,
          name: ep.name || `Episode ${ep.episode_number}`,
          overview: ep.overview || "",
          airDate: ep.air_date || undefined,
          episodeNumber: ep.episode_number,
          runtime: ep.runtime ?? null,
          stillPath: ep.still_path ?? null,
        })) ?? [])
        return next
      })
      setLoadingNum(null)
    }
    setTimeout(() => {
      episodeListRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }, 60)
  }

  const currentEpisodes = seasonCache.get(selectedSeason) ?? []
  const currentSeasonInfo = realSeasons.find((s) => s.seasonNumber === selectedSeason)

  if (realSeasons.length === 0) return null

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* ── Season cards ──────────────────────────────────────────────────── */}
      <div>
        <p style={{
          margin: "0 0 16px",
          fontSize: 10, fontWeight: 600, letterSpacing: "0.22em",
          textTransform: "uppercase", color: "rgba(255,255,255,0.30)",
        }}>
          Seasons · {realSeasons.length}
        </p>
        <div
          className="series-ep-season-scroll"
          style={{ display: "flex", gap: 14, paddingBottom: 6 }}
        >
          {realSeasons.map((season) => (
            <SeasonCard
              key={season.seasonNumber}
              season={season}
              isSelected={selectedSeason === season.seasonNumber}
              onSelect={() => switchSeason(season.seasonNumber)}
            />
          ))}
        </div>
      </div>

      {/* ── Season selector tabs + episode list ───────────────────────────── */}
      <div>
        {/* Tabs */}
        <div
          className="series-ep-season-scroll"
          style={{ display: "flex", gap: 6, paddingBottom: 4, marginBottom: 18 }}
        >
          {realSeasons.map((season) => {
            const isActive = selectedSeason === season.seasonNumber
            return (
              <button
                key={season.seasonNumber}
                type="button"
                onClick={() => switchSeason(season.seasonNumber)}
                style={{
                  flexShrink: 0, minHeight: 44,
                  padding: "0 16px",
                  borderRadius: 999,
                  border: isActive
                    ? "1px solid rgba(255,255,255,0.20)"
                    : "1px solid rgba(255,255,255,0.08)",
                  background: isActive ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.03)",
                  color: isActive ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.50)",
                  fontSize: 13, fontWeight: isActive ? 500 : 400,
                  cursor: "pointer",
                  transition: "all 0.14s ease",
                  whiteSpace: "nowrap",
                }}
              >
                {season.name}
              </button>
            )
          })}
        </div>

        {/* Season info bar */}
        {currentSeasonInfo && (
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px", marginBottom: 14,
            borderRadius: 12,
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.60)", flex: 1 }}>
              {currentSeasonInfo.episodeCount} episodes
              {fmtYear(currentSeasonInfo.airDate) ? ` · ${fmtYear(currentSeasonInfo.airDate)}` : ""}
              {currentSeasonInfo.overview ? ` · ${currentSeasonInfo.overview.slice(0, 80)}${currentSeasonInfo.overview.length > 80 ? "…" : ""}` : ""}
            </p>
          </div>
        )}

        {/* Episode list */}
        <div ref={episodeListRef} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {loadingNum === selectedSeason ? (
            <div style={{
              padding: "32px 0", textAlign: "center",
              fontSize: 13, color: "rgba(255,255,255,0.30)",
              letterSpacing: "0.06em",
            }}>
              Loading episodes…
            </div>
          ) : currentEpisodes.length === 0 ? (
            <div style={{
              padding: "24px 0", textAlign: "center",
              fontSize: 13, color: "rgba(255,255,255,0.28)",
            }}>
              No episodes available yet.
            </div>
          ) : (
            currentEpisodes.map((ep) => {
              const key = `${selectedSeason}:${ep.episodeNumber}`
              return (
                <EpisodeCard
                  key={key}
                  episode={ep}
                  seasonNumber={selectedSeason}
                  review={episodeReviews.get(key) ?? null}
                  tmdbId={tmdbId}
                  seriesId={seriesId}
                  seriesTitle={title}
                  seriesYear={year}
                  creator={creator}
                  isOpen={openEpKey === key}
                  onToggle={() => setOpenEpKey(openEpKey === key ? null : key)}
                  onReviewSaved={(r) => {
                    setEpisodeReviews((prev) => {
                      const next = new Map(prev)
                      if (r) next.set(key, r)
                      else next.delete(key)
                      return next
                    })
                    setOpenEpKey(null)
                  }}
                />
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}
