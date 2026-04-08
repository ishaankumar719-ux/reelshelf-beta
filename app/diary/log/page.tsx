"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  clearDiaryDraft,
  getDiaryDraft,
  getDiaryMovie,
  saveDiaryEntry,
  type DiaryDraftMovie,
} from "../../../lib/diary";
import { getMediaHref } from "../../../lib/mediaRoutes";

function normalizeRatingInput(value: string) {
  const trimmed = value.trim().replace(",", ".");

  if (!trimmed) {
    return "";
  }

  const numeric = Number(trimmed);

  if (Number.isNaN(numeric)) {
    return "";
  }

  const clamped = Math.min(10, Math.max(0, numeric));

  return clamped.toFixed(1);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getMediaLabel(movie: DiaryDraftMovie) {
  if (movie.mediaType === "tv") return "series";
  if (movie.mediaType === "book") return "book";
  return "film";
}

function getDateLabel(movie: DiaryDraftMovie) {
  return movie.mediaType === "book" ? "Read date" : "Watched date";
}

export default function DiaryLogPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [movie, setMovie] = useState<DiaryDraftMovie | null>(null);
  const [ratingInput, setRatingInput] = useState("");
  const [review, setReview] = useState("");
  const [watchedDate, setWatchedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [favourite, setFavourite] = useState(false);
  const isEditing = searchParams.get("mode") === "edit";

  useEffect(() => {
    const draft = getDiaryDraft();

    if (!draft) {
      router.replace("/diary");
      return;
    }

    setMovie(draft);

    const existingEntry = getDiaryMovie(draft.id, draft.mediaType);

    if (existingEntry) {
      setRatingInput(
        typeof existingEntry.rating === "number"
          ? existingEntry.rating.toFixed(1)
          : ""
      );
      setReview(existingEntry.review);
      setWatchedDate(existingEntry.watchedDate);
      setFavourite(existingEntry.favourite);
    }
  }, [router]);

  const isValidRating = useMemo(() => {
    if (!ratingInput) return false;

    const numeric = Number(ratingInput.replace(",", "."));
    return !Number.isNaN(numeric) && numeric >= 0 && numeric <= 10;
  }, [ratingInput]);

  function handleRatingBlur() {
    setRatingInput((currentValue) => normalizeRatingInput(currentValue));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!movie || !isValidRating || !watchedDate) {
      return;
    }

    saveDiaryEntry({
      ...movie,
      rating: Number(ratingInput.replace(",", ".")),
      review,
      watchedDate,
      favourite,
    });
    clearDiaryDraft();
    router.push("/diary");
  }

  function handleCancel() {
    clearDiaryDraft();

    if (movie) {
      router.push(getMediaHref({ id: movie.id, mediaType: movie.mediaType }));
      return;
    }

    router.push("/diary");
  }

  if (!movie) {
    return null;
  }

  return (
    <main style={{ padding: "8px 0 48px" }}>
      <style>{`
        .diary-log-shell {
          display: grid;
          grid-template-columns: minmax(220px, 260px) minmax(0, 1fr);
        }

        .diary-log-fields {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          margin-bottom: 18px;
        }

        @media (max-width: 860px) {
          .diary-log-shell {
            grid-template-columns: 1fr;
          }

          .diary-log-sidebar {
            border-right: none !important;
            border-bottom: 1px solid rgba(255,255,255,0.06);
          }
        }

        @media (max-width: 640px) {
          .diary-log-fields {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <section
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          borderRadius: 28,
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "linear-gradient(180deg, rgba(18,18,18,0.98) 0%, rgba(8,8,8,0.98) 100%)",
          boxShadow: "0 30px 90px rgba(0,0,0,0.34)",
          overflow: "hidden",
        }}
      >
        <div className="diary-log-shell">
          <aside
            className="diary-log-sidebar"
            style={{
              padding: 24,
              borderRight: "1px solid rgba(255,255,255,0.06)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)",
            }}
          >
            <div
              style={{
                position: "relative",
                aspectRatio: "2 / 3",
                borderRadius: 20,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.08)",
                background:
                  "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 55%), linear-gradient(180deg, #151515 0%, #0b0b0b 100%)",
                marginBottom: 18,
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
              ) : null}
            </div>

            <p
              style={{
                margin: 0,
                marginBottom: 8,
                color: "#7f7f7f",
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontFamily: "Arial, sans-serif",
              }}
            >
              Diary log
            </p>

            <h1
              style={{
                margin: 0,
                fontSize: 30,
                lineHeight: 1.05,
                letterSpacing: "-1px",
                fontWeight: 500,
              }}
            >
              {movie.title}
            </h1>

            <p
              style={{
                margin: "10px 0 0",
                color: "#9ca3af",
                fontSize: 14,
                lineHeight: 1.6,
                fontFamily: "Arial, sans-serif",
              }}
            >
              {movie.year || "—"}
              {movie.director ? ` · ${movie.director}` : ""}
            </p>
          </aside>

          <div style={{ padding: 28 }}>
            <p
              style={{
                margin: 0,
                marginBottom: 10,
                color: "#7f7f7f",
                fontSize: 11,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                fontFamily: "Arial, sans-serif",
              }}
            >
              {isEditing ? "Update your entry" : "Log your watch"}
            </p>

            <h2
              style={{
                margin: 0,
                fontSize: 42,
                lineHeight: 1.02,
                letterSpacing: "-1.6px",
                fontWeight: 500,
              }}
            >
              {isEditing ? "Edit Diary Entry" : "Add to Diary"}
            </h2>

            <p
              style={{
                margin: "12px 0 28px",
                color: "#b5b5b5",
                fontSize: 16,
                lineHeight: 1.7,
                maxWidth: 620,
              }}
            >
              {isEditing
                ? `Refine the score, notes, and date for this ${getMediaLabel(movie)} without losing its place in your timeline.`
                : `Capture the score, the mood, and the moment while the ${getMediaLabel(movie)} is still fresh.`}
            </p>

            <form onSubmit={handleSubmit}>
              <div className="diary-log-fields">
                <label style={{ display: "grid", gap: 10 }}>
                  <span
                    style={{
                      color: "#d1d5db",
                      fontSize: 13,
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    Rating out of 10
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step={0.1}
                    min={0}
                    max={10}
                    placeholder="8.7"
                    value={ratingInput}
                    onChange={(event) => setRatingInput(event.target.value)}
                    onBlur={handleRatingBlur}
                    style={{
                      height: 46,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.03)",
                      color: "white",
                      padding: "0 14px",
                      fontSize: 15,
                      outline: "none",
                    }}
                  />
                  <span
                    style={{
                      color: "#7f7f7f",
                      fontSize: 12,
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    Use one decimal place max, from 0.0 to 10.0.
                  </span>
                </label>

                <label style={{ display: "grid", gap: 10 }}>
                  <span
                    style={{
                      color: "#d1d5db",
                      fontSize: 13,
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    {getDateLabel(movie)}
                  </span>
                  <input
                    type="date"
                    value={watchedDate}
                    onChange={(event) => setWatchedDate(event.target.value)}
                    style={{
                      height: 46,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.03)",
                      color: "white",
                      padding: "0 14px",
                      fontSize: 15,
                      outline: "none",
                    }}
                  />
                  <span
                    style={{
                      color: "#7f7f7f",
                      fontSize: 12,
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    Logged for {formatDate(watchedDate)}.
                  </span>
                </label>
              </div>

              <label style={{ display: "grid", gap: 10, marginBottom: 18 }}>
                <span
                  style={{
                    color: "#d1d5db",
                    fontSize: 13,
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  Review
                </span>
                <textarea
                  value={review}
                  onChange={(event) => setReview(event.target.value)}
                  placeholder="What stayed with you after the credits rolled?"
                  rows={7}
                  style={{
                    borderRadius: 18,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.03)",
                    color: "white",
                    padding: "14px 16px",
                    fontSize: 15,
                    lineHeight: 1.7,
                    resize: "vertical",
                    outline: "none",
                  }}
                />
              </label>

              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: favourite
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(255,255,255,0.03)",
                  cursor: "pointer",
                  marginBottom: 28,
                }}
              >
                <input
                  type="checkbox"
                  checked={favourite}
                  onChange={(event) => setFavourite(event.target.checked)}
                  style={{ accentColor: "white" }}
                />
                <span
                  style={{
                    fontSize: 14,
                    color: "white",
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  Mark as a favourite
                </span>
              </label>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  type="submit"
                  disabled={!isValidRating || !watchedDate}
                  style={{
                    padding: "12px 18px",
                    borderRadius: 999,
                    background: "white",
                    color: "black",
                    border: "none",
                    cursor: !isValidRating || !watchedDate ? "not-allowed" : "pointer",
                    fontWeight: 600,
                    opacity: !isValidRating || !watchedDate ? 0.5 : 1,
                  }}
                >
                  {isEditing ? "Save Changes" : "Save Entry"}
                </button>

                <button
                  type="button"
                  onClick={handleCancel}
                  style={{
                    padding: "12px 18px",
                    borderRadius: 999,
                    background: "transparent",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.14)",
                    cursor: "pointer",
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
