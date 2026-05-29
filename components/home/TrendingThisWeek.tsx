"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import { getMediaHref } from "../../lib/mediaRoutes";
import type { MediaType } from "../../lib/media";

// ─── Types ────────────────────────────────────────────────────────────────────

type TrendingItem = {
  media_id: string;
  media_type: MediaType;
  title: string;
  poster: string | null;
  year: number;
  avgRating: number | null;
  logCount: number;
  reviewCount: number;
  reactionCount: number;
  score: number;
  href: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SANS = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';

function resolvePoster(raw: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  return `https://image.tmdb.org/t/p/w342${raw}`;
}

function mediaLabel(t: MediaType) {
  return t === "movie" ? "Film" : t === "tv" ? "Series" : "Book";
}

// ─── Query ───────────────────────────────────────────────────────────────────

async function fetchTrendingThisWeek(): Promise<TrendingItem[]> {
  const client = createClient();
  if (!client) return [];

  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  // Primary: diary entries logged in the last 7 days
  const { data: entries } = await client
    .from("diary_entries")
    .select("id, media_id, media_type, title, poster, year, rating, review, created_at")
    .gte("created_at", sevenDaysAgo)
    .in("review_scope", ["show", "title"])
    .not("media_id", "is", null)
    .not("title", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (!entries || entries.length === 0) return [];

  const entryIds = entries.map((e) => e.id as string);

  // Secondary: reactions and root comments on those entries in the same window
  const [{ data: reactions }, { data: comments }] = await Promise.all([
    client
      .from("diary_entry_reactions")
      .select("diary_entry_id")
      .in("diary_entry_id", entryIds)
      .gte("created_at", sevenDaysAgo),
    client
      .from("diary_entry_comments")
      .select("diary_entry_id")
      .in("diary_entry_id", entryIds)
      .gte("created_at", sevenDaysAgo)
      .is("parent_comment_id", null),
  ]);

  // Index reactions and comments by entry ID
  const reactionByEntry = new Map<string, number>();
  for (const r of reactions ?? []) {
    const id = r.diary_entry_id as string;
    reactionByEntry.set(id, (reactionByEntry.get(id) ?? 0) + 1);
  }
  const commentByEntry = new Map<string, number>();
  for (const c of comments ?? []) {
    const id = c.diary_entry_id as string;
    commentByEntry.set(id, (commentByEntry.get(id) ?? 0) + 1);
  }

  // Aggregate by (media_type, media_id)
  type Agg = {
    media_id: string;
    media_type: string;
    title: string;
    poster: string | null;
    year: number;
    ratings: number[];
    logCount: number;
    reviewCount: number;
    reactionCount: number;
  };

  const agg = new Map<string, Agg>();

  for (const entry of entries) {
    const key = `${entry.media_type}:${entry.media_id}`;
    const existing = agg.get(key);
    const hasReview = Boolean(
      (entry.review as string | null)?.trim()
    );
    const entryReactions = reactionByEntry.get(entry.id as string) ?? 0;
    const entryComments = commentByEntry.get(entry.id as string) ?? 0;
    const rating =
      entry.rating != null ? Number(entry.rating) : null;

    if (existing) {
      existing.logCount++;
      if (hasReview) existing.reviewCount++;
      if (rating !== null) existing.ratings.push(rating);
      existing.reactionCount += entryReactions + entryComments;
    } else {
      agg.set(key, {
        media_id: entry.media_id as string,
        media_type: entry.media_type as string,
        title: entry.title as string,
        poster: entry.poster as string | null,
        year: Number(entry.year) || 0,
        ratings: rating !== null ? [rating] : [],
        logCount: 1,
        reviewCount: hasReview ? 1 : 0,
        reactionCount: entryReactions + entryComments,
      });
    }
  }

  // Score, sort, and cap
  return Array.from(agg.values())
    .map((item) => {
      const avgRating =
        item.ratings.length > 0
          ? item.ratings.reduce((a, b) => a + b, 0) / item.ratings.length
          : null;
      const score =
        item.logCount * 3 +
        item.reviewCount * 2 +
        item.reactionCount * 1.5 +
        (avgRating !== null ? (avgRating / 10) * 2 : 0);

      return {
        media_id: item.media_id,
        media_type: item.media_type as MediaType,
        title: item.title,
        poster: resolvePoster(item.poster),
        year: item.year,
        avgRating,
        logCount: item.logCount,
        reviewCount: item.reviewCount,
        reactionCount: item.reactionCount,
        score,
        href: getMediaHref({
          id: item.media_id,
          mediaType: item.media_type as MediaType,
        }),
      };
    })
    .filter((item) => item.logCount >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 16);
}

// ─── Trending card ────────────────────────────────────────────────────────────

function TrendingCard({
  item,
  rank,
}: {
  item: TrendingItem;
  rank: number;
}) {
  const [imgErr, setImgErr] = useState(false);
  const isTopThree = rank < 3;

  return (
    <Link
      href={item.href}
      className="tw-card"
      style={{
        display: "block",
        width: "min(130px, 36vw)",
        flexShrink: 0,
        textDecoration: "none",
        color: "inherit",
        scrollSnapAlign: "start",
      }}
    >
      {/* Poster */}
      <div
        style={{
          position: "relative",
          borderRadius: 8,
          overflow: "hidden",
          paddingBottom: "150%",
          background: "#111",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {item.poster && !imgErr ? (
          <img
            src={item.poster}
            alt={item.title}
            loading="lazy"
            onError={() => setImgErr(true)}
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
          // Clean fallback — letter initial on dark gradient
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(145deg, #1a1a2a, #0c0c14)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                color: "rgba(255,255,255,0.12)",
                fontSize: 28,
                fontWeight: 700,
                fontFamily: SANS,
                userSelect: "none",
              }}
            >
              {item.title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Bottom gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, transparent 45%, rgba(0,0,0,0.82) 100%)",
          }}
        />

        {/* Top-3 trending indicator */}
        {isTopThree && (
          <div
            style={{
              position: "absolute",
              top: 6,
              left: 6,
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(6px)",
              borderRadius: 5,
              padding: "2px 6px",
              display: "flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            <span style={{ fontSize: 9 }}>🔥</span>
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                color: "rgba(255,255,255,0.7)",
                letterSpacing: "0.04em",
                fontFamily: SANS,
              }}
            >
              #{rank + 1}
            </span>
          </div>
        )}

        {/* Rating badge */}
        {item.avgRating !== null && (
          <div
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(6px)",
              borderRadius: 4,
              padding: "2px 5px",
              color: "#f0c060",
              fontSize: 9,
              fontWeight: 700,
              fontFamily: SANS,
            }}
          >
            {item.avgRating.toFixed(1)}
          </div>
        )}

        {/* Title + media type at bottom of poster */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "5px 7px",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 7,
              color: "rgba(255,255,255,0.3)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontFamily: SANS,
            }}
          >
            {mediaLabel(item.media_type)}
            {item.year ? ` · ${item.year}` : ""}
          </p>
          <h3
            style={{
              margin: "2px 0 0",
              fontSize: 10.5,
              fontWeight: 600,
              lineHeight: 1.2,
              color: "white",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {item.title}
          </h3>
        </div>
      </div>

      {/* Stats row below poster */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 5,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {item.logCount > 0 && (
          <span
            style={{
              fontSize: 9,
              color: "rgba(255,255,255,0.38)",
              fontFamily: SANS,
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <span style={{ opacity: 0.6 }}>↑</span>
            {item.logCount}
          </span>
        )}
        {item.reviewCount > 0 && (
          <span
            style={{
              fontSize: 9,
              color: "rgba(255,255,255,0.28)",
              fontFamily: SANS,
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <span style={{ opacity: 0.55 }}>✍</span>
            {item.reviewCount}
          </span>
        )}
      </div>
    </Link>
  );
}

// ─── Loading shimmer ──────────────────────────────────────────────────────────

function LoadingShimmer() {
  return (
    <>
      <style>{`
        @keyframes tw-shimmer {
          from { background-position: -200% center; }
          to   { background-position:  200% center; }
        }
        .tw-shimmer {
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.04) 25%,
            rgba(255,255,255,0.08) 50%,
            rgba(255,255,255,0.04) 75%
          );
          background-size: 200% 100%;
          animation: tw-shimmer 1.6s ease infinite;
          border-radius: 8px;
        }
      `}</style>
      <div style={{ display: "flex", gap: 8 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="tw-shimmer"
            style={{
              width: "min(130px, 36vw)",
              paddingBottom: "calc(min(130px, 36vw) * 1.5)",
              flexShrink: 0,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.04)",
            }}
          />
        ))}
      </div>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TrendingThisWeek() {
  const [items, setItems] = useState<TrendingItem[] | null>(null);

  useEffect(() => {
    void fetchTrendingThisWeek().then(setItems);
  }, []);

  // Suppress the section entirely until we know if there's data
  // (items === null → loading, items.length === 0 → empty, else data)

  return (
    <section style={{ marginBottom: "clamp(18px, 3.5vw, 26px)" }}>
      <style>{`
        .tw-card { transition: transform 0.18s ease; }
        .tw-card:hover { transform: translateY(-3px) scale(1.02); }
      `}</style>

      {/* Section header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 8,
          marginBottom: "clamp(8px, 1.8vw, 12px)",
        }}
      >
        <div>
          <span
            style={{
              display: "block",
              color: "#3e3e3e",
              fontSize: 9,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              fontFamily: SANS,
              marginBottom: 3,
            }}
          >
            ReelShelf
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
            Trending this week
          </h2>
          {/* Subtitle — only render when we have data or are loading */}
          {items !== null && items.length > 0 && (
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 11,
                color: "#3a3a3a",
                fontFamily: SANS,
              }}
            >
              The films, shows, and books gaining momentum across ReelShelf.
            </p>
          )}
        </div>
      </div>

      {/* Loading */}
      {items === null && <LoadingShimmer />}

      {/* Empty state — no carousel shell */}
      {items !== null && items.length === 0 && (
        <p
          style={{
            margin: 0,
            color: "#3c3c3c",
            fontSize: 12,
            fontFamily: SANS,
          }}
        >
          Trending titles will appear once more shelves start logging.
        </p>
      )}

      {/* Data row */}
      {items !== null && items.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            scrollSnapType: "x mandatory",
            scrollBehavior: "smooth",
            overscrollBehaviorX: "contain",
            scrollbarWidth: "none",
            paddingBottom: 4,
            paddingInline: 2,
          }}
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore — non-standard but correct for hiding scrollbar in WebKit
          className="[&::-webkit-scrollbar]:hidden"
        >
          {items.map((item, i) => (
            <TrendingCard
              key={`${item.media_type}-${item.media_id}`}
              item={item}
              rank={i}
            />
          ))}
        </div>
      )}
    </section>
  );
}
