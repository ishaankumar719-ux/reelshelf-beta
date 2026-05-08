"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getWatchlist,
  getWatchlistHref,
  removeFromWatchlistByMedia,
  subscribeToWatchlist,
  type WatchlistEntry,
} from "../../lib/watchlist";

export default function ReadingShelfPage() {
  const [items, setItems] = useState<WatchlistEntry[]>([]);

  useEffect(() => {
    setItems(getWatchlist().filter((entry) => entry.mediaType === "book"));
    return subscribeToWatchlist(() => {
      setItems(getWatchlist().filter((entry) => entry.mediaType === "book"));
    });
  }, []);

  function handleRemove(id: string) {
    removeFromWatchlistByMedia(id, "book");
    setItems(getWatchlist().filter((entry) => entry.mediaType === "book"));
  }

  return (
    <main style={{ padding: "10px 0 40px" }}>
      <style>{`
        .reading-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        @media (min-width: 768px) {
          .reading-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 20px;
          }
        }

        @media (min-width: 1200px) {
          .reading-grid {
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
            My Reading Shelf
          </h1>

          <p
            style={{
              margin: "10px 0 0",
              color: "#9ca3af",
              fontSize: 14,
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            Saved books to read next
          </p>
        </div>

        <p
          style={{
            margin: 0,
            color: "#9ca3af",
            fontSize: 14,
            fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
          }}
        >
          {items.length} {items.length === 1 ? "book" : "books"} saved
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
            Your reading shelf is empty. Save books from any book detail page to
            keep them here.
          </p>
        </section>
      ) : (
        <div className="reading-grid">
          {items.map((book) => (
            <article
              key={book.id}
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
                href={getWatchlistHref(book.id, "book")}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    position: "relative",
                    aspectRatio: "2 / 3",
                    borderRadius: 16,
                    overflow: "hidden",
                    background:
                      "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 55%), linear-gradient(180deg, #151515 0%, #0b0b0b 100%)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    marginBottom: 12,
                  }}
                >
                  {book.poster ? (
                    <img
                      src={book.poster}
                      alt={book.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : null}
                </div>

                <h2
                  style={{
                    margin: "0 0 6px",
                    fontSize: 19,
                    lineHeight: 1.15,
                    letterSpacing: "-0.5px",
                    fontWeight: 500,
                    color: "white",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    minHeight: 44,
                  }}
                >
                  {book.title}
                </h2>

                <p
                  style={{
                    margin: "0 0 10px",
                    color: "#9ca3af",
                    fontSize: 13,
                    lineHeight: 1.5,
                    fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                    minHeight: 38,
                  }}
                >
                  {book.year || "—"}
                  {book.director ? ` · ${book.director}` : ""}
                </p>
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
                    fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                  }}
                >
                  Saved {new Date(book.addedAt).toLocaleDateString()}
                </p>

                <button
                  type="button"
                  onClick={() => handleRemove(book.id)}
                  style={{
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.03)",
                    color: "#e5e7eb",
                    borderRadius: 999,
                    padding: "6px 10px",
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
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
