"use client"

import Link from "next/link"
import { useState } from "react"
import { isOpenLibraryWorkId, mediaTypeLabel, type SharedTitle } from "@/lib/messaging/api"
import { C } from "./ui"

/** Where a shared title opens on the website. Films and TV use their TMDB id;
 *  books open by Open Library work id (the id the website's book pages and
 *  Diary use) or a built-in book's slug. A book the website has no page for
 *  (the iPhone app can share Google Books results) opens Search for it. */
export function sharedTitleHref(title: Pick<SharedTitle, "media_type" | "media_id" | "title">): string {
  if (title.media_type === "film") return `/films/${title.media_id}`
  if (title.media_type === "tv") return `/series/${title.media_id}`
  if (isOpenLibraryWorkId(title.media_id) || /^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(title.media_id)) {
    return `/books/${title.media_id}`
  }
  return `/search?q=${encodeURIComponent(title.title)}`
}

/** A shared film, TV show or book: artwork, title, year and type. */
export default function TitleCard({ title, compact = false }: { title: SharedTitle; compact?: boolean }) {
  const [artFailed, setArtFailed] = useState(false)
  const art = title.poster_url && !artFailed ? title.poster_url : null
  const width = compact ? 44 : 64
  return (
    <Link
      href={sharedTitleHref(title)}
      data-testid="title-card"
      aria-label={`${title.title}${title.year ? ` (${title.year})` : ""}, ${mediaTypeLabel(title.media_type)}. Open details`}
      style={{
        display: "flex", gap: 12, alignItems: "center", padding: 8, borderRadius: 14,
        background: "rgba(0,0,0,0.25)", border: `1px solid ${C.line}`, color: C.text,
        textDecoration: "none", minWidth: 0, width: "100%", boxSizing: "border-box",
      }}
    >
      <span style={{
        width, height: Math.round(width * 1.5), borderRadius: 8, overflow: "hidden", flexShrink: 0,
        background: "linear-gradient(135deg,#181818,#0d0d0d)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
      }}>
        {art ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote catalogue artwork, small and lazy
          <img src={art} alt="" loading="lazy" onError={() => setArtFailed(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <span aria-hidden="true" style={{ color: "rgba(255,255,255,0.1)", fontSize: width * 0.5, fontWeight: 700 }}>
            {title.title.charAt(0).toUpperCase() || "?"}
          </span>
        )}
      </span>
      <span style={{ display: "grid", gap: 4, minWidth: 0 }}>
        <span style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted }}>
          {mediaTypeLabel(title.media_type)}
        </span>
        <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.25, overflowWrap: "anywhere" }}>{title.title}</span>
        {title.year ? <span style={{ fontSize: 12, color: C.muted }}>{title.year}</span> : null}
      </span>
    </Link>
  )
}
