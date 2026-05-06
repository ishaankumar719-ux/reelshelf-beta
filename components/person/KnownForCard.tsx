"use client";

import Link from "next/link";
import { useState } from "react";

interface KnownForCardProps {
  id: number;
  title: string;
  poster_path: string | null;
  year: string;
  vote_average?: number;
  character?: string;
  mediaType: "movie" | "tv";
  showMediaBadge?: boolean;
}

export default function KnownForCard({
  id,
  title,
  poster_path,
  year,
  vote_average,
  character,
  mediaType,
  showMediaBadge = false,
}: KnownForCardProps) {
  const [imgError, setImgError] = useState(false);
  const showPoster = Boolean(poster_path) && !imgError;
  const href = mediaType === "tv" ? `/series/${id}` : `/films/${id}`;

  return (
    <Link
      href={href}
      style={{
        display: "block",
        width: 144,
        minWidth: 144,
        textDecoration: "none",
        color: "inherit",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Poster */}
      <div
        style={{
          position: "relative",
          aspectRatio: "2 / 3",
          borderRadius: 14,
          overflow: "hidden",
          background: "linear-gradient(160deg, #14142a, #1c1c36)",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
        }}
      >
        {showPoster ? (
          <img
            src={`https://image.tmdb.org/t/p/w342${poster_path}`}
            alt={title}
            loading="lazy"
            onError={() => setImgError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.1)",
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            {title.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Media type badge — top-left */}
        {showMediaBadge ? (
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              padding: "3px 8px",
              borderRadius: 999,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              ...(mediaType === "tv"
                ? {
                    background: "rgba(100,160,255,0.15)",
                    border: "0.5px solid rgba(100,160,255,0.32)",
                    color: "rgba(140,190,255,0.95)",
                  }
                : {
                    background: "rgba(29,158,117,0.14)",
                    border: "0.5px solid rgba(29,158,117,0.32)",
                    color: "rgba(29,158,117,0.95)",
                  }),
            }}
          >
            {mediaType === "tv" ? "Series" : "Film"}
          </div>
        ) : null}

        {/* Rating badge — bottom-right (clear of media badge) */}
        {typeof vote_average === "number" && vote_average > 0 ? (
          <div
            style={{
              position: "absolute",
              bottom: 8,
              right: 8,
              padding: "3px 8px",
              borderRadius: 999,
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(250,199,117,0.95)",
              border: "0.5px solid rgba(250,199,117,0.22)",
              lineHeight: 1,
            }}
          >
            ★ {vote_average.toFixed(1)}
          </div>
        ) : null}
      </div>

      {/* Title */}
      <p
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "rgba(255,255,255,0.84)",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          margin: "9px 0 0",
          lineHeight: 1.42,
          letterSpacing: "0.005em",
        }}
      >
        {title}
      </p>

      {/* Year */}
      {year ? (
        <p
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.3)",
            margin: "3px 0 0",
            lineHeight: 1,
          }}
        >
          {year}
        </p>
      ) : null}

      {/* Character */}
      {character ? (
        <p
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.24)",
            fontStyle: "italic",
            margin: "3px 0 0",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            lineHeight: 1,
          }}
        >
          {character}
        </p>
      ) : null}
    </Link>
  );
}
