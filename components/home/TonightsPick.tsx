"use client";

import PickCard, { type SavedItem } from "./PickCard";

interface TonightsPickProps {
  watchlistItems: SavedItem[];
}

export default function TonightsPick({ watchlistItems }: TonightsPickProps) {
  return (
    <section style={{ marginBottom: "40px" }}>
      <h2
        style={{
          fontSize: "15px",
          fontWeight: 600,
          color: "rgba(255,255,255,0.82)",
          margin: "0 0 16px",
        }}
      >
        Tonight&apos;s Picks
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
        }}
      >
        <PickCard title="Random Film" mode="explore" />
        <PickCard
          title="From Your Watchlist"
          mode="watchlist"
          watchlistItems={watchlistItems}
        />
      </div>
    </section>
  );
}
