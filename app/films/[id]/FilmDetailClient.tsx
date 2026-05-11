"use client";

import { useEffect, useMemo, useState } from "react";
import CastSection, { type CastMember } from "../../../components/detail/CastSection";
import { createClient as createSupabaseClient } from "../../../lib/supabase/client";
import { useDiaryLog } from "../../../hooks/useDiaryLog";
import MediaReviewsSection from "../../../components/reviews/MediaReviewsSection";

interface TMDBFilm {
  id: number;
  title: string;
  overview: string;
  tagline: string | null;
  backdrop_path: string | null;
  poster_path: string | null;
  release_date: string;
  runtime: number | null;
  vote_average: number;
  genres: { id: number; name: string }[];
}

interface DiaryEntry {
  id: string;
  rating: number | string | null;
  reelshelf_score?: number | null;
  review: string;
  watched_date: string;
  favourite: boolean;
  media_id: string;
}

interface FilmDetailClientProps {
  film: TMDBFilm;
  topCast: CastMember[];
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function formatLoggedDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ActionButton({
  children,
  onClick,
  style,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  style: React.CSSProperties;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 20px",
        borderRadius: 10,
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        gap: 6,
        border: "none",
        cursor: disabled ? "default" : "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export default function FilmDetailClient({
  film,
  topCast,
}: FilmDetailClientProps) {
  const { openLog } = useDiaryLog();
  const [diaryEntry, setDiaryEntry] = useState<DiaryEntry | null>(null);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [watchlistItemId, setWatchlistItemId] = useState<string | null>(null);
  const [personalLoaded, setPersonalLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPersonalData() {
      const supabase = createSupabaseClient();

      if (!supabase) {
        if (!cancelled) {
          setPersonalLoaded(true);
        }
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (!cancelled) {
          setPersonalLoaded(true);
        }
        return;
      }

      const userId = session.user.id;
      const tmdbMediaId = `tmdb-${film.id}`;
      const titleYearSlug = `${slugify(film.title)}-${film.release_date?.slice(0, 4)}`;
      const bareSlug = slugify(film.title);

      const { data: diaryEntries } = await supabase
        .from("diary_entries")
        .select("id, rating, review, watched_date, favourite, media_id, reelshelf_score")
        .eq("user_id", userId)
        .eq("review_scope", "show")
        .or(`media_id.eq.${tmdbMediaId},media_id.eq.${titleYearSlug}`)
        .order("watched_date", { ascending: false })
        .limit(1);

      const { data: watchlistItems } = await supabase
        .from("saved_items")
        .select("id, media_id")
        .eq("user_id", userId)
        .eq("list_type", "watchlist")
        .or(`media_id.eq.${tmdbMediaId},media_id.eq.${bareSlug}`);

      if (cancelled) {
        return;
      }

      setDiaryEntry((((diaryEntries ?? [])[0] as unknown) as DiaryEntry) ?? null);
      setIsWatchlisted((watchlistItems?.length ?? 0) > 0);
      setWatchlistItemId(watchlistItems?.[0]?.id ?? null);
      setPersonalLoaded(true);
    }

    void loadPersonalData();

    return () => {
      cancelled = true;
    };
  }, [film.id, film.release_date, film.title]);

  const heroBackdrop = film.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${film.backdrop_path}`
    : null;
  const posterUrl = film.poster_path
    ? `https://image.tmdb.org/t/p/w500${film.poster_path}`
    : null;
  const year = film.release_date?.slice(0, 4) ?? "";
  const metaLine = [year, film.runtime ? `${film.runtime}m` : null, film.genres?.slice(0, 2).map((genre) => genre.name).join(" · ")]
    .filter(Boolean)
    .join(" · ");

  const coercedRating =
    diaryEntry && diaryEntry.rating !== null
      ? typeof diaryEntry.rating === "string"
        ? parseFloat(diaryEntry.rating)
        : diaryEntry.rating
      : null;

  const toggleWatchlist = async () => {
    const supabase = createSupabaseClient();

    if (!supabase) {
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return;
    }

    if (isWatchlisted && watchlistItemId) {
      setIsWatchlisted(false);
      setWatchlistItemId(null);

      const { error } = await supabase
        .from("saved_items")
        .delete()
        .eq("id", watchlistItemId);

      if (error) {
        console.error("[FILM DETAIL] watchlist remove error:", error.message);
        setIsWatchlisted(true);
      }
    } else {
      setIsWatchlisted(true);

      const mediaId = `tmdb-${film.id}`;
      const { data, error } = await supabase
        .from("saved_items")
        .insert({
          user_id: session.user.id,
          list_type: "watchlist",
          media_id: mediaId,
          media_type: "movie",
          title: film.title,
          poster: posterUrl,
          year: parseInt(film.release_date?.slice(0, 4) ?? "0", 10),
          creator: null,
          genres: film.genres?.map((genre) => genre.name) ?? [],
          runtime: film.runtime ?? null,
          vote_average: film.vote_average ?? null,
        })
        .select("id")
        .single();

      if (error) {
        console.error("[FILM DETAIL] watchlist add error:", error.message);
        setIsWatchlisted(false);
      } else {
        setWatchlistItemId(data.id);
      }
    }
  };

  const contentWrapperStyle: React.CSSProperties = useMemo(
    () => ({
      maxWidth: "1020px",
      margin: "0 auto",
      padding: "0 20px 56px",
    }),
    []
  );

  return (
    <main style={{ background: "#08080f", minHeight: "100vh", color: "white" }}>
      <section
        style={{
          position: "relative",
          minHeight: "70vh",
          display: "flex",
          alignItems: "flex-end",
          overflow: "hidden",
          background: heroBackdrop
            ? "#08080f"
            : "linear-gradient(180deg, #0a0a18 0%, #12122a 100%)",
        }}
      >
        {heroBackdrop ? (
          <img
            src={heroBackdrop}
            alt={film.title}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center top",
            }}
          />
        ) : null}

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(8,8,20,0.3) 0%, rgba(8,8,20,0.1) 30%, rgba(8,8,20,0.6) 65%, rgba(8,8,20,1.0) 100%)",
          }}
        />

        <div
          style={{
            ...contentWrapperStyle,
            position: "relative",
            zIndex: 10,
            width: "100%",
            paddingBottom: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 20,
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: 130,
                aspectRatio: "2 / 3",
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 28px 60px rgba(0,0,0,0.38)",
                background: "#111122",
                flexShrink: 0,
              }}
            >
              {posterUrl ? (
                <img
                  src={posterUrl}
                  alt={film.title}
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
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,255,255,0.18)",
                    fontSize: 40,
                    fontWeight: 700,
                  }}
                >
                  {film.title.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0, paddingBottom: 6 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(26px, 5vw, 36px)",
                  lineHeight: 1.1,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.95)",
                }}
              >
                {film.title}
              </h1>

              {film.tagline ? (
                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: 15,
                    fontStyle: "italic",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  {film.tagline}
                </p>
              ) : null}

              <p
                style={{
                  margin: "14px 0 0",
                  fontSize: 13,
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                {metaLine}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div style={contentWrapperStyle}>
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginTop: -18,
            marginBottom: 24,
            position: "relative",
            zIndex: 2,
          }}
        >
          <ActionButton
            onClick={() =>
              openLog({
                title: film.title,
                media_type: "movie",
                year: parseInt(year || "0", 10),
                poster: posterUrl,
                tmdb_id: film.id,
              })
            }
            style={{
              background: "#1D9E75",
              color: "white",
              fontWeight: 600,
            }}
          >
            <span>＋</span>
            <span>Log this</span>
          </ActionButton>

          <ActionButton
            onClick={() => void toggleWatchlist()}
            style={
              isWatchlisted
                ? {
                    background: "rgba(255,255,255,0.15)",
                    border: "0.5px solid rgba(255,255,255,0.4)",
                    color: "rgba(255,255,255,0.9)",
                  }
                : {
                    background: "rgba(255,255,255,0.08)",
                    border: "0.5px solid rgba(255,255,255,0.2)",
                    color: "rgba(255,255,255,0.82)",
                  }
            }
          >
            <span>{isWatchlisted ? "🔖" : "⌑"}</span>
            <span>{isWatchlisted ? "Watchlisted" : "Watchlist"}</span>
          </ActionButton>

          <ActionButton
            disabled
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "0.5px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.75)",
              opacity: 0.5,
            }}
          >
            <span>♡</span>
            <span>Favourite</span>
          </ActionButton>
        </div>

        {personalLoaded ? (
          diaryEntry ? (
            <div
              style={{
                borderLeft: "2px solid #1D9E75",
                paddingLeft: 16,
                margin: "24px 0",
              }}
            >
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div>
                  <p
                    style={{
                      margin: "0 0 4px",
                      fontSize: 10,
                      letterSpacing: "0.03em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.3)",
                    }}
                  >
                    Your Rating
                  </p>
                  <p style={{ margin: 0 }}>
                    <span
                      style={{
                        color: "rgba(255,255,255,0.9)",
                        fontSize: 20,
                        fontWeight: 300,
                        letterSpacing: "-0.5px",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {(coercedRating ?? 0).toFixed(1)}
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, fontWeight: 400, marginLeft: 4 }}>/ 10</span>
                  </p>
                </div>

                {typeof diaryEntry.reelshelf_score === "number" &&
                diaryEntry.reelshelf_score !== coercedRating ? (
                  <div>
                    <p
                      style={{
                        margin: "0 0 4px",
                        fontSize: 10,
                        letterSpacing: "0.03em",
                        textTransform: "uppercase",
                        color: "rgba(255,255,255,0.3)",
                      }}
                    >
                      ReelShelf Score
                    </p>
                    <p style={{ margin: 0 }}>
                      <span
                        style={{
                          color: "#EF9F27",
                          fontSize: 20,
                          fontWeight: 300,
                          letterSpacing: "-0.5px",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {diaryEntry.reelshelf_score.toFixed(1)}
                      </span>
                      <span style={{ color: "rgba(239,159,39,0.45)", fontSize: 14, fontWeight: 400, marginLeft: 4 }}>/ 10</span>
                    </p>
                  </div>
                ) : null}
              </div>

              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 13,
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                Logged {formatLoggedDate(diaryEntry.watched_date)}
              </p>

              {diaryEntry.review && diaryEntry.review.trim() !== "" ? (
                <div style={{ marginTop: 10 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.35)",
                    }}
                  >
                    Your thoughts
                  </p>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 14,
                      color: "rgba(255,255,255,0.7)",
                      fontStyle: "italic",
                      lineHeight: 1.6,
                    }}
                  >
                    {diaryEntry.review}
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <p
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.3)",
                fontStyle: "italic",
                margin: "20px 0",
              }}
            >
              You haven't logged this yet
            </p>
          )
        ) : null}

        <section style={{ maxWidth: 680, margin: "28px 0" }}>
          <h2
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.35)",
              marginBottom: 12,
            }}
          >
            Overview
          </h2>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.7,
              color: "rgba(255,255,255,0.72)",
              margin: 0,
            }}
          >
            {film.overview}
          </p>
        </section>

        {topCast.length > 0 ? <CastSection cast={topCast} /> : null}

        <MediaReviewsSection
          mediaIds={[`tmdb-${film.id}`, `${slugify(film.title)}-${year}`]}
          mediaType="movie"
          title={film.title}
          year={parseInt(year || "0", 10)}
          poster={posterUrl}
          creator={null}
          href={`/films/${film.id}`}
        />
      </div>
    </main>
  );
}
