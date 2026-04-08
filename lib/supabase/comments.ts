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
  const client = createSupabaseBrowserClient();

  if (!client || entryIds.length === 0) {
    return [] as PublicComment[];
  }

  const { data, error } = await client
    .from("diary_entry_comments")
    .select(
      "id, diary_entry_id, parent_comment_id, user_id, body, created_at, profiles:user_id (username, display_name, avatar_url)"
    )
    .in("diary_entry_id", entryIds)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[ReelShelf comments] load comments failed", error);
    return [];
  }

  return ((data || []) as CommentSelectRow[]).map((row) => {
    const profile = getCommentProfile(row);

    return {
    id: row.id,
    diaryEntryId: row.diary_entry_id,
    parentCommentId: row.parent_comment_id ?? null,
    userId: row.user_id,
    body: row.body || "",
    createdAt: row.created_at,
    username: profile.username,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
  };
  }) as PublicComment[];
}

export async function createDiaryEntryComment(input: {
  diaryEntryId: string;
  body: string;
  parentCommentId?: string | null;
}) {
  const client = createSupabaseBrowserClient();
  const currentUserId = await getCurrentUserId();

  if (!client || !currentUserId) {
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

  const { data, error } = await client
    .from("diary_entry_comments")
    .insert({
      diary_entry_id: input.diaryEntryId,
      parent_comment_id: input.parentCommentId || null,
      user_id: currentUserId,
      body: normalizedBody,
    })
    .select(
      "id, diary_entry_id, parent_comment_id, user_id, body, created_at, profiles:user_id (username, display_name, avatar_url)"
    )
    .single();

  if (error) {
    console.error("[ReelShelf comments] create comment failed", error);
    return {
      error: error.message || "Could not post your comment right now.",
      comment: null,
    };
  }

  const profile = getCommentProfile(data as CommentSelectRow);
  notifyCommentListeners();

  return {
    error: null,
    comment: {
      id: data.id,
      diaryEntryId: data.diary_entry_id,
      parentCommentId: data.parent_comment_id ?? null,
      userId: data.user_id,
      body: data.body || "",
      createdAt: data.created_at,
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
    } as PublicComment,
  };
}

export function subscribeToComments(listener: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener(COMMENT_EVENT, listener);
  return () => window.removeEventListener(COMMENT_EVENT, listener);
}
