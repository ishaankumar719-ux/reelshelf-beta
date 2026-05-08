"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { followProfile, getPeopleToFollow, subscribeToFollows, unfollowProfile, type SuggestedProfile } from "../lib/supabase/social";
import { getProfileHandle, getProfileInitials } from "../lib/profile";

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
    if (!user || loading) {
      return;
    }

    setLoading(true);

    const result = isFollowing
      ? await unfollowProfile(profileId)
      : await followProfile(profileId);

    setLoading(false);

    if (result.error) {
      return;
    }

    setIsFollowing((current) => !current);
    setFollowers((current) => current + (isFollowing ? -1 : 1));
  }

  if (!user) {
    return (
      <Link
        href="/auth"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 108,
          height: 38,
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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        style={{
          height: 38,
          padding: "0 14px",
          borderRadius: 999,
          border: isFollowing
            ? "1px solid rgba(255,255,255,0.12)"
            : "1px solid rgba(255,255,255,0.08)",
          background: isFollowing ? "rgba(255,255,255,0.04)" : "white",
          color: isFollowing ? "white" : "black",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Saving..." : isFollowing ? "Following" : "Follow"}
      </button>

      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          minHeight: 32,
          padding: "7px 12px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
          color: "#d1d5db",
          fontSize: 12,
          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
        }}
      >
        {followers} follower{followers === 1 ? "" : "s"}
      </span>
    </div>
  );
}

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

  return (
    <article
      style={{
        width: compact ? 320 : "100%",
        flexShrink: 0,
        borderRadius: 24,
        border: "1px solid rgba(255,255,255,0.08)",
        background:
          "radial-gradient(circle at top right, rgba(255,255,255,0.06), transparent 24%), linear-gradient(180deg, rgba(18,18,18,0.96) 0%, rgba(9,9,9,0.97) 100%)",
        boxShadow: "0 20px 52px rgba(0,0,0,0.24)",
        overflow: "hidden",
      }}
    >
      <Link
        href={suggestion.href}
        style={{
          display: "block",
          padding: 18,
          textDecoration: "none",
          color: "inherit",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <span
            style={{
              padding: "7px 10px",
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
              color: "#9ca3af",
              fontSize: 12,
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            {suggestion.followers} follower{suggestion.followers === 1 ? "" : "s"}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 999,
              overflow: "hidden",
              background:
                "radial-gradient(circle at top, rgba(255,255,255,0.09), transparent 60%), linear-gradient(180deg, #161616 0%, #090909 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              flexShrink: 0,
            }}
          >
            {suggestion.avatarUrl ? (
              <img
                src={suggestion.avatarUrl}
                alt={label}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "grid",
                  placeItems: "center",
                  color: "rgba(255,255,255,0.76)",
                  fontSize: 18,
                  fontWeight: 700,
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                }}
              >
                {initials}
              </div>
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                color: "#9ca3af",
                fontSize: 12,
                lineHeight: 1.5,
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              }}
            >
              {handle || "@reelshelf"}
            </p>

            <h3
              style={{
                margin: "6px 0 0",
                fontSize: compact ? 24 : 28,
                lineHeight: 1.02,
                letterSpacing: "-0.8px",
                fontWeight: 600,
              }}
            >
              {label}
            </h3>
          </div>
        </div>

        <p
          style={{
            margin: 0,
            color: "#d1d5db",
            fontSize: 13,
            lineHeight: 1.65,
            minHeight: 44,
            fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
          }}
        >
          {suggestion.reason}
        </p>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gap: 10,
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#7f7f7f",
              fontSize: 10,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            Mount Rushmore preview
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 8,
            }}
          >
            {Array.from({ length: 4 }).map((_, index) => {
              const film = suggestion.mountRushmore[index];

              return (
                <div
                  key={`${suggestion.profileId}-suggested-${index}`}
                  style={{
                    position: "relative",
                    aspectRatio: "2 / 3",
                    borderRadius: 12,
                    overflow: "hidden",
                    background:
                      "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 55%), linear-gradient(180deg, #151515 0%, #0b0b0b 100%)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {film?.poster ? (
                    <img
                      src={film.poster}
                      alt={film.title}
                      style={{
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
                        display: "grid",
                        placeItems: "center",
                        color: "rgba(255,255,255,0.42)",
                        fontSize: 10,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                      }}
                    >
                      Film
                    </div>
                  )}
                </div>
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

export default function PeopleToFollowSection({
  variant = "home",
}: {
  variant?: "home" | "discover";
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedProfile[]>([]);

  useEffect(() => {
    if (!user) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;

    async function loadSuggestions() {
      setLoading(true);
      try {
        const next = await getPeopleToFollow(variant === "home" ? 6 : 8);
        if (!cancelled) {
          setSuggestions(next);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSuggestions();

    const unsubscribe = subscribeToFollows(() => {
      void loadSuggestions();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user, variant]);

  if (!user || (!loading && suggestions.length === 0)) {
    return null;
  }

  return (
    <section style={{ marginBottom: variant === "home" ? 34 : 28 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
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
              fontSize: variant === "home" ? 32 : 36,
              lineHeight: 1.02,
              letterSpacing: "-1px",
              fontWeight: 500,
            }}
          >
            People to follow
          </h2>
          <p
            style={{
              margin: "10px 0 0",
              color: "#a8a8a8",
              fontSize: 15,
              lineHeight: 1.65,
              maxWidth: 760,
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
        <div
          style={{
            borderRadius: 22,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(18,18,18,0.92) 0%, rgba(10,10,10,0.94) 100%)",
            padding: 22,
            color: "#9ca3af",
            fontSize: 14,
            fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
          }}
        >
          Loading suggestions…
        </div>
      ) : variant === "home" ? (
        <div
          style={{
            display: "flex",
            gap: 16,
            overflowX: "auto",
            paddingBottom: 6,
          }}
        >
          {suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.profileId}
              suggestion={suggestion}
              compact
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 18,
          }}
        >
          {suggestions.map((suggestion) => (
            <SuggestionCard key={suggestion.profileId} suggestion={suggestion} />
          ))}
        </div>
      )}
    </section>
  );
}
