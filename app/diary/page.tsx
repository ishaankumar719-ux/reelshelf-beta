"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
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

function formatDiaryDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDiaryRating(rating: number | null) {
  return typeof rating === "number" ? `${rating.toFixed(1)} ★` : "No rating";
}

function getMediaBadgeLabel(mediaType: MediaType) {
  if (mediaType === "movie") return "FILM";
  if (mediaType === "tv") return "SERIES";
  return "BOOK";
}

function sortByNewest(entries: DiaryMovie[]) {
  return [...entries].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

function sortByHighestRated(entries: DiaryMovie[]) {
  return [...entries].sort((a, b) => {
    const left = typeof a.rating === "number" ? a.rating : -1;
    const right = typeof b.rating === "number" ? b.rating : -1;

    if (right !== left) {
      return right - left;
    }

    return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
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

  const isEmpty = movies.length === 0;
  const isFilteredEmpty = !isEmpty && filteredMovies.length === 0;

  function handleEdit(movie: DiaryMovie) {
    saveDiaryDraft({
      id: movie.id,
      mediaType: movie.mediaType,
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
    removeDiaryEntry(movie.id, movie.mediaType);
    setMovies(getDiaryMovies());
    setPendingDeleteKey(null);
  }

  return (
    <main style={{ padding: "12px 0 44px" }}>
      <style>{`
        .diary-feed {
          display: grid;
          gap: 18px;
          max-width: 1020px;
        }

        .diary-card-shell {
          display: grid;
          grid-template-columns: 128px minmax(0, 1fr);
          gap: 20px;
          align-items: start;
        }

        @media (max-width: 720px) {
          .diary-card-shell {
            grid-template-columns: 96px minmax(0, 1fr);
            gap: 14px;
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
              fontSize: 52,
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
              fontSize: 15,
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
        <FilterButton
          active={mediaFilter === "all"}
          label="All"
          onClick={() => setMediaFilter("all")}
        />
        <FilterButton
          active={mediaFilter === "movie"}
          label="Films"
          onClick={() => setMediaFilter("movie")}
        />
        <FilterButton
          active={mediaFilter === "tv"}
          label="Series"
          onClick={() => setMediaFilter("tv")}
        />
        <FilterButton
          active={mediaFilter === "book"}
          label="Books"
          onClick={() => setMediaFilter("book")}
        />
      </section>

      <section
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <FilterButton
          active={filter === "recent" || filter === "all"}
          label="Recent"
          onClick={() => setFilter("recent")}
        />
        <FilterButton
          active={filter === "favourites"}
          label="Favourites"
          onClick={() => setFilter("favourites")}
        />
        <FilterButton
          active={filter === "highest-rated"}
          label="Highest Rated"
          onClick={() => setFilter("highest-rated")}
        />
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
          <p
            style={{
              margin: 0,
              color: "#d1d5db",
              fontSize: 17,
              lineHeight: 1.6,
            }}
          >
            No entries match this filter yet.
          </p>
        </section>
      ) : (
        <div className="diary-feed">
          {filteredMovies.map((movie) => (
            (() => {
              const entryKey = `${movie.mediaType}-${movie.id}`;
              const isConfirmingDelete = pendingDeleteKey === entryKey;

              return (
            <article
              key={entryKey}
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 30,
                padding: 18,
                background:
                  "linear-gradient(180deg, rgba(18,18,18,0.98) 0%, rgba(8,8,8,0.96) 100%)",
                boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 12,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    minHeight: 16,
                    color: "#9ca3af",
                    fontSize: 12,
                    lineHeight: 1.5,
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  {isConfirmingDelete
                    ? "Delete this diary entry?"
                    : null}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  {isConfirmingDelete ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDelete(movie)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(255,255,255,0.12)",
                          color: "white",
                          fontSize: 11,
                          lineHeight: 1,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          fontFamily: "Arial, sans-serif",
                          cursor: "pointer",
                        }}
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteKey(null)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(255,255,255,0.04)",
                          color: "#e5e7eb",
                          fontSize: 11,
                          lineHeight: 1,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          fontFamily: "Arial, sans-serif",
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
                          padding: "8px 12px",
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(255,255,255,0.04)",
                          color: "#e5e7eb",
                          fontSize: 11,
                          lineHeight: 1,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          fontFamily: "Arial, sans-serif",
                          cursor: "pointer",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteKey(entryKey)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(255,255,255,0.04)",
                          color: "#f3caca",
                          fontSize: 11,
                          lineHeight: 1,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          fontFamily: "Arial, sans-serif",
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              <Link
                href={getMediaHref({ id: movie.id, mediaType: movie.mediaType })}
                style={{ textDecoration: "none", color: "inherit", display: "block" }}
              >
                <div className="diary-card-shell">
                  <div
                    style={{
                      position: "relative",
                      aspectRatio: "2 / 3",
                      borderRadius: 20,
                      overflow: "hidden",
                      background:
                        "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 55%), linear-gradient(180deg, #151515 0%, #0b0b0b 100%)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      boxShadow: "0 16px 30px rgba(0,0,0,0.3)",
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

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "start",
                        gap: 14,
                        marginBottom: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            color: "#7f7f7f",
                            fontSize: 10,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            fontFamily: "Arial, sans-serif",
                          }}
                        >
                          Diary Entry
                        </span>

                        <span
                          style={{
                            padding: "7px 11px",
                            borderRadius: 999,
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "#e5e7eb",
                            fontSize: 11,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            fontFamily: "Arial, sans-serif",
                            lineHeight: 1,
                          }}
                        >
                          {getMediaBadgeLabel(movie.mediaType)}
                        </span>

                        {movie.favourite ? (
                          <span
                            style={{
                              padding: "7px 11px",
                              borderRadius: 999,
                              background:
                                "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.08) 100%)",
                              border: "1px solid rgba(255,255,255,0.14)",
                              color: "white",
                              fontSize: 11,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              fontFamily: "Arial, sans-serif",
                              lineHeight: 1,
                            }}
                          >
                            Favourite
                          </span>
                        ) : null}
                      </div>

                      <div
                        style={{
                          padding: "10px 14px",
                          borderRadius: 999,
                          background:
                            "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "white",
                          fontSize: 24,
                          lineHeight: 1,
                          letterSpacing: "-0.8px",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDiaryRating(movie.rating)}
                      </div>
                    </div>

                    <h2
                      style={{
                        margin: "0 0 8px",
                        fontSize: 30,
                        lineHeight: 1.04,
                        letterSpacing: "-1px",
                        fontWeight: 500,
                      }}
                    >
                      {movie.title}
                    </h2>

                    <p
                      style={{
                        margin: "0 0 16px",
                        color: "#9ca3af",
                        fontSize: 14,
                        lineHeight: 1.6,
                        fontFamily: "Arial, sans-serif",
                      }}
                    >
                      {movie.year || "—"}
                      {movie.director ? ` · ${movie.director}` : ""}
                    </p>

                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 16,
                        padding: "10px 12px",
                        borderRadius: 16,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <span
                        style={{
                          color: "#7f7f7f",
                          fontSize: 10,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          fontFamily: "Arial, sans-serif",
                        }}
                      >
                        Watched
                      </span>
                      <span
                        style={{
                          color: "#f3f4f6",
                          fontSize: 14,
                          fontFamily: "Arial, sans-serif",
                        }}
                      >
                        {formatDiaryDate(movie.watchedDate)}
                      </span>
                    </div>

                    <div
                      style={{
                        borderRadius: 22,
                        border: "1px solid rgba(255,255,255,0.07)",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
                        padding: "16px 18px",
                        marginBottom: 16,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          marginBottom: 10,
                          color: "#7f7f7f",
                          fontSize: 10,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          fontFamily: "Arial, sans-serif",
                        }}
                      >
                        Review
                      </p>
                      <p
                        style={{
                          margin: 0,
                          color: "#dfdfdf",
                          fontSize: 15,
                          lineHeight: 1.8,
                          fontFamily: "Georgia, serif",
                          display: "-webkit-box",
                          WebkitLineClamp: 5,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {movie.review || "No written review yet."}
                      </p>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        flexWrap: "wrap",
                        paddingTop: 12,
                        borderTop: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          color: "#7f7f7f",
                          fontSize: 12,
                          fontFamily: "Arial, sans-serif",
                        }}
                      >
                        Saved {formatDiaryDate(movie.savedAt)}
                      </p>

                      <p
                        style={{
                          margin: 0,
                          color: "#d1d5db",
                          fontSize: 12,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          fontFamily: "Arial, sans-serif",
                        }}
                      >
                        Open details
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </article>
              );
            })()
          ))}
        </div>
      )}
    </main>
  );
}
