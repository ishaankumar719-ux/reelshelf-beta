"use client";

import { useEffect, useMemo, useState } from "react";
import CastSection, { type CastMember } from "../../../components/detail/CastSection";
import ShareButton from "../../../components/detail/ShareButton";
import { createClient as createSupabaseClient } from "../../../lib/supabase/client";
import { useDiaryLog } from "../../../hooks/useDiaryLog";
import MediaReviewsSection from "../../../components/reviews/MediaReviewsSection";
import { WhereToWatch } from "../../../components/WhereToWatch";
import type { WatchProvider } from "../../../components/WhereToWatch";

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
  original_language?: string;
  production_companies?: Array<{ id: number; name: string }>;
}

interface DiaryEntry {
  id: string;
  rating: number | string | null;
  reelshelf_score?: number | null;
  review: string;
  watched_date: string;
  favourite: boolean;
  rewatch: boolean;
  media_id: string;
}

interface CollectionSummary {
  slug: string;
  name: string;
  description: string;
}

interface FilmRec {
  id: number;
  title: string;
  year: string;
  poster_path: string | null;
  reason?: string;
}

interface FilmDetailClientProps {
  film: TMDBFilm;
  topCast: CastMember[];
  watchProviders: { flatrate: WatchProvider[] };
  recommendations?: FilmRec[];
  matchingCollections?: CollectionSummary[];
}

const SANS = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif';
const SERIF = 'Georgia,"Times New Roman",Times,serif';

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

function formatLanguage(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
      <span
        style={{
          fontFamily: SANS,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.28)",
          flexShrink: 0,
          width: 88,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: SANS,
          fontSize: 13,
          color: "rgba(255,255,255,0.72)",
          lineHeight: 1.5,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function FilmDetailClient({
  film,
  topCast,
  watchProviders,
  recommendations = [],
  matchingCollections = [],
}: FilmDetailClientProps) {
  const { openLog } = useDiaryLog();
  const [diaryEntry, setDiaryEntry] = useState<DiaryEntry | null>(null);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [watchlistItemId, setWatchlistItemId] = useState<string | null>(null);
  const [isFavourited, setIsFavourited] = useState(false);
  const [personalLoaded, setPersonalLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPersonalData() {
      const supabase = createSupabaseClient();
      if (!supabase) { if (!cancelled) setPersonalLoaded(true); return; }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { if (!cancelled) setPersonalLoaded(true); return; }

      const userId = session.user.id;
      const tmdbMediaId = `tmdb-${film.id}`;
      const titleYearSlug = `${slugify(film.title)}-${film.release_date?.slice(0, 4)}`;
      const bareSlug = slugify(film.title);

      const [{ data: diaryEntries }, { data: watchlistItems }] = await Promise.all([
        supabase
          .from("diary_entries")
          .select("id, rating, review, watched_date, favourite, rewatch, media_id, reelshelf_score")
          .eq("user_id", userId)
          .eq("review_scope", "show")
          .or(`media_id.eq.${tmdbMediaId},media_id.eq.${titleYearSlug}`)
          .order("watched_date", { ascending: false })
          .limit(1),
        supabase
          .from("saved_items")
          .select("id, media_id")
          .eq("user_id", userId)
          .eq("list_type", "watchlist")
          .or(`media_id.eq.${tmdbMediaId},media_id.eq.${bareSlug}`),
      ]);

      if (cancelled) return;

      const entry = ((diaryEntries ?? [])[0] as unknown as DiaryEntry) ?? null;
      setDiaryEntry(entry);
      setIsFavourited(entry?.favourite ?? false);
      setIsWatchlisted((watchlistItems?.length ?? 0) > 0);
      setWatchlistItemId(watchlistItems?.[0]?.id ?? null);
      setPersonalLoaded(true);
    }

    void loadPersonalData();
    return () => { cancelled = true; };
  }, [film.id, film.release_date, film.title]);

  const heroBackdrop = film.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${film.backdrop_path}`
    : null;
  const posterUrl = film.poster_path
    ? `https://image.tmdb.org/t/p/w500${film.poster_path}`
    : null;
  const year = film.release_date?.slice(0, 4) ?? "";

  const coercedRating =
    diaryEntry?.rating !== null && diaryEntry?.rating !== undefined
      ? typeof diaryEntry.rating === "string"
        ? parseFloat(diaryEntry.rating)
        : diaryEntry.rating
      : null;

  const contentWrapperStyle: React.CSSProperties = useMemo(
    () => ({
      maxWidth: "1020px",
      margin: "0 auto",
      padding: "0 20px",
    }),
    []
  );

  async function toggleWatchlist() {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    if (isWatchlisted && watchlistItemId) {
      setIsWatchlisted(false);
      setWatchlistItemId(null);
      const { error } = await supabase.from("saved_items").delete().eq("id", watchlistItemId);
      if (error) setIsWatchlisted(true);
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
          genres: film.genres?.map((g) => g.name) ?? [],
          runtime: film.runtime ?? null,
          vote_average: film.vote_average ?? null,
        })
        .select("id")
        .single();
      if (error) { setIsWatchlisted(false); } else { setWatchlistItemId(data.id); }
    }
  }

  async function toggleFavourite() {
    if (!diaryEntry) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const next = !isFavourited;
    setIsFavourited(next);
    const { error } = await supabase
      .from("diary_entries")
      .update({ favourite: next })
      .eq("id", diaryEntry.id);
    if (error) setIsFavourited(!next);
  }

  // About metadata — only non-empty fields
  const aboutRows: Array<{ label: string; value: string }> = [
    film.runtime ? { label: "Runtime", value: `${film.runtime} min` } : null,
    film.genres?.length ? { label: "Genre", value: film.genres.map((g) => g.name).join(", ") } : null,
    film.release_date ? { label: "Released", value: new Date(film.release_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) } : null,
    film.original_language ? { label: "Language", value: formatLanguage(film.original_language) } : null,
    film.production_companies?.[0]?.name ? { label: "Studio", value: film.production_companies[0].name } : null,
  ].filter((r): r is { label: string; value: string } => r !== null);

  return (
    <main style={{ background: "#08080f", minHeight: "100vh", color: "white" }}>
      <style>{`
        @media (max-width: 640px) {
          .film-backdrop-wrap { height: 40vh !important; }
          .film-hero-text-wrap { height: calc(40vh - 48px) !important; }
          .film-poster-row { margin-top: 0 !important; }
          .film-poster-wrap { width: 110px !important; }
          .film-actions-col { padding-top: 0 !important; }
          .film-actions-col button,
          .film-actions-col a { min-height: 44px !important; }
        }
      `}</style>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div style={{ position: "relative" }}>
        {/* Backdrop — contained within its own overflow:hidden wrapper */}
        {heroBackdrop && (
          <div
            className="film-backdrop-wrap"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "84vh",
              overflow: "hidden",
              zIndex: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroBackdrop}
              alt=""
              aria-hidden="true"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center 20%",
                display: "block",
                opacity: 0.52,
                filter: "saturate(1.08)",
              }}
            />
            {/* Rich gradient: dark at top for nav, clear in middle, dark at bottom for text */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: [
                  "linear-gradient(to bottom,",
                  "  rgba(8,8,15,0.72) 0%,",
                  "  rgba(8,8,15,0.10) 22%,",
                  "  rgba(8,8,15,0.04) 44%,",
                  "  rgba(8,8,15,0.48) 70%,",
                  "  rgba(8,8,15,0.92) 88%,",
                  "  rgba(8,8,15,1.00) 100%",
                  ")",
                ].join(""),
              }}
            />
          </div>
        )}
        {!heroBackdrop && (
          <div
            className="film-backdrop-wrap"
            style={{
              position: "absolute",
              top: 0, left: 0, right: 0,
              height: "84vh",
              background: "linear-gradient(180deg, #0a0a18 0%, #12122a 100%)",
              zIndex: 0,
            }}
          />
        )}

        {/* Hero text content — sits above backdrop, aligned to bottom */}
        <div
          className="film-hero-text-wrap"
          style={{
            position: "relative",
            zIndex: 5,
            height: "calc(84vh - 120px)",
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <div style={{ ...contentWrapperStyle, paddingBottom: 0, width: "100%" }}>
            <div style={{ paddingBottom: 20 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(30px, 5.5vw, 52px)",
                  lineHeight: 1.06,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.97)",
                  fontFamily: SERIF,
                  letterSpacing: "-0.8px",
                }}
              >
                {film.title}
              </h1>

              {film.tagline && (
                <p
                  style={{
                    margin: "12px 0 0",
                    fontSize: "clamp(13px, 1.8vw, 16px)",
                    fontStyle: "italic",
                    color: "rgba(255,255,255,0.46)",
                    fontFamily: SERIF,
                    lineHeight: 1.5,
                  }}
                >
                  {film.tagline}
                </p>
              )}

              <p
                style={{
                  margin: "14px 0 0",
                  fontSize: 13,
                  color: "rgba(255,255,255,0.48)",
                  fontFamily: SANS,
                  letterSpacing: "0.01em",
                }}
              >
                {[
                  year,
                  film.runtime ? `${film.runtime}m` : null,
                  film.genres?.slice(0, 2).map((g) => g.name).join(" · "),
                ]
                  .filter(Boolean)
                  .join("  ·  ")}
              </p>
            </div>
          </div>
        </div>

        {/* Poster + actions row — pulls up into hero with negative margin */}
        <div
          className="film-poster-row"
          style={{
            position: "relative",
            zIndex: 20,
            marginTop: -96,
          }}
        >
          <div style={{ ...contentWrapperStyle, paddingTop: 0, paddingBottom: 24 }}>
            <div
              style={{
                display: "flex",
                gap: 24,
                alignItems: "flex-start",
              }}
            >
              {/* Poster — overlaps hero */}
              <div
                className="film-poster-wrap"
                style={{
                  flexShrink: 0,
                  width: 145,
                  aspectRatio: "2 / 3",
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: "0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)",
                  background: "#111122",
                }}
              >
                {posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={posterUrl}
                    alt={film.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
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
                      fontFamily: SERIF,
                    }}
                  >
                    {film.title.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Actions — aligned 96px below the hero's visual bottom (below poster top) */}
              <div className="film-actions-col" style={{ paddingTop: 112, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {/* Log */}
                  <button
                    type="button"
                    className="rs-btn-press"
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
                      padding: "10px 20px",
                      borderRadius: 10,
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      border: "none",
                      cursor: "pointer",
                      background: "#1D9E75",
                      color: "white",
                      fontWeight: 600,
                      fontFamily: SANS,
                    }}
                  >
                    <span>＋</span>
                    <span>Log this</span>
                  </button>

                  {/* Watchlist */}
                  <button
                    type="button"
                    className="rs-btn-press"
                    onClick={() => void toggleWatchlist()}
                    style={{
                      padding: "10px 20px",
                      borderRadius: 10,
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      cursor: "pointer",
                      fontWeight: 600,
                      fontFamily: SANS,
                      ...(isWatchlisted
                        ? { background: "rgba(255,255,255,0.15)", border: "0.5px solid rgba(255,255,255,0.4)", color: "rgba(255,255,255,0.9)" }
                        : { background: "rgba(255,255,255,0.08)", border: "0.5px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.82)" }),
                    }}
                  >
                    <span>{isWatchlisted ? "🔖" : "⌑"}</span>
                    <span>{isWatchlisted ? "Watchlisted" : "Watchlist"}</span>
                  </button>

                  {/* Favourite — active only if diary entry exists */}
                  <button
                    type="button"
                    className="rs-btn-press"
                    onClick={() => void toggleFavourite()}
                    disabled={!diaryEntry}
                    title={diaryEntry ? undefined : "Log this film first to favourite it"}
                    style={{
                      padding: "10px 20px",
                      borderRadius: 10,
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      cursor: diaryEntry ? "pointer" : "default",
                      fontWeight: 600,
                      fontFamily: SANS,
                      opacity: diaryEntry ? 1 : 0.45,
                      ...(isFavourited
                        ? { background: "rgba(239,68,68,0.14)", border: "0.5px solid rgba(239,68,68,0.4)", color: "rgba(239,159,159,0.9)" }
                        : { background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.7)" }),
                    }}
                  >
                    <span>{isFavourited ? "♥" : "♡"}</span>
                    <span>{isFavourited ? "Favourited" : "Favourite"}</span>
                  </button>

                  {/* Share */}
                  <ShareButton style={{ borderRadius: 10, fontFamily: SANS }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────────── */}
      <div style={{ ...contentWrapperStyle, paddingBottom: 56 }}>
        <WhereToWatch providers={watchProviders.flatrate} title={film.title} />

        {/* ── Your Journey ────────────────────────────────────────────── */}
        {personalLoaded && diaryEntry && (
          <section
            style={{
              margin: "28px 0",
              padding: "20px 22px",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <h2
              style={{
                margin: "0 0 16px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.3)",
                fontFamily: SANS,
              }}
            >
              Your Journey
            </h2>

            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
              {/* Rating */}
              {coercedRating !== null && (
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontFamily: SANS }}>
                    Your Rating
                  </p>
                  <p style={{ margin: 0, display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ color: "rgba(255,255,255,0.92)", fontSize: 22, fontWeight: 300, letterSpacing: "-0.5px", fontVariantNumeric: "tabular-nums" }}>
                      {coercedRating.toFixed(1)}
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, fontWeight: 400 }}>/ 10</span>
                  </p>
                </div>
              )}

              {/* ReelShelf score */}
              {typeof diaryEntry.reelshelf_score === "number" && diaryEntry.reelshelf_score !== coercedRating && (
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontFamily: SANS }}>
                    ReelShelf Score
                  </p>
                  <p style={{ margin: 0, display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ color: "#EF9F27", fontSize: 22, fontWeight: 300, letterSpacing: "-0.5px", fontVariantNumeric: "tabular-nums" }}>
                      {diaryEntry.reelshelf_score.toFixed(1)}
                    </span>
                    <span style={{ color: "rgba(239,159,39,0.45)", fontSize: 13, fontWeight: 400 }}>/ 10</span>
                  </p>
                </div>
              )}

              {/* Logged date */}
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontFamily: SANS }}>
                  Logged
                </p>
                <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.72)", fontFamily: SANS }}>
                  {formatLoggedDate(diaryEntry.watched_date)}
                </p>
              </div>

              {/* Badges */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", paddingTop: 18 }}>
                {diaryEntry.favourite && (
                  <span style={{ fontSize: 11, color: "rgba(239,100,100,0.9)", background: "rgba(239,68,68,0.1)", border: "0.5px solid rgba(239,68,68,0.3)", padding: "3px 9px", borderRadius: 6, fontFamily: SANS, fontWeight: 600 }}>
                    ♥ Favourite
                  </span>
                )}
                {diaryEntry.rewatch && (
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.12)", padding: "3px 9px", borderRadius: 6, fontFamily: SANS, fontWeight: 600 }}>
                    ↺ Rewatch
                  </span>
                )}
              </div>
            </div>

            {/* Review */}
            {diaryEntry.review && diaryEntry.review.trim() !== "" && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ margin: "0 0 6px", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontFamily: SANS }}>
                  Your thoughts
                </p>
                <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.72)", fontStyle: "italic", lineHeight: 1.65, fontFamily: SERIF }}>
                  &ldquo;{diaryEntry.review}&rdquo;
                </p>
              </div>
            )}

            {/* Log again CTA */}
            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                className="rs-btn-press"
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
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "0.5px solid rgba(29,158,117,0.35)",
                  background: "rgba(29,158,117,0.1)",
                  color: "#1D9E75",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: SANS,
                }}
              >
                ↺ Log again
              </button>
            </div>
          </section>
        )}

        {/* ── Overview ────────────────────────────────────────────────── */}
        {film.overview && (
          <section style={{ maxWidth: 680, margin: "32px 0" }}>
            <h2
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.3)",
                marginBottom: 12,
                fontFamily: SANS,
              }}
            >
              Overview
            </h2>
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.75,
                color: "rgba(255,255,255,0.72)",
                margin: 0,
                fontFamily: SANS,
              }}
            >
              {film.overview}
            </p>
          </section>
        )}

        {/* ── About ───────────────────────────────────────────────────── */}
        {aboutRows.length > 0 && (
          <section style={{ margin: "32px 0" }}>
            <h2
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.3)",
                marginBottom: 14,
                fontFamily: SANS,
              }}
            >
              About
            </h2>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: "18px 20px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.07)",
                background: "rgba(255,255,255,0.02)",
                maxWidth: 480,
              }}
            >
              {aboutRows.map(({ label, value }) => (
                <MetaRow key={label} label={label} value={value} />
              ))}
            </div>
          </section>
        )}

        {/* ── Cast ────────────────────────────────────────────────────── */}
        {topCast.length > 0 && <CastSection cast={topCast} />}

        {/* ── Reviews ─────────────────────────────────────────────────── */}
        <MediaReviewsSection
          mediaIds={[`tmdb-${film.id}`, `${slugify(film.title)}-${year}`]}
          mediaType="movie"
          title={film.title}
          year={parseInt(year || "0", 10)}
          poster={posterUrl}
          creator={null}
          href={`/films/${film.id}`}
        />

        {/* ── Appears in ──────────────────────────────────────────────── */}
        {matchingCollections.length > 0 && (
          <section style={{ margin: "40px 0 32px" }}>
            <h2
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.3)",
                marginBottom: 14,
                fontFamily: SANS,
              }}
            >
              Appears in
            </h2>
            <style>{`.coll-card-film { scrollbar-width: none; }`}</style>
            <div
              className="coll-card-film"
              style={{
                display: "flex",
                gap: 10,
                overflowX: "auto",
                paddingBottom: 4,
                WebkitOverflowScrolling: "touch",
              }}
            >
              {matchingCollections.map((col) => (
                <a
                  key={col.slug}
                  href={`/discover/collection/${col.slug}`}
                  style={{
                    flexShrink: 0,
                    padding: "14px 18px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                    textDecoration: "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                    maxWidth: 240,
                    minWidth: 160,
                  }}
                >
                  <span
                    style={{
                      fontFamily: SANS,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.85)",
                      lineHeight: 1.3,
                    }}
                  >
                    {col.name}
                  </span>
                  <span
                    style={{
                      fontFamily: SANS,
                      fontSize: 11,
                      color: "rgba(255,255,255,0.3)",
                      lineHeight: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {col.description}
                  </span>
                  <span
                    style={{
                      fontFamily: SANS,
                      fontSize: 10,
                      color: "rgba(255,255,255,0.22)",
                      letterSpacing: "0.04em",
                      marginTop: 2,
                    }}
                  >
                    View collection →
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ── More Like This ───────────────────────────────────────────── */}
        {recommendations.length >= 3 && (
          <section style={{ margin: "32px 0 48px" }}>
            <style>{`.film-rec-scroll { scrollbar-width: none; } .film-rec-card { transition: transform 0.16s ease; } .film-rec-card:hover { transform: translateY(-4px); }`}</style>
            <h2
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.3)",
                marginBottom: 4,
                fontFamily: SANS,
              }}
            >
              More Like This
            </h2>
            <p
              style={{
                margin: "0 0 16px",
                fontSize: 12,
                color: "rgba(255,255,255,0.22)",
                fontFamily: SANS,
              }}
            >
              Because you&apos;re viewing <em style={{ fontStyle: "italic" }}>{film.title}</em>
            </p>
            <div
              className="film-rec-scroll"
              style={{
                display: "flex",
                gap: 12,
                overflowX: "auto",
                paddingBottom: 8,
                WebkitOverflowScrolling: "touch",
              }}
            >
              {recommendations.map((rec) => (
                <a
                  key={rec.id}
                  href={`/films/${rec.id}`}
                  className="film-rec-card"
                  style={{ flexShrink: 0, width: 108, textDecoration: "none", color: "inherit" }}
                >
                  <div
                    style={{
                      width: 108,
                      aspectRatio: "2 / 3",
                      borderRadius: 12,
                      overflow: "hidden",
                      background: "#12121f",
                      border: "1px solid rgba(255,255,255,0.07)",
                      marginBottom: 8,
                      boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
                    }}
                  >
                    {rec.poster_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`https://image.tmdb.org/t/p/w342${rec.poster_path}`}
                        alt={rec.title}
                        loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "rgba(255,255,255,0.14)",
                          fontSize: 11,
                          fontFamily: SERIF,
                          padding: 8,
                          textAlign: "center",
                        }}
                      >
                        {rec.title}
                      </div>
                    )}
                  </div>
                  <p
                    style={{
                      margin: "0 0 3px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.82)",
                      lineHeight: 1.35,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      fontFamily: SANS,
                    }}
                  >
                    {rec.title}
                  </p>
                  {rec.year && (
                    <p style={{ margin: "0 0 2px", fontSize: 10, color: "rgba(255,255,255,0.28)", fontFamily: SANS }}>
                      {rec.year}
                    </p>
                  )}
                  {"reason" in rec && rec.reason && (
                    <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.22)", fontStyle: "italic", fontFamily: SANS, lineHeight: 1.3 }}>
                      {String(rec.reason)}
                    </p>
                  )}
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
