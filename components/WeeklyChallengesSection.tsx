"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { getProfileInitials } from "../lib/profile";
import { subscribeToDiary } from "../lib/diary";
import { subscribeToComments } from "../lib/supabase/comments";
import { subscribeToLikes } from "../lib/supabase/likes";
import {
  syncAndLoadWeeklyChallenges,
  type WeeklyChallengeProgress,
  type WeeklyChallengeSnapshot,
  type WeeklyLeaderboardEntry,
} from "../lib/supabase/weekly";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: 0,
        color: "#7f7f7f",
        fontSize: 11,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
      }}
    >
      {children}
    </p>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div
      style={{
        height: 8,
        borderRadius: 999,
        overflow: "hidden",
        background: "rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          width: `${Math.max(6, Math.min(100, value))}%`,
          height: "100%",
          borderRadius: 999,
          background:
            "linear-gradient(90deg, rgba(255,255,255,0.92) 0%, rgba(214,224,255,0.72) 100%)",
        }}
      />
    </div>
  );
}

function ChallengeCard({ challenge }: { challenge: WeeklyChallengeProgress }) {
  const progressPercent = (challenge.current / challenge.target) * 100;

  return (
    <div
      style={{
        borderRadius: 20,
        border: challenge.complete
          ? "1px solid rgba(255,255,255,0.14)"
          : "1px solid rgba(255,255,255,0.08)",
        background: challenge.complete
          ? "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)"
          : "rgba(255,255,255,0.025)",
        padding: "16px 16px 14px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 16,
            lineHeight: 1.28,
            letterSpacing: "-0.2px",
            fontWeight: 600,
          }}
        >
          {challenge.label}
        </h3>
        <span
          style={{
            color: challenge.complete ? "#f3f4f6" : "#9ca3af",
            fontSize: 12,
            fontWeight: 600,
            fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            flexShrink: 0,
          }}
        >
          {Math.min(challenge.current, challenge.target)}/{challenge.target}
        </span>
      </div>

      <p
        style={{
          margin: 0,
          color: "#9ca3af",
          fontSize: 13,
          lineHeight: 1.6,
          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
        }}
      >
        {challenge.detail}
      </p>

      <div style={{ marginTop: 12 }}>
        <ProgressBar value={progressPercent} />
      </div>

      <p
        style={{
          margin: "10px 0 0",
          color: challenge.complete ? "#dbe4ff" : "#6b7280",
          fontSize: 10,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
        }}
      >
        {challenge.complete ? "Completed this week" : "In progress"}
      </p>
    </div>
  );
}

function LeaderboardCard({
  title,
  entries,
  valueLabel,
}: {
  title: string;
  entries: WeeklyLeaderboardEntry[];
  valueLabel: string;
}) {
  return (
    <div
      style={{
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.08)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.02) 100%)",
        padding: "18px 18px 16px",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#8f8f8f",
          fontSize: 10,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
        }}
      >
        Leaderboard
      </p>
      <h3
        style={{
          margin: "8px 0 0",
          fontSize: 20,
          lineHeight: 1.1,
          letterSpacing: "-0.6px",
          fontWeight: 600,
        }}
      >
        {title}
      </h3>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gap: 10,
        }}
      >
        {entries.length > 0 ? (
          entries.map((entry, index) => (
            <Link
              key={`${title}-${entry.userId}`}
              href={entry.username ? `/u/${entry.username}` : "/discover"}
              style={{
                textDecoration: "none",
                color: "inherit",
                display: "grid",
                gridTemplateColumns: "auto minmax(0, 1fr) auto",
                gap: 12,
                alignItems: "center",
                borderRadius: 16,
                padding: "10px 12px",
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span
                style={{
                  color: "#f3f4f6",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                  width: 16,
                }}
              >
                {index + 1}
              </span>

              <div
                style={{
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
                      alt={entry.displayName || entry.username || "Profile avatar"}
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
                      color: "#f3f4f6",
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {entry.displayName || `@${entry.username || "reelshelf"}`}
                  </p>
                  <p
                    style={{
                      margin: "3px 0 0",
                      color: "#7f7f7f",
                      fontSize: 10,
                      letterSpacing: "0.03em",
                      textTransform: "uppercase",
                      fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                    }}
                  >
                    @{entry.username || "reelshelf"}
                  </p>
                </div>
              </div>

              <span
                style={{
                  color: "white",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                  textAlign: "right",
                }}
              >
                {entry.value} {valueLabel}
              </span>
            </Link>
          ))
        ) : (
          <p
            style={{
              margin: 0,
              color: "#6b7280",
              fontSize: 12,
              lineHeight: 1.6,
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            No public activity has landed on this leaderboard yet.
          </p>
        )}
      </div>
    </div>
  );
}

export default function WeeklyChallengesSection() {
  const { user, configured } = useAuth();
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<WeeklyChallengeSnapshot | null>(null);

  useEffect(() => {
    if (!user || !configured) {
      setSnapshot(null);
      return;
    }

    let cancelled = false;

    async function loadSnapshot() {
      setLoading(true);
      try {
        const next = await syncAndLoadWeeklyChallenges();
        if (!cancelled) {
          setSnapshot(next);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSnapshot();

    const unsubscribeDiary = subscribeToDiary(() => {
      void loadSnapshot();
    });
    const unsubscribeLikes = subscribeToLikes(() => {
      void loadSnapshot();
    });
    const unsubscribeComments = subscribeToComments(() => {
      void loadSnapshot();
    });

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void loadSnapshot();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      unsubscribeDiary();
      unsubscribeLikes();
      unsubscribeComments();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [configured, user]);

  if (!user || !configured || !snapshot) {
    return null;
  }

  return (
    <section
      style={{
        borderRadius: 28,
        border: "1px solid rgba(255,255,255,0.08)",
        background:
          "radial-gradient(circle at top left, rgba(255,255,255,0.06), transparent 28%), linear-gradient(180deg, rgba(18,18,18,0.96) 0%, rgba(8,8,8,0.97) 100%)",
        padding: "24px 24px 22px",
        boxShadow: "0 22px 56px rgba(0,0,0,0.24)",
        marginBottom: 30,
      }}
    >
      <style>{`
        .weekly-challenges-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }

        .weekly-leaderboard-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        @media (max-width: 980px) {
          .weekly-challenges-grid,
          .weekly-leaderboard-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .weekly-challenges-grid,
          .weekly-leaderboard-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <div>
          <SectionLabel>Weekly challenges</SectionLabel>
          <h2
            style={{
              margin: "8px 0 0",
              fontSize: 32,
              lineHeight: 1.02,
              letterSpacing: "-1px",
              fontWeight: 500,
            }}
          >
            This week on ReelShelf.
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
            Push your shelf forward with a few light goals, then see who’s topping the week across public ReelShelf.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            justifyItems: "end",
            gap: 10,
          }}
        >
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
            {snapshot.completedCount}/{snapshot.progress.length} challenges complete
          </div>
          <div
            style={{
              color: loading ? "#d1d5db" : "#7f7f7f",
              fontSize: 11,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            {loading ? "Refreshing week…" : `Week of ${snapshot.weekStart}`}
          </div>
        </div>
      </div>

      <div className="weekly-challenges-grid">
        {snapshot.progress.map((challenge) => (
          <ChallengeCard key={challenge.id} challenge={challenge} />
        ))}
      </div>

      <div className="weekly-leaderboard-grid">
        <LeaderboardCard
          title="Most entries logged"
          entries={snapshot.leaderboard.entriesLogged}
          valueLabel="logs"
        />
        <LeaderboardCard
          title="Most reviews written"
          entries={snapshot.leaderboard.reviewsWritten}
          valueLabel="reviews"
        />
        <LeaderboardCard
          title="Most liked reviewer"
          entries={snapshot.leaderboard.likedReviewer}
          valueLabel="likes"
        />
      </div>
    </section>
  );
}
