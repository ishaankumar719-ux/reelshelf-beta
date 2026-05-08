"use client";

import { useEffect, useState } from "react";
import {
  addToWatchlist,
  isInWatchlist,
  subscribeToWatchlist,
} from "../lib/watchlist";
import type { MediaType } from "../lib/media";

type AddToWatchlistButtonProps = {
  movie: {
    id: string;
    mediaType?: MediaType;
    title: string;
    year: number;
    poster?: string;
    director?: string;
    genres?: string[];
    runtime?: number;
    voteAverage?: number;
  };
};

export default function AddToWatchlistButton({
  movie,
}: AddToWatchlistButtonProps) {
  const [added, setAdded] = useState(false);
  const isBook = (movie.mediaType || "movie") === "book";

  useEffect(() => {
    setAdded(isInWatchlist(movie.id, movie.mediaType || "movie"));
  }, [movie.id, movie.mediaType]);

  useEffect(() => {
    return subscribeToWatchlist(() => {
      setAdded(isInWatchlist(movie.id, movie.mediaType || "movie"));
    });
  }, [movie.id, movie.mediaType]);

  function handleAdd() {
    addToWatchlist({
      ...movie,
      mediaType: movie.mediaType || "movie",
    });
    setAdded(true);
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={added}
      style={{
        background: added ? "rgba(255,255,255,0.1)" : "transparent",
        color: "white",
        border: added
          ? "1px solid rgba(255,255,255,0.2)"
          : "1px solid rgba(255,255,255,0.14)",
        borderRadius: 999,
        padding: "12px 18px",
        fontSize: 14,
        cursor: added ? "default" : "pointer",
        fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
        transition: "background 0.2s ease, border-color 0.2s ease",
      }}
    >
      {added
        ? isBook
          ? "In Reading Shelf"
          : "In Watchlist"
        : isBook
          ? "Add to Reading Shelf"
          : "Add to Watchlist"}
    </button>
  );
}
