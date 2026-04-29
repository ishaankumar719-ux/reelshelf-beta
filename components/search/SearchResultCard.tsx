"use client"

import { useMemo, useState } from "react"
import type { TMDBSearchResult } from "./SearchPageClient"

interface SearchResultCardProps {
  result: TMDBSearchResult
  variant: "grid" | "list"
  isLogged?: boolean
  onLog: () => void
  onNavigate: () => void
}

function getTitle(result: TMDBSearchResult) {
  return result.title ?? result.name ?? "Untitled"
}

function getYear(result: TMDBSearchResult) {
  return (result.release_date ?? result.first_air_date ?? "").slice(0, 4)
}

function getMediaTypeLabel(result: TMDBSearchResult) {
  return result.media_type === "tv" ? "Series" : "Film"
}

export default function SearchResultCard({
  result,
  variant,
  isLogged = false,
  onLog,
  onNavigate,
}: SearchResultCardProps) {
  const [hovered, setHovered] = useState(false)
  const [imgError, setImgError] = useState(false)
  const title = useMemo(() => getTitle(result), [result])
  const year = useMemo(() => getYear(result), [result])
  const mediaTypeLabel = useMemo(() => getMediaTypeLabel(result), [result])

  if (result.media_type === "person") {
    return null
  }

  if (variant === "grid") {
    return (
      <div
        onClick={onNavigate}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ cursor: "pointer" }}
      >
        <div
          style={{
            position: "relative",
            aspectRatio: "2/3",
            borderRadius: "10px",
            overflow: "hidden",
            background: "#111122",
          }}
        >
          {result.poster_path && !imgError ? (
            <img
              src={`https://image.tmdb.org/t/p/w342${result.poster_path}`}
              alt={title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(160deg, #1a1a2e 0%, #0d0d1a 100%)",
                color: "rgba(255,255,255,0.14)",
                fontSize: "34px",
                fontWeight: 600,
                userSelect: "none",
              }}
            >
              {title.charAt(0).toUpperCase()}
            </div>
          )}

          {isLogged ? (
            <div
              style={{
                position: "absolute",
                top: "6px",
                right: "6px",
                background: "rgba(29,158,117,0.9)",
                borderRadius: "4px",
                padding: "2px 6px",
                fontSize: "9px",
                fontWeight: 600,
                color: "white",
                letterSpacing: "0.04em",
              }}
            >
              ✓ Logged
            </div>
          ) : null}

          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.72)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              opacity: hovered ? 1 : 0,
              transition: "opacity 0.15s ease",
            }}
          >
            <button
              onClick={(event) => {
                event.stopPropagation()
                onLog()
              }}
              style={{
                padding: "8px 20px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 600,
                background: "#1D9E75",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              + Log
            </button>
            <p
              style={{
                fontSize: "11px",
                color: "rgba(255,255,255,0.5)",
                marginTop: "8px",
              }}
            >
              or tap to open
            </p>
          </div>
        </div>

        <div style={{ marginTop: "8px" }}>
          <p
            style={{
              fontSize: "12px",
              fontWeight: 500,
              color: "rgba(255,255,255,0.82)",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              lineHeight: 1.3,
              margin: 0,
            }}
          >
            {title}
          </p>
          <p
            style={{
              fontSize: "11px",
              color: "rgba(255,255,255,0.35)",
              marginTop: "3px",
            }}
          >
            {year}
            {result.vote_average && result.vote_average > 0
              ? ` · ★ ${result.vote_average.toFixed(1)}`
              : ""}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        alignItems: "center",
        padding: "10px",
        borderRadius: "10px",
        cursor: "pointer",
        transition: "background 0.12s",
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = "rgba(255,255,255,0.05)"
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = "transparent"
      }}
      onClick={onNavigate}
    >
      <div
        style={{
          width: "42px",
          height: "63px",
          borderRadius: "6px",
          overflow: "hidden",
          background: "#111122",
          flexShrink: 0,
        }}
      >
        {result.poster_path && !imgError ? (
          <img
            src={`https://image.tmdb.org/t/p/w92${result.poster_path}`}
            alt={title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(160deg, #1a1a2e 0%, #0d0d1a 100%)",
              color: "rgba(255,255,255,0.14)",
              fontSize: "16px",
              fontWeight: 600,
              userSelect: "none",
            }}
          >
            {title.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <p
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "rgba(255,255,255,0.88)",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </p>
          {isLogged ? (
            <span
              style={{
                fontSize: "10px",
                padding: "1px 6px",
                borderRadius: "3px",
                background: "rgba(29,158,117,0.2)",
                border: "0.5px solid rgba(29,158,117,0.4)",
                color: "rgba(100,210,170,0.9)",
                flexShrink: 0,
              }}
            >
              Logged
            </span>
          ) : null}
        </div>
        <p
          style={{
            fontSize: "12px",
            color: "rgba(255,255,255,0.35)",
            margin: "3px 0 0",
          }}
        >
          {mediaTypeLabel}
          {year ? ` · ${year}` : ""}
          {result.vote_average && result.vote_average > 0
            ? ` · ★ ${result.vote_average.toFixed(1)}`
            : ""}
        </p>
      </div>

      <button
        onClick={(event) => {
          event.stopPropagation()
          onLog()
        }}
        style={{
          padding: "6px 14px",
          borderRadius: "7px",
          fontSize: "12px",
          fontWeight: 500,
          background: "rgba(29,158,117,0.15)",
          border: "0.5px solid rgba(29,158,117,0.4)",
          color: "rgba(100,210,170,0.9)",
          cursor: "pointer",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        + Log
      </button>
    </div>
  )
}
