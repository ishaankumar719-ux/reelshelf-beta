"use client"

import { useState } from "react"
import { getPosterUrl } from "@/src/lib/tmdb-image"
import type { SearchResult as SearchResultType } from "@/src/hooks/useSearch"

interface SearchResultProps {
  result: SearchResultType
  onSelect: () => void
  active?: boolean
  id?: string
}

function getBadgeClasses(mediaType: SearchResultType["media_type"]) {
  if (mediaType === "film") return "border-blue-300/20 bg-blue-400/15 text-blue-100"
  if (mediaType === "series") return "border-emerald-300/20 bg-emerald-400/15 text-emerald-100"
  return "border-fuchsia-300/20 bg-fuchsia-400/15 text-fuchsia-100"
}

function getLabel(mediaType: SearchResultType["media_type"]) {
  if (mediaType === "film") return "Film"
  if (mediaType === "series") return "Series"
  return "Book"
}

function MediaIcon({ mediaType }: { mediaType: SearchResultType["media_type"] }) {
  if (mediaType === "film") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M8 5v14" />
        <path d="M16 5v14" />
      </svg>
    )
  }

  if (mediaType === "series") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="4" y="6" width="16" height="10.5" rx="2" />
        <path d="M9 19h6" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4H18v15H7.5A2.5 2.5 0 0 0 5 21V6.5Z" />
      <path d="M9 8h6" />
      <path d="M9 11h6" />
    </svg>
  )
}

export default function SearchResult({
  result,
  onSelect,
  active = false,
  id,
}: SearchResultProps) {
  const [imgError, setImgError] = useState(false)
  const posterUrl = result.poster_path ? getPosterUrl(result.poster_path, "w92") : null
  const meta =
    result.media_type === "book"
      ? [result.year, result.author].filter(Boolean).join(" · ")
      : [result.year, result.director].filter(Boolean).join(" · ")

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onSelect()
    }
  }

  return (
    <button
      id={id}
      type="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={`flex min-h-11 w-full items-center gap-3 rounded-md px-2.5 py-2 text-left outline-none transition ${
        active ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
      } focus-visible:ring-1 focus-visible:ring-white/30`}
    >
      <div className="flex h-[42px] w-[28px] shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-[#121420] text-white/45">
        {posterUrl && !imgError ? (
          <img
            src={posterUrl}
            alt={result.title}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <MediaIcon mediaType={result.media_type} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-white/75">{result.title}</p>
        <p className="mt-0.5 truncate text-[11px] text-white/38">{meta || "No details yet"}</p>
      </div>

      <span className={`inline-flex h-5 shrink-0 items-center rounded-full border px-2 text-[9px] uppercase tracking-[0.14em] ${getBadgeClasses(result.media_type)}`}>
        {getLabel(result.media_type)}
      </span>
    </button>
  )
}
