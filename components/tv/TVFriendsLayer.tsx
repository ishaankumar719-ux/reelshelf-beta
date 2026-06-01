"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  fetchFriendsForShow,
  type FriendShowEntry,
  type TopRatedEpisode,
} from "@/lib/supabase/mediaReviews"
import { getProfileInitials } from "@/lib/profile"

function Avatar({
  url,
  name,
  size = 34,
}: {
  url?: string | null
  name?: string | null
  size?: number
}) {
  if (url) {
    return (
      <img
        src={url}
        alt={name ?? ""}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    )
  }
  const initials = getProfileInitials({ displayName: name ?? null, username: name ?? null })
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "rgba(255,255,255,0.07)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.34, color: "rgba(255,255,255,0.52)", fontWeight: 600,
    }}>
      {initials}
    </div>
  )
}

function FriendRow({ friend }: { friend: FriendShowEntry }) {
  const name = friend.displayName ?? friend.username ?? "Someone"
  const profileHref = friend.username ? `/u/${friend.username}` : null
  const statusLabel = friend.status === "finished" ? "Finished" : `Watching · S${friend.lastSeasonNumber ?? "?"}`
  const statusColor = friend.status === "finished"
    ? "rgba(29,158,117,0.82)"
    : "rgba(255,200,60,0.75)"

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "12px 14px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.05)",
      background: "rgba(255,255,255,0.018)",
    }}>
      {profileHref ? (
        <Link href={profileHref} style={{ display: "block", flexShrink: 0 }}>
          <Avatar url={friend.avatarUrl} name={name} />
        </Link>
      ) : (
        <Avatar url={friend.avatarUrl} name={name} />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.82)" }}>
            {profileHref ? (
              <Link href={profileHref} style={{ textDecoration: "none", color: "inherit" }}>{name}</Link>
            ) : name}
          </p>

          <span style={{ fontSize: 11, color: statusColor, letterSpacing: "0.04em" }}>
            {statusLabel}
          </span>

          {friend.rating != null && (
            <span style={{
              display: "inline-flex", alignItems: "center", height: 20,
              padding: "0 7px", borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              fontSize: 10, color: "rgba(255,255,255,0.55)",
              fontVariantNumeric: "tabular-nums",
            }}>
              {friend.rating.toFixed(1)}
            </span>
          )}
        </div>

        {friend.reviewSnippet && (
          <p style={{
            margin: "5px 0 0", fontSize: 12, lineHeight: 1.6,
            color: "rgba(255,255,255,0.44)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}>
            {friend.reviewSnippet.slice(0, 120)}{friend.reviewSnippet.length > 120 ? "…" : ""}
          </p>
        )}
      </div>
    </div>
  )
}

export default function TVFriendsLayer({
  mediaIds,
  title,
}: {
  mediaIds: string[]
  title: string
}) {
  const [data, setData] = useState<{ friends: FriendShowEntry[]; topEpisode: TopRatedEpisode | null } | null>(null)

  useEffect(() => {
    fetchFriendsForShow(mediaIds).then((result) => {
      if (result.friends.length > 0 || result.topEpisode) {
        setData(result)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaIds.join(",")])

  if (!data || data.friends.length === 0) return null

  const watching = data.friends.filter((f) => f.status === "watching")
  const finished = data.friends.filter((f) => f.status === "finished")

  return (
    <section style={{
      padding: "22px 24px",
      borderRadius: 22,
      border: "1px solid rgba(255,255,255,0.07)",
      background: "linear-gradient(180deg, rgba(14,14,22,0.97) 0%, rgba(9,9,15,0.97) 100%)",
      display: "flex",
      flexDirection: "column",
      gap: 20,
    }}>
      <div>
        <p style={{
          margin: "0 0 6px", fontSize: 10, fontWeight: 600,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "rgba(255,255,255,0.28)",
        }}>
          Friends
        </p>
        <h2 style={{
          margin: 0, fontSize: 19, fontWeight: 500,
          letterSpacing: "-0.02em", color: "rgba(255,255,255,0.86)",
        }}>
          {title} on your shelf
        </h2>
      </div>

      {/* Top rated episode callout */}
      {data.topEpisode && (
        <div style={{
          padding: "12px 16px", borderRadius: 12,
          border: "1px solid rgba(255,200,60,0.18)",
          background: "rgba(255,200,60,0.04)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 16 }}>⭐</span>
          <div>
            <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(255,200,60,0.65)" }}>
              Top rated among friends
            </p>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: "rgba(255,255,255,0.80)" }}>
              S{data.topEpisode.seasonNumber} E{data.topEpisode.episodeNumber}
              <span style={{ marginLeft: 8, color: "rgba(255,200,60,0.85)", fontVariantNumeric: "tabular-nums" }}>
                {data.topEpisode.avgRating.toFixed(1)}
              </span>
              <span style={{ marginLeft: 4, fontSize: 11, color: "rgba(255,255,255,0.30)" }}>
                / 10 · {data.topEpisode.ratingCount} {data.topEpisode.ratingCount === 1 ? "rating" : "ratings"}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Watching */}
      {watching.length > 0 && (
        <div>
          <p style={{
            margin: "0 0 10px", fontSize: 10, letterSpacing: "0.18em",
            textTransform: "uppercase", color: "rgba(255,200,60,0.60)",
          }}>
            Currently watching · {watching.length}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {watching.slice(0, 3).map((f) => <FriendRow key={f.userId} friend={f} />)}
          </div>
        </div>
      )}

      {/* Finished */}
      {finished.length > 0 && (
        <div>
          <p style={{
            margin: "0 0 10px", fontSize: 10, letterSpacing: "0.18em",
            textTransform: "uppercase", color: "rgba(29,158,117,0.65)",
          }}>
            Finished · {finished.length}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {finished.slice(0, 3).map((f) => <FriendRow key={f.userId} friend={f} />)}
          </div>
        </div>
      )}
    </section>
  )
}
