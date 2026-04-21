"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  getDiaryEntryKey,
  getDiaryMovies,
  removeDiaryEntry,
  saveDiaryDraft,
  subscribeToDiary,
  type DiaryMovie,
} from "../../lib/diary";
import type { MediaType } from "../../lib/media";
import { getMediaHref } from "../../lib/mediaRoutes";

type FilterType = "all" | "favourites" | "highest-rated" | "recent";
type MediaFilterType = "all" | MediaType;
type TimeGroup = "Today" | "Yesterday" | "This week" | "Earlier";

function getTimeGroup(watchedDate: string): TimeGroup {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  const date = new Date(watchedDate);
  date.setHours(0, 0, 0, 0);

  if (date >= today) return "Today";
  if (date >= yesterday) return "Yesterday";
  if (date >= weekAgo) return "This week";
  return "Earlier";
}

function formatDiaryDate(date: string) {
  const value = new Date(date);
  const now = new Date();
  const includeYear = value.getFullYear() !== now.getFullYear();

  return value.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(includeYear ? { year: "numeric" } : {}),
  });
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

function sortByNewest(entries: DiaryMovie[]) {
  return [...entries].sort(
    (a, b) => new Date(b.watchedDate).getTime() - new Date(a.watchedDate).getTime()
  );
}

function sortByHighestRated(entries: DiaryMovie[]) {
  return [...entries].sort((a, b) => {
    const left = getRatingNumber(a.rating) ?? -1;
    const right = getRatingNumber(b.rating) ?? -1;

    if (right !== left) {
      return right - left;
    }

    return new Date(b.watchedDate).getTime() - new Date(a.watchedDate).getTime();
  });
}

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 36,
        padding: "0 14px",
        borderRadius: 999,
        border: active
          ? "1px solid rgba(255,255,255,0.2)"
          : "1px solid rgba(255,255,255,0.08)",
        background: active ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.03)",
        color: active ? "white" : "#9ca3af",
        fontSize: 12,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        cursor: "pointer",
        fontFamily: "Arial, sans-serif",
        transition: "all 0.2s ease",
      }}
    >
      {label}
    </button>
  );
}

export default function DiaryPage() {
  const router = useRouter();
  const [movies, setMovies] = useState<DiaryMovie[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [mediaFilter, setMediaFilter] = useState<MediaFilterType>("all");
  const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null);

  useEffect(() => {
    setMovies(getDiaryMovies());
    return subscribeToDiary(() => setMovies(getDiaryMovies()));
  }, []);

  const filteredMovies = useMemo(() => {
    const mediaFilteredMovies =
      mediaFilter === "all"
        ? movies
        : movies.filter((movie) => movie.mediaType === mediaFilter);

    if (filter === "favourites") {
      return sortByNewest(mediaFilteredMovies.filter((movie) => movie.favourite));
    }

    if (filter === "highest-rated") {
      return sortByHighestRated(mediaFilteredMovies);
    }

    return sortByNewest(mediaFilteredMovies);
  }, [filter, mediaFilter, movies]);

  const groupedMovies = useMemo(() => {
    const groups: Record<TimeGroup, DiaryMovie[]> = {
      Today: [],
      Yesterday: [],
      "This week": [],
      Earlier: [],
    };

    for (const movie of filteredMovies) {
      groups[getTimeGroup(movie.watchedDate)].push(movie);
    }

    return groups;
  }, [filteredMovies]);

  const isEmpty = movies.length === 0;
  const isFilteredEmpty = !isEmpty && filteredMovies.length === 0;

  function handleEdit(movie: DiaryMovie) {
    saveDiaryDraft({
      id: movie.id,
      mediaType: movie.mediaType,
      reviewScope: movie.reviewScope,
      showId: movie.showId,
      seasonNumber: movie.seasonNumber,
      episodeNumber: movie.episodeNumber,
      title: movie.title,
      poster: movie.poster,
      year: movie.year,
      director: movie.director,
      genres: movie.genres,
      runtime: movie.runtime,
      voteAverage: movie.voteAverage,
    });
    router.push("/diary/log?mode=edit");
  }

  function handleDelete(movie: DiaryMovie) {
    removeDiaryEntry(movie.id, movie.mediaType, {
      reviewScope: movie.reviewScope,
      seasonNumber: movie.seasonNumber,
      episodeNumber: movie.episodeNumber,
    });
    setMovies(getDiaryMovies());
    setPendingDeleteKey(null);
  }

  return (
    <main style={{ padding: "12px 0 44px" }}>
      <style>{`
        .diary-feed {
          display: grid;
          gap: 24px;
          max-width: 1020px;
        }

        .diary-group-label {
          position: sticky;
          top: 12px;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(5, 5, 5, 0.92);
          border: 0.5px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.36);
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-family: Arial, sans-serif;
        }

        @media (max-width: 560px) {
          .diary-feed {
            gap: 16px;
          }
        }
      `}</style>

      <section
        style={{
          marginBottom: 28,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <div>
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
            Cinematic journal
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(2.35rem, 8vw, 52px)",
              lineHeight: 1,
              letterSpacing: "-1.8px",
              fontWeight: 500,
            }}
          >
            My Diary
          </h1>
          <p
            style={{
              margin: "12px 0 0",
              color: "#a3a3a3",
              fontSize: "clamp(14px, 3.8vw, 15px)",
              lineHeight: 1.7,
              maxWidth: 660,
              fontFamily: "Arial, sans-serif",
            }}
          >
            A running timeline of what you watched, what you thought, and what
            stayed with you after the credits rolled.
          </p>
        </div>

        <div
          style={{
            padding: "12px 14px",
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(18,18,18,0.86) 0%, rgba(10,10,10,0.92) 100%)",
            minWidth: 160,
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#7f7f7f",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontFamily: "Arial, sans-serif",
            }}
          >
            Entries
          </p>
          <p
            style={{
              margin: "8px 0 0",
              color: "white",
              fontSize: 28,
              letterSpacing: "-1px",
              fontWeight: 600,
            }}
          >
            {movies.length}
          </p>
        </div>
      </section>

      <section
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <FilterButton active={mediaFilter === "all"} label="All" onClick={() => setMediaFilter("all")} />
        <FilterButton active={mediaFilter === "movie"} label="Films" onClick={() => setMediaFilter("movie")} />
        <FilterButton active={mediaFilter === "tv"} label="Series" onClick={() => setMediaFilter("tv")} />
        <FilterButton active={mediaFilter === "book"} label="Books" onClick={() => setMediaFilter("book")} />
      </section>

      <section
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <FilterButton active={filter === "recent" || filter === "all"} label="Recent" onClick={() => setFilter("recent")} />
        <FilterButton active={filter === "favourites"} label="Favourites" onClick={() => setFilter("favourites")} />
        <FilterButton active={filter === "highest-rated"} label="Highest Rated" onClick={() => setFilter("highest-rated")} />
      </section>

      {isEmpty ? (
        <section
          style={{
            maxWidth: 980,
            borderRadius: 28,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(18,18,18,0.97) 0%, rgba(9,9,9,0.96) 100%)",
            padding: "30px 30px 34px",
            boxShadow: "0 24px 70px rgba(0,0,0,0.22)",
          }}
        >
          <p
            style={{
              margin: 0,
              marginBottom: 10,
              color: "#7f7f7f",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontFamily: "Arial, sans-serif",
            }}
          >
            Nothing logged yet
          </p>
          <h2
            style={{
              margin: 0,
              fontSize: 34,
              lineHeight: 1.05,
              letterSpacing: "-1.2px",
              fontWeight: 500,
            }}
          >
            Your journal starts with the next film you log.
          </h2>
          <p
            style={{
              margin: "14px 0 0",
              color: "#d1d5db",
              fontSize: 17,
              lineHeight: 1.7,
              maxWidth: 760,
            }}
          >
            Add a title to your diary to build a premium feed of ratings,
            reviews, favourites, and watch dates here.
          </p>
        </section>
      ) : isFilteredEmpty ? (
        <section
          style={{
            maxWidth: 980,
            borderRadius: 24,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(18,18,18,0.96) 0%, rgba(10,10,10,0.96) 100%)",
            padding: 26,
          }}
        >
          <p style={{ margin: 0, color: "#d1d5db", fontSize: 17, lineHeight: 1.6 }}>
            No entries match this filter yet.
          </p>
        </section>
      ) : (
        <div className="diary-feed">
          {(Object.entries(groupedMovies) as Array<[TimeGroup, DiaryMovie[]]>).map(
            ([groupLabel, groupEntries]) =>
              groupEntries.length > 0 ? (
                <section key={groupLabel}>
                  <div className="diary-group-label">
                    {groupLabel} · {groupEntries.length}{" "}
                    {groupEntries.length === 1 ? "entry" : "entries"}
                  </div>

                  <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                    {groupEntries.map((movie) => {
                      const entryKey = getDiaryEntryKey(movie);
                      const isConfirmingDelete = pendingDeleteKey === entryKey;
                      const ratingNum = getRatingNumber(movie.rating);
                      const reviewSnippet =
                        movie.review.length > 120
                          ? `${movie.review.slice(0, 120)}…`
                          : movie.review;

                      return (
                        <article
                          key={entryKey}
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "0.5px solid rgba(255,255,255,0.08)",
                            borderRadius: 12,
                            padding: 12,
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
                                    {movie.favourite ? (
                                      <span style={{ color: "#f59e0b", fontSize: 13 }}>♥</span>
                                    ) : null}
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
                                    <p
                                      style={{
                                        margin: "8px 0 0",
                                        color: "rgba(255,255,255,0.82)",
                                        fontSize: 13,
                                      }}
                                    >
                                      ★ {(ratingNum / 2).toFixed(1)}
                                    </p>
                                  ) : null}

                                  {reviewSnippet ? (
                                    <p
                                      style={{
                                        margin: "8px 0 0",
                                        color: "rgba(255,255,255,0.68)",
                                        fontSize: 13,
                                        lineHeight: 1.55,
                                      }}
                                    >
                                      {reviewSnippet}
                                    </p>
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
                                    <span>{formatDiaryDate(movie.watchedDate)}</span>
                                    {movie.rewatch ? (
                                      <span
                                        style={{
                                          padding: "3px 8px",
                                          borderRadius: 999,
                                          background: "rgba(245,158,11,0.14)",
                                          border: "0.5px solid rgba(245,158,11,0.24)",
                                          color: "#f8c16d",
                                        }}
                                      >
                                        Rewatch
                                      </span>
                                    ) : null}
                                  </div>
                                </div>

                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  {isConfirmingDelete ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleDelete(movie)}
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
                                        onClick={() => setPendingDeleteKey(null)}
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
                                        onClick={() => handleEdit(movie)}
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
                                        onClick={() => setPendingDeleteKey(entryKey)}
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
                    })}
                  </div>
                </section>
              ) : null
          )}
        </div>
      )}
    </main>
  );
}
