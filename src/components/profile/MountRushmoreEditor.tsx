"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { getPosterUrl } from "@/src/lib/tmdb-image"
import { useRushmoreSearch, type RushmoreSearchResult } from "@/src/hooks/useRushmoreSearch"
import type { MountRushmoreSlot } from "@/src/types/profile"

interface MountRushmoreEditorProps {
  initialSlots: MountRushmoreSlot[]
  onChange: (slots: MountRushmoreSlot[]) => void
}

function blankSlot(position: 1 | 2 | 3 | 4): MountRushmoreSlot {
  return {
    position,
    media_id: null,
    media_type: null,
    title: null,
    year: null,
    poster_path: null,
  }
}

function normalizeSlots(initialSlots: MountRushmoreSlot[]) {
  return [1, 2, 3, 4].map((position) => {
    const found = initialSlots.find((slot) => slot.position === position)
    return found ?? blankSlot(position as 1 | 2 | 3 | 4)
  })
}

function FilmIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 5v14" />
      <path d="M16 5v14" />
    </svg>
  )
}

function SeriesIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="6" width="16" height="10.5" rx="2" />
      <path d="M9 19h6" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M12 7v10" />
      <path d="M7 12h10" />
    </svg>
  )
}

function LoadingDots() {
  return (
    <>
      <style>{`
        @keyframes rushmore-dot-pulse {
          0%, 100% { opacity: 0.3; transform: translateY(0px); }
          50% { opacity: 0.8; transform: translateY(-1px); }
        }
      `}</style>
      <div className="flex items-center justify-center gap-2 py-8">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="h-[5px] w-[5px] rounded-full bg-white/40"
            style={{
              animation: "rushmore-dot-pulse 1s ease-in-out infinite",
              animationDelay: `${index * 180}ms`,
            }}
          />
        ))}
      </div>
    </>
  )
}

function ResultCard({
  result,
  onSelect,
}: {
  result: RushmoreSearchResult
  onSelect: () => void
}) {
  const [imgError, setImgError] = useState(false)
  const posterUrl = getPosterUrl(result.poster_path, "w154")

  return (
    <button
      type="button"
      onClick={onSelect}
      className="rounded-lg border border-white/8 bg-white/[0.03] p-2 text-left transition hover:border-[rgba(29,158,117,0.5)] hover:bg-[rgba(29,158,117,0.07)]"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-[#0d0d1a]">
        {posterUrl && !imgError ? (
          <Image
            src={posterUrl}
            alt={result.title}
            fill
            sizes="(max-width: 768px) 30vw, 154px"
            className="object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%),linear-gradient(180deg,#131323_0%,#090912_100%)] text-white/45">
            {result.media_type === "film" ? <FilmIcon /> : <SeriesIcon />}
          </div>
        )}

        <span
          className={`absolute right-2 top-2 inline-flex items-center rounded-full px-2 py-1 text-[8px] uppercase tracking-[0.16em] ${
            result.media_type === "film"
              ? "bg-blue-400/20 text-blue-100"
              : "bg-emerald-400/20 text-emerald-100"
          }`}
        >
          {result.media_type === "film" ? "Film" : "Series"}
        </span>
      </div>
      <div className="mt-2 min-w-0">
        <p className="truncate text-[10px] font-medium text-white/84">{result.title}</p>
        <p className="truncate text-[9px] text-white/42">
          {[result.year, result.director].filter(Boolean).join(" · ") || "No details yet"}
        </p>
      </div>
    </button>
  )
}

export default function MountRushmoreEditor({
  initialSlots,
  onChange,
}: MountRushmoreEditorProps) {
  const [slots, setSlots] = useState<MountRushmoreSlot[]>(() => normalizeSlots(initialSlots))
  const [activePosition, setActivePosition] = useState<1 | 2 | 3 | 4 | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { query, setQuery, results, isLoading, clear } = useRushmoreSearch()

  useEffect(() => {
    setSlots(normalizeSlots(initialSlots))
  }, [initialSlots])

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
        clear()
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActivePosition(null)
        clear()
      }
    }

    document.addEventListener("mousedown", handleMouseDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousedown", handleMouseDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [activePosition, clear])

  function updateSlots(nextSlots: MountRushmoreSlot[]) {
    setSlots(nextSlots)
    onChange(nextSlots)
  }

  function handleSlotClick(position: 1 | 2 | 3 | 4) {
    setActivePosition(position)
    clear()
  }

  function handleSelect(result: RushmoreSearchResult) {
    if (activePosition === null) return
    console.log("[RUSHMORE] Slot selected:", activePosition, result.title)

    const nextSlots = slots.map((slot) =>
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

    updateSlots(nextSlots)
    clear()
    setActivePosition(null)
  }

  function handleRemove(position: 1 | 2 | 3 | 4) {
    const nextSlots = slots.map((slot) =>
      slot.position === position ? blankSlot(position) : slot
    )

    updateSlots(nextSlots)

    if (activePosition === position) {
      setActivePosition(null)
      clear()
    }
  }

  return (
    <div ref={rootRef}>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {slots.map((slot) => {
          const active = slot.position === activePosition
          const filled = slot.media_id !== null
          const posterUrl = getPosterUrl(slot.poster_path, "w154")

          return (
            <button
              key={slot.position}
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
                      <SlotPoster src={posterUrl} alt={slot.title || "Mount Rushmore title"} mediaType={slot.media_type} />
                    ) : (
                      <SlotFallback title={slot.title} year={slot.year} mediaType={slot.media_type} />
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

      {activePosition !== null ? (
        <div
          className="mt-3 rounded-[10px] border border-white/10 bg-white/[0.04] p-[14px]"
        >
          <p className="text-[11px] text-white/42">Picking for slot {activePosition}</p>

          <div className="mt-3 flex h-11 items-center gap-2 rounded-md border border-white/10 bg-[#0d0f18] px-3">
            <span className="text-white/35">
              <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search films and series…"
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/24"
            />
          </div>

          <div className="mt-4">
            {query.trim().length < 2 ? (
              <p className="py-7 text-center text-[11px] text-white/42">Start typing to search TMDB</p>
            ) : isLoading ? (
              <LoadingDots />
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
              <p className="py-7 text-center text-[11px] text-white/42">No results for &quot;{query}&quot;</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SlotPoster({
  src,
  alt,
  mediaType,
}: {
  src: string
  alt: string
  mediaType: "film" | "series" | null
}) {
  const [imgError, setImgError] = useState(false)

  if (imgError) {
    return <SlotFallback title={null} year={null} mediaType={mediaType} />
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 1024px) 45vw, 154px"
      className="object-cover"
      onError={() => setImgError(true)}
    />
  )
}

function SlotFallback({
  title,
  year,
  mediaType,
}: {
  title: string | null
  year: string | null
  mediaType: "film" | "series" | null
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%),linear-gradient(180deg,#131323_0%,#090912_100%)] px-3 text-center text-white/50">
      {mediaType === "series" ? <SeriesIcon /> : <FilmIcon />}
      {title ? <p className="line-clamp-2 text-[10px] text-white/70">{title}</p> : null}
      {year ? <p className="text-[9px] text-white/45">{year}</p> : null}
    </div>
  )
}
