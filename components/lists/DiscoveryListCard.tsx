"use client"

import Link from "next/link"
import ListCoverCollage from "@/components/lists/ListCoverCollage"
import ListEngagementButtons from "@/components/lists/ListEngagementButtons"
import type { DiscoveryList } from "@/lib/supabase/lists"

const FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'

const MEDIA_BADGE: Record<string, { label: string; color: string; border: string; bg: string }> = {
  movie: { label: "Film", color: "rgba(165,180,252,0.9)",  border: "rgba(99,102,241,0.28)",  bg: "rgba(99,102,241,0.07)"  },
  tv:    { label: "TV",   color: "rgba(94,234,212,0.9)",   border: "rgba(20,184,166,0.28)",  bg: "rgba(20,184,166,0.07)"  },
  book:  { label: "Book", color: "rgba(252,211,77,0.9)",   border: "rgba(245,158,11,0.28)",  bg: "rgba(245,158,11,0.07)"  },
}

const AVATAR_COLORS = ["#1D9E75", "#534AB7", "#D85A30", "#D4537E", "#2563EB", "#7C3AED"]
function avatarColor(seed: string): string {
  return AVATAR_COLORS[seed.charCodeAt(0) % AVATAR_COLORS.length] ?? AVATAR_COLORS[0]
}

interface DiscoveryListCardProps {
  list: DiscoveryList
  currentUserId: string | null
  isLiked: boolean
  isSaved: boolean
}

export default function DiscoveryListCard({ list, currentUserId, isLiked, isSaved }: DiscoveryListCardProps) {
  const href = `/lists/${list.id}`
  const seed = list.creator.username ?? list.creator.display_name ?? "?"
  const initial = seed[0]?.toUpperCase() ?? "?"
  const color = avatarColor(seed)
  const creatorLabel = list.creator.username
    ? `@${list.creator.username}`
    : list.creator.display_name ?? null

  return (
    <div
      style={{
        borderRadius: 14,
        border: "0.5px solid rgba(255,255,255,0.09)",
        background: "rgba(255,255,255,0.025)",
        overflow: "hidden",
        transition: "border-color 0.18s, background 0.18s, transform 0.2s ease, box-shadow 0.2s ease",
        fontFamily: FONT,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"
        e.currentTarget.style.background = "rgba(255,255,255,0.04)"
        e.currentTarget.style.transform = "translateY(-3px)"
        e.currentTarget.style.boxShadow = "0 12px 36px rgba(99,102,241,0.18), 0 4px 16px rgba(0,0,0,0.38)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"
        e.currentTarget.style.background = "rgba(255,255,255,0.025)"
        e.currentTarget.style.transform = "translateY(0)"
        e.currentTarget.style.boxShadow = ""
      }}
    >
      {/* ── Clickable area navigates to list ───────────────────────────── */}
      <Link href={href} style={{ display: "block", textDecoration: "none", color: "inherit" }}>

        {/* Cover collage */}
        <div style={{ position: "relative", width: "100%", height: 160, overflow: "hidden", background: "#06060e" }}>
          <ListCoverCollage
            items={list.coverItems.map((i) => ({
              url: i.poster_url,
              alt: `${MEDIA_BADGE[i.media_type]?.label ?? "Cover"} cover — ${i.title}`,
            }))}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(6,6,18,0.72) 0%, transparent 52%)",
              pointerEvents: "none",
            }}
          />
          {list.is_ranked && (
            <span
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(251,191,36,0.95)",
                background: "rgba(12,10,2,0.76)",
                border: "0.5px solid rgba(251,191,36,0.38)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                borderRadius: 5,
                padding: "3px 8px",
                fontFamily: FONT,
              }}
            >
              Ranked
            </span>
          )}
        </div>

        {/* Card body */}
        <div style={{ padding: "12px 13px 10px" }}>
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 13,
              fontWeight: 700,
              color: "rgba(255,255,255,0.88)",
              lineHeight: 1.3,
              letterSpacing: "-0.01em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {list.title}
          </p>

          {creatorLabel && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 9 }}>
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 8,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.92)",
                  flexShrink: 0,
                }}
              >
                {initial}
              </div>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.34)", lineHeight: 1 }}>
                {creatorLabel}
              </span>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.24)" }}>
              {list.item_count} {list.item_count === 1 ? "item" : "items"}
            </span>
            {list.media_types.map((type) => {
              const badge = MEDIA_BADGE[type]
              if (!badge) return null
              return (
                <span
                  key={type}
                  style={{
                    fontSize: 8,
                    fontWeight: 700,
                    letterSpacing: "0.09em",
                    textTransform: "uppercase",
                    color: badge.color,
                    background: badge.bg,
                    border: `0.5px solid ${badge.border}`,
                    borderRadius: 4,
                    padding: "2px 6px",
                    fontFamily: FONT,
                  }}
                >
                  {badge.label}
                </span>
              )
            })}
          </div>
        </div>
      </Link>

      {/* ── Social bar — outside Link so clicks don't navigate ─────────── */}
      <div
        style={{
          padding: "9px 13px 12px",
          borderTop: "0.5px solid rgba(255,255,255,0.06)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <ListEngagementButtons
          listId={list.id}
          ownerId={list.user_id}
          currentUserId={currentUserId}
          initialLikeCount={list.like_count}
          initialSaveCount={list.save_count}
          initialIsLiked={isLiked}
          initialIsSaved={isSaved}
          compact
        />
      </div>
    </div>
  )
}
