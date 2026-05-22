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
    return `S${entry.seasonNumber}E${entry.episodeNumber}`;
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

function getMediaLabel(mediaType: MediaType) {
  if (mediaType === "movie") return "Film";
  if (mediaType === "tv") return "Series";
  return "Book";
}

function formatDiaryRating(rating: number | null) {
  return typeof rating === "number" ? `${rating.toFixed(1)} / 10` : "No rating";
}

// ─── Shared UI components ─────────────────────────────────────────────────────

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
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.07)",
        background: "linear-gradient(180deg, rgba(14,14,14,0.92) 0%, rgba(8,8,8,0.94) 100%)",
        padding: "clamp(18px, 3.5vw, 24px)",
      }}
    >
      <p style={{ margin: "0 0 5px", color: "#555", fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: SANS }}>
        Nothing here yet
      </p>
      <h3 style={{ margin: 0, fontSize: "clamp(15px, 3vw, 19px)", letterSpacing: "-0.3px", fontWeight: 500 }}>
        {title}
      </h3>
      <p style={{ margin: "7px 0 0", color: "#888", fontSize: "clamp(12px, 2vw, 13px)", lineHeight: 1.6, maxWidth: 480 }}>
        {body}
      </p>
      <Link
        href={href}
        style={{
          marginTop: 12,
          display: "inline-flex",
          alignItems: "center",
          height: 36,
          padding: "0 14px",
          borderRadius: 999,
          background: "white",
          color: "black",
          textDecoration: "none",
          fontSize: 12,
          fontWeight: 600,
          fontFamily: SANS,
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
    <div style={{ width: "min(144px, 36vw)", flexShrink: 0 }}>
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
      style={{ textDecoration: "none", color: "inherit", width: "min(264px, calc(100vw - 28px))", flexShrink: 0 }}
    >
      <article
        style={{
          display: "grid",
          gridTemplateColumns: "76px minmax(0, 1fr)",
          gap: 12,
          padding: 12,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.07)",
          background: "linear-gradient(180deg, rgba(14,14,14,0.97) 0%, rgba(7,7,7,0.97) 100%)",
        }}
      >
        <div
          style={{
            position: "relative",
            aspectRatio: "2 / 3",
            borderRadius: 10,
            overflow: "hidden",
            background: "#141414",
          }}
        >
          {entry.poster ? (
            <img
              src={entry.poster}
              alt={entry.title}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.16)", fontSize: 20, fontWeight: 700 }}>
              {entry.mediaType === "book" ? "B" : "R"}
            </div>
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ color: "#555", fontSize: 9, letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: SANS }}>
              {getMediaLabel(entry.mediaType)}
            </span>
            <span style={{ color: "white", fontSize: 13, letterSpacing: "-0.3px", fontWeight: 600 }}>
              {formatDiaryRating(entry.rating)}
            </span>
          </div>
          <h3 style={{ margin: 0, fontSize: 14, lineHeight: 1.22, letterSpacing: "-0.3px", fontWeight: 500 }}>
            {entry.title}
          </h3>
          <p style={{ margin: "4px 0 0", color: "#707070", fontSize: 11, lineHeight: 1.5, fontFamily: SANS }}>
            {entry.year || "—"}{entry.director ? ` · ${entry.director}` : ""}
          </p>
          {entry.review.trim() ? (
            <p style={{ margin: "6px 0 0", color: "#b8b8b8", fontSize: 11, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {entry.review}
            </p>
          ) : null}
        </div>
      </article>
    </Link>
  );
}

// Poster-first cinematic friend activity card
function FriendActivityCard({ entry }: { entry: FriendsActivityEntry }) {
  const ownerLabel = entry.displayName || (entry.username ? `@${entry.username}` : "Friend");
  const recency = formatRecencyLabel(entry.savedAt);
  const watchedOn = entry.watchedDate
    ? new Date(entry.watchedDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;
  const scopeBadge = getSeriesScopeBadge(entry);

  return (
    <article
      style={{
        position: "relative",
        width: "min(196px, 43vw)",
        flexShrink: 0,
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "#0e0e0e",
        boxShadow: "0 6px 24px rgba(0,0,0,0.48)",
      }}
    >
      {/* Avatar — sibling of poster link, stacks above it via z-index */}
      <Link
        href={entry.username ? `/u/${entry.username}` : "#"}
        aria-label={ownerLabel}
        style={{ position: "absolute", top: 8, left: 8, zIndex: 10, display: "block", textDecoration: "none", borderRadius: 999 }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 999,
            overflow: "hidden",
            border: "1.5px solid rgba(255,255,255,0.3)",
            background: "#222",
            display: "grid",
            placeItems: "center",
          }}
        >
          {entry.avatarUrl ? (
            <img src={entry.avatarUrl} alt={ownerLabel} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 8, fontWeight: 700, fontFamily: SANS }}>
              {getProfileInitials({ displayName: entry.displayName, username: entry.username })}
            </span>
          )}
        </div>
      </Link>

      {/* Rating badge */}
      {typeof entry.rating === "number" && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 10,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            borderRadius: 6,
            padding: "3px 6px",
            color: "#f0c060",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "-0.1px",
            fontFamily: SANS,
          }}
        >
          {entry.rating.toFixed(1)}
        </div>
      )}

      {/* Poster link */}
      <Link
        href={entry.href}
        style={{ display: "block", position: "relative", paddingBottom: "148%", textDecoration: "none", color: "inherit" }}
      >
        {entry.poster ? (
          <img
            src={entry.poster}
            alt={entry.title}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "rgba(255,255,255,0.14)", fontSize: 36, fontWeight: 700, fontFamily: SANS }}>
              {entry.mediaType === "book" ? "B" : "R"}
            </span>
          </div>
        )}

        {/* Gradient overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0) 38%, rgba(0,0,0,0.94) 100%)" }} />

        {/* Cinema badge */}
        {entry.watchedInCinema && (
          <div style={{ position: "absolute", bottom: 44, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
            <span style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", borderRadius: 4, padding: "2px 6px", fontSize: 7, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.8)", fontFamily: SANS }}>
              Cinema
            </span>
          </div>
        )}

        {/* Scope badge */}
        {scopeBadge && (
          <div style={{ position: "absolute", bottom: entry.watchedInCinema ? 58 : 44, right: 7 }}>
            <span style={{ background: "rgba(45,212,191,0.13)", backdropFilter: "blur(6px)", border: "1px solid rgba(45,212,191,0.2)", borderRadius: 4, padding: "2px 6px", fontSize: 7, letterSpacing: "0.04em", textTransform: "uppercase", color: "rgba(45,212,191,0.88)", fontFamily: SANS }}>
              {scopeBadge}
            </span>
          </div>
        )}

        {/* Bottom info overlay */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "9px" }}>
          <p style={{ margin: 0, fontSize: 8, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: SANS }}>
            {getMediaLabel(entry.mediaType)} · {recency}
          </p>
          <h3 style={{ margin: "2px 0 0", fontSize: 12, fontWeight: 600, lineHeight: 1.22, letterSpacing: "-0.15px", color: "white", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {entry.title}
          </h3>
          {entry.username && (
            <p style={{ margin: "1px 0 0", fontSize: 9, color: "rgba(255,255,255,0.36)", fontFamily: SANS }}>
              @{entry.username}
            </p>
          )}
        </div>
      </Link>

      {/* Review snippet */}
      {entry.review.trim() ? (
        <Link href={entry.href} style={{ display: "block", padding: "8px 10px 9px", borderTop: "1px solid rgba(255,255,255,0.05)", textDecoration: "none", color: "inherit" }}>
          <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.52)", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontStyle: "italic" }}>
            &ldquo;{entry.review}&rdquo;
          </p>
          {watchedOn && (
            <p style={{ margin: "4px 0 0", fontSize: 8, color: "rgba(255,255,255,0.26)", fontFamily: SANS }}>
              Watched {watchedOn}
            </p>
          )}
        </Link>
      ) : watchedOn ? (
        <div style={{ padding: "6px 10px 7px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p style={{ margin: 0, fontSize: 8, color: "rgba(255,255,255,0.26)", fontFamily: SANS }}>Watched {watchedOn}</p>
        </div>
      ) : null}
    </article>
  );
}

// Compact trending tile
function TrendingTile({
  item,
  count,
}: {
  item: { id: string; mediaType: MediaType; title: string; poster: string | null; href: string };
  count: number;
}) {
  return (
    <Link href={item.href} style={{ textDecoration: "none", color: "inherit", flexShrink: 0, width: "min(132px, 34vw)", display: "block" }}>
      <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", background: "#0f0f0f" }}>
        <div style={{ position: "relative", paddingBottom: "148%" }}>
          {item.poster ? (
            <img src={item.poster} alt={item.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{ position: "absolute", inset: 0, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "rgba(255,255,255,0.16)", fontSize: 26, fontWeight: 700 }}>R</span>
            </div>
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 46%, rgba(0,0,0,0.9) 100%)" }} />
          <div style={{ position: "absolute", top: 6, right: 6 }}>
            <span style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)", borderRadius: 5, padding: "2px 6px", fontSize: 8, color: "rgba(255,255,255,0.72)", fontFamily: SANS }}>
              {count}× logged
            </span>
          </div>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "7px 8px" }}>
            <p style={{ margin: 0, fontSize: 8, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: SANS }}>
              {getMediaLabel(item.mediaType)}
            </p>
            <h3 style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 600, lineHeight: 1.22, letterSpacing: "-0.15px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
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
    <section style={{ marginBottom: "clamp(26px, 5vw, 40px)" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "flex-end",
          flexWrap: "wrap",
          marginBottom: "clamp(10px, 2vw, 14px)",
        }}
      >
        <div>
          {eyebrow ? (
            <p style={{ margin: "0 0 4px", color: "#555", fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: SANS }}>
              {eyebrow}
            </p>
          ) : null}
          <h2
            style={{
              margin: 0,
              fontSize: serif ? "clamp(20px, 4vw, 30px)" : "clamp(16px, 3.5vw, 24px)",
              lineHeight: 1.06,
              letterSpacing: serif ? "-0.4px" : "-0.3px",
              fontWeight: serif ? 400 : 500,
              fontFamily: serif ? SERIF : "inherit",
            }}
          >
            {title}
          </h2>
          {body ? (
            <p className="home-section-body" style={{ margin: "5px 0 0", color: "#888", fontSize: "clamp(11px, 2vw, 13px)", lineHeight: 1.6, maxWidth: 620 }}>
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
    return () => { unsubDiary(); unsubWatchlist(); };
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
      return () => { mounted = false; unsub(); };
    } else {
      setFriendsActivity([]);
      setFriendsHasFollows(null);
      setFriendsActivityLoading(false);
    }
    return () => { mounted = false; };
  }, [user]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const continueWatching = useMemo(
    () => recentEntries.slice(0, 8).map((e) => ({
      id: e.id, mediaType: e.mediaType, title: e.title, year: e.year,
      subtitle: e.director, poster: e.poster,
      href: getMediaHref({ id: e.id, mediaType: e.mediaType }),
    })),
    [recentEntries]
  );

  const recentlyLogged = useMemo(() => diaryEntries.slice(0, 8), [diaryEntries]);

  const topRated = useMemo(
    () => [...diaryEntries]
      .filter((e) => typeof e.rating === "number")
      .sort((a, b) => {
        const diff = (b.rating ?? 0) - (a.rating ?? 0);
        return diff !== 0 ? diff : new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
      })
      .slice(0, 8),
    [diaryEntries]
  );

  const tonightPickItems = useMemo(
    () => watchlistEntries
      .filter((e) => e.mediaType === "movie" || e.mediaType === "tv")
      .map((e) => ({
        id: e.id, title: e.title, poster: e.poster ?? null, year: e.year,
        media_type: e.mediaType, creator: e.director ?? null,
        media_id: e.id, added_at: e.addedAt,
      })),
    [watchlistEntries]
  );

  const quickStats = useMemo(() => {
    const watchlistCount = watchlistEntries.filter((e) => e.mediaType === "movie" || e.mediaType === "tv").length;
    const readingShelfCount = watchlistEntries.filter((e) => e.mediaType === "book").length;
    return { diaryCount: diaryEntries.length, watchlistCount, readingShelfCount };
  }, [diaryEntries.length, watchlistEntries]);

  const trendingAmongFriends = useMemo(() => {
    if (friendsActivity.length < 2) return [];
    const counts = new Map<string, { count: number; entry: FriendsActivityEntry }>();
    for (const entry of friendsActivity) {
      const key = `${entry.mediaType}:${entry.id}`;
      const hit = counts.get(key);
      if (hit) hit.count += 1;
      else counts.set(key, { count: 1, entry });
    }
    return Array.from(counts.values())
      .filter(({ count }) => count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(({ count, entry }) => ({
        id: entry.id, mediaType: entry.mediaType, title: entry.title,
        poster: entry.poster, href: entry.href, count,
      }));
  }, [friendsActivity]);

  const heroFeaturedEntry = friendsActivity[0] ?? null;
  const heroBackdrop = heroFeaturedEntry?.poster ?? trendingMovies[0]?.poster ?? null;
  const timeOfDay = getTimeOfDay();

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main style={{ padding: "6px 0 72px" }}>
      <style>{`
        /* Scroll rows */
        .home-row {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          overflow-y: visible;
          -webkit-overflow-scrolling: touch;
          scroll-snap-type: x proximity;
          scrollbar-width: none;
          padding-bottom: 3px;
        }
        .home-row::-webkit-scrollbar { display: none; }
        .home-row > * { scroll-snap-align: start; }

        /* Skeleton */
        @keyframes rs-pulse { 0%,100%{opacity:1} 50%{opacity:.36} }
        .friends-skeleton { animation: rs-pulse 1.8s ease-in-out infinite; }

        /* Enter key ambient glow */
        @keyframes rs-key-glow {
          0%, 100% { box-shadow: 0 1px 0 rgba(255,255,255,0.14), 0 0 0 rgba(255,255,255,0); border-color: rgba(255,255,255,0.2); }
          50% { box-shadow: 0 1px 0 rgba(255,255,255,0.14), 0 0 16px rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.36); }
        }
        .home-enter-key {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 3px 11px 3px 9px;
          border: 1px solid rgba(255,255,255,0.2);
          border-bottom-width: 2.5px;
          border-radius: 7px;
          font-size: 11px;
          letter-spacing: 0.04em;
          background: rgba(255,255,255,0.055);
          color: rgba(255,255,255,0.72);
          font-family: ${SANS};
          vertical-align: middle;
          margin: 0 6px;
          animation: rs-key-glow 3.5s ease-in-out infinite;
        }

        /* Identity hero */
        .home-identity-hero {
          position: relative;
          border-radius: 22px;
          overflow: hidden;
          margin-bottom: clamp(20px, 4vw, 30px);
          border: 1px solid rgba(255,255,255,0.07);
          background: #0b0b0b;
          box-shadow: 0 20px 56px rgba(0,0,0,0.5);
          display: grid;
          grid-template-columns: 1fr 260px;
        }
        .home-identity-right { display: flex; }

        /* Watchlist generator */
        .home-generator-wrap {
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.07);
          background: linear-gradient(180deg, rgba(14,14,14,0.96) 0%, rgba(8,8,8,0.98) 100%);
          padding: clamp(16px, 3vw, 22px);
          position: relative;
        }

        /* Two-column layout */
        .home-two-col {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(240px, 0.8fr);
          gap: 14px;
          margin-bottom: clamp(26px, 5vw, 40px);
        }

        /* Quick actions */
        .home-actions-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        /* Mobile search */
        .home-mobile-search { display: none; margin-bottom: 10px; }

        /* Section bodies (hidden on mobile) */
        .home-section-body { }

        /* Breakpoints */
        @media (max-width: 920px) {
          .home-identity-hero { grid-template-columns: 1fr; }
          .home-identity-right { display: none !important; }
          .home-two-col { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .home-row { gap: 7px; }
          .home-mobile-search { display: flex; }
          .home-section-body { display: none !important; }
          .home-actions-grid { gap: 7px; }
          .home-enter-key { font-size: 10px; padding: 2px 8px 2px 7px; }
        }
      `}</style>

      {/* Mobile search */}
      <button
        type="button"
        className="home-mobile-search"
        onClick={() => typeof window !== "undefined" && window.dispatchEvent(new CustomEvent("rs:open-search"))}
        style={{
          width: "100%", alignItems: "center", gap: 10, height: 42, borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
          color: "#7f7f7f", fontSize: 14, cursor: "pointer", fontFamily: SANS,
          textAlign: "left", padding: "0 14px",
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
        <span>Search films, series, books…</span>
      </button>

      {/* ══════════════════════════════════════════════════════════════
          IDENTITY HERO — compact, cinematic, brand-defining
          ══════════════════════════════════════════════════════════════ */}
      <div className="home-identity-hero">

        {/* Backdrop blur */}
        {heroBackdrop && (
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `url(${heroBackdrop})`,
            backgroundSize: "cover", backgroundPosition: "center",
            opacity: 0.055, filter: "blur(56px) saturate(1.8)",
            pointerEvents: "none", zIndex: 0,
          }} />
        )}

        {/* ── Left: identity content ── */}
        <div style={{
          position: "relative", zIndex: 1,
          padding: "clamp(20px, 4vw, 30px)",
          display: "flex", flexDirection: "column", justifyContent: "center", gap: 0,
        }}>
          {/* Eyebrow */}
          <p style={{ margin: "0 0 10px", color: "#525252", fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: SANS }}>
            Good {timeOfDay}{displayName ? `, ${displayName}` : ""} &nbsp;·&nbsp; Discovery Dashboard
          </p>

          {/* Brand identity hook */}
          <div style={{
            fontSize: "clamp(15px, 2.8vw, 20px)",
            lineHeight: 1.4,
            fontWeight: 400,
            fontFamily: SERIF,
            color: "rgba(255,255,255,0.86)",
          }}>
            Press
            <span className="home-enter-key">Enter ↵</span>
            to your ReelShelf universe
          </div>

          {/* Meta tagline */}
          <p style={{ margin: "8px 0 0", color: "#4a4a4a", fontSize: "clamp(10px, 1.8vw, 12px)", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: SANS }}>
            Cinema &nbsp;·&nbsp; Television &nbsp;·&nbsp; Literature &nbsp;·&nbsp; Taste
          </p>

          {/* Inline stats */}
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: "clamp(14px, 3vw, 20px)" }}>
            {[
              { label: "Diary", value: quickStats.diaryCount, href: "/diary" },
              { label: "Watchlist", value: quickStats.watchlistCount, href: "/watchlist" },
              { label: "Books", value: quickStats.readingShelfCount, href: "/reading-shelf" },
            ].map((stat) => (
              <Link key={stat.label} href={stat.href} style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "baseline", gap: 5 }}>
                <span style={{ fontSize: "clamp(20px, 3.5vw, 26px)", fontWeight: 700, letterSpacing: "-0.9px", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                  {stat.value}
                </span>
                <span style={{ fontSize: 10, color: "#525252", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: SANS }}>
                  {stat.label}
                </span>
              </Link>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "clamp(12px, 2.5vw, 18px)" }}>
            <Link href="/movies" style={{ display: "inline-flex", alignItems: "center", height: 36, padding: "0 14px", borderRadius: 999, background: "white", color: "black", textDecoration: "none", fontSize: 12, fontWeight: 600, fontFamily: SANS, letterSpacing: "0.01em" }}>
              Discover films
            </Link>
            <Link href="/series" style={{ display: "inline-flex", alignItems: "center", height: 36, padding: "0 14px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "white", textDecoration: "none", fontSize: 12, fontFamily: SANS }}>
              Explore series
            </Link>
          </div>

          {/* Live social ticker: most recent friend activity */}
          {heroFeaturedEntry && (
            <div style={{ marginTop: "clamp(12px, 2.5vw, 16px)", paddingTop: "clamp(10px, 2vw, 14px)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <Link href={heroFeaturedEntry.href} style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 8 }}>
                {heroFeaturedEntry.poster && (
                  <div style={{ width: 28, height: 40, borderRadius: 5, overflow: "hidden", flexShrink: 0 }}>
                    <img src={heroFeaturedEntry.poster} alt={heroFeaturedEntry.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                )}
                <p style={{ margin: 0, fontSize: "clamp(10px, 1.8vw, 12px)", color: "rgba(255,255,255,0.45)", lineHeight: 1.45, fontFamily: SANS }}>
                  <span style={{ color: "rgba(255,255,255,0.7)" }}>
                    @{heroFeaturedEntry.username || "friend"}
                  </span>
                  {" "}just {getActivityType(heroFeaturedEntry)}{" "}
                  <span style={{ color: "rgba(255,255,255,0.7)" }}>
                    {heroFeaturedEntry.title}
                  </span>
                  {typeof heroFeaturedEntry.rating === "number" && (
                    <span style={{ color: "#f0c060" }}>{" "}· {heroFeaturedEntry.rating.toFixed(1)}</span>
                  )}
                </p>
              </Link>
            </div>
          )}
        </div>

        {/* ── Right: featured friend poster ── */}
        <div className="home-identity-right" style={{ position: "relative", borderLeft: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
          {heroFeaturedEntry ? (
            <Link href={heroFeaturedEntry.href} style={{ display: "flex", flexDirection: "column", textDecoration: "none", color: "inherit", height: "100%", position: "relative" }}>
              {heroFeaturedEntry.poster && (
                <img src={heroFeaturedEntry.poster} alt={heroFeaturedEntry.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.44 }} />
              )}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.97) 100%)" }} />
              <div style={{ position: "relative", marginTop: "auto", padding: "14px 16px" }}>
                <p style={{ margin: "0 0 3px", fontSize: 9, color: "rgba(255,255,255,0.36)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: SANS }}>
                  Just {getActivityType(heroFeaturedEntry)} by {heroFeaturedEntry.displayName || heroFeaturedEntry.username || "a friend"}
                </p>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: "-0.35px", lineHeight: 1.2 }}>
                  {heroFeaturedEntry.title}
                </h3>
                {typeof heroFeaturedEntry.rating === "number" && (
                  <p style={{ margin: "3px 0 0", fontSize: 12, color: "#f0c060", fontWeight: 600, fontFamily: SANS }}>
                    {heroFeaturedEntry.rating.toFixed(1)} / 10
                  </p>
                )}
                {heroFeaturedEntry.review.trim() && (
                  <p style={{ margin: "6px 0 0", fontSize: 11, color: "rgba(255,255,255,0.56)", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", fontStyle: "italic" }}>
                    &ldquo;{heroFeaturedEntry.review}&rdquo;
                  </p>
                )}
              </div>
            </Link>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "20px 18px", justifyContent: "flex-end", background: "linear-gradient(180deg, #111 0%, #0a0a0a 100%)" }}>
              <p style={{ margin: "0 0 5px", fontSize: 9, color: "#404040", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: SANS }}>
                Tonight on ReelShelf
              </p>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: "#464646", lineHeight: 1.4, fontFamily: SERIF }}>
                Follow a few shelves to see what your circle is watching
              </p>
              <Link href="/discover" style={{ marginTop: 10, display: "inline-flex", alignItems: "center", height: 32, padding: "0 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: 11, fontFamily: SANS }}>
                Discover people
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          WHAT FRIENDS ARE WATCHING — social heart of the homepage
          ══════════════════════════════════════════════════════════════ */}
      <Section eyebrow="Social" title="What friends are watching" body="Recent watches, reads, and reviews from people you follow." serif>
        {friendsActivityLoading && friendsActivity.length === 0 ? (
          <div className="home-row">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="friends-skeleton" style={{ width: "min(196px, 43vw)", flexShrink: 0, borderRadius: 14, border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.025)", aspectRatio: "2 / 3" }} />
            ))}
          </div>
        ) : friendsActivity.length > 0 ? (
          <div className="home-row">
            {friendsActivity.map((entry) => (
              <FriendActivityCard key={`${entry.profileId}-${entry.mediaType}-${entry.id}-${entry.savedAt}`} entry={entry} />
            ))}
          </div>
        ) : friendsHasFollows ? (
          <EmptyRow title="No recent activity from your shelves yet" body="The people you follow haven't logged anything recently. Check back soon." href="/discover" cta="Explore ReelShelf" />
        ) : (
          <EmptyRow title="Follow a few shelves to light this up" body="Once you follow public ReelShelf profiles, their latest diary entries will surface here." href="/discover" cta="Explore ReelShelf" />
        )}
      </Section>

      {/* ══════════════════════════════════════════════════════════════
          TRENDING IN YOUR CIRCLE
          ══════════════════════════════════════════════════════════════ */}
      {trendingAmongFriends.length > 0 && (
        <Section eyebrow="Your Circle" title="Trending in your circle" body="Titles your friends are all logging right now." serif>
          <div className="home-row">
            {trendingAmongFriends.map((item) => (
              <TrendingTile key={`${item.mediaType}-${item.id}`} item={item} count={item.count} />
            ))}
          </div>
        </Section>
      )}

      {/* ══════════════════════════════════════════════════════════════
          PICK SOMETHING TONIGHT — watchlist random generator
          ══════════════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: "clamp(26px, 5vw, 40px)" }}>
        <div className="home-generator-wrap">
          {/* Section label */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "clamp(12px, 2.5vw, 16px)" }}>
            <div>
              <p style={{ margin: "0 0 4px", color: "#555", fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: SANS }}>
                Tonight
              </p>
              <h2 style={{ margin: 0, fontSize: "clamp(18px, 3.5vw, 26px)", fontWeight: 400, letterSpacing: "-0.3px", lineHeight: 1, fontFamily: SERIF }}>
                Pick something for me
              </h2>
            </div>
            <Link href="/watchlist" style={{ color: "rgba(255,255,255,0.45)", textDecoration: "none", fontSize: 12, fontFamily: SANS }}>
              Open watchlist
            </Link>
          </div>
          <TonightsPick watchlistItems={tonightPickItems} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          PEOPLE TO FOLLOW
          ══════════════════════════════════════════════════════════════ */}
      <PeopleToFollowSection variant="home" />

      {/* ══════════════════════════════════════════════════════════════
          CONTINUE YOUR WORLD + QUICK ACTIONS
          ══════════════════════════════════════════════════════════════ */}
      <div className="home-two-col">
        <div>
          <Section eyebrow="Continue" title="Continue where you left off" body="Jump back into the titles you opened most recently.">
            {continueWatching.length > 0 ? (
              <div className="home-row">
                {continueWatching.map((item) => <MediaCard key={`${item.mediaType}-${item.id}`} item={item} />)}
              </div>
            ) : (
              <EmptyRow title="Start exploring your library" body="Open a film, series, or book detail page and ReelShelf will keep it here for quick return visits." href="/movies" cta="Browse titles" />
            )}
          </Section>
        </div>
        <div>
          <Section eyebrow="Quick Actions" title="Jump straight in">
            <div className="home-actions-grid">
              {[
                { href: "/movies", title: "Add to Diary", body: "Log something new." },
                { href: "/watchlist", title: "Watchlist", body: "Saved films & series." },
                { href: "/reading-shelf", title: "Reading Shelf", body: "Your next book." },
              ].map((action) => (
                <Link key={action.title} href={action.href} style={{ textDecoration: "none", color: "inherit" }}>
                  <article style={{ height: "100%", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", background: "linear-gradient(180deg, rgba(14,14,14,0.95) 0%, rgba(8,8,8,0.95) 100%)", padding: "13px 14px" }}>
                    <p style={{ margin: "0 0 5px", color: "#555", fontSize: 9, letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: SANS }}>Quick action</p>
                    <h3 style={{ margin: 0, fontSize: 14, lineHeight: 1.12, letterSpacing: "-0.35px", fontWeight: 500 }}>{action.title}</h3>
                    <p style={{ margin: "5px 0 0", color: "#888", fontSize: 11, lineHeight: 1.6 }}>{action.body}</p>
                  </article>
                </Link>
              ))}
            </div>
          </Section>
        </div>
      </div>

      <BecauseYouLiked
        diaryEntries={diaryEntries.map((e) => ({
          media_id: e.id, title: e.title, rating: e.rating, watched_date: e.watchedDate,
        }))}
      />

      <GamificationWidgets variant="home" />
      <DailyReelCard />
      <WeeklyChallengesSection />

      {/* ══════════════════════════════════════════════════════════════
          RECENTLY LOGGED
          ══════════════════════════════════════════════════════════════ */}
      <Section
        eyebrow="Diary"
        title="Recently logged"
        body="Your latest reactions, fresh from the journal."
        serif
        action={
          <Link href="/diary" style={{ color: "#b0b0b0", textDecoration: "none", fontSize: 12, fontFamily: SANS }}>
            Open diary
          </Link>
        }
      >
        {recentlyLogged.length > 0 ? (
          <div className="home-row">
            {recentlyLogged.map((entry) => <DiaryCard key={`${entry.mediaType}-${entry.id}`} entry={entry} />)}
          </div>
        ) : (
          <EmptyRow title="Your diary is ready" body="Log a title to start building a timeline of ratings, reviews, and favourites." href="/movies" cta="Log something" />
        )}
      </Section>

      {/* ══════════════════════════════════════════════════════════════
          TOP RATED
          ══════════════════════════════════════════════════════════════ */}
      <Section eyebrow="Your Taste" title="Top rated by you" body="The entries you've scored highest across your diary.">
        {topRated.length > 0 ? (
          <div className="home-row">
            {topRated.map((entry) => <DiaryCard key={`${entry.mediaType}-${entry.id}`} entry={entry} />)}
          </div>
        ) : (
          <EmptyRow title="Rate a few entries to unlock this row" body="Once you've added diary ratings, ReelShelf will surface your highest-scored favourites here." href="/diary" cta="Open diary" />
        )}
      </Section>

      <BecauseYouLikedRow mediaType="movie" title="Because you liked your favourite films" body="More films aligned with the directors and moods you rate highly." />
      <BecauseYouLikedRow mediaType="tv" title="Because you liked your favourite series" body="Series picked from the creators and tones you keep returning to." />
      <BecauseYouLikedRow mediaType="book" title="Because you liked your favourite books" body="Books shaped by the authors and genres you've loved in your diary." />

      {/* ══════════════════════════════════════════════════════════════
          DISCOVER
          ══════════════════════════════════════════════════════════════ */}
      <Section eyebrow="Discover" title="Trending films" body="A strong slate for your next movie night.">
        <div className="home-row">
          {trendingMovies.map((item) => <MediaCard key={`${item.mediaType}-${item.id}`} item={item} />)}
        </div>
      </Section>

      <Section eyebrow="Discover" title="Trending series" body="Prestige television, genre standouts, and cult favourites.">
        <div className="home-row">
          {trendingSeries.map((item) => <MediaCard key={`${item.mediaType}-${item.id}`} item={item} />)}
        </div>
      </Section>

      <Section eyebrow="Discover" title="Trending books" body="A curated shelf of modern favourites and lasting essentials.">
        <div className="home-row">
          {trendingBooks.map((item) => <MediaCard key={`${item.mediaType}-${item.id}`} item={item} />)}
        </div>
      </Section>
    </main>
  );
}
