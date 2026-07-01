"use client";

import WatchlistCard from "./WatchlistCard";

const GRID_STYLE = `
  .wl-grid {
    display: grid;
    gap: 20px;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
  @media (max-width: 640px) {
    .wl-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
  }
  @media (min-width: 641px) and (max-width: 900px) {
    .wl-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
  }
`;

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
  return (
    <>
      <style>{GRID_STYLE}</style>
      <div className="wl-grid">
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
    </>
  );
}
