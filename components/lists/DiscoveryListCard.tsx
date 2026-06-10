"use client"

import Link from "next/link"
import ListCoverGrid from "@/components/lists/ListCoverGrid"
import type { DiscoveryList } from "@/lib/supabase/lists"

const FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'

const MEDIA_BADGE: Record<string, { label: string; color: string; border: string }> = {
  movie: { label: "Film", color: "rgba(165,180,252,0.85)", border: "rgba(99,102,241,0.3)" },
  tv:    { label: "TV",   color: "rgba(94,234,212,0.85)",  border: "rgba(20,184,166,0.3)" },
  book:  { label: "Book", color: "rgba(252,211,77,0.85)",  border: "rgba(245,158,11,0.3)" },
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
  const creatorLabel = list.creator.username
    ? `@${list.creator.username}`
    : list.creator.display_name ?? null

  return (
    <div
      style={{
        borderRadius: 12,
        border: "0.5px solid rgba(255,255,255,0.09)",
        background: "rgba(255,255,255,0.025)",
        overflow: "hidden",
        transition: "border-color 0.15s, background 0.15s",
        fontFamily: FONT,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"
        e.currentTarget.style.background = "rgba(255,255,255,0.04)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"
        e.currentTarget.style.background = "rgba(255,255,255,0.025)"
      }}
    >
      <Link href={href} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
        {/* Cover collage */}
        <div style={{ width: "100%", height: 148, overflow: "hidden", background: "#0a0a12" }}>
          <ListCoverGrid posters={list.posters} />
        </div>

        {/* Card body */}
        <div style={{ padding: "12px 14px 14px" }}>
          {/* Title row */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 5 }}>
            <p
              style={{
                margin: 0,
                flex: 1,
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
            {list.is_ranked && (
              <span
                style={{
                  flexShrink: 0,
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(251,191,36,0.8)",
                  border: "0.5px solid rgba(251,191,36,0.22)",
                  borderRadius: 4,
                  padding: "2px 6px",
                  marginTop: 1,
                }}
              >
                Ranked
              </span>
            )}
          </div>

          {/* Creator */}
          {creatorLabel && (
            <p style={{ margin: "0 0 8px", fontSize: 11, color: "rgba(255,255,255,0.32)" }}>
              {creatorLabel}
            </p>
          )}

          {/* Footer: item count + media type badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)" }}>
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
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: badge.color,
                    border: `0.5px solid ${badge.border}`,
                    borderRadius: 4,
                    padding: "2px 5px",
                  }}
                >
                  {badge.label}
                </span>
              )
            })}
          </div>
        </div>
      </Link>
    </div>
  )
}
