"use client";

import { createClient as createSupabaseBrowserClient } from "./client";

export type PublicComment = {
  id: string;
  diaryEntryId: string;
  parentCommentId: string | null;
  userId: string;
  body: string;
  createdAt: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

const COMMENT_EVENT = "reelshelf:comments-updated";

type CommentProfileRow = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type CommentSelectRow = {
  id: string;
  diary_entry_id: string;
  parent_comment_id: string | null;
  user_id: string;
  body: string;
  created_at: string;
  profiles: CommentProfileRow[] | CommentProfileRow | null;
};

function getCommentProfile(row: CommentSelectRow) {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

  return {
    username: profile?.username ?? null,
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
  };
}

function notifyCommentListeners() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(COMMENT_EVENT));
}

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

export async function getCommentsForDiaryEntries(entryIds: string[]) {
  if (entryIds.length === 0) {
    return [] as PublicComment[];
  }

  return [] as PublicComment[];
}

export async function createDiaryEntryComment(input: {
  diaryEntryId: string;
  body: string;
  parentCommentId?: string | null;
}) {
  const currentUserId = await getCurrentUserId();

  if (!currentUserId) {
    return {
      error: "You need to sign in to comment.",
      comment: null,
    };
  }

  const normalizedBody = input.body.trim();

  if (!normalizedBody) {
    return {
      error: "Write something before posting.",
      comment: null,
    };
  }

  return {
    error: "Comments are currently unavailable.",
    comment: null,
  };
}

export function subscribeToComments(listener: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener(COMMENT_EVENT, listener);
  return () => window.removeEventListener(COMMENT_EVENT, listener);
}
