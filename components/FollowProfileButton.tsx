"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { followProfile, unfollowProfile } from "../lib/supabase/social";

export default function FollowProfileButton({
  targetUserId,
  initialIsFollowing,
  initialFollowerCount,
  initialFollowingCount,
  isOwnProfile,
  compact = false,
}: {
  targetUserId: string;
  initialIsFollowing: boolean;
  initialFollowerCount: number;
  initialFollowingCount: number;
  isOwnProfile: boolean;
  compact?: boolean;
}) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [followingCount] = useState(initialFollowingCount);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleToggleFollow() {
    if (!user) {
      return;
    }

    setLoading(true);
    setMessage(null);

    const result = isFollowing
      ? await unfollowProfile(targetUserId)
      : await followProfile(targetUserId);

    setLoading(false);

    if (result.error) {
      setMessage(result.error);
      return;
    }

    setIsFollowing((current) => !current);
    setFollowerCount((current) => current + (isFollowing ? -1 : 1));
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
      }}
    >
      {!compact ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <div
            style={{
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              padding: "14px 16px",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#7f7f7f",
                fontSize: 10,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              }}
            >
              Followers
            </p>
            <p
              style={{
                margin: "8px 0 0",
                color: "white",
                fontSize: 20,
                lineHeight: 1.2,
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              }}
            >
              {followerCount}
            </p>
          </div>

          <div
            style={{
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              padding: "14px 16px",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#7f7f7f",
                fontSize: 10,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              }}
            >
              Following
            </p>
            <p
              style={{
                margin: "8px 0 0",
                color: "white",
                fontSize: 20,
                lineHeight: 1.2,
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              }}
            >
              {followingCount}
            </p>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 32,
              padding: "7px 12px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              color: "white",
              fontSize: 12,
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            {followerCount} followers
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 32,
              padding: "7px 12px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              color: "white",
              fontSize: 12,
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            {followingCount} following
          </span>
        </div>
      )}

      {isOwnProfile ? (
        <div
          style={{
            height: 46,
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
            color: "#e5e7eb",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
          }}
        >
          This is your public profile
        </div>
      ) : user ? (
        <button
          type="button"
          onClick={handleToggleFollow}
          disabled={loading}
          style={{
            height: 46,
            borderRadius: 999,
            border: isFollowing
              ? "1px solid rgba(255,255,255,0.12)"
              : "none",
            background: isFollowing ? "rgba(255,255,255,0.04)" : "white",
            color: isFollowing ? "white" : "black",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Saving..." : isFollowing ? "Following" : "Follow"}
        </button>
      ) : (
        <Link
          href="/auth"
          style={{
            height: 46,
            borderRadius: 999,
            background: "white",
            color: "black",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
          }}
        >
          Sign in to follow
        </Link>
      )}

      {message ? (
        <p
          style={{
            margin: 0,
            color: "#fca5a5",
            fontSize: 13,
            lineHeight: 1.6,
            fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
          }}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
