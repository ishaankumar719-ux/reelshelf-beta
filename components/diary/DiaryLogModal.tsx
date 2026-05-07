"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createClient as createSupabaseClient } from "../../lib/supabase/client";
import { saveDiaryEntryLocally, type DiaryMovie } from "../../lib/diary";
import { DIARY_SELECT } from "../../lib/queries";
import { computeStreak } from "../../lib/streak";
import type { DiaryEntry, LogMediaInput, ReviewLayers } from "../../types/diary";
import { EMPTY_REVIEW_LAYERS as EMPTY_LAYERS } from "../../types/diary";

interface DiaryLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (entry: DiaryEntry, streakDays: number) => void;
  media: LogMediaInput;
}

function todayIso() {
  return new Date().toISOString().split("T")[0] ?? "";
}

function slugifyTitle(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function getMediaLabel(mediaType: LogMediaInput["media_type"]) {
  if (mediaType === "movie") return "Film";
  if (mediaType === "tv") return "Series";
  return "Book";
}

function getMediaBadgeStyles(mediaType: LogMediaInput["media_type"]) {
  if (mediaType === "movie") {
    return {
      background: "rgba(59,130,246,0.18)",
      border: "0.5px solid rgba(96,165,250,0.35)",
      color: "rgba(219,234,254,0.92)",
    };
  }

  if (mediaType === "tv") {
    return {
      background: "rgba(20,184,166,0.16)",
      border: "0.5px solid rgba(45,212,191,0.35)",
      color: "rgba(204,251,241,0.92)",
    };
  }

  return {
    background: "rgba(168,85,247,0.16)",
    border: "0.5px solid rgba(192,132,252,0.35)",
    color: "rgba(245,243,255,0.92)",
  };
}

function Divider() {
  return (
    <div
      style={{
        marginTop: 18,
        paddingTop: 18,
        borderTop: "1px solid rgba(255,255,255,0.05)",
      }}
    />
  );
}

function ToggleChip({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        border: "none",
        background: active ? "rgba(255,255,255,0.1)" : "transparent",
        borderRadius: 20,
        color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.35)",
        padding: active ? "4px 10px" : "4px 2px",
        fontSize: 12,
        cursor: "pointer",
        transition: "background 0.15s ease, color 0.15s ease",
      }}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function StarIcon({
  fillPercent,
  highlighted,
}: {
  fillPercent: number;
  highlighted: boolean;
}) {
  const gradientId = useMemo(
    () => `star-fill-${Math.random().toString(36).slice(2, 9)}`,
    []
  );

  return (
    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset={`${fillPercent}%`} stopColor="#EF9F27" />
          <stop offset={`${fillPercent}%`} stopColor="rgba(255,255,255,0.18)" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.6 14.84 8.36l6.36.92-4.6 4.48 1.08 6.33L12 17.08l-5.68 2.99 1.08-6.33-4.6-4.48 6.36-.92L12 2.6Z"
        fill={`url(#${gradientId})`}
        stroke={highlighted ? "#EF9F27" : "rgba(255,255,255,0.08)"}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RatingStars({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (nextValue: number | null) => void;
}) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const activeValue = hoverValue ?? value;

  return (
    <div>
      <style>{`
        @keyframes reelshelf-star-pulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
        }
      `}</style>
      <div style={{ display: "flex", gap: 6 }}>
        {Array.from({ length: 5 }, (_, index) => {
          const starNumber = index + 1;
          const leftValue = starNumber * 2 - 1;
          const rightValue = starNumber * 2;
          const fillPercent = Math.max(
            0,
            Math.min(100, ((activeValue ?? 0) - (starNumber - 1) * 2) * 50)
          );

          return (
            <div
              key={starNumber}
              style={{
                position: "relative",
                width: 28,
                height: 28,
                filter:
                  activeValue !== null && fillPercent > 0
                    ? "drop-shadow(0 0 8px rgba(239,159,39,0.3))"
                    : "none",
                animation:
                  activeValue === null && starNumber === 1
                    ? "reelshelf-star-pulse 1.6s ease-in-out infinite"
                    : "none",
              }}
              onMouseLeave={() => setHoverValue(null)}
            >
              <StarIcon fillPercent={fillPercent} highlighted={fillPercent > 0} />
              <button
                type="button"
                aria-label={`Set rating to ${leftValue.toFixed(1).replace(".0", "")} / 10`}
                onMouseEnter={() => setHoverValue(leftValue)}
                onClick={() => onChange(value === leftValue ? null : leftValue)}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "50%",
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  cursor: "pointer",
                }}
              />
              <button
                type="button"
                aria-label={`Set rating to ${rightValue.toFixed(1).replace(".0", "")} / 10`}
                onMouseEnter={() => setHoverValue(rightValue)}
                onClick={() => onChange(value === rightValue ? null : rightValue)}
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: "50%",
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  cursor: "pointer",
                }}
              />
            </div>
          );
        })}
      </div>
      <p
        style={{
          margin: "10px 0 0",
          fontSize: 12,
          color:
            typeof value === "number"
              ? "rgba(255,255,255,0.5)"
              : "rgba(255,255,255,0.3)",
        }}
      >
        {typeof value === "number" ? `${value.toFixed(1)} / 10` : "Tap to rate"}
      </p>
    </div>
  );
}

// ─── Review layers ────────────────────────────────────────────────────────────

type LayerKey = keyof ReviewLayers;

const LAYER_DEFS: { key: LayerKey; label: string }[] = [
  { key: "score_rating", label: "Score / Soundtrack" },
  { key: "cinematography_rating", label: "Cinematography" },
  { key: "writing_rating", label: "Writing" },
  { key: "performances_rating", label: "Performances" },
  { key: "direction_rating", label: "Direction" },
  { key: "rewatchability_rating", label: "Rewatchability" },
  { key: "emotional_impact_rating", label: "Emotional Impact" },
  { key: "entertainment_rating", label: "Entertainment" },
];

function ReviewLayerRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "5px 0",
      }}
    >
      <span
        style={{
          minWidth: 134,
          fontSize: 12,
          color: "rgba(255,255,255,0.46)",
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", gap: 3, flexWrap: "nowrap" }}>
        {Array.from({ length: 10 }, (_, i) => {
          const n = i + 1;
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(active ? null : n)}
              style={{
                width: 22,
                height: 20,
                borderRadius: 4,
                border: active
                  ? "0.5px solid rgba(29,158,117,0.6)"
                  : "0.5px solid rgba(255,255,255,0.1)",
                background: active
                  ? "rgba(29,158,117,0.75)"
                  : "rgba(255,255,255,0.04)",
                color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.35)",
                fontSize: 10,
                fontWeight: active ? 700 : 400,
                cursor: "pointer",
                lineHeight: 1,
                transition: "background 0.12s ease, color 0.12s ease",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
      {value !== null ? (
        <span
          style={{
            fontSize: 11,
            color: "rgba(29,158,117,0.85)",
            fontWeight: 600,
            minWidth: 28,
          }}
        >
          {value}/10
        </span>
      ) : (
        <span style={{ minWidth: 28 }} />
      )}
    </div>
  );
}

function ReviewLayersPanel({
  layers,
  onChange,
}: {
  layers: ReviewLayers;
  onChange: (next: ReviewLayers) => void;
}) {
  return (
    <div
      style={{
        marginTop: 12,
        padding: "12px 14px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.025)",
        border: "0.5px solid rgba(255,255,255,0.07)",
      }}
    >
      {LAYER_DEFS.map(({ key, label }) => (
        <ReviewLayerRow
          key={key}
          label={label}
          value={layers[key]}
          onChange={(v) => onChange({ ...layers, [key]: v })}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function toDiaryMovie(entry: DiaryEntry): DiaryMovie {
  return {
    id: entry.media_id,
    mediaType: entry.media_type,
    reviewScope: entry.review_scope === "show" ? "show" : "title",
    showId: entry.show_id || undefined,
    seasonNumber: entry.season_number ?? undefined,
    episodeNumber: entry.episode_number ?? undefined,
    title: entry.title,
    poster: entry.poster ?? undefined,
    year: entry.year,
    director: entry.creator ?? undefined,
    genres: entry.genres,
    runtime: entry.runtime ?? undefined,
    voteAverage:
      typeof entry.vote_average === "number" ? entry.vote_average : undefined,
    rating: typeof entry.rating === "number" ? entry.rating : null,
    review: entry.review,
    watchedDate: entry.watched_date,
    favourite: entry.favourite,
    rewatch: entry.rewatch,
    containsSpoilers: entry.contains_spoilers,
    savedAt: entry.saved_at,
    reviewLayers: {
      score_rating: entry.score_rating ?? null,
      cinematography_rating: entry.cinematography_rating ?? null,
      writing_rating: entry.writing_rating ?? null,
      performances_rating: entry.performances_rating ?? null,
      direction_rating: entry.direction_rating ?? null,
      rewatchability_rating: entry.rewatchability_rating ?? null,
      emotional_impact_rating: entry.emotional_impact_rating ?? null,
      entertainment_rating: entry.entertainment_rating ?? null,
    },
  };
}

export default function DiaryLogModal({
  isOpen,
  onClose,
  onSaved,
  media,
}: DiaryLogModalProps) {
  const [mounted, setMounted] = useState(false);
  const [watchedDate, setWatchedDate] = useState(todayIso());
  const [rating, setRating] = useState<number | null>(null);
  const [review, setReview] = useState("");
  const [favourite, setFavourite] = useState(false);
  const [rewatch, setRewatch] = useState(false);
  const [containsSpoilers, setContainsSpoilers] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [layers, setLayers] = useState<ReviewLayers>(EMPTY_LAYERS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setWatchedDate(todayIso());
      setRating(null);
      setReview("");
      setFavourite(false);
      setRewatch(false);
      setContainsSpoilers(false);
      setLayersOpen(false);
      setLayers(EMPTY_LAYERS);
      setSaving(false);
      setError(null);
    }
  }, [isOpen]);

  const mediaBadgeStyle = useMemo(
    () => getMediaBadgeStyles(media.media_type),
    [media.media_type]
  );

  if (!mounted || !isOpen) {
    return null;
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    const supabase = createSupabaseClient();

    if (!supabase) {
      setError("Supabase is not configured.");
      setSaving(false);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setError("Not signed in");
      setSaving(false);
      return;
    }

    const mediaId =
      media.media_id ??
      (media.tmdb_id
        ? `tmdb-${media.tmdb_id}`
        : `${slugifyTitle(media.title)}-${media.year}`);

    const payload = {
      user_id: session.user.id,
      media_id: mediaId,
      media_type: media.media_type,
      title: media.title,
      poster: media.poster ?? null,
      year: media.year,
      creator: media.creator ?? null,
      genres: media.genres ?? [],
      runtime: media.runtime ?? null,
      vote_average: media.vote_average ?? null,
      rating,
      review: review.trim(),
      watched_date: watchedDate,
      favourite,
      rewatch,
      contains_spoilers: containsSpoilers,
      review_scope: "show",
      show_id: "",
      // Review layers — only included for films; all nullable so no field is required
      ...(media.media_type === "movie"
        ? {
            score_rating: layers.score_rating,
            cinematography_rating: layers.cinematography_rating,
            writing_rating: layers.writing_rating,
            performances_rating: layers.performances_rating,
            direction_rating: layers.direction_rating,
            rewatchability_rating: layers.rewatchability_rating,
            emotional_impact_rating: layers.emotional_impact_rating,
            entertainment_rating: layers.entertainment_rating,
          }
        : {}),
    };

    const { data, error: saveError } = await supabase
      .from("diary_entries")
      .upsert(payload, {
        onConflict: "user_id,media_id",
        ignoreDuplicates: false,
      })
      .select(DIARY_SELECT)
      .single<DiaryEntry>();

    if (saveError || !data) {
      console.error(
        "[DIARY SAVE] error:",
        saveError?.message ?? "Unknown error",
        "| code:",
        saveError?.code ?? "unknown"
      );
      setError(saveError?.message || "Failed to save diary entry");
      setSaving(false);
      return;
    }

    console.log("[DIARY SAVE] saved:", data.id, data.title);
    saveDiaryEntryLocally(toDiaryMovie(data));

    const { data: dates } = await supabase
      .from("diary_entries")
      .select("watched_date")
      .eq("user_id", session.user.id)
      .in("review_scope", ["show", "title"]);

    const allDates = (dates ?? [])
      .map((item) => item.watched_date)
      .filter((value): value is string => typeof value === "string");
    const streak = computeStreak(allDates);

    setSaving(false);
    onSaved(data, streak.currentStreak);
    onClose();
  }

  return createPortal(
    <>
      <style>{`
        @keyframes reelshelf-log-fade {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.75)",
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100dvh",
          padding: 16,
        }}
      >
        <div
          onClick={(event) => event.stopPropagation()}
          style={{
            width: "min(460px, 100%)",
            background: "#0f0f1e",
            border: "0.5px solid rgba(255,255,255,0.12)",
            borderRadius: 16,
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.06), 0 28px 80px rgba(0,0,0,0.42)",
            padding: 24,
            animation: "reelshelf-log-fade 200ms ease-out",
          }}
        >
          <div
            style={{
              position: "relative",
              minHeight: 120,
              borderRadius: 14,
              overflow: "hidden",
              background: media.poster ? "#10101a" : "#0f0f1e",
              marginBottom: 18,
            }}
          >
            {media.poster ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `url(${media.poster})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: "blur(20px) brightness(0.35) saturate(1.2)",
                  transform: "scale(1.1)",
                }}
              />
            ) : null}

            <div
              style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                gap: 16,
                alignItems: "flex-start",
                padding: 18,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 84,
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "#18182a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255,255,255,0.4)",
                  flexShrink: 0,
                  boxShadow: "0 14px 28px rgba(0,0,0,0.24)",
                }}
              >
                {media.poster ? (
                  <img
                    src={media.poster}
                    alt={media.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <span style={{ fontSize: 20, fontWeight: 600 }}>
                    {media.title.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 16,
                        lineHeight: 1.25,
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.92)",
                      }}
                    >
                      {media.title}
                    </h2>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        flexWrap: "wrap",
                        marginTop: 6,
                        color: "rgba(255,255,255,0.55)",
                        fontSize: 12,
                      }}
                    >
                      <span>{media.year || "Unknown year"}</span>
                      <span
                        style={{
                          borderRadius: 999,
                          padding: "3px 8px",
                          fontSize: 10,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          ...mediaBadgeStyle,
                        }}
                      >
                        {getMediaLabel(media.media_type)}
                      </span>
                    </div>
                    {media.creator ? (
                      <p
                        style={{
                          margin: "8px 0 0",
                          fontSize: 11,
                          color: "rgba(255,255,255,0.4)",
                        }}
                      >
                        {media.creator}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "rgba(255,255,255,0.68)",
                      cursor: "pointer",
                      fontSize: 22,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: 10,
                fontSize: 11,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.35)",
              }}
            >
              {media.media_type === "book" ? "Finished" : "Watched"}
            </label>
            <input
              type="date"
              value={watchedDate}
              onChange={(event) => setWatchedDate(event.target.value)}
              style={{
                width: "100%",
                border: "none",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                background: "transparent",
                color: "rgba(255,255,255,0.8)",
                fontSize: 14,
                padding: "6px 0",
                cursor: "pointer",
                outline: "none",
              }}
            />
          </div>

          <Divider />

          <div style={{ marginTop: -18 }}>
            <RatingStars value={rating} onChange={setRating} />
          </div>

          <Divider />

          <div style={{ marginTop: -18 }}>
            <textarea
              value={review}
              onChange={(event) => setReview(event.target.value.slice(0, 1000))}
              placeholder="What did you think? (optional)"
              rows={4}
              style={{
                width: "100%",
                resize: "none",
                border: "none",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 0,
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.82)",
                padding: "10px 2px",
                fontSize: 14,
                lineHeight: 1.6,
                minHeight: 72,
                outline: "none",
              }}
            />
            {review.length > 0 ? (
              <div
                style={{
                  marginTop: 6,
                  textAlign: "right",
                  color: "rgba(255,255,255,0.2)",
                  fontSize: 11,
                }}
              >
                {review.length}/1000
              </div>
            ) : null}
          </div>

          <Divider />

          <div
            style={{
              marginTop: -18,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <ToggleChip
              active={favourite}
              label="Favourite"
              icon="♥"
              onClick={() => setFavourite((value) => !value)}
            />
            <ToggleChip
              active={rewatch}
              label="Rewatch"
              icon="↺"
              onClick={() => setRewatch((value) => !value)}
            />
            <ToggleChip
              active={containsSpoilers}
              label="Spoilers"
              icon="⚠"
              onClick={() => setContainsSpoilers((value) => !value)}
            />
          </div>

          {/* Review layers — films only */}
          {media.media_type === "movie" ? (
            <>
              <Divider />
              <div style={{ marginTop: -18 }}>
                <button
                  type="button"
                  onClick={() => setLayersOpen((o) => !o)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    color: layersOpen
                      ? "rgba(255,255,255,0.6)"
                      : "rgba(255,255,255,0.32)",
                    fontSize: 12,
                    fontWeight: 500,
                    letterSpacing: "0.02em",
                    transition: "color 0.15s ease",
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      display: "inline-block",
                      transition: "transform 0.2s ease",
                      transform: layersOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    ▼
                  </span>
                  {layersOpen ? "Hide review layers" : "Add review layers"}
                </button>

                {layersOpen ? (
                  <ReviewLayersPanel layers={layers} onChange={setLayers} />
                ) : null}
              </div>
            </>
          ) : null}

          {error ? (
            <p style={{ margin: "16px 0 0", color: "#fca5a5", fontSize: 12 }}>{error}</p>
          ) : null}

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            style={{
              width: "100%",
              marginTop: 22,
              border: "none",
              borderRadius: 14,
              background: "#1D9E75",
              color: "white",
              fontSize: 14,
              fontWeight: 600,
              padding: "14px 16px",
              cursor: saving ? "wait" : "pointer",
              opacity: saving ? 0.75 : 1,
            }}
          >
            {saving ? "Saving…" : "Log to ReelShelf"}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
