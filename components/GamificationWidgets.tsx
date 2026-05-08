"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";
import { subscribeToDiary } from "../lib/diary";
import {
  syncAndLoadGamificationStats,
  type ReelShelfBadgeId,
  type ReelShelfGamificationStats,
} from "../lib/supabase/gamification";

const BADGE_META: Record<
  ReelShelfBadgeId,
  { label: string; description: string; counterLabel: string }
> = {
  first_entry: {
    label: "First Log",
    description: "You logged your first diary entry.",
    counterLabel: "Diary started",
  },
  ten_entries: {
    label: "10 Logged",
    description: "Ten entries deep into your ReelShelf timeline.",
    counterLabel: "10-entry milestone",
  },
  fifty_entries: {
    label: "50 Logged",
    description: "A serious shelf with fifty logged entries.",
    counterLabel: "50-entry milestone",
  },
  first_review: {
    label: "First Review",
    description: "Your first written review is on the shelf.",
    counterLabel: "Reviewer unlocked",
  },
  first_like_received: {
    label: "First Like",
    description: "Someone responded to your taste with a like.",
    counterLabel: "Social signal",
  },
  first_comment_received: {
    label: "First Comment",
    description: "Your public diary sparked a conversation.",
    counterLabel: "Conversation started",
  },
};

const EMPTY_STATS: ReelShelfGamificationStats = {
  currentStreak: 0,
  longestStreak: 0,
  totalEntries: 0,
  reviewCount: 0,
  likesReceived: 0,
  commentsReceived: 0,
  badges: [],
  updatedAt: null,
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: 0,
        color: "#7f7f7f",
        fontSize: 11,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
      }}
    >
      {children}
    </p>
  );
}

function StreakCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div
      style={{
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.08)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
        padding: "18px 18px 16px",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#8f8f8f",
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
        }}
      >
        {label}
      </p>
      <h3
        style={{
          margin: "10px 0 0",
          fontSize: 30,
          lineHeight: 1,
          letterSpacing: "-1px",
          fontWeight: 600,
        }}
      >
        {value}
      </h3>
      <p
        style={{
          margin: "8px 0 0",
          color: "#9ca3af",
          fontSize: 13,
          lineHeight: 1.6,
          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
        }}
      >
        {detail}
      </p>
    </div>
  );
}

function BadgeCard({
  badgeId,
  achieved,
}: {
  badgeId: ReelShelfBadgeId;
  achieved: boolean;
}) {
  const meta = BADGE_META[badgeId];

  return (
    <div
      style={{
        borderRadius: 20,
        border: achieved
          ? "1px solid rgba(255,255,255,0.14)"
          : "1px solid rgba(255,255,255,0.08)",
        background: achieved
          ? "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)"
          : "rgba(255,255,255,0.025)",
        padding: "16px 16px 14px",
      }}
    >
      <p
        style={{
          margin: 0,
          color: achieved ? "#f3f4f6" : "#8f8f8f",
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: "-0.2px",
          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
        }}
      >
        {meta.label}
      </p>
      <p
        style={{
          margin: "8px 0 0",
          color: achieved ? "#d1d5db" : "#7f7f7f",
          fontSize: 12,
          lineHeight: 1.6,
          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
        }}
      >
        {meta.description}
      </p>
      <p
        style={{
          margin: "10px 0 0",
          color: achieved ? "#cbd5e1" : "#6b7280",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
        }}
      >
        {achieved ? meta.counterLabel : "Locked"}
      </p>
    </div>
  );
}

export default function GamificationWidgets({
  variant = "home",
}: {
  variant?: "home" | "profile";
}) {
  const { user, configured } = useAuth();
  const [stats, setStats] = useState<ReelShelfGamificationStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !configured) {
      setStats(EMPTY_STATS);
      return;
    }

    let cancelled = false;

    async function loadStats() {
      setLoading(true);
      try {
        const next = await syncAndLoadGamificationStats();
        if (!cancelled) {
          setStats(next);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadStats();

    const unsubscribeDiary = subscribeToDiary(() => {
      void loadStats();
    });

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void loadStats();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      unsubscribeDiary();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [configured, user]);

  const achievedBadges = useMemo(() => new Set(stats.badges), [stats.badges]);
  const badgeIds = useMemo(() => Object.keys(BADGE_META) as ReelShelfBadgeId[], []);

  if (!user || !configured) {
    return null;
  }

  return (
    <section
      style={{
        borderRadius: variant === "home" ? 28 : 24,
        border: "1px solid rgba(255,255,255,0.08)",
        background:
          variant === "home"
            ? "radial-gradient(circle at top left, rgba(255,255,255,0.06), transparent 28%), linear-gradient(180deg, rgba(18,18,18,0.96) 0%, rgba(8,8,8,0.97) 100%)"
            : "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.02) 100%)",
        padding: variant === "home" ? "24px 24px 22px" : 24,
        boxShadow:
          variant === "home" ? "0 22px 56px rgba(0,0,0,0.24)" : "none",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <div>
          <SectionLabel>
            {variant === "home" ? "Momentum" : "Streaks & Milestones"}
          </SectionLabel>
          <h2
            style={{
              margin: "8px 0 0",
              fontSize: variant === "home" ? 30 : 32,
              lineHeight: 1.02,
              letterSpacing: "-1px",
              fontWeight: 500,
            }}
          >
            {variant === "home"
              ? "Keep your ReelShelf streak alive."
              : "Your retention and shelf milestones."}
          </h2>
          <p
            style={{
              margin: "10px 0 0",
              color: "#a8a8a8",
              fontSize: 14,
              lineHeight: 1.65,
              maxWidth: 760,
            }}
          >
            {variant === "home"
              ? "A quick pulse on your current run, social traction, and milestone progress."
              : "Track consistency, social momentum, and the moments that turn a casual shelf into a real habit."}
          </p>
        </div>

        <div
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            color: "#d1d5db",
            fontSize: 12,
            fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
          }}
        >
          {loading ? "Refreshing…" : `${stats.badges.length} badges unlocked`}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            variant === "home"
              ? "repeat(2, minmax(0, 1fr))"
              : "repeat(4, minmax(0, 1fr))",
          gap: 14,
          marginBottom: 16,
        }}
      >
        <StreakCard
          label="Current streak"
          value={`${stats.currentStreak} day${stats.currentStreak === 1 ? "" : "s"}`}
          detail="Consecutive days with at least one diary log."
        />
        <StreakCard
          label="Longest streak"
          value={`${stats.longestStreak} day${stats.longestStreak === 1 ? "" : "s"}`}
          detail="Your best ReelShelf logging run so far."
        />
        {variant === "profile" ? (
          <>
            <StreakCard
              label="Likes received"
              value={stats.likesReceived}
              detail="Public appreciation across your diary entries."
            />
            <StreakCard
              label="Comments received"
              value={stats.commentsReceived}
              detail="Conversations sparked by your public logs and reviews."
            />
          </>
        ) : null}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            variant === "home"
              ? "repeat(2, minmax(0, 1fr))"
              : "repeat(3, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        {badgeIds.map((badgeId) => (
          <BadgeCard
            key={badgeId}
            badgeId={badgeId}
            achieved={achievedBadges.has(badgeId)}
          />
        ))}
      </div>
    </section>
  );
}
