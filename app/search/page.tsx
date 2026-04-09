"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { MediaCard } from "@/src/components/ui/MediaCard"
import type { SearchResult } from "@/src/hooks/useSearch"

type SearchTypeFilter = "all" | "film" | "series" | "book"

type SearchApiResponse = {
  films: SearchResult[]
  series: SearchResult[]
  books: SearchResult[]
}

function getTabHref(query: string, type: SearchTypeFilter) {
  const params = new URLSearchParams()
  if (query) params.set("q", query)
  if (type !== "all") params.set("type", type)
  return `/search?${params.toString()}`
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const query = searchParams.get("q")?.trim() || ""
  const type = (searchParams.get("type") || "all") as SearchTypeFilter
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setPage(1)
  }, [query, type])

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!query || query.length < 2) {
        setItems([])
        return
      }

      setIsLoading(true)

      const types = type === "all" ? "film,series,book" : type
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&types=${types}&page=${page}&limit=20`,
        { cache: "no-store" }
      )

      if (!response.ok) {
        if (!cancelled) {
          setItems([])
          setIsLoading(false)
        }
        return
      }

      const payload = (await response.json()) as SearchApiResponse
      const nextItems =
        type === "film"
          ? payload.films
          : type === "series"
            ? payload.series
            : type === "book"
              ? payload.books
              : [...payload.films, ...payload.series, ...payload.books]

      if (!cancelled) {
        setItems((current) => (page === 1 ? nextItems : [...current, ...nextItems]))
        setIsLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [page, query, type])

  const hasMore = useMemo(() => items.length > 0 && items.length % 20 === 0, [items.length])

  return (
    <section className="mx-auto max-w-[1320px] pb-16">
      <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,#0b0c12_0%,#07070c_100%)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:p-7">
        <h1 className="text-[18px] font-medium text-white/88">Results for &quot;{query || "…"}&quot;</h1>

        <div className="mt-4 flex flex-wrap gap-2">
          {([
            ["all", "All"],
            ["film", "Films"],
            ["series", "Series"],
            ["book", "Books"],
          ] as const).map(([value, label]) => {
            const active = type === value
            return (
              <Link
                key={value}
                href={getTabHref(query, value)}
                className={`rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.16em] no-underline ${
                  active
                    ? "border-white/18 bg-white/[0.08] text-white"
                    : "border-white/8 bg-white/[0.03] text-white/56"
                }`}
              >
                {label}
              </Link>
            )
          })}
        </div>

        {items.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {items.map((item, index) => (
              <MediaCard
                key={`${item.media_type}-${item.id}-${index}`}
                title={item.title}
                year={item.year || undefined}
                posterPath={item.poster_path}
                mediaType={item.media_type}
                size="md"
                href={item.href}
              />
            ))}
          </div>
        ) : !isLoading && query.length >= 2 ? (
          <p className="mt-8 text-sm text-white/48">
            Nothing found for &quot;{query}&quot;. Try a different search.
          </p>
        ) : null}

        {isLoading ? <p className="mt-6 text-sm text-white/46">Loading results…</p> : null}

        {hasMore && !isLoading ? (
          <button
            type="button"
            onClick={() => setPage((current) => current + 1)}
            className="mt-8 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 text-[11px] uppercase tracking-[0.16em] text-white/82"
          >
            Load more
          </button>
        ) : null}
      </div>
    </section>
  )
}
