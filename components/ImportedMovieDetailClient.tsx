"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AddToDiaryButton from "./AddToDiaryButton";
import AddToWatchlistButton from "./AddToWatchlistButton";
import TrackRecentView from "./TrackRecentView";
import { useAuth } from "./AuthProvider";
import { getDiaryMovie, type DiaryMovie } from "../lib/diary";
import { createClient as createSupabaseBrowserClient } from "../lib/supabase/client";
import { DIARY_SELECT } from "../lib/queries";

type ImportedMovieRow = {
  media_id: string;
  title: string;
  poster: string | null;
  year: number;
  creator: string | null;
  review: string;
  rating: number | null;
  watched_date: string;
  favourite: boolean;
  rewatch?: boolean | null;
  contains_spoilers?: boolean | null;
  saved_at: string;
};

function formatWatchedDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ImportedMovieDetailClient({
  movieId,
}: {
  movieId: string;
}) {
  const { user, loading } = useAuth();
  const [movie, setMovie] = useState<DiaryMovie | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadMovie() {
      const localMovie = getDiaryMovie(movieId, "movie");

      if (localMovie) {
        if (!cancelled) {
          setMovie(localMovie);
          setNotFound(false);
        }
        return;
      }

      if (!user) {
        if (!cancelled && !loading) {
          setNotFound(true);
        }
        return;
      }

      const client = createSupabaseBrowserClient();

      if (!client) {
        if (!cancelled) {
          setNotFound(true);
        }
        return;
      }

      const { data, error } = await client
        .from("diary_entries")
        .select(DIARY_SELECT)
        .eq("user_id", user.id)
        .eq("media_type", "movie")
        .eq("media_id", movieId)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error || !data) {
        setNotFound(true);
        return;
      }

      const row = data as unknown as ImportedMovieRow;
      setMovie({
        id: row.media_id,
        mediaType: "movie",
        title: row.title,
        poster: row.poster || undefined,
        year: Number(row.year) || 0,
        director: row.creator || undefined,
        genres: [],
        runtime: undefined,
        voteAverage: undefined,
        rating: typeof row.rating === "number" ? row.rating : null,
        review: row.review || "",
        watchedDate: row.watched_date,
        favourite: row.favourite,
        rewatch: Boolean(row.rewatch),
        containsSpoilers: Boolean(row.contains_spoilers),
        watchedInCinema: false,
        savedAt: row.saved_at,
      });
      setNotFound(false);
    }

    void loadMovie();

    return () => {
      cancelled = true;
    };
  }, [loading, movieId, user]);

  if (!movie && (loading || user)) {
    return (
      <main style={{ padding: "0 0 80px" }}>
        <div
          style={{
            borderRadius: 28,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(18,18,18,0.98) 0%, rgba(8,8,8,0.98) 100%)",
            padding: "28px 24px",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#a1a1aa",
              fontSize: 15,
              lineHeight: 1.7,
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            Loading imported diary entry...
          </p>
        </div>
      </main>
    );
  }

  if (!movie || notFound) {
    return (
      <main style={{ padding: "0 0 80px" }}>
        <section
          style={{
            borderRadius: 28,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(18,18,18,0.98) 0%, rgba(8,8,8,0.98) 100%)",
            padding: "32px 28px",
          }}
        >
          <p
            style={{
              margin: "0 0 10px",
              color: "#7f7f7f",
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            Imported Film
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: 40,
              lineHeight: 1.02,
              letterSpacing: "-1.4px",
              fontWeight: 600,
            }}
          >
            This imported diary entry is not available right now.
          </h1>
          <p
            style={{
              margin: "16px 0 0",
              maxWidth: 720,
              color: "#c7c7c7",
              fontSize: 16,
              lineHeight: 1.7,
            }}
          >
            If you imported this while signed out, open your diary on the same
            device again. If you expected it to sync from your account, sign in and
            try once more.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 22 }}>
            <Link
              href="/diary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 42,
                padding: "0 16px",
                borderRadius: 999,
                background: "white",
                color: "black",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              }}
            >
              Back to Diary
            </Link>
            <Link
              href="/import/letterboxd"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 42,
                padding: "0 16px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                color: "white",
                textDecoration: "none",
                fontSize: 14,
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              }}
            >
              Import Again
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main style={{ padding: "0 0 80px" }}>
      <TrackRecentView
        item={{
          id: movie.id,
          mediaType: "movie",
          title: movie.title,
          poster: movie.poster,
          year: movie.year,
          director: movie.director,
          genres: movie.genres,
          runtime: movie.runtime,
          voteAverage: movie.voteAverage,
        }}
      />

      <Link
        href="/diary"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 28,
          padding: "10px 14px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
          color: "#d1d5db",
          textDecoration: "none",
          fontSize: 13,
          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
          lineHeight: 1,
        }}
      >
        <span style={{ fontSize: 14 }}>←</span>
        <span>Back to Diary</span>
      </Link>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          gap: 32,
          alignItems: "start",
        }}
      >
        <div
          style={{
            position: "relative",
            aspectRatio: "2 / 3",
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 55%), linear-gradient(180deg, #151515 0%, #0b0b0b 100%)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
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
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                padding: 24,
                textAlign: "center",
                color: "rgba(255,255,255,0.72)",
                fontSize: 20,
                lineHeight: 1.35,
                letterSpacing: "-0.3px",
              }}
            >
              Imported
              <br />
              Letterboxd Log
            </div>
          )}
        </div>

        <div>
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
            Imported Film
          </p>

          <h1
            style={{
              margin: 0,
              fontSize: 56,
              lineHeight: 1.02,
              letterSpacing: "-2px",
              fontWeight: 500,
            }}
          >
            {movie.title}
          </h1>

          <p
            style={{
              marginTop: 14,
              marginBottom: 0,
              color: "#aaaaaa",
              fontSize: 16,
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            {movie.year || "—"} · Logged from Letterboxd
            {movie.director ? ` · ${movie.director}` : ""}
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 22,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 36,
                padding: "0 14px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
                color: "white",
                fontSize: 13,
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              }}
            >
              {movie.rating !== null ? `${movie.rating.toFixed(1)} / 10` : "No rating"}
            </span>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 36,
                padding: "0 14px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
                color: "white",
                fontSize: 13,
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              }}
            >
              {formatWatchedDate(movie.watchedDate)}
            </span>

            {movie.favourite ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 36,
                  padding: "0 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  color: "white",
                  fontSize: 13,
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                }}
              >
                Favourite
              </span>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              gap: 14,
              marginTop: 30,
              marginBottom: 36,
            }}
          >
            <AddToDiaryButton
              movie={{
                id: movie.id,
                mediaType: "movie",
                title: movie.title,
                year: movie.year,
                poster: movie.poster,
                director: movie.director,
                genres: movie.genres,
                runtime: movie.runtime,
                voteAverage: movie.voteAverage,
              }}
            />

            <AddToWatchlistButton
              movie={{
                id: movie.id,
                mediaType: "movie",
                title: movie.title,
                year: movie.year,
                poster: movie.poster,
                director: movie.director,
                genres: movie.genres,
                runtime: movie.runtime,
                voteAverage: movie.voteAverage,
              }}
            />
          </div>

          <section
            style={{
              borderRadius: 24,
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
              padding: 22,
            }}
          >
            <p
              style={{
                margin: "0 0 10px",
                color: "#7f7f7f",
                fontSize: 11,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              }}
            >
              Review
            </p>
            <p
              style={{
                margin: 0,
                color: "#d1d5db",
                lineHeight: 1.8,
                fontSize: 17,
              }}
            >
              {movie.review.trim() || "No written review was included in this import."}
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
