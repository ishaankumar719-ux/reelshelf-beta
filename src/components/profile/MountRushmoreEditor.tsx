"use client"

import { useEffect, useRef, useState } from "react"
import { getPosterUrl } from "@/src/lib/tmdb-image"
import { searchMedia } from "@/src/lib/searchMedia"
import type { MountRushmoreSlot } from "@/src/types/profile"

interface MountRushmoreEditorProps {
  initialSlots: MountRushmoreSlot[]
  onChange: (slots: MountRushmoreSlot[]) => void
}

type RushmoreTab = "movie" | "tv" | "book"

interface SearchResultItem {
  media_id: string
  media_type: RushmoreTab
  title: string
  year: string | null
  poster_path: string | null
  creator: string | null
}

interface OpenLibrarySearchResponse {
  docs?: Array<{
    key?: string
    title?: string
    first_publish_year?: number
    cover_i?: number
    author_name?: string[]
  }>
}

function blankSlot(position: 1 | 2 | 3 | 4, mediaType: RushmoreTab): MountRushmoreSlot {
  return {
    position,
    media_id: null,
    media_type: mediaType,
    title: null,
    year: null,
    poster_path: null,
  }
}

function getPosterSrc(slot: { poster_path: string | null }) {
  if (!slot.poster_path) return null
  if (slot.poster_path.startsWith("http")) return slot.poster_path
  return getPosterUrl(slot.poster_path, "w154")
}

function normalizeTabSlots(slots: MountRushmoreSlot[], mediaType: RushmoreTab) {
  return [1, 2, 3, 4].map((position) => {
    const found = slots.find(
      (slot) => slot.position === position && slot.media_type === mediaType
    )
    return found ?? blankSlot(position as 1 | 2 | 3 | 4, mediaType)
  })
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    >
      <path d="M12 7v10" />
      <path d="M7 12h10" />
    </svg>
  )
}

function SearchTypeBadge({ mediaType }: { mediaType: RushmoreTab }) {
  const label = mediaType === "movie" ? "Film" : mediaType === "tv" ? "Series" : "Book"
  const className =
    mediaType === "movie"
      ? "bg-blue-400/20 text-blue-100"
      : mediaType === "tv"
        ? "bg-emerald-400/20 text-emerald-100"
        : "bg-violet-400/20 text-violet-100"

  return (
    <span
      className={`absolute right-2 top-2 inline-flex items-center rounded-full px-2 py-1 text-[8px] uppercase tracking-[0.16em] ${className}`}
    >
      {label}
    </span>
  )
}

function ResultCard({
  result,
  onSelect,
}: {
  result: SearchResultItem
  onSelect: () => void
}) {
  const [imgError, setImgError] = useState(false)
  const posterUrl = getPosterSrc(result)

  return (
    <button
      type="button"
      onClick={onSelect}
      className="rounded-lg border border-white/8 bg-white/[0.03] p-2 text-left transition hover:border-[rgba(29,158,117,0.5)] hover:bg-[rgba(29,158,117,0.07)]"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-[#0d0d1a]">
        {posterUrl && !imgError ? (
          <img
            src={posterUrl}
            alt={result.title}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%),linear-gradient(180deg,#131323_0%,#090912_100%)] text-white/45">
            <PlusIcon />
          </div>
        )}

        <SearchTypeBadge mediaType={result.media_type} />
      </div>
      <div className="mt-2 min-w-0">
        <p className="truncate text-[10px] font-medium text-white/84">{result.title}</p>
        <p className="truncate text-[9px] text-white/42">
          {[result.year, result.creator].filter(Boolean).join(" · ") || "No details yet"}
        </p>
      </div>
    </button>
  )
}

export default function MountRushmoreEditor({
  initialSlots,
  onChange,
}: MountRushmoreEditorProps) {
  const [allSlots, setAllSlots] = useState<MountRushmoreSlot[]>(initialSlots)
  const [activeTab, setActiveTab] = useState<RushmoreTab>("movie")
  const [visible, setVisible] = useState(true)
  const [activePosition, setActivePosition] = useState<1 | 2 | 3 | 4 | null>(null)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const tabSlots = normalizeTabSlots(allSlots, activeTab)

  useEffect(() => {
    setAllSlots(initialSlots)
  }, [initialSlots])

  useEffect(() => {
    setVisible(false)
    const timeoutId = window.setTimeout(() => setVisible(true), 120)
    return () => window.clearTimeout(timeoutId)
  }, [activeTab])

  useEffect(() => {
    if (activePosition !== null) {
      inputRef.current?.focus()
    }
  }, [activePosition])

  useEffect(() => {
    if (activePosition === null) return

    function handleMouseDown(event: MouseEvent) {
      const target = event.target as Node

      if (!rootRef.current?.contains(target)) {
        setActivePosition(null)
        setQuery("")
        setResults([])
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActivePosition(null)
        setQuery("")
        setResults([])
      }
    }

    document.addEventListener("mousedown", handleMouseDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousedown", handleMouseDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [activePosition])

  useEffect(() => {
    let cancelled = false

    async function loadResults() {
      if (query.trim().length < 2) {
        setResults([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        if (activeTab === "book") {
          const response = await fetch(
            `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`
          )
          const data = (await response.json()) as OpenLibrarySearchResponse

          if (cancelled) return

          setResults(
            (data.docs ?? []).map((doc) => ({
              media_id: doc.key ?? "",
              media_type: "book" as const,
              title: doc.title ?? "",
              year: doc.first_publish_year ? String(doc.first_publish_year) : null,
              poster_path: doc.cover_i
                ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
                : null,
              creator: doc.author_name?.[0] ?? null,
            }))
            .filter((item) => item.media_id && item.title)
            .slice(0, 9)
          )
          return
        }

        const payload = await searchMedia(query, {
          types: activeTab === "movie" ? "film" : "series",
          limit: 9,
        })

        if (cancelled) return

        const mapped =
          activeTab === "movie"
            ? (payload.films ?? []).map((item) => ({
                media_id: String(item.id),
                media_type: "movie" as const,
                title: item.title,
                year: item.year ?? null,
                poster_path: item.poster_path ?? null,
                creator: item.director ?? null,
              }))
            : (payload.series ?? []).map((item) => ({
                media_id: String(item.id),
                media_type: "tv" as const,
                title: item.title,
                year: item.year ?? null,
                poster_path: item.poster_path ?? null,
                creator: item.director ?? null,
              }))

        setResults(mapped)
      } catch {
        if (!cancelled) {
          setResults([])
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    const timeoutId = window.setTimeout(() => {
      void loadResults()
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [activeTab, query])

  function updateAllSlots(nextSlots: MountRushmoreSlot[]) {
    const filledSlots = nextSlots.filter(
      (slot): slot is MountRushmoreSlot =>
        slot.media_id !== null && slot.media_type !== null && slot.title !== null
    )
    setAllSlots(filledSlots)
    onChange(filledSlots)
  }

  function handleSlotClick(position: 1 | 2 | 3 | 4) {
    setActivePosition(position)
    setQuery("")
    setResults([])
  }

  function handleSelect(result: SearchResultItem) {
    if (activePosition === null) return

    const nextTabSlots = tabSlots.map((slot) =>
      slot.position === activePosition
        ? {
            position: activePosition,
            media_id: result.media_id,
            media_type: result.media_type,
            title: result.title,
            year: result.year,
            poster_path: result.poster_path,
          }
        : slot
    )

    const nextSlots = [
      ...allSlots.filter((slot) => slot.media_type !== activeTab),
      ...nextTabSlots,
    ]

    updateAllSlots(nextSlots)
    setActivePosition(null)
    setQuery("")
    setResults([])
  }

  function handleRemove(position: 1 | 2 | 3 | 4) {
    const nextTabSlots = tabSlots.map((slot) =>
      slot.position === position ? blankSlot(position, activeTab) : slot
    )

    const nextSlots = [
      ...allSlots.filter((slot) => slot.media_type !== activeTab),
      ...nextTabSlots,
    ]

    updateAllSlots(nextSlots)

    if (activePosition === position) {
      setActivePosition(null)
      setQuery("")
      setResults([])
    }
  }

  const editorTitle =
    activeTab === "movie"
      ? "Edit your top 4 Films"
      : activeTab === "tv"
        ? "Edit your top 4 Series"
        : "Edit your top 4 Books"

  const emptyMessage =
    activeTab === "movie"
      ? "Build your top 4 films"
      : activeTab === "tv"
        ? "Build your top 4 series"
        : "Build your top 4 books"

  const searchPlaceholder =
    activeTab === "movie"
      ? "Search films…"
      : activeTab === "tv"
        ? "Search series…"
        : "Search books…"

  return (
    <div ref={rootRef}>
      <div className="flex gap-1">
        {([
          { key: "movie", label: "Films" },
          { key: "tv", label: "Series" },
          { key: "book", label: "Books" },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setActiveTab(tab.key)
              setActivePosition(null)
              setQuery("")
              setResults([])
            }}
            style={{
              padding: "5px 14px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              border: "none",
              transition: "all 0.15s ease",
              background: activeTab === tab.key ? "rgba(255,255,255,0.14)" : "transparent",
              color:
                activeTab === tab.key
                  ? "rgba(255,255,255,0.88)"
                  : "rgba(255,255,255,0.35)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm text-white/58">{editorTitle}</p>

      <div
        className="mt-4"
        style={{ opacity: visible ? 1 : 0, transition: "opacity 0.15s ease" }}
      >
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {tabSlots.map((slot) => {
            const active = slot.position === activePosition
            const filled = slot.media_id !== null
            const posterUrl = getPosterSrc(slot)

            return (
              <button
                key={`${activeTab}-${slot.position}`}
                type="button"
                onClick={() => handleSlotClick(slot.position)}
                className={`group relative overflow-hidden rounded-lg text-left ${
                  filled
                    ? active
                      ? "ring-2 ring-[rgba(29,158,117,0.7)]"
                      : "ring-1 ring-white/8"
                    : active
                      ? "border-[1.5px] border-dashed border-[rgba(29,158,117,0.7)] bg-[rgba(29,158,117,0.06)]"
                      : "border-[1.5px] border-dashed border-white/15 bg-[#0d0d1a] hover:border-white/30 hover:bg-[#141424]"
                }`}
              >
                <div className="relative aspect-[2/3]">
                  {filled ? (
                    <>
                      {posterUrl ? (
                        <img
                          src={posterUrl}
                          alt={slot.title || "Mount Rushmore title"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%),linear-gradient(180deg,#131323_0%,#090912_100%)] px-3 text-center text-white/50">
                          <PlusIcon />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleRemove(slot.position)
                        }}
                        className="absolute right-2 top-2 z-10 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-black/55 text-xs text-white opacity-0 transition group-hover:opacity-100"
                        aria-label={`Remove slot ${slot.position}`}
                      >
                        ×
                      </button>

                      <div className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-2">
                        <p className="truncate text-[10px] font-medium text-white/85">{slot.title}</p>
                        <p className="text-[9px] text-white/55">{slot.year || "—"}</p>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-white/46">
                      <PlusIcon />
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {tabSlots.every((slot) => slot.media_id === null) ? (
          <p className="mt-3 text-center text-[13px] italic text-white/30">{emptyMessage}</p>
        ) : null}
      </div>

      {activePosition !== null ? (
        <div className="mt-3 rounded-[10px] border border-white/10 bg-white/[0.04] p-[14px]">
          <p className="text-[11px] text-white/42">
            Picking for slot {activePosition}
          </p>

          <div className="mt-3 flex h-11 items-center gap-2 rounded-md border border-white/10 bg-[#0d0f18] px-3">
            <span className="text-white/35">
              <svg
                viewBox="0 0 24 24"
                className="h-[14px] w-[14px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/24"
            />
          </div>

          <div className="mt-4">
            {query.trim().length < 2 ? (
              <p className="py-7 text-center text-[11px] text-white/42">
                {activeTab === "book" ? "Start typing to search books" : "Start typing to search TMDB"}
              </p>
            ) : isLoading ? (
              <p className="py-7 text-center text-[11px] text-white/42">Searching…</p>
            ) : results.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {results.map((result) => (
                  <ResultCard
                    key={`${result.media_type}-${result.media_id}`}
                    result={result}
                    onSelect={() => handleSelect(result)}
                  />
                ))}
              </div>
            ) : (
              <p className="py-7 text-center text-[11px] text-white/42">
                No results for &quot;{query}&quot;
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
