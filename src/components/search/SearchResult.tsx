"use client"

import { useState } from "react"
import { getPosterUrl } from "@/src/lib/tmdb-image"
import type { SearchResult as SearchResultType } from "@/src/hooks/useSearch"
import { useDiaryLog } from "@/hooks/useDiaryLog"
import { createClient as createSupabaseClient } from "@/lib/supabase/client"

interface SearchResultProps {
  result: SearchResultType
  onSelect: () => void
  active?: boolean
  id?: string
}

type WatchlistState = "idle" | "saving" | "saved"

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
  const [watchlistState, setWatchlistState] = useState<WatchlistState>("idle")
  const { openLog } = useDiaryLog()
  const posterUrl = result.poster_path ? getPosterUrl(result.poster_path, "w92") : null
  const meta =
    result.media_type === "book"
      ? [result.year, result.author].filter(Boolean).join(" · ")
      : [result.year, result.director].filter(Boolean).join(" · ")

  // Only films and series support watchlist (books go to reading_shelf — different flow)
  const supportsWatchlist = result.media_type === "film" || result.media_type === "series"

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onSelect()
    }
  }

  function handleLogClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    openLog({
      title: result.title,
      media_type:
        result.media_type === "series"
          ? "tv"
          : result.media_type === "book"
            ? "book"
            : "movie",
      year: Number.parseInt(result.year ?? "0", 10) || 0,
      poster: result.poster_path ? getPosterUrl(result.poster_path, "w342") : null,
      creator: result.director ?? result.author ?? null,
      tmdb_id: result.media_type === "book" ? null : result.id,
    })
  }

  function handleWatchlistClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    if (watchlistState !== "idle") return
    void addToWatchlist()
  }

  async function addToWatchlist() {
    const supabase = createSupabaseClient()
    if (!supabase) return

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return

    // Map search media_type → saved_items media_type
    const dbMediaType = result.media_type === "series" ? "tv" : "movie"
    // Consistent media_id format used across film/series pages
    const mediaId = `tmdb-${result.id}`

    setWatchlistState("saving")

    // Duplicate check — unique constraint is (user_id, list_type, media_type, media_id)
    const { count } = await supabase
      .from("saved_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .eq("list_type", "watchlist")
      .eq("media_type", dbMediaType)
      .eq("media_id", mediaId)

    if ((count ?? 0) > 0) {
      setWatchlistState("saved")
      return
    }

    const { error } = await supabase.from("saved_items").insert({
      user_id: session.user.id,
      list_type: "watchlist",
      media_id: mediaId,
      media_type: dbMediaType,
      title: result.title,
      poster: result.poster_path ? getPosterUrl(result.poster_path, "w342") : null,
      year: Number.parseInt(result.year ?? "0", 10) || 0,
      creator: result.director ?? null,
      genres: [],
      runtime: null,
      vote_average: null,
    })

    if (error) {
      console.error("[WATCHLIST] insert error:", error.message)
      setWatchlistState("idle")
      return
    }

    setWatchlistState("saved")
  }

  return (
    <div
      id={id}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={`flex w-full items-center gap-3 rounded-md px-2.5 py-2.5 text-left outline-none transition ${
        active ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
      } focus-visible:ring-1 focus-visible:ring-white/30`}
    >
      {/* Poster thumbnail */}
      <div className="flex h-[44px] w-[30px] shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-[#121420] text-white/45">
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

      {/* Content — two rows */}
      <div className="min-w-0 flex-1">
        {/* Row 1: title, up to 2 lines */}
        <p className="line-clamp-2 text-[13px] font-medium leading-[1.35] text-white/80">
          {result.title}
        </p>

        {/* Row 2: meta on the left, badge + actions on the right */}
        <div className="mt-1.5 flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-[11px] text-white/36">
            {meta || "No details yet"}
          </p>

          <div className="flex shrink-0 items-center gap-1">
            <span
              className={`inline-flex h-[18px] items-center rounded-full border px-1.5 text-[9px] uppercase tracking-[0.12em] ${getBadgeClasses(result.media_type)}`}
            >
              {getLabel(result.media_type)}
            </span>

            {/* Watchlist — films and series only */}
            {supportsWatchlist ? (
              <button
                type="button"
                onClick={handleWatchlistClick}
                disabled={watchlistState !== "idle"}
                className={`rounded border px-1.5 py-0.5 text-[10px] leading-none transition ${
                  watchlistState === "saved"
                    ? "cursor-default border-white/[0.08] bg-white/[0.03] text-white/28"
                    : watchlistState === "saving"
                      ? "cursor-wait border-white/[0.10] bg-white/[0.03] text-white/28"
                      : "border-white/[0.16] bg-white/[0.05] text-white/50 hover:bg-white/[0.09] hover:text-white/72"
                }`}
              >
                {watchlistState === "saved"
                  ? "✓ Saved"
                  : watchlistState === "saving"
                    ? "…"
                    : "+ Watchlist"}
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleLogClick}
              className="rounded border border-[#1D9E75]/38 bg-[#1D9E75]/12 px-1.5 py-0.5 text-[10px] leading-none text-[#9de3c7] transition hover:bg-[#1D9E75]/20"
            >
              + Log
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
