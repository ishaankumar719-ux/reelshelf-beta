"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getDiaryEntryKey,
  getDiaryMovies,
  removeDiaryEntry,
  subscribeToDiary,
  type DiaryMovie,
} from "../../lib/diary";
import { EMPTY_REVIEW_LAYERS } from "../../types/diary";
import DiaryEntryCard from "../../components/diary/DiaryEntryCard";
import { useDiaryLog } from "../../hooks/useDiaryLog";
import type { MediaType } from "../../lib/media";

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

function sortByNewest(entries: DiaryMovie[]) {
  return [...entries].sort(
    (a, b) => new Date(b.watchedDate).getTime() - new Date(a.watchedDate).getTime()
  );
}

function sortByHighestRated(entries: DiaryMovie[]) {
  return [...entries].sort((a, b) => {
    const left = typeof a.rating === "number" ? a.rating : -1;
    const right = typeof b.rating === "number" ? b.rating : -1;

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
        fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
        transition: "all 0.2s ease",
      }}
    >
      {label}
    </button>
  );
}

export default function DiaryPage() {
  const { openLog } = useDiaryLog();
  const [movies, setMovies] = useState<Array<DiaryMovie & { isNew?: boolean }>>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [mediaFilter, setMediaFilter] = useState<MediaFilterType>("all");
  const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null);

  useEffect(() => {
    setMovies(getDiaryMovies());

    return subscribeToDiary(() => {
      const nextMovies = getDiaryMovies();
      let newestKey: string | null = null;

      setMovies((current) => {
        const currentKeys = new Set(current.map((entry) => getDiaryEntryKey(entry)));
        const nextKey = nextMovies.length > 0 ? getDiaryEntryKey(nextMovies[0]) : null;

        if (nextKey && !currentKeys.has(nextKey)) {
          newestKey = nextKey;
          return nextMovies.map((entry) =>
            getDiaryEntryKey(entry) === nextKey ? { ...entry, isNew: true } : entry
          );
        }

        return nextMovies;
      });

      if (newestKey) {
        window.setTimeout(() => {
          setMovies((current) =>
            current.map((entry) =>
              getDiaryEntryKey(entry) === newestKey ? { ...entry, isNew: false } : entry
            )
          );
        }, 600);
      }
    });
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
    openLog(
      {
        title: movie.title,
        media_type: movie.mediaType,
        year: movie.year,
        poster: movie.poster ?? null,
        creator: movie.director ?? null,
        genres: movie.genres,
        runtime: movie.runtime ?? null,
        vote_average: movie.voteAverage ?? null,
        media_id: movie.id,
      },
      {
        rating: movie.rating,
        review: movie.review,
        watchedDate: movie.watchedDate,
        favourite: movie.favourite,
        rewatch: movie.rewatch,
        containsSpoilers: movie.containsSpoilers,
        reviewLayers: movie.reviewLayers ?? EMPTY_REVIEW_LAYERS,
      }
    );
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

        @keyframes entrySlideIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
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
              color: "rgba(255,255,255,0.34)",
              fontSize: 10,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
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
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
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
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
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
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
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

                      return (
                        <DiaryEntryCard
                          key={entryKey}
                          movie={movie}
                          isConfirmingDelete={isConfirmingDelete}
                          onEdit={() => handleEdit(movie)}
                          onDeleteStart={() => setPendingDeleteKey(entryKey)}
                          onDeleteConfirm={() => handleDelete(movie)}
                          onDeleteCancel={() => setPendingDeleteKey(null)}
                          formatDiaryDate={formatDiaryDate}
                        />
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
