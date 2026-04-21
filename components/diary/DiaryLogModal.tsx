"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createClient as createSupabaseClient } from "../../lib/supabase/client";
import { saveDiaryEntryLocally, type DiaryMovie } from "../../lib/diary";
import { DIARY_SELECT } from "../../lib/queries";
import { computeStreak } from "../../lib/streak";
import type { DiaryEntry, LogMediaInput } from "../../types/diary";

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
        flex: 1,
        minWidth: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        borderRadius: 12,
        border: active
          ? "0.5px solid rgba(29,158,117,0.42)"
          : "0.5px solid rgba(255,255,255,0.1)",
        background: active ? "rgba(29,158,117,0.16)" : "rgba(255,255,255,0.04)",
        color: active ? "rgba(211,255,238,0.95)" : "rgba(255,255,255,0.72)",
        padding: "10px 12px",
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function RatingStars({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (nextValue: number | null) => void;
}) {
  const current = value ?? 0;

  return (
    <div style={{ display: "flex", gap: 4 }}>
      {Array.from({ length: 10 }, (_, index) => {
        const score = index + 1;
        const isActive = current >= score;
        const isLeftHalf = index % 2 === 0;

        return (
          <button
            key={score}
            type="button"
            aria-label={`Set rating to ${score / 2} stars`}
            onClick={() => onChange(value === score ? null : score)}
            style={{
              width: 20,
              height: 30,
              padding: 0,
              border: "none",
              background: "transparent",
              color: isActive ? "#F6C453" : "rgba(255,255,255,0.22)",
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                display: "block",
                width: 20,
                fontSize: 22,
                lineHeight: "30px",
                marginLeft: isLeftHalf ? 0 : -10,
              }}
            >
              ★
            </span>
          </button>
        );
      })}
    </div>
  );
}

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
    };

    const { data, error: saveError } = await supabase
      .from("diary_entries")
      .insert(payload)
      .select(DIARY_SELECT)
      .single<DiaryEntry>();

    if (saveError || !data) {
      console.error("[DIARY SAVE] error:", saveError?.message ?? "Unknown error");
      setError("Failed to save. Please try again.");
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
            borderRadius: 24,
            boxShadow: "0 28px 80px rgba(0,0,0,0.42)",
            padding: 18,
            animation: "reelshelf-log-fade 200ms ease-out",
          }}
        >
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div
              style={{
                width: 48,
                height: 72,
                borderRadius: 10,
                overflow: "hidden",
                background: "#18182a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,0.4)",
                flexShrink: 0,
              }}
            >
              {media.poster ? (
                <img
                  src={media.poster}
                  alt={media.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ fontSize: 18, fontWeight: 600 }}>
                  {media.title.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
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
                    {media.creator ? <span>{media.creator}</span> : null}
                  </div>
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

          <div style={{ marginTop: 18 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontSize: 12,
                color: "rgba(255,255,255,0.62)",
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
                borderRadius: 12,
                border: "0.5px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.9)",
                padding: "12px 14px",
              }}
            />
          </div>

          <div style={{ marginTop: 18 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontSize: 12,
                color: "rgba(255,255,255,0.62)",
              }}
            >
              Rating {typeof rating === "number" ? `· ${(rating / 2).toFixed(1)} ★` : ""}
            </label>
            <RatingStars value={rating} onChange={setRating} />
          </div>

          <div style={{ marginTop: 18 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontSize: 12,
                color: "rgba(255,255,255,0.62)",
              }}
            >
              Review
            </label>
            <textarea
              value={review}
              onChange={(event) => setReview(event.target.value.slice(0, 1000))}
              placeholder="Write a short review… (optional)"
              rows={5}
              style={{
                width: "100%",
                resize: "vertical",
                borderRadius: 12,
                border: "0.5px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.9)",
                padding: "12px 14px",
                lineHeight: 1.6,
              }}
            />
            <div
              style={{
                marginTop: 6,
                textAlign: "right",
                color: "rgba(255,255,255,0.36)",
                fontSize: 11,
              }}
            >
              {review.length}/1000
            </div>
          </div>

          <div style={{ marginTop: 18, display: "flex", gap: 8 }}>
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

          {error ? (
            <p style={{ margin: "14px 0 0", color: "#fca5a5", fontSize: 12 }}>{error}</p>
          ) : null}

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            style={{
              width: "100%",
              marginTop: 18,
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
