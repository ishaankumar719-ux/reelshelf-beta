"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MOOD_DATA, type MoodConfig, type MoodItem, type MoodItemType } from "./moodData";
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
import { getDailySeed, seededShuffle } from "../../utils/dailyMoodSeed";
import { getMediaImage, type MediaImageResult } from "../../utils/getMediaImage";

// ─── Constants (matching HomeDashboardClient) ──────────────────────────────────

const SANS = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';

// ─── Types ─────────────────────────────────────────────────────────────────────

type FilterType = "all" | MoodItemType;

type DisplayCard = {
  key: string;
  /** ReelShelf ID — non-null only for items found in local data or watchlist */
  id: string | null;
  mediaType: MediaType;
  itemType: MoodItemType;
  title: string;
  year: number;
  author: string | null;
  /** Poster URL from local data; may be null for items not in local DB */
  localPoster: string | null;
  /** Key into the posterCache for async-fetched poster + href */
  posterCacheKey: string;
  /** Navigation href if resolvable from local data */
  localHref: string | null;
  voteAverage: number | null;
  /** True when item came from the user's watchlist */
  fromWatchlist: boolean;
};

type CacheEntry = MediaImageResult & { loaded: boolean };

// ─── Helpers ───────────────────────────────────────────────────────────────────

function seedTypeToMediaType(type: MoodItemType): MediaType {
  return type === "film" ? "movie" : type;
}

function mediaLabel(t: MediaType): string {
  return t === "movie" ? "Film" : t === "tv" ? "TV" : "Book";
}

function posterCacheKey(item: MoodItem): string {
  return `${item.title}|${item.year}|${item.type}`;
}

function getLocalPosterUrl(item: MoodItem): string | null {
  if (item.type === "film") {
    const lm = localMovies.find((m) => m.title.toLowerCase() === item.title.toLowerCase());
    return lm?.poster ?? null;
  }
  if (item.type === "tv") {
    const ls = localSeries.find((s) => s.title.toLowerCase() === item.title.toLowerCase());
    if (!ls) return null;
    return ls.poster ?? (ls.posterPath ? `https://image.tmdb.org/t/p/w500/${ls.posterPath}` : null);
  }
  return null; // books always fetched from Open Library
}

function getLocalHref(item: MoodItem): string | null {
  if (item.type === "film") {
    const lm = localMovies.find((m) => m.title.toLowerCase() === item.title.toLowerCase());
    return lm ? getMediaHref({ id: lm.id, mediaType: "movie" }) : null;
  }
  if (item.type === "tv") {
    const ls = localSeries.find((s) => s.title.toLowerCase() === item.title.toLowerCase());
    return ls ? getMediaHref({ id: ls.id, mediaType: "tv" }) : null;
  }
  return null;
}

function getLocalId(item: MoodItem): string | null {
  if (item.type === "film") {
    const lm = localMovies.find((m) => m.title.toLowerCase() === item.title.toLowerCase());
    return lm?.id ?? null;
  }
  if (item.type === "tv") {
    const ls = localSeries.find((s) => s.title.toLowerCase() === item.title.toLowerCase());
    return ls?.id ?? null;
  }
  return null;
}

function resolveDisplayCards(
  items: MoodItem[],
  watchlist: WatchlistEntry[]
): DisplayCard[] {
  const wlFirst: DisplayCard[] = [];
  const rest: DisplayCard[] = [];

  for (const item of items) {
    const lower = item.title.toLowerCase();
    const mediaType = seedTypeToMediaType(item.type);
    const cacheKey = posterCacheKey(item);

    // Watchlist match takes priority
    const wlEntry = watchlist.find((e) => e.title.toLowerCase() === lower);
    if (wlEntry) {
      let localPoster = wlEntry.poster ?? null;
      if (!localPoster) localPoster = getLocalPosterUrl(item);
      wlFirst.push({
        key: `wl-${wlEntry.id}-${wlEntry.mediaType}`,
        id: wlEntry.id,
        mediaType: wlEntry.mediaType,
        itemType: item.type,
        title: wlEntry.title,
        year: item.year,
        author: item.author ?? null,
        localPoster,
        posterCacheKey: cacheKey,
        localHref: getMediaHref({ id: wlEntry.id, mediaType: wlEntry.mediaType }),
        voteAverage: wlEntry.voteAverage ?? null,
        fromWatchlist: true,
      });
      continue;
    }

    // Local data match
    const localId = getLocalId(item);
    rest.push({
      key: `item-${item.title}-${item.year}`,
      id: localId,
      mediaType,
      itemType: item.type,
      title: item.title,
      year: item.year,
      author: item.author ?? null,
      localPoster: getLocalPosterUrl(item),
      posterCacheKey: cacheKey,
      localHref: getLocalHref(item),
      voteAverage: null,
      fromWatchlist: false,
    });
  }

  return [...wlFirst, ...rest];
}

function getShuffledCards(
  moodConfig: MoodConfig,
  moodIndex: number,
  watchlist: WatchlistEntry[]
): DisplayCard[] {
  const shuffled = seededShuffle(moodConfig.items, getDailySeed() + moodIndex);
  const cards = resolveDisplayCards(shuffled, watchlist);
  return cards;
}

function getVisibleCards(cards: DisplayCard[], filter: FilterType): DisplayCard[] {
  const filtered = filter === "all" ? cards : cards.filter((c) => c.itemType === filter);
  return filtered.slice(0, 8);
}

// ─── Branded placeholder ────────────────────────────────────────────────────────

function PosterPlaceholder({
  title,
  isLoading,
}: {
  title: string;
  isLoading: boolean;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(135deg, #111118, #0a0a10)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        padding: "0 10px",
      }}
    >
      {isLoading ? (
        <div className="mood-shimmer" style={{ width: 28, height: 28, borderRadius: "50%" }} />
      ) : (
        <>
          {/* ReelShelf film-reel icon */}
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
            <line x1="12" y1="2" x2="12" y2="9" />
            <line x1="12" y1="15" x2="12" y2="22" />
            <line x1="2" y1="12" x2="9" y2="12" />
            <line x1="15" y1="12" x2="22" y2="12" />
          </svg>
          <p
            style={{
              margin: 0,
              fontSize: 8,
              fontWeight: 500,
              color: "rgba(255,255,255,0.2)",
              textAlign: "center",
              lineHeight: 1.35,
              fontFamily: SANS,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              wordBreak: "break-word",
            }}
          >
            {title}
          </p>
        </>
      )}
    </div>
  );
}

// ─── Card component ────────────────────────────────────────────────────────────

function MoodCard({
  card,
  watchlist,
  posterCache,
  onToggleWatchlist,
}: {
  card: DisplayCard;
  watchlist: WatchlistEntry[];
  posterCache: Record<string, CacheEntry>;
  onToggleWatchlist: (card: DisplayCard) => void;
}) {
  const [imgError, setImgError] = useState(false);

  const cached = posterCache[card.posterCacheKey];
  const posterUrl = imgError ? null : (card.localPoster ?? cached?.posterUrl ?? null);
  const href = card.localHref ?? cached?.href ?? null;
  const isLoadingPoster = !card.localPoster && !cached?.loaded;

  const inWl =
    card.id !== null &&
    watchlist.some((e) => e.id === card.id && e.mediaType === card.mediaType);

  const isBook = card.itemType === "book";
  const cardWidth = isBook ? 110 : 120;

  const handleSearch = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("rs:open-search"));
    }
  };

  return (
    <div
      className="mood-card"
      style={{ width: cardWidth, flexShrink: 0, display: "flex", flexDirection: "column" }}
    >
      {/* Poster / cover */}
      <div
        style={{
          position: "relative",
          borderRadius: 8,
          overflow: "hidden",
          height: isBook ? 160 : 178,
          background: "#0f0f0f",
          border: "1px solid rgba(255,255,255,0.06)",
          marginBottom: 6,
        }}
      >
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={card.title}
            loading="lazy"
            onError={() => setImgError(true)}
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
          <PosterPlaceholder title={card.title} isLoading={isLoadingPoster} />
        )}

        {/* Gradient overlay on top of poster */}
        {posterUrl && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to bottom, transparent 55%, rgba(0,0,0,0.65) 100%)",
            }}
          />
        )}

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
            background: "rgba(0,0,0,0.72)",
            backdropFilter: "blur(6px)",
            borderRadius: 4,
            padding: "2px 5px",
            color: "rgba(255,255,255,0.45)",
            fontSize: 7.5,
            fontFamily: SANS,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {mediaLabel(card.mediaType)}
        </div>
      </div>

      {/* Title */}
      <p
        title={card.title}
        style={{
          margin: "0 0 1px",
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

      {/* Year or author */}
      <p
        style={{
          margin: "0 0 6px",
          fontSize: 9.5,
          color: "rgba(255,255,255,0.3)",
          fontFamily: SANS,
          minHeight: 13,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
      >
        {card.author ?? (card.year > 0 ? String(card.year) : "")}
      </p>

      {/* Actions */}
      <div style={{ display: "flex", gap: 4, marginTop: "auto" }}>
        {href ? (
          <Link
            href={href}
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
              color: "rgba(255,255,255,0.35)",
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
              border: `1px solid ${inWl ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)"}`,
              background: inWl ? "rgba(255,255,255,0.12)" : "transparent",
              color: inWl ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)",
              cursor: "pointer",
              fontSize: 13,
              padding: 0,
              lineHeight: 1,
              transition: "background 0.12s ease, border-color 0.12s ease",
            }}
          >
            {inWl ? "✓" : "+"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Filter chips ──────────────────────────────────────────────────────────────

const FILTER_OPTIONS: { value: FilterType; label: string; icon: string }[] = [
  { value: "all", label: "All", icon: "" },
  { value: "film", label: "Films", icon: "🎬" },
  { value: "tv", label: "TV", icon: "📺" },
  { value: "book", label: "Books", icon: "📖" },
];

function FilterChips({
  active,
  cards,
  onChange,
}: {
  active: FilterType;
  cards: DisplayCard[];
  onChange: (f: FilterType) => void;
}) {
  const counts: Record<FilterType, number> = {
    all: cards.length,
    film: cards.filter((c) => c.itemType === "film").length,
    tv: cards.filter((c) => c.itemType === "tv").length,
    book: cards.filter((c) => c.itemType === "book").length,
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        marginBottom: 10,
        flexWrap: "wrap",
      }}
    >
      {FILTER_OPTIONS.map(({ value, label, icon }) => {
        if (value !== "all" && counts[value] === 0) return null;
        const isActive = active === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              height: 26,
              padding: "0 10px",
              borderRadius: 999,
              border: `1px solid ${isActive ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.08)"}`,
              background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
              color: isActive ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.4)",
              cursor: "pointer",
              fontSize: 10.5,
              fontFamily: SANS,
              fontWeight: isActive ? 600 : 400,
              transition: "background 0.12s ease, border-color 0.12s ease, color 0.12s ease",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {icon && <span style={{ fontSize: 11 }}>{icon}</span>}
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function MoodRecommendations() {
  const [activeMood, setActiveMood] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>(() =>
    typeof window !== "undefined" ? getWatchlist() : []
  );
  const [posterCache, setPosterCache] = useState<Record<string, CacheEntry>>({});

  // Tracks which cache keys have been submitted for fetching (avoids duplicate calls)
  const fetchingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setWatchlist(getWatchlist());
    return subscribeToWatchlist(() => setWatchlist(getWatchlist()));
  }, []);

  // Trigger async poster fetches when mood changes
  useEffect(() => {
    if (!activeMood) return;
    const moodConfig = MOOD_DATA.find((m) => m.id === activeMood);
    if (!moodConfig) return;

    for (const item of moodConfig.items) {
      const key = posterCacheKey(item);
      if (fetchingRef.current.has(key)) continue;
      fetchingRef.current.add(key);

      // Local data has a poster — mark as loaded immediately
      const local = getLocalPosterUrl(item);
      if (local !== null) {
        setPosterCache((prev) => ({
          ...prev,
          [key]: { posterUrl: local, href: getLocalHref(item), loaded: true },
        }));
        continue;
      }

      // Async fetch from TMDB / Open Library
      getMediaImage({ title: item.title, year: item.year, type: item.type, author: item.author })
        .then((result) => {
          setPosterCache((prev) => ({
            ...prev,
            [key]: { ...result, loaded: true },
          }));
        })
        .catch(() => {
          setPosterCache((prev) => ({
            ...prev,
            [key]: { posterUrl: null, href: null, loaded: true },
          }));
        });
    }
  }, [activeMood]);

  const handleChipClick = (id: string) => {
    if (activeMood === id) {
      setActiveMood(null);
    } else {
      setActiveMood(id);
      setActiveFilter("all");
    }
  };

  const handleToggleWatchlist = (card: DisplayCard) => {
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
        year: card.year,
        poster: card.localPoster ?? undefined,
        voteAverage: card.voteAverage ?? undefined,
      });
    }
  };

  const activeMoodConfig = MOOD_DATA.find((m) => m.id === activeMood) ?? null;
  const activeMoodIndex = MOOD_DATA.findIndex((m) => m.id === activeMood);

  const allCards =
    activeMoodConfig !== null
      ? getShuffledCards(activeMoodConfig, activeMoodIndex, watchlist)
      : [];

  const visibleCards = getVisibleCards(allCards, activeFilter);

  const noTypeItems =
    activeMood !== null &&
    activeFilter !== "all" &&
    allCards.filter((c) => c.itemType === activeFilter).length === 0;

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
        @keyframes mood-shimmer {
          0%   { opacity: 0.3; }
          50%  { opacity: 0.7; }
          100% { opacity: 0.3; }
        }
        .mood-shimmer {
          background: rgba(255,255,255,0.1);
          animation: mood-shimmer 1.4s ease-in-out infinite;
        }
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
          marginBottom: activeMood ? 10 : 0,
        }}
      >
        {MOOD_DATA.map((mood) => {
          const isActive = activeMood === mood.id;
          return (
            <button
              key={mood.id}
              type="button"
              onClick={() => handleChipClick(mood.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                height: 30,
                padding: "0 11px",
                borderRadius: 999,
                border: `1px solid ${isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.12)"}`,
                background: isActive ? "white" : "rgba(255,255,255,0.04)",
                color: isActive ? "#0a0a0a" : "rgba(255,255,255,0.65)",
                cursor: "pointer",
                fontSize: 11.5,
                fontFamily: SANS,
                fontWeight: isActive ? 600 : 400,
                transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span style={{ fontSize: 13, lineHeight: 1 }}>{mood.emoji}</span>
              <span>{mood.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter chips + card rail */}
      {activeMood !== null && (
        <>
          <FilterChips
            active={activeFilter}
            cards={allCards}
            onChange={(f) => setActiveFilter(f)}
          />

          {noTypeItems ? (
            <p
              style={{
                margin: "4px 0",
                fontSize: 12,
                color: "rgba(255,255,255,0.28)",
                fontFamily: SANS,
              }}
            >
              No{" "}
              {activeFilter === "film"
                ? "film"
                : activeFilter === "tv"
                ? "TV"
                : "book"}{" "}
              picks for this mood yet
            </p>
          ) : (
            <div className="mood-rail">
              <div className="mood-row">
                {visibleCards.map((card) => (
                  <MoodCard
                    key={card.key}
                    card={card}
                    watchlist={watchlist}
                    posterCache={posterCache}
                    onToggleWatchlist={handleToggleWatchlist}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
