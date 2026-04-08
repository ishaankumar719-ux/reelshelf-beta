"use client";

import { useEffect, useMemo, useState } from "react";
import { saveDiaryDraft, saveDiaryEntry, getDiaryMovies, removeDiaryEntry, subscribeToDiary, type DiaryMovie } from "../lib/diary";

type SeriesReviewSeason = {
  seasonNumber: number;
  name: string;
  overview: string;
  posterUrl?: string;
  airDate?: string;
  episodes: Array<{
    id: number;
    name: string;
    overview: string;
    airDate?: string;
    episodeNumber: number;
    runtime?: number | null;
  }>;
};

type SeriesActionItem = {
  id: string;
  mediaType: "tv";
  title: string;
  year: number;
  poster?: string;
  director?: string;
  genres?: string[];
  runtime?: number;
  voteAverage?: number;
};

type ReviewTarget =
  | {
      type: "season";
      season: SeriesReviewSeason;
    }
  | {
      type: "episode";
      season: SeriesReviewSeason;
      episode: SeriesReviewSeason["episodes"][number];
    };

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function averageRating(entries: DiaryMovie[]) {
  const rated = entries.filter((entry) => typeof entry.rating === "number");

  if (rated.length === 0) {
    return null;
  }

  const average =
    rated.reduce((sum, entry) => sum + (entry.rating || 0), 0) / rated.length;

  return Number(average.toFixed(1));
}

function ReviewModal({
  open,
  target,
  series,
  creator,
  onClose,
}: {
  open: boolean;
  target: ReviewTarget | null;
  series: SeriesActionItem;
  creator: string;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<DiaryMovie[]>([]);
  const [ratingInput, setRatingInput] = useState("");
  const [review, setReview] = useState("");
  const [watchedDate, setWatchedDate] = useState(new Date().toISOString().slice(0, 10));
  const [favourite, setFavourite] = useState(false);

  useEffect(() => {
    setEntries(getDiaryMovies());
    return subscribeToDiary(() => setEntries(getDiaryMovies()));
  }, []);

  const existingEntry = useMemo(() => {
    if (!target) return null;

    return entries.find((entry) => {
      if (entry.mediaType !== "tv" || entry.id !== series.id) {
        return false;
      }

      if (target.type === "season") {
        return entry.reviewScope === "season" && entry.seasonNumber === target.season.seasonNumber;
      }

      return (
        entry.reviewScope === "episode" &&
        entry.seasonNumber === target.season.seasonNumber &&
        entry.episodeNumber === target.episode.episodeNumber
      );
    });
  }, [entries, series.id, target]);

  useEffect(() => {
    if (!open || !target) {
      return;
    }

    setRatingInput(
      typeof existingEntry?.rating === "number"
        ? existingEntry.rating.toFixed(1)
        : ""
    );
    setReview(existingEntry?.review || "");
    setWatchedDate(
      existingEntry?.watchedDate || new Date().toISOString().slice(0, 10)
    );
    setFavourite(existingEntry?.favourite || false);
  }, [existingEntry, open, target]);

  if (!open || !target) {
    return null;
  }

  const title =
    target.type === "season"
      ? `${series.title} • ${target.season.name}`
      : `${series.title} • S${target.season.seasonNumber}E${target.episode.episodeNumber} · ${target.episode.name}`;

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!target) {
      return;
    }

    const rating = ratingInput.trim()
      ? Number(Math.min(10, Math.max(0, Number(ratingInput.replace(",", ".")))).toFixed(1))
      : null;

    const reviewScope = target.type;
    const seasonNumber = target.season.seasonNumber;
    const episodeNumber =
      target.type === "episode" ? target.episode.episodeNumber : undefined;

    saveDiaryEntry({
      ...series,
      id: series.id,
      mediaType: "tv",
      showId: series.id,
      reviewScope,
      seasonNumber,
      episodeNumber,
      title,
      director: creator,
      rating,
      review,
      watchedDate,
      favourite,
    });

    onClose();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        display: "grid",
        placeItems: "center",
        padding: 18,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(14px)",
      }}
    >
      <form
        onSubmit={handleSave}
        style={{
          width: "min(560px, 100%)",
          borderRadius: 28,
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "radial-gradient(circle at top left, rgba(255,255,255,0.06), transparent 26%), linear-gradient(180deg, rgba(18,18,18,0.98) 0%, rgba(8,8,8,0.98) 100%)",
          boxShadow: "0 28px 80px rgba(0,0,0,0.4)",
          padding: 22,
          display: "grid",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <p
              style={{
                margin: 0,
                color: "#7f7f7f",
                fontSize: 11,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fontFamily: "Arial, sans-serif",
              }}
            >
              {target.type === "season" ? "Season Review" : "Episode Review"}
            </p>
            <h3
              style={{
                margin: "8px 0 0",
                fontSize: 28,
                lineHeight: 1.08,
                letterSpacing: "-0.8px",
                fontWeight: 600,
              }}
            >
              {title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: 38,
              height: 38,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)",
              color: "white",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <label style={{ display: "grid", gap: 10 }}>
            <span style={{ color: "#d1d5db", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "Arial, sans-serif" }}>
              Rating
            </span>
            <input
              value={ratingInput}
              onChange={(event) => setRatingInput(event.target.value)}
              placeholder="8.7"
              inputMode="decimal"
              style={{
                width: "100%",
                height: 46,
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.035)",
                color: "white",
                padding: "0 14px",
                fontSize: 15,
                outline: "none",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 10 }}>
            <span style={{ color: "#d1d5db", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "Arial, sans-serif" }}>
              Watched Date
            </span>
            <input
              type="date"
              value={watchedDate}
              onChange={(event) => setWatchedDate(event.target.value)}
              style={{
                width: "100%",
                height: 46,
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.035)",
                color: "white",
                padding: "0 14px",
                fontSize: 15,
                outline: "none",
              }}
            />
          </label>
        </div>

        <label style={{ display: "grid", gap: 10 }}>
          <span style={{ color: "#d1d5db", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "Arial, sans-serif" }}>
            Review
          </span>
          <textarea
            value={review}
            onChange={(event) => setReview(event.target.value)}
            rows={5}
            placeholder="What landed, what didn’t, and why?"
            style={{
              width: "100%",
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.035)",
              color: "white",
              padding: "14px 16px",
              fontSize: 15,
              lineHeight: 1.7,
              outline: "none",
              resize: "vertical",
              fontFamily: "Arial, sans-serif",
            }}
          />
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "#d1d5db",
            fontSize: 14,
            fontFamily: "Arial, sans-serif",
          }}
        >
          <input
            type="checkbox"
            checked={favourite}
            onChange={(event) => setFavourite(event.target.checked)}
          />
          Mark as favourite
        </label>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            type="submit"
            style={{
              height: 46,
              padding: "0 16px",
              borderRadius: 999,
              border: "none",
              background: "white",
              color: "black",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "Arial, sans-serif",
              cursor: "pointer",
            }}
          >
            Save Review
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 46,
              padding: "0 16px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.03)",
              color: "white",
              fontSize: 14,
              fontFamily: "Arial, sans-serif",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default function SeriesReviewPanel({
  series,
  creator,
  seasons,
}: {
  series: SeriesActionItem;
  creator: string;
  seasons: SeriesReviewSeason[];
}) {
  const [entries, setEntries] = useState<DiaryMovie[]>([]);
  const [activeTarget, setActiveTarget] = useState<ReviewTarget | null>(null);

  useEffect(() => {
    setEntries(getDiaryMovies());
    return subscribeToDiary(() => setEntries(getDiaryMovies()));
  }, []);

  const tvEntries = useMemo(
    () => entries.filter((entry) => entry.mediaType === "tv" && (entry.showId || entry.id) === series.id),
    [entries, series.id]
  );

  const showReview = tvEntries.find(
    (entry) => entry.reviewScope === "show" || (!entry.reviewScope && entry.id === series.id)
  );

  function handleQuickShowReview() {
    saveDiaryDraft({
      ...series,
      reviewScope: "show",
      showId: series.id,
    });
    window.location.href = "/diary/log";
  }

  function toggleEpisodeWatched(season: SeriesReviewSeason, episode: SeriesReviewSeason["episodes"][number]) {
    const existing = tvEntries.find(
      (entry) =>
        entry.reviewScope === "episode" &&
        entry.seasonNumber === season.seasonNumber &&
        entry.episodeNumber === episode.episodeNumber
    );

    if (existing) {
      removeDiaryEntry(series.id, "tv", {
        reviewScope: "episode",
        seasonNumber: season.seasonNumber,
        episodeNumber: episode.episodeNumber,
      });
      return;
    }

    saveDiaryEntry({
      ...series,
      id: series.id,
      mediaType: "tv",
      showId: series.id,
      reviewScope: "episode",
      seasonNumber: season.seasonNumber,
      episodeNumber: episode.episodeNumber,
      title: `${series.title} • S${season.seasonNumber}E${episode.episodeNumber} · ${episode.name}`,
      director: creator,
      rating: null,
      review: "",
      watchedDate: new Date().toISOString().slice(0, 10),
      favourite: false,
    });
  }

  return (
    <section
      style={{
        borderRadius: 28,
        border: "1px solid rgba(255,255,255,0.08)",
        background:
          "linear-gradient(180deg, rgba(18,18,18,0.96) 0%, rgba(10,10,10,0.96) 100%)",
        boxShadow: "0 20px 64px rgba(0,0,0,0.24)",
        padding: 22,
        display: "grid",
        gap: 20,
      }}
    >
      <style>{`
        .series-review-top {
          display: grid;
          gap: 16px;
          grid-template-columns: minmax(0, 1fr);
        }

        .series-season-grid {
          display: grid;
          gap: 18px;
        }

        .series-episode-list {
          display: grid;
          gap: 10px;
        }

        .series-episode-item {
          display: grid;
          gap: 12px;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          padding: 14px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
        }

        @media (max-width: 760px) {
          .series-episode-item {
            grid-template-columns: 1fr;
            align-items: start;
          }
        }
      `}</style>

      <div className="series-review-top">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "end",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: "#7f7f7f",
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                fontFamily: "Arial, sans-serif",
              }}
            >
              Episode Journal
            </p>
            <h2
              style={{
                margin: "8px 0 0",
                fontSize: "clamp(28px, 4vw, 40px)",
                lineHeight: 1,
                letterSpacing: "-1px",
                fontWeight: 600,
              }}
            >
              Track seasons, episodes, and full-show reactions.
            </h2>
          </div>

          <button
            type="button"
            onClick={handleQuickShowReview}
            style={{
              height: 42,
              padding: "0 16px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: "white",
              fontSize: 13,
              fontFamily: "Arial, sans-serif",
              cursor: "pointer",
            }}
          >
            {showReview ? "Edit show review" : "Review full series"}
          </button>
        </div>

        <div
          style={{
            borderRadius: 22,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            padding: 18,
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#8f8f8f",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontFamily: "Arial, sans-serif",
            }}
          >
            Show-Level Review
          </p>
          <h3
            style={{
              margin: "10px 0 0",
              fontSize: 24,
              letterSpacing: "-0.6px",
              fontWeight: 600,
            }}
          >
            {showReview?.rating !== null && showReview?.rating !== undefined
              ? `${showReview.rating.toFixed(1)} ★`
              : "No series rating yet"}
          </h3>
          <p
            style={{
              margin: "8px 0 0",
              color: "#c7c7c7",
              fontSize: 14,
              lineHeight: 1.7,
              fontFamily: "Arial, sans-serif",
            }}
          >
            {showReview?.review?.trim()
              ? showReview.review
              : "Use the full-series review entry point to log an overall take on the show."}
          </p>
          {showReview ? (
            <p
              style={{
                margin: "10px 0 0",
                color: "#8f8f8f",
                fontSize: 12,
                fontFamily: "Arial, sans-serif",
              }}
            >
              Watched {formatDate(showReview.watchedDate)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="series-season-grid">
        {seasons.map((season) => {
          const seasonEpisodeEntries = tvEntries.filter(
            (entry) =>
              entry.reviewScope === "episode" &&
              entry.seasonNumber === season.seasonNumber
          );
          const watchedCount = seasonEpisodeEntries.length;
          const average = averageRating(seasonEpisodeEntries);
          const seasonReview = tvEntries.find(
            (entry) =>
              entry.reviewScope === "season" &&
              entry.seasonNumber === season.seasonNumber
          );

          return (
            <article
              key={season.seasonNumber}
              style={{
                borderRadius: 24,
                border: "1px solid rgba(255,255,255,0.08)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: 18,
                  display: "grid",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 14,
                    alignItems: "start",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 26,
                        lineHeight: 1.06,
                        letterSpacing: "-0.8px",
                        fontWeight: 600,
                      }}
                    >
                      {season.name}
                    </h3>
                    <p
                      style={{
                        margin: "8px 0 0",
                        color: "#9ca3af",
                        fontSize: 14,
                        lineHeight: 1.7,
                        fontFamily: "Arial, sans-serif",
                        maxWidth: 720,
                      }}
                    >
                      {season.overview || "No season overview available."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTarget({ type: "season", season })}
                    style={{
                      height: 40,
                      padding: "0 14px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.04)",
                      color: "white",
                      fontSize: 13,
                      fontFamily: "Arial, sans-serif",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    {seasonReview ? "Edit season review" : "Review season"}
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", height: 34, padding: "0 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#e5e7eb", fontSize: 12, fontFamily: "Arial, sans-serif" }}>
                    Progress {watchedCount}/{season.episodes.length}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", height: 34, padding: "0 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#e5e7eb", fontSize: 12, fontFamily: "Arial, sans-serif" }}>
                    Episode Avg {average !== null ? `${average.toFixed(1)} ★` : "—"}
                  </span>
                  {seasonReview ? (
                    <span style={{ display: "inline-flex", alignItems: "center", height: 34, padding: "0 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#e5e7eb", fontSize: 12, fontFamily: "Arial, sans-serif" }}>
                      Season Review {seasonReview.rating !== null ? `${seasonReview.rating.toFixed(1)} ★` : "Logged"}
                    </span>
                  ) : null}
                </div>

                <div className="series-episode-list">
                  {season.episodes.map((episode) => {
                    const episodeEntry = seasonEpisodeEntries.find(
                      (entry) => entry.episodeNumber === episode.episodeNumber
                    );

                    return (
                      <div className="series-episode-item" key={episode.id}>
                        <button
                          type="button"
                          onClick={() => toggleEpisodeWatched(season, episode)}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 999,
                            border: episodeEntry
                              ? "1px solid rgba(255,255,255,0.18)"
                              : "1px solid rgba(255,255,255,0.1)",
                            background: episodeEntry
                              ? "rgba(255,255,255,0.12)"
                              : "rgba(255,255,255,0.03)",
                            color: "white",
                            cursor: "pointer",
                            fontSize: 16,
                          }}
                        >
                          {episodeEntry ? "✓" : "○"}
                        </button>

                        <div style={{ minWidth: 0 }}>
                          <p
                            style={{
                              margin: 0,
                              color: "white",
                              fontSize: 15,
                              lineHeight: 1.5,
                              fontFamily: "Arial, sans-serif",
                            }}
                          >
                            S{season.seasonNumber}E{episode.episodeNumber} · {episode.name}
                          </p>
                          <p
                            style={{
                              margin: "6px 0 0",
                              color: "#8f8f8f",
                              fontSize: 12,
                              lineHeight: 1.6,
                              fontFamily: "Arial, sans-serif",
                            }}
                          >
                            {episode.airDate ? formatDate(episode.airDate) : "Unknown air date"}
                            {typeof episode.runtime === "number"
                              ? ` · ${episode.runtime} min`
                              : ""}
                            {episodeEntry?.rating !== null &&
                            episodeEntry?.rating !== undefined
                              ? ` · ${episodeEntry.rating.toFixed(1)} ★`
                              : ""}
                          </p>
                          {episodeEntry?.review?.trim() ? (
                            <p
                              style={{
                                margin: "8px 0 0",
                                color: "#c7c7c7",
                                fontSize: 13,
                                lineHeight: 1.7,
                                fontFamily: "Arial, sans-serif",
                              }}
                            >
                              {episodeEntry.review}
                            </p>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setActiveTarget({ type: "episode", season, episode })
                          }
                          style={{
                            height: 38,
                            padding: "0 14px",
                            borderRadius: 999,
                            border: "1px solid rgba(255,255,255,0.12)",
                            background: "rgba(255,255,255,0.04)",
                            color: "white",
                            fontSize: 13,
                            fontFamily: "Arial, sans-serif",
                            cursor: "pointer",
                          }}
                        >
                          {episodeEntry ? "Edit" : "Review"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <ReviewModal
        open={Boolean(activeTarget)}
        target={activeTarget}
        series={series}
        creator={creator}
        onClose={() => setActiveTarget(null)}
      />
    </section>
  );
}
