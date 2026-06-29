"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import DailyPickCard from "./DailyPickCard";
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

export type RecommendedItem = {
  id: string;
  mediaType: "movie" | "tv" | "book";
  title: string;
  year: number;
  poster: string | null;
  href: string;
  reasons: string[];
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
  size = "medium",
}: {
  title: string;
  mediaType: MediaType;
  poster?: string | null;
  href: string;
  rating?: number | null;
  badge?: string;
  size?: "large" | "medium" | "compact";
}) {
  const cardWidth =
    size === "large" ? "min(156px, 38vw)" : size === "compact" ? "min(104px, 24vw)" : "min(124px, 27vw)";
  return (
    <Link
      href={href}
      className="poster-tile"
      style={{
        display: "block",
        width: cardWidth,
        flexShrink: 0,
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div
        style={{
          position: "relative",
          borderRadius: "var(--rs-radius-card)",
          overflow: "hidden",
          paddingBottom: "150%",
          background: "#0f0f0f",
          border: "1px solid var(--rs-border-subtle)",
        }}
      >
        {poster ? (
          <img
            src={poster}
            alt={title}
            loading="lazy"
            ref={(el) => { if (el?.complete) el.style.opacity = "1" }}
            onLoad={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "1" }}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 0, transition: "opacity 0.3s ease" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#181818,#0c0c0c)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "rgba(255,255,255,0.08)", fontSize: 22, fontWeight: 700, fontFamily: SANS }}>{title[0]}</span>
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 48%, rgba(0,0,0,0.9) 100%)" }} />
        {typeof rating === "number" && (
          <div style={{
            position: "absolute", top: 6, right: 6,
            background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
            borderRadius: 5, padding: "2px 6px",
            color: "#f0c060", fontSize: 9.5, fontWeight: 700, fontFamily: SANS,
          }}>
            {rating.toFixed(1)}
          </div>
        )}
        {badge && typeof rating !== "number" && (
          <div style={{
            position: "absolute", top: 6, left: 6,
            background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
            borderRadius: 5, padding: "2px 6px",
            color: "rgba(255,255,255,0.55)", fontSize: 8, fontFamily: SANS,
          }}>
            {badge}
          </div>
        )}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "6px 8px" }}>
          <p style={{ margin: 0, fontSize: 7.5, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: SANS }}>
            {mediaLabel(mediaType)}
          </p>
          <h3 style={{ margin: "2px 0 0", fontSize: 10, fontWeight: 600, lineHeight: 1.25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {title}
          </h3>
        </div>
      </div>
    </Link>
  );
}

// ─── Friend activity card ──────────────────────────────────────────────────────

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
        borderRadius: "var(--rs-radius-card)",
        overflow: "hidden",
        border: "1px solid var(--rs-border-subtle)",
        background: "#0b0b0b",
        boxShadow: "0 4px 20px rgba(0,0,0,0.44)",
        display: "flex",
        flexDirection: "column",
      }}
    >
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
              <img src={entry.avatarUrl} alt={ownerLabel} ref={(el) => { if (el?.complete) el.style.opacity = "1" }} onLoad={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "1" }} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 0, transition: "opacity 0.25s ease" }} />
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

      <Link href={entry.href} style={{ display: "block", position: "relative", paddingBottom: "136%", textDecoration: "none", color: "inherit", marginTop: 8 }}>
        {entry.poster ? (
          <img src={entry.poster} alt={entry.title} ref={(el) => { if (el?.complete) el.style.opacity = "1" }} onLoad={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "1" }} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 0, transition: "opacity 0.3s ease" }} />
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

// ─── Skeleton tiles ────────────────────────────────────────────────────────────

function SkeletonTile({ size = "medium" }: { size?: "large" | "medium" | "compact" }) {
  const cardWidth =
    size === "large" ? "min(156px, 38vw)" : size === "compact" ? "min(104px, 24vw)" : "min(124px, 27vw)";
  return (
    <div
      className="rs-skeleton"
      style={{
        width: cardWidth,
        flexShrink: 0,
        aspectRatio: "2/3",
        border: "1px solid rgba(255,255,255,0.04)",
      }}
    />
  );
}

function SkeletonFriendCard() {
  return (
    <div
      className="rs-skeleton"
      style={{
        width: "min(210px, 52vw)",
        flexShrink: 0,
        aspectRatio: "210/310",
        border: "1px solid rgba(255,255,255,0.04)",
      }}
    />
  );
}

function ScrollRow({ children, gap = 10 }: { children: React.ReactNode; gap?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [showL, setShowL] = useState(false);
  const [showR, setShowR] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setShowL(el.scrollLeft > 8);
      setShowR(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    };
    update();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      ro?.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, []);

  const scroll = (dir: "left" | "right") =>
    ref.current?.scrollBy({ left: dir === "left" ? -380 : 380, behavior: "smooth" });

  return (
    <div className="scroll-row-wrap">
      <button
        type="button"
        className={`scroll-arrow scroll-arrow-l${showL ? " scroll-arrow--vis" : ""}`}
        onClick={() => scroll("left")}
        aria-label="Scroll left"
      >
        ‹
      </button>
      <button
        type="button"
        className={`scroll-arrow scroll-arrow-r${showR ? " scroll-arrow--vis" : ""}`}
        onClick={() => scroll("right")}
        aria-label="Scroll right"
      >
        ›
      </button>
      <div ref={ref} className="home-row" style={{ gap }}>
        {children}
      </div>
    </div>
  );
}

// ─── Section header ────────────────────────────────────────────────────────────

function Section({
  eyebrow,
  title,
  children,
  action,
  serif,
  panel,
  fadeIn,
  variant = "medium",
}: {
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  serif?: boolean;
  panel?: boolean;
  fadeIn?: boolean;
  variant?: "large" | "medium" | "compact";
}) {
  const sectionMb =
    variant === "large"
      ? "clamp(18px, 2.8vw, 26px)"
      : variant === "compact"
      ? "clamp(8px, 1.4vw, 12px)"
      : "clamp(14px, 2.2vw, 18px)";
  const titleSize =
    variant === "large"
      ? serif ? "clamp(19px, 3.2vw, 24px)" : "clamp(17px, 2.8vw, 20px)"
      : variant === "compact"
      ? "clamp(13px, 2.2vw, 15px)"
      : serif ? "var(--rs-text-title)" : "clamp(15px, 2.6vw, 18px)";
  const titleWeight = variant === "large" ? (serif ? 400 : 600) : (serif ? 400 : 500);
  const headerMb = variant === "compact" ? "clamp(6px, 1.2vw, 9px)" : "clamp(8px, 1.6vw, 12px)";

  return (
    <section
      className={panel ? "section-panel" : undefined}
      {...(fadeIn ? { "data-fade-section": "true" } : {})}
      style={{ marginBottom: sectionMb }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 8, marginBottom: headerMb }}>
        <div>
          {eyebrow && (
            <p style={{ margin: "0 0 3px", fontSize: "var(--rs-text-micro)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--rs-text-muted)", fontFamily: SANS, lineHeight: 1 }}>
              {eyebrow}
            </p>
          )}
          <h2 style={{
            margin: 0,
            fontSize: titleSize,
            lineHeight: 1.1,
            letterSpacing: serif ? "-0.4px" : "-0.3px",
            fontWeight: titleWeight,
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

// ─── Empty rail ────────────────────────────────────────────────────────────────

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

// ─── Continue Your Story — single cinematic hero (State 2) ─────────────────────

function CYSSingleHero({ entry }: { entry: DiaryMovie }) {
  const [hovered, setHovered] = useState(false);
  const label = entry.mediaType === "movie" ? "Film" : entry.mediaType === "tv" ? "TV Series" : "Book";
  const actionLabel = entry.mediaType === "book" ? "Resume Reading" : "Resume";
  const progressInfo =
    entry.mediaType === "tv" && entry.seasonNumber
      ? [
          `Season ${entry.seasonNumber}`,
          entry.episodeNumber ? `Episode ${entry.episodeNumber}` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

  return (
    <section style={{ marginBottom: "clamp(18px,3vw,26px)" }}>
      <p style={{
        margin: "0 0 8px",
        fontSize: "var(--rs-text-micro)",
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--rs-text-muted)",
        fontFamily: SANS,
      }}>
        Continue Your Story
      </p>
      <Link
        href={getMediaHref({ id: entry.id, mediaType: entry.mediaType })}
        className="cys-hero"
        style={{
          display: "block",
          textDecoration: "none",
          color: "inherit",
          position: "relative",
          borderRadius: "var(--rs-radius-card)",
          overflow: "hidden",
          height: "clamp(122px, 20vw, 168px)",
          border: `1px solid ${hovered ? "var(--rs-border-strong)" : "var(--rs-border-subtle)"}`,
          boxShadow: hovered ? "0 12px 40px rgba(0,0,0,0.6)" : "0 4px 16px rgba(0,0,0,0.35)",
          transition: "border-color 0.18s ease, box-shadow 0.2s ease",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Blurred bg poster */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: entry.poster
              ? `url(${entry.poster}) center/cover no-repeat`
              : "linear-gradient(135deg,#1a1a2e,#0d0d1a)",
            filter: "blur(3px) brightness(0.3) saturate(1.4)",
            transform: "scale(1.08)",
          }}
        />
        {/* Directional overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to right, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.72) 50%, rgba(0,0,0,0.28) 100%)",
          }}
        />
        {/* Content row */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", height: "100%", alignItems: "stretch" }}>
          {/* Poster thumbnail */}
          {entry.poster && (
            <div style={{ width: "clamp(74px,12vw,96px)", flexShrink: 0, overflow: "hidden" }}>
              <img
                src={entry.poster}
                alt={entry.title}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
          )}
          {/* Text */}
          <div style={{
            flex: 1,
            minWidth: 0,
            padding: "clamp(14px,2.2vw,20px) clamp(14px,2vw,18px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}>
            <div>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "2px 8px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                border: "0.5px solid rgba(255,255,255,0.14)",
                color: "rgba(255,255,255,0.5)",
                fontSize: 8,
                fontFamily: SANS,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}>
                {label}
              </span>
              <h2 style={{
                margin: "0 0 4px",
                fontSize: "clamp(15px,2.8vw,21px)",
                fontWeight: 700,
                letterSpacing: "-0.4px",
                lineHeight: 1.15,
                color: "rgba(255,255,255,0.96)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {entry.title}
              </h2>
              {progressInfo && (
                <p style={{ margin: "0 0 8px", fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: SANS }}>
                  {progressInfo}
                </p>
              )}
              {/* Thin progress bar */}
              <div style={{ height: 2, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden", maxWidth: 180 }}>
                <div style={{ height: "100%", width: "35%", background: "var(--rs-accent-primary)", borderRadius: 999 }} />
              </div>
            </div>
            {/* Action */}
            <span className="cys-resume" style={{
              alignSelf: "flex-end",
              display: "inline-flex",
              alignItems: "center",
              height: 28,
              padding: "0 13px",
              borderRadius: 999,
              background: "white",
              color: "black",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: SANS,
              whiteSpace: "nowrap",
              marginTop: 8,
            }}>
              {actionLabel} →
            </span>
          </div>
        </div>
      </Link>
    </section>
  );
}

// ─── Continue Your Story — compact carousel card (State 3) ─────────────────────

function CYSCompactCard({ entry }: { entry: DiaryMovie }) {
  const [hovered, setHovered] = useState(false);
  const label = entry.mediaType === "movie" ? "Film" : entry.mediaType === "tv" ? "TV Series" : "Book";
  const actionLabel = entry.mediaType === "book" ? "Resume Reading" : "Resume";
  const progressInfo =
    entry.mediaType === "tv" && entry.seasonNumber
      ? [
          `Season ${entry.seasonNumber}`,
          entry.episodeNumber ? `Ep ${entry.episodeNumber}` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

  return (
    <Link
      href={getMediaHref({ id: entry.id, mediaType: entry.mediaType })}
      className="cys-card"
      style={{
        display: "flex",
        width: "min(240px, 58vw)",
        flexShrink: 0,
        textDecoration: "none",
        color: "inherit",
        background: "var(--rs-surface-card)",
        border: `1px solid ${hovered ? "var(--rs-border-strong)" : "var(--rs-border-subtle)"}`,
        borderRadius: "var(--rs-radius-card)",
        overflow: "hidden",
        transform: hovered ? "translateY(-2px)" : "none",
        boxShadow: hovered ? "0 8px 24px rgba(0,0,0,0.45)" : "none",
        transition: "border-color 0.18s ease, transform 0.2s ease, box-shadow 0.2s ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ width: 64, height: 96, flexShrink: 0, position: "relative", background: "#0f0f0f" }}>
        {entry.poster ? (
          <img
            src={entry.poster}
            alt={entry.title}
            ref={(el) => { if (el?.complete) el.style.opacity = "1" }}
            onLoad={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "1" }}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 0, transition: "opacity 0.3s ease" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "rgba(255,255,255,0.08)", fontSize: 16, fontWeight: 700, fontFamily: SANS }}>{entry.title[0]}</span>
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0, padding: "10px 12px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: progressInfo ? 4 : 0 }}>
            <h3 style={{
              margin: 0,
              fontSize: "var(--rs-text-heading)",
              fontWeight: 600,
              lineHeight: 1.2,
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: "var(--rs-text-primary)",
            }}>
              {entry.title}
            </h3>
            <span style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              fontSize: 8,
              color: "var(--rs-text-muted)",
              background: "rgba(255,255,255,0.05)",
              border: "0.5px solid rgba(255,255,255,0.1)",
              borderRadius: 4,
              padding: "2px 5px",
              fontFamily: SANS,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}>
              {label}
            </span>
          </div>
          {progressInfo && (
            <p style={{ margin: "0 0 6px", fontSize: "var(--rs-text-caption)", color: "var(--rs-text-muted)", fontFamily: SANS, lineHeight: 1.3 }}>
              {progressInfo}
            </p>
          )}
          {/* Thin progress bar */}
          <div style={{ height: 2, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginTop: progressInfo ? 0 : 6 }}>
            <div style={{ height: "100%", width: "35%", background: "var(--rs-accent-primary)", borderRadius: 999 }} />
          </div>
        </div>
        <span className="cys-resume" style={{
          alignSelf: "flex-end",
          display: "inline-flex",
          alignItems: "center",
          height: 26,
          padding: "0 12px",
          borderRadius: 999,
          background: "white",
          color: "black",
          fontSize: 10,
          fontWeight: 600,
          fontFamily: SANS,
          whiteSpace: "nowrap",
          marginTop: 8,
        }}>
          {actionLabel} →
        </span>
      </div>
    </Link>
  );
}

// ─── Continue Your Story hero — all 4 states ──────────────────────────────────

function ContinueYourStoryHero({
  entries,
  displayName,
  timeOfDay,
  isLoading,
}: {
  entries: DiaryMovie[];
  displayName: string | null;
  timeOfDay: string;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <section data-fade-section="true" style={{ marginBottom: "clamp(18px,3vw,26px)" }}>
        <div
          className="rs-skeleton"
          style={{ height: "clamp(110px,18vw,150px)", borderRadius: "var(--rs-radius-card)" }}
        />
      </section>
    );
  }

  // State 1: logged in, nothing in progress — welcome hero
  if (entries.length === 0) {
    return (
      <section style={{ marginBottom: "clamp(18px,3vw,26px)" }}>
        <div style={{
          padding: "clamp(20px,3.5vw,30px) clamp(18px,3vw,24px)",
          background: "linear-gradient(135deg, rgba(16,16,24,0.98) 0%, rgba(9,9,13,1) 100%)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "var(--rs-radius-card)",
        }}>
          <h1 style={{
            margin: "0 0 5px",
            fontSize: "clamp(18px,3.2vw,24px)",
            fontWeight: 600,
            letterSpacing: "-0.5px",
            lineHeight: 1.1,
            color: "rgba(255,255,255,0.92)",
          }}>
            Good {timeOfDay}{displayName ? `, ${displayName}` : ""}.
          </h1>
          <p style={{
            margin: "0 0 18px",
            fontSize: 13,
            color: "rgba(255,255,255,0.38)",
            fontFamily: SANS,
            lineHeight: 1.4,
          }}>
            Ready to start something new?
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link
              href="/movies"
              style={{
                display: "inline-flex", alignItems: "center", height: 32, padding: "0 14px",
                borderRadius: 999, background: "white", color: "black",
                textDecoration: "none", fontSize: 12, fontWeight: 600, fontFamily: SANS,
                letterSpacing: "0.01em", whiteSpace: "nowrap",
              }}
            >
              Browse Films
            </Link>
            <Link
              href="/daily-reel"
              style={{
                display: "inline-flex", alignItems: "center", height: 32, padding: "0 14px",
                borderRadius: 999, border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.72)",
                textDecoration: "none", fontSize: 12, fontFamily: SANS, whiteSpace: "nowrap",
              }}
            >
              Pick Something For Me
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // State 2: one item in progress — full-width cinematic hero
  if (entries.length === 1) {
    return <CYSSingleHero entry={entries[0]} />;
  }

  // State 3: multiple items — carousel
  return (
    <section style={{ marginBottom: "clamp(18px,3vw,26px)" }}>
      <p style={{
        margin: "0 0 8px",
        fontSize: "var(--rs-text-micro)",
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--rs-text-muted)",
        fontFamily: SANS,
      }}>
        Continue Your Story
      </p>
      <ScrollRow gap={10}>
        {entries.map((entry) => (
          <CYSCompactCard
            key={`tv-${entry.showId ?? entry.id}`}
            entry={entry}
          />
        ))}
      </ScrollRow>
    </section>
  );
}

// ─── Recommendation card ───────────────────────────────────────────────────────

function RecommendationCard({ item }: { item: RecommendedItem }) {
  const reason = item.reasons[0] ?? null;
  const cardWidth = "min(124px, 27vw)";
  return (
    <Link
      href={item.href}
      className="poster-tile"
      style={{ display: "block", width: cardWidth, flexShrink: 0, textDecoration: "none", color: "inherit" }}
    >
      <div
        style={{
          position: "relative",
          borderRadius: "var(--rs-radius-card)",
          overflow: "hidden",
          paddingBottom: "150%",
          background: "#0f0f0f",
          border: "1px solid var(--rs-border-subtle)",
          marginBottom: 7,
        }}
      >
        {item.poster ? (
          <img
            src={item.poster}
            alt={item.title}
            loading="lazy"
            ref={(el) => { if (el?.complete) el.style.opacity = "1" }}
            onLoad={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "1" }}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 0, transition: "opacity 0.3s ease" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#181818,#0c0c0c)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "rgba(255,255,255,0.08)", fontSize: 22, fontWeight: 700, fontFamily: SANS }}>{item.title[0]}</span>
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 48%, rgba(0,0,0,0.9) 100%)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "6px 8px" }}>
          <p style={{ margin: 0, fontSize: 7.5, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: SANS }}>
            {item.mediaType === "movie" ? "Film" : item.mediaType === "tv" ? "Series" : "Book"}
          </p>
          <h3 style={{ margin: "2px 0 0", fontSize: 10, fontWeight: 600, lineHeight: 1.25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {item.title}
          </h3>
        </div>
      </div>
      {reason && (
        <p style={{
          margin: 0,
          fontSize: 10,
          color: "rgba(255,255,255,0.38)",
          fontFamily: SERIF,
          fontStyle: "italic",
          lineHeight: 1.35,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
          {reason}
        </p>
      )}
    </Link>
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
  recommendations = [],
}: {
  trendingMovies: DashboardItem[];
  trendingSeries: DashboardItem[];
  trendingBooks: DashboardItem[];
  recentLists?: DiscoveryList[];
  staffPicks?: DashboardItem[];
  hiddenGems?: DashboardItem[];
  bookOfMonth?: BookOfMonthItem | null;
  luckyPools?: LuckyPool | null;
  recommendations?: RecommendedItem[];
}) {
  const { user, displayName, loading } = useAuth();
  const router = useRouter();
  const [diaryEntries, setDiaryEntries] = useState<DiaryMovie[]>([]);
  const [isDiaryLoaded, setIsDiaryLoaded] = useState(false);
  const [friendsActivity, setFriendsActivity] = useState<FriendsActivityEntry[]>([]);
  const [friendsHasFollows, setFriendsHasFollows] = useState<boolean | null>(null);

  const [tonightPickItems, setTonightPickItems] = useState<SavedItem[]>([]);

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

  // Authoritative watchlist fetch from Supabase
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

  // Fade-in sections on scroll
  useEffect(() => {
    const els = document.querySelectorAll('[data-fade-section]:not(.section-visible)')
    if (!els.length) return
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('section-visible')
          observer.unobserve(entry.target)
        }
      }
    }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' })
    els.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [user?.id, isDiaryLoaded, friendsHasFollows])

  // ── Derived ───────────────────────────────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <main style={{ padding: "0 0 80px" }}>
      <style>{`
        @keyframes skeleton-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* ── Scroll rails ── */
        .home-row {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scroll-snap-type: x mandatory;
          scroll-behavior: smooth;
          overscroll-behavior-x: contain;
          scrollbar-width: none;
          padding-bottom: 6px;
          padding-inline: 2px 24px;
          scroll-padding-inline-start: 2px;
          cursor: grab;
        }
        .home-row::-webkit-scrollbar { display: none; }
        .home-row > * { scroll-snap-align: start; min-height: 44px; }
        .home-row:active { cursor: grabbing; }

        /* ── Desktop scroll arrow navigation ── */
        .scroll-row-wrap { position: relative; }
        .scroll-row-wrap::after {
          content: "";
          position: absolute;
          top: 0; right: 0; bottom: 6px;
          width: 52px;
          background: linear-gradient(to left, rgba(5,5,5,0.72) 0%, transparent 100%);
          pointer-events: none;
          z-index: 2;
        }
        .scroll-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 10;
          width: 32px; height: 32px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.13);
          background: rgba(8,8,10,0.9);
          backdrop-filter: blur(12px);
          color: rgba(255,255,255,0.62);
          font-size: 20px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 0 1px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.18s ease, background 0.14s ease, color 0.14s ease;
        }
        .scroll-arrow-l { left: -14px; }
        .scroll-arrow-r { right: -14px; }
        .scroll-row-wrap:hover .scroll-arrow.scroll-arrow--vis {
          opacity: 1;
          pointer-events: auto;
        }
        .scroll-arrow:hover {
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.9);
        }
        @media (hover: none) {
          .scroll-arrow { display: none !important; }
          .scroll-row-wrap::after { display: none; }
        }

        /* ── Mobile: full-bleed carousels ── */
        @media (max-width: 760px) {
          .scroll-row-wrap { margin-inline: -14px; }
          .home-row { padding-inline: 14px 32px; gap: 9px; }
          .section-panel .scroll-row-wrap { margin-inline: 0; }
          .section-panel .home-row { padding-inline: 2px 24px; }
        }
        @media (max-width: 390px) {
          .scroll-row-wrap { margin-inline: -12px; }
          .home-row { padding-inline: 12px 28px; }
          .section-panel .scroll-row-wrap { margin-inline: 0; }
          .section-panel .home-row { padding-inline: 2px 20px; }
        }

        /* ── Poster tile hover ── */
        .poster-tile { transition: transform 0.2s ease; }
        .poster-tile:hover { transform: translateY(-4px) scale(1.03); }
        .poster-tile:hover > div { border-color: var(--rs-border-strong); box-shadow: 0 12px 36px rgba(0,0,0,0.55); }

        /* ── Friend card hover ── */
        .friend-card {
          transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.2s ease;
        }
        .friend-card:hover {
          border-color: var(--rs-border-strong);
          box-shadow: 0 10px 36px rgba(0,0,0,0.6);
          transform: translateY(-2px);
        }

        /* ── Active / press ── */
        @media (prefers-reduced-motion: no-preference) {
          .poster-tile:active { transform: translateY(-1px) scale(0.98); transition-duration: 0.05s; }
          .friend-card:active { transform: scale(0.99); transition-duration: 0.05s; }
        }

        /* ── Section viewport fade-in ── */
        [data-fade-section] {
          opacity: 0;
          transition: opacity 0.4s ease;
        }
        [data-fade-section].section-visible {
          opacity: 1;
        }
        @media (prefers-reduced-motion: reduce) {
          [data-fade-section] { opacity: 1; transition: none; }
        }

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
        .friend-card:hover .rc-tray { opacity: 1; pointer-events: auto; }
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
        @media (hover: none) {
          .rc-trigger { display: flex; }
          .friend-card:hover .rc-tray { opacity: 0; pointer-events: none; }
        }

        /* ── Mobile search ── */
        .home-mobile-search { display: none; margin-bottom: 12px; }
        @media (max-width: 700px) {
          .home-mobile-search { display: flex; }
        }

        /* ── Section panel ── */
        .section-panel {
          background: rgba(255,255,255,0.025);
          border-radius: 14px;
          padding: clamp(14px, 2.4vw, 20px);
          border: 1px solid rgba(255,255,255,0.05);
        }
        .section-panel .scroll-row-wrap::after {
          background: linear-gradient(to left, rgba(14,14,14,0.9) 0%, transparent 100%);
        }

        /* ── Continue Your Story ── */
        @media (prefers-reduced-motion: no-preference) {
          .cys-card:active { transform: scale(0.99) !important; transition-duration: 0.05s !important; }
          .cys-hero:active { opacity: 0.92; transition-duration: 0.05s !important; }
        }
        @media (max-width: 700px) {
          .cys-resume { align-self: stretch !important; justify-content: center; display: flex !important; }
        }

        /* ── Book of Month — mobile ── */
        @media (max-width: 440px) {
          .botm-card { flex-direction: column !important; }
          .botm-cover { width: 88px !important; }
        }

        /* ── Daily Pick — full-bleed on mobile ── */
        .home-full-bleed { }
        @media (max-width: 760px) {
          .home-full-bleed {
            margin-inline: -14px;
            margin-bottom: clamp(14px, 2.4vw, 20px);
          }
          .home-full-bleed .dp-card {
            border-radius: 0 !important;
            border-left: none !important;
            border-right: none !important;
            margin-bottom: 0 !important;
          }
          .home-full-bleed > div:not(.dp-card) {
            border-radius: 0 !important;
            border-left: none !important;
            border-right: none !important;
            margin-bottom: 0 !important;
          }
        }
        @media (max-width: 390px) {
          .home-full-bleed { margin-inline: -12px; }
        }
      `}</style>

      {/* ── 0. DAILY PICK — full-bleed on mobile ─────────────────────────────────── */}
      <div className="home-full-bleed">
        <DailyPickCard />
      </div>

      {/* ── 1. CONTINUE YOUR STORY — homepage hero ───────────────────────────────── */}
      {user && (
        <ContinueYourStoryHero
          entries={continueWatching}
          displayName={displayName ?? null}
          timeOfDay={timeOfDay}
          isLoading={!isDiaryLoaded}
        />
      )}

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

      {/* ── 2. PICK SOMETHING FOR ME ──────────────────────────────────────────────── */}
      <Section
        eyebrow="Tonight"
        title="Pick something for me"
        serif
        variant="compact"
        action={
          <Link href="/watchlist" style={{ color: "#424242", textDecoration: "none", fontSize: 10, fontFamily: SANS, whiteSpace: "nowrap" }}>
            Open watchlist
          </Link>
        }
      >
        <TonightsPick watchlistItems={tonightPickItems} />
      </Section>

      {/* ── 3. FRIENDS ACTIVITY ──────────────────────────────────────────────────── */}
      {user && friendsHasFollows === null && (
        <Section eyebrow="Social" title="Friends activity" serif fadeIn variant="medium">
          <div className="home-row">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonFriendCard key={i} />
            ))}
          </div>
        </Section>
      )}
      {user && friendsHasFollows !== null && (
        <Section
          eyebrow="Social"
          title="Friends activity"
          serif
          fadeIn
          variant="medium"
          action={
            <Link href="/discover" style={{ color: "#3e3e3e", textDecoration: "none", fontSize: 10, fontFamily: SANS }}>
              Find people
            </Link>
          }
        >
          {friendsActivity.filter((entry) => entry.title?.trim()).length > 0 ? (
            <ScrollRow gap={10}>
              {friendsActivity.filter((entry) => entry.title?.trim()).slice(0, 8).map((entry) => (
                <FriendActivityCard
                  key={`${entry.profileId}-${entry.mediaType}-${entry.id}-${entry.savedAt}`}
                  entry={entry}
                  userId={user?.id ?? null}
                />
              ))}
            </ScrollRow>
          ) : friendsHasFollows ? (
            <EmptyRail message="No activity from your circle in the last 7 days." href="/discover" cta="Explore" />
          ) : (
            <EmptyRail message="Follow people to see their activity here." href="/discover" cta="Discover people" />
          )}
        </Section>
      )}

      {/* ── 4. RECENT LISTS ──────────────────────────────────────────────────────── */}
      {recentLists.length > 0 && (
        <Section
          eyebrow="Community"
          title="Recent lists"
          fadeIn
          action={
            <Link href="/lists" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none", fontSize: 10, fontFamily: SANS, border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 999, padding: "3px 10px" }}>
              Browse all
            </Link>
          }
        >
          <ScrollRow gap={12}>
            {recentLists.slice(0, 8).map((list) => (
              <div key={list.id} style={{ minWidth: 230, maxWidth: 260, flexShrink: 0 }}>
                <DiscoveryListCard
                  list={list}
                  currentUserId={user?.id ?? null}
                  isLiked={false}
                  isSaved={false}
                />
              </div>
            ))}
          </ScrollRow>
        </Section>
      )}

      {/* ── 5. RECENTLY LOGGED ───────────────────────────────────────────────────── */}
      {user && (!isDiaryLoaded || recentlyLogged.length > 0) && (
        <Section
          eyebrow="Diary"
          title="Recently logged"
          serif
          fadeIn
          variant="large"
          action={
            <Link href="/diary" style={{ color: "#3e3e3e", textDecoration: "none", fontSize: 10, fontFamily: SANS }}>
              Open diary
            </Link>
          }
        >
          {!isDiaryLoaded ? (
            <div className="home-row">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <SkeletonTile key={i} size="large" />
              ))}
            </div>
          ) : (
            <ScrollRow>
              {recentlyLogged.map((entry) => (
                <PosterTile
                  key={`${entry.mediaType}-${entry.id}`}
                  title={entry.title}
                  mediaType={entry.mediaType}
                  poster={entry.poster}
                  href={getMediaHref({ id: entry.id, mediaType: entry.mediaType })}
                  rating={entry.rating}
                  size="large"
                />
              ))}
            </ScrollRow>
          )}
        </Section>
      )}

      {/* ── 6. RECOMMENDED FOR YOU ───────────────────────────────────────────────── */}
      {recommendations.length >= 3 && (
        <Section
          eyebrow="For You"
          title="Recommended for you"
          serif
          fadeIn
          variant="medium"
        >
          <ScrollRow>
            {recommendations.map((item) => (
              <RecommendationCard key={`rec-${item.mediaType}-${item.id}`} item={item} />
            ))}
          </ScrollRow>
        </Section>
      )}

      {/* ── 7. FEELING LUCKY ─────────────────────────────────────────────────────── */}
      {luckyPools && (
        <Section eyebrow="Discover" title="Feeling lucky?" fadeIn variant="compact">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(
              [
                { type: "movie", label: "Random Film" },
                { type: "tv", label: "Random Series" },
                { type: "book", label: "Random Book" },
              ] as const
            ).map(({ type, label }) => (
              <button
                key={type}
                type="button"
                onClick={() => handleLucky(type)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 16px",
                  borderRadius: 999, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
                  color: "rgba(255,255,255,0.62)", fontSize: 12, fontFamily: SANS, cursor: "pointer",
                  transition: "background 0.16s ease, border-color 0.16s ease, color 0.16s ease", whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => { const el = e.currentTarget; el.style.background = "rgba(255,255,255,0.08)"; el.style.borderColor = "rgba(255,255,255,0.2)"; el.style.color = "rgba(255,255,255,0.88)"; }}
                onMouseLeave={(e) => { const el = e.currentTarget; el.style.background = "rgba(255,255,255,0.04)"; el.style.borderColor = "rgba(255,255,255,0.1)"; el.style.color = "rgba(255,255,255,0.62)"; }}
              >
                {label}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* ── TRENDING FILMS ───────────────────────────────────────────────────────── */}
      {trendingMovies.length > 0 && (
        <Section eyebrow="Discover" title="Trending films" fadeIn variant="large">
          <ScrollRow>
            {trendingMovies.map((item) => (
              <PosterTile
                key={`${item.mediaType}-${item.id}`}
                title={item.title}
                mediaType={item.mediaType}
                poster={item.poster}
                href={item.href}
                size="large"
              />
            ))}
          </ScrollRow>
        </Section>
      )}

      {/* ── TRENDING SERIES ──────────────────────────────────────────────────────── */}
      {trendingSeries.length > 0 && (
        <Section eyebrow="Discover" title="Trending series" fadeIn variant="medium">
          <ScrollRow>
            {trendingSeries.map((item) => (
              <PosterTile
                key={`${item.mediaType}-${item.id}`}
                title={item.title}
                mediaType={item.mediaType}
                poster={item.poster}
                href={item.href}
              />
            ))}
          </ScrollRow>
        </Section>
      )}

      {/* ── TRENDING BOOKS ───────────────────────────────────────────────────────── */}
      {trendingBooks.length > 0 && (
        <Section eyebrow="Discover" title="Trending books" fadeIn variant="medium">
          <ScrollRow>
            {trendingBooks.map((item) => (
              <PosterTile
                key={`${item.mediaType}-${item.id}`}
                title={item.title}
                mediaType={item.mediaType}
                poster={item.poster}
                href={item.href}
              />
            ))}
          </ScrollRow>
        </Section>
      )}

      {/* ── HIDDEN GEMS ──────────────────────────────────────────────────────────── */}
      {hiddenGems.length > 0 && (
        <Section eyebrow="Discover" title="Hidden gems" serif fadeIn variant="compact">
          <ScrollRow>
            {hiddenGems.map((item) => (
              <PosterTile
                key={`gem-${item.mediaType}-${item.id}`}
                title={item.title}
                mediaType={item.mediaType}
                poster={item.poster}
                href={item.href}
                badge="Hidden Gem"
                size="compact"
              />
            ))}
          </ScrollRow>
        </Section>
      )}

      {/* ── BOOK OF THE MONTH ────────────────────────────────────────────────────── */}
      {bookOfMonth && (
        <Section eyebrow="Editorial" title="Book of the month" serif fadeIn>
          <Link href={bookOfMonth.href} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            <div
              className="botm-card"
              style={{ display: "flex", gap: "clamp(14px, 3vw, 22px)", alignItems: "flex-start", background: "linear-gradient(135deg, rgba(14,14,14,0.96) 0%, rgba(9,9,9,0.98) 100%)", border: "1px solid var(--rs-border-subtle)", borderRadius: "var(--rs-radius-card)", padding: "clamp(14px, 2.5vw, 20px)", transition: "border-color 0.18s ease" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--rs-border-strong)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--rs-border-subtle)")}
            >
              <div className="botm-cover" style={{ flexShrink: 0, width: "clamp(72px, 14vw, 100px)", aspectRatio: "2/3", borderRadius: "var(--rs-radius-card)", overflow: "hidden", background: "#141414", border: "1px solid var(--rs-border-subtle)" }}>
                {bookOfMonth.coverUrl ? (
                  <img src={bookOfMonth.coverUrl} alt={bookOfMonth.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#181818,#0c0c0c)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "rgba(255,255,255,0.08)", fontSize: 28, fontWeight: 700, fontFamily: SANS }}>{bookOfMonth.title[0]}</span>
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, background: "rgba(251,191,36,0.1)", border: "0.5px solid rgba(251,191,36,0.22)", color: "#fbbf24", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: SANS, fontWeight: 600 }}>
                    Book of the Month
                  </span>
                  <span style={{ color: "#3a3a3a", fontSize: 10, fontFamily: SANS }}>{bookOfMonth.genre}</span>
                </div>
                <h3 style={{ margin: "0 0 4px", fontSize: "clamp(15px, 2.8vw, 20px)", fontWeight: 400, letterSpacing: "-0.3px", lineHeight: 1.15, fontFamily: SERIF, color: "rgba(255,255,255,0.9)" }}>
                  {bookOfMonth.title}
                </h3>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "#4a4a4a", fontFamily: SANS }}>
                  {bookOfMonth.author} · {bookOfMonth.year}
                </p>
                <p style={{ margin: 0, fontSize: "clamp(12px, 1.8vw, 13px)", color: "rgba(255,255,255,0.44)", lineHeight: 1.6, fontFamily: SERIF, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {bookOfMonth.overview}
                </p>
                <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "rgba(255,255,255,0.32)", fontFamily: SANS }}>
                  View book <span style={{ fontSize: 10 }}>→</span>
                </div>
              </div>
            </div>
          </Link>
        </Section>
      )}

      {/* ── MOOD RECOMMENDATIONS ─────────────────────────────────────────────────── */}
      <MoodRecommendations />

      {/* ── BECAUSE YOU LIKED ────────────────────────────────────────────────────── */}
      <BecauseYouLikedRow mediaType="movie" title="More films you'll love" />
      <BecauseYouLikedRow mediaType="tv" title="Series matched to your taste" />
      <BecauseYouLikedRow mediaType="book" title="Books picked for you" />

      {/* Circle Discovery */}
      {friendsHasFollows !== null && (
        <CircleDiscovery
          friendsActivity={friendsActivity}
          friendsHasFollows={friendsHasFollows}
        />
      )}

      {/* Daily Reel */}
      <DailyReelCard />

      {/* Because You Liked (TMDB) */}
      <BecauseYouLiked
        diaryEntries={diaryEntries.map((e) => ({
          media_id: e.id, title: e.title, rating: e.rating, watched_date: e.watchedDate,
        }))}
      />

      {/* Social Recommendations */}
      <SocialRecommendations diaryEntries={diaryEntries} />

      {/* People to Follow */}
      <PeopleToFollowSection variant="home" />

      {/* Top Rated */}
      {topRated.length > 0 && (
        <Section
          eyebrow="Your Taste"
          title="Top rated by you"
          fadeIn
          variant="medium"
          action={
            <Link href="/diary" style={{ color: "#3e3e3e", textDecoration: "none", fontSize: 10, fontFamily: SANS }}>
              Full diary
            </Link>
          }
        >
          <ScrollRow>
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
          </ScrollRow>
        </Section>
      )}

      {/* Gamification */}
      <GamificationWidgets variant="home" />
      <WeeklyChallengesSection />

      {/* Trending This Week */}
      <TrendingThisWeek />

      {/* Staff Picks */}
      {staffPicks.length > 0 && (
        <Section
          eyebrow="Editorial"
          title="Staff picks"
          serif
          fadeIn
          variant="compact"
          action={
            <span style={{ color: "#3a3a3a", fontSize: 9, letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: SANS }}>
              Curated for you
            </span>
          }
        >
          <ScrollRow>
            {staffPicks.map((item) => (
              <PosterTile
                key={`staffpick-${item.mediaType}-${item.id}`}
                title={item.title}
                mediaType={item.mediaType}
                poster={item.poster}
                href={item.href}
                badge="Staff Pick"
                size="compact"
              />
            ))}
          </ScrollRow>
        </Section>
      )}
    </main>
  );
}
