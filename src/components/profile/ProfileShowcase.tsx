"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import PublicDiaryEntriesGrid from "@/components/PublicDiaryEntriesGrid"
import type { ActivityEvent } from "@/lib/activity"
import type { PublicDiaryEntry } from "@/lib/publicProfiles"
import type { DisplayBadge } from "@/lib/supabase/badges"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/AuthProvider"
import BadgeShelf from "@/src/components/profile/BadgeShelf"
import type {
  CinemaStats,
  MountRushmoreSlot,
  PublicProfileActivityItem,
  PublicProfileShowcaseData,
  PublicProfileTopRatedItem,
  ProfileYouMayLikeItem,
  ProfileSimilarUser,
} from "@/src/types/profile"
import { getMediaHref } from "@/lib/mediaRoutes"

interface ProfileShowcaseProps {
  profile: PublicProfileShowcaseData | null
  isOwner: boolean
  isFollowing?: boolean
  activityEvents?: ActivityEvent[]
  recentReviews?: PublicDiaryEntry[]
  badges?: DisplayBadge[]
  totalXP?: number
  tasteMatchScore?: number | null
  youMayLike?: ProfileYouMayLikeItem[]
  similarUsers?: ProfileSimilarUser[]
}

type RushmoreTab = "movie" | "tv" | "book"

const INITIAL_COLORS = ["#1D9E75", "#534AB7", "#D85A30", "#D4537E"] as const

function formatMemberSince(createdAt: string): string {
  const d = new Date(createdAt)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

function relativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  const week = 7 * day
  const month = 30 * day
  const year = 365 * day
  if (diff < minute) return "just now"
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`
  if (diff < day) return `${Math.floor(diff / hour)}h ago`
  if (diff < 2 * day) return "yesterday"
  if (diff < week) return `${Math.floor(diff / day)}d ago`
  if (diff < 2 * week) return "1 week ago"
  if (diff < month) return `${Math.floor(diff / week)} weeks ago`
  if (diff < year) return `${Math.floor(diff / month)} months ago`
  return `${Math.floor(diff / year)}y ago`
}

function getTimelineActionLabel(event: ActivityEvent): string {
  switch (event.type) {
    case "reviewed": return "Reviewed"
    case "finished_series": return "Finished"
    case "watched_episode": return event.media_type === "book" ? "Started reading" : "Started watching"
    case "watchlisted": return "Watchlisted"
    case "added_favourite": return "Marked favourite"
    case "list_created": return "Created a list"
    case "rushmore": return "Updated Favourite Four"
    case "challenge_completed": return "Completed a challenge"
    default: return "Logged"
  }
}

function getTimelineDotColor(type: ActivityEvent["type"]): string {
  switch (type) {
    case "reviewed": return "#D4AF37"
    case "finished_series": return "#1D9E75"
    case "added_favourite": return "#D4537E"
    case "watchlisted": return "#534AB7"
    case "list_created": return "#534AB7"
    case "rushmore": return "#D85A30"
    default: return "rgba(255,255,255,0.38)"
  }
}

function TimelineItem({ event }: { event: ActivityEvent }) {
  const router = useRouter()
  const [imgError, setImgError] = useState(false)
  const label = getTimelineActionLabel(event)
  const timeAgo = relativeTime(event.timestamp)
  const isListEvent = event.type === "list_created"
  const isRushmoreEvent = event.type === "rushmore"

  const posterSrc = event.poster
    ? event.poster.startsWith("http")
      ? event.poster
      : `https://image.tmdb.org/t/p/w92${event.poster}`
    : null

  const href =
    !isListEvent && !isRushmoreEvent && event.media_id
      ? getRouteForMedia(event.media_type, event.media_id)
      : null

  return (
    <div style={{ display: "flex", gap: 12, paddingBottom: 18 }}>
      <div
        style={{
          width: 16,
          flexShrink: 0,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          paddingTop: 4,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: getTimelineDotColor(event.type),
            border: "2px solid #08080f",
            boxSizing: "border-box" as const,
          }}
        />
      </div>

      <div
        style={{ display: "flex", gap: 10, flex: 1, minWidth: 0, cursor: href ? "pointer" : "default" }}
        onClick={() => href && router.push(href)}
        role={href ? "button" : undefined}
        tabIndex={href ? 0 : undefined}
        onKeyDown={(e) => e.key === "Enter" && href && router.push(href)}
      >
        {posterSrc && !imgError && (
          <div
            style={{
              width: 32,
              flexShrink: 0,
              aspectRatio: "2 / 3",
              borderRadius: 4,
              overflow: "hidden",
              background: "#10111c",
              alignSelf: "flex-start",
            }}
          >
            <img
              src={posterSrc}
              alt={event.title}
              onError={() => setImgError(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        )}

        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.82)", lineHeight: 1.4 }}>
            <span
              style={{
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.07em",
                textTransform: "uppercase" as const,
                color: "rgba(255,255,255,0.36)",
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                marginRight: 5,
              }}
            >
              {label}
            </span>
            {event.isBatch
              ? `${event.batchCount ?? ""} items`
              : event.title}
          </p>
          <p style={{ margin: "3px 0 0", fontSize: 10, color: "rgba(255,255,255,0.28)", letterSpacing: "0.01em" }}>
            {timeAgo}
          </p>
        </div>
      </div>
    </div>
  )
}

function ProfileActivityTimeline({ events }: { events: ActivityEvent[] }) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? events : events.slice(0, 10)

  if (events.length === 0) {
    return (
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontStyle: "italic", margin: 0 }}>
        No activity yet
      </p>
    )
  }

  return (
    <div>
      <div style={{ position: "relative" }}>
        {visible.length > 1 && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 7,
              top: 12,
              bottom: 18,
              width: 1,
              background: "rgba(255,255,255,0.07)",
            }}
          />
        )}
        <div>
          {visible.map((event) => (
            <TimelineItem key={event.id} event={event} />
          ))}
        </div>
      </div>

      {events.length > 10 && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          style={{
            marginTop: 4,
            padding: "7px 16px",
            borderRadius: 999,
            border: "0.5px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
            fontSize: 11,
            color: "rgba(255,255,255,0.5)",
            cursor: "pointer",
            letterSpacing: "0.03em",
          }}
        >
          Show more
        </button>
      )}
    </div>
  )
}

function sectionLabelStyle() {
  return {
    fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    color: "rgba(255,255,255,0.34)",
    marginBottom: 16,
    display: "block",
  }
}

function getInitials(displayName: string | null, username: string) {
  const source = (displayName || username).trim()
  if (!source) return "R"

  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase()
}

function getAvatarColor(username: string) {
  const fallback = username.trim() || "reelshelf"
  return INITIAL_COLORS[fallback.charCodeAt(0) % INITIAL_COLORS.length] || INITIAL_COLORS[0]
}

function parseRating(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null
  const parsed = typeof value === "string" ? parseFloat(value) : value
  return Number.isFinite(parsed) ? parsed : null
}

function getRushmorePosterSrc(slot: MountRushmoreSlot) {
  if (!slot.poster_path) return null
  if (slot.poster_path.startsWith("http")) return slot.poster_path
  return `https://image.tmdb.org/t/p/w342${slot.poster_path}`
}

function getRouteForMedia(mediaType: "movie" | "tv" | "book", mediaId: string) {
  if (mediaType === "tv") return `/series/${mediaId}`
  if (mediaType === "book") return `/books/${mediaId}`
  return `/films/${mediaId}`
}

function Avatar({
  avatarUrl,
  displayName,
  username,
}: {
  avatarUrl: string | null
  displayName: string | null
  username: string
}) {
  const [imgError, setImgError] = useState(false)
  const initials = getInitials(displayName, username)
  const color = getAvatarColor(username)

  return (
    <div
      style={{
        position: "relative",
        width: 88,
        height: 88,
        flexShrink: 0,
      }}
    >
      {/* Cinematic ambient ring */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: -3,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color}44 0%, transparent 70%)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          overflow: "hidden",
          border: `1.5px solid ${color}55`,
          background: `linear-gradient(135deg, ${color}, rgba(10,10,20,0.92))`,
          boxShadow: `0 0 0 2px rgba(10,10,20,0.9), 0 20px 48px rgba(0,0,0,0.5), 0 0 24px ${color}22`,
          zIndex: 1,
        }}
      >
        {avatarUrl && !imgError ? (
          <img
            src={avatarUrl}
            alt={displayName || username}
            onError={() => setImgError(true)}
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
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: "0.02em",
              color: "rgba(255,255,255,0.92)",
            }}
          >
            {initials}
          </div>
        )}
      </div>
    </div>
  )
}

function PosterFallback({ title }: { title: string }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg,#141622 0%,#0b0c14 100%)",
        color: "rgba(255,255,255,0.22)",
        fontSize: 24,
        fontWeight: 700,
      }}
    >
      {title.charAt(0).toUpperCase()}
    </div>
  )
}

function RushmoreCard({ slot }: { slot: MountRushmoreSlot }) {
  const router = useRouter()
  const [imgError, setImgError] = useState(false)
  const posterSrc = getRushmorePosterSrc(slot)
  const title = slot.title || "Untitled"
  const mediaType = slot.media_type || "movie"
  const routeId = slot.media_id || ""

  return (
    <button
      type="button"
      onClick={() => {
        if (!routeId) return
        router.push(getRouteForMedia(mediaType, routeId))
      }}
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: routeId ? "pointer" : "default",
        textAlign: "left",
      }}
    >
      <div
        style={{
          position: "relative",
          aspectRatio: "2 / 3",
          borderRadius: 10,
          overflow: "hidden",
          background: "#10111c",
          transition: "transform 0.15s ease",
        }}
        className="group"
      >
        {posterSrc && !imgError ? (
          <img
            src={posterSrc}
            alt={title}
            onError={() => setImgError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
            className="transition duration-150 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <PosterFallback title={title} />
        )}
      </div>
      <p
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.82)",
          margin: "8px 0 0",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.35)",
          margin: "2px 0 0",
        }}
      >
        {slot.year || "—"}
      </p>
    </button>
  )
}

function EmptyRushmoreTile() {
  return (
    <div
      style={{
        aspectRatio: "2 / 3",
        borderRadius: 10,
        border: "1.5px dashed rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.02)",
      }}
    />
  )
}

function RecentItemStars({ rating }: { rating: number | string | null }) {
  const val = typeof rating === "string" ? parseFloat(rating) : rating
  if (!val || !Number.isFinite(val)) return null
  const full = Math.floor(val / 2)
  const half = val % 2 >= 1
  return (
    <div style={{ display: "flex", gap: 1, alignItems: "center", marginTop: 4 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          style={{
            fontSize: 8,
            color:
              i < full
                ? "rgba(212,175,55,0.9)"
                : half && i === full
                  ? "rgba(212,175,55,0.55)"
                  : "rgba(255,255,255,0.12)",
          }}
        >
          ★
        </span>
      ))}
    </div>
  )
}

function RecentItem({ item }: { item: PublicProfileActivityItem }) {
  const router = useRouter()
  const [imgError, setImgError] = useState(false)
  const title = item.title
  const route = getRouteForMedia(item.media_type, item.media_id)

  if (!item.poster) return null

  const posterSrc = item.poster.startsWith("http")
    ? item.poster
    : `https://image.tmdb.org/t/p/w185${item.poster}`

  const dateStr = item.watched_date
    ? new Date(item.watched_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : null

  const reviewSnippet = item.review?.trim() || null

  return (
    <button
      type="button"
      onClick={() => router.push(route)}
      style={{
        width: 120,
        flexShrink: 0,
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <div
        style={{
          position: "relative",
          aspectRatio: "2 / 3",
          borderRadius: 8,
          overflow: "hidden",
          background: "#10111c",
        }}
      >
        {!imgError ? (
          <img
            src={posterSrc}
            alt={title}
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <PosterFallback title={title} />
        )}
      </div>

      <p
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: "rgba(255,255,255,0.82)",
          margin: "6px 0 0",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {title}
      </p>

      <RecentItemStars rating={item.rating} />

      {reviewSnippet ? (
        <p
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.45)",
            margin: "4px 0 0",
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {reviewSnippet}
        </p>
      ) : null}

      {dateStr ? (
        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.24)", margin: "3px 0 0", letterSpacing: "0.02em" }}>
          {dateStr}
        </p>
      ) : null}
    </button>
  )
}

function HighestRatedRow({ items }: { items: PublicProfileTopRatedItem[] }) {
  const [errors, setErrors] = useState<Record<number, boolean>>({})

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))",
        gap: 10,
      }}
    >
      {items.map((item, index) => (
        <div
          key={`${item.title}-${index}`}
          style={{
            position: "relative",
            width: 64,
            aspectRatio: "2 / 3",
            borderRadius: 8,
            overflow: "hidden",
            background: "#10111c",
          }}
        >
          {item.poster && !errors[index] ? (
            <img
              src={item.poster}
              alt={item.title}
              onError={() => setErrors((current) => ({ ...current, [index]: true }))}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <PosterFallback title={item.title} />
          )}
        </div>
      ))}
    </div>
  )
}

function FollowButton({
  profileId,
  initialIsFollowing,
}: {
  profileId: string
  initialIsFollowing: boolean
}) {
  const { user } = useAuth()
  const router = useRouter()
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [followerDelta, setFollowerDelta] = useState(0)
  const [loading, setLoading] = useState(false)

  if (!user) {
    return (
      <Link
        href="/auth"
        style={{
          display: "inline-flex",
          height: 36,
          alignItems: "center",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.16)",
          background: "rgba(255,255,255,0.06)",
          padding: "0 18px",
          fontSize: 12,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.82)",
          textDecoration: "none",
          flexShrink: 0,
        }}
      >
        Follow
      </Link>
    )
  }

  async function handleToggle() {
    if (loading || !user) return
    setLoading(true)
    const wasFollowing = isFollowing
    setIsFollowing(!wasFollowing)
    setFollowerDelta((d) => (wasFollowing ? d - 1 : d + 1))

    const client = createClient()
    if (!client) {
      setIsFollowing(wasFollowing)
      setFollowerDelta((d) => (wasFollowing ? d + 1 : d - 1))
      setLoading(false)
      return
    }

    try {
      if (wasFollowing) {
        await client
          .from("followers")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", profileId)
      } else {
        await client.from("followers").insert({
          follower_id: user.id,
          following_id: profileId,
        })
      }
      router.refresh()
    } catch {
      setIsFollowing(wasFollowing)
      setFollowerDelta((d) => (wasFollowing ? d + 1 : d - 1))
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      style={{
        display: "inline-flex",
        height: 36,
        alignItems: "center",
        borderRadius: 999,
        border: isFollowing
          ? "1px solid rgba(255,255,255,0.1)"
          : "1px solid rgba(255,255,255,0.22)",
        background: isFollowing ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.1)",
        padding: "0 18px",
        fontSize: 12,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: isFollowing ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.88)",
        flexShrink: 0,
        cursor: loading ? "wait" : "pointer",
        transition: "all 0.15s ease",
      }}
    >
      {loading ? "…" : isFollowing ? "Following" : "Follow"}
    </button>
  )
}

function CinemaStatsPoster({
  poster,
  title,
}: {
  poster: string | null
  title: string
}) {
  const [err, setErr] = useState(false)
  return (
    <div
      style={{
        position: "relative",
        width: 48,
        aspectRatio: "2 / 3",
        borderRadius: 6,
        overflow: "hidden",
        background: "#10111c",
        flexShrink: 0,
      }}
    >
      {poster && !err ? (
        <img
          src={poster}
          alt={title}
          onError={() => setErr(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <PosterFallback title={title} />
      )}
    </div>
  )
}

function CinemaStatsModule({ stats }: { stats: CinemaStats }) {
  return (
    <div
      style={{
        marginTop: 40,
        borderRadius: 20,
        border: "0.5px solid rgba(129,140,248,0.22)",
        background: "linear-gradient(160deg, rgba(99,102,241,0.08) 0%, rgba(10,10,20,0.0) 100%)",
        padding: "20px 20px 22px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
        <span style={{ fontSize: 14 }}>🎬</span>
        <span
          style={{
            fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "rgba(199,210,254,0.6)",
          }}
        >
          Cinema
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
          gap: 10,
          marginBottom: stats.latestVisit || stats.highestRated || stats.recentPosters.length > 0 ? 18 : 0,
        }}
      >
        <div
          style={{
            borderRadius: 12,
            border: "0.5px solid rgba(255,255,255,0.07)",
            background: "rgba(255,255,255,0.03)",
            padding: "12px 14px",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: "-0.5px",
              fontVariantNumeric: "tabular-nums",
              color: "rgba(255,255,255,0.88)",
            }}
          >
            {stats.totalVisits}
          </p>
          <p
            style={{
              margin: "5px 0 0",
              fontSize: 10,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.3)",
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            Visits
          </p>
        </div>

        {stats.mostActiveMonth ? (
          <div
            style={{
              borderRadius: 12,
              border: "0.5px solid rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.03)",
              padding: "12px 14px",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 500,
                letterSpacing: "-0.2px",
                color: "rgba(255,255,255,0.88)",
                lineHeight: 1.3,
              }}
            >
              {stats.mostActiveMonth}
            </p>
            <p
              style={{
                margin: "5px 0 0",
                fontSize: 10,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.3)",
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              }}
            >
              Most active
            </p>
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {stats.latestVisit ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <CinemaStatsPoster poster={stats.latestVisit.poster} title={stats.latestVisit.title} />
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 10,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.28)",
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                }}
              >
                Last visit
              </p>
              <p
                style={{
                  margin: "3px 0 0",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.82)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {stats.latestVisit.title}
              </p>
              {stats.latestVisit.rating !== null ? (
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: 11,
                    color: "rgba(255,255,255,0.38)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {stats.latestVisit.rating.toFixed(1)}/10
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {stats.highestRated && stats.highestRated.title !== stats.latestVisit?.title ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <CinemaStatsPoster poster={stats.highestRated.poster} title={stats.highestRated.title} />
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 10,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.28)",
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                }}
              >
                Highest rated
              </p>
              <p
                style={{
                  margin: "3px 0 0",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.82)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {stats.highestRated.title}
              </p>
              {stats.highestRated.rating !== null ? (
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: 11,
                    color: "rgba(255,255,255,0.38)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {stats.highestRated.rating.toFixed(1)}/10
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {stats.recentPosters.length > 0 ? (
          <div>
            <p
              style={{
                margin: "6px 0 8px",
                fontSize: 10,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.28)",
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              }}
            >
              Recent
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {stats.recentPosters.map((item, i) => (
                <CinemaStatsPoster key={`${item.title}-${i}`} poster={item.poster} title={item.title} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ─── System 6 sub-components ─────────────────────────────────────────────────

function YouMayLikeCard({ item }: { item: ProfileYouMayLikeItem }) {
  const router = useRouter()
  const [imgError, setImgError] = useState(false)
  const posterSrc = item.poster
    ? item.poster.startsWith("http")
      ? item.poster
      : `https://image.tmdb.org/t/p/w185${item.poster}`
    : null
  const href = getMediaHref({ id: item.media_id, mediaType: item.media_type })

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      style={{
        width: 100,
        flexShrink: 0,
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        textAlign: "left",
        scrollSnapAlign: "start",
      }}
    >
      <div
        style={{
          position: "relative",
          aspectRatio: "2 / 3",
          borderRadius: 8,
          overflow: "hidden",
          background: "#10111c",
        }}
      >
        {posterSrc && !imgError ? (
          <img
            src={posterSrc}
            alt={item.title}
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <PosterFallback title={item.title} />
        )}
        <div
          style={{
            position: "absolute",
            top: 5,
            right: 5,
            background: "rgba(0,0,0,0.75)",
            borderRadius: 4,
            padding: "2px 5px",
            fontSize: 9,
            fontWeight: 700,
            color: "rgba(212,175,55,0.9)",
          }}
        >
          {item.rating.toFixed(1)}
        </div>
      </div>
      <p
        style={{
          fontSize: 10,
          fontWeight: 500,
          color: "rgba(255,255,255,0.72)",
          margin: "5px 0 0",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {item.title}
      </p>
    </button>
  )
}

function SimilarUserRow({ user }: { user: ProfileSimilarUser }) {
  const FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'
  const href = user.username ? `/u/${user.username}` : "#"
  const [imgError, setImgError] = useState(false)
  const name = user.displayName || (user.username ? `@${user.username}` : "User")

  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        borderRadius: 12,
        border: "0.5px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.025)",
        textDecoration: "none",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          overflow: "hidden",
          flexShrink: 0,
          background: "rgba(99,102,241,0.2)",
          border: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 600,
          color: "rgba(255,255,255,0.7)",
        }}
      >
        {user.avatarUrl && !imgError ? (
          <img
            src={user.avatarUrl}
            alt={name}
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          (user.displayName || user.username || "U").slice(0, 1).toUpperCase()
        )}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.82)", fontFamily: FONT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {name}
        </p>
        {user.commonTitle && (
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.32)", fontFamily: FONT }}>
            Both love {user.commonTitle}
          </p>
        )}
      </div>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", flexShrink: 0 }}>→</span>
    </Link>
  )
}

const TASTE_ITEMS: Array<{
  key: keyof Pick<PublicProfileShowcaseData, "favourite_film" | "favourite_series" | "favourite_book">
  icon: string
  label: string
}> = [
  { key: "favourite_film",   icon: "🎬", label: "Film"   },
  { key: "favourite_series", icon: "📺", label: "Series" },
  { key: "favourite_book",   icon: "📚", label: "Book"   },
]

function TasteIdentityBlock({ profile }: { profile: PublicProfileShowcaseData }) {
  const FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'

  const items: Array<{ icon: string; label: string; value: string }> = []

  for (const { key, icon, label } of TASTE_ITEMS) {
    const value = profile[key]
    if (value) items.push({ icon, label, value })
  }

  if (profile.stats.cinemaVisits > 0) {
    items.push({
      icon: "🎟",
      label: "Cinema visits",
      value: String(profile.stats.cinemaVisits),
    })
  }

  if (items.length === 0) return null

  return (
    <div style={{ marginTop: 40 }}>
      <span style={sectionLabelStyle()}>Taste</span>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 10,
        }}
      >
        {items.map(({ icon, label, value }) => (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "11px 14px",
              borderRadius: 12,
              border: "0.5px solid rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.025)",
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1.4 }}>{icon}</span>
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.28)",
                  fontFamily: FONT,
                }}
              >
                {label}
              </p>
              <p
                style={{
                  margin: "3px 0 0",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.82)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontFamily: FONT,
                }}
              >
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ProfileShowcase({
  profile,
  isOwner,
  isFollowing: initialIsFollowing = false,
  activityEvents = [],
  recentReviews = [],
  badges = [],
  tasteMatchScore = null,
  youMayLike = [],
  similarUsers = [],
}: ProfileShowcaseProps) {
  const [activeTab, setActiveTab] = useState<RushmoreTab>("movie")
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    setVisible(false)
    const timeoutId = window.setTimeout(() => setVisible(true), 100)
    return () => window.clearTimeout(timeoutId)
  }, [activeTab])

  const rushmoreSlots = useMemo(() => {
    if (!profile) return [] as Array<MountRushmoreSlot | null>
    return [1, 2, 3, 4].map((position) =>
      profile.mount_rushmore.find(
        (slot) => slot.media_type === activeTab && slot.position === position
      ) ?? null
    )
  }, [activeTab, profile])

  if (!profile) return null

  const identityName = profile.display_name || profile.username

  if (!profile.is_public && !isOwner) {
    return (
      <section
        style={{
          maxWidth: 1020,
          margin: "0 auto",
          padding: "32px 20px 48px",
          background: "#08080f",
        }}
      >
        <div
          style={{
            minHeight: "50vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: 16,
          }}
        >
          <Avatar
            avatarUrl={profile.avatar_url}
            displayName={profile.display_name}
            username={profile.username}
          />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: "rgba(255,255,255,0.92)", margin: 0 }}>
              {identityName}
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", margin: "6px 0 0" }}>
              @{profile.username} has a private profile
            </p>
          </div>
          <FollowButton profileId={profile.id} initialIsFollowing={initialIsFollowing} />
        </div>
      </section>
    )
  }

  const u = profile.username
  const totalLogged = profile.stats.films + profile.stats.series + profile.stats.books
  const stats = [
    { label: "Logged",     value: totalLogged,                href: null as string | null },
    { label: "Films",      value: profile.stats.films,        href: `/u/${u}/films` },
    { label: "TV",         value: profile.stats.series,       href: `/u/${u}/series` },
    { label: "Books",      value: profile.stats.books,        href: null as string | null },
    { label: "Lists",      value: profile.stats.lists,        href: null as string | null },
    { label: "Watchlist",  value: profile.stats.watchlist,    href: `/u/${u}/watchlist` },
    { label: "Reviews",    value: profile.stats.reviews,      href: `/u/${u}/reviews` },
    { label: "Followers",  value: profile.stats.followers,    href: `/u/${u}/followers` },
    { label: "Following",  value: profile.stats.following,    href: `/u/${u}/following` },
    ...(profile.stats.cinemaVisits > 0
      ? [{ label: "Cinema", value: profile.stats.cinemaVisits, href: null as string | null }]
      : []),
  ]

  const emptyTabMessage =
    activeTab === "movie"
      ? "Build your top 4 films"
      : activeTab === "tv"
        ? "Build your top 4 series"
        : "Build your top 4 books"

  return (
    <section
      className="pf-section"
      style={{
        maxWidth: 1020,
        margin: "0 auto",
        padding: "32px 20px 48px",
        background: "#08080f",
      }}
    >
      <style>{`
        @media (max-width: 760px) {
          .pf-section { padding: 12px 12px 80px !important; }
          .pf-card { padding: 18px !important; border-radius: 22px !important; }

          /* Header: avatar + name top row, bio full-width below */
          .pf-header-top { align-items: center !important; }
          .pf-header-top > div:first-child { align-items: center !important; }

          /* Bio sits cleanly below the header row */
          .pf-bio {
            margin-top: 14px !important;
            font-size: 13px !important;
            line-height: 1.7 !important;
            max-width: 100% !important;
            -webkit-line-clamp: 5 !important;
          }

          /* Stats: horizontal scroll row on mobile — no more chunky 2-col grid */
          .pf-stats-grid {
            display: flex !important;
            overflow-x: auto !important;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
            gap: 8px !important;
            margin-top: 18px !important;
            padding-bottom: 4px;
            /* Bleed to card edges; trailing space hints there are more items */
            margin-inline: -18px !important;
            padding-inline: 18px 36px !important;
          }
          .pf-stats-grid::-webkit-scrollbar { display: none; }
          .pf-stat-card {
            flex-shrink: 0 !important;
            min-width: 76px !important;
            max-width: 96px !important;
            padding: 10px 12px !important;
            border-radius: 12px !important;
          }
          .pf-stat-value { font-size: 16px !important; }
          .pf-stat-link:hover { background: rgba(255,255,255,0.06) !important; border-color: rgba(255,255,255,0.16) !important; }

          /* Mount Rushmore: 2×2 grid — eliminates orphan tile at 3-col */
          .pf-rushmore-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
          }

          /* Tabs: stretch to fill, 40px minimum tap target */
          .pf-tab-bar { gap: 6px !important; margin-bottom: 14px !important; }
          .pf-tab-btn {
            flex: 1 !important;
            min-height: 40px !important;
            padding: 6px 10px !important;
            font-size: 13px !important;
          }
        }
      `}</style>

      <div
        className="pf-card"
        style={{
          background: `linear-gradient(150deg, rgba(99,102,241,0.07) 0%, rgba(255,255,255,0.025) 32%, rgba(255,255,255,0.02) 100%)`,
          border: "0.5px solid rgba(255,255,255,0.09)",
          borderRadius: 28,
          padding: 28,
          boxShadow: "0 28px 90px rgba(0,0,0,0.48)",
        }}
      >
        {/* Header: identity row + bio extracted below for full-width on mobile */}
        <div>
          <div
            className="pf-header-top"
            style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 18, minWidth: 0, flex: 1 }}>
              <Avatar
                avatarUrl={profile.avatar_url}
                displayName={profile.display_name}
                username={profile.username}
              />
              <div style={{ minWidth: 0, paddingTop: 4 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.025em", color: "rgba(255,255,255,0.94)", margin: 0, lineHeight: 1.2 }}>
                  {identityName}
                </h1>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.36)", margin: "5px 0 0", letterSpacing: "0.01em" }}>
                  @{profile.username}
                </p>
                {profile.created_at ? (
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", margin: "5px 0 0", letterSpacing: "0.03em" }}>
                    Member since {formatMemberSince(profile.created_at)}
                  </p>
                ) : null}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
              {isOwner ? (
                <Link
                  href="/profile"
                  style={{
                    display: "inline-flex",
                    height: 36,
                    alignItems: "center",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(0,0,0,0.25)",
                    padding: "0 16px",
                    fontSize: 11,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.82)",
                    textDecoration: "none",
                    flexShrink: 0,
                  }}
                >
                  Edit profile
                </Link>
              ) : (
                <FollowButton profileId={profile.id} initialIsFollowing={initialIsFollowing} />
              )}
              {!isOwner && tasteMatchScore !== null && (
                <div
                  title="Taste match score based on shared logged titles"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 10px",
                    borderRadius: 999,
                    border: "0.5px solid rgba(99,102,241,0.35)",
                    background: "rgba(99,102,241,0.1)",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "rgba(199,210,254,0.8)",
                    fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                    letterSpacing: "0.02em",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ fontSize: 9 }}>◈</span>
                  {tasteMatchScore}% taste match
                </div>
              )}
            </div>
          </div>

          {/* Bio — full-width row, works cleanly on both desktop and mobile */}
          {profile.bio ? (
            <p
              className="pf-bio"
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: "rgba(255,255,255,0.58)",
                margin: "14px 0 0",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                maxWidth: 680,
              }}
            >
              {profile.bio}
            </p>
          ) : null}
          {profile.website_url ? (
            <a
              href={profile.website_url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                marginTop: 10,
                fontSize: 12,
                color: "#67d7b2",
                textDecoration: "none",
                letterSpacing: "0.01em",
              }}
            >
              {profile.website_url}
            </a>
          ) : null}
        </div>

        <div
          className="pf-stats-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 12,
            marginTop: 28,
          }}
        >
          {stats.map((item) => {
            const cardStyle: React.CSSProperties = {
              textAlign: "center",
              border: "0.5px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              borderRadius: 14,
              padding: "16px 12px",
              transition: "background 0.14s ease, border-color 0.14s ease, transform 0.14s ease",
              display: "block",
              textDecoration: "none",
            }
            const inner = (
              <>
                <p className="pf-stat-value" style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.3px", fontVariantNumeric: "tabular-nums", color: "rgba(255,255,255,0.88)", margin: 0 }}>
                  {item.value}
                </p>
                <p style={{ fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "6px 0 0", fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif' }}>
                  {item.label}
                </p>
              </>
            )
            return item.href ? (
              <Link key={item.label} href={item.href} className="pf-stat-card pf-stat-link" style={cardStyle}>
                {inner}
              </Link>
            ) : (
              <div key={item.label} className="pf-stat-card" style={cardStyle}>
                {inner}
              </div>
            )
          })}
        </div>

        {badges.length > 0 ? <BadgeShelf badges={badges} /> : null}

        {profile.cinema_stats && profile.cinema_stats.totalVisits > 0 ? (
          <CinemaStatsModule stats={profile.cinema_stats} />
        ) : null}

        <div style={{ marginTop: 40 }}>
          <span style={sectionLabelStyle()}>Mount Rushmore</span>
          <div className="pf-tab-bar" style={{ display: "flex", gap: 4, marginBottom: 16 }}>
            {([
              { key: "movie", label: "Films" },
              { key: "tv", label: "Series" },
              { key: "book", label: "Books" },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                type="button"
                className="pf-tab-btn"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "5px 14px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  border: "none",
                  transition: "all 0.15s ease",
                  background:
                    activeTab === tab.key ? "rgba(255,255,255,0.14)" : "transparent",
                  color:
                    activeTab === tab.key
                      ? "rgba(255,255,255,0.88)"
                      : "rgba(255,255,255,0.35)",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ opacity: visible ? 1 : 0, transition: "opacity 0.15s ease" }}>
            <div
              className="pf-rushmore-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
                gap: 10,
              }}
            >
              {rushmoreSlots.map((slot, index) => (
                <div key={`${activeTab}-${index + 1}`}>
                  {slot ? <RushmoreCard slot={slot} /> : <EmptyRushmoreTile />}
                </div>
              ))}
            </div>

            {rushmoreSlots.every((slot) => slot === null) ? (
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.3)",
                  fontStyle: "italic",
                  textAlign: "center",
                  margin: "12px 0 0",
                }}
              >
                {emptyTabMessage}
              </p>
            ) : null}
          </div>
        </div>

        {profile.recent_activity.length > 0 ? (
          <div style={{ marginTop: 40 }}>
            <span style={sectionLabelStyle()}>Recently watched</span>
            <div
              style={{
                display: "flex",
                gap: 12,
                overflowX: "auto",
                scrollbarWidth: "none",
                paddingBottom: 4,
              }}
              className="[&::-webkit-scrollbar]:hidden"
            >
              {profile.recent_activity.map((item) => (
                <RecentItem key={`${item.id}-${item.media_id}`} item={item} />
              ))}
            </div>
          </div>
        ) : null}

        <div style={{ marginTop: 40 }}>
          <span style={sectionLabelStyle()}>Recent activity</span>
          <ProfileActivityTimeline events={activityEvents} />
        </div>

        {profile.highest_rated.length > 0 ? (
          <div style={{ marginTop: 40 }}>
            <span style={sectionLabelStyle()}>Highest rated</span>
            <HighestRatedRow items={profile.highest_rated} />
          </div>
        ) : null}

        {recentReviews.length > 0 ? (
          <div style={{ marginTop: 40 }}>
            <span style={sectionLabelStyle()}>Reviews</span>
            <PublicDiaryEntriesGrid
              entries={recentReviews}
              ownerUserId={profile.id}
              ownerUsername={profile.username}
              ownerDisplayName={profile.display_name}
              ownerAvatarUrl={profile.avatar_url}
            />
          </div>
        ) : null}

        <TasteIdentityBlock profile={profile} />

        {/* System 6: You may also like */}
        {youMayLike.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <span style={sectionLabelStyle()}>You may also like</span>
            <div
              style={{
                display: "flex",
                gap: 10,
                overflowX: "auto",
                scrollbarWidth: "none",
                paddingBottom: 4,
                scrollSnapType: "x mandatory",
                WebkitOverflowScrolling: "touch",
              }}
              className="[&::-webkit-scrollbar]:hidden"
            >
              {youMayLike.map((item) => (
                <YouMayLikeCard key={`${item.media_type}-${item.media_id}`} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* System 6: Similar users */}
        {similarUsers.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <span style={sectionLabelStyle()}>Similar shelves</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {similarUsers.map((u) => (
                <SimilarUserRow key={u.profileId} user={u} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
