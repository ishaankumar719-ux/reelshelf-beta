"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { createClient } from "@/lib/supabase/client"
import { toAbsolutePosterUrl } from "@/lib/supabase/lists"
import type { ListMediaType } from "@/lib/supabase/lists"

// ── Types ─────────────────────────────────────────────────────────────────────

interface SearchHit {
  media_type: ListMediaType
  media_id: string
  title: string
  poster_url: string | null
  year: string | null
}

// Shape the search API actually returns
interface ApiResult {
  id: number | string
  media_type?: string
  title: string
  year?: string | null
  poster_path?: string | null
  author?: string | null
  href?: string
}

interface SearchApiResponse {
  films?:  ApiResult[]
  series?: ApiResult[]
  books?:  ApiResult[]
}

// Map the API's "film" / "series" strings → DB-legal values
function toMediaType(apiType: string): ListMediaType {
  if (apiType === "film")   return "movie"
  if (apiType === "series") return "tv"
  return "book"
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface MediaSearchModalProps {
  listId: string
  nextRank: number
  existingMediaIds?: string[]
  onClose: () => void
}

export default function MediaSearchModal({
  listId,
  nextRank,
  existingMediaIds = [],
  onClose,
}: MediaSearchModalProps) {
  const [mounted,     setMounted]     = useState(false)
  const [query,       setQuery]       = useState("")
  const [results,     setResults]     = useState<SearchHit[]>([])
  const [searching,   setSearching]   = useState(false)
  const [adding,      setAdding]      = useState<string | null>(null) // media_id being added
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setMounted(true)
    inputRef.current?.focus()

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  // Debounced search
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) { setResults([]); setSearching(false); return }

    const timer = setTimeout(async () => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setSearching(true)

      try {
        const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}&types=film,series,book&limit=8`, { signal: ctrl.signal })
        const data = await res.json() as SearchApiResponse

        // Merge all three arrays into a unified hit list
        const hits: SearchHit[] = [
          ...(data.films  ?? []).map((r) => ({
            media_type: toMediaType("film"),
            media_id:   String(r.id),
            title:      r.title,
            poster_url: toAbsolutePosterUrl(r.poster_path),
            year:       r.year ?? null,
          })),
          ...(data.series ?? []).map((r) => ({
            media_type: toMediaType("series"),
            media_id:   String(r.id),
            title:      r.title,
            poster_url: toAbsolutePosterUrl(r.poster_path),
            year:       r.year ?? null,
          })),
          ...(data.books  ?? []).map((r) => ({
            media_type: toMediaType("book"),
            media_id:   String(r.id),
            title:      r.title,
            poster_url: toAbsolutePosterUrl(r.poster_path),
            year:       r.year ?? null,
          })),
        ]

        if (!ctrl.signal.aborted) setResults(hits)
      } catch {
        // Aborted or network error — silently ignored
      } finally {
        if (!abortRef.current?.signal.aborted) setSearching(false)
      }
    }, 280)

    return () => clearTimeout(timer)
  }, [query])

  async function addItem(hit: SearchHit) {
    if (existingMediaIds.includes(hit.media_id)) return
    const supabase = createClient()
    if (!supabase) return

    setAdding(hit.media_id)

    const { error } = await supabase.from("user_list_items").insert([{
      list_id:    listId,
      media_type: hit.media_type,
      media_id:   hit.media_id,
      title:      hit.title,
      poster_url: hit.poster_url,
      year:       hit.year,
      rank_order: nextRank,
    }])

    setAdding(null)
    if (!error) { onClose(); return }

    // Duplicate key — item already in list
    if (error.code === "23505") {
      alert("This item is already in the list.")
    }
  }

  if (!mounted) return null

  const TYPE_LABEL: Record<ListMediaType, string> = { movie: "Film", tv: "TV", book: "Book" }
  const TYPE_COLOR: Record<ListMediaType, string> = {
    movie: "text-blue-400",
    tv:    "text-purple-400",
    book:  "text-emerald-400",
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-end justify-center md:items-start bg-black/75 backdrop-blur-md"
      onPointerDown={onClose}
    >
      {/* Panel */}
      <div
        className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-900 shadow-2xl flex flex-col
                   rounded-t-2xl h-[88dvh]
                   md:rounded-2xl md:h-auto md:max-h-[72vh] md:mt-[8vh] md:mx-4"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-3 md:hidden">
          <div className="w-9 h-1 rounded-full bg-zinc-700" />
        </div>

        {/* Search bar */}
        <div className="px-4 py-3 border-b border-zinc-900 flex items-center gap-3 bg-zinc-950 sticky top-0">
          <span className="text-zinc-600 text-base shrink-0">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search films, TV shows, books…"
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-zinc-600"
          />
          {query.length > 0 ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-zinc-600 hover:text-white transition-colors text-sm shrink-0"
            >
              {searching ? "…" : "✕"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-600 hover:text-white transition-colors text-xs font-medium shrink-0 px-2"
            >
              Close
            </button>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-1.5">
          {searching && query.trim().length >= 2 && (
            <p className="text-center py-8 text-xs text-zinc-600 animate-pulse tracking-wide">
              Searching…
            </p>
          )}

          {!searching && results.length === 0 && query.trim().length >= 2 && (
            <p className="text-center py-8 text-xs text-zinc-700 italic">
              No results found.
            </p>
          )}

          {!searching && query.trim().length < 2 && (
            <p className="text-center py-10 text-xs text-zinc-700">
              Type at least 2 characters to search.
            </p>
          )}

          {results.map((hit) => {
            const alreadyAdded = existingMediaIds.includes(hit.media_id)
            const isAdding     = adding === hit.media_id

            return (
              <div
                key={`${hit.media_type}-${hit.media_id}`}
                className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                  alreadyAdded
                    ? "border-zinc-900 bg-zinc-950/40 opacity-50"
                    : "border-zinc-900/60 bg-zinc-900/30 hover:border-zinc-800 hover:bg-zinc-900/60 cursor-pointer"
                }`}
              >
                {/* Poster */}
                <div className="w-9 h-14 bg-zinc-900 rounded overflow-hidden shrink-0">
                  {hit.poster_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={hit.poster_url}
                      alt=""
                      className="w-full h-full object-cover block"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm opacity-20">🎬</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-white truncate">{hit.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {hit.year ? `${hit.year} · ` : ""}
                    <span className={`font-medium ${TYPE_COLOR[hit.media_type]}`}>
                      {TYPE_LABEL[hit.media_type]}
                    </span>
                  </p>
                </div>

                {/* Add button */}
                <button
                  type="button"
                  disabled={alreadyAdded || isAdding}
                  onClick={() => void addItem(hit)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                    alreadyAdded
                      ? "bg-zinc-800 text-zinc-600 cursor-default"
                      : "bg-white text-black hover:bg-zinc-200"
                  }`}
                >
                  {alreadyAdded ? "Added" : isAdding ? "…" : "Add"}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}
