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
  attachmentUrl: string | null;
  attachmentType: "image" | "gif" | null;
};

const COMMENT_EVENT = "reelshelf:comments-updated";

type CommentRow = {
  id: string;
  diary_entry_id: string;
  parent_comment_id: string | null;
  user_id: string;
  body: string;
  created_at: string;
  attachment_url: string | null;
  attachment_type: "image" | "gif" | null;
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

const COMMENT_SELECT =
  "id, diary_entry_id, parent_comment_id, user_id, body, created_at, attachment_url, attachment_type";

function notifyCommentListeners() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMMENT_EVENT));
}

async function getCurrentUserId() {
  const client = createSupabaseBrowserClient();
  if (!client) return null;
  const {
    data: { user },
  } = await client.auth.getUser();
  return user?.id ?? null;
}

async function attachProfiles(commentRows: CommentRow[]): Promise<PublicComment[]> {
  if (commentRows.length === 0) return [];

  const client = createSupabaseBrowserClient();
  const userIds = Array.from(new Set(commentRows.map((r) => r.user_id)));
  const profileMap = new Map<string, ProfileRow>();

  if (client && userIds.length > 0) {
    const { data: profileRows } = await client
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", userIds);

    for (const p of profileRows ?? []) {
      profileMap.set(p.id, p as ProfileRow);
    }
  }

  return commentRows.map((row) => {
    const profile = profileMap.get(row.user_id);
    return {
      id: row.id,
      diaryEntryId: row.diary_entry_id,
      parentCommentId: row.parent_comment_id,
      userId: row.user_id,
      body: row.body,
      createdAt: row.created_at,
      username: profile?.username ?? null,
      displayName: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      attachmentUrl: row.attachment_url ?? null,
      attachmentType: row.attachment_type ?? null,
    };
  });
}

// Loads ALL comments (roots + replies) for a set of entries in one query.
// The caller separates roots from replies via parentCommentId.
export async function getCommentsForDiaryEntries(
  entryIds: string[]
): Promise<PublicComment[]> {
  if (entryIds.length === 0) return [];

  const client = createSupabaseBrowserClient();
  if (!client) return [];

  const { data, error } = await client
    .from("diary_entry_comments")
    .select(COMMENT_SELECT)
    .in("diary_entry_id", entryIds)
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) {
    console.error("[ReelShelf comments] batch load failed", error);
    return [];
  }

  return attachProfiles((data ?? []) as CommentRow[]);
}

export async function getCommentsForEntry(entryId: string): Promise<PublicComment[]> {
  return getCommentsForDiaryEntries([entryId]);
}

export async function getCommentCountsForEntries(
  entryIds: string[]
): Promise<Record<string, number>> {
  if (entryIds.length === 0) return {};

  const client = createSupabaseBrowserClient();
  if (!client) return {};

  // Count root comments only (parent_comment_id IS NULL)
  const { data } = await client
    .from("diary_entry_comments")
    .select("diary_entry_id")
    .in("diary_entry_id", entryIds)
    .is("parent_comment_id", null);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.diary_entry_id] = (counts[row.diary_entry_id] ?? 0) + 1;
  }
  return counts;
}

export async function createDiaryEntryComment(input: {
  diaryEntryId: string;
  body: string;
  parentCommentId?: string | null;
  attachmentUrl?: string | null;
  attachmentType?: "image" | "gif" | null;
}): Promise<{ error: string | null; comment: PublicComment | null }> {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    return { error: "You need to sign in to comment.", comment: null };
  }

  const normalizedBody = input.body.trim();
  if (!normalizedBody) {
    return { error: "Write something before posting.", comment: null };
  }

  const client = createSupabaseBrowserClient();
  if (!client) {
    return { error: "Could not connect.", comment: null };
  }

  const { data, error } = await client
    .from("diary_entry_comments")
    .insert({
      diary_entry_id: input.diaryEntryId,
      parent_comment_id: input.parentCommentId ?? null,
      user_id: currentUserId,
      body: normalizedBody,
      attachment_url: input.attachmentUrl ?? null,
      attachment_type: input.attachmentType ?? null,
    })
    .select(COMMENT_SELECT)
    .single();

  if (error) {
    console.error("[ReelShelf comments] create failed", error);
    return { error: error.message || "Could not post your comment.", comment: null };
  }

  const { data: profile } = await client
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", currentUserId)
    .single();

  notifyCommentListeners();

  const row = data as CommentRow;
  return {
    error: null,
    comment: {
      id: row.id,
      diaryEntryId: row.diary_entry_id,
      parentCommentId: row.parent_comment_id,
      userId: row.user_id,
      body: row.body,
      createdAt: row.created_at,
      username: profile?.username ?? null,
      displayName: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      attachmentUrl: row.attachment_url ?? null,
      attachmentType: row.attachment_type ?? null,
    },
  };
}

export function subscribeToComments(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(COMMENT_EVENT, listener);
  return () => window.removeEventListener(COMMENT_EVENT, listener);
}
