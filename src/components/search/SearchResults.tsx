"use client"

import Link from "next/link"
import SearchResult from "@/src/components/search/SearchResult"
import type { SearchResult as SearchResultType } from "@/src/hooks/useSearch"

interface SearchResultsProps {
  results: SearchResultType[]
  recentResults: SearchResultType[]
  recentQueries: string[]
  isLoading: boolean
  query: string
  onSelect: (result: SearchResultType) => void
  onQuerySelect: (q: string) => void
  variant: "dropdown" | "overlay"
  activeIndex?: number
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-2.5 pb-2 pt-2 text-[10px] uppercase tracking-[0.06em] text-white/34">{children}</p>
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1 px-2.5 py-4 text-white/48">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/45"
          style={{ animationDelay: `${index * 120}ms` }}
        />
      ))}
    </div>
  )
}

export default function SearchResults({
  results,
  recentResults,
  recentQueries,
  isLoading,
  query,
  onSelect,
  onQuerySelect,
  variant,
  activeIndex = -1,
}: SearchResultsProps) {
  const films = results.filter((item) => item.media_type === "film")
  const series = results.filter((item) => item.media_type === "series")
  const books = results.filter((item) => item.media_type === "book")
  const people = results.filter((item) => item.media_type === "user")
  const hasHistory = recentResults.length > 0 || recentQueries.length > 0
  const showNoResults = query.trim().length >= 2 && !isLoading && results.length === 0
  let runningIndex = -1

  const containerClass =
    variant === "dropdown"
      ? "w-full overflow-y-auto rounded-lg border border-white/12 bg-[#141428] p-2 shadow-[0_20px_50px_rgba(0,0,0,0.38)]"
      : "flex-1 overflow-y-auto bg-[#07070d] px-4 pb-8 pt-4"

  return (
    <div className={containerClass}>
      {!query.trim() ? (
        hasHistory ? (
          <div className="space-y-4">
            {recentQueries.length > 0 ? (
              <div>
                <SectionLabel>Recent searches</SectionLabel>
                <div className="flex flex-wrap gap-2 px-2.5">
                  {recentQueries.map((recentQuery) => (
                    <button
                      key={recentQuery}
                      type="button"
                      onClick={() => onQuerySelect(recentQuery)}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] uppercase tracking-[0.04em] text-white/72"
                    >
                      {recentQuery}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {recentResults.length > 0 ? (
              <div>
                <SectionLabel>Recent picks</SectionLabel>
                <div className="space-y-1">
                  {recentResults.map((result) => {
                    runningIndex += 1
                    return (
                      <SearchResult
                        key={`${result.media_type}-${result.id}-${runningIndex}`}
                        id={`global-search-option-${runningIndex}`}
                        result={result}
                        onSelect={() => onSelect(result)}
                        active={activeIndex === runningIndex}
                        mobileFriendly={variant === "overlay"}
                      />
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : null
      ) : isLoading ? (
        <LoadingDots />
      ) : results.length > 0 ? (
        <div>
          {films.length > 0 ? (
            <div>
              <SectionLabel>Films</SectionLabel>
              <div className="space-y-1">
                {films.map((result) => {
                  runningIndex += 1
                  return (
                    <SearchResult
                      key={`film-${result.id}`}
                      id={`global-search-option-${runningIndex}`}
                      result={result}
                      onSelect={() => onSelect(result)}
                      active={activeIndex === runningIndex}
                      mobileFriendly={variant === "overlay"}
                    />
                  )
                })}
              </div>
            </div>
          ) : null}

          {series.length > 0 ? (
            <div className="mt-3">
              <SectionLabel>Series</SectionLabel>
              <div className="space-y-1">
                {series.map((result) => {
                  runningIndex += 1
                  return (
                    <SearchResult
                      key={`series-${result.id}`}
                      id={`global-search-option-${runningIndex}`}
                      result={result}
                      onSelect={() => onSelect(result)}
                      active={activeIndex === runningIndex}
                      mobileFriendly={variant === "overlay"}
                    />
                  )
                })}
              </div>
            </div>
          ) : null}

          {books.length > 0 ? (
            <div className="mt-3">
              <SectionLabel>Books</SectionLabel>
              <div className="space-y-1">
                {books.map((result) => {
                  runningIndex += 1
                  return (
                    <SearchResult
                      key={`book-${result.id}`}
                      id={`global-search-option-${runningIndex}`}
                      result={result}
                      onSelect={() => onSelect(result)}
                      active={activeIndex === runningIndex}
                      mobileFriendly={variant === "overlay"}
                    />
                  )
                })}
              </div>
            </div>
          ) : null}

          {people.length > 0 ? (
            <div className="mt-3">
              <SectionLabel>People</SectionLabel>
              <div className="space-y-1">
                {people.map((result) => {
                  runningIndex += 1
                  return (
                    <SearchResult
                      key={`user-${result.id}`}
                      id={`global-search-option-${runningIndex}`}
                      result={result}
                      onSelect={() => onSelect(result)}
                      active={activeIndex === runningIndex}
                      mobileFriendly={variant === "overlay"}
                    />
                  )
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-4 border-t border-white/8 px-2.5 pt-4">
            <Link
              href={`/search?q=${encodeURIComponent(query)}`}
              className="text-[12px] text-white/62 underline decoration-white/20 underline-offset-4"
            >
              See all results for &quot;{query}&quot;
            </Link>
          </div>
        </div>
      ) : showNoResults ? (
        <p className="px-2.5 py-4 text-sm text-white/48">No results for &quot;{query}&quot;</p>
      ) : null}
    </div>
  )
}
