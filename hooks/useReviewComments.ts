"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient as createSupabaseBrowserClient } from "../lib/supabase/client";
import { useAuth } from "../components/AuthProvider";
import type { ReviewTargetType } from "./useReviewReactions";
import { createNotification } from "../utils/createNotification";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ReviewCommentUser = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type ReviewComment = {
  id: string;
  body: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  user: ReviewCommentUser;
};

// ─── Event bus ────────────────────────────────────────────────────────────────

const COMMENT_UPDATED_EVENT = "reelshelf:review-comments-updated";

function notifyCommentListeners() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMMENT_UPDATED_EVENT));
}

// ─── Profile join (mirrors attachProfiles in lib/supabase/comments.ts) ────────

async function attachProfiles(
  rows: Array<{ id: string; body: string; created_at: string; updated_at: string; user_id: string }>
): Promise<ReviewComment[]> {
  if (rows.length === 0) return [];

  const client = createSupabaseBrowserClient();
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const profileMap = new Map<string, ReviewCommentUser>();

  if (client && userIds.length > 0) {
    const { data: profileRows } = await client
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", userIds);

    for (const p of profileRows ?? []) {
      profileMap.set(p.id as string, {
        username: (p.username as string | null) ?? null,
        display_name: (p.display_name as string | null) ?? null,
        avatar_url: (p.avatar_url as string | null) ?? null,
      });
    }
  }

  return rows.map((row) => ({
    id: row.id,
    body: row.body,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user_id: row.user_id,
    user: profileMap.get(row.user_id) ?? {
      username: null,
      display_name: null,
      avatar_url: null,
    },
  }));
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useReviewComments({
  targetType,
  targetId,
}: {
  targetType: ReviewTargetType;
  targetId: string;
}) {
  const { user, handle, avatarUrl } = useAuth();
  const currentUserId = user?.id ?? null;

  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stable ref so fetchComments closure doesn't go stale
  const targetTypeRef = useRef(targetType);
  const targetIdRef = useRef(targetId);
  targetTypeRef.current = targetType;
  targetIdRef.current = targetId;

  const fetchComments = useCallback(async () => {
    const tt = targetTypeRef.current;
    const tid = targetIdRef.current;
    if (!tid) return;

    const client = createSupabaseBrowserClient();
    if (!client) return;

    setIsLoading(true);

    const { data, error } = await client
      .from("review_comments")
      .select("id, body, created_at, updated_at, user_id")
      .eq("target_type", tt)
      .eq("target_id", tid)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[COMMENT] fetch error", error);
      setIsLoading(false);
      return;
    }

    const resolved = await attachProfiles(
      (data ?? []) as Array<{
        id: string;
        body: string;
        created_at: string;
        updated_at: string;
        user_id: string;
      }>
    );

    setComments(resolved);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void fetchComments();

    if (typeof window === "undefined") return;
    const handler = () => void fetchComments();
    window.addEventListener(COMMENT_UPDATED_EVENT, handler);
    return () => window.removeEventListener(COMMENT_UPDATED_EVENT, handler);
  }, [fetchComments, targetType, targetId]);

  // ── Add ───────────────────────────────────────────────────────────────────

  const addComment = useCallback(
    async (body: string) => {
      const trimmed = body.trim();
      if (!trimmed || trimmed.length > 500) return;
      if (!currentUserId) return;

      const client = createSupabaseBrowserClient();
      if (!client) return;

      console.log("[COMMENT] submit", { body: trimmed, targetType, targetId });

      setIsSubmitting(true);

      // Optimistic insert — placeholder until real row comes back
      const optimisticId = `opt-${Date.now()}`;
      const now = new Date().toISOString();
      const optimisticComment: ReviewComment = {
        id: optimisticId,
        body: trimmed,
        created_at: now,
        updated_at: now,
        user_id: currentUserId,
        user: {
          username: handle ?? null,
          display_name: null,
          avatar_url: avatarUrl ?? null,
        },
      };
      setComments((prev) => [...prev, optimisticComment]);

      const { data, error } = await client
        .from("review_comments")
        .insert({
          target_type: targetType,
          target_id: targetId,
          user_id: currentUserId,
          body: trimmed,
        })
        .select("id, body, created_at, updated_at, user_id")
        .single();

      setIsSubmitting(false);

      if (error) {
        console.log("[COMMENT] insert error", { error });
        // Roll back optimistic entry
        setComments((prev) => prev.filter((c) => c.id !== optimisticId));
        return;
      }

      console.log("[COMMENT] insert success", { id: (data as { id: string }).id });

      // Notify the review author — fire-and-forget, never blocks UI
      void (async () => {
        const ownerRes = await client
          .from("diary_entries")
          .select("user_id")
          .eq("id", targetId)
          .single();
        if (ownerRes.data?.user_id) {
          void createNotification(client, {
            userId: ownerRes.data.user_id as string,
            actorUserId: currentUserId!,
            type: "comment",
            targetId,
            preview: trimmed,
          });
        }
      })();

      // Replace optimistic with the real row (keep same user object)
      setComments((prev) =>
        prev.map((c) =>
          c.id === optimisticId
            ? {
                id: (data as { id: string }).id,
                body: (data as { body: string }).body,
                created_at: (data as { created_at: string }).created_at,
                updated_at: (data as { updated_at: string }).updated_at,
                user_id: (data as { user_id: string }).user_id,
                user: optimisticComment.user,
              }
            : c
        )
      );

      notifyCommentListeners();
    },
    [targetType, targetId, currentUserId, handle, avatarUrl]
  );

  // ── Delete ────────────────────────────────────────────────────────────────

  const deleteComment = useCallback(
    async (commentId: string) => {
      const client = createSupabaseBrowserClient();
      if (!client) return;

      console.log("[COMMENT] delete", { commentId });

      // Optimistic remove
      const removed = comments.find((c) => c.id === commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));

      const { error } = await client
        .from("review_comments")
        .delete()
        .eq("id", commentId);

      if (error) {
        console.log("[COMMENT] delete error", { error });
        // Restore in original order
        if (removed) {
          setComments((prev) =>
            [...prev, removed].sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            )
          );
        }
        return;
      }

      console.log("[COMMENT] delete success");
      notifyCommentListeners();
    },
    [comments]
  );

  return {
    comments,
    commentCount: comments.length,
    addComment,
    deleteComment,
    isLoading,
    isSubmitting,
  };
}
