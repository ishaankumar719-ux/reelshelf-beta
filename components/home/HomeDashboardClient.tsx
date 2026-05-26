"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BecauseYouLiked from "./BecauseYouLiked";
import BecauseYouLikedRow from "../BecauseYouLikedRow";
import GamificationWidgets from "../GamificationWidgets";
import PeopleToFollowSection from "../PeopleToFollowSection";
import TonightsPick from "./TonightsPick";
import type { SavedItem } from "./PickCard";
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
} from "../../lib/watchlist";
import { createClient as createSupabaseBrowserClient } from "../../lib/supabase/client";
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
  poster?: string | null;
  href: string;
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

// ─── Poster tile ───────────────────────────────────────────────────────────────

function PosterTile({
  title,
  mediaType,
  poster,
  href,
  rating,
  badge,
  width,
}: {
  title: string;
  mediaType: MediaType;
  poster?: string | null;
  href: string;
  rating?: number | null;
  badge?: string;
  width?: string;
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
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#1c1c1c,#0d0d0d)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "rgba(255,255,255,0.09)", fontSize: 18, fontWeight: 700, fontFamily: SANS }}>{title[0]}</span>
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 48%, rgba(0,0,0,0.88) 100%)" }} />
        {typeof rating === "number" && (
          <div style={{
            position: "absolute", top: 5, right: 5,
            background: "rgba(0,0,0,0.76)", backdropFilter: "blur(8px)",
            borderRadius: 4, padding: "2px 5px",
            color: "#f0c060", fontSize: 9, fontWeight: 700, fontFamily: SANS,
          }}>
            {rating.toFixed(1)}
          </div>
        )}
        {badge && typeof rating !== "number" && (
          <div style={{
            position: "absolute", top: 5, left: 5,
            background: "rgba(0,0,0,0.76)", backdropFilter: "blur(8px)",
            borderRadius: 4, padding: "2px 5px",
            color: "rgba(255,255,255,0.6)", fontSize: 8, fontFamily: SANS,
          }}>
            {badge}
          </div>
        )}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "5px 6px" }}>
          <p style={{ margin: 0, fontSize: 7, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: SANS }}>
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

// ─── Friend activity card ──────────────────────────────────────────────────────

function FriendActivityCard({ entry }: { entry: FriendsActivityEntry }) {
  const ownerLabel = entry.displayName || (entry.username ? `@${entry.username}` : "Friend");
  const recency = formatRecency(entry.savedAt);
  const watchedOn = entry.watchedDate
    ? new Date(entry.watchedDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;
  const scopeBadge = getSeriesScopeBadge(entry);

  return (
    <article
      style={{
        position: "relative",
        width: "min(164px, 40vw)",
        flexShrink: 0,
        borderRadius: 11,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.07)",
        background: "#0d0d0d",
        boxShadow: "0 3px 16px rgba(0,0,0,0.4)",
      }}
    >
      {/* Avatar — absolute sibling above poster link */}
      <Link
        href={entry.username ? `/u/${entry.username}` : "#"}
        aria-label={ownerLabel}
        style={{ position: "absolute", top: 7, left: 7, zIndex: 10, display: "block", textDecoration: "none" }}
      >
        <div style={{
          width: 22, height: 22, borderRadius: 999, overflow: "hidden",
          border: "1.5px solid rgba(255,255,255,0.26)", background: "#222",
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

      {typeof entry.rating === "number" && (
        <div style={{
          position: "absolute", top: 7, right: 7, zIndex: 10,
          background: "rgba(0,0,0,0.76)", backdropFilter: "blur(8px)",
          borderRadius: 4, padding: "2px 5px",
          color: "#f0c060", fontSize: 9, fontWeight: 700, fontFamily: SANS,
        }}>
          {entry.rating.toFixed(1)}
        </div>
      )}

      <Link href={entry.href} style={{ display: "block", position: "relative", paddingBottom: "142%", textDecoration: "none", color: "inherit" }}>
        {entry.poster ? (
          <img src={entry.poster} alt={entry.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#1c1c1c,#0e0e0e)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "rgba(255,255,255,0.09)", fontSize: 26, fontWeight: 700, fontFamily: SANS }}>R</span>
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0) 38%, rgba(0,0,0,0.9) 100%)" }} />
        {scopeBadge && (
          <div style={{ position: "absolute", bottom: 36, right: 6, zIndex: 2 }}>
            <span style={{ background: "rgba(45,212,191,0.12)", backdropFilter: "blur(6px)", border: "1px solid rgba(45,212,191,0.18)", borderRadius: 4, padding: "1px 5px", fontSize: 7, letterSpacing: "0.04em", textTransform: "uppercase", color: "rgba(45,212,191,0.8)", fontFamily: SANS }}>
              {scopeBadge}
            </span>
          </div>
        )}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "6px 7px" }}>
          <p style={{ margin: 0, fontSize: 7, color: "rgba(255,255,255,0.34)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: SANS }}>
            {mediaLabel(entry.mediaType)} · {recency}
          </p>
          <h3 style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 600, lineHeight: 1.2, color: "white", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {entry.title}
          </h3>
          {entry.username && (
            <p style={{ margin: "1px 0 0", fontSize: 8, color: "rgba(255,255,255,0.26)", fontFamily: SANS }}>@{entry.username}</p>
          )}
        </div>
      </Link>

      {entry.review.trim() ? (
        <Link href={entry.href} style={{ display: "block", padding: "5px 7px 6px", borderTop: "1px solid rgba(255,255,255,0.05)", textDecoration: "none", color: "inherit" }}>
          <p style={{ margin: 0, fontSize: 9, color: "rgba(255,255,255,0.42)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontStyle: "italic" }}>
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: "clamp(7px, 1.6vw, 11px)" }}>
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

// ─── Inline empty state ────────────────────────────────────────────────────────

function EmptyRail({ message, href, cta }: { message: string; href: string; cta: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
      <p style={{ margin: 0, color: "#424242", fontSize: 12, fontFamily: SANS }}>{message}</p>
      <Link href={href} style={{
        flexShrink: 0, color: "rgba(255,255,255,0.4)", textDecoration: "none", fontSize: 11,
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
  // SavedItem[] fed directly to PickCard — sourced from Supabase with localStorage fallback
  const [tonightPickItems, setTonightPickItems] = useState<SavedItem[]>([]);
  const [friendsActivity, setFriendsActivity] = useState<FriendsActivityEntry[]>([]);
  const [friendsHasFollows, setFriendsHasFollows] = useState<boolean | null>(null);

  // Seed from localStorage immediately, keep in sync with local writes
  useEffect(() => {
    setDiaryEntries(getDiaryMovies());

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

  // Authoritative fetch straight from Supabase — bypasses localStorage sync timing
  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;

    void (async () => {
      const client = createSupabaseBrowserClient();
      if (!client) return;

      const { data, error } = await client
        .from("saved_items")
        .select("media_id,media_type,title,poster,year,creator,added_at")
        .eq("user_id", user.id)
        .order("added_at", { ascending: false });

      console.log("[WATCHLIST] userId:", user.id);
      console.log("[WATCHLIST] Supabase item count:", data?.length ?? 0, error ? `error: ${error.message}` : "");
      if (data?.[0]) console.log("[WATCHLIST] sample item:", data[0]);

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

      console.log("[WATCHLIST] mapped count:", items.length);
      console.log("[WATCHLIST] sample mapped:", items[0]);
      setTonightPickItems(items);
    })();

    return () => { mounted = false; };
  }, [user?.id]);

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

  const timeOfDay = getTimeOfDay();

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <main style={{ padding: "4px 0 80px" }}>
      <style>{`
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

        .home-picks-wrap {
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.07);
          background: linear-gradient(180deg, rgba(11,11,11,0.98) 0%, rgba(6,6,6,0.99) 100%);
          padding: clamp(12px, 2.2vw, 16px);
          margin-bottom: clamp(14px, 3vw, 22px);
        }

        .home-mobile-search { display: none; margin-bottom: 10px; }

        @media (max-width: 640px) {
          .home-row { gap: 6px; }
          .home-mobile-search { display: flex; }
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

      {/* ── WELCOME HEADER ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "clamp(16px, 3vw, 22px)" }}>
        <h1 style={{
          margin: 0,
          fontSize: "clamp(20px, 3.8vw, 28px)",
          fontWeight: 600,
          letterSpacing: "-0.6px",
          lineHeight: 1.1,
        }}>
          {displayName ? `Welcome back, ${displayName}` : "Welcome back"}
        </h1>
        <p style={{ margin: "5px 0 0", color: "#5a5a5a", fontSize: 13, fontFamily: SANS }}>
          Good {timeOfDay}. Here&rsquo;s what&rsquo;s on your shelf.
        </p>
      </div>

      {/* ── TONIGHT'S PICKS ────────────────────────────────────────────────────── */}
      <div className="home-picks-wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "clamp(9px, 1.8vw, 13px)" }}>
          <div>
            <p style={{ margin: "0 0 2px", color: "#3e3e3e", fontSize: 8.5, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: SANS }}>Tonight</p>
            <h2 style={{ margin: 0, fontSize: "clamp(15px, 2.8vw, 19px)", fontWeight: 400, letterSpacing: "-0.3px", lineHeight: 1, fontFamily: SERIF }}>
              Pick something for me
            </h2>
          </div>
          <Link href="/watchlist" style={{ color: "#484848", textDecoration: "none", fontSize: 11, fontFamily: SANS }}>
            Open watchlist
          </Link>
        </div>
        <TonightsPick watchlistItems={tonightPickItems} />
      </div>

      {/* ── FRIENDS ACTIVITY — only rendered once query resolves ───────────────── */}
      {friendsHasFollows !== null && (
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
          {friendsActivity.length > 0 ? (
            <div className="home-row">
              {friendsActivity.map((entry) => (
                <FriendActivityCard
                  key={`${entry.profileId}-${entry.mediaType}-${entry.id}-${entry.savedAt}`}
                  entry={entry}
                />
              ))}
            </div>
          ) : friendsHasFollows ? (
            <EmptyRail
              message="No recent activity from your circle yet."
              href="/discover"
              cta="Explore"
            />
          ) : (
            <EmptyRail
              message="Follow a few shelves to see what your circle is watching."
              href="/discover"
              cta="Discover people"
            />
          )}
        </Section>
      )}

      {/* ── TRENDING AMONG FRIENDS ─────────────────────────────────────────────── */}
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

      {/* ── RECENTLY LOGGED ────────────────────────────────────────────────────── */}
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

      {/* ── DAILY REEL ─────────────────────────────────────────────────────────── */}
      <DailyReelCard />

      {/* ── BECAUSE YOU LIKED ──────────────────────────────────────────────────── */}
      <BecauseYouLiked
        diaryEntries={diaryEntries.map((e) => ({
          media_id: e.id, title: e.title, rating: e.rating, watched_date: e.watchedDate,
        }))}
      />

      {/* ── PEOPLE TO FOLLOW ───────────────────────────────────────────────────── */}
      <PeopleToFollowSection variant="home" />

      {/* ── GAMIFICATION ───────────────────────────────────────────────────────── */}
      <GamificationWidgets variant="home" />
      <WeeklyChallengesSection />

      {/* ── TOP RATED ──────────────────────────────────────────────────────────── */}
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

      {/* ── RECOMMENDATION ROWS ────────────────────────────────────────────────── */}
      <BecauseYouLikedRow mediaType="movie" title="More films you'll love" />
      <BecauseYouLikedRow mediaType="tv" title="Series matched to your taste" />
      <BecauseYouLikedRow mediaType="book" title="Books picked for you" />

      {/* ── DISCOVERY RAILS ────────────────────────────────────────────────────── */}
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
