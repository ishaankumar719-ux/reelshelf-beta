"use client";

import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [imgError, setImgError] = useState(false);
  const showPoster = Boolean(poster_path) && !imgError;

  return (
    <div
      onClick={() =>
        router.push(mediaType === "tv" ? `/series/${id}` : `/films/${id}`)
      }
      style={{
        width: 144,
        flexShrink: 0,
        cursor: "pointer",
      }}
      className="known-for-card-hover"
    >
      {/* Poster */}
      <div
        style={{
          position: "relative",
          aspectRatio: "2 / 3",
          borderRadius: 12,
          overflow: "hidden",
          background: "linear-gradient(160deg, #151525, #1a1a2e)",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
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
              color: "rgba(255,255,255,0.12)",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            {title.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Media type badge */}
        {showMediaBadge ? (
          <div
            style={{
              position: "absolute",
              top: 7,
              right: 7,
              padding: "2px 7px",
              borderRadius: 999,
              background: "rgba(0,0,0,0.72)",
              backdropFilter: "blur(6px)",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color:
                mediaType === "tv"
                  ? "rgba(139,195,255,0.9)"
                  : "rgba(255,255,255,0.65)",
              border: "0.5px solid rgba(255,255,255,0.15)",
            }}
          >
            {mediaType === "tv" ? "Series" : "Film"}
          </div>
        ) : null}

        {/* Rating badge */}
        {typeof vote_average === "number" && vote_average > 0 ? (
          <div
            style={{
              position: "absolute",
              bottom: 7,
              left: 7,
              padding: "2px 7px",
              borderRadius: 999,
              background: "rgba(0,0,0,0.72)",
              backdropFilter: "blur(6px)",
              fontSize: 10,
              fontWeight: 600,
              color: "rgba(250,199,117,0.9)",
              border: "0.5px solid rgba(250,199,117,0.2)",
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
          color: "rgba(255,255,255,0.82)",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          margin: "8px 0 0",
          lineHeight: 1.4,
        }}
      >
        {title}
      </p>

      {/* Year */}
      {year ? (
        <p
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.32)",
            margin: "3px 0 0",
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
            color: "rgba(255,255,255,0.25)",
            fontStyle: "italic",
            margin: "2px 0 0",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {character}
        </p>
      ) : null}
    </div>
  );
}
