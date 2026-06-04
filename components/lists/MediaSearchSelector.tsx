"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { toAbsolutePosterUrl } from "@/lib/supabase/lists"
import type { ListMediaType } from "@/lib/supabase/lists"

const FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'

// API returns "film" / "series" — map to DB-legal values
function normalizeMediaType(apiType: string): ListMediaType {
  if (apiType === "film") return "movie"
  if (apiType === "series") return "tv"
  return "book"
}

export interface MediaSearchResult {
  media_type: ListMediaType
  media_id: string
  title: string
  poster_url: string | null
  year: string | null
}

interface ApiResult {
  id: number | string
  media_type: string
  title: string
  year: string | null
  poster_path: string | null
}

interface MediaSearchSelectorProps {
  existingMediaIds?: string[]
  onSelect: (item: MediaSearchResult) => void
  onClose: () => void
}

export default function MediaSearchSelector({
  existingMediaIds = [],
  onSelect,
  onClose,
}: MediaSearchSelectorProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<MediaSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setLoading(true)

      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}&types=film,series,book&limit=8`,
          { signal: ctrl.signal }
        )
        const body = await res.json() as {
          films?: ApiResult[]
          series?: ApiResult[]
          books?: ApiResult[]
        }

        const mapped: MediaSearchResult[] = [
          ...(body.films ?? []).map((r) => ({
            media_type: normalizeMediaType(r.media_type),
            media_id: String(r.id),
            title: r.title,
            poster_url: toAbsolutePosterUrl(r.poster_path),
            year: r.year,
          })),
          ...(body.series ?? []).map((r) => ({
            media_type: normalizeMediaType(r.media_type),
            media_id: String(r.id),
            title: r.title,
            poster_url: toAbsolutePosterUrl(r.poster_path),
            year: r.year,
          })),
          ...(body.books ?? []).map((r) => ({
            media_type: normalizeMediaType(r.media_type),
            media_id: String(r.id),
            title: r.title,
            poster_url: toAbsolutePosterUrl(r.poster_path),
            year: r.year,
          })),
        ]

        if (!ctrl.signal.aborted) setResults(mapped)
      } catch {
        // abort or network error — silently ignore
      } finally {
        if (!ctrl.signal.aborted) setLoading(false)
      }
    }, 280)

    return () => clearTimeout(timer)
  }, [query])

  const TYPE_LABEL: Record<ListMediaType, string> = { movie: "Film", tv: "TV", book: "Book" }
  const TYPE_COLOR: Record<ListMediaType, string> = {
    movie: "rgba(96,165,250,0.75)",
    tv:    "rgba(167,139,250,0.75)",
    book:  "rgba(52,211,153,0.75)",
  }

  if (!mounted) return null

  return createPortal(
    /* Backdrop — pure overlay, no flex alignment needed */
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(4px)",
        fontFamily: FONT,
      }}
      onPointerDown={onClose}
    >
      {/* Panel — anchored to viewport bottom via own fixed positioning */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          borderRadius: "20px 20px 0 0",
          background: "rgba(12,12,20,0.99)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderBottom: "none",
          boxShadow: "0 -8px 48px rgba(0,0,0,0.6)",
          maxHeight: "88dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          zIndex: 10000,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12 }}>
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 999,
              background: "rgba(255,255,255,0.15)",
            }}
          />
        </div>

        {/* Search input */}
        <div style={{ padding: "16px 20px 12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              height: 44,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              paddingInline: 14,
            }}
          >
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.28)", flexShrink: 0 }}>
              🔍
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search films, TV shows, books…"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 14,
                color: "rgba(255,255,255,0.88)",
                fontFamily: FONT,
              }}
            />
            {(loading || query.length > 0) && (
              <button
                type="button"
                onClick={() => setQuery("")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.28)",
                  fontSize: 16,
                  cursor: "pointer",
                  padding: 0,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                {loading ? "…" : "✕"}
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div style={{ overflowY: "auto", flex: 1, paddingBottom: 24 }}>
          {query.trim().length > 1 && !loading && results.length === 0 && (
            <p
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.28)",
                textAlign: "center",
                padding: "20px 0",
                fontStyle: "italic",
              }}
            >
              No results found.
            </p>
          )}

          {results.map((item) => {
            const alreadyAdded = existingMediaIds.includes(item.media_id)
            return (
              <button
                key={`${item.media_type}-${item.media_id}`}
                type="button"
                disabled={alreadyAdded}
                onClick={() => { if (!alreadyAdded) onSelect(item) }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "10px 20px",
                  background: "transparent",
                  border: "none",
                  borderBottom: "0.5px solid rgba(255,255,255,0.05)",
                  cursor: alreadyAdded ? "default" : "pointer",
                  textAlign: "left",
                  opacity: alreadyAdded ? 0.4 : 1,
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  if (!alreadyAdded) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent"
                }}
              >
                {/* Poster */}
                <div
                  style={{
                    width: 32,
                    height: 48,
                    borderRadius: 3,
                    overflow: "hidden",
                    flexShrink: 0,
                    background: "rgba(255,255,255,0.05)",
                  }}
                >
                  {item.poster_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.poster_url}
                      alt={item.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        opacity: 0.3,
                      }}
                    >
                      🎬
                    </div>
                  )}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: "0 0 3px",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.88)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontFamily: FONT,
                    }}
                  >
                    {item.title}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    {item.year && (
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: FONT }}>
                        {item.year}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 8,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: TYPE_COLOR[item.media_type],
                        fontFamily: FONT,
                      }}
                    >
                      {TYPE_LABEL[item.media_type]}
                    </span>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: 11,
                    color: alreadyAdded ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.4)",
                    flexShrink: 0,
                    fontFamily: FONT,
                  }}
                >
                  {alreadyAdded ? "Added" : "+"}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}
