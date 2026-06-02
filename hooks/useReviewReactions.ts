"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient as createSupabaseBrowserClient } from "../lib/supabase/client";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ReviewTargetType =
  | "film_review"
  | "tv_review"
  | "episode_review"
  | "book_review"
  | "diary_entry";

export type ReviewReactionType =
  | "love"
  | "fire"
  | "cinema"
  | "funny"
  | "mind_blown";

export const REVIEW_REACTION_TYPES: ReviewReactionType[] = [
  "love",
  "fire",
  "cinema",
  "funny",
  "mind_blown",
];

export type ReviewReactionCounts = Record<ReviewReactionType, number>;

function emptyReactionCounts(): ReviewReactionCounts {
  return { love: 0, fire: 0, cinema: 0, funny: 0, mind_blown: 0 };
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useReviewReactions({
  targetType,
  targetId,
  currentUserId,
}: {
  targetType: ReviewTargetType;
  targetId: string;
  currentUserId: string | null;
}) {
  const [reactions, setReactions] = useState<ReviewReactionCounts>(
    emptyReactionCounts
  );
  const [userReactions, setUserReactions] = useState<Set<ReviewReactionType>>(
    new Set()
  );
  const [isLoading, setIsLoading] = useState(false);

  // ── Fetch counts on mount ──────────────────────────────────────────────────

  useEffect(() => {
    if (!targetId) return;

    const client = createSupabaseBrowserClient();
    if (!client) return;

    void client
      .from("review_reactions")
      .select("reaction_type, user_id")
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .then(({ data, error }) => {
        if (error) {
          console.error("[REACTION] error", error);
          return;
        }

        const counts = emptyReactionCounts();
        const userSet = new Set<ReviewReactionType>();

        for (const row of data ?? []) {
          const type = row.reaction_type as ReviewReactionType;
          if (REVIEW_REACTION_TYPES.includes(type)) {
            counts[type] = (counts[type] ?? 0) + 1;
          }
          if (currentUserId && row.user_id === currentUserId) {
            userSet.add(type);
          }
        }

        setReactions(counts);
        setUserReactions(userSet);
      });
  }, [targetType, targetId, currentUserId]);

  // ── Toggle ─────────────────────────────────────────────────────────────────

  const toggleReaction = useCallback(
    async (reactionType: ReviewReactionType) => {
      // Log target + user before any guard so we can diagnose auth issues
      console.log("[REACTION] target", { targetType, targetId });
      console.log("[REACTION] user_id", currentUserId);

      if (!currentUserId) return;

      console.log("[REACTION] clicked", { targetType, targetId, reactionType });

      const isActive = userReactions.has(reactionType);

      // Optimistic update — apply immediately before DB round-trip
      setReactions((prev) => ({
        ...prev,
        [reactionType]: Math.max(0, prev[reactionType] + (isActive ? -1 : 1)),
      }));
      setUserReactions((prev) => {
        const next = new Set(prev);
        if (isActive) next.delete(reactionType);
        else next.add(reactionType);
        return next;
      });

      const client = createSupabaseBrowserClient();
      if (!client) return;

      setIsLoading(true);

      if (isActive) {
        // ── Remove ──────────────────────────────────────────────────────────
        console.log("[REACTION] remove started", { targetType, targetId, reactionType });

        const { error } = await client
          .from("review_reactions")
          .delete()
          .eq("target_type", targetType)
          .eq("target_id", targetId)
          .eq("user_id", currentUserId)
          .eq("reaction_type", reactionType);

        setIsLoading(false);

        if (error) {
          console.log("[REACTION] error", error);
          // Roll back optimistic update
          setReactions((prev) => ({
            ...prev,
            [reactionType]: prev[reactionType] + 1,
          }));
          setUserReactions((prev) => {
            const next = new Set(prev);
            next.add(reactionType);
            return next;
          });
        } else {
          console.log("[REACTION] removed", { reactionType });
        }
      } else {
        // ── Insert ──────────────────────────────────────────────────────────
        console.log("[REACTION] insert started", { targetType, targetId, reactionType, userId: currentUserId });

        const result = await client.from("review_reactions").insert({
          target_type: targetType,
          target_id: targetId,
          user_id: currentUserId,
          reaction_type: reactionType,
        });

        setIsLoading(false);

        const { error } = result;

        if (error && error.code !== "23505") {
          // 23505 = unique_violation (duplicate in-flight click) — optimistic state is already correct
          console.log("[REACTION] insert error", error);
          // Roll back optimistic update
          setReactions((prev) => ({
            ...prev,
            [reactionType]: Math.max(0, prev[reactionType] - 1),
          }));
          setUserReactions((prev) => {
            const next = new Set(prev);
            next.delete(reactionType);
            return next;
          });
        } else {
          console.log("[REACTION] insert success", result);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [targetType, targetId, currentUserId, userReactions]
  );

  return { reactions, userReactions, toggleReaction, isLoading };
}
