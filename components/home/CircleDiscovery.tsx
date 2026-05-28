"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useAuth } from "../AuthProvider"
import { createClient as createSupabaseBrowserClient } from "../../lib/supabase/client"
import { getCircleDiscoveryRows, type RecItem, type DiscoveryRowsResult } from "../../lib/recommendations"
import { getMediaHref } from "../../lib/mediaRoutes"
import type { MediaType } from "../../lib/media"
import type { FriendsActivityEntry } from "../../lib/supabase/social"

const SANS = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'
const SERIF = 'Georgia, "Times New Roman", serif'

// ─── Shared mini-components ───────────────────────────────────────────────────

function PosterTile({
  title,
  mediaType,
  poster,
  href,
  badge,
  rating,
}: {
  title: string
  mediaType: MediaType
  poster: string | null
  href: string
  badge?: string
  rating?: number
}) {
  return (
    <Link
      href={href}
      className="poster-tile"
      style={{
        display: "block",
        width: "min(104px, 25vw)",
        flexShrink: 0,
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div
        style={{
          position: "relative",
          borderRadius: 8,
          overflow: "hidden",
          paddingBottom: "150%",
          background: "#0f0f0f",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {poster ? (
          <img
            src={poster}
            alt={title}
            loading="lazy"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(135deg,#181818,#0c0c0c)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "rgba(255,255,255,0.08)", fontSize: 20, fontWeight: 700, fontFamily: SANS }}>
              {title[0]}
            </span>
          </div>
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.85) 100%)",
          }}
        />
        {typeof rating === "number" && (
          <div
            style={{
              position: "absolute",
              top: 5,
              right: 5,
              background: "rgba(0,0,0,0.78)",
              backdropFilter: "blur(8px)",
              borderRadius: 4,
              padding: "2px 5px",
              color: "#f0c060",
              fontSize: 9,
              fontWeight: 700,
              fontFamily: SANS,
            }}
          >
            {rating.toFixed(1)}
          </div>
        )}
        {badge && typeof rating !== "number" && (
          <div
            style={{
              position: "absolute",
              top: 5,
              left: 5,
              background: "rgba(0,0,0,0.78)",
              backdropFilter: "blur(8px)",
              borderRadius: 4,
              padding: "2px 5px",
              color: "rgba(255,255,255,0.58)",
              fontSize: 8,
              fontFamily: SANS,
            }}
          >
            {badge}
          </div>
        )}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "5px 6px" }}>
          <h3
            style={{
              margin: 0,
              fontSize: 9.5,
              fontWeight: 600,
              lineHeight: 1.2,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {title}
          </h3>
        </div>
      </div>
    </Link>
  )
}

function DiscoveryRow({
  eyebrow,
  title,
  items,
}: {
  eyebrow: string
  title: string
  items: RecItem[]
}) {
  if (items.length === 0) return null
  return (
    <section style={{ marginBottom: "clamp(18px, 3.5vw, 26px)" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          marginBottom: "clamp(8px, 1.8vw, 12px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span
            style={{
              color: "#3e3e3e",
              fontSize: 9,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              fontFamily: SANS,
            }}
          >
            {eyebrow}
          </span>
          <h2
            style={{
              margin: 0,
              fontSize: "clamp(14px, 2.5vw, 17px)",
              lineHeight: 1.1,
              letterSpacing: "-0.25px",
              fontWeight: 500,
            }}
          >
            {title}
          </h2>
        </div>
      </div>
      <div
        className="home-row"
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollSnapType: "x mandatory",
          scrollBehavior: "smooth",
          overscrollBehaviorX: "contain",
          scrollbarWidth: "none",
          paddingBottom: 2,
        }}
      >
        {items.map((item) => (
          <PosterTile
            key={`${item.media_type}-${item.media_id}`}
            title={item.title}
            mediaType={item.media_type}
            poster={item.poster}
            href={getMediaHref({ id: item.media_id, mediaType: item.media_type as MediaType })}
            rating={item.logCount >= 2 ? parseFloat(item.avgRating.toFixed(1)) : undefined}
            badge={item.logCount >= 2 ? `${item.logCount}×` : undefined}
          />
        ))}
      </div>
    </section>
  )
}

// ─── Empty state for no follows ───────────────────────────────────────────────

function NoFollowsDiscovery() {
  return (
    <section style={{ marginBottom: "clamp(18px, 3.5vw, 26px)" }}>
      <div style={{ marginBottom: "clamp(8px, 1.8vw, 12px)" }}>
        <span style={{ color: "#3e3e3e", fontSize: 9, letterSpacing: "0.09em", textTransform: "uppercase", fontFamily: SANS, display: "block", marginBottom: 4 }}>
          Your Circle
        </span>
        <h2 style={{ margin: 0, fontSize: "clamp(14px, 2.5vw, 17px)", lineHeight: 1.1, letterSpacing: "-0.25px", fontWeight: 500, fontFamily: SERIF }}>
          Discover what your circle watches
        </h2>
      </div>
      <div
        style={{
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.02)",
          padding: "clamp(16px, 3vw, 22px)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {[
          { icon: "💎", label: "Hidden gems", desc: "Niche films your circle rates 8+ that most people haven't heard of" },
          { icon: "🔁", label: "Most rewatched", desc: "Titles your circle keeps coming back to" },
          { icon: "⭐", label: "Critically loved", desc: "The highest-rated films and series from people you follow" },
          { icon: "📚", label: "Books your circle is reading", desc: "Books and reading picks from your shelves" },
        ].map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)", fontFamily: SANS }}>{item.label}</p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#3c3c3c", fontFamily: SANS, lineHeight: 1.4 }}>{item.desc}</p>
            </div>
          </div>
        ))}
        <Link
          href="/discover"
          style={{
            alignSelf: "flex-start",
            marginTop: 4,
            display: "inline-flex",
            alignItems: "center",
            height: 32,
            padding: "0 14px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.5)",
            textDecoration: "none",
            fontSize: 11,
            fontFamily: SANS,
          }}
        >
          Find people to follow
        </Link>
      </div>
    </section>
  )
}

// ─── System 3: Trending in circle (improved) ──────────────────────────────────

function useTrendingThisWeek(friendsActivity: FriendsActivityEntry[]) {
  return (() => {
    if (friendsActivity.length < 2) return []
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const weekActivity = friendsActivity.filter(
      (e) => new Date(e.savedAt).getTime() > oneWeekAgo
    )
    if (weekActivity.length === 0) return []

    const scores = new Map<
      string,
      { score: number; count: number; entry: FriendsActivityEntry }
    >()

    for (const entry of weekActivity) {
      const key = `${entry.mediaType}:${entry.id}`
      const daysAgo =
        (Date.now() - new Date(entry.savedAt).getTime()) / (24 * 60 * 60 * 1000)
      const recencyWeight = daysAgo < 1 ? 3 : daysAgo < 3 ? 2 : 1
      const ratingWeight = (typeof entry.rating === "number" ? entry.rating : 5) / 10
      const entryScore = recencyWeight * (0.4 + ratingWeight * 0.6)

      const hit = scores.get(key)
      if (hit) {
        hit.score += entryScore
        hit.count++
      } else {
        scores.set(key, { score: entryScore, count: 1, entry })
      }
    }

    return Array.from(scores.values())
      .filter(({ count }) => count >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(({ count, entry }) => ({
        id: entry.id,
        mediaType: entry.mediaType,
        title: entry.title,
        poster: entry.poster,
        href: entry.href,
        count,
      }))
  })()
}

// ─── Main component ───────────────────────────────────────────────────────────

interface CircleDiscoveryProps {
  friendsActivity: FriendsActivityEntry[]
  friendsHasFollows: boolean | null
}

export default function CircleDiscovery({
  friendsActivity,
  friendsHasFollows,
}: CircleDiscoveryProps) {
  const { user } = useAuth()
  const [rows, setRows] = useState<DiscoveryRowsResult | null>(null)
  const [loadingRows, setLoadingRows] = useState(false)

  const trendingThisWeek = useTrendingThisWeek(friendsActivity)

  useEffect(() => {
    if (!user?.id || friendsHasFollows === false || friendsHasFollows === null) return

    const client = createSupabaseBrowserClient()
    if (!client) return

    setLoadingRows(true)

    void (async () => {
      // Fetch the IDs of everyone the user follows
      const { data: followData } = await client
        .from("followers")
        .select("following_id")
        .eq("follower_id", user.id)

      const followedIds = (followData ?? []).map((f) => f.following_id as string)
      if (followedIds.length === 0) {
        setLoadingRows(false)
        return
      }

      const result = await getCircleDiscoveryRows(client, user.id, followedIds)
      setRows(result)
      setLoadingRows(false)
    })()
  }, [user, friendsHasFollows])

  // User follows nobody — show informative empty state
  if (friendsHasFollows === false) {
    return <NoFollowsDiscovery />
  }

  // Still loading or no data yet
  if (friendsHasFollows === null || (!rows && !loadingRows)) return null

  const hasAnyData =
    rows &&
    (rows.hiddenGems.length > 0 ||
      rows.mostRewatched.length > 0 ||
      rows.criticallyLoved.length > 0 ||
      rows.booksCircle.length > 0)

  return (
    <>
      {/* System 3: Trending in your circle this week */}
      {trendingThisWeek.length > 0 && (
        <section style={{ marginBottom: "clamp(18px, 3.5vw, 26px)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              marginBottom: "clamp(8px, 1.8vw, 12px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span
                style={{
                  color: "#3e3e3e",
                  fontSize: 9,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                  fontFamily: SANS,
                }}
              >
                This week
              </span>
              <h2
                style={{
                  margin: 0,
                  fontSize: "clamp(17px, 3vw, 22px)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.4px",
                  fontWeight: 400,
                  fontFamily: SERIF,
                }}
              >
                Trending in your circle
              </h2>
            </div>
          </div>
          <div
            className="home-row"
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              scrollSnapType: "x mandatory",
              scrollBehavior: "smooth",
              overscrollBehaviorX: "contain",
              scrollbarWidth: "none",
              paddingBottom: 2,
            }}
          >
            {trendingThisWeek.map((item) => (
              <PosterTile
                key={`${item.mediaType}-${item.id}`}
                title={item.title}
                mediaType={item.mediaType}
                poster={item.poster}
                href={item.href}
                badge={`${item.count}×`}
              />
            ))}
          </div>
        </section>
      )}

      {/* System 4: Discovery rows — only render when data is ready */}
      {hasAnyData && (
        <>
          <DiscoveryRow
            eyebrow="Your Circle"
            title="Hidden gems from your circle"
            items={rows!.hiddenGems}
          />
          <DiscoveryRow
            eyebrow="Your Circle"
            title="Most rewatched by friends"
            items={rows!.mostRewatched}
          />
          <DiscoveryRow
            eyebrow="Your Circle"
            title="Critically loved by friends"
            items={rows!.criticallyLoved}
          />
          <DiscoveryRow
            eyebrow="Your Circle"
            title="Books your circle is reading"
            items={rows!.booksCircle}
          />
        </>
      )}
    </>
  )
}
