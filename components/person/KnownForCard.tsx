"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface KnownForCardProps {
  id: number;
  title: string;
  poster_path: string | null;
  year: string;
  character?: string;
  mediaType: "movie" | "tv";
}

export default function KnownForCard({
  id,
  title,
  poster_path,
  year,
  character,
  mediaType,
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
        width: 110,
        flexShrink: 0,
        cursor: "pointer",
        transform: "scale(1)",
        transition: "transform 0.15s ease",
      }}
      className="group"
    >
      <div
        style={{
          aspectRatio: "2 / 3",
          borderRadius: 8,
          overflow: "hidden",
          background: "#111122",
        }}
        className="transition duration-150 ease-out group-hover:scale-[1.04]"
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
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            {title.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <p
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: "rgba(255,255,255,0.78)",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          margin: "6px 0 0",
          lineHeight: 1.35,
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.35)",
          margin: "2px 0 0",
        }}
      >
        {year}
      </p>
      {character ? (
        <p
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.3)",
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
