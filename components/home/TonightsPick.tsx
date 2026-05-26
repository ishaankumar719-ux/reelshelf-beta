"use client";

import PickCard, { type SavedItem } from "./PickCard";

interface TonightsPickProps {
  watchlistItems: SavedItem[];
}

export default function TonightsPick({ watchlistItems }: TonightsPickProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: "12px",
      }}
    >
      <PickCard title="Random Film" mode="explore" />
      <PickCard
        title="From Your Watchlist"
        mode="watchlist"
        watchlistItems={watchlistItems}
      />
    </div>
  );
}
