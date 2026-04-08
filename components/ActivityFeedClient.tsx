"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";
import {
  NotificationCard,
  NotificationFilterButton,
  type NotificationFilter,
} from "./NotificationsFeed";
import {
  getNotifications,
  getUnreadNotificationCount,
  isNotificationUnread,
  NOTIFICATION_POLL_INTERVAL_MS,
  readNotificationLastReadAt,
  type ReelShelfNotification,
  writeNotificationLastReadAt,
} from "../lib/supabase/notifications";
import { subscribeToFollows } from "../lib/supabase/social";

type NotificationSection = {
  label: "Today" | "This week" | "Earlier";
  items: ReelShelfNotification[];
};

function getSectionLabel(date: string): NotificationSection["label"] {
  const now = new Date();
  const value = new Date(date);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const valueTime = value.getTime();

  if (valueTime >= todayStart) {
    return "Today";
  }

  const weekAgo = todayStart - 6 * 24 * 60 * 60 * 1000;

  if (valueTime >= weekAgo) {
    return "This week";
  }

  return "Earlier";
}

function groupNotifications(
  notifications: ReelShelfNotification[]
): NotificationSection[] {
  const buckets: Record<NotificationSection["label"], ReelShelfNotification[]> = {
    Today: [],
    "This week": [],
    Earlier: [],
  };

  for (const notification of notifications) {
    buckets[getSectionLabel(notification.createdAt)].push(notification);
  }

  return [
    { label: "Today" as const, items: buckets.Today },
    { label: "This week" as const, items: buckets["This week"] },
    { label: "Earlier" as const, items: buckets.Earlier },
  ].filter((section) => section.items.length > 0);
}

export default function ActivityFeedClient() {
  const { user, configured, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [notifications, setNotifications] = useState<ReelShelfNotification[]>([]);
  const [lastReadAt, setLastReadAt] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLastReadAt(null);
      return;
    }

    setLastReadAt(readNotificationLastReadAt(user.id));
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    async function loadNotifications() {
      setLoading(true);
      try {
        const next = await getNotifications();
        if (!cancelled) {
          setNotifications(next);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadNotifications();

    const interval = window.setInterval(() => {
      void loadNotifications();
    }, NOTIFICATION_POLL_INTERVAL_MS);

    const unsubscribeFollows = subscribeToFollows(() => {
      void loadNotifications();
    });

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void loadNotifications();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      unsubscribeFollows();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user]);

  const unreadCount = useMemo(() => {
    return getUnreadNotificationCount(notifications, lastReadAt);
  }, [notifications, lastReadAt]);

  const filteredNotifications = useMemo(() => {
    if (filter === "all") {
      return notifications;
    }

    return notifications.filter((notification) =>
      isNotificationUnread(notification, lastReadAt)
    );
  }, [filter, notifications, lastReadAt]);

  const groupedNotifications = useMemo(() => {
    return groupNotifications(filteredNotifications);
  }, [filteredNotifications]);

  function handleMarkAllRead() {
    if (!user) {
      return;
    }

    const timestamp = new Date().toISOString();
    setLastReadAt(timestamp);
    writeNotificationLastReadAt(user.id, timestamp);
  }

  if (!configured) {
    return (
      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "28px 0 84px",
        }}
      >
        <div
          style={{
            borderRadius: 28,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(18,18,18,0.95) 0%, rgba(10,10,10,0.96) 100%)",
            padding: 28,
            color: "#e5e7eb",
          }}
        >
          Supabase is not configured yet, so social activity isn’t available.
        </div>
      </main>
    );
  }

  if (authLoading) {
    return (
      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "28px 0 84px",
        }}
      >
        <div
          style={{
            borderRadius: 28,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(18,18,18,0.95) 0%, rgba(10,10,10,0.96) 100%)",
            padding: 28,
            color: "#9ca3af",
            fontFamily: "Arial, sans-serif",
          }}
        >
          Loading your activity…
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "28px 0 84px",
        }}
      >
        <section
          style={{
            borderRadius: 32,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "radial-gradient(circle at top, rgba(255,255,255,0.06), transparent 48%), linear-gradient(180deg, rgba(17,17,17,0.96) 0%, rgba(9,9,9,0.98) 100%)",
            padding: "30px 28px",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              color: "#7f7f7f",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontFamily: "Arial, sans-serif",
            }}
          >
            Activity
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(2.3rem, 5vw, 3.7rem)",
              lineHeight: 0.96,
              letterSpacing: "-2px",
              fontWeight: 500,
            }}
          >
            Your social feed lives here.
          </h1>
          <p
            style={{
              margin: "14px 0 0",
              color: "#b3b3b3",
              fontSize: 15,
              lineHeight: 1.75,
              maxWidth: 680,
              fontFamily: "Arial, sans-serif",
            }}
          >
            Sign in to see who followed you, what the shelves you follow logged, and the reviews worth opening next.
          </p>
          <Link
            href="/auth"
            style={{
              marginTop: 18,
              display: "inline-flex",
              alignItems: "center",
              height: 42,
              padding: "0 16px",
              borderRadius: 999,
              background: "white",
              color: "black",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "Arial, sans-serif",
            }}
          >
            Sign In
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "28px 0 84px",
      }}
    >
      <section
        style={{
          borderRadius: 32,
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "radial-gradient(circle at top, rgba(255,255,255,0.06), transparent 48%), linear-gradient(180deg, rgba(17,17,17,0.96) 0%, rgba(9,9,9,0.98) 100%)",
          padding: "30px 28px",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#7f7f7f",
            fontSize: 11,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            fontFamily: "Arial, sans-serif",
          }}
        >
          Activity
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 24,
            flexWrap: "wrap",
            marginTop: 8,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(2.5rem, 5vw, 4rem)",
                lineHeight: 0.95,
                letterSpacing: "-2.2px",
                fontWeight: 500,
              }}
            >
              Notifications and social updates.
            </h1>
            <p
              style={{
                margin: "14px 0 0",
                color: "#b3b3b3",
                fontSize: 15,
                lineHeight: 1.75,
                maxWidth: 720,
                fontFamily: "Arial, sans-serif",
              }}
            >
              Track new followers, fresh logs, standout reviews, and the shelves whose Mount Rushmore just shifted.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: 12,
              justifyItems: "end",
            }}
          >
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                color: "#f3f4f6",
                fontSize: 12,
                fontFamily: "Arial, sans-serif",
              }}
            >
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </div>

            <button
              type="button"
              onClick={handleMarkAllRead}
              style={{
                height: 38,
                padding: "0 14px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
                color: "#d1d5db",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "Arial, sans-serif",
              }}
            >
              Mark all as read
            </button>
          </div>
        </div>
      </section>

      <section
        style={{
          marginTop: 26,
          display: "grid",
          gap: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <NotificationFilterButton
              active={filter === "all"}
              label="All"
              onClick={() => setFilter("all")}
            />
            <NotificationFilterButton
              active={filter === "unread"}
              label={`Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
              onClick={() => setFilter("unread")}
            />
          </div>

          <p
            style={{
              margin: 0,
              color: "#7f7f7f",
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontFamily: "Arial, sans-serif",
            }}
          >
            {loading ? "Refreshing feed…" : `${filteredNotifications.length} shown`}
          </p>
        </div>

        {filteredNotifications.length > 0 ? (
          <div
            style={{
              display: "grid",
              gap: 24,
            }}
          >
            {groupedNotifications.map((section) => (
              <section
                key={section.label}
                style={{
                  display: "grid",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: "#f3f4f6",
                        fontSize: 15,
                        fontWeight: 600,
                        letterSpacing: "-0.2px",
                        fontFamily: "Arial, sans-serif",
                      }}
                    >
                      {section.label}
                    </p>

                    <div
                      style={{
                        flex: 1,
                        height: 1,
                        background:
                          "linear-gradient(90deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 100%)",
                      }}
                    />

                    <span
                      style={{
                        color: "#6b7280",
                        fontSize: 11,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        fontFamily: "Arial, sans-serif",
                      }}
                    >
                      {section.items.length}
                    </span>
                  </div>

                  <p
                    style={{
                      margin: 0,
                      color: "#7f7f7f",
                      fontSize: 12,
                      lineHeight: 1.6,
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    {section.label === "Today"
                      ? "Fresh shelf movement, reviews, and follows from today."
                      : section.label === "This week"
                        ? "The standout social moments from the last few days."
                        : "Everything worth revisiting from earlier in your feed."}
                  </p>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 14,
                  }}
                >
                  {section.items.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      unread={isNotificationUnread(notification, lastReadAt)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div
            style={{
              borderRadius: 28,
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                "linear-gradient(180deg, rgba(18,18,18,0.95) 0%, rgba(10,10,10,0.96) 100%)",
              padding: 26,
            }}
          >
            <p
              style={{
                margin: "0 0 8px",
                color: "#7f7f7f",
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                fontFamily: "Arial, sans-serif",
              }}
            >
              {filter === "unread" ? "No unread notifications" : "Quiet for now"}
            </p>
            <h2
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 500,
                letterSpacing: "-1px",
              }}
            >
              {filter === "unread"
                ? "You’re caught up."
                : "Follow more shelves to bring this feed to life."}
            </h2>
            <p
              style={{
                margin: "12px 0 0",
                color: "#b3b3b3",
                fontSize: 14,
                lineHeight: 1.75,
                maxWidth: 700,
                fontFamily: "Arial, sans-serif",
              }}
            >
              {filter === "unread"
                ? "Everything in your activity feed has already been seen."
                : "Once people follow you and the shelves you follow start logging films, series, or books, their updates will appear here."}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
