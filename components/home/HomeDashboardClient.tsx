"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MediaCard as SharedMediaCard } from "../../src/components/ui/MediaCard";
import BecauseYouLiked from "./BecauseYouLiked";
import BecauseYouLikedRow from "../BecauseYouLikedRow";
import GamificationWidgets from "../GamificationWidgets";
import PeopleToFollowSection from "../PeopleToFollowSection";
import TonightsPick from "./TonightsPick";
import WeeklyChallengesSection from "../WeeklyChallengesSection";
import DailyReelCard from "./DailyReelCard";
import { useAuth } from "../AuthProvider";
import { getProfileInitials } from "../../lib/profile";
import {
  getDiaryMovies,
  subscribeToDiary,
  type DiaryMovie,
} from "../../lib/diary";
import {
  getWatchlist,
  subscribeToWatchlist,
  type WatchlistEntry,
} from "../../lib/watchlist";
import { getRecentMedia, type RecentMediaItem } from "../../lib/recentMedia";
import { getMediaHref } from "../../lib/mediaRoutes";
import type { MediaType } from "../../lib/media";
import {
  getFriendsActivity,
  subscribeToFollows,
  type FriendsActivityEntry,
} from "../../lib/supabase/social";

// ─── Types ────────────────────────────────────────────────────────────────────

type DashboardItem = {
  id: string;
  mediaType: MediaType;
  title: string;
  year: number;
  subtitle?: string;
  poster?: string | null;
  href: string;
};

// ─── Font stacks ──────────────────────────────────────────────────────────────

const SANS = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';

// ─── Pure utilities ───────────────────────────────────────────────────────────

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
}

function formatDiaryRating(rating: number | null) {
  return typeof rating === "number" ? `${rating.toFixed(1)} / 10` : "No rating";
}

function getActivityType(entry: FriendsActivityEntry) {
  if (entry.review.trim()) return "reviewed";
  if (typeof entry.rating === "number") return "rated";
  return "logged";
}

function getSeriesScopeBadge(entry: FriendsActivityEntry) {
  if (entry.mediaType !== "tv") return null;
  if (entry.reviewScope === "season" && entry.seasonNumber)
    return `S${entry.seasonNumber} review`;
  if (entry.reviewScope === "episode" && entry.seasonNumber && entry.episodeNumber)
    return `S${entry.seasonNumber} E${entry.episodeNumber}`;
  if (entry.reviewScope === "show") return "Show review";
  return null;
}

function formatRecencyLabel(date: string) {
  const deltaMs = Date.now() - new Date(date).getTime();
  const minutes = Math.max(1, Math.floor(deltaMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getMediaBadgeLabel(mediaType: MediaType) {
  if (mediaType === "movie") return "Film";
  if (mediaType === "tv") return "Series";
  return "Book";
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function EmptyRow({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div
      style={{
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.07)",
        background:
          "linear-gradient(180deg, rgba(15,15,15,0.92) 0%, rgba(9,9,9,0.94) 100%)",
        padding: "clamp(20px, 4vw, 28px)",
      }}
    >
      <p
        style={{
          margin: "0 0 6px",
          color: "#585858",
          fontSize: 11,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          fontFamily: SANS,
        }}
      >
        Nothing here yet
      </p>
      <h3
        style={{
          margin: 0,
          fontSize: "clamp(16px, 3.5vw, 21px)",
          letterSpacing: "-0.35px",
          fontWeight: 500,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: "8px 0 0",
          color: "#9a9a9a",
          fontSize: "clamp(13px, 2.5vw, 14px)",
          lineHeight: 1.65,
          maxWidth: 520,
        }}
      >
        {body}
      </p>
      <Link
        href={href}
        style={{
          marginTop: 14,
          display: "inline-flex",
          alignItems: "center",
          height: 38,
          padding: "0 16px",
          borderRadius: 999,
          background: "white",
          color: "black",
          textDecoration: "none",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: SANS,
          letterSpacing: "0.01em",
        }}
      >
        {cta}
      </Link>
    </div>
  );
}

function MediaCard({ item }: { item: DashboardItem }) {
  const mediaType =
    item.mediaType === "movie" ? "film" : item.mediaType === "tv" ? "series" : "book";
  return (
    <div style={{ width: "min(150px, 38vw)", flexShrink: 0 }}>
      <SharedMediaCard
        title={item.title}
        year={item.year || "—"}
        posterUrl={item.poster}
        mediaType={mediaType}
        size="md"
        href={item.href}
      />
    </div>
  );
}

function DiaryCard({ entry }: { entry: DiaryMovie }) {
  return (
    <Link
      href={getMediaHref({ id: entry.id, mediaType: entry.mediaType })}
      style={{
        textDecoration: "none",
        color: "inherit",
        width: "min(272px, calc(100vw - 28px))",
        flexShrink: 0,
      }}
    >
      <article
        style={{
          display: "grid",
          gridTemplateColumns: "78px minmax(0, 1fr)",
          gap: 12,
          padding: 13,
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.07)",
          background:
            "linear-gradient(180deg, rgba(15,15,15,0.97) 0%, rgba(8,8,8,0.97) 100%)",
        }}
      >
        <div
          style={{
            position: "relative",
            aspectRatio: "2 / 3",
            borderRadius: 12,
            overflow: "hidden",
            background: "linear-gradient(180deg, #141414 0%, #0b0b0b 100%)",
          }}
        >
          {entry.poster ? (
            <img
              src={entry.poster}
              alt={entry.title}
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
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,0.18)",
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              {entry.mediaType === "book" ? "B" : "R"}
            </div>
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 7,
            }}
          >
            <span
              style={{
                color: "#585858",
                fontSize: 9,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                fontFamily: SANS,
              }}
            >
              {getMediaBadgeLabel(entry.mediaType)}
            </span>
            <span
              style={{
                color: "white",
                fontSize: 14,
                lineHeight: 1,
                letterSpacing: "-0.3px",
                fontWeight: 600,
              }}
            >
              {formatDiaryRating(entry.rating)}
            </span>
          </div>

          <h3
            style={{
              margin: 0,
              fontSize: 15,
              lineHeight: 1.2,
              letterSpacing: "-0.35px",
              fontWeight: 500,
            }}
          >
            {entry.title}
          </h3>
          <p
            style={{
              margin: "4px 0 0",
              color: "#787878",
              fontSize: 12,
              lineHeight: 1.5,
              fontFamily: SANS,
            }}
          >
            {entry.year || "—"}
            {entry.director ? ` · ${entry.director}` : ""}
          </p>
          {entry.review.trim() ? (
            <p
              style={{
                margin: "7px 0 0",
                color: "#c0c0c0",
                fontSize: 12,
                lineHeight: 1.6,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {entry.review}
            </p>
          ) : null}
        </div>
      </article>
    </Link>
  );
}

// Poster-first cinematic card for friends activity
function FriendActivityCard({ entry }: { entry: FriendsActivityEntry }) {
  const ownerLabel =
    entry.displayName || (entry.username ? `@${entry.username}` : "Friend");
  const recency = formatRecencyLabel(entry.savedAt);
  const watchedOn = entry.watchedDate
    ? new Date(entry.watchedDate).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;
  const scopeBadge = getSeriesScopeBadge(entry);

  return (
    <article
      style={{
        position: "relative",
        width: "min(200px, 44vw)",
        flexShrink: 0,
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "#0f0f0f",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      {/* Avatar badge — sibling of poster link, absolutely positioned at z-index 10 */}
      <Link
        href={entry.username ? `/u/${entry.username}` : "#"}
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          zIndex: 10,
          display: "block",
          textDecoration: "none",
          borderRadius: 999,
        }}
        aria-label={ownerLabel}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 999,
            overflow: "hidden",
            border: "1.5px solid rgba(255,255,255,0.32)",
            background: "#222",
            display: "grid",
            placeItems: "center",
          }}
        >
          {entry.avatarUrl ? (
            <img
              src={entry.avatarUrl}
              alt={ownerLabel}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <span
              style={{
                color: "rgba(255,255,255,0.8)",
                fontSize: 9,
                fontWeight: 700,
                fontFamily: SANS,
              }}
            >
              {getProfileInitials({
                displayName: entry.displayName,
                username: entry.username,
              })}
            </span>
          )}
        </div>
      </Link>

      {/* Rating badge — absolutely positioned, not clickable */}
      {typeof entry.rating === "number" && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 10,
            background: "rgba(0,0,0,0.72)",
            backdropFilter: "blur(8px)",
            borderRadius: 7,
            padding: "4px 7px",
            color: "#f0c060",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "-0.2px",
            fontFamily: SANS,
          }}
        >
          {entry.rating.toFixed(1)}
        </div>
      )}

      {/* Poster link — covers the full poster area */}
      <Link
        href={entry.href}
        style={{
          display: "block",
          position: "relative",
          paddingBottom: "150%",
          textDecoration: "none",
          color: "inherit",
        }}
      >
        {entry.poster ? (
          <img
            src={entry.poster}
            alt={entry.title}
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
              background: "linear-gradient(180deg, #1a1a1a 0%, #101010 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                color: "rgba(255,255,255,0.16)",
                fontSize: 40,
                fontWeight: 700,
                fontFamily: SANS,
              }}
            >
              {entry.mediaType === "book" ? "B" : "R"}
            </span>
          </div>
        )}

        {/* Bottom gradient */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.94) 100%)",
          }}
        />

        {/* Cinema badge */}
        {entry.watchedInCinema && (
          <div
            style={{
              position: "absolute",
              bottom: 46,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                background: "rgba(0,0,0,0.7)",
                backdropFilter: "blur(6px)",
                borderRadius: 5,
                padding: "3px 7px",
                fontSize: 8,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.82)",
                fontFamily: SANS,
              }}
            >
              Cinema
            </span>
          </div>
        )}

        {/* Scope badge */}
        {scopeBadge && (
          <div
            style={{
              position: "absolute",
              bottom: entry.watchedInCinema ? 62 : 46,
              right: 8,
            }}
          >
            <span
              style={{
                background: "rgba(45,212,191,0.14)",
                backdropFilter: "blur(6px)",
                border: "1px solid rgba(45,212,191,0.22)",
                borderRadius: 5,
                padding: "2px 6px",
                fontSize: 8,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "rgba(45,212,191,0.88)",
                fontFamily: SANS,
              }}
            >
              {scopeBadge}
            </span>
          </div>
        )}

        {/* Bottom overlay: type + recency + title + username */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "10px",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 9,
              color: "rgba(255,255,255,0.42)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontFamily: SANS,
            }}
          >
            {getMediaBadgeLabel(entry.mediaType)} · {recency}
          </p>
          <h3
            style={{
              margin: "3px 0 0",
              fontSize: 13,
              fontWeight: 600,
              lineHeight: 1.22,
              letterSpacing: "-0.2px",
              color: "white",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {entry.title}
          </h3>
          {entry.username && (
            <p
              style={{
                margin: "2px 0 0",
                fontSize: 10,
                color: "rgba(255,255,255,0.38)",
                fontFamily: SANS,
              }}
            >
              @{entry.username}
            </p>
          )}
        </div>
      </Link>

      {/* Review snippet */}
      {entry.review.trim() ? (
        <Link
          href={entry.href}
          style={{
            display: "block",
            padding: "9px 11px 10px",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              color: "rgba(255,255,255,0.55)",
              lineHeight: 1.55,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              fontStyle: "italic",
            }}
          >
            &ldquo;{entry.review}&rdquo;
          </p>
          {watchedOn && (
            <p
              style={{
                margin: "5px 0 0",
                fontSize: 9,
                color: "rgba(255,255,255,0.28)",
                fontFamily: SANS,
              }}
            >
              Watched {watchedOn}
            </p>
          )}
        </Link>
      ) : watchedOn ? (
        <div
          style={{
            padding: "7px 11px 8px",
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 9,
              color: "rgba(255,255,255,0.28)",
              fontFamily: SANS,
            }}
          >
            Watched {watchedOn}
          </p>
        </div>
      ) : null}
    </article>
  );
}

// Compact tile for "Trending in your circle"
function TrendingTile({
  item,
  count,
}: {
  item: {
    id: string;
    mediaType: MediaType;
    title: string;
    poster: string | null;
    year: number;
    href: string;
  };
  count: number;
}) {
  return (
    <Link
      href={item.href}
      style={{
        textDecoration: "none",
        color: "inherit",
        flexShrink: 0,
        width: "min(140px, 36vw)",
        display: "block",
      }}
    >
      <div
        style={{
          borderRadius: 13,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.07)",
          background: "#0f0f0f",
          position: "relative",
        }}
      >
        <div style={{ position: "relative", paddingBottom: "150%" }}>
          {item.poster ? (
            <img
              src={item.poster}
              alt={item.title}
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
                background: "#1a1a1a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  color: "rgba(255,255,255,0.18)",
                  fontSize: 28,
                  fontWeight: 700,
                }}
              >
                R
              </span>
            </div>
          )}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to bottom, transparent 48%, rgba(0,0,0,0.9) 100%)",
            }}
          />
          <div style={{ position: "absolute", top: 7, right: 7 }}>
            <span
              style={{
                background: "rgba(0,0,0,0.72)",
                backdropFilter: "blur(8px)",
                borderRadius: 6,
                padding: "3px 7px",
                fontSize: 9,
                color: "rgba(255,255,255,0.75)",
                fontFamily: SANS,
                letterSpacing: "0.02em",
              }}
            >
              {count}× logged
            </span>
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "8px",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 9,
                color: "rgba(255,255,255,0.42)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontFamily: SANS,
              }}
            >
              {getMediaBadgeLabel(item.mediaType)}
            </p>
            <h3
              style={{
                margin: "2px 0 0",
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1.22,
                letterSpacing: "-0.2px",
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
      </div>
    </Link>
  );
}

function Section({
  eyebrow,
  title,
  body,
  children,
  action,
  serif,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  serif?: boolean;
}) {
  return (
    <section style={{ marginBottom: "clamp(32px, 6vw, 48px)" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-end",
          flexWrap: "wrap",
          marginBottom: "clamp(12px, 2.5vw, 18px)",
        }}
      >
        <div>
          {eyebrow ? (
            <p
              style={{
                margin: "0 0 5px",
                color: "#585858",
                fontSize: 11,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                fontFamily: SANS,
              }}
            >
              {eyebrow}
            </p>
          ) : null}
          <h2
            style={{
              margin: 0,
              fontSize: serif
                ? "clamp(22px, 4.5vw, 34px)"
                : "clamp(18px, 4vw, 28px)",
              lineHeight: 1.06,
              letterSpacing: serif ? "-0.5px" : "-0.4px",
              fontWeight: serif ? 400 : 500,
              fontFamily: serif ? SERIF : "inherit",
            }}
          >
            {title}
          </h2>
          {body ? (
            <p
              className="home-section-body"
              style={{
                margin: "7px 0 0",
                color: "#888",
                fontSize: "clamp(12px, 2.2vw, 14px)",
                lineHeight: 1.65,
                maxWidth: 680,
              }}
            >
              {body}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HomeDashboardClient({
  trendingMovies,
  trendingSeries,
  trendingBooks,
}: {
  trendingMovies: DashboardItem[];
  trendingSeries: DashboardItem[];
  trendingBooks: DashboardItem[];
}) {
  const { user, displayName } = useAuth();
  const [diaryEntries, setDiaryEntries] = useState<DiaryMovie[]>([]);
  const [recentEntries, setRecentEntries] = useState<RecentMediaItem[]>([]);
  const [watchlistEntries, setWatchlistEntries] = useState<WatchlistEntry[]>([]);
  const [friendsActivity, setFriendsActivity] = useState<FriendsActivityEntry[]>([]);
  const [friendsHasFollows, setFriendsHasFollows] = useState<boolean | null>(null);
  const [friendsActivityLoading, setFriendsActivityLoading] = useState(false);

  useEffect(() => {
    setDiaryEntries(getDiaryMovies());
    setRecentEntries(getRecentMedia());
    setWatchlistEntries(getWatchlist());
    const unsubDiary = subscribeToDiary(() => setDiaryEntries(getDiaryMovies()));
    const unsubWatchlist = subscribeToWatchlist(() => setWatchlistEntries(getWatchlist()));
    return () => {
      unsubDiary();
      unsubWatchlist();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadFriendsActivity() {
      if (!user?.id) return;
      setFriendsActivityLoading(true);
      try {
        const result = await getFriendsActivity(user.id);
        if (mounted) {
          setFriendsActivity(result.entries);
          setFriendsHasFollows(result.hasFollows);
        }
      } finally {
        if (mounted) setFriendsActivityLoading(false);
      }
    }

    if (user) {
      void loadFriendsActivity();
      const unsub = subscribeToFollows(() => void loadFriendsActivity());
      return () => {
        mounted = false;
        unsub();
      };
    } else {
      setFriendsActivity([]);
      setFriendsHasFollows(null);
      setFriendsActivityLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [user]);

  // ── Derived / computed ─────────────────────────────────────────────────────

  const continueWatching = useMemo(
    () =>
      recentEntries.slice(0, 8).map((e) => ({
        id: e.id,
        mediaType: e.mediaType,
        title: e.title,
        year: e.year,
        subtitle: e.director,
        poster: e.poster,
        href: getMediaHref({ id: e.id, mediaType: e.mediaType }),
      })),
    [recentEntries]
  );

  const recentlyLogged = useMemo(() => diaryEntries.slice(0, 8), [diaryEntries]);

  const topRated = useMemo(
    () =>
      [...diaryEntries]
        .filter((e) => typeof e.rating === "number")
        .sort((a, b) => {
          const diff = (b.rating ?? 0) - (a.rating ?? 0);
          if (diff !== 0) return diff;
          return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
        })
        .slice(0, 8),
    [diaryEntries]
  );

  const tonightPickItems = useMemo(
    () =>
      watchlistEntries
        .filter((e) => e.mediaType === "movie" || e.mediaType === "tv")
        .map((e) => ({
          id: e.id,
          title: e.title,
          poster: e.poster ?? null,
          year: e.year,
          media_type: e.mediaType,
          creator: e.director ?? null,
          media_id: e.id,
          added_at: e.addedAt,
        })),
    [watchlistEntries]
  );

  const quickStats = useMemo(() => {
    const watchlistCount = watchlistEntries.filter(
      (e) => e.mediaType === "movie" || e.mediaType === "tv"
    ).length;
    const readingShelfCount = watchlistEntries.filter((e) => e.mediaType === "book").length;
    return { diaryCount: diaryEntries.length, watchlistCount, readingShelfCount };
  }, [diaryEntries.length, watchlistEntries]);

  // Most-logged titles across the friends activity feed
  const trendingAmongFriends = useMemo(() => {
    if (friendsActivity.length < 2) return [];
    const counts = new Map<string, { count: number; entry: FriendsActivityEntry }>();
    for (const entry of friendsActivity) {
      const key = `${entry.mediaType}:${entry.id}`;
      const hit = counts.get(key);
      if (hit) {
        hit.count += 1;
      } else {
        counts.set(key, { count: 1, entry });
      }
    }
    return Array.from(counts.values())
      .filter(({ count }) => count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(({ count, entry }) => ({
        id: entry.id,
        mediaType: entry.mediaType,
        title: entry.title,
        poster: entry.poster,
        year: entry.year,
        href: entry.href,
        count,
      }));
  }, [friendsActivity]);

  const heroFeaturedEntry = friendsActivity[0] ?? null;
  const heroBackdrop =
    heroFeaturedEntry?.poster ?? trendingMovies[0]?.poster ?? null;
  const timeOfDay = getTimeOfDay();

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main style={{ padding: "8px 0 80px" }}>
      <style>{`
        /* ── Scrolling rows ── */
        .home-row {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          overflow-y: visible;
          -webkit-overflow-scrolling: touch;
          scroll-snap-type: x proximity;
          scrollbar-width: none;
          padding-bottom: 4px;
        }
        .home-row::-webkit-scrollbar { display: none; }
        .home-row > * { scroll-snap-align: start; }

        /* ── Skeleton pulse ── */
        @keyframes rs-pulse { 0%,100%{opacity:1} 50%{opacity:.38} }
        .friends-skeleton { animation: rs-pulse 1.8s ease-in-out infinite; }

        /* ── Hero ── */
        .home-hero {
          display: grid;
          grid-template-columns: 1fr 300px;
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          margin-bottom: clamp(22px, 4.5vw, 34px);
          border: 1px solid rgba(255,255,255,0.07);
          background: #0c0c0c;
          box-shadow: 0 24px 64px rgba(0,0,0,0.55);
          min-height: 260px;
        }
        .home-hero-featured { display: flex; }

        /* ── Two-column layout ── */
        .home-two-col {
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) minmax(260px, 0.75fr);
          gap: 16px;
          margin-bottom: clamp(32px, 6vw, 48px);
        }

        /* ── Quick actions ── */
        .home-actions-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        /* ── Mobile search (hidden on desktop) ── */
        .home-mobile-search { display: none; margin-bottom: 12px; }

        /* ── Section body (hidden on small screens) ── */
        /* .home-section-body intentionally always visible — override below if needed */

        /* ── Breakpoints ── */
        @media (max-width: 960px) {
          .home-hero { grid-template-columns: 1fr; }
          .home-hero-featured { display: none !important; }
          .home-two-col { grid-template-columns: 1fr; }
        }

        @media (max-width: 680px) {
          .home-row { gap: 8px; }
          .home-mobile-search { display: flex; }
          .home-section-body { display: none !important; }
          .home-actions-grid { gap: 8px; }
        }
      `}</style>

      {/* Mobile search */}
      <button
        type="button"
        className="home-mobile-search"
        onClick={() =>
          typeof window !== "undefined" &&
          window.dispatchEvent(new CustomEvent("rs:open-search"))
        }
        style={{
          width: "100%",
          alignItems: "center",
          gap: 10,
          height: 44,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.04)",
          color: "#7f7f7f",
          fontSize: 14,
          cursor: "pointer",
          fontFamily: SANS,
          textAlign: "left",
          padding: "0 14px",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <span>Search films, series, books…</span>
      </button>

      {/* ══════════════════════════════════════════════════════════════
          HERO
          ══════════════════════════════════════════════════════════════ */}
      <div className="home-hero">
        {/* Cinematic backdrop blur */}
        {heroBackdrop && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${heroBackdrop})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.065,
              filter: "blur(52px) saturate(1.8)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
        )}

        {/* ── Left: greeting ── */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            padding: "clamp(22px, 4.5vw, 36px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              color: "#585858",
              fontSize: 11,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              fontFamily: SANS,
            }}
          >
            Discovery Dashboard
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(1.75rem, 5.5vw, 3.4rem)",
              lineHeight: 1.02,
              letterSpacing: "clamp(-1.2px, -0.28vw, -2.8px)",
              fontWeight: 400,
              fontFamily: SERIF,
            }}
          >
            Good {timeOfDay}
            {displayName ? `, ${displayName}` : ""}
          </h1>

          <p
            style={{
              margin: "11px 0 0",
              color: "#909090",
              fontSize: "clamp(13px, 2.4vw, 15px)",
              lineHeight: 1.65,
              maxWidth: 480,
            }}
          >
            {heroFeaturedEntry
              ? `${
                  heroFeaturedEntry.displayName ||
                  heroFeaturedEntry.username ||
                  "Someone you follow"
                } just ${getActivityType(heroFeaturedEntry)} ${
                  heroFeaturedEntry.title
                }. Your circle is active.`
              : "Pick up where you left off — your diary, shelves, and recommendations are waiting."}
          </p>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: "clamp(14px, 3vw, 22px)",
            }}
          >
            <Link
              href="/movies"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 38,
                padding: "0 16px",
                borderRadius: 999,
                background: "white",
                color: "black",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: SANS,
                letterSpacing: "0.01em",
              }}
            >
              Discover films
            </Link>
            <Link
              href="/series"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 38,
                padding: "0 16px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "white",
                textDecoration: "none",
                fontSize: 13,
                fontFamily: SANS,
                letterSpacing: "0.01em",
              }}
            >
              Explore series
            </Link>
          </div>

          {/* Inline stats */}
          <div
            style={{
              display: "flex",
              gap: 22,
              flexWrap: "wrap",
              marginTop: "clamp(18px, 3.5vw, 26px)",
            }}
          >
            {[
              { label: "Diary", value: quickStats.diaryCount, href: "/diary" },
              {
                label: "Watchlist",
                value: quickStats.watchlistCount,
                href: "/watchlist",
              },
              {
                label: "Books",
                value: quickStats.readingShelfCount,
                href: "/reading-shelf",
              },
            ].map((stat) => (
              <Link
                key={stat.label}
                href={stat.href}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  display: "flex",
                  alignItems: "baseline",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontSize: "clamp(22px, 4vw, 28px)",
                    fontWeight: 700,
                    letterSpacing: "-1px",
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {stat.value}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "#585858",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontFamily: SANS,
                  }}
                >
                  {stat.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Right: featured friend activity ── */}
        <div
          className="home-hero-featured"
          style={{
            position: "relative",
            borderLeft: "1px solid rgba(255,255,255,0.06)",
            overflow: "hidden",
          }}
        >
          {heroFeaturedEntry ? (
            <Link
              href={heroFeaturedEntry.href}
              style={{
                display: "flex",
                flexDirection: "column",
                textDecoration: "none",
                color: "inherit",
                height: "100%",
                position: "relative",
              }}
            >
              {heroFeaturedEntry.poster && (
                <img
                  src={heroFeaturedEntry.poster}
                  alt={heroFeaturedEntry.title}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: 0.42,
                  }}
                />
              )}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.97) 100%)",
                }}
              />
              <div
                style={{
                  position: "relative",
                  marginTop: "auto",
                  padding: "16px 18px",
                }}
              >
                <p
                  style={{
                    margin: "0 0 3px",
                    fontSize: 9,
                    color: "rgba(255,255,255,0.38)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontFamily: SANS,
                  }}
                >
                  Just {getActivityType(heroFeaturedEntry)} by{" "}
                  {heroFeaturedEntry.displayName ||
                    heroFeaturedEntry.username ||
                    "a friend"}
                </p>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 17,
                    fontWeight: 600,
                    letterSpacing: "-0.4px",
                    lineHeight: 1.2,
                  }}
                >
                  {heroFeaturedEntry.title}
                </h3>
                {typeof heroFeaturedEntry.rating === "number" && (
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 13,
                      color: "#f0c060",
                      fontWeight: 600,
                      fontFamily: SANS,
                      letterSpacing: "-0.2px",
                    }}
                  >
                    {heroFeaturedEntry.rating.toFixed(1)} / 10
                  </p>
                )}
                {heroFeaturedEntry.review.trim() && (
                  <p
                    style={{
                      margin: "7px 0 0",
                      fontSize: 11,
                      color: "rgba(255,255,255,0.58)",
                      lineHeight: 1.55,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      fontStyle: "italic",
                    }}
                  >
                    &ldquo;{heroFeaturedEntry.review}&rdquo;
                  </p>
                )}
              </div>
            </Link>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                padding: "24px 20px",
                justifyContent: "flex-end",
                background: "linear-gradient(180deg, #111 0%, #0a0a0a 100%)",
              }}
            >
              <p
                style={{
                  margin: "0 0 6px",
                  fontSize: 10,
                  color: "#444",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontFamily: SANS,
                }}
              >
                Tonight on ReelShelf
              </p>
              <h3
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 400,
                  color: "#555",
                  lineHeight: 1.4,
                  fontFamily: SERIF,
                }}
              >
                Follow a few shelves to see what your circle is watching
              </h3>
              <Link
                href="/discover"
                style={{
                  marginTop: 12,
                  display: "inline-flex",
                  alignItems: "center",
                  height: 34,
                  padding: "0 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "transparent",
                  color: "rgba(255,255,255,0.6)",
                  textDecoration: "none",
                  fontSize: 12,
                  fontFamily: SANS,
                }}
              >
                Discover people
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TONIGHT'S PICK
          ══════════════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: "clamp(28px, 5vw, 40px)" }}>
        <div
          style={{
            borderRadius: 22,
            border: "1px solid rgba(255,255,255,0.07)",
            background:
              "radial-gradient(circle at top right, rgba(255,255,255,0.035), transparent 38%), linear-gradient(180deg, rgba(15,15,15,0.96) 0%, rgba(9,9,9,0.96) 100%)",
            padding: "clamp(16px, 3.5vw, 22px)",
          }}
        >
          <TonightsPick watchlistItems={tonightPickItems} />
        </div>
      </section>

      <BecauseYouLiked
        diaryEntries={diaryEntries.map((e) => ({
          media_id: e.id,
          title: e.title,
          rating: e.rating,
          watched_date: e.watchedDate,
        }))}
      />

      <GamificationWidgets variant="home" />
      <DailyReelCard />
      <WeeklyChallengesSection />

      {/* ══════════════════════════════════════════════════════════════
          WHAT FRIENDS ARE WATCHING
          ══════════════════════════════════════════════════════════════ */}
      <Section
        eyebrow="Social"
        title="What friends are watching"
        body="Recent watches, reads, and reviews from people you follow."
        serif
      >
        {friendsActivityLoading && friendsActivity.length === 0 ? (
          <div className="home-row">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="friends-skeleton"
                style={{
                  width: "min(200px, 44vw)",
                  flexShrink: 0,
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.05)",
                  background: "rgba(255,255,255,0.03)",
                  aspectRatio: "2 / 3",
                }}
              />
            ))}
          </div>
        ) : friendsActivity.length > 0 ? (
          <div className="home-row">
            {friendsActivity.map((entry) => (
              <FriendActivityCard
                key={`${entry.profileId}-${entry.mediaType}-${entry.id}-${entry.savedAt}`}
                entry={entry}
              />
            ))}
          </div>
        ) : friendsHasFollows ? (
          <EmptyRow
            title="No recent activity from your shelves yet"
            body="The people you follow haven't logged anything recently. Check back soon."
            href="/discover"
            cta="Explore ReelShelf"
          />
        ) : (
          <EmptyRow
            title="Follow a few shelves to light this up"
            body="Once you follow public ReelShelf profiles, their latest diary entries will surface here."
            href="/discover"
            cta="Explore ReelShelf"
          />
        )}
      </Section>

      {/* ══════════════════════════════════════════════════════════════
          TRENDING IN YOUR CIRCLE  (only shown when 2+ friends log same title)
          ══════════════════════════════════════════════════════════════ */}
      {trendingAmongFriends.length > 0 && (
        <Section
          eyebrow="Your Circle"
          title="Trending in your circle"
          body="Titles your friends are all logging right now."
          serif
        >
          <div className="home-row">
            {trendingAmongFriends.map((item) => (
              <TrendingTile
                key={`${item.mediaType}-${item.id}`}
                item={item}
                count={item.count}
              />
            ))}
          </div>
        </Section>
      )}

      {/* ══════════════════════════════════════════════════════════════
          PEOPLE TO FOLLOW
          ══════════════════════════════════════════════════════════════ */}
      <PeopleToFollowSection variant="home" />

      {/* ══════════════════════════════════════════════════════════════
          CONTINUE YOUR WORLD  +  QUICK ACTIONS
          ══════════════════════════════════════════════════════════════ */}
      <div className="home-two-col">
        <div>
          <Section
            eyebrow="Continue"
            title="Continue where you left off"
            body="Jump back into the titles you opened most recently."
          >
            {continueWatching.length > 0 ? (
              <div className="home-row">
                {continueWatching.map((item) => (
                  <MediaCard key={`${item.mediaType}-${item.id}`} item={item} />
                ))}
              </div>
            ) : (
              <EmptyRow
                title="Start exploring your library"
                body="Open a film, series, or book detail page and ReelShelf will keep it here for quick return visits."
                href="/movies"
                cta="Browse titles"
              />
            )}
          </Section>
        </div>

        <div>
          <Section eyebrow="Quick Actions" title="Jump straight in">
            <div className="home-actions-grid">
              {[
                {
                  href: "/movies",
                  title: "Add to Diary",
                  body: "Log something new from the catalogue.",
                },
                {
                  href: "/watchlist",
                  title: "Watchlist",
                  body: "Return to your saved films and series.",
                },
                {
                  href: "/reading-shelf",
                  title: "Reading Shelf",
                  body: "Pick up your next saved book.",
                },
              ].map((action) => (
                <Link
                  key={action.title}
                  href={action.href}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <article
                    style={{
                      height: "100%",
                      borderRadius: 18,
                      border: "1px solid rgba(255,255,255,0.07)",
                      background:
                        "linear-gradient(180deg, rgba(15,15,15,0.95) 0%, rgba(9,9,9,0.95) 100%)",
                      padding: "14px 16px",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 6px",
                        color: "#585858",
                        fontSize: 9,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        fontFamily: SANS,
                      }}
                    >
                      Quick action
                    </p>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 16,
                        lineHeight: 1.12,
                        letterSpacing: "-0.45px",
                        fontWeight: 500,
                      }}
                    >
                      {action.title}
                    </h3>
                    <p
                      style={{
                        margin: "7px 0 0",
                        color: "#8a8a8a",
                        fontSize: 12,
                        lineHeight: 1.6,
                      }}
                    >
                      {action.body}
                    </p>
                  </article>
                </Link>
              ))}
            </div>
          </Section>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          RECENTLY LOGGED
          ══════════════════════════════════════════════════════════════ */}
      <Section
        eyebrow="Diary"
        title="Recently logged"
        body="Your latest reactions, fresh from the journal."
        serif
        action={
          <Link
            href="/diary"
            style={{
              color: "#b0b0b0",
              textDecoration: "none",
              fontSize: 13,
              fontFamily: SANS,
            }}
          >
            Open diary
          </Link>
        }
      >
        {recentlyLogged.length > 0 ? (
          <div className="home-row">
            {recentlyLogged.map((entry) => (
              <DiaryCard key={`${entry.mediaType}-${entry.id}`} entry={entry} />
            ))}
          </div>
        ) : (
          <EmptyRow
            title="Your diary is ready"
            body="Log a title to start building a timeline of ratings, reviews, and favourites."
            href="/movies"
            cta="Log something"
          />
        )}
      </Section>

      {/* ══════════════════════════════════════════════════════════════
          TOP RATED BY YOU
          ══════════════════════════════════════════════════════════════ */}
      <Section
        eyebrow="Your Taste"
        title="Top rated by you"
        body="The entries you've scored highest across your diary."
      >
        {topRated.length > 0 ? (
          <div className="home-row">
            {topRated.map((entry) => (
              <DiaryCard key={`${entry.mediaType}-${entry.id}`} entry={entry} />
            ))}
          </div>
        ) : (
          <EmptyRow
            title="Rate a few entries to unlock this row"
            body="Once you've added diary ratings, ReelShelf will surface your highest-scored favourites here."
            href="/diary"
            cta="Open diary"
          />
        )}
      </Section>

      <BecauseYouLikedRow
        mediaType="movie"
        title="Because you liked your favourite films"
        body="More films aligned with the directors and moods you rate highly."
      />
      <BecauseYouLikedRow
        mediaType="tv"
        title="Because you liked your favourite series"
        body="Series picked from the creators and tones you keep returning to."
      />
      <BecauseYouLikedRow
        mediaType="book"
        title="Because you liked your favourite books"
        body="Books shaped by the authors and genres you've loved in your diary."
      />

      {/* ══════════════════════════════════════════════════════════════
          DISCOVER
          ══════════════════════════════════════════════════════════════ */}
      <Section
        eyebrow="Discover"
        title="Trending films"
        body="A strong slate for your next movie night."
      >
        <div className="home-row">
          {trendingMovies.map((item) => (
            <MediaCard key={`${item.mediaType}-${item.id}`} item={item} />
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Discover"
        title="Trending series"
        body="Prestige television, genre standouts, and cult favourites."
      >
        <div className="home-row">
          {trendingSeries.map((item) => (
            <MediaCard key={`${item.mediaType}-${item.id}`} item={item} />
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Discover"
        title="Trending books"
        body="A curated shelf of modern favourites and lasting essentials."
      >
        <div className="home-row">
          {trendingBooks.map((item) => (
            <MediaCard key={`${item.mediaType}-${item.id}`} item={item} />
          ))}
        </div>
      </Section>
    </main>
  );
}
