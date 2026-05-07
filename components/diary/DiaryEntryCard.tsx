"use client";

import { useState } from "react";
import Link from "next/link";
import { getDiaryEntryKey, type DiaryMovie } from "../../lib/diary";
import type { MediaType } from "../../lib/media";
import { getMediaHref } from "../../lib/mediaRoutes";
import { getLayerDefs, hasReviewLayers, type ReviewLayers } from "../../types/diary";

interface DiaryEntryCardProps {
  movie: DiaryMovie & { isNew?: boolean };
  isConfirmingDelete: boolean;
  onEdit: () => void;
  onDeleteStart: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  formatDiaryDate: (date: string) => string;
}

function ReviewLayersDisplay({ layers, mediaType }: { layers: ReviewLayers; mediaType: MediaType }) {
  const [open, setOpen] = useState(false);
  const defs = getLayerDefs(mediaType);
  const filled = defs.filter(({ key }) => layers[key] !== null);

  return (
    <div style={{ marginTop: 10 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 5,
          color: "rgba(255,255,255,0.4)",
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        <span
          style={{
            display: "inline-block",
            transition: "transform 0.18s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            fontSize: 8,
          }}
        >
          ▼
        </span>
        Review layers ({filled.length})
      </button>

      {open ? (
        <div
          style={{
            marginTop: 8,
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "5px 16px",
          }}
        >
          {filled.map(({ key, label }) => (
            <div
              key={key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ color: "rgba(255,255,255,0.38)", fontSize: 11 }}>
                {label}
              </span>
              <span
                style={{
                  color: "#EF9F27",
                  fontSize: 11,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {layers[key]}/10
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function getMediaBadgeLabel(mediaType: MediaType) {
  if (mediaType === "movie") return "FILM";
  if (mediaType === "tv") return "SERIES";
  return "BOOK";
}

function getTvScopeBadge(movie: DiaryMovie) {
  if (movie.mediaType !== "tv") return null;

  if (movie.reviewScope === "season" && movie.seasonNumber) {
    return `S${movie.seasonNumber} review`;
  }

  if (movie.reviewScope === "episode" && movie.seasonNumber && movie.episodeNumber) {
    return `S${movie.seasonNumber} E${movie.episodeNumber} review`;
  }

  if (movie.reviewScope === "show") {
    return "Show review";
  }

  return null;
}

function getRatingNumber(rating: DiaryMovie["rating"] | string | null | undefined) {
  if (typeof rating === "number") {
    return rating;
  }

  if (typeof rating === "string" && rating.trim()) {
    const parsed = Number.parseFloat(rating);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

export default function DiaryEntryCard({
  movie,
  isConfirmingDelete,
  onEdit,
  onDeleteStart,
  onDeleteConfirm,
  onDeleteCancel,
  formatDiaryDate,
}: DiaryEntryCardProps) {
  const entryKey = getDiaryEntryKey(movie);
  const ratingNum = getRatingNumber(movie.rating);
  const reviewSnippet =
    movie.review.length > 120 ? `${movie.review.slice(0, 120)}…` : movie.review;

  return (
    <article
      key={entryKey}
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "0.5px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: 12,
        animation: movie.isNew ? "entrySlideIn 0.3s ease-out forwards" : undefined,
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Link
          href={getMediaHref({ id: movie.id, mediaType: movie.mediaType })}
          style={{ textDecoration: "none", color: "inherit", flexShrink: 0 }}
        >
          <div
            style={{
              width: 52,
              height: 78,
              borderRadius: 10,
              overflow: "hidden",
              background: "#1a1a2e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {movie.poster ? (
              <img
                src={movie.poster}
                alt={movie.title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            ) : (
              <span style={{ color: "#d4d4d8", fontWeight: 600 }}>
                {movie.title.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </Link>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <Link
                  href={getMediaHref({ id: movie.id, mediaType: movie.mediaType })}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <h2
                    style={{
                      margin: 0,
                      color: "rgba(255,255,255,0.85)",
                      fontSize: 14,
                      fontWeight: 600,
                      lineHeight: 1.3,
                    }}
                  >
                    {movie.title}
                  </h2>
                </Link>
                {movie.favourite ? (
                  <span style={{ color: "#fb7185", fontSize: 13 }}>♥</span>
                ) : null}
                {movie.rewatch ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 8px",
                      borderRadius: 999,
                      background: "rgba(245,158,11,0.14)",
                      border: "0.5px solid rgba(245,158,11,0.24)",
                      color: "#f8c16d",
                      fontSize: 10,
                    }}
                  >
                    <span>↺</span>
                    <span>Rewatch</span>
                  </span>
                ) : null}
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.05)",
                    border: "0.5px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.56)",
                    fontSize: 10,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {getMediaBadgeLabel(movie.mediaType)}
                </span>
                {getTvScopeBadge(movie) ? (
                  <span
                    style={{
                      padding: "3px 8px",
                      borderRadius: 999,
                      background: "rgba(20,184,166,0.12)",
                      border: "0.5px solid rgba(45,212,191,0.22)",
                      color: "#83f1de",
                      fontSize: 10,
                    }}
                  >
                    {getTvScopeBadge(movie)}
                  </span>
                ) : null}
              </div>

              {ratingNum !== null ? (
                <p style={{ margin: "8px 0 0", fontSize: 13, fontWeight: 400 }}>
                  <span style={{ color: "rgba(255,255,255,0.82)", fontVariantNumeric: "tabular-nums" }}>
                    {ratingNum.toFixed(1)}
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.28)", marginLeft: 3 }}>/ 10</span>
                </p>
              ) : null}

              {reviewSnippet ? (
                <div style={{ marginTop: 10 }}>
                  <p
                    style={{
                      margin: "0 0 6px",
                      fontSize: 10,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.34)",
                    }}
                  >
                    Your thoughts
                  </p>
                  <p
                    style={{
                      margin: 0,
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 13,
                      lineHeight: 1.5,
                      fontStyle: "italic",
                    }}
                  >
                    {reviewSnippet}
                  </p>
                </div>
              ) : null}

              {hasReviewLayers(movie.reviewLayers) ? (
                <ReviewLayersDisplay layers={movie.reviewLayers!} mediaType={movie.mediaType} />
              ) : null}

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                  color: "rgba(255,255,255,0.45)",
                  fontSize: 12,
                }}
              >
                <span>Watched {formatDiaryDate(movie.watchedDate)}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {isConfirmingDelete ? (
                <>
                  <button
                    type="button"
                    onClick={onDeleteConfirm}
                    style={{
                      padding: "7px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.12)",
                      color: "white",
                      fontSize: 10,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={onDeleteCancel}
                    style={{
                      padding: "7px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.04)",
                      color: "#e5e7eb",
                      fontSize: 10,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onEdit}
                    style={{
                      padding: "7px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.04)",
                      color: "#e5e7eb",
                      fontSize: 10,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={onDeleteStart}
                    style={{
                      padding: "7px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.04)",
                      color: "#f3caca",
                      fontSize: 10,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
