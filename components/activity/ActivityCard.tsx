"use client"

import { useState } from "react"
import type { ActivityEvent } from "@/lib/activity"

interface ActivityCardProps {
  event: ActivityEvent
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`

  return new Date(iso).toLocaleDateString("en-GB", { month: "short", day: "numeric" })
}

function getActionText(event: ActivityEvent) {
  if (event.type === "rushmore") {
    return "updated their Mount Rushmore"
  }

  if (event.isBatch && event.batchCount && event.batchCount >= 4) {
    return `logged ${event.batchCount} films from Letterboxd`
  }

  if (event.type === "reviewed") {
    return `reviewed ${event.title}${event.rating ? ` · ★ ${(event.rating / 2).toFixed(1)}` : ""}`
  }

  if (event.type === "watchlisted") {
    return `saved ${event.title} to watchlist`
  }

  return `watched ${event.title}${event.rating ? ` · ★ ${(event.rating / 2).toFixed(1)}` : ""}`
}

export default function ActivityCard({ event }: ActivityCardProps) {
  const [avatarErr, setAvatarErr] = useState(false)
  const name = event.profile.display_name ?? event.profile.username ?? "You"
  const initial = (event.profile.display_name ?? event.profile.username ?? "R")
    .charAt(0)
    .toUpperCase()
  const [posterErr, setPosterErr] = useState(false)

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "14px 8px",
        borderBottom: "0.5px solid rgba(255,255,255,0.06)",
        transition: "background 0.12s ease",
        borderRadius: 8,
      }}
      onMouseEnter={(eventNode) => {
        eventNode.currentTarget.style.background = "rgba(255,255,255,0.025)"
      }}
      onMouseLeave={(eventNode) => {
        eventNode.currentTarget.style.background = "transparent"
      }}
    >
      {!avatarErr && event.profile.avatar_url ? (
        <img
          src={event.profile.avatar_url}
          alt={name}
          onError={() => setAvatarErr(true)}
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            objectFit: "cover",
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            flexShrink: 0,
            background: "linear-gradient(135deg, #534AB7, #1D9E75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 500,
            color: "rgba(255,255,255,0.9)",
          }}
        >
          {initial}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "rgba(255,255,255,0.85)",
            }}
          >
            {name}
          </span>
          <span
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.4)",
            }}
          >
            {getActionText(event)}
          </span>
        </div>

        {event.review && !event.isBatch ? (
          <p
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.55)",
              fontStyle: "italic",
              margin: "4px 0 0",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            "{event.review}"
          </p>
        ) : null}

        <p
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.25)",
            margin: "4px 0 0",
          }}
        >
          {timeAgo(event.timestamp)}
        </p>
      </div>

      {event.isBatch ? (
        <div
          style={{
            width: 36,
            height: 54,
            borderRadius: 5,
            background: "rgba(255,255,255,0.05)",
            border: "0.5px solid rgba(255,255,255,0.1)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,255,255,0.3)",
            }}
          >
            {event.batchCount}
          </span>
        </div>
      ) : (
        <div
          style={{
            width: 36,
            height: 54,
            borderRadius: 5,
            overflow: "hidden",
            background: "#111122",
            flexShrink: 0,
          }}
        >
          {event.poster && !posterErr ? (
            <img
              src={event.poster}
              onError={() => setPosterErr(true)}
              alt={event.title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              loading="lazy"
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,0.12)",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {event.title.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
