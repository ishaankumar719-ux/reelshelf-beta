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
      className="rs-card rs-card-hover"
      style={{ position: "relative", opacity: deleting ? 0.4 : 1 }}
    >
      <Link href={href} style={{ display: "block", textDecoration: "none" }}>
        {/* Cover collage */}
        <div style={{ position: "relative", width: "100%", height: 128, overflow: "hidden", background: "#06060e", borderRadius: "var(--rs-radius-card) var(--rs-radius-card) 0 0" }}>
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
              fontSize: "var(--rs-text-heading)",
              fontWeight: 700,
              color: "var(--rs-text-primary)",
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
            {list.visibility === "private" && (
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
                🔒 Private
              </span>
            )}
            {list.visibility === "unlisted" && (
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(96,165,250,0.8)",
                  border: "0.5px solid rgba(96,165,250,0.2)",
                  borderRadius: 4,
                  padding: "2px 6px",
                  fontFamily: FONT,
                  flexShrink: 0,
                }}
              >
                🔗 Unlisted
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {list.description && (
          <p
            style={{
              margin: "0 0 8px",
              fontSize: "var(--rs-text-body)",
              lineHeight: 1.55,
              color: "var(--rs-text-secondary)",
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

        {/* Footer: item count + engagement counts + date */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "var(--rs-text-caption)", color: "var(--rs-text-muted)", fontFamily: FONT }}>
              {list.item_count} {list.item_count === 1 ? "item" : "items"}
            </span>
            {(list.like_count > 0 || list.save_count > 0) && (
              <>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.12)", fontFamily: FONT }}>·</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(255,255,255,0.22)", fontFamily: FONT }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  {list.like_count}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(255,255,255,0.22)", fontFamily: FONT }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                  {list.save_count}
                </span>
              </>
            )}
          </div>
          <span style={{ fontSize: "var(--rs-text-caption)", color: "var(--rs-text-muted)", fontFamily: FONT }}>
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
