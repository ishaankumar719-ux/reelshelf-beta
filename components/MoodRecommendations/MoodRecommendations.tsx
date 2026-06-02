"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MOOD_SEED_DATA, type MoodKey } from "./moodData";
import { localMovies } from "../../lib/localMovies";
import { localSeries } from "../../lib/localSeries";
import {
  addToWatchlist,
  getWatchlist,
  removeFromWatchlistByMedia,
  subscribeToWatchlist,
  type WatchlistEntry,
} from "../../lib/watchlist";
import { getMediaHref } from "../../lib/mediaRoutes";
import type { MediaType } from "../../lib/media";

// ─── Constants (matching HomeDashboardClient) ──────────────────────────────────

const SANS = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';

// ─── Types ─────────────────────────────────────────────────────────────────────

type ResolvedCard = {
  key: string;
  id: string | null;
  mediaType: MediaType;
  title: string;
  year: number | null;
  poster: string | null;
  href: string | null;
  voteAverage: number | null;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function mediaLabel(t: MediaType): string {
  return t === "movie" ? "Film" : t === "tv" ? "TV" : "Book";
}

function resolveCards(
  titles: readonly string[],
  watchlist: WatchlistEntry[]
): ResolvedCard[] {
  const watchlistMatches: ResolvedCard[] = [];
  const localMatches: ResolvedCard[] = [];
  const fallbacks: ResolvedCard[] = [];

  for (const seedTitle of titles) {
    const lower = seedTitle.toLowerCase();

    // Priority 1: watchlist items whose title matches
    const wlEntry = watchlist.find((e) => e.title.toLowerCase() === lower);
    if (wlEntry) {
      let poster = wlEntry.poster ?? null;
      if (!poster) {
        const lm = localMovies.find((m) => m.title.toLowerCase() === lower);
        const ls = localSeries.find((s) => s.title.toLowerCase() === lower);
        if (lm) {
          poster = lm.poster;
        } else if (ls) {
          poster =
            ls.poster ??
            (ls.posterPath
              ? `https://image.tmdb.org/t/p/w500/${ls.posterPath}`
              : null);
        }
      }
      watchlistMatches.push({
        key: `wl-${wlEntry.id}-${wlEntry.mediaType}`,
        id: wlEntry.id,
        mediaType: wlEntry.mediaType,
        title: wlEntry.title,
        year: wlEntry.year || null,
        poster,
        href: getMediaHref({ id: wlEntry.id, mediaType: wlEntry.mediaType }),
        voteAverage: wlEntry.voteAverage ?? null,
      });
      continue;
    }

    // Priority 2: local movie data
    const lm = localMovies.find((m) => m.title.toLowerCase() === lower);
    if (lm) {
      localMatches.push({
        key: `mv-${lm.id}`,
        id: lm.id,
        mediaType: "movie",
        title: lm.title,
        year: Number(lm.year),
        poster: lm.poster,
        href: getMediaHref({ id: lm.id, mediaType: "movie" }),
        voteAverage: null,
      });
      continue;
    }

    // Priority 3: local series data
    const ls = localSeries.find((s) => s.title.toLowerCase() === lower);
    if (ls) {
      const poster =
        ls.poster ??
        (ls.posterPath
          ? `https://image.tmdb.org/t/p/w500/${ls.posterPath}`
          : null);
      localMatches.push({
        key: `tv-${ls.id}`,
        id: ls.id,
        mediaType: "tv",
        title: ls.title,
        year: Number(ls.year),
        poster,
        href: getMediaHref({ id: ls.id, mediaType: "tv" }),
        voteAverage: null,
      });
      continue;
    }

    // Fallback: render seed title directly
    fallbacks.push({
      key: `seed-${seedTitle}`,
      id: null,
      mediaType: "movie",
      title: seedTitle,
      year: null,
      poster: null,
      href: null,
      voteAverage: null,
    });
  }

  return [...watchlistMatches, ...localMatches, ...fallbacks];
}

// ─── Card component ────────────────────────────────────────────────────────────

function MoodCard({
  card,
  watchlist,
  onToggleWatchlist,
}: {
  card: ResolvedCard;
  watchlist: WatchlistEntry[];
  onToggleWatchlist: (card: ResolvedCard) => void;
}) {
  const inWl =
    card.id !== null &&
    watchlist.some((e) => e.id === card.id && e.mediaType === card.mediaType);

  const handleSearch = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("rs:open-search"));
    }
  };

  return (
    <div
      className="mood-card"
      style={{
        width: 120,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Poster */}
      <div
        style={{
          position: "relative",
          borderRadius: 8,
          overflow: "hidden",
          paddingBottom: "150%",
          background: "#0f0f0f",
          border: "1px solid rgba(255,255,255,0.06)",
          marginBottom: 6,
        }}
      >
        {card.poster ? (
          <img
            src={card.poster}
            alt={card.title}
            loading="lazy"
            style={{
              position: "absolute",
              inset: 0,
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
              background: "linear-gradient(135deg,#181818,#0c0c0c)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                color: "rgba(255,255,255,0.08)",
                fontSize: 24,
                fontWeight: 700,
                fontFamily: SANS,
              }}
            >
              {card.title[0]}
            </span>
          </div>
        )}
        {/* Gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.7) 100%)",
          }}
        />
        {/* Rating badge */}
        {typeof card.voteAverage === "number" && (
          <div
            style={{
              position: "absolute",
              top: 5,
              right: 5,
              background: "rgba(0,0,0,0.78)",
              backdropFilter: "blur(8px)",
              borderRadius: 4,
              padding: "2px 5px",
              color: "#f0c060",
              fontSize: 9,
              fontWeight: 700,
              fontFamily: SANS,
            }}
          >
            {card.voteAverage.toFixed(1)}
          </div>
        )}
        {/* Media type badge */}
        <div
          style={{
            position: "absolute",
            bottom: 5,
            left: 5,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(6px)",
            borderRadius: 4,
            padding: "2px 5px",
            color: "rgba(255,255,255,0.4)",
            fontSize: 7.5,
            fontFamily: SANS,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {mediaLabel(card.mediaType)}
        </div>
      </div>

      {/* Title — 1 line truncated */}
      <p
        title={card.title}
        style={{
          margin: "0 0 2px",
          fontSize: 11,
          fontWeight: 600,
          lineHeight: 1.2,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          fontFamily: SANS,
        }}
      >
        {card.title}
      </p>

      {/* Year */}
      <p
        style={{
          margin: "0 0 6px",
          fontSize: 9.5,
          color: "rgba(255,255,255,0.3)",
          fontFamily: SANS,
          minHeight: 13,
        }}
      >
        {card.year ?? ""}
      </p>

      {/* Actions */}
      <div style={{ display: "flex", gap: 4 }}>
        {card.href ? (
          <Link
            href={card.href}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 26,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.7)",
              textDecoration: "none",
              fontSize: 10,
              fontFamily: SANS,
              whiteSpace: "nowrap",
            }}
          >
            Open
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleSearch}
            style={{
              flex: 1,
              height: 26,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "transparent",
              color: "rgba(255,255,255,0.38)",
              cursor: "pointer",
              fontSize: 10,
              fontFamily: SANS,
            }}
          >
            Search
          </button>
        )}
        {card.id !== null && (
          <button
            type="button"
            onClick={() => onToggleWatchlist(card)}
            title={inWl ? "In watchlist" : "Add to watchlist"}
            aria-label={inWl ? "In watchlist" : "Add to watchlist"}
            style={{
              width: 26,
              height: 26,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              border: `1px solid ${
                inWl ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)"
              }`,
              background: inWl ? "rgba(255,255,255,0.12)" : "transparent",
              color: inWl
                ? "rgba(255,255,255,0.9)"
                : "rgba(255,255,255,0.4)",
              cursor: "pointer",
              fontSize: 13,
              padding: 0,
              lineHeight: 1,
              transition:
                "background 0.12s ease, border-color 0.12s ease, color 0.12s ease",
            }}
          >
            {inWl ? "✓" : "+"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function MoodRecommendations() {
  const [activeMood, setActiveMood] = useState<MoodKey | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>(() =>
    typeof window !== "undefined" ? getWatchlist() : []
  );

  useEffect(() => {
    setWatchlist(getWatchlist());
    return subscribeToWatchlist(() => setWatchlist(getWatchlist()));
  }, []);

  const handleChipClick = (key: MoodKey) => {
    setActiveMood((prev) => (prev === key ? null : key));
  };

  const handleToggleWatchlist = (card: ResolvedCard) => {
    if (card.id === null) return;
    const alreadyIn = watchlist.some(
      (e) => e.id === card.id && e.mediaType === card.mediaType
    );
    if (alreadyIn) {
      removeFromWatchlistByMedia(card.id, card.mediaType);
    } else {
      addToWatchlist({
        id: card.id,
        mediaType: card.mediaType,
        title: card.title,
        year: card.year ?? 0,
        poster: card.poster ?? undefined,
        voteAverage: card.voteAverage ?? undefined,
      });
    }
  };

  const cards = activeMood
    ? resolveCards(MOOD_SEED_DATA[activeMood].titles, watchlist)
    : [];

  return (
    <section style={{ marginBottom: "clamp(18px, 3.5vw, 26px)" }}>
      <style>{`
        .mood-row {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scroll-snap-type: x mandatory;
          scroll-behavior: smooth;
          overscroll-behavior-x: contain;
          scrollbar-width: none;
          padding-bottom: 4px;
          padding-inline: 2px;
          cursor: grab;
        }
        .mood-row::-webkit-scrollbar { display: none; }
        .mood-row > * { scroll-snap-align: start; }
        .mood-row:active { cursor: grabbing; }
        .mood-rail { position: relative; }
        .mood-rail::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          bottom: 4px;
          width: 40px;
          background: linear-gradient(to right, transparent, #06060a);
          pointer-events: none;
          z-index: 1;
        }
        .mood-card { transition: transform 0.18s ease; }
        .mood-card:hover { transform: translateY(-3px) scale(1.02); }
      `}</style>

      {/* Section header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          marginBottom: "clamp(8px, 1.8vw, 12px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span
            style={{
              color: "#3e3e3e",
              fontSize: 9,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              fontFamily: SANS,
            }}
          >
            Mood
          </span>
          <h2
            style={{
              margin: 0,
              fontSize: "clamp(17px, 3vw, 22px)",
              lineHeight: 1.1,
              letterSpacing: "-0.4px",
              fontWeight: 400,
              fontFamily: SERIF,
            }}
          >
            What are you in the mood for?
          </h2>
        </div>
      </div>

      {/* Mood chips */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 7,
          marginBottom: activeMood ? 12 : 0,
        }}
      >
        {(Object.keys(MOOD_SEED_DATA) as MoodKey[]).map((key) => {
          const { emoji, label } = MOOD_SEED_DATA[key];
          const isActive = activeMood === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleChipClick(key)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                height: 30,
                padding: "0 11px",
                borderRadius: 999,
                border: `1px solid ${
                  isActive
                    ? "rgba(255,255,255,0.9)"
                    : "rgba(255,255,255,0.12)"
                }`,
                background: isActive ? "white" : "rgba(255,255,255,0.04)",
                color: isActive ? "#0a0a0a" : "rgba(255,255,255,0.65)",
                cursor: "pointer",
                fontSize: 11.5,
                fontFamily: SANS,
                fontWeight: isActive ? 600 : 400,
                transition:
                  "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span style={{ fontSize: 13, lineHeight: 1 }}>{emoji}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Card rail */}
      {activeMood !== null && cards.length > 0 && (
        <div className="mood-rail">
          <div className="mood-row">
            {cards.map((card) => (
              <MoodCard
                key={card.key}
                card={card}
                watchlist={watchlist}
                onToggleWatchlist={handleToggleWatchlist}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
