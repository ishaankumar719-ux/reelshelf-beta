"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import { followProfile, getPeopleToFollow, subscribeToFollows, unfollowProfile, type SuggestedProfile } from "../lib/supabase/social";
import { getProfileHandle, getProfileInitials } from "../lib/profile";

// ─── Poster slot ─────────────────────────────────────────────────────────────

function PosterSlot({
  poster,
  title,
  href,
}: {
  poster: string | null;
  title: string;
  href?: string;
}) {
  const [errored, setErrored] = useState(false);
  const hasPoster = poster && !errored;

  const inner = (
    <div
      style={{
        position: "relative",
        aspectRatio: "2 / 3",
        borderRadius: 12,
        overflow: "hidden",
        background:
          "radial-gradient(circle at top, rgba(255,255,255,0.07), transparent 55%), linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {hasPoster ? (
        <img
          src={poster}
          alt={title}
          onError={() => setErrored(true)}
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
        // Clean empty slot — no broken icon, no text
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "flex-end",
            padding: "0 0 8px 8px",
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "inline-block",
            }}
          />
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} style={{ display: "block", textDecoration: "none" }}>
        {inner}
      </Link>
    );
  }

  return inner;
}

// ─── Follow button ────────────────────────────────────────────────────────────

function SuggestionFollowButton({
  profileId,
  initialFollowers,
}: {
  profileId: string;
  initialFollowers: number;
}) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followers, setFollowers] = useState(initialFollowers);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!user || loading) return;
    setLoading(true);
    const result = isFollowing
      ? await unfollowProfile(profileId)
      : await followProfile(profileId);
    setLoading(false);
    if (result.error) return;
    setIsFollowing((c) => !c);
    setFollowers((c) => c + (isFollowing ? -1 : 1));
  }

  if (!user) {
    return (
      <Link
        href="/auth"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 100,
          height: 36,
          padding: "0 14px",
          borderRadius: 999,
          background: "white",
          color: "black",
          textDecoration: "none",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
        }}
      >
        Sign in
      </Link>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        style={{
          height: 36,
          padding: "0 14px",
          borderRadius: 999,
          border: isFollowing ? "1px solid rgba(255,255,255,0.12)" : "none",
          background: isFollowing ? "rgba(255,255,255,0.05)" : "white",
          color: isFollowing ? "white" : "black",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Saving…" : isFollowing ? "Following" : "Follow"}
      </button>

      <span
        style={{
          color: "#9ca3af",
          fontSize: 12,
          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
        }}
      >
        {followers} follower{followers === 1 ? "" : "s"}
      </span>
    </div>
  );
}

// ─── Suggestion card ──────────────────────────────────────────────────────────

function SuggestionCard({
  suggestion,
  compact,
}: {
  suggestion: SuggestedProfile;
  compact?: boolean;
}) {
  const handle = getProfileHandle({
    id: suggestion.profileId,
    email: null,
    username: suggestion.username,
    displayName: suggestion.displayName,
    avatarUrl: suggestion.avatarUrl,
    bio: suggestion.bio,
    favouriteFilm: suggestion.featuredFilm,
    favouriteSeries: null,
    favouriteBook: null,
    movieMountRushmore: [],
  });
  const label = suggestion.displayName || handle || "ReelShelf profile";
  const initials = getProfileInitials({
    displayName: suggestion.displayName,
    username: suggestion.username,
  });

  const hasMountRushmore = suggestion.mountRushmore.some((f) => f.poster);

  return (
    <article
      style={{
        width: compact ? 300 : "100%",
        flexShrink: 0,
        borderRadius: 24,
        border: "1px solid rgba(255,255,255,0.08)",
        background:
          "radial-gradient(circle at top right, rgba(255,255,255,0.05), transparent 28%), linear-gradient(180deg, rgba(18,18,18,0.97) 0%, rgba(9,9,9,0.98) 100%)",
        boxShadow: "0 16px 48px rgba(0,0,0,0.28)",
        overflow: "hidden",
      }}
    >
      <Link
        href={suggestion.href}
        style={{ display: "block", padding: 18, textDecoration: "none", color: "inherit" }}
      >
        {/* Header row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <span
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              color: "#d1d5db",
              fontSize: 10,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            Suggested
          </span>
          <span
            style={{
              color: "#6b7280",
              fontSize: 11,
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            {suggestion.followers} follower{suggestion.followers === 1 ? "" : "s"}
          </span>
        </div>

        {/* Avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              overflow: "hidden",
              flexShrink: 0,
              background:
                "radial-gradient(circle at top, rgba(255,255,255,0.09), transparent 60%), linear-gradient(180deg, #161616 0%, #090909 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "grid",
              placeItems: "center",
            }}
          >
            {suggestion.avatarUrl ? (
              <img
                src={suggestion.avatarUrl}
                alt={label}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              <span
                style={{
                  color: "rgba(255,255,255,0.72)",
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                }}
              >
                {initials}
              </span>
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            {handle ? (
              <p
                style={{
                  margin: "0 0 4px",
                  color: "#6b7280",
                  fontSize: 11,
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {handle}
              </p>
            ) : null}
            <h3
              style={{
                margin: 0,
                fontSize: compact ? 22 : 26,
                lineHeight: 1.04,
                letterSpacing: "-0.6px",
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </h3>
          </div>
        </div>

        {/* Reason / bio */}
        <p
          style={{
            margin: "0 0 16px",
            color: "#c7c7c7",
            fontSize: 13,
            lineHeight: 1.65,
            minHeight: 40,
            fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
          }}
        >
          {suggestion.reason}
        </p>

        {/* Film Mount Rushmore */}
        <div>
          <p
            style={{
              margin: "0 0 10px",
              color: "#5a5a5a",
              fontSize: 10,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            {hasMountRushmore ? "Film Mount Rushmore" : "No Mount Rushmore yet"}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 7,
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => {
              const film = suggestion.mountRushmore[i];
              return (
                <PosterSlot
                  key={`${suggestion.profileId}-mr-${i}`}
                  poster={film?.poster ?? null}
                  title={film?.title ?? ""}
                />
              );
            })}
          </div>
        </div>
      </Link>

      <div style={{ padding: "0 18px 18px" }}>
        <SuggestionFollowButton
          profileId={suggestion.profileId}
          initialFollowers={suggestion.followers}
        />
      </div>
    </article>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

const LOAD_TIMEOUT_MS = 8_000;

export default function PeopleToFollowSection({
  variant = "home",
}: {
  variant?: "home" | "discover";
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedProfile[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) {
      setSuggestions([]);
      setLoading(false);
      setTimedOut(false);
      return;
    }

    let cancelled = false;

    async function loadSuggestions() {
      setLoading(true);
      setTimedOut(false);

      // Hard timeout — never hang on "Loading suggestions…"
      timeoutRef.current = setTimeout(() => {
        if (!cancelled) setTimedOut(true);
      }, LOAD_TIMEOUT_MS);

      try {
        const next = await getPeopleToFollow(variant === "home" ? 6 : 8);
        if (!cancelled) setSuggestions(next);
      } catch {
        // silently fail — section disappears rather than staying in loading state
      } finally {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (!cancelled) setLoading(false);
      }
    }

    void loadSuggestions();

    const unsubscribe = subscribeToFollows(() => void loadSuggestions());

    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      unsubscribe();
    };
  }, [user, variant]);

  // Hide section if no user, no suggestions, and not in an active load
  if (!user || ((!loading || timedOut) && suggestions.length === 0)) {
    return null;
  }

  return (
    <section style={{ marginBottom: variant === "home" ? 34 : 28 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 18,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <div>
          <p
            style={{
              margin: "0 0 8px",
              color: "#7f7f7f",
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            Social discovery
          </p>
          <h2
            style={{
              margin: 0,
              fontSize: variant === "home" ? 30 : 34,
              lineHeight: 1.02,
              letterSpacing: "-1px",
              fontWeight: 500,
            }}
          >
            People to follow
          </h2>
          <p
            style={{
              margin: "8px 0 0",
              color: "#a8a8a8",
              fontSize: 14,
              lineHeight: 1.65,
              maxWidth: 680,
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            Public shelves selected for overlap in taste, defining films, and recent activity.
          </p>
        </div>

        {variant === "home" ? (
          <Link
            href="/discover"
            style={{
              color: "#d1d5db",
              textDecoration: "none",
              fontSize: 14,
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            Open discover
          </Link>
        ) : null}
      </div>

      {loading && suggestions.length === 0 ? (
        // Skeleton — 3 placeholder cards
        <div style={{ display: "flex", gap: 14, overflow: "hidden" }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 300,
                flexShrink: 0,
                height: 280,
                borderRadius: 24,
                border: "1px solid rgba(255,255,255,0.06)",
                background: "linear-gradient(180deg, rgba(18,18,18,0.9) 0%, rgba(10,10,10,0.92) 100%)",
                animation: "pulse 1.8s ease-in-out infinite",
              }}
            />
          ))}
          <style>{`@keyframes pulse{0%,100%{opacity:.5}50%{opacity:.85}}`}</style>
        </div>
      ) : variant === "home" ? (
        <div
          style={{
            display: "flex",
            gap: 14,
            overflowX: "auto",
            paddingBottom: 6,
            scrollbarWidth: "none",
          }}
        >
          <style>{`.people-row::-webkit-scrollbar{display:none}`}</style>
          {suggestions.map((s) => (
            <SuggestionCard key={s.profileId} suggestion={s} compact />
          ))}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 18,
          }}
        >
          {suggestions.map((s) => (
            <SuggestionCard key={s.profileId} suggestion={s} />
          ))}
        </div>
      )}
    </section>
  );
}
