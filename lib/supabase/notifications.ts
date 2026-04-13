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

export async function getNotifications() {
  const client = createSupabaseBrowserClient();
  const currentUserId = await getCurrentUserId();

  if (!client || !currentUserId) {
    return [] as ReelShelfNotification[];
  }

  const [{ data: incomingFollowers, error: incomingFollowersError }, { data: followingRows, error: followingError }, { data: ownDiaryRows, error: ownDiaryError }] =
    await Promise.all([
      client
        .from("followers")
        .select("follower_id, created_at")
        .eq("following_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(16),
      client
        .from("followers")
        .select("following_id")
        .eq("follower_id", currentUserId),
      client
        .from("diary_entries")
        .select(DIARY_SELECT)
        .eq("user_id", currentUserId)
        .order("saved_at", { ascending: false })
        .limit(32),
    ]);

  if (incomingFollowersError) {
    console.error(
      "[ReelShelf notifications] load incoming followers failed",
      incomingFollowersError
    );
  }

  if (followingError) {
    console.error("[ReelShelf notifications] load following failed", followingError);
  }

  if (ownDiaryError) {
    console.error("[ReelShelf notifications] load own diary entries failed", ownDiaryError);
  }

  const followedIds = (followingRows || []).map((row) => row.following_id).filter(Boolean);
  const followerIds = (incomingFollowers || []).map((row) => row.follower_id).filter(Boolean);
  const ownDiaryEntries = ((ownDiaryRows || []) as unknown) as DiaryRow[];
  const ownDiaryEntryIds = ownDiaryEntries.map((row) => row.id);

  console.log("[DIARY QUERY] returned rows:", ownDiaryRows?.length ?? 0)

  let likeRows: LikeRow[] = [];
  let likeError: { message?: string } | null = null;
  let commentRows: CommentRow[] = [];
  let replyRows: CommentRow[] = [];

  if (ownDiaryEntryIds.length > 0) {
    const likesResponse = await client
      .from("diary_entry_likes")
      .select("diary_entry_id, user_id, created_at")
      .in("diary_entry_id", ownDiaryEntryIds)
      .order("created_at", { ascending: false })
      .limit(18)

    likeRows = ((likesResponse.data || []) as LikeRow[]).filter(
      (row) => row.user_id !== currentUserId
    );
    likeError = likesResponse.error;
  }

  if (likeError) {
    console.error("[ReelShelf notifications] load likes failed", likeError);
  }

  const ownDiaryMap = new Map<string, DiaryRow>(
    ownDiaryEntries.map((row) => [row.id, row] as const)
  );

  const likerIds = likeRows.map((row) => row.user_id).filter(Boolean);
  const commenterIds = [...commentRows, ...replyRows].map((row) => row.user_id).filter(Boolean);
  const uniqueProfileIds = Array.from(
    new Set([...followedIds, ...followerIds, ...likerIds, ...commenterIds])
  );

  let profileRows: ProfileRow[] = [];
  let profileError: { message?: string } | null = null;
  let diaryRows: DiaryRow[] = [];
  let diaryError: { message?: string } | null = null;

  if (uniqueProfileIds.length > 0) {
    const response = await client
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", uniqueProfileIds);

    profileRows = ((response.data || []) as ProfileRow[]).filter(Boolean);
    profileError = response.error;
  }

  if (followedIds.length > 0) {
    const response = await client
      .from("diary_entries")
      .select(DIARY_SELECT)
      .in("user_id", followedIds)
      .order("saved_at", { ascending: false })
      .limit(36);

    diaryRows = (((response.data || []) as unknown) as DiaryRow[]).filter(Boolean);
    diaryError = response.error;
  }

  if (profileError) {
    console.error("[ReelShelf notifications] load profiles failed", profileError);
  }

  if (diaryError) {
    console.error("[ReelShelf notifications] load diary events failed", diaryError);
  }

  const profileMap = new Map<string, ProfileRow>(
    profileRows.map((row) => [row.id, row] as const)
  );
  const notificationEntryMap = new Map<string, DiaryRow>(ownDiaryMap);

  const notifications: ReelShelfNotification[] = [];

  for (const row of incomingFollowers || []) {
    notifications.push(
      createFollowerNotification(row, profileMap.get(row.follower_id))
    );
  }

  for (const row of likeRows) {
    const likeNotification = createLikeNotification(
      row,
      profileMap.get(row.user_id),
      ownDiaryMap.get(row.diary_entry_id)
    );

    if (likeNotification) {
      notifications.push(likeNotification);
    }
  }

  for (const row of commentRows) {
    const commentNotification = createEntryCommentNotification(
      row,
      profileMap.get(row.user_id),
      notificationEntryMap.get(row.diary_entry_id)
    );

    if (commentNotification) {
      notifications.push(commentNotification);
    }
  }

  for (const row of replyRows) {
    const replyNotification = createReplyNotification(
      row,
      profileMap.get(row.user_id),
      notificationEntryMap.get(row.diary_entry_id)
    );

    if (replyNotification) {
      notifications.push(replyNotification);
    }
  }

  for (const row of diaryRows.slice(0, 18)) {
    notifications.push(createDiaryNotification(row, profileMap.get(row.user_id)));
  }

  const diaryByUser = new Map<string, DiaryRow[]>();
  for (const row of diaryRows) {
    const current = diaryByUser.get(row.user_id) || [];
    current.push(row);
    diaryByUser.set(row.user_id, current);
  }

  diaryByUser.forEach((entries, userId) => {
    const movieEntries = entries.filter((entry) => entry.media_type === "movie");

    if (movieEntries.length === 0) {
      return;
    }

    const latestMovieEntry = movieEntries[0];

    if (!isRecentEnough(latestMovieEntry.saved_at, 45)) {
      return;
    }

    const mountRushmore = [...movieEntries]
      .filter((entry) => entry.media_type === "movie")
      .sort((left, right) => {
        if (left.favourite !== right.favourite) {
          return Number(right.favourite) - Number(left.favourite);
        }

        const leftRating = left.rating ?? -1;
        const rightRating = right.rating ?? -1;

        if (rightRating !== leftRating) {
          return rightRating - leftRating;
        }

        return new Date(right.saved_at).getTime() - new Date(left.saved_at).getTime();
      })
      .slice(0, 4);

    const changedRushmore = mountRushmore.find(
      (entry) =>
        entry.media_id === latestMovieEntry.media_id &&
        entry.saved_at === latestMovieEntry.saved_at
    );

    if (!changedRushmore) {
      return;
    }

    notifications.push(
      createRushmoreNotification(
        userId,
        latestMovieEntry.saved_at,
        profileMap.get(userId),
        mountRushmore[0]
      )
    );
  });

  return notifications
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )
    .slice(0, 24);
}
