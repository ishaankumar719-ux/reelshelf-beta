"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { deleteList } from "@/lib/supabase/lists"
import type { UserListWithCount } from "@/lib/supabase/lists"
import ListCoverCollage from "@/components/lists/ListCoverCollage"

const FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'

const TYPE_LABEL: Record<string, string> = { movie: "Film", tv: "TV", book: "Book" }

interface ListPreviewCardProps {
  list: UserListWithCount
  isOwner: boolean
}

export default function ListPreviewCard({ list, isOwner }: ListPreviewCardProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const href = `/lists/${list.id}`

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const client = createClient()
    if (!client) return
    if (!window.confirm(`Delete "${list.title}"? This cannot be undone.`)) return
    setDeleting(true)
    await deleteList(client, list.id)
    router.refresh()
  }

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 12,
        border: "0.5px solid rgba(255,255,255,0.09)",
        background: "rgba(255,255,255,0.025)",
        overflow: "hidden",
        transition: "border-color 0.15s, background 0.15s",
        opacity: deleting ? 0.4 : 1,
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
      <Link href={href} style={{ display: "block", textDecoration: "none" }}>
        {/* Cover collage */}
        <div style={{ position: "relative", width: "100%", height: 128, overflow: "hidden", background: "#06060e" }}>
          <ListCoverCollage
            items={list.coverItems.map((i) => ({
              url: i.poster_url,
              alt: `${TYPE_LABEL[i.media_type] ?? "Cover"} cover — ${i.title}`,
            }))}
          />
        </div>

        <div style={{ padding: "16px 16px 14px" }}>
        {/* Top row: title + chips */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 6,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 700,
              color: "rgba(255,255,255,0.88)",
              lineHeight: 1.25,
              letterSpacing: "-0.01em",
              fontFamily: FONT,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {list.title}
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            {list.is_ranked && (
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(251,191,36,0.8)",
                  border: "0.5px solid rgba(251,191,36,0.22)",
                  borderRadius: 4,
                  padding: "2px 6px",
                  fontFamily: FONT,
                  flexShrink: 0,
                }}
              >
                Ranked
              </span>
            )}
            {isOwner && !list.is_public && (
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(251,113,133,0.75)",
                  border: "0.5px solid rgba(251,113,133,0.18)",
                  borderRadius: 4,
                  padding: "2px 6px",
                  fontFamily: FONT,
                  flexShrink: 0,
                }}
              >
                Private
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {list.description && (
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 12,
              lineHeight: 1.55,
              color: "rgba(255,255,255,0.38)",
              fontFamily: FONT,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {list.description}
          </p>
        )}

        {/* Footer: item count + date */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", fontFamily: FONT }}>
            {list.item_count} {list.item_count === 1 ? "item" : "items"}
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", fontFamily: FONT }}>
            {new Date(list.updated_at).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
        </div>
      </Link>

      {/* Owner delete button — positioned top-right corner, outside the Link */}
      {isOwner && (
        <button
          type="button"
          onClick={(e) => void handleDelete(e)}
          aria-label={`Delete ${list.title}`}
          disabled={deleting}
          style={{
            position: "absolute",
            bottom: 14,
            right: 14,
            width: 26,
            height: 26,
            borderRadius: "50%",
            border: "0.5px solid rgba(251,113,133,0.18)",
            background: "rgba(251,113,133,0.05)",
            color: "rgba(251,113,133,0.5)",
            fontSize: 11,
            cursor: deleting ? "wait" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
            fontFamily: FONT,
            zIndex: 1,
          }}
        >
          ✕
        </button>
      )}
    </div>
  )
}
