"use client"

import { useState } from "react"
import Link from "next/link"
import type { ActivityEvent, ActivityType } from "@/lib/activity"

interface ActivityCardProps {
  event: ActivityEvent
}

type TypeConfig = {
  label: string
  color: string
  bg: string
  border: string
  verb: string
}

const TYPE_CONFIG: Record<ActivityType, TypeConfig> = {
  logged: {
    label: "Watched",
    color: "rgba(160,180,255,0.9)",
    bg: "rgba(100,130,255,0.1)",
    border: "rgba(100,130,255,0.22)",
    verb: "watched",
  },
  reviewed: {
    label: "Reviewed",
    color: "rgba(250,199,117,0.9)",
    bg: "rgba(250,199,117,0.08)",
    border: "rgba(250,199,117,0.22)",
    verb: "reviewed",
  },
  watchlisted: {
    label: "Watchlist",
    color: "rgba(160,220,160,0.9)",
    bg: "rgba(29,158,117,0.1)",
    border: "rgba(29,158,117,0.24)",
    verb: "saved to watchlist",
  },
  finished_series: {
    label: "Finished",
    color: "rgba(200,160,255,0.9)",
    bg: "rgba(160,100,255,0.1)",
    border: "rgba(160,100,255,0.22)",
    verb: "finished",
  },
  rushmore: {
    label: "Rushmore",
    color: "rgba(255,160,100,0.9)",
    bg: "rgba(255,120,60,0.08)",
    border: "rgba(255,120,60,0.22)",
    verb: "updated",
  },
}

function getMediaHref(mediaType: string, mediaId: string | null | undefined): string | null {
  if (!mediaId) return null
  const id = mediaId.replace(/^tmdb-/, "")
  if (mediaType === "tv") return `/series/${id}`
  if (mediaType === "movie") return `/films/${id}`
  return null
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m`
  if (hours < 24) return `${hours}h`
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d`
  if (days < 30) return `${Math.floor(days / 7)}w`

  return new Date(iso).toLocaleDateString("en-GB", { month: "short", day: "numeric" })
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

export default function ActivityCard({ event }: ActivityCardProps) {
  const [avatarErr, setAvatarErr] = useState(false)
  const [posterErr, setPosterErr] = useState(false)
  const [liked, setLiked] = useState(false)

  const cfg = TYPE_CONFIG[event.type]
  const name = event.profile.display_name ?? event.profile.username ?? "You"
  const initial = (event.profile.display_name ?? event.profile.username ?? "R").charAt(0).toUpperCase()
  const profileHref = event.profile.username ? `/u/${event.profile.username}` : null
  const mediaHref = getMediaHref(event.media_type, event.media_id)

  const isBatchLogging = event.isBatch && event.batchCount && event.batchCount >= 4
  const isRushmore = event.type === "rushmore"

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "16px 0",
        position: "relative",
      }}
    >
      {/* Avatar */}
      <div style={{ flexShrink: 0, position: "relative" }}>
        {!avatarErr && event.profile.avatar_url ? (
          <img
            src={event.profile.avatar_url}
            alt={name}
            onError={() => setAvatarErr(true)}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #534AB7, #1D9E75)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 600,
              color: "rgba(255,255,255,0.92)",
            }}
          >
            {initial}
          </div>
        )}

        {/* Activity type dot */}
        <div
          style={{
            position: "absolute",
            bottom: -2,
            right: -2,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: cfg.bg,
            border: `1.5px solid ${cfg.border}`,
            boxShadow: "0 0 0 1.5px #08080f",
          }}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Top row: name + type badge + timestamp */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          {profileHref ? (
            <Link
              href={profileHref}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "rgba(255,255,255,0.88)",
                textDecoration: "none",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {name}
            </Link>
          ) : (
            <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>
              {name}
            </span>
          )}

          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              color: cfg.color,
              background: cfg.bg,
              border: `0.5px solid ${cfg.border}`,
              borderRadius: 999,
              padding: "2px 7px",
              lineHeight: 1,
            }}
          >
            {cfg.label}
          </span>

          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.24)", marginLeft: "auto" }}>
            {timeAgo(event.timestamp)}
          </span>
        </div>

        {/* Action line */}
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
          {isRushmore ? (
            "updated their Mount Rushmore"
          ) : isBatchLogging ? (
            `${cfg.verb} ${event.batchCount} films`
          ) : (
            <>
              {cfg.verb}{" "}
              {mediaHref ? (
                <Link
                  href={mediaHref}
                  style={{ color: "rgba(255,255,255,0.75)", fontWeight: 500, textDecoration: "none" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {event.title}
                </Link>
              ) : (
                <span style={{ color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>{event.title}</span>
              )}
              {event.rating ? (
                <span style={{ color: "rgba(250,199,117,0.75)", marginLeft: 6 }}>
                  ★ {(event.rating / 2).toFixed(1)}
                </span>
              ) : null}
            </>
          )}
        </p>

        {/* Review snippet */}
        {event.review && !event.isBatch ? (
          <p
            style={{
              margin: "7px 0 0",
              fontSize: 12,
              color: "rgba(255,255,255,0.5)",
              fontStyle: "italic",
              lineHeight: 1.55,
              borderLeft: "2px solid rgba(255,255,255,0.1)",
              paddingLeft: 10,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {event.review}
          </p>
        ) : null}

        {/* Interactions row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 9 }}>
          <button
            type="button"
            onClick={() => setLiked((prev) => !prev)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              fontWeight: 500,
              color: liked ? "rgba(255,100,100,0.85)" : "rgba(255,255,255,0.28)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              transition: "color 0.12s ease",
            }}
          >
            <HeartIcon filled={liked} />
            Like
          </button>

          {mediaHref && !isRushmore && !isBatchLogging ? (
            <Link
              href={mediaHref}
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "rgba(255,255,255,0.28)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              Open ↗
            </Link>
          ) : null}
        </div>
      </div>

      {/* Poster thumbnail */}
      {!isRushmore ? (
        <div style={{ flexShrink: 0 }}>
          {isBatchLogging ? (
            <div
              style={{
                width: 52,
                height: 78,
                borderRadius: 7,
                background: "rgba(255,255,255,0.04)",
                border: "0.5px solid rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>
                {event.batchCount}
              </span>
            </div>
          ) : (
            <div
              style={{
                width: 52,
                height: 78,
                borderRadius: 7,
                overflow: "hidden",
                background: "linear-gradient(145deg, #14142a, #1c1c36)",
                border: "0.5px solid rgba(255,255,255,0.08)",
                flexShrink: 0,
              }}
            >
              {mediaHref ? (
                <Link href={mediaHref} style={{ display: "block", width: "100%", height: "100%" }} onClick={(e) => e.stopPropagation()}>
                  <PosterInner event={event} posterErr={posterErr} onPosterErr={() => setPosterErr(true)} />
                </Link>
              ) : (
                <PosterInner event={event} posterErr={posterErr} onPosterErr={() => setPosterErr(true)} />
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

function PosterInner({
  event,
  posterErr,
  onPosterErr,
}: {
  event: ActivityEvent
  posterErr: boolean
  onPosterErr: () => void
}) {
  if (event.poster && !posterErr) {
    return (
      <img
        src={event.poster}
        onError={onPosterErr}
        alt={event.title}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        loading="lazy"
      />
    )
  }
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(255,255,255,0.12)",
        fontSize: 18,
        fontWeight: 700,
      }}
    >
      {event.title.charAt(0).toUpperCase()}
    </div>
  )
}
