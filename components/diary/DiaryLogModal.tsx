"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createClient as createSupabaseClient } from "../../lib/supabase/client";
import { saveDiaryEntryLocally, type DiaryMovie } from "../../lib/diary";
import { DIARY_SELECT } from "../../lib/queries";
import { computeStreak } from "../../lib/streak";
import type { DiaryEntry, InitialEntryData, LayerDef, LogMediaInput, ReviewLayers } from "../../types/diary";
import { EMPTY_REVIEW_LAYERS as EMPTY_LAYERS, getLayerDefs } from "../../types/diary";
import { calculateReelShelfScore } from "../../lib/scoring";
import AttachmentPicker, { type AttachmentValue } from "../AttachmentPicker"
import ReviewCoverPicker, { type ReviewCoverValue } from "./ReviewCoverPicker";

interface DiaryLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (entry: DiaryEntry, streakDays: number) => void;
  media: LogMediaInput;
  initialEntry?: InitialEntryData;
}

function getReviewPlaceholder(mediaType: LogMediaInput["media_type"]) {
  if (mediaType === "tv") return "What stayed with you after the credits rolled? (optional)";
  if (mediaType === "book") return "What stayed with you after the final page? (optional)";
  return "What did you think? (optional)";
}

function getRewatchLabel(mediaType: LogMediaInput["media_type"]) {
  return mediaType === "book" ? "Re-read" : "Rewatch";
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

const SLIDER_CSS = `
  .rs-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 3px;
    border-radius: 2px;
    outline: none;
    cursor: pointer;
  }
  .rs-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(255,255,255,0.95);
    box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.55), 0 0 14px rgba(255,255,255,0.08);
    cursor: grab;
    transition: transform 0.1s ease, box-shadow 0.15s ease;
  }
  .rs-slider:focus::-webkit-slider-thumb,
  .rs-slider:hover::-webkit-slider-thumb {
    box-shadow: 0 0 0 4px rgba(255,255,255,0.12), 0 2px 10px rgba(0,0,0,0.6), 0 0 18px rgba(255,255,255,0.12);
  }
  .rs-slider:active::-webkit-slider-thumb {
    cursor: grabbing;
    transform: scale(1.15);
  }
  .rs-slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 50%;
    background: rgba(255,255,255,0.95);
    box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.55);
    cursor: grab;
  }
  .rs-slider::-moz-range-track { background: transparent; }
`;

function CinematicSlider({
  value,
  min = 1,
  max = 10,
  step = 0.1,
  onChange,
  ariaLabel,
}: {
  value: number | null;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number | null) => void;
  ariaLabel?: string;
}) {
  const internalMin = 0;
  const internalValue = value ?? internalMin;
  const fillPct = (internalValue / max) * 100;
  const hasValue = value !== null;
  const trackBg = `linear-gradient(to right, rgba(255,255,255,${hasValue ? 0.52 : 0.16}) 0%, rgba(255,255,255,${hasValue ? 0.52 : 0.16}) ${fillPct}%, rgba(255,255,255,0.09) ${fillPct}%, rgba(255,255,255,0.09) 100%)`;

  return (
    <input
      type="range"
      className="rs-slider"
      min={internalMin}
      max={max}
      step={step}
      value={internalValue}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (n === 0) { onChange(null); return; }
        onChange(Math.max(min, Math.round(n / step) * step));
      }}
      style={{ background: trackBg }}
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value ?? undefined}
    />
  );
}

function RatingWidget({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          gap: 6,
          marginBottom: 18,
          minHeight: 52,
        }}
      >
        {value !== null ? (
          <>
            <span
              style={{
                fontSize: 44,
                fontWeight: 300,
                letterSpacing: "-2px",
                color: "rgba(255,255,255,0.92)",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
                transition: "color 0.15s ease",
              }}
            >
              {value.toFixed(1)}
            </span>
            <span
              style={{
                fontSize: 16,
                color: "rgba(255,255,255,0.28)",
                fontWeight: 400,
                letterSpacing: "0.02em",
              }}
            >
              / 10
            </span>
          </>
        ) : (
          <span
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.22)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Slide to rate
          </span>
        )}
      </div>

      <CinematicSlider
        value={value}
        min={1}
        max={10}
        step={0.1}
        onChange={onChange}
        ariaLabel="Overall rating"
      />

      <div style={{ textAlign: "right", marginTop: 10, minHeight: 16 }}>
        {value !== null ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              color: "rgba(255,255,255,0.22)",
              fontSize: 11,
              letterSpacing: "0.04em",
            }}
          >
            × Clear rating
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ─── Review layers ────────────────────────────────────────────────────────────

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
    <div style={{ padding: "8px 0" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 7,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.42)",
            letterSpacing: "0.03em",
          }}
        >
          {label}
        </span>
        {value !== null ? (
          <span
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.62)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}
            <span style={{ color: "rgba(255,255,255,0.24)", marginLeft: 2 }}>/10</span>
          </span>
        ) : (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.18)" }}>—</span>
        )}
      </div>
      <CinematicSlider
        value={value}
        min={1}
        max={10}
        step={0.5}
        onChange={onChange}
        ariaLabel={label}
      />
    </div>
  );
}

function ReviewLayersPanel({
  defs,
  layers,
  onChange,
}: {
  defs: LayerDef[];
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
      {defs.map(({ key, label }) => (
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
    letterboxdRating: typeof entry.letterboxd_rating === "number" ? entry.letterboxd_rating : null,
    review: entry.review,
    watchedDate: entry.watched_date,
    favourite: entry.favourite,
    rewatch: entry.rewatch,
    containsSpoilers: entry.contains_spoilers,
    watchedInCinema: entry.watched_in_cinema ?? false,
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
    reelshelfScore: typeof entry.reelshelf_score === "number" ? entry.reelshelf_score : null,
  };
}

export default function DiaryLogModal({
  isOpen,
  onClose,
  onSaved,
  media,
  initialEntry,
}: DiaryLogModalProps) {
  const [mounted, setMounted] = useState(false);
  const [watchedDate, setWatchedDate] = useState(todayIso());
  const [rating, setRating] = useState<number | null>(null);
  const [letterboxdRating, setLetterboxdRating] = useState<number | null>(null);
  const [review, setReview] = useState("");
  const [favourite, setFavourite] = useState(false);
  const [rewatch, setRewatch] = useState(false);
  const [containsSpoilers, setContainsSpoilers] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [layers, setLayers] = useState<ReviewLayers>(EMPTY_LAYERS);
  const [watchedInCinema, setWatchedInCinema] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<AttachmentValue | null>(null);
  const [reviewCover, setReviewCover] = useState<ReviewCoverValue>({ url: null, source: "default" });

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
    if (isOpen && initialEntry) {
      setRating(initialEntry.rating);
      setLetterboxdRating(initialEntry.letterboxdRating ?? null);
      setReview(initialEntry.review);
      setWatchedDate(initialEntry.watchedDate);
      setFavourite(initialEntry.favourite);
      setRewatch(initialEntry.rewatch);
      setContainsSpoilers(initialEntry.containsSpoilers);
      setWatchedInCinema(initialEntry.watchedInCinema ?? false);
      setLayers(initialEntry.reviewLayers ?? EMPTY_LAYERS);
      setAttachment(
        initialEntry.attachmentUrl && initialEntry.attachmentType
          ? { url: initialEntry.attachmentUrl, type: initialEntry.attachmentType }
          : null
      );
      setReviewCover({
        url: initialEntry.reviewCoverUrl ?? null,
        source: initialEntry.reviewCoverSource ?? "default",
      });
    } else if (!isOpen) {
      setWatchedDate(todayIso());
      setRating(null);
      setLetterboxdRating(null);
      setReview("");
      setFavourite(false);
      setRewatch(false);
      setContainsSpoilers(false);
      setWatchedInCinema(false);
      setLayersOpen(false);
      setLayers(EMPTY_LAYERS);
      setSaving(false);
      setError(null);
      setAttachment(null);
      setReviewCover({ url: null, source: "default" });
    }
  }, [isOpen, initialEntry]);

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

    const reelshelfScore = calculateReelShelfScore(media.media_type, rating, layers);

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
      season_number: 0,
      episode_number: 0,
      // Review layers — nullable for all media types
      score_rating: layers.score_rating,
      cinematography_rating: layers.cinematography_rating,
      writing_rating: layers.writing_rating,
      performances_rating: layers.performances_rating,
      direction_rating: layers.direction_rating,
      rewatchability_rating: layers.rewatchability_rating,
      emotional_impact_rating: layers.emotional_impact_rating,
      entertainment_rating: layers.entertainment_rating,
      reelshelf_score: reelshelfScore,
      attachment_url: attachment?.url ?? null,
      attachment_type: attachment?.type ?? null,
      watched_in_cinema: media.media_type === "movie" ? watchedInCinema : false,
      review_cover_url: reviewCover.source === "default" ? null : (reviewCover.url ?? null),
      review_cover_source: reviewCover.source !== "default" && reviewCover.url ? reviewCover.source : null,
    };

    const { data, error: saveError } = await supabase
      .from("diary_entries")
      .upsert(payload, {
        onConflict: "user_id,media_type,media_id,review_scope,season_number,episode_number",
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
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        ${SLIDER_CSS}

        /* Bottom-sheet on mobile, centred overlay on desktop */
        .rs-log-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          z-index: 75;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .rs-log-sheet {
          width: min(460px, 100%);
          max-height: 92dvh;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          background: #0f0f1e;
          border: 0.5px solid rgba(255,255,255,0.12);
          border-radius: 20px 20px 0 0;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 -24px 64px rgba(0,0,0,0.5);
          padding: 16px 20px max(20px, env(safe-area-inset-bottom, 20px));
          animation: reelshelf-log-fade 220ms ease-out;
        }
        @media (min-width: 520px) {
          .rs-log-backdrop {
            align-items: center;
            padding: 16px;
          }
          .rs-log-sheet {
            border-radius: 18px;
            max-height: calc(100dvh - 48px);
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 28px 80px rgba(0,0,0,0.5);
            padding: 24px;
          }
        }
      `}</style>
      <div
        onClick={onClose}
        className="rs-log-backdrop"
      >
        <div
          onClick={(event) => event.stopPropagation()}
          className="rs-log-sheet"
        >
          {/* Drag handle — mobile only */}
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: "rgba(255,255,255,0.14)",
              margin: "0 auto 16px",
            }}
          />
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
                      {initialEntry ? (
                        <span
                          style={{
                            borderRadius: 999,
                            padding: "3px 8px",
                            fontSize: 10,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            background: "rgba(255,255,255,0.07)",
                            border: "0.5px solid rgba(255,255,255,0.14)",
                            color: "rgba(255,255,255,0.45)",
                          }}
                        >
                          Editing
                        </span>
                      ) : null}
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
            <RatingWidget value={rating} onChange={setRating} />
            {letterboxdRating !== null ? (
              <p
                style={{
                  margin: "0 0 4px",
                  textAlign: "center",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.28)",
                  letterSpacing: "0.03em",
                }}
              >
                Imported from Letterboxd: {letterboxdRating}★
              </p>
            ) : null}
          </div>

          <Divider />

          <div style={{ marginTop: -18 }}>
            <textarea
              value={review}
              onChange={(event) => setReview(event.target.value.slice(0, 1000))}
              placeholder={getReviewPlaceholder(media.media_type)}
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

            <AttachmentPicker
              value={attachment}
              onChange={setAttachment}
            />

            <ReviewCoverPicker
              mediaType={media.media_type}
              tmdbId={media.tmdb_id}
              defaultPosterUrl={media.poster ?? null}
              value={reviewCover}
              onChange={setReviewCover}
            />
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
              label={getRewatchLabel(media.media_type)}
              icon="↺"
              onClick={() => setRewatch((value) => !value)}
            />
            <ToggleChip
              active={containsSpoilers}
              label="Spoilers"
              icon="⚠"
              onClick={() => setContainsSpoilers((value) => !value)}
            />
            {media.media_type === "movie" ? (
              <ToggleChip
                active={watchedInCinema}
                label="Cinema"
                icon="🎬"
                onClick={() => setWatchedInCinema((value) => !value)}
              />
            ) : null}
          </div>

          {/* Review layers — all media types */}
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
                <ReviewLayersPanel
                  defs={getLayerDefs(media.media_type)}
                  layers={layers}
                  onChange={setLayers}
                />
              ) : null}
            </div>
          </>

          {error ? (
            <p style={{ margin: "16px 0 0", color: "#fca5a5", fontSize: 12 }}>{error}</p>
          ) : null}

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            style={{
              width: "100%",
              marginTop: 20,
              border: "none",
              borderRadius: 14,
              background: "#1D9E75",
              color: "white",
              fontSize: 15,
              fontWeight: 600,
              padding: "16px 16px",
              minHeight: 52,
              cursor: saving ? "wait" : "pointer",
              opacity: saving ? 0.75 : 1,
              letterSpacing: "0.01em",
            }}
          >
            {saving ? "Saving…" : initialEntry ? "Update entry" : "Log to ReelShelf"}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
