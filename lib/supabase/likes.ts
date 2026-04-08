"use client";

import { createClient as createSupabaseBrowserClient } from "./client";

export type DiaryEntryLikeState = {
  diaryEntryId: string;
  liked: boolean;
  likeCount: number;
};

const LIKE_EVENT = "reelshelf:likes-updated";

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

function notifyLikeListeners() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(LIKE_EVENT));
}

export async function getLikedDiaryEntryIds(entryIds: string[]) {
  const client = createSupabaseBrowserClient();
  const currentUserId = await getCurrentUserId();

  if (!client || !currentUserId || entryIds.length === 0) {
    return [] as string[];
  }

  const { data, error } = await client
    .from("diary_entry_likes")
    .select("diary_entry_id")
    .eq("user_id", currentUserId)
    .in("diary_entry_id", entryIds);

  if (error) {
    console.error("[ReelShelf likes] load liked entry ids failed", error);
    return [];
  }

  return (data || []).map((row) => row.diary_entry_id);
}

export async function toggleDiaryEntryLike(
  diaryEntryId: string,
  currentlyLiked: boolean
) {
  const client = createSupabaseBrowserClient();
  const currentUserId = await getCurrentUserId();

  if (!client || !currentUserId) {
    return {
      error: "You need to sign in to like reviews.",
      liked: currentlyLiked,
    };
  }

  if (currentlyLiked) {
    const { error } = await client
      .from("diary_entry_likes")
      .delete()
      .eq("diary_entry_id", diaryEntryId)
      .eq("user_id", currentUserId);

    if (error) {
      console.error("[ReelShelf likes] unlike failed", error);
      return {
        error: error.message || "Could not remove your like right now.",
        liked: true,
      };
    }

    notifyLikeListeners();

    return {
      error: null,
      liked: false,
    };
  }

  const { error } = await client.from("diary_entry_likes").insert({
    diary_entry_id: diaryEntryId,
    user_id: currentUserId,
  });

  if (error && error.code !== "23505") {
    console.error("[ReelShelf likes] like failed", error);
    return {
      error: error.message || "Could not save your like right now.",
      liked: false,
    };
  }

  notifyLikeListeners();

  return {
    error: null,
    liked: true,
  };
}

export function subscribeToLikes(listener: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener(LIKE_EVENT, listener);
  return () => window.removeEventListener(LIKE_EVENT, listener);
}
