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

type DashboardItem = {
  id: string;
  mediaType: MediaType;
  title: string;
  year: number;
  subtitle?: string;
  poster?: string | null;
  href: string;
};

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

  if (entry.reviewScope === "season" && entry.seasonNumber) {
    return `S${entry.seasonNumber} review`;
  }

  if (entry.reviewScope === "episode" && entry.seasonNumber && entry.episodeNumber) {
    return `S${entry.seasonNumber} E${entry.episodeNumber} review`;
  }

  if (entry.reviewScope === "show") {
    return "Show review";
  }

  return null;
}

function formatRecencyLabel(date: string) {
  const deltaMs = Date.now() - new Date(date).getTime();
  const minutes = Math.max(1, Math.floor(deltaMs / 60000));

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getMediaBadgeLabel(mediaType: MediaType) {
  if (mediaType === "movie") return "FILM";
  if (mediaType === "tv") return "SERIES";
  return "BOOK";
}

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
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.08)",
        background:
          "linear-gradient(180deg, rgba(18,18,18,0.92) 0%, rgba(10,10,10,0.94) 100%)",
        padding: 22,
      }}
    >
      <p
        style={{
          margin: "0 0 8px",
          color: "#7f7f7f",
          fontSize: 11,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
        }}
      >
        Nothing here yet
      </p>
      <h3
        style={{
          margin: 0,
          fontSize: "clamp(18px, 4vw, 24px)",
          letterSpacing: "-0.5px",
          fontWeight: 500,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: "10px 0 0",
          color: "#b9b9b9",
          fontSize: "clamp(13px, 2.8vw, 15px)",
          lineHeight: 1.65,
          maxWidth: 560,
        }}
      >
        {body}
      </p>
      <Link
        href={href}
        style={{
          marginTop: 16,
          display: "inline-flex",
          alignItems: "center",
          height: 40,
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
        {cta}
      </Link>
    </div>
  );
}

function MediaCard({ item }: { item: DashboardItem }) {
  const mediaType =
    item.mediaType === "movie" ? "film" : item.mediaType === "tv" ? "series" : "book";

  return (
    <div style={{ width: "min(160px, 40vw)", flexShrink: 0 }}>
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
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
        }}
      >
        ReelShelf
      </span>

      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.58)",
          fontSize: 16,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
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
        width: "min(300px, calc(100vw - 28px))",
        flexShrink: 0,
      }}
    >
      <article
        style={{
          display: "grid",
          gridTemplateColumns: "88px minmax(0, 1fr)",
          gap: 14,
          padding: 14,
          borderRadius: 22,
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "linear-gradient(180deg, rgba(18,18,18,0.95) 0%, rgba(8,8,8,0.95) 100%)",
        }}
      >
        <div
          style={{
            position: "relative",
            aspectRatio: "2 / 3",
            borderRadius: 14,
            overflow: "hidden",
            background:
              "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 55%), linear-gradient(180deg, #151515 0%, #0b0b0b 100%)",
          }}
        >
          {entry.poster ? (
            <img
              src={entry.poster}
              alt={entry.title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <CardFallback label={entry.mediaType === "book" ? "B" : "R"} />
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <span
              style={{
                color: "#8f8f8f",
                fontSize: 10,
                lineHeight: 1,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              }}
            >
              {getMediaBadgeLabel(entry.mediaType)}
            </span>

            <span
              style={{
                color: "white",
                fontSize: 16,
                lineHeight: 1,
                letterSpacing: "-0.4px",
                fontWeight: 600,
              }}
            >
              {formatDiaryRating(entry.rating)}
            </span>
          </div>

          <h3
            style={{
              margin: 0,
              fontSize: 18,
              lineHeight: 1.18,
              letterSpacing: "-0.5px",
              fontWeight: 500,
            }}
          >
            {entry.title}
          </h3>

          <p
            style={{
              margin: "7px 0 0",
              color: "#9ca3af",
              fontSize: 13,
              lineHeight: 1.55,
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            {entry.year || "—"}
            {entry.director ? ` · ${entry.director}` : ""}
          </p>

          {entry.review.trim() ? (
            <p
              style={{
                margin: "10px 0 0",
                color: "#d1d5db",
                fontSize: 13,
                lineHeight: 1.65,
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

function FriendActivityCard({ entry }: { entry: FriendsActivityEntry }) {
  const ownerLabel = entry.displayName || (entry.username ? `@${entry.username}` : "Friend");
  const activityType = getActivityType(entry);
  const recency = formatRecencyLabel(entry.savedAt);

  return (
    <article
      style={{
        width: "min(316px, calc(100vw - 60px))",
        flexShrink: 0,
        display: "grid",
        gridTemplateColumns: "88px minmax(0, 1fr)",
        gap: 14,
        padding: 14,
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.08)",
        background:
          "radial-gradient(circle at top right, rgba(255,255,255,0.05), transparent 28%), linear-gradient(180deg, rgba(18,18,18,0.96) 0%, rgba(8,8,8,0.96) 100%)",
        boxShadow: "0 18px 48px rgba(0,0,0,0.24)",
      }}
    >
      <Link
        href={entry.href}
        style={{
          position: "relative",
          aspectRatio: "2 / 3",
          borderRadius: 16,
          overflow: "hidden",
          background:
            "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 55%), linear-gradient(180deg, #151515 0%, #0b0b0b 100%)",
        }}
      >
        {entry.poster ? (
          <img
            src={entry.poster}
            alt={entry.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <CardFallback label={entry.mediaType === "book" ? "B" : "R"} />
        )}
      </Link>

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <Link
            href={entry.username ? `/u/${entry.username}` : "#"}
            style={{
              textDecoration: "none",
              color: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                overflow: "hidden",
                background:
                  "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 60%), linear-gradient(180deg, #171717 0%, #0b0b0b 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
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
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                  }}
                >
                  {getProfileInitials({
                    displayName: entry.displayName,
                    username: entry.username,
                  })}
                </span>
              )}
            </div>

            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  color: "white",
                  fontSize: 13,
                  lineHeight: 1.2,
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                }}
              >
                {ownerLabel}
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  color: "#7f7f7f",
                  fontSize: 10,
                  lineHeight: 1,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                }}
              >
                {entry.username ? `@${entry.username}` : "Public profile"}
              </p>
            </div>
          </Link>

          <div
            style={{
              display: "grid",
              justifyItems: "end",
              gap: 6,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                padding: "6px 9px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                color: "#e5e7eb",
                fontSize: 10,
                lineHeight: 1,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              }}
            >
              {activityType}
            </span>
            <span
              style={{
                color: "#8f8f8f",
                fontSize: 11,
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              }}
            >
              {recency}
            </span>
          </div>
        </div>

        <Link href={entry.href} style={{ textDecoration: "none", color: "inherit" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <span
              style={{
                color: "#7f7f7f",
                fontSize: 10,
                lineHeight: 1,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              }}
            >
              {getMediaBadgeLabel(entry.mediaType)}
            </span>

            {typeof entry.rating === "number" ? (
              <span
                style={{
                  color: "white",
                  fontSize: 16,
                  lineHeight: 1,
                  letterSpacing: "-0.4px",
                  fontWeight: 600,
                }}
              >
                {entry.rating.toFixed(1)} / 10
              </span>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 19,
                lineHeight: 1.18,
                letterSpacing: "-0.5px",
                fontWeight: 500,
              }}
            >
              {entry.title}
            </h3>

            {getSeriesScopeBadge(entry) ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: 24,
                  padding: "0 8px",
                  borderRadius: 999,
                  border: "1px solid rgba(45, 212, 191, 0.18)",
                  background: "rgba(45, 212, 191, 0.09)",
                  color: "#d5fffb",
                  fontSize: 9,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                }}
              >
                {getSeriesScopeBadge(entry)}
              </span>
            ) : null}
          </div>

          <p
            style={{
              margin: "7px 0 0",
              color: "#9ca3af",
              fontSize: 13,
              lineHeight: 1.55,
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            {entry.year || "—"}
            {entry.creator ? ` · ${entry.creator}` : ""}
          </p>

          <p
            style={{
              margin: "12px 0 0",
              color: "#d1d5db",
              fontSize: 13,
              lineHeight: 1.65,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {entry.review.trim()
              ? `"${entry.review}"`
              : typeof entry.rating === "number"
                ? `Rated this ${entry.mediaType === "book" ? "book" : entry.mediaType === "tv" ? "series" : "film"} ${entry.rating.toFixed(1)} out of 10.`
                : "Logged this title to ReelShelf."}
          </p>
        </Link>
      </div>
    </article>
  );
}

function Section({
  eyebrow,
  title,
  body,
  children,
  action,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: "clamp(22px, 5vw, 38px)" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-end",
          flexWrap: "wrap",
          marginBottom: "clamp(10px, 2.5vw, 16px)",
        }}
      >
        <div>
          {eyebrow ? (
            <p
              style={{
                margin: "0 0 6px",
                color: "#7f7f7f",
                fontSize: 11,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              }}
            >
              {eyebrow}
            </p>
          ) : null}

          <h2
            style={{
              margin: 0,
              fontSize: "clamp(20px, 4.5vw, 32px)",
              lineHeight: 1.06,
              letterSpacing: "clamp(-0.4px, -0.08vw, -1px)",
              fontWeight: 500,
            }}
          >
            {title}
          </h2>

          {body ? (
            <p
              className="home-section-body"
              style={{
                margin: "8px 0 0",
                color: "#a8a8a8",
                fontSize: "clamp(13px, 2.5vw, 15px)",
                lineHeight: 1.65,
                maxWidth: 760,
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

  useEffect(() => {
    setDiaryEntries(getDiaryMovies());
    setRecentEntries(getRecentMedia());
    setWatchlistEntries(getWatchlist());
    const unsubscribeDiary = subscribeToDiary(() => {
      setDiaryEntries(getDiaryMovies());
    });
    const unsubscribeWatchlist = subscribeToWatchlist(() => {
      setWatchlistEntries(getWatchlist());
    });

    return () => {
      unsubscribeDiary();
      unsubscribeWatchlist();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadFriendsActivity() {
      const activity = await getFriendsActivity();

      if (mounted) {
        setFriendsActivity(activity);
      }
    }

    if (user) {
      void loadFriendsActivity();
      const unsubscribe = subscribeToFollows(() => {
        void loadFriendsActivity();
      });

      return () => {
        mounted = false;
        unsubscribe();
      };
    } else {
      setFriendsActivity([]);
    }

    return () => {
      mounted = false;
    };
  }, [user]);

  const continueWatching = useMemo(
    () =>
      recentEntries.slice(0, 8).map((entry) => ({
        id: entry.id,
        mediaType: entry.mediaType,
        title: entry.title,
        year: entry.year,
        subtitle: entry.director,
        poster: entry.poster,
        href: getMediaHref({ id: entry.id, mediaType: entry.mediaType }),
      })),
    [recentEntries]
  );

  const recentlyLogged = useMemo(() => diaryEntries.slice(0, 8), [diaryEntries]);

  const topRated = useMemo(
    () =>
      [...diaryEntries]
        .filter((entry) => typeof entry.rating === "number")
        .sort((a, b) => {
          const left = a.rating || 0;
          const right = b.rating || 0;

          if (right !== left) {
            return right - left;
          }

          return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
        })
        .slice(0, 8),
    [diaryEntries]
  );

  const tonightPickItems = useMemo(
    () =>
      watchlistEntries
        .filter((entry) => entry.mediaType === "movie" || entry.mediaType === "tv")
        .map((entry) => ({
          id: entry.id,
          title: entry.title,
          poster: entry.poster ?? null,
          year: entry.year,
          media_type: entry.mediaType,
          creator: entry.director ?? null,
          media_id: entry.id,
          added_at: entry.addedAt,
        })),
    [watchlistEntries]
  );

  const quickStats = useMemo(() => {
    const watchlistCount = watchlistEntries.filter(
      (entry) => entry.mediaType === "movie" || entry.mediaType === "tv"
    ).length;
    const readingShelfCount = watchlistEntries.filter(
      (entry) => entry.mediaType === "book"
    ).length;

    return {
      diaryCount: diaryEntries.length,
      watchlistCount,
      readingShelfCount,
    };
  }, [diaryEntries.length, watchlistEntries]);

  return (
    <main style={{ padding: "8px 0 64px" }}>
      <style>{`
        .home-row {
          display: flex;
          gap: 14px;
          overflow-x: auto;
          overflow-y: visible;
          -webkit-overflow-scrolling: touch;
          scroll-snap-type: x proximity;
          scrollbar-width: none;
          padding-bottom: 6px;
          scroll-padding-left: 4px;
        }
        .home-row::-webkit-scrollbar { display: none; }
        .home-row > * { scroll-snap-align: start; }

        .home-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.65fr);
          gap: 18px;
          margin-bottom: 22px;
        }

        .home-actions-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .home-priority-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(300px, 0.85fr);
          gap: 18px;
          margin-bottom: 28px;
        }

        /* mobile-only elements hidden by default */
        .home-mobile-search { display: none; margin-bottom: 12px; }
        .home-stats-mobile { display: none; }

        @media (max-width: 960px) {
          .home-hero-grid,
          .home-priority-grid,
          .home-actions-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .home-row { gap: 10px; }
          .home-hero-grid { gap: 0; margin-bottom: 0; }
          .home-actions-grid { gap: 10px; }
          .home-priority-grid { gap: 14px; margin-bottom: 22px; }

          .home-mobile-search { display: flex; }

          .home-hero-card { border-radius: 22px !important; padding: 14px 16px 14px !important; }
          .home-hero-body { display: none !important; }
          .home-stats-card { display: none !important; }
          .home-section-body { display: none !important; }

          .home-stats-mobile {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin: 10px 0 18px;
          }
        }
      `}</style>

      {/* Mobile search bar — only visible on small screens */}
      <button
        type="button"
        className="home-mobile-search"
        onClick={() => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("rs:open-search"));
          }
        }}
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
          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
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

      <section className="home-hero-grid">
        <div
          className="home-hero-card"
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 30,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 28%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.06), transparent 20%), linear-gradient(180deg, rgba(18,18,18,0.98) 0%, rgba(7,7,7,0.98) 100%)",
            padding: "clamp(18px, 4.5vw, 30px) clamp(18px, 5vw, 30px) clamp(16px, 4.5vw, 26px)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
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
            Discovery Dashboard
          </p>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(1.6rem, 6vw, 52px)",
              lineHeight: 1.0,
              letterSpacing: "clamp(-1px, -0.3vw, -2.4px)",
              fontWeight: 600,
              maxWidth: 720,
            }}
          >
            Welcome back{displayName ? `, ${displayName}` : ""}
          </h1>

          <p
            className="home-hero-body"
            style={{
              margin: "10px 0 0",
              color: "#c7c7c7",
              fontSize: "clamp(13px, 3vw, 16px)",
              lineHeight: 1.55,
              maxWidth: 760,
            }}
          >
            Pick up where you left off, revisit your latest thoughts, and discover
            what to watch or read next.
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
                height: 40,
                padding: "0 16px",
                borderRadius: 999,
                background: "white",
                color: "black",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
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
                height: 40,
                padding: "0 16px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "white",
                textDecoration: "none",
                fontSize: 13,
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                letterSpacing: "0.01em",
              }}
            >
              Explore series
            </Link>
          </div>
        </div>

        <div
          className="home-stats-card"
          style={{
            borderRadius: 30,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(18,18,18,0.95) 0%, rgba(10,10,10,0.96) 100%)",
            padding: "clamp(16px, 4vw, 22px)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.24)",
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
            At a glance
          </p>

          <div style={{ display: "grid", gap: 12 }}>
            {[
              {
                label: "Diary entries",
                value: quickStats.diaryCount,
                detail: "Your logged timeline across all media.",
              },
              {
                label: "Watchlist",
                value: quickStats.watchlistCount,
                detail: "Films and series waiting for a night in.",
              },
              {
                label: "Reading Shelf",
                value: quickStats.readingShelfCount,
                detail: "Books saved for your next reading stretch.",
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  borderRadius: 20,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  padding: "14px 16px",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#8f8f8f",
                    fontSize: 11,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                  }}
                >
                  {item.label}
                </p>
                <h2
                  style={{
                    margin: "6px 0 0",
                    fontSize: "clamp(26px, 6vw, 34px)",
                    lineHeight: 1,
                    letterSpacing: "-1px",
                    fontWeight: 600,
                  }}
                >
                  {item.value}
                </h2>
                <p
                  style={{
                    margin: "6px 0 0",
                    color: "#a7a7a7",
                    fontSize: 12,
                    lineHeight: 1.5,
                    fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                  }}
                >
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile stats strip — replaces the hidden sidebar on small screens */}
      <div className="home-stats-mobile">
        {[
          { label: "Diary", value: quickStats.diaryCount },
          { label: "Watchlist", value: quickStats.watchlistCount },
          { label: "Books", value: quickStats.readingShelfCount },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              padding: "10px 12px",
              textAlign: "center",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 22,
                lineHeight: 1,
                letterSpacing: "-0.8px",
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {stat.value}
            </h3>
            <p
              style={{
                margin: "5px 0 0",
                color: "#8f8f8f",
                fontSize: 11,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              }}
            >
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <section style={{ marginBottom: 28 }}>
        <div
          style={{
            borderRadius: 26,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "radial-gradient(circle at top right, rgba(255,255,255,0.05), transparent 30%), linear-gradient(180deg, rgba(18,18,18,0.95) 0%, rgba(10,10,10,0.96) 100%)",
            padding: "clamp(18px, 4vw, 24px)",
            boxShadow: "0 18px 48px rgba(0,0,0,0.22)",
          }}
        >
          <TonightsPick
            watchlistItems={tonightPickItems}
          />
        </div>
      </section>

      <BecauseYouLiked
        diaryEntries={diaryEntries.map((entry) => ({
          media_id: entry.id,
          title: entry.title,
          rating: entry.rating,
          watched_date: entry.watchedDate,
        }))}
      />

      <GamificationWidgets variant="home" />
      <DailyReelCard />
      <WeeklyChallengesSection />

      <section className="home-priority-grid">
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
          <Section
            eyebrow="Quick Actions"
            title="Jump straight into your next move"
            body="Fast routes back into your diary, watchlist, and reading shelf."
          >
            <div className="home-actions-grid">
              {[
                {
                  href: "/movies",
                  title: "Add to Diary",
                  body: "Log something new from the catalogue.",
                },
                {
                  href: "/watchlist",
                  title: "Open Watchlist",
                  body: "Return to saved films and series.",
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
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <article
                    style={{
                      height: "100%",
                      borderRadius: 22,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background:
                        "linear-gradient(180deg, rgba(18,18,18,0.95) 0%, rgba(10,10,10,0.95) 100%)",
                      padding: 18,
                      boxShadow: "0 18px 48px rgba(0,0,0,0.22)",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 8px",
                        color: "#7f7f7f",
                        fontSize: 10,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                      }}
                    >
                      Quick action
                    </p>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 20,
                        lineHeight: 1.08,
                        letterSpacing: "-0.7px",
                        fontWeight: 500,
                      }}
                    >
                      {action.title}
                    </h3>
                    <p
                      style={{
                        margin: "10px 0 0",
                        color: "#b2b2b2",
                        fontSize: 13,
                        lineHeight: 1.65,
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
      </section>

      <Section
        eyebrow="Social"
        title="Friends activity"
        body="Recent diary entries from the shelves you follow."
      >
        {friendsActivity.length > 0 ? (
          <div className="home-row">
            {friendsActivity.map((entry) => (
              <FriendActivityCard
                key={`${entry.profileId}-${entry.mediaType}-${entry.id}-${entry.savedAt}`}
                entry={entry}
              />
            ))}
          </div>
        ) : (
          <EmptyRow
            title="Follow a few shelves to light this up"
            body="Once you follow public ReelShelf profiles, their latest diary entries will surface here."
            href="/discover"
            cta="Explore ReelShelf"
          />
        )}
      </Section>

      <PeopleToFollowSection variant="home" />

      <Section
        eyebrow="Diary"
        title="Recently logged from your diary"
        body="Your latest reactions, fresh from the journal."
        action={
          <Link
            href="/diary"
            style={{
              color: "#d1d5db",
              textDecoration: "none",
              fontSize: 14,
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
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

      <Section
        eyebrow="Your Taste"
        title="Top rated by you"
        body="The entries you’ve scored highest across your diary."
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
            body="Once you’ve added diary ratings, ReelShelf will surface your highest-scored favourites here."
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
        body="Books shaped by the authors and genres you’ve loved in your diary."
      />

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
