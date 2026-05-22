"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import { getMediaHref } from "../../lib/mediaRoutes";
import type { MediaType } from "../../lib/media";
import {
  getFriendsActivity,
  subscribeToFollows,
  type FriendsActivityEntry,
} from "../../lib/supabase/social";

// ─── Types ─────────────────────────────────────────────────────────────────────

type DashboardItem = {
  id: string;
  mediaType: MediaType;
  title: string;
  year: number;
  subtitle?: string;
  poster?: string | null;
  href: string;
};

// ─── Font stacks ───────────────────────────────────────────────────────────────

const SANS = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';

// ─── Utilities ─────────────────────────────────────────────────────────────────

function getActivityType(entry: FriendsActivityEntry) {
  if (entry.review.trim()) return "reviewed";
  if (typeof entry.rating === "number") return "rated";
  return "logged";
}

function getSeriesScopeBadge(entry: FriendsActivityEntry) {
  if (entry.mediaType !== "tv") return null;
  if (entry.reviewScope === "season" && entry.seasonNumber)
    return `S${entry.seasonNumber}`;
  if (entry.reviewScope === "episode" && entry.seasonNumber && entry.episodeNumber)
    return `S${entry.seasonNumber}E${entry.episodeNumber}`;
  if (entry.reviewScope === "show") return "Show";
  return null;
}

function formatRecencyLabel(date: string) {
  const deltaMs = Date.now() - new Date(date).getTime();
  const minutes = Math.max(1, Math.floor(deltaMs / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getMediaLabel(mediaType: MediaType) {
  if (mediaType === "movie") return "Film";
  if (mediaType === "tv") return "Series";
  return "Book";
}

// ─── Poster tile — the dominant card pattern ───────────────────────────────────

function PosterTile({
  title,
  mediaType,
  poster,
  href,
  rating,
  width,
  badge,
}: {
  title: string;
  mediaType: MediaType;
  poster?: string | null;
  href: string;
  rating?: number | null;
  width?: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        width: width ?? "min(108px, 26vw)",
        flexShrink: 0,
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div
        style={{
          position: "relative",
          borderRadius: 8,
          overflow: "hidden",
          paddingBottom: "148%",
          background: "#111",
          border: "1px solid rgba(255,255,255,0.055)",
        }}
      >
        {poster ? (
          <img
            src={poster}
            alt={title}
            loading="lazy"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#1c1c1c 0%,#0d0d0d 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "rgba(255,255,255,0.09)", fontSize: 18, fontWeight: 700, fontFamily: SANS }}>{title[0]}</span>
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 48%, rgba(0,0,0,0.88) 100%)" }} />
        {typeof rating === "number" && (
          <div style={{
            position: "absolute", top: 4, right: 4,
            background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
            borderRadius: 4, padding: "2px 5px",
            color: "#f0c060", fontSize: 9, fontWeight: 700, fontFamily: SANS,
          }}>
            {rating.toFixed(1)}
          </div>
        )}
        {badge && (
          <div style={{
            position: "absolute", top: 4, left: 4,
            background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)",
            borderRadius: 4, padding: "2px 5px",
            color: "rgba(255,255,255,0.65)", fontSize: 7.5, fontFamily: SANS,
          }}>
            {badge}
          </div>
        )}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "5px 6px" }}>
          <p style={{ margin: 0, fontSize: 7, color: "rgba(255,255,255,0.32)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: SANS }}>
            {getMediaLabel(mediaType)}
          </p>
          <h3 style={{
            margin: "1px 0 0", fontSize: 9.5, fontWeight: 600, lineHeight: 1.2, letterSpacing: "-0.1px",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {title}
          </h3>
        </div>
      </div>
    </Link>
  );
}

// ─── Friend activity card ──────────────────────────────────────────────────────

function FriendActivityCard({ entry }: { entry: FriendsActivityEntry }) {
  const ownerLabel = entry.displayName || (entry.username ? `@${entry.username}` : "Friend");
  const recency = formatRecencyLabel(entry.savedAt);
  const watchedOn = entry.watchedDate
    ? new Date(entry.watchedDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;
  const scopeBadge = getSeriesScopeBadge(entry);

  return (
    <article
      style={{
        position: "relative",
        width: "min(168px, 40vw)",
        flexShrink: 0,
        borderRadius: 11,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.07)",
        background: "#0d0d0d",
        boxShadow: "0 4px 18px rgba(0,0,0,0.42)",
      }}
    >
      {/* Avatar — sibling of poster link, sits above via z-index */}
      <Link
        href={entry.username ? `/u/${entry.username}` : "#"}
        aria-label={ownerLabel}
        style={{ position: "absolute", top: 7, left: 7, zIndex: 10, display: "block", textDecoration: "none", borderRadius: 999 }}
      >
        <div style={{
          width: 22, height: 22, borderRadius: 999, overflow: "hidden",
          border: "1.5px solid rgba(255,255,255,0.28)", background: "#222",
          display: "grid", placeItems: "center",
        }}>
          {entry.avatarUrl ? (
            <img src={entry.avatarUrl} alt={ownerLabel} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 7, fontWeight: 700, fontFamily: SANS }}>
              {getProfileInitials({ displayName: entry.displayName, username: entry.username })}
            </span>
          )}
        </div>
      </Link>

      {/* Rating badge */}
      {typeof entry.rating === "number" && (
        <div style={{
          position: "absolute", top: 7, right: 7, zIndex: 10,
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
          borderRadius: 5, padding: "2px 5px",
          color: "#f0c060", fontSize: 9, fontWeight: 700, fontFamily: SANS,
        }}>
          {entry.rating.toFixed(1)}
        </div>
      )}

      {/* Poster link */}
      <Link href={entry.href} style={{ display: "block", position: "relative", paddingBottom: "142%", textDecoration: "none", color: "inherit" }}>
        {entry.poster ? (
          <img src={entry.poster} alt={entry.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#1a1a1a 0%,#0f0f0f 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "rgba(255,255,255,0.09)", fontSize: 28, fontWeight: 700, fontFamily: SANS }}>R</span>
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0) 38%, rgba(0,0,0,0.92) 100%)" }} />
        {scopeBadge && (
          <div style={{ position: "absolute", bottom: 36, right: 6, zIndex: 2 }}>
            <span style={{ background: "rgba(45,212,191,0.12)", backdropFilter: "blur(6px)", border: "1px solid rgba(45,212,191,0.18)", borderRadius: 4, padding: "1px 5px", fontSize: 7, letterSpacing: "0.04em", textTransform: "uppercase", color: "rgba(45,212,191,0.82)", fontFamily: SANS }}>
              {scopeBadge}
            </span>
          </div>
        )}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "6px 7px" }}>
          <p style={{ margin: 0, fontSize: 7, color: "rgba(255,255,255,0.36)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: SANS }}>
            {getMediaLabel(entry.mediaType)} · {recency}
          </p>
          <h3 style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 600, lineHeight: 1.2, letterSpacing: "-0.15px", color: "white", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {entry.title}
          </h3>
          {entry.username && (
            <p style={{ margin: "1px 0 0", fontSize: 8, color: "rgba(255,255,255,0.28)", fontFamily: SANS }}>@{entry.username}</p>
          )}
        </div>
      </Link>

      {/* Review or watched date */}
      {entry.review.trim() ? (
        <Link href={entry.href} style={{ display: "block", padding: "5px 7px 6px", borderTop: "1px solid rgba(255,255,255,0.05)", textDecoration: "none", color: "inherit" }}>
          <p style={{ margin: 0, fontSize: 9, color: "rgba(255,255,255,0.44)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontStyle: "italic" }}>
            &ldquo;{entry.review}&rdquo;
          </p>
        </Link>
      ) : watchedOn ? (
        <div style={{ padding: "4px 7px 5px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p style={{ margin: 0, fontSize: 7, color: "rgba(255,255,255,0.2)", fontFamily: SANS }}>Watched {watchedOn}</p>
        </div>
      ) : null}
    </article>
  );
}

// ─── Section ───────────────────────────────────────────────────────────────────

function Section({
  eyebrow,
  title,
  children,
  action,
  serif,
}: {
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  serif?: boolean;
}) {
  return (
    <section style={{ marginBottom: "clamp(14px, 3vw, 22px)" }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        gap: 8, marginBottom: "clamp(7px, 1.6vw, 11px)",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
          {eyebrow && (
            <span style={{ color: "#424242", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: SANS }}>
              {eyebrow}
            </span>
          )}
          <h2 style={{
            margin: 0,
            fontSize: serif ? "clamp(16px, 2.8vw, 20px)" : "clamp(13px, 2.4vw, 16px)",
            lineHeight: 1.1,
            letterSpacing: serif ? "-0.35px" : "-0.2px",
            fontWeight: serif ? 400 : 500,
            fontFamily: serif ? SERIF : "inherit",
          }}>
            {title}
          </h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// ─── Inline empty state — no giant card ────────────────────────────────────────

function EmptyRail({ message, href, cta }: { message: string; href: string; cta: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
      <p style={{ margin: 0, color: "#424242", fontSize: 12, fontFamily: SANS }}>{message}</p>
      <Link href={href} style={{
        flexShrink: 0, color: "rgba(255,255,255,0.44)", textDecoration: "none", fontSize: 11,
        fontFamily: SANS, border: "1px solid rgba(255,255,255,0.09)", borderRadius: 999, padding: "3px 10px",
      }}>
        {cta}
      </Link>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

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
  const [watchlistEntries, setWatchlistEntries] = useState<WatchlistEntry[]>([]);
  const [friendsActivity, setFriendsActivity] = useState<FriendsActivityEntry[]>([]);
  const [friendsHasFollows, setFriendsHasFollows] = useState<boolean | null>(null);
  const [friendsActivityLoading, setFriendsActivityLoading] = useState(false);

  useEffect(() => {
    setDiaryEntries(getDiaryMovies());
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

  // ── Derived ──────────────────────────────────────────────────────────────────

  const recentlyLogged = useMemo(() => diaryEntries.slice(0, 14), [diaryEntries]);

  const topRated = useMemo(
    () => [...diaryEntries]
      .filter((e) => typeof e.rating === "number")
      .sort((a, b) => {
        const diff = (b.rating ?? 0) - (a.rating ?? 0);
        return diff !== 0 ? diff : new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
      })
      .slice(0, 14),
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

  // Poster sources for hero collage (friend entries + trending fallback)
  const heroStackPosters = useMemo(() => {
    const out: Array<{ poster: string; title: string }> = [];
    for (const e of friendsActivity) {
      if (e.poster && out.length < 4) out.push({ poster: e.poster, title: e.title });
    }
    for (const e of trendingMovies) {
      if (out.length >= 4) break;
      if (e.poster) out.push({ poster: e.poster, title: e.title });
    }
    return out;
  }, [friendsActivity, trendingMovies]);

  const heroFeaturedEntry = friendsActivity[0] ?? null;
  const heroBackdrop = heroFeaturedEntry?.poster ?? trendingMovies[0]?.poster ?? null;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <main style={{ padding: "4px 0 80px" }}>
      <style>{`
        /* Scroll rails */
        .home-row {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scroll-snap-type: x proximity;
          scrollbar-width: none;
          padding-bottom: 2px;
        }
        .home-row::-webkit-scrollbar { display: none; }
        .home-row > * { scroll-snap-align: start; }

        /* Skeleton pulse */
        @keyframes rs-pulse { 0%,100%{opacity:1} 50%{opacity:.28} }
        .friends-skeleton { animation: rs-pulse 1.9s ease-in-out infinite; }

        /* Enter key glow */
        @keyframes rs-key-glow {
          0%, 100% { box-shadow: 0 1px 0 rgba(255,255,255,0.1), 0 0 0 rgba(255,255,255,0); border-color: rgba(255,255,255,0.16); }
          50% { box-shadow: 0 1px 0 rgba(255,255,255,0.1), 0 0 12px rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.32); }
        }
        .home-enter-key {
          display: inline-flex;
          align-items: center;
          padding: 2px 9px 2px 8px;
          border: 1px solid rgba(255,255,255,0.16);
          border-bottom-width: 2.5px;
          border-radius: 6px;
          font-size: 10px;
          letter-spacing: 0.04em;
          background: rgba(255,255,255,0.045);
          color: rgba(255,255,255,0.6);
          font-family: ${SANS};
          vertical-align: middle;
          margin: 0 5px;
          animation: rs-key-glow 3.5s ease-in-out infinite;
        }

        /* Cinematic hero */
        .home-hero {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: clamp(16px, 3.2vw, 22px);
          border: 1px solid rgba(255,255,255,0.06);
          background: #090909;
          height: clamp(160px, 20vw, 240px);
          display: grid;
          grid-template-columns: 1fr 200px;
        }
        .hero-poster-panel { display: flex; }

        /* Generator wrap */
        .home-generator-wrap {
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.07);
          background: linear-gradient(180deg, rgba(11,11,11,0.98) 0%, rgba(6,6,6,0.99) 100%);
          padding: clamp(12px, 2.2vw, 16px);
          margin-bottom: clamp(14px, 3vw, 22px);
        }

        /* Mobile search */
        .home-mobile-search { display: none; margin-bottom: 10px; }

        @media (max-width: 800px) {
          .home-hero { grid-template-columns: 1fr; }
          .hero-poster-panel { display: none !important; }
        }
        @media (max-width: 640px) {
          .home-row { gap: 6px; }
          .home-mobile-search { display: flex; }
          .home-enter-key { font-size: 9px; padding: 1px 7px; }
        }
      `}</style>

      {/* Mobile search */}
      <button
        type="button"
        className="home-mobile-search"
        onClick={() => typeof window !== "undefined" && window.dispatchEvent(new CustomEvent("rs:open-search"))}
        style={{
          width: "100%", alignItems: "center", gap: 9, height: 40, borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)",
          color: "#5a5a5a", fontSize: 13, cursor: "pointer", fontFamily: SANS,
          textAlign: "left", padding: "0 14px",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
        <span>Search films, series, books…</span>
      </button>

      {/* ══ CINEMATIC HERO ══════════════════════════════════════════════════════ */}
      <div className="home-hero">
        {/* Blurred backdrop */}
        {heroBackdrop && (
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `url(${heroBackdrop})`,
            backgroundSize: "cover", backgroundPosition: "center top",
            opacity: 0.14, filter: "blur(44px) saturate(1.7)",
            pointerEvents: "none", zIndex: 0,
          }} />
        )}
        {/* Depth vignette */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 72% 50%, transparent 28%, rgba(0,0,0,0.55) 100%)", pointerEvents: "none", zIndex: 0 }} />

        {/* Brand content */}
        <div style={{
          position: "relative", zIndex: 1,
          padding: "clamp(14px, 2.8vw, 22px)",
          display: "flex", flexDirection: "column", justifyContent: "center",
        }}>
          <p style={{ margin: "0 0 7px", color: "#3c3c3c", fontSize: 8.5, letterSpacing: "0.09em", textTransform: "uppercase", fontFamily: SANS }}>
            Cinema · Television · Literature · Taste
          </p>
          <div style={{ fontSize: "clamp(13px, 2.4vw, 17px)", lineHeight: 1.48, fontWeight: 400, fontFamily: SERIF, color: "rgba(255,255,255,0.8)" }}>
            Press
            <span className="home-enter-key">Enter ↵</span>
            to your ReelShelf universe
          </div>

          {/* Live social ticker */}
          {heroFeaturedEntry && (
            <Link href={heroFeaturedEntry.href} style={{ textDecoration: "none", color: "inherit", marginTop: "clamp(9px, 1.8vw, 13px)", display: "flex", alignItems: "center", gap: 6 }}>
              {heroFeaturedEntry.poster && (
                <div style={{ width: 20, height: 28, borderRadius: 3, overflow: "hidden", flexShrink: 0, border: "1px solid rgba(255,255,255,0.09)" }}>
                  <img src={heroFeaturedEntry.poster} alt={heroFeaturedEntry.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
              )}
              <p style={{ margin: 0, fontSize: "clamp(8px, 1.5vw, 10px)", color: "rgba(255,255,255,0.32)", lineHeight: 1.4, fontFamily: SANS }}>
                <span style={{ color: "rgba(255,255,255,0.54)" }}>@{heroFeaturedEntry.username || "friend"}</span>
                {" "}just {getActivityType(heroFeaturedEntry)}{" "}
                <span style={{ color: "rgba(255,255,255,0.54)" }}>{heroFeaturedEntry.title}</span>
                {typeof heroFeaturedEntry.rating === "number" && <span style={{ color: "#f0c060" }}> · {heroFeaturedEntry.rating.toFixed(1)}</span>}
              </p>
            </Link>
          )}
        </div>

        {/* Poster collage panel */}
        <div className="hero-poster-panel" style={{ position: "relative", overflow: "hidden" }}>
          {/* Left fade to blend with content */}
          <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 48, background: "linear-gradient(to right, #090909, transparent)", zIndex: 3, pointerEvents: "none" }} />
          {heroStackPosters.length > 0 && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {heroStackPosters.slice(0, 3).map((src, i) => {
                const rotations = [-6, 4, -1.5];
                const scales = [0.74, 0.86, 1];
                const translateX = ["-16%", "10%", "0%"];
                const translateY = ["-10%", "6%", "0%"];
                const opacities = [0.35, 0.62, 1];
                const zIndexes = [1, 2, 4];
                return (
                  <div
                    key={`${src.poster}-${i}`}
                    style={{
                      position: "absolute",
                      width: "clamp(58px, 9vw, 80px)",
                      aspectRatio: "2 / 3",
                      borderRadius: 7,
                      overflow: "hidden",
                      boxShadow: "0 6px 24px rgba(0,0,0,0.72)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      transform: `rotate(${rotations[i]}deg) scale(${scales[i]}) translateX(${translateX[i]}) translateY(${translateY[i]})`,
                      opacity: opacities[i],
                      zIndex: zIndexes[i],
                    }}
                  >
                    <img src={src.poster} alt={src.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══ WHAT FRIENDS ARE WATCHING ═══════════════════════════════════════════ */}
      <Section
        eyebrow="Social"
        title="What friends are watching"
        serif
        action={
          <Link href="/discover" style={{ color: "#424242", textDecoration: "none", fontSize: 10, fontFamily: SANS }}>
            Find people
          </Link>
        }
      >
        {friendsActivityLoading && friendsActivity.length === 0 ? (
          <div className="home-row">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="friends-skeleton" style={{ width: "min(168px, 40vw)", flexShrink: 0, borderRadius: 11, border: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.018)", paddingBottom: "145%" }} />
            ))}
          </div>
        ) : friendsActivity.length > 0 ? (
          <div className="home-row">
            {friendsActivity.map((entry) => (
              <FriendActivityCard key={`${entry.profileId}-${entry.mediaType}-${entry.id}-${entry.savedAt}`} entry={entry} />
            ))}
          </div>
        ) : friendsHasFollows ? (
          <EmptyRail message="No recent activity from your circle yet." href="/discover" cta="Explore" />
        ) : (
          <EmptyRail message="Follow a few shelves to see what your circle is watching." href="/discover" cta="Discover people" />
        )}
      </Section>

      {/* ══ TRENDING AMONG FRIENDS ══════════════════════════════════════════════ */}
      {trendingAmongFriends.length > 0 && (
        <Section eyebrow="Your Circle" title="Trending among friends" serif>
          <div className="home-row">
            {trendingAmongFriends.map((item) => (
              <PosterTile
                key={`${item.mediaType}-${item.id}`}
                title={item.title}
                mediaType={item.mediaType}
                poster={item.poster}
                href={item.href}
                badge={`${item.count}×`}
              />
            ))}
          </div>
        </Section>
      )}

      {/* ══ RECENTLY LOGGED ════════════════════════════════════════════════════ */}
      <Section
        eyebrow="Diary"
        title="Recently logged"
        serif
        action={
          <Link href="/diary" style={{ color: "#424242", textDecoration: "none", fontSize: 10, fontFamily: SANS }}>
            Open diary
          </Link>
        }
      >
        {recentlyLogged.length > 0 ? (
          <div className="home-row">
            {recentlyLogged.map((entry) => (
              <PosterTile
                key={`${entry.mediaType}-${entry.id}`}
                title={entry.title}
                mediaType={entry.mediaType}
                poster={entry.poster}
                href={getMediaHref({ id: entry.id, mediaType: entry.mediaType })}
                rating={entry.rating}
              />
            ))}
          </div>
        ) : (
          <EmptyRail message="Log your first film, series, or book." href="/movies" cta="Browse titles" />
        )}
      </Section>

      {/* ══ PICK SOMETHING TONIGHT ══════════════════════════════════════════════ */}
      <div className="home-generator-wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "clamp(9px, 1.8vw, 13px)" }}>
          <div>
            <p style={{ margin: "0 0 2px", color: "#3e3e3e", fontSize: 8.5, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: SANS }}>Tonight</p>
            <h2 style={{ margin: 0, fontSize: "clamp(15px, 2.8vw, 19px)", fontWeight: 400, letterSpacing: "-0.3px", lineHeight: 1, fontFamily: SERIF }}>
              Pick something for me
            </h2>
          </div>
          <Link href="/watchlist" style={{ color: "#424242", textDecoration: "none", fontSize: 10, fontFamily: SANS }}>Open watchlist</Link>
        </div>
        <TonightsPick watchlistItems={tonightPickItems} />
      </div>

      {/* ══ DAILY REEL ══════════════════════════════════════════════════════════ */}
      <DailyReelCard />

      {/* ══ BECAUSE YOU LIKED ═══════════════════════════════════════════════════ */}
      <BecauseYouLiked
        diaryEntries={diaryEntries.map((e) => ({
          media_id: e.id, title: e.title, rating: e.rating, watched_date: e.watchedDate,
        }))}
      />

      {/* ══ PEOPLE WITH YOUR TASTE ══════════════════════════════════════════════ */}
      <PeopleToFollowSection variant="home" />

      {/* ══ GAMIFICATION ════════════════════════════════════════════════════════ */}
      <GamificationWidgets variant="home" />
      <WeeklyChallengesSection />

      {/* ══ TOP RATED ═══════════════════════════════════════════════════════════ */}
      {topRated.length > 0 && (
        <Section
          eyebrow="Your Taste"
          title="Top rated by you"
          action={
            <Link href="/diary" style={{ color: "#424242", textDecoration: "none", fontSize: 10, fontFamily: SANS }}>
              Full diary
            </Link>
          }
        >
          <div className="home-row">
            {topRated.map((entry) => (
              <PosterTile
                key={`${entry.mediaType}-${entry.id}`}
                title={entry.title}
                mediaType={entry.mediaType}
                poster={entry.poster}
                href={getMediaHref({ id: entry.id, mediaType: entry.mediaType })}
                rating={entry.rating}
              />
            ))}
          </div>
        </Section>
      )}

      {/* ══ RECOMMENDATION ROWS ═════════════════════════════════════════════════ */}
      <BecauseYouLikedRow mediaType="movie" title="More films you'll love" />
      <BecauseYouLikedRow mediaType="tv" title="Series matched to your taste" />
      <BecauseYouLikedRow mediaType="book" title="Books picked for you" />

      {/* ══ DISCOVERY RAILS ═════════════════════════════════════════════════════ */}
      {trendingMovies.length > 0 && (
        <Section eyebrow="Discover" title="Trending films">
          <div className="home-row">
            {trendingMovies.map((item) => (
              <PosterTile
                key={`${item.mediaType}-${item.id}`}
                title={item.title}
                mediaType={item.mediaType}
                poster={item.poster}
                href={item.href}
              />
            ))}
          </div>
        </Section>
      )}

      {trendingSeries.length > 0 && (
        <Section eyebrow="Discover" title="Trending series">
          <div className="home-row">
            {trendingSeries.map((item) => (
              <PosterTile
                key={`${item.mediaType}-${item.id}`}
                title={item.title}
                mediaType={item.mediaType}
                poster={item.poster}
                href={item.href}
              />
            ))}
          </div>
        </Section>
      )}

      {trendingBooks.length > 0 && (
        <Section eyebrow="Discover" title="Trending books">
          <div className="home-row">
            {trendingBooks.map((item) => (
              <PosterTile
                key={`${item.mediaType}-${item.id}`}
                title={item.title}
                mediaType={item.mediaType}
                poster={item.poster}
                href={item.href}
              />
            ))}
          </div>
        </Section>
      )}
    </main>
  );
}
