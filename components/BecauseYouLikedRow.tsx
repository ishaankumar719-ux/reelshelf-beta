"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getDiaryMovies,
  subscribeToDiary,
  type DiaryMovie,
} from "../lib/diary";
import { getBookHrefFromRouteId } from "../lib/bookRoutes";
import { localBooks } from "../lib/localBooks";
import { localMovies } from "../lib/localMovies";
import { getMovieHrefFromRouteId } from "../lib/movieRoutes";
import { getTMDBPosterUrl } from "../lib/posters";
import { localSeries } from "../lib/localSeries";
import { getSeriesHrefFromRouteId } from "../lib/seriesRoutes";
import type { MediaType } from "../lib/media";

type RecommendationItem = {
  id: string;
  mediaType: MediaType;
  title: string;
  year: number;
  subtitle?: string;
  poster?: string | null;
  href: string;
  score: number;
};

function getMediaBadgeLabel(mediaType: MediaType) {
  if (mediaType === "movie") return "FILM";
  if (mediaType === "tv") return "SERIES";
  return "BOOK";
}

function getLocalCandidates(mediaType: MediaType): RecommendationItem[] {
  if (mediaType === "movie") {
    return localMovies.map((movie) => ({
      id: movie.id,
      mediaType: "movie" as const,
      title: movie.title,
      year: Number(movie.year),
      subtitle: movie.director,
      poster: movie.poster,
      href: getMovieHrefFromRouteId(movie.id),
      score: 0,
    }));
  }

  if (mediaType === "tv") {
    return localSeries.map((series) => ({
      id: series.id,
      mediaType: "tv" as const,
      title: series.title,
      year: Number(series.year),
      subtitle: series.creator,
      poster: getTMDBPosterUrl(series.posterPath ?? series.poster),
      href: getSeriesHrefFromRouteId(series.id),
      score: 0,
    }));
  }

  return localBooks.map((book) => ({
    id: book.id,
    mediaType: "book" as const,
    title: book.title,
    year: Number(book.year),
    subtitle: book.author,
    poster: null,
    href: getBookHrefFromRouteId(book.id),
    score: 0,
  }));
}

function CardFallback({ label }: { label: string }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 14,
        background:
          "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 55%), linear-gradient(180deg, #171717 0%, #0b0b0b 100%)",
      }}
    >
      <span
        style={{
          color: "rgba(255,255,255,0.36)",
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          fontFamily: "Arial, sans-serif",
        }}
      >
        ReelShelf
      </span>
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.58)",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function RecommendationCard({ item }: { item: RecommendationItem }) {
  return (
    <Link
      href={item.href}
      style={{
        textDecoration: "none",
        color: "inherit",
        width: 184,
        flexShrink: 0,
      }}
    >
      <article
        style={{
          borderRadius: 20,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "linear-gradient(180deg, rgba(20,20,20,0.96) 0%, rgba(10,10,10,0.96) 100%)",
          boxShadow: "0 18px 44px rgba(0,0,0,0.24)",
        }}
      >
        <div
          style={{
            position: "relative",
            aspectRatio: "2 / 3",
            background:
              "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 55%), linear-gradient(180deg, #151515 0%, #0b0b0b 100%)",
          }}
        >
          {item.poster ? (
            <img
              src={item.poster}
              alt={item.title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <CardFallback label={item.mediaType === "book" ? "B" : "R"} />
          )}

          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 38%, rgba(0,0,0,0.08) 68%, rgba(0,0,0,0.03) 100%)",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              padding: "7px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.34)",
              color: "white",
              fontSize: 10,
              lineHeight: 1,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontFamily: "Arial, sans-serif",
            }}
          >
            {getMediaBadgeLabel(item.mediaType)}
          </div>

          <div
            style={{
              position: "absolute",
              left: 14,
              right: 14,
              bottom: 14,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 18,
                lineHeight: 1.12,
                letterSpacing: "-0.5px",
                fontWeight: 600,
                color: "white",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {item.title}
            </h3>

            <p
              style={{
                margin: "7px 0 0",
                color: "rgba(255,255,255,0.76)",
                fontSize: 12,
                lineHeight: 1.5,
                fontFamily: "Arial, sans-serif",
                minHeight: 34,
              }}
            >
              {item.year || "—"}
              {item.subtitle ? ` · ${item.subtitle}` : ""}
            </p>
          </div>
        </div>
      </article>
    </Link>
  );
}

function getSeedEntries(entries: DiaryMovie[], mediaType: MediaType) {
  return entries
    .filter((entry) => entry.mediaType === mediaType)
    .filter(
      (entry) => entry.favourite || (typeof entry.rating === "number" && entry.rating >= 8)
    )
    .sort((a, b) => {
      const left = (a.favourite ? 2 : 0) + (a.rating || 0);
      const right = (b.favourite ? 2 : 0) + (b.rating || 0);
      return right - left;
    });
}

function buildCountMap(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return counts;
}

export default function BecauseYouLikedRow({
  mediaType,
  currentId,
  currentTitle,
  currentCreator,
  currentGenres = [],
  title,
  body,
}: {
  mediaType: MediaType;
  currentId?: string;
  currentTitle?: string;
  currentCreator?: string;
  currentGenres?: string[];
  title?: string;
  body?: string;
}) {
  const [entries, setEntries] = useState<DiaryMovie[]>([]);

  useEffect(() => {
    setEntries(getDiaryMovies());
    return subscribeToDiary(() => setEntries(getDiaryMovies()));
  }, []);

  const { seedTitle, recommendations } = useMemo(() => {
    const seedEntries = getSeedEntries(entries, mediaType);
    const creatorCounts = buildCountMap(
      seedEntries.map((entry) => entry.director).filter(Boolean) as string[]
    );
    const genreCounts = buildCountMap(
      seedEntries.flatMap((entry) => entry.genres || []).filter(Boolean)
    );

    const scored = getLocalCandidates(mediaType)
      .filter((candidate) => candidate.id !== currentId)
      .map((candidate) => {
        let score = 0;

        if (candidate.subtitle && creatorCounts.has(candidate.subtitle)) {
          score += 4 * (creatorCounts.get(candidate.subtitle) || 0);
        }

        for (const genre of currentGenres) {
          if (genreCounts.has(genre)) {
            score += 2 * (genreCounts.get(genre) || 0);
          }
        }

        if (currentCreator && candidate.subtitle === currentCreator) {
          score += 5;
        }

        if (seedEntries.some((entry) => entry.id === candidate.id)) {
          score -= 100;
        }

        return { ...candidate, score };
      })
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return a.title.localeCompare(b.title);
      })
      .slice(0, 8);

    return {
      seedTitle: currentTitle || seedEntries[0]?.title || null,
      recommendations: scored,
    };
  }, [currentCreator, currentGenres, currentId, currentTitle, entries, mediaType]);

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <section style={{ marginTop: 34 }}>
      <h2
        style={{
          margin: "0 0 6px",
          fontSize: 24,
          letterSpacing: "-0.8px",
          fontWeight: 500,
        }}
      >
        {title || `Because you liked ${seedTitle || "this"}`}
      </h2>

      <p
        style={{
          margin: "0 0 18px",
          color: "#9ca3af",
          fontSize: 14,
          lineHeight: 1.6,
          fontFamily: "Arial, sans-serif",
        }}
      >
        {body ||
          "Picked from your diary favourites and higher-rated entries to match your taste."}
      </p>

      <div
        style={{
          display: "flex",
          gap: 16,
          overflowX: "auto",
          paddingBottom: 6,
        }}
      >
        {recommendations.map((item) => (
          <RecommendationCard key={`${item.mediaType}-${item.id}`} item={item} />
        ))}
      </div>
    </section>
  );
}
