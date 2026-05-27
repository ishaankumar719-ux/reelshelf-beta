"use client";

import { createClient as createSupabaseBrowserClient } from "./client";
import { getMediaHref } from "../mediaRoutes";
import { getPublicProfileHref } from "../profile";
import type { MediaType } from "../media";
import { DIARY_SELECT } from "../queries";

export type ReelShelfNotificationType =
  | "new_follower"
  | "followed_user_logged"
  | "followed_user_reviewed"
  | "followed_user_mount_rushmore"
  | "review_liked"
  | "entry_commented"
  | "comment_replied";

export type ReelShelfNotification = {
  id: string;
  type: ReelShelfNotificationType;
  createdAt: string;
  href: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  actionText: string;
  mediaTitle: string | null;
  mediaPoster: string | null;
  mediaHref: string | null;
  rating: number | null;
  review: string;
};

export const NOTIFICATION_POLL_INTERVAL_MS = 90_000;

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type DiaryRow = {
  id: string;
  user_id: string;
  media_id: string;
  media_type: MediaType;
  title: string;
  poster: string | null;
  year: number;
  creator: string | null;
  rating: number | null;
  review: string | null;
  favourite: boolean;
  saved_at: string;
};

type LikeRow = {
  diary_entry_id: string;
  user_id: string;
  created_at: string;
};

type CommentRow = {
  id: string;
  diary_entry_id: string;
  parent_comment_id: string | null;
  user_id: string;
  body: string;
  created_at: string;
};

async function getCurrentUserId() {
  const client = createSupabaseBrowserClient();

  if (!client) {
    return null;
  }

  const {
    data: { user },
  } = await client.auth.getUser();

  return user?.id || null;
}

function profileHref(username: string | null) {
  return username ? getPublicProfileHref(username) : "/discover";
}

function createFollowerNotification(
  row: { follower_id: string; created_at: string },
  profile: ProfileRow | undefined
): ReelShelfNotification {
  return {
    id: `follower:${row.follower_id}:${row.created_at}`,
    type: "new_follower",
    createdAt: row.created_at,
    href: profileHref(profile?.username ?? null),
    username: profile?.username ?? null,
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    actionText: "started following you",
    mediaTitle: null,
    mediaPoster: null,
    mediaHref: null,
    rating: null,
    review: "",
  };
}

function createDiaryNotification(
  row: DiaryRow,
  profile: ProfileRow | undefined
): ReelShelfNotification {
  const isReview = Boolean(row.review?.trim());
  const title = row.title || "a title";

  return {
    id: `${isReview ? "review" : "log"}:${row.user_id}:${row.media_id}:${row.saved_at}`,
    type: isReview ? "followed_user_reviewed" : "followed_user_logged",
    createdAt: row.saved_at,
    href: getMediaHref({
      id: row.media_id,
      mediaType: row.media_type,
    }),
    username: profile?.username ?? null,
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    actionText: isReview ? `reviewed ${title}` : `logged ${title}`,
    mediaTitle: row.title,
    mediaPoster: row.poster ?? null,
    mediaHref: getMediaHref({
      id: row.media_id,
      mediaType: row.media_type,
    }),
    rating: typeof row.rating === "number" ? row.rating : null,
    review: row.review?.trim() || "",
  };
}

function createRushmoreNotification(
  userId: string,
  createdAt: string,
  profile: ProfileRow | undefined,
  preview: DiaryRow | undefined
): ReelShelfNotification {
  return {
    id: `rushmore:${userId}:${createdAt}`,
    type: "followed_user_mount_rushmore",
    createdAt,
    href: profileHref(profile?.username ?? null),
    username: profile?.username ?? null,
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    actionText: "updated their Mount Rushmore",
    mediaTitle: preview?.title ?? null,
    mediaPoster: preview?.poster ?? null,
    mediaHref:
      preview && preview.media_id
        ? getMediaHref({
            id: preview.media_id,
            mediaType: preview.media_type,
          })
        : null,
    rating: typeof preview?.rating === "number" ? preview.rating : null,
    review: "",
  };
}

function createLikeNotification(
  row: LikeRow,
  liker: ProfileRow | undefined,
  entry: DiaryRow | undefined
): ReelShelfNotification | null {
  if (!entry) {
    return null;
  }

  const hasReview = Boolean(entry.review?.trim());
  const title = entry.title || "this title";

  return {
    id: `like:${row.user_id}:${row.diary_entry_id}:${row.created_at}`,
    type: "review_liked",
    createdAt: row.created_at,
    href: getMediaHref({
      id: entry.media_id,
      mediaType: entry.media_type,
    }),
    username: liker?.username ?? null,
    displayName: liker?.display_name ?? null,
    avatarUrl: liker?.avatar_url ?? null,
    actionText: hasReview ? `liked your review of ${title}` : `liked your log of ${title}`,
    mediaTitle: entry.title,
    mediaPoster: entry.poster ?? null,
    mediaHref: getMediaHref({
      id: entry.media_id,
      mediaType: entry.media_type,
    }),
    rating: typeof entry.rating === "number" ? entry.rating : null,
    review: entry.review?.trim() || "",
  };
}

function createEntryCommentNotification(
  row: CommentRow,
  author: ProfileRow | undefined,
  entry: DiaryRow | undefined
): ReelShelfNotification | null {
  if (!entry) {
    return null;
  }

  const title = entry.title || "this title";

  return {
    id: `comment:${row.user_id}:${row.id}:${row.created_at}`,
    type: "entry_commented",
    createdAt: row.created_at,
    href: getMediaHref({
      id: entry.media_id,
      mediaType: entry.media_type,
    }),
    username: author?.username ?? null,
    displayName: author?.display_name ?? null,
    avatarUrl: author?.avatar_url ?? null,
    actionText: `commented on your entry for ${title}`,
    mediaTitle: entry.title,
    mediaPoster: entry.poster ?? null,
    mediaHref: getMediaHref({
      id: entry.media_id,
      mediaType: entry.media_type,
    }),
    rating: typeof entry.rating === "number" ? entry.rating : null,
    review: row.body.trim(),
  };
}

function createReplyNotification(
  row: CommentRow,
  author: ProfileRow | undefined,
  entry: DiaryRow | undefined
): ReelShelfNotification | null {
  if (!entry) {
    return null;
  }

  const title = entry.title || "this title";

  return {
    id: `reply:${row.user_id}:${row.id}:${row.created_at}`,
    type: "comment_replied",
    createdAt: row.created_at,
    href: getMediaHref({
      id: entry.media_id,
      mediaType: entry.media_type,
    }),
    username: author?.username ?? null,
    displayName: author?.display_name ?? null,
    avatarUrl: author?.avatar_url ?? null,
    actionText: `replied to your comment on ${title}`,
    mediaTitle: entry.title,
    mediaPoster: entry.poster ?? null,
    mediaHref: getMediaHref({
      id: entry.media_id,
      mediaType: entry.media_type,
    }),
    rating: typeof entry.rating === "number" ? entry.rating : null,
    review: row.body.trim(),
  };
}

function isRecentEnough(date: string, maxDays: number) {
  const timestamp = new Date(date).getTime();

  if (Number.isNaN(timestamp)) {
    return false;
  }

  return Date.now() - timestamp <= maxDays * 24 * 60 * 60 * 1000;
}

export function formatNotificationRecency(date: string) {
  const deltaMs = Date.now() - new Date(date).getTime();
  const minutes = Math.max(1, Math.floor(deltaMs / 60000));

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function getNotificationReadStorageKey(userId: string) {
  return `reelshelf-notifications-last-read:${userId}`;
}

export function readNotificationLastReadAt(userId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(getNotificationReadStorageKey(userId));
}

export function writeNotificationLastReadAt(userId: string, timestamp: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getNotificationReadStorageKey(userId), timestamp);
}

export function getUnreadNotificationCount(
  notifications: ReelShelfNotification[],
  lastReadAt: string | null
) {
  if (!lastReadAt) {
    return notifications.length;
  }

  const readTimestamp = new Date(lastReadAt).getTime();

  return notifications.filter((notification) => {
    return new Date(notification.createdAt).getTime() > readTimestamp;
  }).length;
}

export function isNotificationUnread(
  notification: ReelShelfNotification,
  lastReadAt: string | null
) {
  if (!lastReadAt) {
    return true;
  }

  return new Date(notification.createdAt).getTime() > new Date(lastReadAt).getTime();
}

type NotificationRow = {
  id: string;
  type: ReelShelfNotificationType;
  actor_id: string;
  reference_id: string | null;
  reference_type: string | null;
  read: boolean;
  created_at: string;
};

export async function getNotifications() {
  const client = createSupabaseBrowserClient();
  const currentUserId = await getCurrentUserId();

  if (!client || !currentUserId) {
    return [] as ReelShelfNotification[];
  }

  const { data: rawNotifications, error: notifError } = await client
    .from("notifications")
    .select("id, type, actor_id, reference_id, reference_type, read, created_at")
    .eq("recipient_id", currentUserId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (notifError) {
    console.error("[ReelShelf notifications] load notifications failed", notifError);
    return [] as ReelShelfNotification[];
  }

  if (!rawNotifications || rawNotifications.length === 0) {
    return [] as ReelShelfNotification[];
  }

  const notifRows = rawNotifications as NotificationRow[];

  const actorIds = Array.from(new Set(notifRows.map((r) => r.actor_id)));
  const diaryEntryIds = Array.from(
    new Set(
      notifRows
        .filter((r) => r.reference_type === "diary_entry" && r.reference_id)
        .map((r) => r.reference_id!)
    )
  );

  const [profilesRes, diaryRes] = await Promise.all([
    client
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", actorIds),
    diaryEntryIds.length > 0
      ? client
          .from("diary_entries")
          .select("id, user_id, media_id, media_type, title, poster, year, creator, rating, review, favourite, saved_at")
          .in("id", diaryEntryIds)
      : (Promise.resolve({ data: [] }) as Promise<{ data: unknown[] }>),
  ]);

  if (profilesRes.error) {
    console.error("[ReelShelf notifications] load profiles failed", profilesRes.error);
  }

  const profileMap = new Map<string, ProfileRow>(
    ((profilesRes.data || []) as ProfileRow[]).map((p) => [p.id, p])
  );
  const diaryMap = new Map<string, DiaryRow>(
    ((diaryRes.data || []) as unknown as DiaryRow[]).map((e) => [e.id, e])
  );

  const notifications: ReelShelfNotification[] = [];

  for (const notif of notifRows) {
    const actor = profileMap.get(notif.actor_id);

    if (notif.type === "new_follower") {
      notifications.push(
        createFollowerNotification(
          { follower_id: notif.actor_id, created_at: notif.created_at },
          actor
        )
      );
      continue;
    }

    if (
      notif.type === "followed_user_logged" ||
      notif.type === "followed_user_reviewed"
    ) {
      if (notif.reference_id) {
        const entry = diaryMap.get(notif.reference_id);
        if (entry) {
          notifications.push(createDiaryNotification(entry, actor));
        }
      }
      continue;
    }

    if (notif.type === "review_liked" && notif.reference_id) {
      const entry = diaryMap.get(notif.reference_id);
      if (entry) {
        notifications.push(
          createLikeNotification(
            { diary_entry_id: notif.reference_id, user_id: notif.actor_id, created_at: notif.created_at },
            actor,
            entry
          ) ?? {} as ReelShelfNotification
        );
      }
      continue;
    }

    if (notif.type === "entry_commented" && notif.reference_id) {
      const entry = diaryMap.get(notif.reference_id);
      if (entry) {
        notifications.push(
          createEntryCommentNotification(
            { id: notif.id, diary_entry_id: notif.reference_id, parent_comment_id: null, user_id: notif.actor_id, body: "", created_at: notif.created_at },
            actor,
            entry
          ) ?? {} as ReelShelfNotification
        );
      }
      continue;
    }
  }

  return notifications
    .filter((n) => n.id)
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )
    .slice(0, 24);
}
