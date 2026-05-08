"use client";

import Link from "next/link";
import { getProfileInitials } from "../lib/profile";
import {
  formatNotificationRecency,
  type ReelShelfNotification,
} from "../lib/supabase/notifications";

export type NotificationFilter = "all" | "unread";

function getNotificationPreview(notification: ReelShelfNotification) {
  if (
    (notification.type === "followed_user_reviewed" ||
      notification.type === "review_liked" ||
      notification.type === "entry_commented" ||
      notification.type === "comment_replied") &&
    notification.review
  ) {
    return notification.review;
  }

  if (typeof notification.rating === "number") {
    return `${notification.rating.toFixed(1)} / 10`;
  }

  if (notification.mediaTitle) {
    return notification.mediaTitle;
  }

  return "";
}

export function NotificationFilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 38,
        padding: "0 14px",
        borderRadius: 999,
        border: active
          ? "1px solid rgba(255,255,255,0.18)"
          : "1px solid rgba(255,255,255,0.08)",
        background: active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
        color: active ? "white" : "#9ca3af",
        fontSize: 12,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

export function NotificationCard({
  notification,
  unread,
  compact = false,
  onSelect,
}: {
  notification: ReelShelfNotification;
  unread: boolean;
  compact?: boolean;
  onSelect?: () => void;
}) {
  const preview = getNotificationPreview(notification);

  return (
    <Link
      href={notification.href}
      onClick={onSelect}
      style={{
        display: "grid",
        gridTemplateColumns: compact
          ? "42px minmax(0, 1fr) auto"
          : "54px minmax(0, 1fr) auto",
        gap: compact ? 12 : 16,
        alignItems: "start",
        textDecoration: "none",
        color: "inherit",
        borderRadius: compact ? 18 : 24,
        padding: compact ? 12 : 18,
        background: unread
          ? "linear-gradient(180deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.03) 100%)"
          : "rgba(255,255,255,0.03)",
        border: unread
          ? "1px solid rgba(255,255,255,0.11)"
          : "1px solid rgba(255,255,255,0.07)",
        boxShadow: compact ? "none" : "0 18px 46px rgba(0,0,0,0.2)",
      }}
    >
      <div
        style={{
          width: compact ? 42 : 54,
          height: compact ? 42 : 54,
          borderRadius: 999,
          overflow: "hidden",
          background:
            "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 60%), linear-gradient(180deg, #171717 0%, #0b0b0b 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}
      >
        {notification.avatarUrl ? (
          <img
            src={notification.avatarUrl}
            alt={notification.displayName || notification.username || "Profile avatar"}
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
              color: "rgba(255,255,255,0.7)",
              fontSize: compact ? 11 : 13,
              fontWeight: 700,
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            {getProfileInitials({
              displayName: notification.displayName,
              username: notification.username,
            })}
          </div>
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              color: "#f3f4f6",
              fontSize: compact ? 13 : 14,
              fontWeight: 600,
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            @{notification.username || "reelshelf"}
          </span>

          {unread ? (
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                background: "#f3f4f6",
                boxShadow: "0 0 12px rgba(255,255,255,0.4)",
                flexShrink: 0,
              }}
            />
          ) : null}
        </div>

        <p
          style={{
            margin: compact ? "4px 0 0" : "6px 0 0",
            color: "#d1d5db",
            fontSize: compact ? 13 : 14,
            lineHeight: 1.5,
            fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
          }}
        >
          {notification.actionText}
        </p>

        {preview ? (
          <p
            style={{
              margin: compact ? "8px 0 0" : "10px 0 0",
              color:
                notification.type === "followed_user_reviewed" ||
                notification.type === "review_liked" ||
                notification.type === "entry_commented" ||
                notification.type === "comment_replied"
                  ? "#bfc8ff"
                  : "#9ca3af",
              fontSize: compact ? 12 : 13,
              lineHeight: 1.55,
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              display: "-webkit-box",
              WebkitLineClamp: compact ? 1 : 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {preview}
          </p>
        ) : null}

        <p
          style={{
            margin: compact ? "8px 0 0" : "12px 0 0",
            color: "#7f7f7f",
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
          }}
        >
          {formatNotificationRecency(notification.createdAt)}
        </p>
      </div>

      {notification.mediaPoster ? (
        <div
          style={{
            position: "relative",
            width: compact ? 44 : 58,
            aspectRatio: "2 / 3",
            borderRadius: compact ? 12 : 14,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.06)",
            background:
              "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 60%), linear-gradient(180deg, #171717 0%, #0b0b0b 100%)",
            flexShrink: 0,
          }}
        >
          <img
            src={notification.mediaPoster}
            alt={notification.mediaTitle || "Media artwork"}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>
      ) : (
        <div
          style={{
            alignSelf: "center",
            color: "rgba(255,255,255,0.34)",
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
          }}
        >
          {notification.type === "new_follower" ? "Follow" : "Social"}
        </div>
      )}
    </Link>
  );
}
