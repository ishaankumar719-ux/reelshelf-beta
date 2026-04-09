"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MediaCard } from "../../src/components/ui/MediaCard";
import {
  getWatchlist,
  getWatchlistHref,
  removeFromWatchlistByMedia,
  subscribeToWatchlist,
  type WatchlistEntry,
} from "../../lib/watchlist";

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistEntry[]>([]);

  useEffect(() => {
    setItems(getWatchlist().filter((entry) => entry.mediaType !== "book"));
    return subscribeToWatchlist(() => {
      setItems(getWatchlist().filter((entry) => entry.mediaType !== "book"));
    });
  }, []);

  function handleRemove(id: string, mediaType: WatchlistEntry["mediaType"]) {
    removeFromWatchlistByMedia(id, mediaType);
    setItems(getWatchlist().filter((entry) => entry.mediaType !== "book"));
  }

  return (
    <main style={{ padding: "10px 0 40px" }}>
      <style>{`
        .watchlist-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        @media (min-width: 768px) {
          .watchlist-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 20px;
          }
        }

        @media (min-width: 1200px) {
          .watchlist-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }
      `}</style>

      <section
        style={{
          marginBottom: 28,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 48,
              lineHeight: 1.02,
              letterSpacing: "-1.6px",
              fontWeight: 500,
            }}
          >
            My Watchlist
          </h1>

          <p
            style={{
              margin: "10px 0 0",
              color: "#9ca3af",
              fontSize: 14,
              fontFamily: "Arial, sans-serif",
            }}
          >
            Saved titles to watch next
          </p>
        </div>

        <p
          style={{
            margin: 0,
            color: "#9ca3af",
            fontSize: 14,
            fontFamily: "Arial, sans-serif",
          }}
        >
          {items.length} {items.length === 1 ? "title" : "titles"} saved
        </p>
      </section>

      {items.length === 0 ? (
        <section
          style={{
            borderRadius: 24,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(18,18,18,0.96) 0%, rgba(10,10,10,0.96) 100%)",
            padding: 28,
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#d1d5db",
              fontSize: 18,
              lineHeight: 1.6,
            }}
          >
            Your watchlist is empty. Save films from any movie detail page to
            keep them here, and series from any series page to keep them in the
            same queue.
          </p>
        </section>
      ) : (
        <div className="watchlist-grid">
          {items.map((movie) => (
            <article
              key={movie.id}
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 22,
                padding: 14,
                background:
                  "linear-gradient(180deg, rgba(18,18,18,0.98) 0%, rgba(10,10,10,0.95) 100%)",
                boxShadow: "0 18px 40px rgba(0,0,0,0.24)",
              }}
            >
              <Link
                href={getWatchlistHref(movie.id, movie.mediaType)}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <MediaCard
                  title={movie.title}
                  year={movie.year || "—"}
                  posterUrl={movie.poster}
                  mediaType={movie.mediaType === "movie" ? "film" : "series"}
                  size="md"
                />
              </Link>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#7f7f7f",
                    fontSize: 11,
                    letterSpacing: "0.02em",
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  Saved {new Date(movie.addedAt).toLocaleDateString()}
                </p>

                <button
                  type="button"
                  onClick={() => handleRemove(movie.id, movie.mediaType)}
                  style={{
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.03)",
                    color: "#e5e7eb",
                    borderRadius: 999,
                    padding: "6px 10px",
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "Arial, sans-serif",
                    lineHeight: 1,
                  }}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
