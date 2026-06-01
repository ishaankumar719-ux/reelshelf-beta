"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { fetchFollowingReviewsForMedia, type MediaReview } from "@/lib/supabase/mediaReviews"
import { getProfileInitials } from "@/lib/profile"

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" })
  } catch {
    return ""
  }
}

function Avatar({ url, name, size = 32 }: { url?: string | null; name?: string | null; size?: number }) {
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
      background: "rgba(255,255,255,0.08)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, color: "rgba(255,255,255,0.55)", fontWeight: 600,
    }}>
      {initials}
    </div>
  )
}

export default function TVSocialLayer({
  mediaIds,
  title,
}: {
  mediaIds: string[]
  title: string
}) {
  const [reviews, setReviews] = useState<MediaReview[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetchFollowingReviewsForMedia(mediaIds).then((data) => {
      setReviews(data)
      setLoaded(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaIds.join(",")])

  if (!loaded || reviews.length === 0) return null

  return (
    <section style={{
      padding: 24,
      borderRadius: 26,
      border: "1px solid rgba(255,255,255,0.07)",
      background: "linear-gradient(180deg, rgba(14,14,22,0.96) 0%, rgba(9,9,15,0.96) 100%)",
    }}>
      <p style={{
        margin: "0 0 6px",
        fontSize: 10, fontWeight: 600, letterSpacing: "0.22em",
        textTransform: "uppercase", color: "rgba(255,255,255,0.30)",
      }}>
        Friends watched
      </p>
      <h2 style={{
        margin: "0 0 20px",
        fontSize: 20, fontWeight: 500, letterSpacing: "-0.02em",
        color: "rgba(255,255,255,0.88)",
      }}>
        {title} on your shelf
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {reviews.slice(0, 5).map((rev) => {
          const displayName = rev.displayName ?? rev.username ?? "Someone"
          const profileHref = rev.username ? `/u/${rev.username}` : null
          const snippet = rev.review.trim().slice(0, 120)
          const hasSnippet = snippet.length > 0

          return (
            <div
              key={rev.entryId}
              style={{
                display: "flex", gap: 12, alignItems: "flex-start",
                padding: "14px 16px",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.05)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              {profileHref ? (
                <Link href={profileHref} style={{ display: "block", flexShrink: 0 }}>
                  <Avatar url={rev.avatarUrl} name={displayName} />
                </Link>
              ) : (
                <Avatar url={rev.avatarUrl} name={displayName} />
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.82)" }}>
                    {profileHref ? (
                      <Link href={profileHref} style={{ textDecoration: "none", color: "inherit" }}>{displayName}</Link>
                    ) : displayName}
                  </p>
                  {rev.rating != null && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", height: 22,
                      padding: "0 8px", borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.04)",
                      fontSize: 11, color: "rgba(255,255,255,0.60)",
                      fontVariantNumeric: "tabular-nums",
                    }}>
                      {rev.rating.toFixed(1)}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.26)" }}>
                    {formatDate(rev.watchedDate || rev.savedAt)}
                  </span>
                </div>

                {hasSnippet && (
                  <p style={{
                    margin: "6px 0 0",
                    fontSize: 13, lineHeight: 1.6,
                    color: "rgba(255,255,255,0.50)",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}>
                    {snippet}{rev.review.trim().length > 120 ? "…" : ""}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
