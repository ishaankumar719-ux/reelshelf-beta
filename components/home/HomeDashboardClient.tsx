"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BecauseYouLiked from "./BecauseYouLiked";
import BecauseYouLikedRow from "../BecauseYouLikedRow";
import SocialRecommendations from "./SocialRecommendations";
import CircleDiscovery from "./CircleDiscovery";
import TrendingThisWeek from "./TrendingThisWeek";
import GamificationWidgets from "../GamificationWidgets";
import PeopleToFollowSection from "../PeopleToFollowSection";
import TonightsPick from "./TonightsPick";
import type { SavedItem } from "./PickCard";
import WeeklyChallengesSection from "../WeeklyChallengesSection";
import DailyReelCard from "./DailyReelCard";
import MoodRecommendations from "../MoodRecommendations/MoodRecommendations";
import ReactionTray from "../ReactionTray/ReactionTray";
import CommentDrawer from "../CommentDrawer/CommentDrawer";
import { useReviewComments } from "../../hooks/useReviewComments";
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
} from "../../lib/watchlist";
import { createClient as createSupabaseBrowserClient } from "../../lib/supabase/client";
import { getMediaHref } from "../../lib/mediaRoutes";
import type { MediaType } from "../../lib/media";
import {
  getFriendsActivity,
  subscribeToFollows,
  type FriendsActivityEntry,
} from "../../lib/supabase/social";
import DiscoveryListCard from "../lists/DiscoveryListCard";
import type { DiscoveryList } from "../../lib/supabase/lists";

// ─── Types ─────────────────────────────────────────────────────────────────────

type DashboardItem = {
  id: string;
  mediaType: MediaType;
  title: string;
  year: number;
  poster?: string | null;
  href: string;
};

type BookOfMonthItem = {
  id: string;
  title: string;
  year: number;
  author: string;
  genre: string;
  overview: string;
  coverUrl?: string | null;
  href: string;
};

type LuckyPool = {
  movie: Array<{ title: string; href: string }>;
  tv: Array<{ title: string; href: string }>;
  book: Array<{ title: string; href: string }>;
};

// ─── Constants ─────────────────────────────────────────────────────────────────

const SANS = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';

// ─── Utilities ─────────────────────────────────────────────────────────────────

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
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

function formatRecency(date: string) {
  const ms = Date.now() - new Date(date).getTime();
  const m = Math.max(1, Math.floor(ms / 60000));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function mediaLabel(t: MediaType) {
  return t === "movie" ? "Film" : t === "tv" ? "Series" : "Book";
}

function activityVerb(entry: FriendsActivityEntry) {
  if (entry.review.trim()) return "reviewed";
  if (typeof entry.rating === "number") return "rated";
  return "logged";
}

// ─── Poster tile ───────────────────────────────────────────────────────────────

function PosterTile({
  title,
  mediaType,
  poster,
  href,
  rating,
  badge,
}: {
  title: string;
  mediaType: MediaType;
  poster?: string | null;
  href: string;
  rating?: number | null;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="poster-tile"
      style={{
        display: "block",
        width: "min(104px, 25vw)",
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
          paddingBottom: "150%",
          background: "#0f0f0f",
          border: "1px solid rgba(255,255,255,0.06)",
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
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#181818,#0c0c0c)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "rgba(255,255,255,0.08)", fontSize: 20, fontWeight: 700, fontFamily: SANS }}>{title[0]}</span>
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.85) 100%)" }} />
        {typeof rating === "number" && (
          <div style={{
            position: "absolute", top: 5, right: 5,
            background: "rgba(0,0,0,0.78)", backdropFilter: "blur(8px)",
            borderRadius: 4, padding: "2px 5px",
            color: "#f0c060", fontSize: 9, fontWeight: 700, fontFamily: SANS,
          }}>
            {rating.toFixed(1)}
          </div>
        )}
        {badge && typeof rating !== "number" && (
          <div style={{
            position: "absolute", top: 5, left: 5,
            background: "rgba(0,0,0,0.78)", backdropFilter: "blur(8px)",
            borderRadius: 4, padding: "2px 5px",
            color: "rgba(255,255,255,0.58)", fontSize: 8, fontFamily: SANS,
          }}>
            {badge}
          </div>
        )}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "5px 6px" }}>
          <p style={{ margin: 0, fontSize: 7, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: SANS }}>
            {mediaLabel(mediaType)}
          </p>
          <h3 style={{ margin: "1px 0 0", fontSize: 9.5, fontWeight: 600, lineHeight: 1.2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {title}
          </h3>
        </div>
      </div>
    </Link>
  );
}

// ─── Friend activity card — wide, Letterboxd-energy ───────────────────────────


function FriendActivityCard({
  entry,
  userId,
}: {
  entry: FriendsActivityEntry;
  userId: string | null;
}) {
  const ownerLabel = entry.displayName || (entry.username ? `@${entry.username}` : "Friend");
  const recency = formatRecency(entry.savedAt);
  const watchedOn = entry.watchedDate
    ? new Date(entry.watchedDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;
  const scopeBadge = getSeriesScopeBadge(entry);
  const verb = activityVerb(entry);

  const { commentCount } = useReviewComments({
    targetType: "diary_entry",
    targetId: entry.entryId ?? "",
  });
  const [commentOpen, setCommentOpen] = useState(false);

  return (
    <article
      className="friend-card"
      style={{
        position: "relative",
        width: "min(210px, 52vw)",
        flexShrink: 0,
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.07)",
        background: "#0b0b0b",
        boxShadow: "0 4px 20px rgba(0,0,0,0.44)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Avatar + username header */}
      <div style={{ padding: "8px 10px 0", display: "flex", alignItems: "center", gap: 7 }}>
        <Link
          href={entry.username ? `/u/${entry.username}` : "#"}
          aria-label={ownerLabel}
          style={{ flexShrink: 0, textDecoration: "none", borderRadius: 999 }}
        >
          <div style={{
            width: 24, height: 24, borderRadius: 999, overflow: "hidden",
            border: "1.5px solid rgba(255,255,255,0.22)", background: "#1e1e1e",
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
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: SANS }}>
            {entry.displayName || (entry.username ? `@${entry.username}` : "Friend")}
          </p>
          <p style={{ margin: 0, fontSize: 8.5, color: "#424242", fontFamily: SANS }}>
            {verb} · {recency}
          </p>
        </div>
        {typeof entry.rating === "number" && (
          <div style={{
            flexShrink: 0,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
            borderRadius: 5, padding: "2px 6px",
            color: "#f0c060", fontSize: 11, fontWeight: 700, fontFamily: SANS,
          }}>
            {entry.rating.toFixed(1)}
          </div>
        )}
      </div>

      {/* Poster */}
      <Link href={entry.href} style={{ display: "block", position: "relative", paddingBottom: "136%", textDecoration: "none", color: "inherit", marginTop: 8 }}>
        {entry.poster ? (
          <img src={entry.poster} alt={entry.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#1a1a1a,#0d0d0d)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "rgba(255,255,255,0.08)", fontSize: 32, fontWeight: 700, fontFamily: SANS }}>R</span>
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0) 42%, rgba(0,0,0,0.88) 100%)" }} />
        {scopeBadge && (
          <div style={{ position: "absolute", bottom: 30, right: 7 }}>
            <span style={{ background: "rgba(45,212,191,0.12)", backdropFilter: "blur(6px)", border: "1px solid rgba(45,212,191,0.16)", borderRadius: 4, padding: "1px 5px", fontSize: 7, letterSpacing: "0.04em", textTransform: "uppercase", color: "rgba(45,212,191,0.78)", fontFamily: SANS }}>
              {scopeBadge}
            </span>
          </div>
        )}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "6px 8px" }}>
          <p style={{ margin: 0, fontSize: 7, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: SANS }}>
            {mediaLabel(entry.mediaType)}{watchedOn ? ` · ${watchedOn}` : ""}
          </p>
          <h3 style={{ margin: "2px 0 0", fontSize: 12, fontWeight: 600, lineHeight: 1.2, color: "white", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {entry.title}
          </h3>
        </div>

      </Link>

      {/* Review snippet */}
      {entry.review.trim() && (
        <Link href={entry.href} style={{ display: "block", padding: "7px 10px 8px", borderTop: "1px solid rgba(255,255,255,0.05)", textDecoration: "none", color: "inherit", flex: 1 }}>
          <p style={{
            margin: 0, fontSize: 10, color: "rgba(255,255,255,0.46)", lineHeight: 1.55,
            display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
            fontStyle: "italic", fontFamily: SERIF,
          }}>
            &ldquo;{entry.review}&rdquo;
          </p>
        </Link>
      )}

      {/* ── Reaction tray ── */}
      {entry.entryId && (
        <ReactionTray
          targetType="diary_entry"
          targetId={entry.entryId}
          compact
          isOwn={userId === entry.profileId}
          commentCount={commentCount}
          onCommentClick={() => setCommentOpen(true)}
        />
      )}

      {/* ── Comment drawer ── */}
      {entry.entryId && (
        <CommentDrawer
          isOpen={commentOpen}
          onClose={() => setCommentOpen(false)}
          targetType="diary_entry"
          targetId={entry.entryId}
          reviewAuthorId={entry.profileId}
        />
      )}
    </article>
  );
}

// ─── Skeleton tile ─────────────────────────────────────────────────────────────

function SkeletonTile() {
  return (
    <div
      style={{
        width: "min(104px, 25vw)",
        flexShrink: 0,
        aspectRatio: "2/3",
        borderRadius: 8,
        background: "linear-gradient(90deg,#111 25%,#1a1a1a 50%,#111 75%)",
        backgroundSize: "200% 100%",
        animation: "skeleton-shimmer 1.6s ease infinite",
      }}
    />
  );
}

// ─── Section header ────────────────────────────────────────────────────────────

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
    <section style={{ marginBottom: "clamp(18px, 3.5vw, 26px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: "clamp(8px, 1.8vw, 12px)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          {eyebrow && (
            <span style={{ color: "#3e3e3e", fontSize: 9, letterSpacing: "0.09em", textTransform: "uppercase", fontFamily: SANS }}>
              {eyebrow}
            </span>
          )}
          <h2 style={{
            margin: 0,
            fontSize: serif ? "clamp(17px, 3vw, 22px)" : "clamp(14px, 2.5vw, 17px)",
            lineHeight: 1.1,
            letterSpacing: serif ? "-0.4px" : "-0.25px",
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

// ─── Compact inline empty state ────────────────────────────────────────────────

function EmptyRail({ message, href, cta }: { message: string; href: string; cta: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
      <p style={{ margin: 0, color: "#3c3c3c", fontSize: 12, fontFamily: SANS }}>{message}</p>
      <Link href={href} style={{
        flexShrink: 0, color: "rgba(255,255,255,0.38)", textDecoration: "none", fontSize: 11,
        fontFamily: SANS, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 999, padding: "3px 10px",
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
  recentLists = [],
  staffPicks = [],
  hiddenGems = [],
  bookOfMonth = null,
  luckyPools = null,
}: {
  trendingMovies: DashboardItem[];
  trendingSeries: DashboardItem[];
  trendingBooks: DashboardItem[];
  recentLists?: DiscoveryList[];
  staffPicks?: DashboardItem[];
  hiddenGems?: DashboardItem[];
  bookOfMonth?: BookOfMonthItem | null;
  luckyPools?: LuckyPool | null;
}) {
  const { user, displayName, loading } = useAuth();
  const router = useRouter();
  const [diaryEntries, setDiaryEntries] = useState<DiaryMovie[]>([]);
  const [isDiaryLoaded, setIsDiaryLoaded] = useState(false);
  const [listCount, setListCount] = useState(0);
  const [friendsActivity, setFriendsActivity] = useState<FriendsActivityEntry[]>([]);
  const [friendsHasFollows, setFriendsHasFollows] = useState<boolean | null>(null);

  // SavedItem[] fed directly to PickCard — dual-source: localStorage + Supabase
  const [tonightPickItems, setTonightPickItems] = useState<SavedItem[]>([]);


  // Seed from localStorage immediately; re-sync on local add/remove
  useEffect(() => {
    setDiaryEntries(getDiaryMovies());
    setIsDiaryLoaded(true);

    function mapLocal(): SavedItem[] {
      return getWatchlist().map((e) => ({
        id: e.id,
        title: e.title,
        media_type: (e.mediaType ?? "movie") as "movie" | "tv" | "book",
        year: Number(e.year) || 0,
        poster: e.poster ?? null,
        creator: e.director ?? null,
        media_id: e.id,
        added_at: e.addedAt,
      }));
    }

    const local = mapLocal();
    if (local.length > 0) setTonightPickItems(local);

    const unsubDiary = subscribeToDiary(() => setDiaryEntries(getDiaryMovies()));
    const unsubWatchlist = subscribeToWatchlist(() => {
      const updated = mapLocal();
      if (updated.length > 0) setTonightPickItems(updated);
    });
    return () => { unsubDiary(); unsubWatchlist(); };
  }, []);

  // Authoritative watchlist fetch from Supabase — runs only after AuthProvider
  // has fully settled (loading=false), so the session cookie is valid for RLS.
  useEffect(() => {
    if (loading || !user?.id) return;
    let mounted = true;

    void (async () => {
      const client = createSupabaseBrowserClient();
      if (!client) return;

      const { data } = await client
        .from("saved_items")
        .select("media_id,media_type,title,poster,year,creator,added_at")
        .eq("user_id", user.id)
        .eq("list_type", "watchlist")
        .order("added_at", { ascending: false });

      if (!mounted || !data || data.length === 0) return;

      const items: SavedItem[] = data.map((row) => ({
        id: row.media_id as string,
        title: row.title as string,
        media_type: row.media_type as "movie" | "tv" | "book",
        year: Number(row.year) || 0,
        poster: (row.poster as string | null) ?? null,
        creator: (row.creator as string | null) ?? null,
        media_id: row.media_id as string,
        added_at: row.added_at as string,
      }));

      if (mounted) setTonightPickItems(items);
    })();

    return () => { mounted = false; };
  }, [loading, user]);

  // List count for hero stat
  useEffect(() => {
    if (loading || !user?.id) return;
    let mounted = true;
    void (async () => {
      const client = createSupabaseBrowserClient();
      if (!client) return;
      const { count } = await client
        .from("user_lists")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (mounted && count != null) setListCount(count);
    })();
    return () => { mounted = false; };
  }, [loading, user]);

  // Friends activity
  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user?.id) return;
      const result = await getFriendsActivity(user.id);
      if (mounted) {
        setFriendsActivity(result.entries);
        setFriendsHasFollows(result.hasFollows);
      }
    }
    if (user) {
      void load();
      const unsub = subscribeToFollows(() => void load());
      return () => { mounted = false; unsub(); };
    } else {
      setFriendsActivity([]);
      setFriendsHasFollows(null);
    }
    return () => { mounted = false; };
  }, [user]);

  // ── Derived ──────────────────────────────────────────────────────────────────

  const recentlyLogged = useMemo(() => diaryEntries.slice(0, 16), [diaryEntries]);

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

  // trendingAmongFriends is now handled inside CircleDiscovery (System 3)

  const continueWatching = useMemo(() => {
    if (!user) return [];
    const tvEntries = diaryEntries.filter((e) => e.mediaType === "tv");
    const completedShowIds = new Set(
      tvEntries
        .filter((e) => !e.reviewScope || e.reviewScope === "show" || e.reviewScope === "title")
        .map((e) => e.showId ?? e.id)
    );
    const seen = new Set<string>();
    return tvEntries
      .filter((e) => {
        const scope = e.reviewScope;
        if (scope !== "season" && scope !== "episode") return false;
        const showKey = e.showId ?? e.id;
        if (completedShowIds.has(showKey)) return false;
        if (seen.has(showKey)) return false;
        seen.add(showKey);
        return true;
      })
      .slice(0, 10);
  }, [diaryEntries, user]);

  const handleLucky = useCallback(
    (type: "movie" | "tv" | "book") => {
      if (!luckyPools) return;
      const pool = luckyPools[type];
      if (!pool.length) return;
      const item = pool[Math.floor(Math.random() * pool.length)];
      router.push(item.href);
    },
    [luckyPools, router]
  );

  const timeOfDay = getTimeOfDay();
  const watchlistCount = tonightPickItems.filter(i => i.media_type === "movie" || i.media_type === "tv").length;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <main style={{ padding: "0 0 80px" }}>
      <style>{`
        @keyframes skeleton-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        /* Scroll rails — System 8: mandatory snap, touch-friendly, no clipping */
        .home-row {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scroll-snap-type: x mandatory;
          scroll-behavior: smooth;
          overscroll-behavior-x: contain;
          scrollbar-width: none;
          padding-bottom: 2px;
          padding-inline: 2px;
          cursor: grab;
        }
        .home-row::-webkit-scrollbar { display: none; }
        .home-row > * { scroll-snap-align: start; min-height: 44px; }
        .home-row:active { cursor: grabbing; }

        /* Poster hover lift */
        .poster-tile { transition: transform 0.18s ease; }
        .poster-tile:hover { transform: translateY(-3px) scale(1.02); }

        /* Friend card hover */
        .friend-card { transition: border-color 0.18s ease, box-shadow 0.18s ease; }
        .friend-card:hover { border-color: rgba(255,255,255,0.13); box-shadow: 0 8px 32px rgba(0,0,0,0.56); }

        /* ── Reaction tray ── */
        .rc-tray {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          display: flex;
          gap: 3px;
          padding: 8px 8px 6px;
          background: linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0) 100%);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.16s ease;
          z-index: 4;
          justify-content: center;
        }
        /* Desktop: reveal on card hover */
        .friend-card:hover .rc-tray { opacity: 1; pointer-events: auto; }
        /* State-driven open (mobile button tap) */
        .rc-tray--open { opacity: 1 !important; pointer-events: auto !important; }

        .rc-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px; height: 32px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(0,0,0,0.62);
          backdrop-filter: blur(6px);
          font-size: 14px;
          cursor: pointer;
          transition: transform 0.12s ease, background 0.12s ease, border-color 0.12s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .rc-btn:hover { transform: scale(1.18); background: rgba(255,255,255,0.14); border-color: rgba(255,255,255,0.28); }
        .rc-btn:active { transform: scale(0.92); }
        .rc-btn--active { background: rgba(255,255,255,0.18) !important; border-color: rgba(255,255,255,0.35) !important; }
        .rc-btn:disabled { opacity: 0.55; cursor: default; }

        /* Mobile trigger — shown only on touch-primary devices */
        .rc-trigger {
          display: none;
          position: absolute;
          top: 6px; right: 6px;
          width: 26px; height: 26px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(0,0,0,0.58);
          backdrop-filter: blur(6px);
          color: rgba(255,255,255,0.8);
          font-size: 12px;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          z-index: 5;
          -webkit-tap-highlight-color: transparent;
        }
        /* On touch-primary (no hover capability), show trigger and disable CSS hover tray */
        @media (hover: none) {
          .rc-trigger { display: flex; }
          .friend-card:hover .rc-tray { opacity: 0; pointer-events: none; }
        }

        /* Tonight's picks */
        .picks-wrap {
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.08);
          background: linear-gradient(160deg, rgba(14,14,14,0.96) 0%, rgba(8,8,8,0.98) 100%);
          padding: clamp(14px, 2.5vw, 20px);
          margin-bottom: clamp(20px, 3.5vw, 30px);
          position: relative;
          overflow: hidden;
        }
        .picks-wrap::before {
          content: "";
          position: absolute;
          top: -60px; right: -60px;
          width: 240px; height: 200px;
          background: radial-gradient(ellipse at center, rgba(99,102,241,0.07) 0%, transparent 68%);
          pointer-events: none;
        }

        /* Hero */
        .home-hero {
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.06);
          background: linear-gradient(135deg, rgba(12,12,14,0.97) 0%, rgba(8,8,10,0.98) 100%);
          padding: clamp(14px, 2.5vw, 20px) clamp(14px, 2.5vw, 22px);
          margin-bottom: clamp(16px, 3vw, 22px);
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .home-hero::after {
          content: "";
          position: absolute;
          bottom: -40px; left: -30px;
          width: 200px; height: 150px;
          background: radial-gradient(ellipse at center, rgba(45,212,191,0.05) 0%, transparent 70%);
          pointer-events: none;
        }

        /* Mobile search */
        .home-mobile-search { display: none; margin-bottom: 10px; }

        @media (max-width: 700px) {
          .home-mobile-search { display: flex; }
        }
        @media (max-width: 640px) {
          .home-row { gap: 6px; }
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

      {/* ── 1. HERO ──────────────────────────────────────────────────────────────── */}
      <div className="home-hero">
        {/* Left: greeting + stats */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1 style={{
            margin: 0,
            fontSize: "clamp(17px, 3.2vw, 23px)",
            fontWeight: 600,
            letterSpacing: "-0.5px",
            lineHeight: 1.1,
          }}>
            {displayName ? `Good ${timeOfDay}, ${displayName}` : `Good ${timeOfDay}`}
          </h1>
          {/* Inline stats */}
          <div style={{ display: "flex", gap: 20, marginTop: 10, flexWrap: "wrap" }}>
            {[
              { label: "Diary", value: diaryEntries.length, href: "/diary" },
              { label: "Watchlist", value: watchlistCount, href: "/watchlist" },
              ...(user ? [{ label: "Lists", value: listCount, href: "/lists" }] : []),
            ].map((stat) => (
              <Link
                key={stat.label}
                href={stat.href}
                style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "baseline", gap: 5 }}
              >
                <span style={{ fontSize: "clamp(18px, 3vw, 22px)", fontWeight: 700, letterSpacing: "-0.8px", lineHeight: 1 }}>
                  {stat.value}
                </span>
                <span style={{ fontSize: 10, color: "#484848", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: SANS }}>
                  {stat.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Right: quick actions */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", gap: 7, flexWrap: "wrap" }}>
          <Link
            href="/diary/log"
            style={{
              display: "inline-flex", alignItems: "center", height: 34, padding: "0 14px",
              borderRadius: 999, background: "white", color: "black",
              textDecoration: "none", fontSize: 12, fontWeight: 600, fontFamily: SANS,
              letterSpacing: "0.01em", whiteSpace: "nowrap",
            }}
          >
            + Log
          </Link>
          <Link
            href="/movies"
            style={{
              display: "inline-flex", alignItems: "center", height: 34, padding: "0 14px",
              borderRadius: 999, border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)",
              textDecoration: "none", fontSize: 12, fontFamily: SANS, whiteSpace: "nowrap",
            }}
          >
            Discover
          </Link>
          <Link
            href="/lists/create"
            style={{
              display: "inline-flex", alignItems: "center", height: 34, padding: "0 14px",
              borderRadius: 999, border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)",
              textDecoration: "none", fontSize: 12, fontFamily: SANS, whiteSpace: "nowrap",
            }}
          >
            + List
          </Link>
        </div>
      </div>

      {/* ── 2. CONTINUE WATCHING ─────────────────────────────────────────────────── */}
      {user && (isDiaryLoaded ? continueWatching.length > 0 : true) && (
        <Section
          eyebrow="In Progress"
          title="Continue watching"
          serif
          action={
            <Link href="/diary" style={{ color: "#3e3e3e", textDecoration: "none", fontSize: 10, fontFamily: SANS }}>
              All diary
            </Link>
          }
        >
          {!isDiaryLoaded ? (
            <div className="home-row">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <SkeletonTile key={i} />
              ))}
            </div>
          ) : (
            <div className="home-row">
              {continueWatching.map((entry) => (
                <PosterTile
                  key={`tv-${entry.showId ?? entry.id}`}
                  title={entry.title}
                  mediaType={entry.mediaType}
                  poster={entry.poster}
                  href={getMediaHref({ id: entry.id, mediaType: entry.mediaType })}
                  badge={entry.seasonNumber ? `S${entry.seasonNumber}` : undefined}
                />
              ))}
            </div>
          )}
        </Section>
      )}

      {/* ── 3. RECENT LISTS ──────────────────────────────────────────────────────── */}
      {recentLists.length > 0 && (
        <Section
          eyebrow="Community"
          title="Recent lists"
          action={
            <Link href="/lists" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none", fontSize: 10, fontFamily: SANS, border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 999, padding: "3px 10px" }}>
              Browse all
            </Link>
          }
        >
          <div className="home-row" style={{ gap: 10 }}>
            {recentLists.map((list) => (
              <div key={list.id} style={{ minWidth: 230, maxWidth: 260, flexShrink: 0 }}>
                <DiscoveryListCard
                  list={list}
                  currentUserId={user?.id ?? null}
                  isLiked={false}
                  isSaved={false}
                />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── 4. FRIENDS ACTIVITY ──────────────────────────────────────────────────── */}
      {user && friendsHasFollows !== null && (
        <Section
          eyebrow="Social"
          title="Friends activity"
          serif
          action={
            <Link href="/discover" style={{ color: "#3e3e3e", textDecoration: "none", fontSize: 10, fontFamily: SANS }}>
              Find people
            </Link>
          }
        >
          {friendsActivity.length > 0 ? (
            <div className="home-row">
              {friendsActivity.filter((entry) => entry.title?.trim()).map((entry) => (
                <FriendActivityCard
                  key={`${entry.profileId}-${entry.mediaType}-${entry.id}-${entry.savedAt}`}
                  entry={entry}
                  userId={user?.id ?? null}
                />
              ))}
            </div>
          ) : friendsHasFollows ? (
            <EmptyRail message="No activity from your circle in the last 7 days." href="/discover" cta="Explore" />
          ) : (
            <EmptyRail message="Follow people to see their activity here." href="/discover" cta="Discover people" />
          )}
        </Section>
      )}

      {/* ── 5–7. TRENDING ────────────────────────────────────────────────────────── */}
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

      {/* ── 8. FEELING LUCKY ─────────────────────────────────────────────────────── */}
      {luckyPools && (
        <Section eyebrow="Discover" title="Feeling lucky?">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(
              [
                { type: "movie", label: "Random Film", emoji: "🎬" },
                { type: "tv", label: "Random Series", emoji: "📺" },
                { type: "book", label: "Random Book", emoji: "📚" },
              ] as const
            ).map(({ type, label, emoji }) => (
              <button
                key={type}
                type="button"
                onClick={() => handleLucky(type)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  height: 38,
                  padding: "0 16px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(255,255,255,0.62)",
                  fontSize: 12,
                  fontFamily: SANS,
                  cursor: "pointer",
                  transition: "background 0.16s ease, border-color 0.16s ease, color 0.16s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.background = "rgba(255,255,255,0.08)";
                  el.style.borderColor = "rgba(255,255,255,0.2)";
                  el.style.color = "rgba(255,255,255,0.88)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.background = "rgba(255,255,255,0.04)";
                  el.style.borderColor = "rgba(255,255,255,0.1)";
                  el.style.color = "rgba(255,255,255,0.62)";
                }}
              >
                <span style={{ fontSize: 14 }}>{emoji}</span>
                {label}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* ── 9. HIDDEN GEMS ───────────────────────────────────────────────────────── */}
      {hiddenGems.length > 0 && (
        <Section eyebrow="Discover" title="Hidden gems" serif>
          <div className="home-row">
            {hiddenGems.map((item) => (
              <PosterTile
                key={`gem-${item.mediaType}-${item.id}`}
                title={item.title}
                mediaType={item.mediaType}
                poster={item.poster}
                href={item.href}
                badge="Hidden Gem"
              />
            ))}
          </div>
        </Section>
      )}

      {/* ── 10. BOOK OF THE MONTH ────────────────────────────────────────────────── */}
      {bookOfMonth && (
        <Section eyebrow="Editorial" title="Book of the month" serif>
          <Link
            href={bookOfMonth.href}
            style={{ display: "block", textDecoration: "none", color: "inherit" }}
          >
            <div
              style={{
                display: "flex",
                gap: "clamp(14px, 3vw, 22px)",
                alignItems: "flex-start",
                background: "linear-gradient(135deg, rgba(14,14,14,0.96) 0%, rgba(9,9,9,0.98) 100%)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 14,
                padding: "clamp(14px, 2.5vw, 20px)",
                transition: "border-color 0.18s ease",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.14)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)")}
            >
              {/* Cover */}
              <div
                style={{
                  flexShrink: 0,
                  width: "clamp(72px, 14vw, 100px)",
                  aspectRatio: "2/3",
                  borderRadius: 8,
                  overflow: "hidden",
                  background: "#141414",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {bookOfMonth.coverUrl ? (
                  <img
                    src={bookOfMonth.coverUrl}
                    alt={bookOfMonth.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      background: "linear-gradient(135deg,#181818,#0c0c0c)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ color: "rgba(255,255,255,0.08)", fontSize: 28, fontWeight: 700, fontFamily: SANS }}>
                      {bookOfMonth.title[0]}
                    </span>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "rgba(251,191,36,0.1)",
                      border: "0.5px solid rgba(251,191,36,0.22)",
                      color: "#fbbf24",
                      fontSize: 9,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      fontFamily: SANS,
                      fontWeight: 600,
                    }}
                  >
                    Book of the Month
                  </span>
                  <span style={{ color: "#3a3a3a", fontSize: 10, fontFamily: SANS }}>{bookOfMonth.genre}</span>
                </div>
                <h3
                  style={{
                    margin: "0 0 4px",
                    fontSize: "clamp(15px, 2.8vw, 20px)",
                    fontWeight: 400,
                    letterSpacing: "-0.3px",
                    lineHeight: 1.15,
                    fontFamily: SERIF,
                    color: "rgba(255,255,255,0.9)",
                  }}
                >
                  {bookOfMonth.title}
                </h3>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "#4a4a4a", fontFamily: SANS }}>
                  {bookOfMonth.author} · {bookOfMonth.year}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "clamp(12px, 1.8vw, 13px)",
                    color: "rgba(255,255,255,0.44)",
                    lineHeight: 1.6,
                    fontFamily: SERIF,
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {bookOfMonth.overview}
                </p>
                <div
                  style={{
                    marginTop: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    color: "rgba(255,255,255,0.32)",
                    fontFamily: SANS,
                  }}
                >
                  View book
                  <span style={{ fontSize: 10 }}>→</span>
                </div>
              </div>
            </div>
          </Link>
        </Section>
      )}

      {/* ── SECONDARY SECTIONS ───────────────────────────────────────────────────── */}

      {/* ── TONIGHT'S PICKS ────────────────────────────────────────────────────── */}
      <div className="picks-wrap">
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "clamp(10px, 2vw, 14px)" }}>
            <div>
              <p style={{ margin: "0 0 2px", color: "#3a3a3a", fontSize: 8.5, letterSpacing: "0.09em", textTransform: "uppercase", fontFamily: SANS }}>Tonight</p>
              <h2 style={{ margin: 0, fontSize: "clamp(17px, 3vw, 22px)", fontWeight: 400, letterSpacing: "-0.4px", lineHeight: 1, fontFamily: SERIF }}>
                Pick something for me
              </h2>
            </div>
            <Link href="/watchlist" style={{ color: "#424242", textDecoration: "none", fontSize: 11, fontFamily: SANS, whiteSpace: "nowrap" }}>
              Open watchlist
            </Link>
          </div>
          <TonightsPick watchlistItems={tonightPickItems} />
        </div>
      </div>

      {/* ── RECENTLY LOGGED ────────────────────────────────────────────────────── */}
      {user && (
        <Section
          eyebrow="Diary"
          title="Recently logged"
          serif
          action={
            <Link href="/diary" style={{ color: "#3e3e3e", textDecoration: "none", fontSize: 10, fontFamily: SANS }}>
              Open diary
            </Link>
          }
        >
          {!isDiaryLoaded ? (
            <div className="home-row">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <SkeletonTile key={i} />
              ))}
            </div>
          ) : recentlyLogged.length > 0 ? (
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
      )}

      {/* ── MOOD RECOMMENDATIONS ───────────────────────────────────────────────── */}
      <MoodRecommendations />

      {/* ── CIRCLE DISCOVERY — Systems 3 + 4 + 7 ─────────────────────────────── */}
      {friendsHasFollows !== null && (
        <CircleDiscovery
          friendsActivity={friendsActivity}
          friendsHasFollows={friendsHasFollows}
        />
      )}

      {/* ── DAILY REEL ─────────────────────────────────────────────────────────── */}
      <DailyReelCard />

      {/* ── BECAUSE YOU LIKED (TMDB) ───────────────────────────────────────────── */}
      <BecauseYouLiked
        diaryEntries={diaryEntries.map((e) => ({
          media_id: e.id, title: e.title, rating: e.rating, watched_date: e.watchedDate,
        }))}
      />

      {/* ── BECAUSE YOU LIKED (social collaborative) — System 2 ─────────────── */}
      <SocialRecommendations diaryEntries={diaryEntries} />

      {/* ── PEOPLE TO FOLLOW ───────────────────────────────────────────────────── */}
      <PeopleToFollowSection variant="home" />

      {/* ── TOP RATED ──────────────────────────────────────────────────────────── */}
      {topRated.length > 0 && (
        <Section
          eyebrow="Your Taste"
          title="Top rated by you"
          action={
            <Link href="/diary" style={{ color: "#3e3e3e", textDecoration: "none", fontSize: 10, fontFamily: SANS }}>
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

      {/* ── RECOMMENDATION ROWS ────────────────────────────────────────────────── */}
      <BecauseYouLikedRow mediaType="movie" title="More films you'll love" />
      <BecauseYouLikedRow mediaType="tv" title="Series matched to your taste" />
      <BecauseYouLikedRow mediaType="book" title="Books picked for you" />

      {/* ── GAMIFICATION (lower priority) ──────────────────────────────────────── */}
      <GamificationWidgets variant="home" />
      <WeeklyChallengesSection />

      {/* ── TRENDING THIS WEEK ─────────────────────────────────────────────────── */}
      <TrendingThisWeek />

      {/* ── STAFF PICKS ────────────────────────────────────────────────────────── */}
      {staffPicks.length > 0 && (
        <Section
          eyebrow="Editorial"
          title="Staff picks"
          serif
          action={
            <span style={{ color: "#3a3a3a", fontSize: 9, letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: SANS }}>
              Curated for you
            </span>
          }
        >
          <div className="home-row">
            {staffPicks.map((item) => (
              <PosterTile
                key={`staffpick-${item.mediaType}-${item.id}`}
                title={item.title}
                mediaType={item.mediaType}
                poster={item.poster}
                href={item.href}
                badge="Staff Pick"
              />
            ))}
          </div>
        </Section>
      )}
    </main>
  );
}
