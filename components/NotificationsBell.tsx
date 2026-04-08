"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import {
  NotificationCard,
} from "./NotificationsFeed";
import {
  getNotifications,
  getUnreadNotificationCount,
  NOTIFICATION_POLL_INTERVAL_MS,
  readNotificationLastReadAt,
  type ReelShelfNotification,
  writeNotificationLastReadAt,
} from "../lib/supabase/notifications";
import { subscribeToFollows } from "../lib/supabase/social";

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 18H9" />
      <path d="M18 16.5H6a1 1 0 0 1-.83-1.56l1.11-1.66c.45-.68.69-1.48.69-2.29V9.5a5.03 5.03 0 0 1 10.06 0v1.49c0 .81.24 1.61.69 2.29l1.11 1.66A1 1 0 0 1 18 16.5Z" />
      <path d="M13.73 20a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export default function NotificationsBell() {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<ReelShelfNotification[]>([]);
  const [lastReadAt, setLastReadAt] = useState<string | null>(null);

  useEffect(() => {
    if (!user || typeof window === "undefined") {
      setLastReadAt(null);
      setNotifications([]);
      return;
    }

    const stored = readNotificationLastReadAt(user.id);
    setLastReadAt(stored);
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

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const unreadCount = useMemo(() => {
    return getUnreadNotificationCount(notifications, lastReadAt);
  }, [lastReadAt, notifications]);

  function markAsRead() {
    if (!user || typeof window === "undefined") {
      return;
    }

    const nextReadAt = new Date().toISOString();
    setLastReadAt(nextReadAt);
    writeNotificationLastReadAt(user.id, nextReadAt);
  }

  function handleToggle() {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (nextOpen) {
      markAsRead();
    }
  }

  if (!user) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
      }}
    >
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Open notifications"
        style={{
          position: "relative",
          width: 40,
          height: 40,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.08)",
          background: open ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
          color: "#f3f4f6",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span
            style={{
              position: "absolute",
              top: -3,
              right: -2,
              minWidth: 18,
              height: 18,
              padding: "0 5px",
              borderRadius: 999,
              background: "#f3f4f6",
              color: "#050505",
              fontSize: 10,
              fontWeight: 700,
              lineHeight: "18px",
              textAlign: "center",
              fontFamily: "Arial, sans-serif",
              boxShadow: "0 8px 18px rgba(0,0,0,0.28)",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 14px)",
            right: 0,
            width: 380,
            maxWidth: "calc(100vw - 32px)",
            borderRadius: 24,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(18,18,18,0.98) 0%, rgba(8,8,8,0.98) 100%)",
            boxShadow: "0 28px 70px rgba(0,0,0,0.42)",
            padding: 18,
            zIndex: 60,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: "#7f7f7f",
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  fontFamily: "Arial, sans-serif",
                }}
              >
                Notifications
              </p>
              <h3
                style={{
                  margin: "6px 0 0",
                  fontSize: 20,
                  fontWeight: 500,
                  letterSpacing: "-0.6px",
                  color: "white",
                }}
              >
                Social updates
              </h3>
            </div>

            <div
              style={{
                padding: "7px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                color: "#d1d5db",
                fontSize: 11,
                fontFamily: "Arial, sans-serif",
              }}
            >
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
              maxHeight: 460,
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {loading && notifications.length === 0 ? (
              <div
                style={{
                  borderRadius: 18,
                  border: "1px solid rgba(255,255,255,0.07)",
                  background: "rgba(255,255,255,0.03)",
                  padding: 18,
                  color: "#9ca3af",
                  fontSize: 13,
                  fontFamily: "Arial, sans-serif",
                }}
              >
                Loading notifications…
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  unread={lastReadAt ? new Date(notification.createdAt).getTime() > new Date(lastReadAt).getTime() : true}
                  compact
                  onSelect={() => setOpen(false)}
                />
              ))
            ) : (
              <div
                style={{
                  borderRadius: 18,
                  border: "1px solid rgba(255,255,255,0.07)",
                  background: "rgba(255,255,255,0.03)",
                  padding: 18,
                }}
              >
                <p
                  style={{
                    margin: "0 0 8px",
                    color: "#7f7f7f",
                    fontSize: 10,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  Quiet for now
                </p>
                <p
                  style={{
                    margin: 0,
                    color: "#d1d5db",
                    fontSize: 13,
                    lineHeight: 1.6,
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  Follow more shelves to see new reviews, fresh logs, and social activity appear here.
                </p>
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginTop: 14,
              paddingTop: 14,
              borderTop: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <button
              type="button"
              onClick={markAsRead}
              style={{
                height: 34,
                padding: "0 12px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
                color: "#d1d5db",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "Arial, sans-serif",
              }}
            >
              Mark all read
            </button>

            <Link
              href="/activity"
              onClick={() => setOpen(false)}
              style={{
                color: "#f3f4f6",
                textDecoration: "none",
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontFamily: "Arial, sans-serif",
              }}
            >
              View all activity
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
