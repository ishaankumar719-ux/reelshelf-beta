"use client"

import Link from "next/link"
import ListCoverGrid from "@/components/lists/ListCoverGrid"
import type { DiscoveryList } from "@/lib/supabase/lists"

const FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'

const MEDIA_BADGE: Record<string, { label: string; color: string; border: string; bg: string }> = {
  movie: { label: "Film", color: "rgba(165,180,252,0.9)",  border: "rgba(99,102,241,0.28)",  bg: "rgba(99,102,241,0.07)"  },
  tv:    { label: "TV",   color: "rgba(94,234,212,0.9)",   border: "rgba(20,184,166,0.28)",  bg: "rgba(20,184,166,0.07)"  },
  book:  { label: "Book", color: "rgba(252,211,77,0.9)",   border: "rgba(245,158,11,0.28)",  bg: "rgba(245,158,11,0.07)"  },
}

// Consistent avatar colour derived from creator seed string
const AVATAR_COLORS = ["#1D9E75", "#534AB7", "#D85A30", "#D4537E", "#2563EB", "#7C3AED"]
function avatarColor(seed: string): string {
  return AVATAR_COLORS[seed.charCodeAt(0) % AVATAR_COLORS.length] ?? AVATAR_COLORS[0]
}

interface DiscoveryListCardProps {
  list: DiscoveryList
  // Future interaction slots — wire these up when likes/comments/saves are implemented
  onLike?: (listId: string) => void
  onComment?: (listId: string) => void
  onSave?: (listId: string) => void
  onFollowCreator?: (username: string) => void
}

export default function DiscoveryListCard({ list }: DiscoveryListCardProps) {
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
        cursor: "pointer",
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
      <Link href={href} style={{ display: "block", textDecoration: "none", color: "inherit" }}>

        {/* ── Cover collage ───────────────────────────────────────────── */}
        <div style={{ position: "relative", width: "100%", height: 160, overflow: "hidden", background: "#06060e" }}>
          <ListCoverGrid posters={list.posters} />

          {/* Bottom gradient for depth */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(6,6,18,0.72) 0%, transparent 52%)",
              pointerEvents: "none",
            }}
          />

          {/* Ranked badge — overlaid top-right on cover */}
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

        {/* ── Card body ──────────────────────────────────────────────── */}
        <div style={{ padding: "12px 13px 13px" }}>

          {/* Title */}
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

          {/* Creator row — avatar + handle */}
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
                  letterSpacing: 0,
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

          {/* Item count + media type badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
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

          {/* Social counts — placeholder UI, wire real counts up when feature ships */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              paddingTop: 9,
              borderTop: "0.5px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Likes */}
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: "rgba(255,255,255,0.22)", fontSize: 10, fontFamily: FONT }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              0
            </span>
            {/* Comments */}
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: "rgba(255,255,255,0.22)", fontSize: 10, fontFamily: FONT }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              0
            </span>
            {/* Saves */}
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: "rgba(255,255,255,0.22)", fontSize: 10, fontFamily: FONT }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              0
            </span>
          </div>
        </div>
      </Link>
    </div>
  )
}
