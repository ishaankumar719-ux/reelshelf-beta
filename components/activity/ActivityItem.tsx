"use client"

import { useState } from "react"
import type { ActivityEvent, ActivityProfile } from "./ActivityFeed"

interface ActivityItemProps {
  event: ActivityEvent
  profile: ActivityProfile | null
  isLast: boolean
}

function timeAgo(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`

  return new Date(isoString).toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
  })
}

export default function ActivityItem({ event, profile, isLast }: ActivityItemProps) {
  const [avatarError, setAvatarError] = useState(false)

  const name = profile?.display_name ?? profile?.username ?? "You"
  const initial = (profile?.display_name ?? profile?.username ?? "R")
    .charAt(0)
    .toUpperCase()

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "14px 0",
        borderBottom: isLast ? "none" : "0.5px solid rgba(255,255,255,0.06)",
      }}
    >
      {!avatarError && profile?.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt={name}
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "50%",
            objectFit: "cover",
            flexShrink: 0,
          }}
          onError={() => setAvatarError(true)}
        />
      ) : (
        <div
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "50%",
            flexShrink: 0,
            background: "linear-gradient(135deg, #534AB7, #1D9E75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "13px",
            fontWeight: 500,
            color: "rgba(255,255,255,0.9)",
          }}
        >
          {initial}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            fontWeight: 500,
            color: "rgba(255,255,255,0.85)",
          }}
        >
          {name}
        </p>

        <p
          style={{
            margin: "4px 0 0",
            fontSize: "13px",
            color: "rgba(255,255,255,0.45)",
            lineHeight: 1.5,
          }}
        >
          {event.type === "logged" ? (
            <>
              logged{" "}
              <span style={{ color: "rgba(255,255,255,0.75)" }}>{event.title}</span>
              {event.rating !== null ? ` · ★ ${(event.rating / 2).toFixed(1)}` : ""}
            </>
          ) : (
            <>
              added{" "}
              <span style={{ color: "rgba(255,255,255,0.75)" }}>{event.title}</span> to
              watchlist
            </>
          )}
        </p>

        <p
          style={{
            margin: "4px 0 0",
            fontSize: "11px",
            color: "rgba(255,255,255,0.24)",
          }}
        >
          {timeAgo(event.timestamp)}
        </p>
      </div>

      <div
        style={{
          width: "36px",
          height: "54px",
          borderRadius: "5px",
          overflow: "hidden",
          background: "#111122",
          flexShrink: 0,
        }}
      >
        {event.poster ? (
          <img
            src={event.poster}
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
              fontSize: "16px",
              fontWeight: 600,
            }}
          >
            {event.title.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  )
}
