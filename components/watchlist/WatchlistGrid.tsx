"use client";

import WatchlistCard from "./WatchlistCard";

export interface SavedItem {
  id: string;
  user_id: string;
  list_type: "watchlist" | "reading_shelf";
  media_id: string;
  media_type: "movie" | "tv" | "book";
  title: string;
  poster: string | null;
  year: number;
  creator: string | null;
  genres: string[];
  runtime: number | null;
  vote_average: number | null;
  added_at: string;
  created_at?: string;
  updated_at?: string;
}

interface WatchlistGridProps {
  items: SavedItem[];
  userId: string | null;
  onRemoved: (id: string) => void;
  onRestored: (item: SavedItem) => void;
}

export default function WatchlistGrid({
  items,
  userId,
  onRemoved,
  onRestored,
}: WatchlistGridProps) {
  if (items.length === 1) {
    const [singleItem] = items;

    return (
      <div style={{ display: "flex", justifyContent: "flex-start" }}>
        <div style={{ width: "180px" }}>
          <WatchlistCard
            item={singleItem}
            userId={userId}
            onRemoved={onRemoved}
            onRestored={onRestored}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: "20px",
      }}
    >
      {items.map((item) => (
        <WatchlistCard
          key={item.id}
          item={item}
          userId={userId}
          onRemoved={onRemoved}
          onRestored={onRestored}
        />
      ))}
    </div>
  );
}
