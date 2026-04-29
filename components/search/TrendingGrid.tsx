"use client"

import SearchResultCard from "./SearchResultCard"
import type { TMDBSearchResult } from "./SearchPageClient"

interface TrendingGridProps {
  items: TMDBSearchResult[]
  isLogged: (result: TMDBSearchResult) => boolean
  onLog: (result: TMDBSearchResult) => void
  onNavigate: (result: TMDBSearchResult) => void
}

export default function TrendingGrid({
  items,
  isLogged,
  onLog,
  onNavigate,
}: TrendingGridProps) {
  const visibleItems = items.filter((item) => item.media_type !== "person")

  return (
    <section>
      <p
        style={{
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.3)",
          marginBottom: "16px",
        }}
      >
        Trending this week
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
          gap: "16px",
        }}
      >
        {visibleItems.map((item) => (
          <SearchResultCard
            key={`${item.media_type}-${item.id}`}
            result={item}
            variant="grid"
            isLogged={isLogged(item)}
            onLog={() => onLog(item)}
            onNavigate={() => onNavigate(item)}
          />
        ))}
      </div>
    </section>
  )
}
